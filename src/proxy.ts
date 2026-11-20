//importing http module
import http, { IncomingMessage, ServerResponse } from 'http';
//importing loadBalancer
import { roundRobin } from './loadBalancer.js';
//port
const port: number = 8080;
//server creation
const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
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
    if (!res.headersSent)
    {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
    }
    res.end('Service Unavailable');
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
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  })
  //error handling if bad request
  proxyReq.on('error', (err: Error) => {
      console.error(`Upstream error on port ${targetPort}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('Bad Gateway');
    });
    //piping the client req to the send req
  req.pipe(proxyReq);

  });
//listening to the port
server.listen(port, () => {
  console.log(`Server running at port: ${port}`)
})