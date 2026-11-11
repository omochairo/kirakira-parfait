const test = require('node:test');
const assert = require('node:assert/strict');
const ParfaitGameLogic = require('../src/game-logic.js');

test('generateOrder: 正しく注文が生成されネタ食材が含まれないこと', () => {
  // 通常ターン (turn 1 -> 3個)
  const order1 = ParfaitGameLogic.generateOrder(1);
  assert.equal(order1.length, 3);
  assert.ok(order1.every(id => id !== 'takoyaki' && id !== 'curry'));

  // 3ターン目 (turn 3 -> 4個)
  const order3 = ParfaitGameLogic.generateOrder(3);
  assert.equal(order3.length, 4);

  // カスタム個数指定
  const orderCustom = ParfaitGameLogic.generateOrder(1, ParfaitGameLogic.INGREDIENTS, 5);
  assert.equal(orderCustom.length, 5);
});

test('evaluateParfait: 空中落下中の剛体がある場合およびグラスが空の場合の判定', () => {
  // 1. 空中落下中の剛体がある場合
  const fallingBodies = [
    { id: 'vanilla', inCup: true, isGrounded: false },
    { id: 'strawberry', inCup: true, isGrounded: true }
  ];
  const resFalling = ParfaitGameLogic.evaluateParfait(['vanilla', 'strawberry'], fallingBodies);
  assert.equal(resFalling.status, 'falling');
  assert.equal(resFalling.score, 0);
  assert.ok(resFalling.message.includes('おちてくるのを'));

  // 2. 剛体ゼロ
  const resEmpty = ParfaitGameLogic.evaluateParfait(['vanilla', 'strawberry'], []);
  assert.equal(resEmpty.status, 'empty');
  assert.equal(resEmpty.score, 0);
  assert.equal(resEmpty.reactionType, 'none');

  // 3. inCupがfalseの剛体しかない場合
  const spilledBodies = [{ id: 'vanilla', inCup: false, isGrounded: false }];
  const resSpilled = ParfaitGameLogic.evaluateParfait(['vanilla'], spilledBodies);
  assert.equal(resSpilled.status, 'empty');
});

test('evaluateParfait: 完全一致（100点・だいせいこう）', () => {
  const order = ['vanilla', 'strawberry', 'cherry'];
  const bodies = [
    { id: 'vanilla', isNeta: false, inCup: true, isGrounded: true },
    { id: 'strawberry', isNeta: false, inCup: true, isGrounded: true },
    { id: 'cherry', isNeta: false, inCup: true, isGrounded: true }
  ];
  const res = ParfaitGameLogic.evaluateParfait(order, bodies);
  assert.equal(res.status, 'perfect');
  assert.equal(res.score, 100);
  assert.equal(res.reactionType, 'bounce');
  assert.equal(res.soundType, 'success');
  assert.ok(res.message.includes('100てん'));
});

test('evaluateParfait: おしい判定（70点・順番違いまたは1個違い）', () => {
  const order = ['vanilla', 'strawberry', 'cherry'];
  // 順番違い
  const bodiesShuffled = [
    { id: 'cherry', isNeta: false, inCup: true, isGrounded: true },
    { id: 'vanilla', isNeta: false, inCup: true, isGrounded: true },
    { id: 'strawberry', isNeta: false, inCup: true, isGrounded: true }
  ];
  const res1 = ParfaitGameLogic.evaluateParfait(order, bodiesShuffled);
  assert.equal(res1.status, 'good');
  assert.equal(res1.score, 70);
  assert.equal(res1.reactionType, 'bounce');
  assert.equal(res1.soundType, 'good');

  // 1個だけ違う（3個中2個一致）
  const bodiesOneOff = [
    { id: 'vanilla', isNeta: false, inCup: true, isGrounded: true },
    { id: 'strawberry', isNeta: false, inCup: true, isGrounded: true },
    { id: 'melon', isNeta: false, inCup: true, isGrounded: true }
  ];
  const res2 = ParfaitGameLogic.evaluateParfait(order, bodiesOneOff);
  assert.equal(res2.status, 'good');
  assert.equal(res2.score, 70);
});

test('evaluateParfait: へんてこ判定（ネタ食材入り、または大きく異なる）', () => {
  const order = ['vanilla', 'strawberry', 'cherry'];

  // ネタ食材（たこやき）が入っている場合
  const bodiesWithNeta = [
    { id: 'vanilla', isNeta: false, inCup: true, isGrounded: true },
    { id: 'strawberry', isNeta: false, inCup: true, isGrounded: true },
    { id: 'takoyaki', isNeta: true, inCup: true, isGrounded: true }
  ];
  const resNeta = ParfaitGameLogic.evaluateParfait(order, bodiesWithNeta);
  assert.equal(resNeta.status, 'funny');
  assert.equal(resNeta.score, 50);
  assert.equal(resNeta.reactionType, 'dizzy');
  assert.equal(resNeta.soundType, 'funny');
  assert.ok(resNeta.message.includes('へんてこ'));

  // ネタ食材はないが全然違う材料ばかり
  const bodiesMismatch = [
    { id: 'melon', isNeta: false, inCup: true, isGrounded: true },
    { id: 'choco', isNeta: false, inCup: true, isGrounded: true }
  ];
  const resMismatch = ParfaitGameLogic.evaluateParfait(order, bodiesMismatch);
  assert.equal(resMismatch.status, 'funny');
  assert.equal(resMismatch.score, 50);
  assert.ok(resMismatch.message.includes('ふしぎなあじ'));
});

test('generateOrder: 同じ材料は最大2個まで（候補が尽きた場合は全体から選ぶ）', () => {
  // デフォルト食材では、どの材料も2個を超えないこと（ランダムでも構造的に保証される）
  for (let trial = 0; trial < 200; trial++) {
    const order = ParfaitGameLogic.generateOrder(3);
    const counts = {};
    order.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    Object.values(counts).forEach(c => assert.ok(c <= 2));
  }

  // 通常食材が1種類しかない場合は、候補が尽きても全体から選び続けること
  const single = [
    { id: 'vanilla', name: 'バニラ', icon: '🍨', radius: 28, isNeta: false },
    { id: 'takoyaki', name: 'たこやき', icon: '🐙', radius: 27, isNeta: true }
  ];
  const orderSingle = ParfaitGameLogic.generateOrder(1, single, 5);
  assert.equal(orderSingle.length, 5);
  assert.ok(orderSingle.every(id => id === 'vanilla'));
});

test('evaluateParfait: 積み上がり順（したから）で完全一致を判定すること', () => {
  const order = ['vanilla', 'strawberry', 'cherry'];

  // 落とした順はバラバラでも、物理的に「下から vanilla → strawberry → cherry」なら100点
  const bodiesStacked = [
    { id: 'cherry', isNeta: false, inCup: true, isGrounded: true, y: 100 },
    { id: 'vanilla', isNeta: false, inCup: true, isGrounded: true, y: 300 },
    { id: 'strawberry', isNeta: false, inCup: true, isGrounded: true, y: 200 }
  ];
  const resPerfect = ParfaitGameLogic.evaluateParfait(order, bodiesStacked);
  assert.equal(resPerfect.status, 'perfect');
  assert.equal(resPerfect.score, 100);

  // 落とした順が注文通りでも、実際の積み上がり（下から）が違えば完全一致にはならない
  const bodiesWrongStack = [
    { id: 'vanilla', isNeta: false, inCup: true, isGrounded: true, y: 100 },
    { id: 'strawberry', isNeta: false, inCup: true, isGrounded: true, y: 200 },
    { id: 'cherry', isNeta: false, inCup: true, isGrounded: true, y: 300 }
  ];
  const resNotPerfect = ParfaitGameLogic.evaluateParfait(order, bodiesWrongStack);
  assert.notEqual(resNotPerfect.status, 'perfect');
  assert.equal(resNotPerfect.status, 'good');
});

test('evaluateParfait: 材料を大量に入れたごまかしは おしい にならないこと', () => {
  const order = ['vanilla', 'strawberry', 'cherry'];
  // 注文の材料は全部入っているが、余分な材料が3個も入っている（合計6個）
  const bodiesSpam = [
    { id: 'vanilla', isNeta: false, inCup: true, isGrounded: true, y: 350 },
    { id: 'strawberry', isNeta: false, inCup: true, isGrounded: true, y: 300 },
    { id: 'cherry', isNeta: false, inCup: true, isGrounded: true, y: 250 },
    { id: 'melon', isNeta: false, inCup: true, isGrounded: true, y: 200 },
    { id: 'banana', isNeta: false, inCup: true, isGrounded: true, y: 150 },
    { id: 'pudding', isNeta: false, inCup: true, isGrounded: true, y: 100 }
  ];
  const res = ParfaitGameLogic.evaluateParfait(order, bodiesSpam);
  assert.equal(res.status, 'funny');
  assert.equal(res.score, 50);
});

test('saveProgress / loadProgress: 進行状況の保存と復元', () => {
  const fakeStorage = (initial = {}) => {
    const map = { ...initial };
    return {
      getItem: k => (k in map ? map[k] : null),
      setItem: (k, v) => { map[k] = String(v); },
      _map: map
    };
  };
  const KEY = ParfaitGameLogic.PROGRESS_KEY;

  // 保存して読み戻せること
  const s1 = fakeStorage();
  ParfaitGameLogic.saveProgress(s1, { totalClears: 3, selectedCupId: 'cup3' });
  assert.deepEqual(ParfaitGameLogic.loadProgress(s1), { totalClears: 3, selectedCupId: 'cup3' });

  // 未指定フィールドは初期値で保存されること
  const s2 = fakeStorage();
  ParfaitGameLogic.saveProgress(s2, {});
  assert.deepEqual(ParfaitGameLogic.loadProgress(s2), { totalClears: 0, selectedCupId: null });

  // 何も保存されていない場合は初期値
  const s3 = fakeStorage();
  assert.deepEqual(ParfaitGameLogic.loadProgress(s3), { totalClears: 0, selectedCupId: null });

  // 一部のフィールドだけ保存されている場合は、欠けた分が初期値になること
  const s4 = fakeStorage({ [KEY]: '{"totalClears":2}' });
  assert.deepEqual(ParfaitGameLogic.loadProgress(s4), { totalClears: 2, selectedCupId: null });

  // 壊れたJSONの場合は例外なく初期値を返すこと
  const s5 = fakeStorage({ [KEY]: '{oops' });
  assert.deepEqual(ParfaitGameLogic.loadProgress(s5), { totalClears: 0, selectedCupId: null });

  // storage自体が例外を投げる環境（プライベートブラウズ等）でも例外なく動作すること
  const throwingStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); }
  };
  assert.deepEqual(ParfaitGameLogic.loadProgress(throwingStorage), { totalClears: 0, selectedCupId: null });
  assert.doesNotThrow(() => ParfaitGameLogic.saveProgress(throwingStorage, { totalClears: 1, selectedCupId: 'cup2' }));
});

test('checkCupUnlock: カップの解放判定', () => {
  const cups = [
    { id: 'c1', unlocked: true, reqClear: 0 },
    { id: 'c2', unlocked: false, reqClear: 1 },
    { id: 'c3', unlocked: false, reqClear: 2 }
  ];

  // クリア回数0 -> 新規解放なし
  assert.equal(ParfaitGameLogic.checkCupUnlock(0, cups), null);

  // クリア回数1 -> c2が解放
  const unlocked = ParfaitGameLogic.checkCupUnlock(1, cups);
  assert.notEqual(unlocked, null);
  assert.equal(unlocked.id, 'c2');
  assert.equal(cups[1].unlocked, true);

  // 既に解放済みの状態で再度チェック -> null
  assert.equal(ParfaitGameLogic.checkCupUnlock(1, cups), null);
});

test('getShopRank: スコアごとの称号判定', () => {
  // 300点以上
  const rank300 = ParfaitGameLogic.getShopRank(300);
  assert.equal(rank300.stars, '⭐⭐⭐');
  assert.ok(rank300.title.includes('でんせつ'));

  // 200〜299点
  const rank200 = ParfaitGameLogic.getShopRank(200);
  assert.equal(rank200.stars, '⭐⭐');
  assert.ok(rank200.title.includes('にんきもの'));

  // 200点未満
  const rank100 = ParfaitGameLogic.getShopRank(150);
  assert.equal(rank100.stars, '⭐');
  assert.ok(rank100.title.includes('おもしろ'));
});

test('getFreeResult: じゆうにつくるモードの称号判定', () => {
  const res = ParfaitGameLogic.getFreeResult(8);
  assert.equal(res.stars, '✨🍨✨');
  assert.equal(res.scoreText, '8こ のったよ！');
  assert.ok(res.title.includes('せかいに ひとつだけ'));
});

test('calculateHeight: 空中落下中の剛体は無視され、着地・静止した剛体のみ計測されること', () => {
  const cupBottomY = 500;

  // 1. 剛体ゼロ件
  assert.equal(ParfaitGameLogic.calculateHeight([], cupBottomY), 0);

  // 2. 空中落下中（isGrounded: false または vy が大きい）
  // 画面最上部 (y=30) で落とした直後の剛体
  const bSpawning = [{ y: 30, radius: 28, inCup: true, isGrounded: false, vy: 2.5 }];
  assert.equal(ParfaitGameLogic.calculateHeight(bSpawning, cupBottomY), 0, '落とした直後の空中にある剛体は0cmでなければならない');

  // 3. 接地しているがまだ高速で跳ねている最中 (Math.abs(vy) >= 1.5)
  const bBouncing = [{ y: 400, radius: 28, inCup: true, isGrounded: true, vy: 3.0 }];
  assert.equal(ParfaitGameLogic.calculateHeight(bBouncing, cupBottomY), 0, '跳ねている最中の剛体は計測されない');

  // 4. 正しく着地・静止した剛体 (isGrounded: true, Math.abs(vy) < 1.5)
  // y = 400, radius = 20 -> topY = 380, diffPx = 120 -> 120 / 6 = 20cm
  const bSettled = [{ y: 400, radius: 20, inCup: true, isGrounded: true, vy: 0.2 }];
  assert.equal(ParfaitGameLogic.calculateHeight(bSettled, cupBottomY), 20);

  // 5. 複数剛体（空中剛体と着地剛体が混在）
  const bMixed = [
    { y: 450, radius: 25, inCup: true, isGrounded: true, vy: 0.1 },  // topY = 425
    { y: 320, radius: 20, inCup: true, isGrounded: true, vy: -0.5 }, // topY = 300 -> diffPx = 200 -> 33cm
    { y: 30, radius: 28, inCup: true, isGrounded: false, vy: 3.0 },  // 落下中の新しい剛体（無視される）
    { y: 200, radius: 20, inCup: false, isGrounded: false, vy: 0 }   // こぼれた剛体（無視される）
  ];
  assert.equal(ParfaitGameLogic.calculateHeight(bMixed, cupBottomY), 33);

  // 6. vy が undefined の場合 (フォールバック)
  const bNoVy = [{ y: 400, radius: 20, inCup: true, isGrounded: true }];
  assert.equal(ParfaitGameLogic.calculateHeight(bNoVy, cupBottomY), 20);

  // 7. カスタム pxPerCm 指定
  assert.equal(ParfaitGameLogic.calculateHeight(bSettled, cupBottomY, 10), 12);

  // 8. 底面より下にいる極端な剛体 (diffPx <= 0)
  const bBelow = [{ y: 550, radius: 10, inCup: true, isGrounded: true, vy: 0 }];
  assert.equal(ParfaitGameLogic.calculateHeight(bBelow, cupBottomY), 0);
});

test('checkNewRecord: 新記録更新判定の全分岐', () => {
  // 更新成功
  assert.equal(ParfaitGameLogic.checkNewRecord(30, 25), true);

  // 未更新（同じか小さい）
  assert.equal(ParfaitGameLogic.checkNewRecord(25, 25), false);
  assert.equal(ParfaitGameLogic.checkNewRecord(20, 25), false);

  // bestRecord が undefined または null
  assert.equal(ParfaitGameLogic.checkNewRecord(10, undefined), true);
  assert.equal(ParfaitGameLogic.checkNewRecord(10, null), true);
  assert.equal(ParfaitGameLogic.checkNewRecord(0, undefined), false);
});

test('getHeightRank: 高さランク判定の全分岐', () => {
  // 50cm以上
  const rank50 = ParfaitGameLogic.getHeightRank(50);
  assert.equal(rank50.stars, '👑⭐⭐⭐');
  assert.ok(rank50.title.includes('でんせつ'));

  // 35cm〜49cm
  const rank35 = ParfaitGameLogic.getHeightRank(35);
  assert.equal(rank35.stars, '⭐⭐⭐');
  assert.ok(rank35.title.includes('メガ'));

  // 20cm〜34cm
  const rank20 = ParfaitGameLogic.getHeightRank(20);
  assert.equal(rank20.stars, '⭐⭐');
  assert.ok(rank20.title.includes('たか〜い'));

  // 20cm未満
  const rank10 = ParfaitGameLogic.getHeightRank(10);
  assert.equal(rank10.stars, '⭐');
  assert.ok(rank10.title.includes('プチ'));
});
