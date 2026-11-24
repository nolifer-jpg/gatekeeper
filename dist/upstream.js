//importing express
import express from 'express';
import { pathToFileURL } from 'node:url';
//making array of the port numbers given
export const ports = [4001, 4002, 4003];
//loop for creating different apps for different ports
export function startUpstreamServers(targetPorts = ports) {
    for (const port of targetPorts) {
        //creating the server instance
        const app = express();
        //get request from the client
        app.get('/', (req, res) => {
            res.send(`Hello from upstream server on port ${port}`);
        });
        //listening to the ports
        app.listen(port, () => {
            console.log(`Upstream server running at http://localhost:${port}/`);
        });
    }
}
//checking if the function is run from the main module
const isMainModule = process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href;
//if true then run the upstream servers  
if (isMainModule) {
    startUpstreamServers();
}
//# sourceMappingURL=upstream.js.map