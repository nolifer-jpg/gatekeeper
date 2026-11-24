//importing http module
import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
//importing loadBalancer
import { roundRobin } from './loadBalancer.js';
//importing ports from the upstream
import { ports } from './upstream.js';
//port
const port = Number(process.env.PORT) || 8080;
//checks if it is run locally or not
const isProduction = process.env.NODE_ENV === 'production';
// Metrics state for the dashboard
let totalRequests = 0;
let errors502 = 0;
let errors503 = 0;
const hitsByPort = {};
const statusByPort = {};
const recentRequests = [];
const recordRequest = (method, reqPath, targetPort, status, startTime) => {
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
const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0] ?? '/';
    // Dashboard metrics API
    if (urlPath === '/api/stats') {
        const statsPayload = {
            mode: isProduction ? 'production' : 'development',
            totalRequests,
            errors502,
            errors503,
            upstreams: ports.map((p) => ({
                port: p,
                hits: hitsByPort[p] || 0,
                status: statusByPort[p] || 'UP',
            })),
            recent: recentRequests,
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(statsPayload));
        return;
    }
    // Dashboard static files
    const staticRoutes = {
        '/dashboard': { file: 'index.html', type: 'text/html; charset=utf-8' },
        '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
        '/app.js': { file: 'app.js', type: 'application/javascript; charset=utf-8' },
    };
    if (urlPath in staticRoutes) {
        const route = staticRoutes[urlPath];
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
    const startTime = Date.now();
    const method = req.method || 'GET';
    totalRequests++;
    // In production, retry across all available upstreams; locally, fail fast (1 attempt)
    const maxAttempts = isProduction ? ports.length : 1;
    const forwardRequest = (attempt) => {
        //target port
        let targetPort;
        //error handling for the round robin
        try {
            targetPort = roundRobin();
        }
        catch (error) {
            if (error instanceof Error) {
                console.error("Load balancer error:", error.message);
            }
            else {
                console.error("Unexpected load balancer error:", error);
            }
            errors503++;
            recordRequest(method, urlPath, null, 503, startTime);
            if (!res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
            }
            res.end('Service Unavailable');
            return;
        }
        //information needed for the proxy to connect to the target server
        const options = {
            hostname: 'localhost',
            port: targetPort,
            path: req.url || '/',
            method: req.method,
            headers: req.headers,
        };
        //sending request to the target port
        const proxyReq = http.request(options, (proxyRes) => {
            const status = proxyRes.statusCode || 502;
            hitsByPort[targetPort] = (hitsByPort[targetPort] || 0) + 1;
            statusByPort[targetPort] = 'UP';
            recordRequest(method, urlPath, targetPort, status, startTime);
            res.writeHead(status, proxyRes.headers);
            proxyRes.pipe(res);
        });
        //error handling if bad request
        proxyReq.on('error', (err) => {
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
        }
        else {
            proxyReq.end();
        }
    };
    forwardRequest(1);
});
//listening to the port
server.listen(port, () => {
    console.log(`Server running at port: ${port}`);
});
//# sourceMappingURL=proxy.js.map