const test = require('node:test');
const assert = require('node:assert/strict');
const ParfaitPhysics = require('../src/physics.js');

test('computeCupGeometry: 正しく壁と幾何パラメータを計算できること', () => {
  const dummyCup = {
    topWidth: 200,
    bottomWidth: 100,
    cupHeight: 150
  };
  const geom = ParfaitPhysics.computeCupGeometry(dummyCup, 400, 600);

  assert.equal(geom.cx, 200);
  assert.equal(geom.cy, 560);
  assert.equal(geom.topY, 410);
  assert.equal(geom.bottomY, 560);
  assert.equal(geom.leftTopX, 100);
  assert.equal(geom.rightTopX, 300);
  assert.equal(geom.leftBotX, 150);
  assert.equal(geom.rightBotX, 250);
  assert.equal(geom.walls.length, 3);
});

test('resolveCircleLineCollision: 線分の端点外(t < 0, t > 1)および中間(0 < t < 1)の判定', () => {
  const line = { x1: 20, y1: 100, x2: 80, y2: 100 };

  // t < 0: 端点(x1, y1)のさらに左側
  const bLeft = { x: 10, y: 100, vx: 0, vy: 0, vRot: 0, radius: 15 };
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(bLeft, line), true);

  // t > 1: 端点(x2, y2)のさらに右側
  const bRight = { x: 90, y: 100, vx: 0, vy: 0, vRot: 0, radius: 15 };
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(bRight, line), true);

  // 0 < t < 1: 線分の中央
  const bMid = { x: 50, y: 95, vx: 0, vy: 2, vRot: 0, radius: 10 };
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(bMid, line), true);

  // 長さ0の線分
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(bMid, { x1: 5, y1: 5, x2: 5, y2: 5 }), false);

  // 衝突しない場合
  const bFar = { x: 50, y: 50, vx: 0, vy: 0, vRot: 0, radius: 5 };
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(bFar, line), false);
});

test('resolveCircleLineCollision: 衝突時の反発・摩擦・dot正負およびdist=0の分岐', () => {
  // dot < 0 (衝突に向かって進む)
  const b1 = { x: 50, y: 95, vx: 2, vy: 4, vRot: 1, radius: 10 };
  const line = { x1: 0, y1: 100, x2: 100, y2: 100 };
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(b1, line, 0.5, 0.8), true);
  assert.ok(b1.vy < 0);

  // dot >= 0 (壁から離れつつ重なっている)
  const b2 = { x: 50, y: 95, vx: 0, vy: -5, vRot: 0, radius: 10 };
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(b2, line), true);

  // dist === 0 (中心が線分と完全一致)
  const b3 = { x: 50, y: 100, vx: 0, vy: 5, vRot: 0, radius: 10 };
  assert.equal(ParfaitPhysics.resolveCircleLineCollision(b3, line), true);
  assert.equal(b3.y, 90);
});

test('clampBodyInCup: 全分岐網羅テスト', () => {
  const geom = ParfaitPhysics.computeCupGeometry({ topWidth: 200, bottomWidth: 100, cupHeight: 150 }, 400, 600);

  // inCup === false
  assert.equal(ParfaitPhysics.clampBodyInCup({ inCup: false }, geom), false);

  // y が安全領域（maxBottomY 以下）
  assert.equal(ParfaitPhysics.clampBodyInCup({ inCup: true, x: 200, y: 500, radius: 20 }, geom), false);

  // y が底面より下すぎる (y > bottomY + radius * 2)
  assert.equal(ParfaitPhysics.clampBodyInCup({ inCup: true, x: 200, y: 650, radius: 20 }, geom), false);

  // 底抜け防止クランプ (b.y > maxBottomY) かつ vy > 0
  const bBot1 = { inCup: true, x: 200, y: 555, vx: 0, vy: 5, radius: 20 };
  assert.equal(ParfaitPhysics.clampBodyInCup(bBot1, geom), true);
  assert.equal(bBot1.y, 540);
  assert.equal(bBot1.vy, 0);

  // 底抜け防止クランプ (b.y > maxBottomY) かつ vy <= 0
  const bBot2 = { inCup: true, x: 200, y: 555, vx: 0, vy: -2, radius: 20 };
  assert.equal(ParfaitPhysics.clampBodyInCup(bBot2, geom), true);
  assert.equal(bBot2.vy, -2);

  // radius なしでのクランプ
  const bBotDef = { inCup: true, x: 200, y: 550, vx: 0, vy: 3 };
  assert.equal(ParfaitPhysics.clampBodyInCup(bBotDef, geom), true);
  assert.equal(bBotDef.y, 532);
});

test('resolveCircleCircleCollision: 円衝突・非衝突・同一点', () => {
  // 衝突
  const b1 = { x: 100, y: 100, vx: 2, vy: 0, vRot: 0, radius: 20 };
  const b2 = { x: 130, y: 100, vx: -2, vy: 0, vRot: 0, radius: 20 };
  assert.equal(ParfaitPhysics.resolveCircleCircleCollision(b1, b2), true);

  // 非衝突
  const b3 = { x: 100, y: 100, vx: 0, vy: 0, vRot: 0, radius: 20 };
  const b4 = { x: 200, y: 100, vx: 0, vy: 0, vRot: 0, radius: 20 };
  assert.equal(ParfaitPhysics.resolveCircleCircleCollision(b3, b4), false);

  // 同一座標 (dist <= 0.0001)
  const b5 = { x: 100, y: 100, vx: 0, vy: 0, vRot: 0, radius: 20 };
  const b6 = { x: 100, y: 100, vx: 0, vy: 0, vRot: 0, radius: 20 };
  assert.equal(ParfaitPhysics.resolveCircleCircleCollision(b5, b6), false);
});

test('checkSpill: こぼれ落ち判定の全分岐', () => {
  const geom = ParfaitPhysics.computeCupGeometry({ topWidth: 200, bottomWidth: 100, cupHeight: 150 }, 400, 600);

  // inCup === false
  assert.equal(ParfaitPhysics.checkSpill({ inCup: false }, geom), false);

  // カップ上端より上 (y <= geom.topY)
  assert.equal(ParfaitPhysics.checkSpill({ inCup: true, x: 50, y: 350 }, geom), false);

  // 左右境界内
  assert.equal(ParfaitPhysics.checkSpill({ inCup: true, x: 200, y: 500 }, geom), false);

  // 左外側へ落下
  const bLeft = { inCup: true, x: geom.leftBotX - 30, y: 500, isGrounded: true, isSettled: true, stillSteps: 36 };
  assert.equal(ParfaitPhysics.checkSpill(bLeft, geom), true);
  assert.equal(bLeft.inCup, false);
  assert.equal(bLeft.isGrounded, false);
  assert.equal(bLeft.isSettled, false);
  assert.equal(bLeft.stillSteps, 0);

  // 右外側へ落下
  const bRight = { inCup: true, x: geom.rightBotX + 30, y: 500, isGrounded: true, isSettled: true, stillSteps: 36 };
  assert.equal(ParfaitPhysics.checkSpill(bRight, geom), true);
  assert.equal(bRight.inCup, false);
  assert.equal(bRight.isGrounded, false);
  assert.equal(bRight.isSettled, false);
  assert.equal(bRight.stillSteps, 0);
});

test('stepSimulation: 接地フラグの伝播とシミュレーション', () => {
  const geom = ParfaitPhysics.computeCupGeometry({ topWidth: 200, bottomWidth: 100, cupHeight: 150 }, 400, 600);

  // 剛体1（底面に当たる）
  const b1 = ParfaitPhysics.createBody({ id: 'vanilla', name: 'バニラ', icon: '🍨', radius: 28 }, 200, 545);
  // 剛体2（b1 と重なる位置）
  const b2 = ParfaitPhysics.createBody({ id: 'choco', name: 'チョコ', icon: '🍫', radius: 26 }, 200, 500);
  // 剛体3（こぼれ落ちる位置）
  const bSpill = ParfaitPhysics.createBody({ id: 'spill', name: 'こぼれ', icon: '🍓', radius: 20 }, 50, 480);
  // 剛体4（離れた位置の空中剛体）
  const bAir = ParfaitPhysics.createBody({ id: 'cherry', name: 'チェリー', icon: '🍒', radius: 20 }, 200, 250);

  assert.equal(b1.isGrounded, false, '生成直後は空中');
  assert.equal(b2.isGrounded, false, '生成直後は空中');
  assert.equal(bAir.isGrounded, false);

  // 1フレーム実行
  const res = ParfaitPhysics.stepSimulation([b1, b2, bSpill, bAir], geom, { subSteps: 4 });
  assert.ok(res.spilledCount >= 1);

  // 底面接触で接地
  assert.equal(b1.isGrounded, true);
  // b1に触れた b2 も接地
  assert.equal(b2.isGrounded, true);
  // 触れていない bAir は空中のまま
  assert.equal(bAir.isGrounded, false);

  // 剛体同士の衝突で、clampBodyInCup が発動する状況（下に押されて底を突き抜けそうになる剛体）
  const bBottom = ParfaitPhysics.createBody({ id: 'bot', name: 'bot', icon: '🍮', radius: 20 }, 200, 539);
  const bPusher = ParfaitPhysics.createBody({ id: 'push', name: 'push', icon: '🍮', radius: 20 }, 200, 510, { vy: 20 });
  ParfaitPhysics.stepSimulation([bBottom, bPusher], geom, { subSteps: 2 });
  assert.equal(bBottom.isGrounded, true);

  // 剛体同士が衝突するが両方とも非接地のケース（空中での衝突では接地しない）
  const bAir1 = ParfaitPhysics.createBody({ id: 'a1', name: 'a1', icon: '⭐', radius: 20 }, 200, 200);
  const bAir2 = ParfaitPhysics.createBody({ id: 'a2', name: 'a2', icon: '⭐', radius: 20 }, 200, 220);
  ParfaitPhysics.stepSimulation([bAir1, bAir2], geom, { subSteps: 2 });
  assert.equal(bAir1.isGrounded, false);
  assert.equal(bAir2.isGrounded, false);

  // 底面に接地した剛体 bFloor の上に乗っている剛体 bStacked への接地伝播
  const bFloor = ParfaitPhysics.createBody({ id: 'fl', name: 'fl', icon: '⭐', radius: 20 }, 200, 540);
  const bStacked = ParfaitPhysics.createBody({ id: 'st', name: 'st', icon: '⭐', radius: 20 }, 200, 502, { vy: 0.5 });
  ParfaitPhysics.stepSimulation([bFloor, bStacked], geom, { subSteps: 2 });
  assert.equal(bFloor.isGrounded, true);
  assert.equal(bStacked.isGrounded, true);
  assert.equal(bStacked.vy, 0); // 支持抗力による沈み込み速度キャンセル

  // オプション未指定および空オブジェクト（デフォルト引数 subSteps, gravity, friction の全ブランチを網羅）
  const bDef1 = ParfaitPhysics.createBody({ id: 'def1', name: 'def1', icon: '🍨', radius: 20 }, 200, 450);
  const resDef1 = ParfaitPhysics.stepSimulation([bDef1], geom);
  assert.equal(typeof resDef1.spilledCount, 'number');

  const bDef2 = ParfaitPhysics.createBody({ id: 'def2', name: 'def2', icon: '🍨', radius: 20 }, 200, 450);
  const resDef2 = ParfaitPhysics.stepSimulation([bDef2], geom, { subSteps: 2, gravity: 0.3, friction: 0.9 });
  assert.equal(typeof resDef2.spilledCount, 'number');

  // 回転減衰の全分岐テスト
  // 1. 接地剛体の回転減衰（急減衰）
  const bSpinGround = ParfaitPhysics.createBody({ id: 'sg', name: 'sg', icon: '🍨', radius: 20 }, 200, 540, { vRot: 0.05 });
  ParfaitPhysics.stepSimulation([bSpinGround], geom, { subSteps: 1, gravity: 0 });

  // 2. 微小回転の完全ゼロ固定
  const bSpinTiny = ParfaitPhysics.createBody({ id: 'st', name: 'st', icon: '🍨', radius: 20 }, 200, 540, { vRot: 0.0005 });
  ParfaitPhysics.stepSimulation([bSpinTiny], geom, { subSteps: 1, gravity: 0 });
  assert.equal(bSpinTiny.vRot, 0);

  // 3. 空中剛体の回転減衰
  const bSpinAir = ParfaitPhysics.createBody({ id: 'sa', name: 'sa', icon: '🍨', radius: 20 }, 200, 200, { vRot: 0.5 });
  ParfaitPhysics.stepSimulation([bSpinAir], geom, { subSteps: 1, gravity: 0 });
  assert.ok(bSpinAir.vRot > 0.1);
});

test('stepSimulation: 接地した剛体はスリープ減衰で微振動が止まること', () => {
  const geom = ParfaitPhysics.computeCupGeometry({ topWidth: 200, bottomWidth: 100, cupHeight: 150 }, 400, 600);

  // 底面に接地した剛体に微小な横揺れと上下動を与えても、スリープ減衰でゼロに固定される
  const bGrounded = ParfaitPhysics.createBody({ id: 'g', name: 'g', icon: '🍨', radius: 20 }, 200, 540, { vx: 0.2, vy: 0 });
  ParfaitPhysics.stepSimulation([bGrounded], geom, { subSteps: 2, gravity: 0 });
  assert.equal(bGrounded.isGrounded, true);
  assert.equal(bGrounded.vx, 0);
  assert.equal(bGrounded.vy, 0);

  // 大きめの速度はゼロにはならず、減衰だけされる（空中剛体にはスリープ減衰がかからないことも確認）
  const bMoving = ParfaitPhysics.createBody({ id: 'm', name: 'm', icon: '🍨', radius: 20 }, 200, 540, { vx: 2.0, vy: 0 });
  ParfaitPhysics.stepSimulation([bMoving], geom, { subSteps: 1, gravity: 0 });
  assert.equal(bMoving.isGrounded, true);
  assert.ok(bMoving.vx > 0 && bMoving.vx < 2.0);

  const bAir = ParfaitPhysics.createBody({ id: 'a', name: 'a', icon: '🍨', radius: 20 }, 200, 200, { vx: 0.2, vy: 0 });
  ParfaitPhysics.stepSimulation([bAir], geom, { subSteps: 1, gravity: 0 });
  assert.equal(bAir.isGrounded, false);
  assert.ok(bAir.vx > 0, '空中剛体の速度はスリープ減衰でゼロにされない');
});

test('stepSimulation: 速度ベースの静止（stillSteps / isSettled）状態遷移の全分岐', () => {
  const geom = ParfaitPhysics.computeCupGeometry({ topWidth: 200, bottomWidth: 100, cupHeight: 150 }, 400, 600);

  // 1. カップ内で低速（hypot < 1.0）を維持すると stillSteps が増加し、36サブステップ到達で isSettled = true になること
  const bStill = ParfaitPhysics.createBody({ id: 's', name: 's', icon: '🍨', radius: 20 }, 200, 540, { vx: 0, vy: 0 });
  assert.equal(bStill.stillSteps, 0);
  assert.equal(bStill.isSettled, false);

  // 35サブステップ時点ではまだ閾値未満
  ParfaitPhysics.stepSimulation([bStill], geom, { subSteps: 35, gravity: 0 });
  assert.equal(bStill.stillSteps, 35);
  assert.equal(bStill.isSettled, false);

  // 36サブステップ目で isSettled = true に遷移
  ParfaitPhysics.stepSimulation([bStill], geom, { subSteps: 1, gravity: 0 });
  assert.equal(bStill.stillSteps, 36);
  assert.equal(bStill.isSettled, true);

  // 2. 高速移動（hypot >= 1.0）になると stillSteps = 0, isSettled = false にリセットされること
  bStill.vx = 2.5;
  bStill.vy = 2.5;
  ParfaitPhysics.stepSimulation([bStill], geom, { subSteps: 1, gravity: 0 });
  assert.equal(bStill.stillSteps, 0);
  assert.equal(bStill.isSettled, false);

  // 3. カップ外（inCup = false）の剛体は速度が0でも絶対に isSettled にならないこと
  const bOut = ParfaitPhysics.createBody(
    { id: 'out', name: 'out', icon: '🍨', radius: 20 },
    50, 500,
    { vx: 0, vy: 0, stillSteps: 50, isSettled: true }
  );
  bOut.inCup = false;
  ParfaitPhysics.stepSimulation([bOut], geom, { subSteps: 40, gravity: 0 });
  assert.equal(bOut.stillSteps, 0);
  assert.equal(bOut.isSettled, false);
});

test('createBody: 全パラメータのデフォルト値とカスタム値', () => {
  // radius なし、options なし
  const b1 = ParfaitPhysics.createBody({ id: 'test1', name: 'テスト1', icon: '🍓' }, 100, 50);
  assert.equal(b1.radius, 28);
  assert.equal(b1.isNeta, false);
  assert.equal(b1.vx, 0);
  assert.equal(b1.vy, 2.5);
  assert.equal(b1.rot, 0);
  assert.equal(b1.vRot, 0);
  assert.equal(b1.inCup, true);
  assert.equal(b1.isGrounded, false);
  assert.equal(b1.stillSteps, 0);
  assert.equal(b1.isSettled, false);
  assert.ok(b1.spawnTime > 0);

  // 全パラメータ明示指定
  const b2 = ParfaitPhysics.createBody(
    { id: 'takoyaki', name: 'たこやき', icon: '🐙', radius: 30, isNeta: true },
    150, 80,
    { vx: 1.5, vy: -1.0, rot: 0.5, vRot: 0.2, isGrounded: true, stillSteps: 12, isSettled: true, spawnTime: 123456 }
  );
  assert.equal(b2.radius, 30);
  assert.equal(b2.isNeta, true);
  assert.equal(b2.vx, 1.5);
  assert.equal(b2.vy, -1.0);
  assert.equal(b2.rot, 0.5);
  assert.equal(b2.vRot, 0.2);
  assert.equal(b2.isGrounded, true);
  assert.equal(b2.stillSteps, 12);
  assert.equal(b2.isSettled, true);
  assert.equal(b2.spawnTime, 123456);
});
