# Gatekeeper

A lightweight, modular reverse proxy and round-robin load balancer built from scratch in TypeScript and Node.js.

## Architecture & Concept

Gatekeeper functions as an application-layer reverse proxy routing incoming HTTP traffic across a pool of backend upstream services.

* **Load Balancer (`loadBalancer.ts`):** Implements stateful round-robin rotation across configured upstream ports with error guards for empty target pools.
* **Reverse Proxy (`proxy.ts`):** Uses native Node.js `http` streams (`req.pipe` / `proxyRes.pipe`) for low-overhead request and response forwarding, with `502 Bad Gateway` and `503 Service Unavailable` error handling.
* **Upstream Simulator (`upstream.ts`):** Spawns mock Express microservices on ports `4001`, `4002`, and `4003`, guarded by an ESM `isMainModule` check so importing port configurations never triggers unintended server listeners.

## Technical Implementation & Features

* **Strict TypeScript (`nodenext`) Pipeline:** Compiles TypeScript modules from source into `./dist` with clean ESM module resolution.
* **Single-Command Developer Experience (`npm run dev`):** Automatically builds the TypeScript project and launches both the upstream cluster and reverse proxy concurrently with clean process-group shutdown on exit.
* **Fault-Tolerant Proxy Handling:** Isolates per-request target selection and handles upstream connection errors or empty port configurations gracefully without crashing the proxy server.

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/nolifer-jpg/gatekeeper.git
   cd gatekeeper
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the project (build + upstream servers + proxy):**

   ```bash
   npm run dev
   ```

   This compiles the TypeScript files, starts the upstream servers on ports `4001`, `4002`, and `4003`, and starts the Gatekeeper proxy on `http://localhost:8080`.

### Running Components Individually (Optional)

If you want to run or test processes separately:

```bash
npm run build
node dist/upstream.js
node dist/proxy.js
```

## Quick Verification

With `npm run dev` running, send multiple requests to port `8080` to verify round-robin rotation across `4001`, `4002`, and `4003`:

```bash
for i in 1 2 3 4; do
  curl -s http://localhost:8080/
  echo ""
done
```

## Roadmap

* [x] Project setup & multi-port Express upstream simulator (`4001–4003`) with `isMainModule` guard.
* [x] Native HTTP stream reverse proxy forwarder, Round-Robin load balancing, & `502`/`503` error handling.
* [x] Single-command `npm run dev` build and concurrent process orchestration.
* [ ] Per-request failover/retries & active health-checking to hide downed upstreams.
* [X] In-memory metrics tracking & pure HTML/CSS/JS live status dashboard.