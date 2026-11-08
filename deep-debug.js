// 包括的実機シミュレーションデバッグスクリプト
const ParfaitPhysics = require('./src/physics.js');
const ParfaitGameLogic = require('./src/game-logic.js');

console.log('=== 包括的実機シミュレーションデバッグ開始 ===\n');

const cup = ParfaitGameLogic.CUPS[0];
const geom = ParfaitPhysics.computeCupGeometry(cup, 400, 600);

let bugsFound = [];

// ------------------------------------------------------------
// シナリオ1: お店屋さんモードの「空中フライング判定」バグの検証
// ------------------------------------------------------------
console.log('--- シナリオ1: 空中フライング判定の検証 ---');
{
  const order = ['vanilla', 'strawberry', 'cherry'];
  // プレイヤーが3回ボタンを押した直後（全て y=30 の空中にある状態）
  const bodies = [
    ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[0], 200, 30),
    ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[2], 200, 30),
    ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[4], 200, 30)
  ];

  // この状態で「はい、どうぞ！」を押す
  const res = ParfaitGameLogic.evaluateParfait(order, bodies);
  console.log(`空中に3個ある状態での評価結果: status = ${res.status}, score = ${res.score}`);
  if (res.status === 'perfect') {
    console.warn('⚠️ バグ発見！: トッピングがまだ空中にあり着地していないのに「だいせいこう（100点）」と判定されてしまいます！');
    bugsFound.push('空中フライング判定バグ: 落下中のトッピングが注文クリアとして認識される');
  }
}

// ------------------------------------------------------------
// シナリオ2: こぼれた剛体（inCup: false）の接地フラグ汚染検証
// ------------------------------------------------------------
console.log('\n--- シナリオ2: こぼれた剛体の接地フラグ汚染検証 ---');
{
  // グラスの外（x=50）にこぼれて落下中の剛体
  const bSpilled = ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[0], 50, 480, { isGrounded: false });
  bSpilled.inCup = false;

  // グラスの縁付近で接地している剛体
  const bGrounded = ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[1], 55, 480, { isGrounded: true });

  ParfaitPhysics.stepSimulation([bSpilled, bGrounded], geom, { subSteps: 2 });
  if (bSpilled.isGrounded) {
    console.warn('⚠️ バグ発見！: グラス外にこぼれた剛体が、接地剛体に触れて isGrounded=true になってしまいます！');
    bugsFound.push('接地フラグ汚染バグ: こぼれ落ちた剛体が接地状態に誤判定される');
  } else {
    console.log('✅ 正常: こぼれた剛体は接地しませんでした');
  }
}

// ------------------------------------------------------------
// シナリオ3: 10個超の高速連打（スパムクリック）シミュレーション
// ------------------------------------------------------------
console.log('\n--- シナリオ3: 15個連続投下（連打）シミュレーション ---');
{
  const spamBodies = [];
  for (let i = 0; i < 15; i++) {
    spamBodies.push(ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[i % 8], 200 + (Math.random() - 0.5) * 30, 30));
  }

  // 120フレームシミュレーション実行
  for (let f = 0; f < 120; f++) {
    ParfaitPhysics.stepSimulation(spamBodies, geom, { subSteps: 6 });
  }

  const inCupSettled = spamBodies.filter(b => b.inCup && b.isGrounded);
  const spilled = spamBodies.filter(b => !b.inCup);
  console.log(`15個投下後: グラス内安定 = ${inCupSettled.length}個, こぼれた = ${spilled.length}個`);

  // 底抜けチェック
  const bottomThrough = spamBodies.filter(b => b.y + b.radius > geom.bottomY + 1.5 && b.inCup);
  if (bottomThrough.length > 0) {
    console.error(`❌ 底抜けバグ再発！: ${bottomThrough.length}個が底面を突き抜けています`);
    bugsFound.push('連打時の底抜けバグ');
  } else {
    console.log('✅ 正常: 15個の連打でも底抜けは一切発生しませんでした！');
  }
}

// ------------------------------------------------------------
// シナリオ4: 高さチャレンジでトッピングが崩れてこぼれた時のリアルタイム高さの追従検証
// ------------------------------------------------------------
console.log('\n--- シナリオ4: タワー崩壊・こぼれ時のリアルタイム高さ追従 ---');
{
  // 3個積み上がっている状態
  const bodies = [
    ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[0], 200, 530, { isGrounded: true, vy: 0 }),
    ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[1], 200, 480, { isGrounded: true, vy: 0 }),
    ParfaitPhysics.createBody(ParfaitGameLogic.INGREDIENTS[2], 200, 430, { isGrounded: true, vy: 0 })
  ];

  let hBefore = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
  console.log(`崩壊前の高さ: ${hBefore}cm`);

  // 一番上の剛体がグラグラしてグラス外（x=50）にこぼれ落ちた！
  bodies[2].x = 50;
  bodies[2].inCup = false;
  bodies[2].isGrounded = false;

  let hAfter = ParfaitGameLogic.calculateHeight(bodies, geom.bottomY, 6);
  console.log(`一番上がこぼれた後の高さ: ${hAfter}cm`);

  if (hAfter < hBefore) {
    console.log('✅ 正常: こぼれたら即座に高さが減少し、現在残っているタワーの高さになりました！');
  } else {
    console.error('❌ バグ: こぼれた後も高さが減少していません！');
    bugsFound.push('こぼれ後の高さ未追従バグ');
  }
}

console.log('\n=== デバッグ結果サマリー ===');
if (bugsFound.length > 0) {
  console.log(`検出されたバグ (${bugsFound.length}件):`);
  bugsFound.forEach((b, i) => console.log(` ${i + 1}. ${b}`));
} else {
  console.log('重大なバグは検出されませんでした！');
}
