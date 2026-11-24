//importing http module
import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
//importing loadBalancer
import { roundRobin } from './loadBalancer.js';
//importing ports from the upstream
import { ports } from './upstream.js';
//port
const port: number = Number(process.env.PORT) || 8080;
//checks if it is run locally or not
const isProduction: boolean = process.env.NODE_ENV === 'production';

// Metrics state for the dashboard
let totalRequests: number = 0;
let errors502: number = 0;
let errors503: number = 0;
const hitsByPort: Record<number, number> = {};
const statusByPort: Record<number, 'UP' | 'DOWN'> = {};
const disabledPorts = new Set<number>();
const recentRequests: Array<{
  time: string;
  method: string;
  path: string;
  port: number | null;
  status: number;
  durationMs: number;
}> = [];

const recordRequest = (
  method: string,
  reqPath: string,
  targetPort: number | null,
  status: number,
  startTime: number
): void => {
  recentRequests.unshift({
    time: new Date().toLocaleTimeString(),
    method,
    path: reqPath,
    port: targetPort,
    status,
    durationMs: Date.now() - startTime,
  });
  if (recentRequests.length > 20) {
    recentRequests.pop();
  }
};

//server creation
const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  const urlPath: string = (req.url || '/').split('?')[0] ?? '/';

  // Dashboard metrics API
  if (urlPath === '/api/stats') {
    const statsPayload = {
      mode: isProduction ? 'production' : 'development',
      totalRequests,
      errors502,
      errors503,
      disabledPorts: Array.from(disabledPorts),
      upstreams: ports.map((p) => ({
        port: p,
        hits: hitsByPort[p] || 0,
        status: disabledPorts.has(p) ? 'DOWN' : (statusByPort[p] || 'UP'),
      })),
      recent: recentRequests,
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(statsPayload));
    return;
  }

  const toggleMatch = urlPath.match(/^\/api\/upstreams\/(\d+)\/toggle$/);
  if (req.method === 'POST' && toggleMatch) {
    const targetPort = Number(toggleMatch[1]);
    if (!ports.includes(targetPort)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown upstream port' }));
      return;
    }

    if (disabledPorts.has(targetPort)) {
      disabledPorts.delete(targetPort);
      statusByPort[targetPort] = 'UP';
    } else {
      disabledPorts.add(targetPort);
      statusByPort[targetPort] = 'DOWN';
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        port: targetPort,
        disabled: disabledPorts.has(targetPort),
        disabledPorts: Array.from(disabledPorts),
      })
    );
    return;
  }

  // Dashboard static files
  const staticRoutes: Record<string, { file: string; type: string }> = {
    '/monitor.png': { file: 'monitor.png', type: 'image/png' },
    '/dashboard': { file: 'index.html', type: 'text/html; charset=utf-8' },
    '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
    '/app.js': { file: 'app.js', type: 'application/javascript; charset=utf-8' },
  };

  if (urlPath in staticRoutes) {
    const route = staticRoutes[urlPath]!;
    const filePath = path.join(process.cwd(), 'public', route.file);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (!res.headersSent) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
        }
        res.end('Not Found');
        return;
      }
      if (!res.headersSent) {
        res.writeHead(200, { 'Content-Type': route.type });
      }
      res.end(content);
    });
    return;
  }
  
  if (urlPath === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  const startTime = Date.now();
  const method = req.method || 'GET';
  totalRequests++;

  // In production, retry across all available upstreams; locally, fail fast (1 attempt)
  const maxAttempts: number = isProduction ? ports.length : 1;

  const forwardRequest = (attempt: number): void => {
    //target port
    let targetPort: number;
    //error handling for the round robin
    try
    {
      targetPort = roundRobin();
    } catch (error: unknown) {
      if (error instanceof Error)
      {
        console.error("Load balancer error:", error.message);
      }
      else
      {
        console.error("Unexpected load balancer error:", error);
      }
      errors503++;
      recordRequest(method, urlPath, null, 503, startTime);
      if (!res.headersSent)
      {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
      }
      res.end('Service Unavailable');
      return;
    }
    if (disabledPorts.has(targetPort)) {
      statusByPort[targetPort] = 'DOWN';
      if (attempt < maxAttempts && !res.headersSent) {
        forwardRequest(attempt + 1);
        return;
      }
      errors502++;
      recordRequest(method, urlPath, targetPort, 502, startTime);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('Bad Gateway');
      return;
    }
    //information needed for the proxy to connect to the target server
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: targetPort,
      path: req.url || '/',
      method: req.method,
      headers: req.headers,
    };
    //sending request to the target port
    const proxyReq = http.request(options, (proxyRes: IncomingMessage) => {
      const status = proxyRes.statusCode || 502;
      hitsByPort[targetPort] = (hitsByPort[targetPort] || 0) + 1;
      statusByPort[targetPort] = 'UP';
      recordRequest(method, urlPath, targetPort, status, startTime);
      res.writeHead(status, proxyRes.headers);
      proxyRes.pipe(res);
    })
    //error handling if bad request
    proxyReq.on('error', (err: Error) => {
      console.error(`Upstream error on port ${targetPort}:`, err.message);
      statusByPort[targetPort] = 'DOWN';
      if (attempt < maxAttempts && !res.headersSent) {
        forwardRequest(attempt + 1);
        return;
      }
      errors502++;
      recordRequest(method, urlPath, targetPort, 502, startTime);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('Bad Gateway');
    });
    //piping the client req to the send req
    if (attempt === 1) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  };
  forwardRequest(1);
});
//listening to the port
server.listen(port, () => {
  console.log(`Server running at port: ${port}`)
})