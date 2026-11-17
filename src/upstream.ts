//importing express
import express from 'express';
//making array of the port numbers given
const ports: number[] = process.argv.slice(2).map(Number).filter(p => !Number.isNaN(p));
//loop for creating different apps for different ports
for (const port of ports)
{
  //creating the app
  const app: express.Application = express();
  //get request that sends hello 
  app.get("/", (req, res) => {
      res.send(`Hello from upstream server on port ${port}`);
    });
  //listening function
  app.listen(port, () => {
      console.log(`Upstream server running at http://localhost:${port}/`);
    });
}
