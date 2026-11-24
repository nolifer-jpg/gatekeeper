import express from 'express';
import { spawn, type ChildProcess } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const ports: number[] = [4001, 4002, 4003];

function runSingleUpstream(port: number): void {
  const app: express.Application = express();

  app.get('/', (req, res) => {
    res.send(`Hello from upstream server on port ${port}`);
  });

  app.listen(port, () => {
    console.log(`Upstream server running at http://localhost:${port}/`);
  });
}

export function startUpstreamServers(targetPorts: number[] = ports): void {
  const workers = new Map<number, ChildProcess>();
  const scriptPath = process.argv[1];

  if (!scriptPath) {
    for (const port of targetPorts) {
      runSingleUpstream(port);
    }
    return;
  }

  for (const port of targetPorts) {
    const child = spawn(process.execPath, [scriptPath, '--worker', String(port)], {
      env: { ...process.env, UPSTREAM_PORT: String(port) },
      stdio: 'inherit',
    });
    workers.set(port, child);
  }

  const cleanup = (): void => {
    for (const child of workers.values()) {
      child.kill();
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

const workerArgIndex = process.argv.indexOf('--worker');
const isWorkerProcess = workerArgIndex !== -1 && process.argv[workerArgIndex + 1] !== undefined;

if (isWorkerProcess) {
  const workerPort = Number(process.argv[workerArgIndex + 1]);
  runSingleUpstream(workerPort);
} else {
  const isMainModule =
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href;

  if (isMainModule) {
    startUpstreamServers();
  }
}