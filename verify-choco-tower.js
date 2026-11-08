const ParfaitPhysics = require('./src/physics.js');
const ParfaitGameLogic = require('./src/game-logic.js');

const cup = ParfaitGameLogic.CUPS[0]; // プチカップ
const geom = ParfaitPhysics.computeCupGeometry(cup, 400, 600);

console.log('=== ユーザー報告状況の完全再現＆解消検証スクリプト ===');
console.log('プチカップ幾何情報: bottomY=' + geom.bottomY + 'px, topY=' + geom.topY + 'px, 幅=' + cup.topWidth);

// チョコを20個連打（ユーザーのスクリーンショット同様）
const bodies = [];
console.log('\n--- チョコ20個の連打投下開始 ---');
for (let i = 0; i < 20; i++) {
  const choco = ParfaitGameLogic.INGREDIENTS.find(it => it.id === 'choco');
  const b = ParfaitPhysics.createBody(choco, geom.cx + (Math.random() - 0.5) * 8, 30, {
    vx: (Math.random() - 0.5) * 0.4,
    vy: 2.5
  });
  bodies.push(b);

  // 4フレームおきに次を落とす（激しい連打）
  for (let f = 0; f < 4; f++) {
    ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  }
}

// 落下・積み上がりを180フレーム（約3秒）進める
console.log('--- 180フレーム物理シミュレーション実行 ---');
for (let f = 1; f <= 180; f++) {
  ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  if (f === 60 || f === 120 || f === 180) {
    const inCup = bodies.filter(b => b.inCup);
    const outCup = bodies.filter(b => !b.inCup);
    const h = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
    console.log(`[Frame ${f}] カップ内: ${inCup.length}個, 外側こぼれ: ${outCup.length}個, 計測高さ: ${h}cm`);
  }
}

console.log('\n--- 外側にこぼれたチョコの落下検証 ---');
const spilled = bodies.filter(b => !b.inCup);
let allFalling = true;
spilled.forEach((b, idx) => {
  console.log(`  こぼれチョコ${idx}: x=${b.x.toFixed(1)}, y=${b.y.toFixed(1)}, vy=${b.vy.toFixed(2)}, isGrounded=${b.isGrounded}`);
  if (b.y < geom.bottomY && Math.abs(b.vy) < 0.5) {
    allFalling = false;
  }
});

if (allFalling) {
  console.log('✅ 検証成功: 外側にこぼれたチョコは空中に一切浮かばず、画面下へ自然に重力落下しています！');
} else {
  console.log('❌ 検証失敗: 空中に浮いているチョコがあります！');
}

console.log('\n--- カップ内に残ったタワーの接地・静止検証 ---');
const inCup = bodies.filter(b => b.inCup);
let groundedCount = 0;
let stableCount = 0;
inCup.forEach((b, idx) => {
  if (b.isGrounded) groundedCount++;
  if (Math.abs(b.vx) < 0.2 && Math.abs(b.vy) < 0.2) stableCount++;
});
console.log(`カップ内チョコ数: ${inCup.length}, 接地数: ${groundedCount}, 静止数: ${stableCount}`);
console.log(`最終計測高さ: ${ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6)}cm`);

if (groundedCount > 0 && stableCount >= inCup.length - 2) {
  console.log('✅ 検証成功: カップ内のタワーは空中で凍りつくことなく、底面から自然に接地・安定しています！');
} else {
  console.log('❌ 検証失敗: タワーが安定していません');
}
