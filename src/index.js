// Loader Worker
// =============
// Uses the Worker Loader binding (env.LOADER) to spin up a Dynamic Worker at
// runtime, requesting an explicit placement hint via a `placement` property
// passed to `env.LOADER.load()` — set at the same level as `compatibilityDate`.
//
//   env.LOADER.load({
//     compatibilityDate: "...",
//     placement: { region: "gcp:europe-west4" },   // <-- explicit placement hint
//     mainModule: "index.js",
//     modules: { "index.js": "<dynamic worker source>" },
//   })
//
// Docs:
//   - Dynamic Workers:   https://developers.cloudflare.com/dynamic-workers/
//   - Placement hints:   https://developers.cloudflare.com/workers/configuration/placement/#configure-explicit-placement-hints
//
// IMPORTANT: `placement` inside load() is a *proposed* extension of the Worker
// Loader API (a capability requested by a platforms customer). Today the
// documented WorkerCode object does not include it, and Dynamic Workers execute
// in the same location where they are invoked. This Worker passes `placement`
// anyway (forward-compatible) and, if the runtime rejects it, transparently
// retries without it.
//
// Because unknown properties are usually ignored silently, a successful load()
// does NOT prove placement was honored. So the /run response distinguishes:
//   - loadSucceeded:      load()+fetch did not throw (weak signal).
//   - placementEffective: the Dynamic Worker actually ran near the requested
//                         region AND in a different colo than the loader
//                         (the real signal). Derived from the observed colo.
// Either way, the UI measures the *actual* colo the Dynamic Worker ran in, so
// you can verify real behavior on whatever runtime version you deploy to.

import { DYNAMIC_WORKER_CODE } from "./dynamic-worker-code.js";
import { validatePlacement, describeColo } from "./geo.js";

const COMPAT_DATE = "2026-07-23";

/**
 * Build the WorkerCode object handed to the Worker Loader.
 * @param {object|undefined} placement e.g. { region: "gcp:europe-west4" }
 */
function buildWorkerCode(placement) {
	/** @type {Record<string, unknown>} */
	const code = {
		compatibilityDate: COMPAT_DATE,
		mainModule: "index.js",
		modules: {
			"index.js": DYNAMIC_WORKER_CODE,
		},
		// Leave outbound access enabled (do NOT set globalOutbound: null) so the
		// Dynamic Worker can run the /cdn-cgi/trace probe that reveals its colo.
	};

	// The requested feature: `placement` at the same level as `compatibilityDate`.
	if (placement) {
		code.placement = placement;
	}

	return code;
}

/**
 * Load a Dynamic Worker with the given placement and ask it where it ran.
 *
 * NOTE: `loadSucceeded` only reports whether `load()` + the entrypoint fetch
 * threw. It does NOT mean the runtime honored `placement`. Unknown properties
 * on the WorkerCode object are typically ignored silently, so `load()` will
 * usually succeed even when `placement` had no effect. The real signal for
 * whether placement took effect is computed later from the observed colo (see
 * `placementEffective` in the /run handler).
 *
 * @returns {Promise<{result: any, loadSucceeded: boolean, loadError: string|null}>}
 */
async function runDynamicWorker(env, placement) {
	// First attempt: include the placement hint.
	try {
		const worker = env.LOADER.load(buildWorkerCode(placement));
		const res = await worker.getEntrypoint().fetch(
			new Request("https://dynamic-worker.internal/")
		);
		const result = await res.json();
		return { result, loadSucceeded: true, loadError: null };
	} catch (err) {
		if (!placement) throw err;
		// The runtime may not (yet) accept `placement` inside load(). Retry
		// without it so the demo still runs and we can report the gap.
		const worker = env.LOADER.load(buildWorkerCode(undefined));
		const res = await worker.getEntrypoint().fetch(
			new Request("https://dynamic-worker.internal/")
		);
		const result = await res.json();
		return { result, loadSucceeded: false, loadError: String(err) };
	}
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// Where is THIS (loader) Worker being invoked? request.cf.colo is the
		// data center that received the request from the client.
		const loaderColoCode = request.cf?.colo ?? null;
		const loaderColo = describeColo(loaderColoCode);
		const loaderCountry = request.cf?.country ?? null;

		// Small endpoint so the UI can display the loader location on page load.
		if (url.pathname === "/whereami") {
			return json({
				loader: { ...loaderColo, requestCountry: loaderCountry },
			});
		}

		if (url.pathname === "/run") {
			if (request.method !== "POST") {
				return json({ error: "Use POST" }, 405);
			}

			let body = {};
			try {
				body = await request.json();
			} catch {
				return json({ error: "Invalid JSON body" }, 400);
			}

			const region = typeof body.region === "string" ? body.region.trim() : "";
			if (!region) {
				return json({ error: "Provide a placement region, e.g. { \"region\": \"gcp:europe-west4\" }" }, 400);
			}

			const placement = { region };

			let run;
			try {
				run = await runDynamicWorker(env, placement);
			} catch (err) {
				return json(
					{
						error: "Failed to load or invoke the Dynamic Worker.",
						detail: String(err),
						loader: { ...loaderColo, requestCountry: loaderCountry },
					},
					500
				);
			}

			const executionColo = run.result?.executionColo ?? null;
			const validation = validatePlacement(region, executionColo);

			// The signal that actually matters: did the Dynamic Worker run near
			// the requested region AND somewhere other than the loader's eyeball
			// colo? If it ran in the same colo as the loader, placement did not
			// move it — it just ran where it was invoked.
			const executionColoCode = describeColo(executionColo).code;
			const ranAwayFromLoader =
				executionColoCode != null &&
				loaderColo.code != null &&
				executionColoCode !== loaderColo.code;
			const placementEffective = Boolean(validation.ok && ranAwayFromLoader);

			return json({
				placementRequested: placement,
				// Whether load()+fetch threw. NOT proof placement was honored.
				loadSucceeded: run.loadSucceeded,
				// Derived truth: placement moved the worker near the region and
				// away from the loader's colo.
				placementEffective,
				placementEffectiveReason: placementEffective
					? `Dynamic Worker ran in ${describeColo(executionColo).label}, near the requested region and away from the loader colo (${loaderColo.label}).`
					: ranAwayFromLoader
						? `Dynamic Worker ran away from the loader colo but not close enough to the requested region.`
						: `Dynamic Worker ran in the same colo as the loader (${loaderColo.label}); placement did not move it — it ran where it was invoked.`,
				loadError: run.loadError,
				loader: {
					...loaderColo,
					requestCountry: loaderCountry,
					note: "Data center where the loader Worker was invoked (closest to the client).",
				},
				dynamicWorker: {
					executionColo: describeColo(executionColo),
					incomingColo: describeColo(run.result?.incomingColo ?? null),
					traceCountry: run.result?.traceCountry ?? null,
					raw: run.result,
				},
				validation,
			});
		}

		// Anything else that isn't a static asset.
		return json({ error: "Not found" }, 404);
	},
};
