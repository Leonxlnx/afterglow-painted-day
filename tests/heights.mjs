import { heightAt, coastZ } from '../src/world/heightfield.js';
const pts = [[0,-200],[2,-215],[1,-230],[1,-238],[0,-246],[-1,-262],[-4,-268],[12,-252],[8,-244],[-15,-255],[20,-262],[-20,-270],[5,-235],[0,-250]];
for (const [x,z] of pts) console.log(x, z, heightAt(x,z).toFixed(2), 'coast', coastZ(x).toFixed(1));
