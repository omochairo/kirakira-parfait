const ParfaitPhysics = (function () {
  'use strict';

  /**
   * カップの幾何形状および当たり判定用の線分壁を計算
   */
  function computeCupGeometry(cup, stageWidth, stageHeight) {
    if (!Number.isFinite(stageWidth) || stageWidth <= 0 || !Number.isFinite(stageHeight) || stageHeight <= 0) {
      return null;
    }
    const cx = stageWidth / 2;
    const cy = stageHeight - 40;

    const topY = cy - cup.cupHeight;
    const bottomY = cy;
    const leftTopX = cx - cup.topWidth / 2;
    const rightTopX = cx + cup.topWidth / 2;
    const leftBotX = cx - cup.bottomWidth / 2;
    const rightBotX = cx + cup.bottomWidth / 2;

    const walls = [
      // 左斜め壁
      { x1: leftTopX, y1: topY, x2: leftBotX, y2: bottomY },
      // 底面
      { x1: leftBotX, y1: bottomY, x2: rightBotX, y2: bottomY },
      // 右斜め壁
      { x1: rightBotX, y1: bottomY, x2: rightTopX, y2: topY }
    ];

    return {
      cx,
      cy,
      topY,
      bottomY,
      leftTopX,
      rightTopX,
      leftBotX,
      rightBotX,
      cup,
      walls
    };
  }

  /**
   * 円と線分の衝突判定および反発処理
   */
  function resolveCircleLineCollision(b, line, restitution = 0.25, friction = 0.85) {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;

    let t = ((b.x - line.x1) * dx + (b.y - line.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearX = line.x1 + t * dx;
    const nearY = line.y1 + t * dy;

    const diffX = b.x - nearX;
    const diffY = b.y - nearY;
    const dist = Math.sqrt(diffX * diffX + diffY * diffY);

    if (dist < b.radius) {
      const overlap = b.radius - dist;
      const nx = dist > 0.0001 ? diffX / dist : 0;
      const ny = dist > 0.0001 ? diffY / dist : -1;

      b.x += nx * overlap;
      b.y += ny * overlap;

      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        const rest = Math.abs(dot) < 0.8 ? 0 : restitution;
        b.vx -= (1 + rest) * dot * nx;
        b.vy -= (1 + rest) * dot * ny;
        b.vx *= friction;
        b.vRot *= 0.5;
      }
      return true;
    }
    return false;
  }

  /**
   * カップ内部のボールが底面を突き抜けないようにするハードクランプ
   */
  function clampBodyInCup(b, geom) {
    if (!b.inCup) return false;

    const r = b.radius || 28;

    // 底抜け防止ハードクランプ（最重要）
    const maxBottomY = geom.bottomY - r;
    if (b.y > maxBottomY && b.y <= geom.bottomY + r * 2) {
      b.y = maxBottomY;
      if (b.vy > 0) b.vy = 0;
      return true;
    }

    return false;
  }

  /**
   * 円同士の衝突判定とレスポンス（低速非弾性・垂直抗力・接触摩擦で完全静止を実現）
   */
  function resolveCircleCircleCollision(b1, b2, restitution = 0.25) {
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = b1.radius + b2.radius;

    if (dist < minDist && dist > 0.0001) {
      const totalOverlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // 静止剛体は、大きな重なりでない限り位置押し出しに抵抗し、非静止側を優先して押し戻す
      let w1 = 0.5;
      let w2 = 0.5;
      if (totalOverlap < 4) {
        if (b1.isSettled && !b2.isSettled) {
          w1 = 0;
          w2 = 1;
        } else if (!b1.isSettled && b2.isSettled) {
          w1 = 1;
          w2 = 0;
        }
      }

      b1.x -= nx * totalOverlap * w1;
      b1.y -= ny * totalOverlap * w1;
      b2.x += nx * totalOverlap * w2;
      b2.y += ny * totalOverlap * w2;

      const relVx = b1.vx - b2.vx;
      const relVy = b1.vy - b2.vy;
      const normalVel = relVx * nx + relVy * ny;

      // 接近中のみ反発インパルスを適用（離反中は反発させない）
      if (normalVel > 0) {
        const rest = normalVel < 0.8 ? 0 : restitution;
        const impulse = (1 + rest) * normalVel * 0.5;
        b1.vx -= impulse * nx;
        b1.vy -= impulse * ny;
        b2.vx += impulse * nx;
        b2.vy += impulse * ny;
      }

      // 接触摩擦（横滑り防止）
      b1.vx *= 0.95;
      b1.vy *= 0.95;
      b2.vx *= 0.95;
      b2.vy *= 0.95;

      b1.vRot *= 0.7;
      b2.vRot *= 0.7;
      return true;
    }
    return false;
  }

  /**
   * こぼれ落ちたかどうかの判定（現在のy座標におけるカップ壁の外側に出た場合）
   */
  function checkSpill(b, geom) {
    if (!b.inCup) return false;

    // カップの上端より下で、かつカップの左右壁より外側に出た場合
    if (b.y > geom.topY) {
      const ratio = Math.max(0, Math.min(1, (b.y - geom.topY) / (geom.bottomY - geom.topY)));
      const cupLeftX = geom.leftTopX + (geom.leftBotX - geom.leftTopX) * ratio;
      const cupRightX = geom.rightTopX + (geom.rightBotX - geom.rightTopX) * ratio;

      if (b.x < cupLeftX || b.x > cupRightX) {
        b.inCup = false;
        b.isGrounded = false;
        b.isSettled = false;
        b.stillSteps = 0;
        b.noContactSteps = 0;
        return true;
      }
    }
    return false;
  }

  /**
   * サブステップを含む1フレーム分の物理シミュレーション実行
   */
  function stepSimulation(bodies, geom, options = {}) {
    const subSteps = options.subSteps || 6;
    const gravity = (options.gravity !== undefined ? options.gravity : 0.38) / subSteps;
    const friction = Math.pow(options.friction !== undefined ? options.friction : 0.985, 1 / subSteps);
    let spilledCount = 0;

    for (let step = 0; step < subSteps; step++) {
      const hasContact = new Array(bodies.length).fill(false);
      const supported = new Array(bodies.length).fill(false);
      const woken = new Array(bodies.length).fill(false);
      const prevX = new Array(bodies.length);
      const prevY = new Array(bodies.length);

      // 1. 各剛体の位置・速度更新
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        prevX[i] = b.x;
        prevY[i] = b.y;
        b.vy += gravity;
        b.vx *= friction;
        b.vy *= friction;
        if (Math.hypot(b.vx, b.vy) >= 2.5) {
          woken[i] = true;
        }
        b.x += b.vx / subSteps;
        b.y += b.vy / subSteps;

        // 回転の更新と減衰
        b.rot += (b.vRot || 0) / subSteps;
        const rotDamping = b.isGrounded ? 0.85 : 0.98;
        b.vRot = (b.vRot || 0) * rotDamping;
        if (Math.abs(b.vRot) < 0.001) {
          b.vRot = 0;
        }

        // カップ内にいる剛体のみ壁衝突・クランプ・こぼれ判定
        if (b.inCup) {
          for (let j = 0; j < geom.walls.length; j++) {
            if (resolveCircleLineCollision(b, geom.walls[j])) {
              hasContact[i] = true;
              const wall = geom.walls[j];
              // 底面線分（y1, y2がbottomY）との接触のみが直接支持（supported）かつ接地（isGrounded）となる
              if (Math.abs(wall.y1 - geom.bottomY) < 1 && Math.abs(wall.y2 - geom.bottomY) < 1) {
                b.isGrounded = true;
                supported[i] = true;
              } else if (b.y > geom.topY + 5) {
                // カップ側壁による支持（接地ではない）
                supported[i] = true;
              }
            }
          }

          clampBodyInCup(b, geom);

          if (checkSpill(b, geom)) {
            spilledCount++;
          }
        }
      }

      // 2. 接地フラグの厳密な判定（底面接触剛体を基底とする）
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (!b.inCup) {
          b.isGrounded = false;
        } else {
          const atBottom = b.y >= geom.bottomY - b.radius - 2;
          if (atBottom) {
            b.isGrounded = true;
            supported[i] = true;
          }
        }
      }

      // 3. 円同士の衝突判定
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          if (resolveCircleCircleCollision(bodies[i], bodies[j])) {
            hasContact[i] = true;
            hasContact[j] = true;
          }
        }
      }

      // 4. 下からの支持（supported / isGrounded）の伝播（底面からの連鎖のみ）
      const sortedIndices = bodies.map((_, idx) => idx).sort((i1, i2) => bodies[i2].y - bodies[i1].y);
      for (let k = 0; k < sortedIndices.length; k++) {
        const lowerIdx = sortedIndices[k];
        const bLower = bodies[lowerIdx];
        if (!bLower.inCup || !supported[lowerIdx]) continue;

        for (let m = k + 1; m < sortedIndices.length; m++) {
          const upperIdx = sortedIndices[m];
          const bUpper = bodies[upperIdx];
          if (!bUpper.inCup) continue;

          const dx = bUpper.x - bLower.x;
          const dy = bUpper.y - bLower.y; // bUpper is above bLower, dy < 0
          const distSq = dx * dx + dy * dy;
          const minDist = bLower.radius + bUpper.radius;

          if (distSq <= (minDist + 2) * (minDist + 2)) {
            const isAboveRim = bUpper.y < geom.topY;
            const dyHeight = bLower.y - bUpper.y;

            if (isAboveRim) {
              // リムより上: 安定なタワー積載のみ許容（横にはみ出しすぎない）
              const maxDx = 0.75 * minDist;
              const withinMouth = bUpper.x >= geom.leftTopX - bUpper.radius * 0.5 && bUpper.x <= geom.rightTopX + bUpper.radius * 0.5;
              if (dyHeight >= minDist * 0.35 && Math.abs(dx) <= maxDx && withinMouth) {
                supported[upperIdx] = true;
                if (bLower.isGrounded && dyHeight > minDist * 0.4 && Math.abs(dx) <= 0.6 * minDist) {
                  bUpper.isGrounded = true;
                }
                if (bUpper.vy > 0 && Math.abs(bUpper.vy) < 1.0) {
                  bUpper.vy = 0;
                }
              }
            } else {
              // カップ内部: 横並び・壁もたれ・ハニカム充填を確実に支持
              const maxDx = 0.95 * minDist;
              if (dyHeight > 3 && Math.abs(dx) <= maxDx) {
                supported[upperIdx] = true;
                if (bLower.isGrounded && dyHeight > minDist * 0.4 && Math.abs(dx) <= 0.6 * minDist) {
                  bUpper.isGrounded = true;
                }
                if (bUpper.vy > 0 && Math.abs(bUpper.vy) < 1.0) {
                  bUpper.vy = 0;
                }
              }
            }
          }
        }
      }

      // 4.2 支持喪失による起床判定
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (!b.inCup || hasContact[i]) {
          b.noContactSteps = 0;
        } else {
          b.noContactSteps = (b.noContactSteps || 0) + 1;
          if (b.noContactSteps > 45 && (b.isSettled || b.isGrounded)) {
            b.isSettled = false;
            b.isGrounded = false;
            b.stillSteps = 0;
            woken[i] = true;
          }
        }

        // 下からの支持を失った剛体の起床（空中浮遊・フチ乗り凍結の解除）
        if (b.inCup && (b.isSettled || b.isGrounded) && !supported[i]) {
          b.isSettled = false;
          b.isGrounded = false;
          b.stillSteps = 0;
          woken[i] = true;
        }
      }

      // 4.5 下から支持されている剛体のスリープ減衰（強い衝撃で起きた剛体を除き、微振動・クリープを止める）
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (Math.hypot(b.vx, b.vy) >= 2.5) {
          woken[i] = true;
        }
        if (b.inCup && supported[i]) {
          b.vx *= 0.5;
          b.vy *= 0.5;
          if (Math.abs(b.vx) < 0.15) b.vx = 0;
          if (Math.abs(b.vy) < 0.15) b.vy = 0;
          if (b.isSettled && !woken[i] && hasContact[i]) {
            b.vx = 0;
            b.vy = 0;
            b.x = prevX[i];
            b.y = prevY[i];
          }
        }
      }

      // 5. 衝突による押し出し後に、再度底抜け防止クランプと接触拘束時の速度補正を適用
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        clampBodyInCup(b, geom);
        if (hasContact[i] && !woken[i] && supported[i]) {
          const actualVx = (b.x - prevX[i]) * subSteps;
          const actualVy = (b.y - prevY[i]) * subSteps;
          if (b.vy > 0 && actualVy < b.vy) {
            b.vy = Math.max(0, actualVy);
          }
          if (Math.abs(actualVx) < Math.abs(b.vx) && actualVx * b.vx >= 0) {
            b.vx = actualVx;
          }
        }
      }

      // 6. 速度・接触ベースの静止（settled）状態判定（ヒステリシス付き）
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (!b.inCup || woken[i] || !supported[i]) {
          b.stillSteps = 0;
          b.isSettled = false;
          continue;
        }
        const speed = Math.hypot(b.vx, b.vy);
        const enterThreshold = hasContact[i] ? 1.5 : 1.0;
        if (speed < enterThreshold) {
          b.stillSteps = (b.stillSteps || 0) + 1;
          if (b.stillSteps >= 36) {
            b.isSettled = true;
          }
        }
      }
    }

    return { spilledCount };
  }

  /**
   * 新しいトッピング剛体の作成
   */
  function createBody(ing, startX, startY, options = {}) {
    return {
      id: ing.id,
      name: ing.name,
      icon: ing.icon,
      radius: ing.radius || 28,
      isNeta: !!ing.isNeta,
      x: startX,
      y: startY,
      vx: options.vx !== undefined ? options.vx : 0,
      vy: options.vy !== undefined ? options.vy : 2.5,
      rot: options.rot !== undefined ? options.rot : 0,
      vRot: options.vRot !== undefined ? options.vRot : 0,
      inCup: true,
      isGrounded: !!options.isGrounded,
      stillSteps: options.stillSteps !== undefined ? options.stillSteps : 0,
      noContactSteps: options.noContactSteps !== undefined ? options.noContactSteps : 0,
      isSettled: !!options.isSettled,
      spawnTime: options.spawnTime || Date.now()
    };
  }

  return {
    computeCupGeometry,
    resolveCircleLineCollision,
    clampBodyInCup,
    resolveCircleCircleCollision,
    checkSpill,
    stepSimulation,
    createBody
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParfaitPhysics;
}
