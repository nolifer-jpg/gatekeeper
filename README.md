# Gatekeeper

A high-performance reverse proxy, load balancer, and full-stack gateway built from scratch in TypeScript and Node.js.

## Architecture & Concept
Gatekeeper functions as an application-layer reverse proxy routing traffic across a cluster of backend microservices.
* **Control Plane:** Express manages administrative routes, configuration, and the metrics dashboard API.
* **Data Plane:** Native Node.js network streams handle low-latency HTTP request and response piping.

## Technical Implementation & Features
- **Strict TypeScript Pipeline:** Configured compilation workflow translating code from `./src` to `./dist` under strict type checking.
- **Stateless Upstream Simulator (`upstream.ts`):** 
  - Dynamically spawns multiple mock microservices from a single stateless script using command-line arguments (`process.argv`).
  - Emulates horizontal container scaling without duplicating source files.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/nolifer-jpg/gatekeeper.git](https://github.com/nolifer-jpg/gatekeeper.git)
   cd gatekeeper