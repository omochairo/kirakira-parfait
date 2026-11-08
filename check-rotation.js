const ParfaitPhysics = require('./src/physics.js');
const ParfaitGameLogic = require('./src/game-logic.js');

const cup = ParfaitGameLogic.CUPS[0];
const geom = ParfaitPhysics.computeCupGeometry(cup, 400, 600);

const b1 = ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[0], 200, 30);
const b2 = ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[1], 205, 30);
const bodies = [b1, b2];

console.log('--- 120フレームの物理挙動追跡 ---');
for (let f = 1; f <= 120; f++) {
  ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  const h = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
  if (f % 10 === 0 || f === 60 || f === 120) {
    console.log(`Frame ${f}: b1.y=${b1.y.toFixed(1)}, b1.vy=${b1.vy.toFixed(3)}, b1.vRot=${b1.vRot.toFixed(4)}, b1.rot=${b1.rot.toFixed(3)}, Height=${h}cm`);
  }
}
