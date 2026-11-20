# Gatekeeper

A high-performance reverse proxy, load balancer, and full-stack gateway built from scratch in TypeScript and Node.js.

## Architecture & Concept

Gatekeeper functions as an application-layer reverse proxy routing traffic across a cluster of backend microservices.

* **Control Plane:** Express manages administrative routes, configuration, and the metrics dashboard API.

* **Data Plane:** Native Node.js network streams handle low-latency HTTP request and response piping.

## Technical Implementation & Features

* **Strict TypeScript Pipeline:** Configured compilation workflow translating code from `./src` to `./dist` under strict type checking.

* **Stateless Upstream Simulator (`upstream.ts`):**

  * Dynamically spawns multiple mock microservices from a single stateless script using command-line arguments (`process.argv`).

  * Emulates horizontal container scaling without duplicating source files.

## Getting Started

1. **Clone the repository:**

   ```
   git clone https://github.com/nolifer-jpg/gatekeeper.git
   cd gatekeeper
   
   ```

2. **Install dependencies:**

   ```
   npm install
   
   ```

3. **Compile TypeScript:**

   ```
   npx tsc
   
   ```

4. **Spin up upstream servers:**

   ```
   node dist/upstream.js 4001 4002 4003
   
   ```

## Roadmap

* \[x\] Project setup & dynamic multi-port upstream microservices.

* \[x\] Native HTTP stream reverse proxy forwarder & Round Robin load balancing.

* \[ \] Active health-checking background loop & automated failover.

* \[ \] Full-stack database service & React Vite dashboard interface.

* \[ \] Real-time WebSocket metrics streaming & cloud deployment.