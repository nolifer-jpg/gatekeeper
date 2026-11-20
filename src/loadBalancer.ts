//importing the ports from the upstream
import { ports } from "./upstream.js";
//current index
let currentIndex: number = 0;
//load balancer
export function roundRobin(): number
{
  //error checking
  if (ports.length === 0)
  {
    throw new Error("No ports available");
  }
  const selectedPort = ports[currentIndex];
  currentIndex = (currentIndex + 1) % ports.length;
  if (selectedPort === undefined) throw new Error('Selected port is undefined');
  return selectedPort;
}