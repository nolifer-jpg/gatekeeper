# Gatekeeper

A lightweight, modular reverse proxy and round-robin load balancer built from scratch in **TypeScript** and **Node.js**.

> **Note for Reviewers & Recruiters:**  
> Gatekeeper is primarily a **backend systems project** focused on reverse proxying, load balancing, raw HTTP stream handling, and failover resilience. The web dashboard (`/dashboard`) was built as a visual aid for live college presentations (with simulated node toggles)—for the best and most authentic evaluation of the architecture, please run and test the backend locally across **4 separate terminals** as outlined below.

## Architecture & Concept

Gatekeeper functions as an application-layer reverse proxy routing incoming HTTP traffic across a pool of backend upstream services.

* **Load Balancer (`loadBalancer.ts`):** Implements stateful round-robin rotation across configured upstream ports with error guards for empty target pools.
* **Reverse Proxy (`proxy.ts`):** Uses native Node.js `http` streams (`req.pipe` / `proxyRes.pipe`) for low-overhead request and response forwarding, automatic multi-attempt failover retries in `production` mode, and `502 Bad Gateway` / `503 Service Unavailable` error handling.
* **Upstream Simulator (`upstream.ts`):** Spawns isolated Express child-process workers on ports `4001`, `4002`, and `4003` (`--worker <port>`), guarded by an ESM `isMainModule` check so importing port configurations never triggers unintended server listeners.

## Technical Implementation & Features

* **Strict TypeScript (`nodenext`) Pipeline:** Compiles TypeScript modules from source into `./dist` with clean ESM module resolution.
* **Fault-Tolerant Failover & Retries:** In `production` mode (`NODE_ENV=production`), failed upstream requests automatically retry across remaining healthy nodes; in `development` mode, requests fail fast on a single attempt so upstream outages surface immediately.
* **True Multi-Process Isolation:** Supports running each upstream node (`4001`, `4002`, `4003`) as an independent OS process so you can terminate individual nodes and observe real socket-level failover.

## Running Locally (Recommended 4-Terminal Setup)

To test real process-level failure and round-robin rerouting, run the **3 upstream servers** and **1 proxy server** across **4 separate terminals**:

1. **Clone & build the repository:**

   ```bash
   git clone https://github.com/nolifer-jpg/gatekeeper.git
   cd gatekeeper
   npm install
   npm run build
   ```

2. **Start the 3 upstream servers in 3 separate terminals:**

   * **Terminal 1 (Upstream `:4001`):**
     ```bash
     node dist/upstream.js --worker 4001
     ```
   * **Terminal 2 (Upstream `:4002`):**
     ```bash
     node dist/upstream.js --worker 4002
     ```
   * **Terminal 3 (Upstream `:4003`):**
     ```bash
     node dist/upstream.js --worker 4003
     ```

3. **Start the reverse proxy & load balancer in Terminal 4:**

   Run with `NODE_ENV=production` to enable automatic failover retries across the upstream pool:

   ```bash
   NODE_ENV=production node dist/proxy.js
   ```

   *(Alternatively, `npm run dev` builds and runs the cluster in a single terminal for quick local startup.)*

## Quick Verification & Failover Test

With all 4 terminals running, send multiple requests to port `8080` to verify round-robin rotation across `4001`, `4002`, and `4003`:

```bash
for i in 1 2 3 4 5 6; do
  curl -s http://localhost:8080/
  echo ""
done
```

**Testing real process failure:**
1. Press `Ctrl + C` in **Terminal 2** to kill the `:4002` process.
2. Run the `curl` loop again—Gatekeeper detects the dead connection on `:4002` and automatically reroutes traffic across `:4001` and `:4003` with zero dropped client requests.
3. Kill all three upstream terminals to verify `502 Bad Gateway` handling.

## Live Presentation Demo

* **Hosted Dashboard:** [https://gatekeeper-iayz.onrender.com/dashboard](https://gatekeeper-iayz.onrender.com/dashboard) *(uses simulated kill/restore toggles since Render hosts all processes inside a single container)*

## Roadmap

* [x] Project setup & multi-port Express upstream simulator (`4001–4003`) with `isMainModule` guard & per-port worker processes.
* [x] Native HTTP stream reverse proxy forwarder, Round-Robin load balancing, & `502`/`503` error handling.
* [x] Single-command `npm run dev` build and concurrent process orchestration.
* [x] Per-request failover/retries across available upstreams in `production` mode.
* [x] In-memory metrics tracking & pure HTML/CSS/JS live status dashboard.