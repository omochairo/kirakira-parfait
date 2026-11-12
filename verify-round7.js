const ParfaitPhysics = require('./src/physics.js');
const ParfaitGameLogic = require('./src/game-logic.js');
const assert = require('assert');

console.log('====================================================');
console.log('Kirakira Parfait — Round 7 Comprehensive Verification');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// Gate 1: Phone-size 390x560 (glass/CUPS[1], 12 mixed drops)
// -----------------------------------------------------------------------------
console.log('--- [Gate 1] Phone 390x560 (glass/CUPS[1], 12 mixed drops) ---');
{
  const cup = ParfaitGameLogic.CUPS[1];
  const geom = ParfaitPhysics.computeCupGeometry(cup, 390, 560);
  const bodies = [];

  for (let i = 0; i < 12; i++) {
    const ing = ParfaitGameLogic.INGREDIENTS[i % ParfaitGameLogic.INGREDIENTS.length];
    const offset = ((i * 17) % 31) - 15;
    bodies.push(ParfaitPhysics.createBody(ing, geom.cx + offset, 30, {
      vx: ((i % 3) - 1) * 0.2,
      vy: 2.5
    }));
    for (let f = 0; f < 30; f++) {
      ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
    }
  }

  for (let f = 0; f < 180; f++) {
    ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  }

  const inCupBodies = bodies.filter(b => b.inCup);
  const spilled = bodies.filter(b => !b.inCup);
  console.log(`Bodies total: ${bodies.length}, inCup: ${inCupBodies.length}, spilled: ${spilled.length}`);

  // (a) No permanent 'falling' block: all inCup bodies must be settled or grounded
  const hasFalling = inCupBodies.some(b => !(b.isGrounded || b.isSettled));
  assert.equal(hasFalling, false, 'In-cup bodies must not remain falling');

  // (b) Zero bodies remain settled while unsupported from below (no chimney / floating freeze)
  const unsupportedSettled = inCupBodies.filter(b => b.isSettled && (b.y < geom.topY && (b.x < geom.leftTopX - b.radius * 0.5 || b.x > geom.rightTopX + b.radius * 0.5)));
  assert.equal(unsupportedSettled.length, 0, 'No body wider than rim mouth settled');

  const h1 = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
  // Drift test: 180 more frames
  for (let f = 0; f < 180; f++) {
    ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  }
  const h2 = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
  const drift = Math.abs(h1 - h2);
  console.log(`Measured height: H1=${h1}cm, H2=${h2}cm, Drift=|H1-H2|=${drift}cm`);
  assert.ok(drift <= 1, 'Drift must be <= 1cm');
  console.log('✅ Gate 1 PASSED: 0 unsupported freeze, 0 permanent falling, drift <= 1cm\n');
}

// -----------------------------------------------------------------------------
// Gate 2: Phone-size 390x700 (crown/CUPS[3], 12 rapid takoyaki)
// -----------------------------------------------------------------------------
console.log('--- [Gate 2] Phone 390x700 (crown/CUPS[3], 12 rapid takoyaki) ---');
{
  const cup = ParfaitGameLogic.CUPS[3];
  const geom = ParfaitPhysics.computeCupGeometry(cup, 390, 700);
  const takoyaki = ParfaitGameLogic.INGREDIENTS.find(x => x.id === 'takoyaki');
  const bodies = [];

  for (let i = 0; i < 12; i++) {
    const offset = ((i * 19) % 35) - 17;
    bodies.push(ParfaitPhysics.createBody(takoyaki, geom.cx + offset, 30, {
      vx: ((i % 3) - 1) * 0.25,
      vy: 2.5
    }));
    // rapid drop: 15 frames between drops
    for (let f = 0; f < 15; f++) {
      ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
    }
  }

  for (let f = 0; f < 200; f++) {
    ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  }

  const inCupBodies = bodies.filter(b => b.inCup);
  const spilled = bodies.filter(b => !b.inCup);
  console.log(`Bodies total: ${bodies.length}, inCup: ${inCupBodies.length}, spilled: ${spilled.length}`);

  const hasFalling = inCupBodies.some(b => !(b.isGrounded || b.isSettled));
  assert.equal(hasFalling, false, 'Takoyaki in-cup bodies must not remain falling');

  const unsupportedSettled = inCupBodies.filter(b => b.isSettled && (b.y < geom.topY && (b.x < geom.leftTopX - b.radius * 0.5 || b.x > geom.rightTopX + b.radius * 0.5)));
  assert.equal(unsupportedSettled.length, 0, 'No body wider than crown rim settled');

  const h1 = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
  for (let f = 0; f < 180; f++) {
    ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  }
  const h2 = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
  const drift = Math.abs(h1 - h2);
  console.log(`Measured height: H1=${h1}cm, H2=${h2}cm, Drift=|H1-H2|=${drift}cm`);
  assert.ok(drift <= 1, 'Takoyaki drift must be <= 1cm');
  console.log('✅ Gate 2 PASSED: 0 unsupported freeze, 0 permanent falling, drift <= 1cm\n');
}

// -----------------------------------------------------------------------------
// Gate 3: Rim chimney prevention test (intentional lip drops)
// -----------------------------------------------------------------------------
console.log('--- [Gate 3] Intentional Rim Lip Drops (Chimney Prevention) ---');
{
  const cup = ParfaitGameLogic.CUPS[1];
  const geom = ParfaitPhysics.computeCupGeometry(cup, 390, 560);
  const bodies = [];

  for (let i = 0; i < 6; i++) {
    const ing = ParfaitGameLogic.INGREDIENTS[i];
    bodies.push(ParfaitPhysics.createBody(ing, geom.leftTopX, 30, { vx: 0, vy: 2.5 }));
    for (let f = 0; f < 30; f++) {
      ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
    }
  }
  for (let f = 0; f < 120; f++) {
    ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  }

  const rimSettled = bodies.filter(b => b.isSettled && b.y < geom.topY);
  console.log(`Bodies dropped on rim: ${bodies.length}, Settled above rim on lip: ${rimSettled.length}`);
  assert.equal(rimSettled.length, 0, 'Zero bodies on the rim lip should remain settled');
  console.log('✅ Gate 3 PASSED: Zero bodies settled on the rim lip (chimney prevented)\n');
}

// -----------------------------------------------------------------------------
// Gate 4: Shop mode clearable to 300 with side-by-side layers
// -----------------------------------------------------------------------------
console.log('--- [Gate 4] Shop mode 3 rounds clearable to 300 points ---');
{
  let totalScore = 0;
  const geom = ParfaitPhysics.computeCupGeometry(ParfaitGameLogic.CUPS[1], 390, 560);

  for (let round = 1; round <= 3; round++) {
    const order = ['vanilla', 'strawberry', 'cherry'];
    const orderIngs = order.map(id => ParfaitGameLogic.INGREDIENTS.find(x => x.id === id));
    const roundBodies = [];

    // Drop vanilla slightly left, strawberry slightly right (side-by-side)
    roundBodies.push(ParfaitPhysics.createBody(orderIngs[0], geom.cx - 20, 30, { vx: -0.2, vy: 2.5 }));
    for (let f = 0; f < 120; f++) ParfaitPhysics.stepSimulation(roundBodies, geom);

    roundBodies.push(ParfaitPhysics.createBody(orderIngs[1], geom.cx + 20, 30, { vx: 0.2, vy: 2.5 }));
    for (let f = 0; f < 120; f++) ParfaitPhysics.stepSimulation(roundBodies, geom);

    roundBodies.push(ParfaitPhysics.createBody(orderIngs[2], geom.cx, 30, { vx: 0, vy: 2.5 }));
    for (let f = 0; f < 180; f++) ParfaitPhysics.stepSimulation(roundBodies, geom);

    const evalRes = ParfaitGameLogic.evaluateParfait(order, roundBodies);
    console.log(`  Round ${round}: status=${evalRes.status}, score=${evalRes.score}`);
    assert.equal(evalRes.status, 'perfect');
    assert.equal(evalRes.score, 100);
    totalScore += evalRes.score;
  }

  console.log(`Total Shop Score: ${totalScore} / 300`);
  assert.equal(totalScore, 300);
  console.log('✅ Gate 4 PASSED: Shop mode clearable to 300 with side-by-side layers\n');
}

// -----------------------------------------------------------------------------
// Gate 5: Best-record consistency
// -----------------------------------------------------------------------------
console.log('--- [Gate 5] Best-record consistency ---');
{
  assert.equal(ParfaitGameLogic.checkNewRecord(50, 40), true);
  assert.equal(ParfaitGameLogic.checkNewRecord(40, 50), false);
  assert.equal(ParfaitGameLogic.checkNewRecord(50, 50), false);
  assert.equal(ParfaitGameLogic.checkNewRecord(10, 0), true);
  console.log('✅ Gate 5 PASSED: Best-record updates correctly\n');
}

console.log('====================================================');
console.log('🎉 ALL ROUND 7 VERIFICATION GATES PASSED! 🎉');
console.log('====================================================');
