//importing http module
import http, { IncomingMessage, ServerResponse } from 'http';
//port
const port: number = 8080;
const targetPort: number = 4001;
//server creation
const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
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
  proxyReq.on('error', (err: Error) => {
      console.error(`Upstream error on port ${targetPort}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('Bad Gateway');
    });
  
    req.pipe(proxyReq);
  });
//listening to the port
server.listen(port, () => {
  console.log(`Server running at port: ${port}`)
})