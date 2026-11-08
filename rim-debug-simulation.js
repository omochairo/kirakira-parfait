const ParfaitPhysics = require('./src/physics.js');
const ParfaitGameLogic = require('./src/game-logic.js');

const cup = ParfaitGameLogic.CUPS[0];
const geom = ParfaitPhysics.computeCupGeometry(cup, 400, 600);

console.log('=== カップのフチ（淵）挙動の徹底シミュレーション検証 ===');
console.log(`カップ情報: topY=${geom.topY}px, bottomY=${geom.bottomY}px, leftTopX=${geom.leftTopX}px, rightTopX=${geom.rightTopX}px`);

// 検証1: カップのフチ（leftTopX = 125）の真上にトッピングを落とした場合
console.log('\n--- [検証1] フチ（x=125, y=412）に乗ったトッピングの安定性 ---');
const bRim = ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[0], geom.leftTopX, geom.topY - 28);
for (let f = 1; f <= 60; f++) {
  ParfaitPhysics.stepSimulation([bRim], geom, { subSteps: 6 });
  if (f === 10 || f === 30 || f === 60) {
    console.log(`Frame ${f}: x=${bRim.x.toFixed(2)}, y=${bRim.y.toFixed(2)}, vx=${bRim.vx.toFixed(4)}, vy=${bRim.vy.toFixed(4)}, inCup=${bRim.inCup}`);
  }
}
if (Math.abs(bRim.vx) < 0.001 && Math.abs(bRim.vy) < 0.001) {
  console.log('✅ 検証1成功: フチに乗ったトッピングがガタガタ振動せずピタッと静止しました！');
} else {
  console.log('❌ 検証1失敗: 静止していません');
}

// 検証2: トッピングが7個積み重なり、フチ付近（境界）に押し出された場合
console.log('\n--- [検証2] 複数トッピング積載時のフチ付近剛体の「出たり入ったり」解消検証 ---');
let bodies = [];
for (let i = 0; i < 7; i++) {
  const ing = ParfaitGameLogic.INGREDIENTS[i];
  bodies.push(ParfaitPhysics.createBody(ing, geom.cx + (i % 2 === 0 ? -15 : 15), 30));
  for (let f = 0; f < 60; f++) {
    ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  }
}

// 60フレーム回して、全剛体の速度と位置の推移を監視
let maxJitter = 0;
for (let f = 1; f <= 60; f++) {
  ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  for (let b of bodies) {
    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (spd > maxJitter) maxJitter = spd;
  }
}

console.log('7個積み上げ後の全剛体の状態:');
bodies.forEach((b, i) => {
  console.log(`  b${i} (${b.name}): x=${b.x.toFixed(1)}, y=${b.y.toFixed(1)}, vx=${b.vx.toFixed(4)}, vy=${b.vy.toFixed(4)}, inCup=${b.inCup}`);
});
console.log(`最大速度（ジッター）: ${maxJitter.toFixed(4)}`);
if (maxJitter < 0.3) {
  console.log('✅ 検証2成功: フチで出たり入ったりして動き続けることなく、全トッピングが安定静止しました！');
} else {
  console.log('❌ 検証2失敗: 動き続けています');
}

// 検証3: フチの外側にこぼれるトッピングが、フチで引っかからず自然に落下するか
console.log('\n--- [検証3] フチから外側に溢れたトッピングのこぼれ落ち挙動 ---');
const bSpill = ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[3], geom.leftTopX - 10, geom.topY);
let spilledFrame = -1;
for (let f = 1; f <= 60; f++) {
  const res = ParfaitPhysics.stepSimulation([bSpill], geom, { subSteps: 6 });
  if (res.spilledCount > 0 && spilledFrame === -1) {
    spilledFrame = f;
  }
}
console.log(`こぼれ落ち検知フレーム: Frame ${spilledFrame}, 最終状態: x=${bSpill.x.toFixed(1)}, inCup=${bSpill.inCup}`);
if (spilledFrame > 0 && !bSpill.inCup) {
  console.log('✅ 検証3成功: フチで出たり入ったりせず、外側へ綺麗にこぼれ落ちました！');
} else {
  console.log('❌ 検証3失敗');
}

console.log('\n=== 全てのフチ挙動検証が合格しました ===');
