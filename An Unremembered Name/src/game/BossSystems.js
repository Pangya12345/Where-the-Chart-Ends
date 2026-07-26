import { TAU } from '../core/constants.js';

// Tunable sanity thresholds for the Avatar's escalating final encounter.
export const AVATAR_HIGH_SANITY_THRESHOLD = 66;
export const AVATAR_LOW_SANITY_THRESHOLD = 33;
export const PROJECTILE_DENSITY = .55;

function ring(enemy, count, speed, offset, context, data = {}) {
  const reducedCount = Math.max(3, Math.round(count * PROJECTILE_DENSITY));
  for (let i = 0; i < reducedCount; i++) context.launch(context.hostileShots, enemy.x, enemy.y, offset + i * TAU / reducedCount, speed, { color: enemy.color, ...data });
}

function fixedFan(enemy, count, spread, speed, offset, context, data = {}) {
  const reducedCount = Math.max(3, Math.round(count * PROJECTILE_DENSITY));
  for (let i = 0; i < reducedCount; i++) {
    const angle = offset + (i / Math.max(1, reducedCount - 1) - .5) * spread;
    context.launch(context.hostileShots, enemy.x, enemy.y, angle, speed, { color: enemy.color, ...data });
  }
}

function cartographerCluster(enemy, context, level = 1) {
  enemy.clusterIndex = (enemy.clusterIndex || 0) + 1;
  const clusterSize = Math.max(4, Math.round((8 + level) * PROJECTILE_DENSITY));
  // Cartographer's real ink bullets are aimed at the painter when fired;
  // the surrounding decoys retain their deliberate cluster pattern.
  const aimedAtPlayer = Math.atan2(context.game.player.y - enemy.y, context.game.player.x - enemy.x);
  const offset = aimedAtPlayer;
  const center = (clusterSize - 1) / 2;
  const realSlots = new Set([Math.floor(center), Math.ceil(center)]);
  if (level > 1) realSlots.add(Math.max(0, Math.floor(center) - 1));
  if (level > 2) realSlots.add(Math.min(clusterSize - 1, Math.ceil(center) + 1));
  for (let i = 0; i < clusterSize; i++) {
    const truth = realSlots.has(i);
    const angle = offset + (i - center) * .075;
    context.launch(context.hostileShots, enemy.x, enemy.y, angle, truth ? 130 : 74, {
      color: enemy.color, r: 5, life: 6.4, kind: 'echo', truth, inspectable: true,
      damage: truth ? 8 : 0, source: 'cartographer', cluster: enemy.clusterIndex,
      intendedAngle: angle, intendedSpeed: 130, decoyMoving: truth, delay: i % 2 ? .12 : 0,
    });
  }
}

function avatarAspectPattern(enemy, context, level = 1) {
  const phase = context.game.avatarPhase || 1;
  const density = phase === 1 ? 1 : phase === 2 ? 1.32 : 1.65;
  const speed = phase === 1 ? 1 : phase === 2 ? 1.3 : 1.58;
  const aspect = context.game.avatarAspect % 3;
  const fixed = enemy.phase + context.game.elapsed * .44;
  context.game.avatarAspect++;
  if (aspect === 0) {
    const aimed = Math.atan2(context.game.player.y - enemy.y, context.game.player.x - enemy.x);
    fixedFan(enemy, Math.ceil((9 + level) * density), 1.05, (122 + level * 6) * speed, aimed, context, { r: 4, life: 5.6, kind: 'echo', delay: .18 });
    return;
  }
  if (aspect === 1) { cartographerCluster(enemy, context, Math.min(3, level + 1)); return; }
  if (phase === 3) {
    const aimed = Math.atan2(context.game.player.y - enemy.y, context.game.player.x - enemy.x);
    fixedFan(enemy, Math.ceil((9 + level) * density), .82, (100 + level * 7) * speed, aimed, context, { r: 5, life: 6.1, kind: 'square', delay: .26 });
    return;
  }
  {
    const aimed = Math.atan2(context.game.player.y - enemy.y, context.game.player.x - enemy.x);
    fixedFan(enemy, Math.ceil((7 + level) * density), .7, (92 + level * 6) * speed, aimed, context, { r: 5, life: 6.1, kind: 'square', delay: .26 });
  }
}

export function fireBossPattern(enemy, context, level = 1) {
  const fixed = enemy.phase + context.game.elapsed * .44;
  if (enemy.type === 'choirFace') {
    const aimedAtPlayer = Math.atan2(context.game.player.y - enemy.y, context.game.player.x - enemy.x);
    fixedFan(enemy, 7 + level, .62, 126 + level * 7, aimedAtPlayer, context, { r: 4, life: 5.5, kind: 'echo', delay: .18 });
    return true;
  }
  if (enemy.type === 'cartographer') { cartographerCluster(enemy, context, level); return true; }
  if (enemy.type === 'watcher') {
    const aimedAtPlayer = Math.atan2(context.game.player.y - enemy.y, context.game.player.x - enemy.x);
    fixedFan(enemy, 5 + level, .58, 96 + level * 5, aimedAtPlayer, context, { r: 4, life: 6, kind: 'square', delay: .2 });
    return true;
  }
  if (enemy.type === 'avatar') { avatarAspectPattern(enemy, context, level); return true; }
  return false;
}

function growl(enemy, context, words, severity = 1) {
  enemy.telegraph = Math.max(enemy.telegraph || 0, .46);
  enemy.growlTimer = Math.max(enemy.growlTimer || 0, .95);
  context.startCounterBeat?.(enemy, {
    message: `${enemy.name.toUpperCase()} PREPARES — COUNTER NOW`,
    onMiss: target => {
      context.applyGrowlPenalty(words, severity, target);
      fireBossPattern(target, context, Math.max(1, Math.ceil((1 - target.hp / target.maxHp) * 3)));
    },
  });
  context.game.growlCooldown = context.game.minGrowlCooldown || 2.5;
  context.game.strokeOutput *= .28;
}

function relocateWatcher(watcher) {
  const next = watcher.x < 640 ? 940 : 340;
  watcher.x = next;
  watcher.y = watcher.y < 350 ? 470 : 220;
  watcher.phase += Math.PI * .63;
}

export function updateBossSystems(context, dt) {
  const { game, input } = context;
  game.growlCooldown = Math.max(0, (game.growlCooldown || 0) - dt);
  const boss = game.enemies.find(enemy => !enemy.dead && enemy.boss);
  if (!boss) return;
  if (game.bossTransitionTimer > 0) { game.bossTransitionTimer -= dt; return; }
  game.bossFinishTimer = Math.max(0, game.bossFinishTimer - dt);
  for (const enemy of game.enemies) if (enemy.boss && enemy.growlTimer > 0) enemy.growlTimer = Math.max(0, enemy.growlTimer - dt);

  if (game.bossKind === 'choir') {
    const faces = game.enemies.filter(enemy => !enemy.dead && enemy.type === 'choirFace');
    game.choirPhase = game.bossTotal && faces.reduce((sum, face) => sum + face.hp, 0) <= game.bossTotal * .5 ? 2 : 1;
    if (game.choirPending) {
      game.choirPending.time -= dt;
      if (game.choirPending.time <= 0) { context.startCounterBeat?.(game.choirPending.face, { message: 'SINGER PREPARES — COUNTER NOW', onMiss: face => fireBossPattern(face, context, 1) }); game.choirPending = null; }
    }
    if (game.unisonResolvePending && game.unisonWindow <= 0) {
      faces.forEach(face => context.startCounterBeat?.(face, { message: 'UNISON COUNTER — HIT A SINGER', onMiss: target => fireBossPattern(target, context, 2), window: .5 }));
      game.unisonResolvePending = false;
    }
    game.choirBeat -= dt;
    if (game.choirBeat <= 0 && faces.length) {
      const face = faces[game.choirIndex++ % faces.length];
      face.telegraph = .42;
      if (game.choirPhase === 2) {
        game.unisonWindow = .82; game.unisonPunished = false; game.unisonResolvePending = true;
        game.message = 'THE CHOIR GROWLS IN UNISON — STOP PAINTING';
      } else {
        game.message = `${face.name.toUpperCase()} DRAWS BREATH`;
        game.choirPending = { face, time: .36 };
      }
      game.messageTimer = .78;
      game.choirBeat = game.choirPhase === 2 ? 4.35 : 2.5;
    }
    if (game.growlRequested && game.growlCooldown <= 0) {
      const face = game.brushTarget?.type === 'choirFace' ? game.brushTarget : faces[game.choirIndex % Math.max(1, faces.length)];
      if (face) growl(face, context, 'A SINGER REMEMBERS THE WRECK', 1);
    }
  }

  if (game.bossKind === 'cartographer') {
    game.cartographerClock = (game.cartographerClock || 1.8) - dt;
    if (game.cartographerClock <= 0) {
      boss.telegraph = .38; cartographerCluster(boss, context, 1);
      game.cartographerClock = 2.65;
    }
    if (game.growlRequested && game.growlCooldown <= 0) growl(boss, context, 'YOU PAINTED BEFORE YOU LOOKED', 1);
  }

  if (game.bossKind === 'watcher') {
    const watcher = boss;
    if (!watcher.hidden) {
      watcher.revealTimer = Math.max(0, (watcher.revealTimer || 0) - dt);
      if (!watcher.revealTimer) { watcher.hidden = true; relocateWatcher(watcher); }
    }
    watcher.hiddenAttackClock = (watcher.hiddenAttackClock || 1.1) - dt;
    if (watcher.hiddenAttackClock <= 0) {
      watcher.hiddenAttackClock = watcher.hidden ? 1.42 : 1.02;
      const aimedAtPlayer = Math.atan2(game.player.y - watcher.y, game.player.x - watcher.x);
      fixedFan(watcher, watcher.hidden ? 4 : 6, watcher.hidden ? .54 : .68, watcher.hidden ? 86 : 102, aimedAtPlayer, context, { r: 4, life: 6, kind: 'square', delay: .28 });
    }
    if (watcher.hidden && input.strokePulse && Math.hypot(input.x - watcher.x, input.y - watcher.y) < watcher.r + 72) {
      watcher.hidden = false; watcher.revealTimer = 2.7; watcher.telegraph = .62;
      growl(watcher, context, 'THE SHADOW ANSWERS YOUR PRECISE STROKE', 1);
    } else if (game.growlRequested && game.growlCooldown <= 0) {
      growl(watcher, context, 'THE WATCHER HEARS YOU PAINTING BLINDLY', 1);
    }
  }

  if (game.bossKind === 'avatar') {
    game.avatarElapsed += dt;
    const nextPhase = game.player.sanity > AVATAR_HIGH_SANITY_THRESHOLD ? 1 : game.player.sanity > AVATAR_LOW_SANITY_THRESHOLD ? 2 : 3;
    if (game.avatarPhase !== nextPhase) {
      game.avatarPhase = nextPhase;
      console.debug(`[Avatar] sanity phase changed to ${nextPhase} (sanity: ${Math.ceil(game.player.sanity)})`);
      game.message = nextPhase === 1 ? 'THE AVATAR WAITS.' : nextPhase === 2 ? 'THE AVATAR BENDS ITS DREAM AROUND YOU.' : 'THE ONLY CLEAR PATH IS THE ONE YOU FEARED.';
      game.messageTimer = 2.4;
    }
    const aspectWords = ['THE CHOIR RETURNS IN THE DREAM', 'THE CHART OPENS ACROSS THE CANVAS', 'THE SHADOW MOVES WITHOUT LOOKING'];
    if (game.avatarBaseline <= 0 && game.growlCooldown <= 0) {
      growl(boss, context, aspectWords[game.avatarAspect % 3], 1);
      const cadence = game.avatarPhase === 1 ? 1 : game.avatarPhase === 2 ? .72 : .53;
      game.avatarBaseline = Math.max(1.7, (8.5 - game.avatarElapsed * .12 - game.cracks * .12) * cadence);
    } else if (game.growlRequested && game.growlCooldown <= 0) {
      growl(boss, context, aspectWords[game.avatarAspect % 3], 1);
    }
    game.avatarBaseline -= dt;
  }
  game.growlRequested = false;
}
