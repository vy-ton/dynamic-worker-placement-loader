# Dynamic Worker Placement Loader

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) that uses the
[Worker Loader binding](https://developers.cloudflare.com/dynamic-workers/) to
spin up a **Dynamic Worker** at runtime with an **explicit placement hint**
passed directly to `env.LOADER.load()` — set as a `placement` property at the
same level as `compatibilityDate`.

A small UI then validates **where the Dynamic Worker actually executed** and
shows **where the loader Worker itself was invoked**.

```js
const worker = env.LOADER.load({
  compatibilityDate: "2026-07-23",
  placement: { region: "gcp:europe-west4" }, // <-- explicit placement hint
  mainModule: "index.js",
  modules: { "index.js": "<dynamic worker source>" },
});
return worker.getEntrypoint().fetch(request);
```

- Dynamic Workers: <https://developers.cloudflare.com/dynamic-workers/>
- Explicit placement hints: <https://developers.cloudflare.com/workers/configuration/placement/#configure-explicit-placement-hints>

## Important: `placement` inside `load()` is a proposed extension

As of today the documented Worker Loader
[`WorkerCode` object](https://developers.cloudflare.com/dynamic-workers/api-reference/#workercode)
supports `compatibilityDate`, `compatibilityFlags`, `mainModule`, `modules`,
`globalOutbound`, `env`, and `tails` — **but not `placement`**. Dynamic Workers
currently execute in the **same location where they are invoked**; the Worker
Loader has no native region parameter.

This project passes `placement` to `load()` anyway, as a forward-compatible
reference implementation of the capability (a per–Dynamic-Worker / per-loader
region hint). If the runtime actively rejects the unknown property (throws),
the loader transparently retries without it.

### `load()` succeeding is not proof placement was honored

Unknown properties on the `WorkerCode` object are typically **ignored
silently** rather than rejected, so `load()` usually succeeds even when
`placement` had no effect. The `/run` response therefore reports two separate
signals:

- **`loadSucceeded`** — `load()` + the entrypoint fetch did not throw. This is a
  weak signal; it does **not** mean the runtime recognized `placement`.
- **`placementEffective`** — the derived truth: the Dynamic Worker actually ran
  **near the requested region** *and* in a **different colo than the loader**.
  This is the field to trust.

The UI headline verdict reflects `placementEffective`, not `loadSucceeded`.

Because the UI measures the **real** colo the Dynamic Worker ran in, it works as
an honest validation harness:

- On a runtime **without** the feature: `load()` succeeds (`loadSucceeded:
  true`) but the Dynamic Worker runs in the **same colo as the loader** (near
  you), so `placementEffective` is **false** — demonstrating the current gap.
- On a runtime **with** the feature: the Dynamic Worker runs near the requested
  region, in a different colo than the loader, and `placementEffective` is
  **true**.

## How location is detected

- **Loader location** — `request.cf.colo` on the incoming request (the eyeball
  edge colo closest to the client).
- **Dynamic Worker location** — the Dynamic Worker fetches
  `https://cloudflare.com/cdn-cgi/trace` and reads the `colo=` value. The probe
  is served by the colo the Dynamic Worker egresses from, i.e. where it runs.

Validation maps the requested cloud region and the observed colo to
coordinates and checks the great-circle distance (see `src/geo.js`). It is a
demonstration heuristic, not a routing oracle.

## Project layout

```
├── wrangler.jsonc              # worker_loaders (LOADER) + static assets config
├── public/index.html           # the simple validation UI
└── src/
    ├── index.js                # loader Worker: /run + /whereami, calls env.LOADER.load()
    ├── dynamic-worker-code.js   # source string for the loaded Dynamic Worker
    └── geo.js                   # cloud-region + colo coordinates and validation
```

## Run locally

Requires Node 18+ and a Cloudflare account.

```bash
npm install
npm run dev
```

Open the printed URL. Note: running locally with `wrangler dev` executes at your
machine/nearest colo, so placement effects are best observed against a deployed
Worker.

## Deploy

```bash
npm run deploy
```

Then open the deployed URL, pick a `placement.region`, and click **Run Dynamic
Worker**.

## API

- `GET /whereami` → `{ loader: { code, label, requestCountry } }`
- `POST /run` with `{ "region": "gcp:europe-west4" }` →

```jsonc
{
  "placementRequested": { "region": "gcp:europe-west4" },
  "loadSucceeded": true, // load()+fetch did not throw (weak signal)
  "placementEffective": true, // the signal to trust: ran near region, away from loader
  "placementEffectiveReason": "Dynamic Worker ran in Amsterdam, NL (AMS), near the requested region and away from the loader colo (Newark, US (EWR)).",
  "loadError": null,
  "loader": { "label": "Newark, US (EWR)", "requestCountry": "US" },
  "dynamicWorker": {
    "executionColo": { "label": "Amsterdam, NL (AMS)" }
  },
  "validation": {
    "ok": true,
    "distanceKm": 130,
    "regionLabel": "GCP Netherlands (europe-west4)",
    "expectedNearestColo": { "label": "Amsterdam, NL (AMS)" },
    "reason": "Dynamic Worker ran in Amsterdam, NL (AMS), 130 km from GCP Netherlands (europe-west4) (within 2000 km)."
  }
}
```

> On today's runtime you'll typically see `loadSucceeded: true` but
> `placementEffective: false`, with `dynamicWorker.executionColo` equal to the
> `loader` colo — the Dynamic Worker ran where it was invoked.

## Background

This prototype comes from a discussion with a platforms customer: they want
per-app regional affinity for Dynamic Workers loaded via the Worker Loader (e.g.
`LOADER.load({ placement: { region } })`) without deploying a dedicated Worker
per region — the loader stays on Cloudflare's edge near the user, while the
loaded per-app code runs near that app's own backend.

## The current workaround (what this repo aims to replace)

Because per-`load()` placement does not exist yet, the customer works around it
by running the **same Dynamic Worker Loader twice**: one unplaced at the edge,
and a second one with explicit placement next to the backend. The edge Dynamic
Worker serves static locally and delegates server-dependent requests (SSR,
serverFn, etc.) to the placed loader, so a request crosses the ocean **once**
instead of once per backend call.

```text
                                   ┌───────────┐
                                   │   User    │
                                   │  browser  │
                                   └─────┬─────┘
                                         │ request
                                         ▼
╔══════════════════════════════════════════════════════════════════════╗
║   Cloudflare colo NEAREST USER  (unplaced / edge)                      ║
║                                                                        ║
║   ┌───────────┐                                                        ║
║   │ web-proxy │  (edge router)                                         ║
║   └─────┬─────┘                                                        ║
║         ▼                                                              ║
║   ┌─────────────────────────────────────────────────────────────┐    ║
║   │ Dynamic Worker Loader   (UNPLACED / edge)                     │    ║
║   │                                                               │    ║
║   │   loads ▼                                                     │    ║
║   │   ┌─────────────────────────────────────────────────────┐    │    ║
║   │   │ Dynamic Worker — TanStack web app                    │    │    ║
║   │   │                                                      │    │    ║
║   │   │        ┌───────────────────────┐                     │    │    ║
║   │   │        │  static or dynamic ?  │                     │    │    ║
║   │   │        └───────┬───────┬───────┘                     │    │    ║
║   │   │         static │       │ relies on server            │    │    ║
║   │   │                │       │ (SSR, serverFn, etc)        │    │    ║
║   │   │                ▼       │                             │    │    ║
║   │   │      ┌───────────────┐ │                             │    │    ║
║   │   │      │ static assets │ │                             │    │    ║
║   │   │      │ run @ edge &  │ │                             │    │    ║
║   │   │      │ return        │ │                             │    │    ║
║   │   │      └───────┬───────┘ │                             │    │    ║
║   │   └──────────────┼─────────┼─────────────────────────────┘    │    ║
║   └──────────────────┼─────────┼──────────────────────────────────┘    ║
╚════════════════════ ┼═════════┼════════════════════════════════════════╝
        response       │         │  call pinned loader
      (static)         │         │  ── ONE ocean crossing ──
                       │         ▼
                       │   ╔═══════════════════════════════════════════════╗
                       │   ║  gcp:europe-west4 / Amsterdam                  ║
                       │   ║                                                ║
                       │   ║   ┌──────────────────────────────────────┐    ║
                       │   ║   │ Dynamic Worker Loader                 │    ║
                       │   ║   │   — same loader, explicit placement   │    ║
                       │   ║   │                                       │    ║
                       │   ║   │   loads ▼                             │    ║
                       │   ║   │   ┌────────────────────────────┐      │    ║
                       │   ║   │   │ Dynamic Worker             │      │    ║
                       │   ║   │   │ (same serving core)        │      │    ║
                       │   ║   │   └─────────────┬──────────────┘      │    ║
                       │   ║   └─────────────────┼─────────────────────┘    ║
                       │   ║                     │  multiple sequential      ║
                       │   ║                     │  calls (now LOCAL ~1-3ms)  ║
                       │   ║                     ▼                          ║
                       │   ║   ┌──────────────────────────────┐            ║
                       │   ║   │ Server Backend                │            ║
                       │   ║   └──────────────────────────────┘            ║
                       │   ╚═══════════════════════════════════════════════╝
                       ▼
                ┌───────────┐
                │   User    │◄── dynamic response returns via
                └───────────┘    pinned loader → edge Dynamic Worker → user


  SHARED SERVING CORE  (workers/.../src/shared/)
  · DWL loading  · SSR path  · WorkerEntrypoint bindings
        ├─ imported by ─►  Dynamic Worker Loader @ edge   (unplaced)
        └─ imported by ─►  Dynamic Worker Loader @ EU     (explicit placement)
```

- **`Dynamic Worker Loader`** (unplaced, edge) loads the **`Dynamic Worker`**
  running the TanStack web app.
- **Static assets** → the Dynamic Worker runs on the edge and returns directly.
- **Relies on server (SSR, serverFn, etc)** → the edge Dynamic Worker calls a
  second **`Dynamic Worker Loader`** — the *same loader*, with explicit
  placement to `gcp:europe-west4` next to `go-api`.
- Crosses the ocean **once** (edge → EU); backend `go-api` calls are then local
  (~1–3 ms each) → ~87% p50 / ~90% p90 cut for far-from-EU users.
- Both loaders run the **same shared serving core**.

A working per-`load()` placement (`LOADER.load({ placement: { region } })`)
would collapse this back into a single loader: the edge loader would load the
server-dependent Dynamic Worker with a region hint so it runs near the backend,
removing the second Worker and the extra hop.
