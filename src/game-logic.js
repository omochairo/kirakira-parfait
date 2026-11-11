const ParfaitGameLogic = (function () {
  'use strict';

  const INGREDIENTS = [
    { id: 'vanilla',    name: 'バニラ',   icon: '🍨', radius: 28, isNeta: false },
    { id: 'choco',      name: 'チョコ',   icon: '🍫', radius: 26, isNeta: false },
    { id: 'strawberry', name: 'いちご',   icon: '🍓', radius: 25, isNeta: false },
    { id: 'melon',      name: 'メロン',   icon: '🍈', radius: 29, isNeta: false },
    { id: 'cherry',     name: 'チェリー', icon: '🍒', radius: 24, isNeta: false },
    { id: 'banana',     name: 'バナナ',   icon: '🍌', radius: 26, isNeta: false },
    { id: 'pudding',    name: 'プリン',   icon: '🍮', radius: 29, isNeta: false },
    { id: 'cookie',     name: 'クッキー', icon: '🍪', radius: 27, isNeta: false },
    { id: 'whip',       name: 'ホイップ', icon: '🧁', radius: 28, isNeta: false },
    { id: 'star',       name: 'キラ星',   icon: '⭐', radius: 25, isNeta: false },
    { id: 'takoyaki',   name: 'たこやき', icon: '🐙', radius: 27, isNeta: true  },
    { id: 'curry',      name: 'カレー',   icon: '🍛', radius: 28, isNeta: true  }
  ];

  const CUPS = [
    {
      id: 'cup1',
      name: 'ちいさな プチカップ',
      shortName: 'プチカップ',
      icon: '🍨',
      unlocked: true,
      reqClear: 0,
      desc: '3〜4こ のせると もうグラグラ！',
      topWidth: 150,
      bottomWidth: 90,
      cupHeight: 120,
      stemHeight: 40,
      baseWidth: 90,
      glassColor: 'rgba(180, 235, 255, 0.45)',
      rimColor: '#8ee0ff'
    },
    {
      id: 'cup2',
      name: 'まほうの パフェグラス',
      shortName: 'パフェグラス',
      icon: '🍧',
      unlocked: false,
      reqClear: 1,
      desc: 'すこし おおきくて あんていするよ！',
      topWidth: 200,
      bottomWidth: 110,
      cupHeight: 145,
      stemHeight: 45,
      baseWidth: 110,
      glassColor: 'rgba(255, 195, 230, 0.45)',
      rimColor: '#ff94c2'
    },
    {
      id: 'cup3',
      name: 'メガもり ビッグボウル',
      shortName: 'メガボウル',
      icon: '🥣',
      unlocked: false,
      reqClear: 2,
      desc: 'ひろびろ！ たくさんのせられる！',
      topWidth: 250,
      bottomWidth: 140,
      cupHeight: 165,
      stemHeight: 35,
      baseWidth: 130,
      glassColor: 'rgba(180, 255, 225, 0.45)',
      rimColor: '#6deab2'
    },
    {
      id: 'cup4',
      name: 'おうごんの 王冠カップ',
      shortName: 'おうごんカップ',
      icon: '👑',
      unlocked: false,
      reqClear: 3,
      desc: 'キラキラ！ ちょう巨大タワーも作れる！',
      topWidth: 280,
      bottomWidth: 160,
      cupHeight: 180,
      stemHeight: 40,
      baseWidth: 150,
      glassColor: 'rgba(255, 235, 140, 0.55)',
      rimColor: '#ffd700'
    }
  ];

  const CUSTOMERS = [
    { name: 'うさぎさん', avatar: '🐰' },
    { name: 'くまさん',   avatar: '🐻' },
    { name: 'ねこさん',   avatar: '🐱' },
    { name: 'ぱんださん', avatar: '🐼' }
  ];

  /**
   * 注文レシピの生成（ネタ食材は含まない）
   */
  function generateOrder(customerTurn, ingredients = INGREDIENTS, count = null) {
    const normalIngs = ingredients.filter(i => !i.isNeta);
    const recipeLen = count !== null ? count : (3 + (customerTurn === 3 ? 1 : 0));
    const order = [];
    const counts = {};
    for (let i = 0; i < recipeLen; i++) {
      // 同じ材料ばかりの注文にならないよう、各種2個までにする（候補が尽きたら全体から選ぶ）
      let candidates = normalIngs.filter(ing => (counts[ing.id] || 0) < 2);
      if (candidates.length === 0) candidates = normalIngs;
      const rand = candidates[Math.floor(Math.random() * candidates.length)];
      order.push(rand.id);
      counts[rand.id] = (counts[rand.id] || 0) + 1;
    }
    return order;
  }

  /**
   * パフェの完成・判定
   */
  function evaluateParfait(order, currentBodies) {
    // 落下中（空中）のトッピングがあるかチェック
    const hasFalling = currentBodies.some(b => b.inCup && !(b.isGrounded || b.isSettled));
    if (hasFalling) {
      return {
        status: 'falling',
        score: 0,
        message: 'おちてくるのを まってね！🍨',
        reactionType: 'none',
        soundType: 'none'
      };
    }

    // カップ内に着地・静止している剛体のみを対象にする
    const settledBodies = currentBodies.filter(b => b.inCup && (b.isGrounded || b.isSettled));

    if (settledBodies.length === 0) {
      return {
        status: 'empty',
        score: 0,
        message: 'パフェをつくってね！🍓',
        reactionType: 'none',
        soundType: 'none'
      };
    }

    // 注文は「したから」の順なので、積み上がった物理位置（y座標の大きい＝下にある順）で並べ替える
    const sortedBodies = [...settledBodies].sort((a, b) => (b.y || 0) - (a.y || 0));
    const playerIds = sortedBodies.map(b => b.id);
    const hasNeta = sortedBodies.some(b => b.isNeta);

    // 1. 完全一致（順番と個数がピッタリ）
    const isPerfect = order.length === playerIds.length &&
                      order.every((val, idx) => val === playerIds[idx]);

    if (isPerfect) {
      return {
        status: 'perfect',
        score: 100,
        message: 'だいせいこう！ 100てん！🌟',
        reactionType: 'bounce',
        soundType: 'success'
      };
    }

    // 2. おしい判定（ネタ食材なし、かつ材料の多くが一致）
    const orderCounts = {};
    const playerCounts = {};
    order.forEach(id => { orderCounts[id] = (orderCounts[id] || 0) + 1; });
    playerIds.forEach(id => { playerCounts[id] = (playerCounts[id] || 0) + 1; });

    let matchCount = 0;
    for (const id in orderCounts) {
      matchCount += Math.min(orderCounts[id], playerCounts[id] || 0);
    }

    // 余分な材料を大量に入れた「ごまかし」は おしい にならないよう、個数にも上限を設ける
    const hasReasonableCount = playerIds.length <= order.length + 1;
    const isGood = !hasNeta && hasReasonableCount && matchCount >= order.length - 1;

    if (isGood) {
      return {
        status: 'good',
        score: 70,
        message: 'おしい！ おいしい！ 70てん！😊',
        reactionType: 'bounce',
        soundType: 'good'
      };
    }

    // 3. へんてこ・びっくり判定
    const message = hasNeta ? 'びっくり！へんてこ！50てん！🐙' : 'ふしぎなあじ！ 50てん！😋';
    return {
      status: 'funny',
      score: 50,
      message,
      reactionType: 'dizzy',
      soundType: 'funny'
    };
  }

  /**
   * 新しいカップの解放判定
   */
  function checkCupUnlock(totalClears, cups = CUPS) {
    let newlyUnlocked = null;
    cups.forEach(cup => {
      if (!cup.unlocked && totalClears >= cup.reqClear) {
        cup.unlocked = true;
        newlyUnlocked = cup;
      }
    });
    return newlyUnlocked;
  }

  /**
   * お店屋さんモードのランク称号取得
   */
  function getShopRank(totalScore) {
    if (totalScore >= 300) {
      return {
        stars: '⭐⭐⭐',
        title: 'でんせつの パフェマスター！✨'
      };
    } else if (totalScore >= 200) {
      return {
        stars: '⭐⭐',
        title: 'にんきものの パフェしょくにん！👏'
      };
    }
    return {
      stars: '⭐',
      title: 'おもしろ パティシエさん！🥳'
    };
  }

  /**
   * じゆうにつくるモードの称号取得
   */
  function getFreeResult(itemCount) {
    return {
      stars: '✨🍨✨',
      scoreText: `${itemCount}こ のったよ！`,
      title: 'せかいに ひとつだけの パフェタワー！'
    };
  }

  /**
   * 現在のパフェの高さをcm単位で計算（着地・安定している剛体のみ）
   */
  function calculateHeight(bodies, cupBottomY, pxPerCm = 6) {
    // カップ内にあり、かつ接地または静止しており、かつ下向きに高速落下中でない剛体
    const settled = bodies.filter(b => b.inCup && (b.isGrounded || b.isSettled) && (b.vy === undefined || b.vy < 2.5));
    if (settled.length === 0) return 0;

    let highestY = cupBottomY;
    for (let i = 0; i < settled.length; i++) {
      const topY = settled[i].y - settled[i].radius;
      if (topY < highestY) {
        highestY = topY;
      }
    }

    const diffPx = cupBottomY - highestY;
    return Math.max(0, Math.round(diffPx / pxPerCm));
  }

  /**
   * 新記録更新判定
   */
  function checkNewRecord(currentHeight, bestRecord) {
    const best = bestRecord !== undefined && bestRecord !== null ? bestRecord : 0;
    return currentHeight > best;
  }

  /**
   * 高さチャレンジの称号取得
   */
  function getHeightRank(heightCm) {
    if (heightCm >= 50) {
      return {
        stars: '👑⭐⭐⭐',
        title: 'そらまで とどく！ でんせつの パフェタワー！🌌'
      };
    } else if (heightCm >= 35) {
      return {
        stars: '⭐⭐⭐',
        title: 'すごい！ デカもり メガパフェタワー！🗼'
      };
    } else if (heightCm >= 20) {
      return {
        stars: '⭐⭐',
        title: 'たか〜い！ たのしい パフェタワー！✨'
      };
    }
    return {
      stars: '⭐',
      title: 'かわいい プチパフェタワー！🍨'
    };
  }

  const PROGRESS_KEY = 'parfait_progress';

  /**
   * 進行状況（クリア回数と選択中カップ）の保存
   * storage は localStorage 互換オブジェクト（getItem/setItem）
   */
  function saveProgress(storage, progress) {
    try {
      storage.setItem(PROGRESS_KEY, JSON.stringify({
        totalClears: progress.totalClears || 0,
        selectedCupId: progress.selectedCupId || null
      }));
    } catch (e) {
      // プライベートブラウズ等で保存できない環境では、ゲーム続行を優先して黙って諦める
    }
  }

  /**
   * 進行状況の読み込み（未保存・壊れたデータの場合は初期値を返す）
   */
  function loadProgress(storage) {
    try {
      const raw = storage.getItem(PROGRESS_KEY);
      if (!raw) return { totalClears: 0, selectedCupId: null };
      const parsed = JSON.parse(raw);
      return {
        totalClears: parsed.totalClears || 0,
        selectedCupId: parsed.selectedCupId || null
      };
    } catch (e) {
      return { totalClears: 0, selectedCupId: null };
    }
  }

  return {
    INGREDIENTS,
    CUPS,
    CUSTOMERS,
    PROGRESS_KEY,
    generateOrder,
    evaluateParfait,
    checkCupUnlock,
    getShopRank,
    getFreeResult,
    calculateHeight,
    checkNewRecord,
    getHeightRank,
    saveProgress,
    loadProgress
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParfaitGameLogic;
}
