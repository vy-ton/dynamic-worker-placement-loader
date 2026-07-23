// Source code for the Dynamic Worker that gets loaded at runtime by the loader
// Worker via `env.LOADER.load()`.
//
// Its only job is to report *where it is executing*. It does this two ways:
//   1. request.cf.colo        - the colo attributed to the request it received
//   2. /cdn-cgi/trace         - an outbound probe; the colo that serves the
//                               probe is the colo the Dynamic Worker egresses
//                               from, i.e. where it is running.
//
// If placement moved the Dynamic Worker, both signals should reflect the
// placement target rather than the eyeball location.
//
// NOTE: this is a plain string so it can be passed to `modules` in the Worker
// Loader API. There is no build step for Dynamic Worker code.
export const DYNAMIC_WORKER_CODE = /* js */ `
export default {
	async fetch(request) {
		const incomingColo = request.cf && request.cf.colo ? request.cf.colo : null;

		let traceColo = null;
		let traceLoc = null;
		let traceError = null;
		try {
			// The probe hits the nearest Cloudflare colo to wherever THIS worker
			// is running, so the reported colo is our execution location.
			const res = await fetch("https://cloudflare.com/cdn-cgi/trace", {
				cf: { cacheTtl: 0 },
			});
			const text = await res.text();
			for (const line of text.split("\\n")) {
				const [k, v] = line.split("=");
				if (k === "colo") traceColo = v;
				if (k === "loc") traceLoc = v;
			}
		} catch (err) {
			traceError = String(err);
		}

		const body = {
			ranAt: new Date().toISOString(),
			// Best available signal for "where did the Dynamic Worker run".
			executionColo: traceColo || incomingColo,
			incomingColo,
			traceColo,
			traceCountry: traceLoc,
			traceError,
			message: "Hello from a Dynamic Worker",
		};

		return new Response(JSON.stringify(body), {
			headers: { "content-type": "application/json" },
		});
	},
};
`;
