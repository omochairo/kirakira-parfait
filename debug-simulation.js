// 実際のゲーム動作シミュレーション＆デバッグスクリプト
const ParfaitPhysics = require('./src/physics.js');
const ParfaitGameLogic = require('./src/game-logic.js');

console.log('=== ゲーム動作シミュレーションデバッグ開始 ===');

const cup = ParfaitGameLogic.CUPS[0];
const stageWidth = 400;
const stageHeight = 600;
const geom = ParfaitPhysics.computeCupGeometry(cup, stageWidth, stageHeight);

console.log(`カップ底面: bottomY = ${geom.bottomY}px, 上端: topY = ${geom.topY}px`);

// トッピングを画面上部 (startY = 30) から投下！
const bodies = [];
const startX = geom.cx;
const startY = 30;
const ing = ParfaitGameLogic.INGREDIENTS[0]; // バニラ (radius = 28)

const b = ParfaitPhysics.createBody(ing, startX, startY, {
  vx: 0,
  vy: 2.5
});
bodies.push(b);

console.log(`[Frame 0 - 投下直後] y = ${b.y.toFixed(1)}px, isGrounded = ${b.isGrounded}, vy = ${b.vy}`);
let h0 = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
console.log(`[Frame 0 - 高さ] ${h0}cm (期待値: 0cm)`);
if (h0 !== 0) {
  console.error('❌ バグ検出: 投下直後に高さがカウントされています！');
  process.exit(1);
} else {
  console.log('✅ 正常: 投下直後は高さ 0cm です！');
}

// 落下シミュレーション (1フレーム〜60フレーム)
let landedFrame = -1;
let settledHeight = 0;

for (let frame = 1; frame <= 60; frame++) {
  ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
  const h = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);

  if (frame <= 15) {
    // 落下中
    if (h !== 0) {
      console.error(`❌ バグ検出: 落下中 (Frame ${frame}) に高さ ${h}cm が記録されました！`);
      process.exit(1);
    }
  }

  if (b.isGrounded && landedFrame === -1) {
    landedFrame = frame;
    console.log(`[Frame ${frame} - 底面に接触・着地！] y = ${b.y.toFixed(1)}px, vy = ${b.vy.toFixed(2)}`);
  }

  if (frame === 60) {
    settledHeight = h;
    console.log(`[Frame 60 - 静止完了] y = ${b.y.toFixed(1)}px, 最終計測高さ = ${settledHeight}cm`);
  }
}

console.log(`着地フレーム: Frame ${landedFrame}`);
console.log(`静止後の高さ: ${settledHeight}cm (期待値: 約9〜10cm)`);

if (settledHeight >= 8 && settledHeight <= 12) {
  console.log('✅ 検証成功: 静止後に正しく約9〜10cm（バニラ1個分）が記録されました！');
} else {
  console.error(`❌ 高さの値が異常です: ${settledHeight}cm`);
  process.exit(1);
}

// 2個目のトッピングを投下してタワーの積み上がりをテスト
console.log('\n--- 2個目のトッピング（チョコ）を投下 ---');
const b2 = ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[1], startX, startY, { vx: 0, vy: 2.5 });
bodies.push(b2);

// 投下直後の高さは、まだ1個目の高さのまま（増えない）こと
const hAfterDrop2 = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
console.log(`[2個目投下直後] 高さ = ${hAfterDrop2}cm (1個目の高さ ${settledHeight}cm と完全一致)`);
if (hAfterDrop2 !== settledHeight) {
  console.error('❌ バグ検出: 2個目投下直後に高さが跳ね上がりました！');
  process.exit(1);
}

// 60フレーム進めて2個目が着地・静止
for (let frame = 1; frame <= 60; frame++) {
  ParfaitPhysics.stepSimulation(bodies, geom, { subSteps: 6 });
}
const hAfterStack = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
console.log(`[2個目着地・静止後] 高さ = ${hAfterStack}cm (タワーが積み上がって高くなった)`);

if (hAfterStack > settledHeight) {
  console.log(`✅ 検証成功: 正しくタワーが高くなりました (${settledHeight}cm -> ${hAfterStack}cm)！`);
} else {
  console.error('❌ タワーの高さが増加していません！');
  process.exit(1);
}

console.log('\n=== 全てのシミュレーション検証に合格しました！ ===');
