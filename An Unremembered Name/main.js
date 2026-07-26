import { ARENA as SHARED_ARENA, COLORS as SHARED_COLORS, H as SHARED_H, LORE as STORY_LORE, STAGE_NAMES as SHARED_STAGE_NAMES, TAU as SHARED_TAU, W as SHARED_W } from './src/core/constants.js';
import { Pool } from './src/core/Pool.js';
import { PERCEPTION_UPGRADES as UPGRADE_DATA } from './src/data/upgrades.js';
import { PLAYER_CHARACTER_SHEET, playerCharacterFrame } from './src/data/playerSpriteSheet.js';
import { WHISPERER_IDLE_SHEET, whispererIdleFrame } from './src/data/whispererSpriteSheet.js';
import { fireBossPattern, updateBossSystems } from './src/game/BossSystems.js';
import { addCombatMarker, updateCombatMarkers } from './src/game/CombatMarkers.js';
import { SpriteSheetRenderer } from './src/render/SpriteSheet.js';
import { createDrawing } from './src/ui/drawing.js';
import firstBossBackgroundUrl from './BackGround/first_boss.png';
import firstNormalBackgroundUrl from './BackGround/first_normal.png';
import secondBossBackgroundUrl from './BackGround/second_boss.png';
import secondNormalBackgroundUrl from './BackGround/second_normal.png';
import thirdBossBackgroundUrl from './BackGround/third_boss.jpg';
import thirdNormalBackgroundUrl from './BackGround/third_normal.png';
import avatarBackgroundUrl from './BackGround/final_boss.png';
import dreamerSheetUrl from './assets/dreamer-transparent.png';
import playerCharacterSheetUrl from './assets/maincharacter.png';
import whispererSheetUrl from './assets/whisperer-idle.png';
import gunSoundUrl from './sound/gun.wav';
import walkingSoundUrl from './sound/walking.wav';

const W = SHARED_W;
const H = SHARED_H;
const TAU = SHARED_TAU;
const ARENA = SHARED_ARENA;
const DREAMER_CHARACTER_SHEET = {
  frameWidth: 70,
  frameHeight: 106,
  trimDarkBackdrop: false,
  frames: [
    { x: 125, y: 45, width: 67, height: 98 }, { x: 257, y: 45, width: 67, height: 97 }, { x: 388, y: 45, width: 67, height: 97 }, { x: 519, y: 45, width: 66, height: 97 },
    { x: 125, y: 186, width: 66, height: 99 }, { x: 257, y: 186, width: 67, height: 99 }, { x: 389, y: 186, width: 66, height: 99 }, { x: 519, y: 186, width: 66, height: 99 },
    { x: 132, y: 330, width: 52, height: 97 }, { x: 268, y: 331, width: 51, height: 96 }, { x: 402, y: 331, width: 51, height: 96 }, { x: 541, y: 331, width: 51, height: 96 },
    { x: 133, y: 473, width: 52, height: 95 }, { x: 265, y: 473, width: 51, height: 96 }, { x: 396, y: 473, width: 51, height: 96 }, { x: 537, y: 473, width: 51, height: 95 },
    { x: 125, y: 613, width: 67, height: 106 }, { x: 263, y: 615, width: 66, height: 104 }, { x: 394, y: 615, width: 67, height: 104 }, { x: 522, y: 615, width: 67, height: 103 },
    { x: 651, y: 615, width: 65, height: 103 }, { x: 779, y: 615, width: 66, height: 104 }, { x: 130, y: 762, width: 51, height: 96 }, { x: 263, y: 765, width: 51, height: 97 },
    { x: 397, y: 765, width: 52, height: 97 }, { x: 528, y: 764, width: 52, height: 97 }, { x: 658, y: 765, width: 51, height: 94 }, { x: 789, y: 765, width: 51, height: 96 },
    { x: 134, y: 907, width: 51, height: 98 }, { x: 262, y: 907, width: 51, height: 98 }, { x: 398, y: 908, width: 51, height: 97 }, { x: 523, y: 907, width: 51, height: 99 },
  ],
};
const FINAL_EYE_CELLS = [
  [640, 229], // Middle-Up
  [340, 501], // Left-Down
  [940, 501], // Right-Down
];
// Close-range horror visibility. At full sanity the painter sees only a few
// body lengths; lower sanity squeezes that space even further.
const PLAYER_VISION_RADIUS = 142;
const LOW_SANITY_VISION_RADIUS = 82;
const PLAYER_COMBAT_VISION_RADIUS = 235;
const COMBAT_VISION_ENEMY_THRESHOLD = 3;
const VISION_RADIUS_LERP_SPEED = 4.2;
// Hard ceiling for every perception-fire hit. Keep charge tuning bounded even
// if a later change extends the time a stroke can be held.
const MAX_CHARGED_INK_DAMAGE_MULTIPLIER = 2.5;
// Fire-mode tuning. Aggression values are intentionally stored with the
// modes now; Item 19 will consume them when the aggression meter is added.
const FIRE_MODES = {
  fullAuto: {
    label: 'FULL-AUTO', fireInterval: .085, damageMultiplier: 1,
    inkDrainPerSecond: 23, aggressionPerHit: 1,
  },
  precision: {
    label: 'PRECISION', fireCooldown: .55, damageMultiplier: 2.5,
    inkCost: 10, aggressionPerHit: .35,
  },
};
// Rooms are intentionally capped well below the former global 14-enemy cap.
// Keep these separate so each stage can be tuned for its threat density.
const ROOM_SPAWN_CONFIG = {
  1: { interval: 4.0, maxConcurrent: 3 },
  2: { interval: 4.4, maxConcurrent: 4 },
  3: { interval: 4.6, maxConcurrent: 4 },
};
const ENEMY_PROJECTILE_DENSITY = .55;
const ENEMY_ATTACK_STAGGER_MAX = .38;
const SANITY_REGEN_PER_SECOND = 1.15;
const SANITY_RESTORE_ON_FINISHER = 17;
const MIN_GROWL_COOLDOWN = 2.5;
const AGGRESSION_DECAY_PER_SECOND = .7;
const GROWL_THRESHOLD = 8.5;
const BOSS_SEAL_REQUIREMENT_BY_PHASE = { 1: 160, 2: 180, 3: 200 };
const COUNTER_WINDOW_SECONDS = .55;
const REGULAR_SEAL_GAIN_PER_COUNTER = 100;
const BOSS_COUNTERS_PER_PHASE = 4;
const BOSS_PHASE_COUNT = 3;
const FLASHLIGHT_VISION_RADIUS = 345;
const FLASHLIGHT_BEAM_LENGTH = 640;
const FLASHLIGHT_BEAM_SPREAD = .58;
const FLASHLIGHT_BEAM_INNER_SPREAD = .24;
const FLASHLIGHT_BATTERY_DRAIN_PER_SECOND = 10;
const FLASHLIGHT_BATTERY_PICKUP_AMOUNT = 38;

// ─── Canvas, input, and audio ─────────────────────────────────────────────
const app = document.querySelector('#app');
const canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H; canvas.setAttribute('aria-label', 'The Shattered Instant playable game');
app.appendChild(canvas);
const ctx = canvas.getContext('2d');
const fogCanvas = document.createElement('canvas');
fogCanvas.width = W; fogCanvas.height = H;
const fogCtx = fogCanvas.getContext('2d');
const stageOneBossBackground = new Image();
stageOneBossBackground.src = firstBossBackgroundUrl;
const stageOneBackground = new Image();
stageOneBackground.src = firstNormalBackgroundUrl;
const stageTwoBossBackground = new Image();
stageTwoBossBackground.src = secondBossBackgroundUrl;
const stageTwoBackground = new Image();
stageTwoBackground.src = secondNormalBackgroundUrl;
const stageThreeBossBackground = new Image();
stageThreeBossBackground.src = thirdBossBackgroundUrl;
const stageThreeBackground = new Image();
stageThreeBackground.src = thirdNormalBackgroundUrl;
const avatarBackground = new Image();
avatarBackground.src = avatarBackgroundUrl;
const { panel, poly, text, wrap } = createDrawing(ctx);
const sprites = new SpriteSheetRenderer();
sprites.register('dreamer', { src: dreamerSheetUrl, ...DREAMER_CHARACTER_SHEET });
sprites.register('player', { src: playerCharacterSheetUrl, ...PLAYER_CHARACTER_SHEET });
sprites.register('whisperer', { src: whispererSheetUrl, ...WHISPERER_IDLE_SHEET });
window.ShatteredInstantSprites = {
  register: (key, definition) => sprites.register(key, definition),
  unregister: key => sprites.unregister(key),
  clear: () => sprites.clear(),
};

const input = { keys: new Set(), x: W / 2, y: H / 2, clicked: false, firePressed: false, toggleFireMode: false, toggleFlashlight: false, painting: false, mousePainting: false, gamepadPainting: false, padMoveX: 0, padMoveY: 0, strokePulse: false, interact: false, finish: false };
// Static descriptors keep the fog texture cheap: only a few translucent,
// drifting clouds are composited over the existing radial visibility mask.
const FOG_CLOUDS = Array.from({ length: 14 }, (_, index) => ({
  x: (index * 83 + 41) % ARENA.w,
  y: (index * 137 + 29) % ARENA.h,
  radius: 95 + (index * 31) % 105,
  speed: .05 + (index % 4) * .018,
  phase: index * 1.73,
}));
let dreamAudio = null;
let watcherStepAudio = null;
let gunSoundIndex = 0;
let lastGunSoundAt = 0;
const gunSounds = Array.from({ length: 6 }, () => {
  const sound = new Audio(gunSoundUrl);
  sound.volume = .42;
  sound.preload = 'auto';
  return sound;
});
const walkingSound = new Audio(walkingSoundUrl);
walkingSound.volume = .42;
walkingSound.loop = true;
walkingSound.preload = 'auto';
const watcherStepSound = new Audio(walkingSoundUrl);
watcherStepSound.volume = 1;
watcherStepSound.loop = true;
watcherStepSound.preload = 'auto';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const len = (x, y) => Math.hypot(x, y);
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const coverFrameCache = new WeakMap();

function pointer(e) {
  const r = canvas.getBoundingClientRect();
  input.x = (e.clientX - r.left) * W / r.width;
  input.y = (e.clientY - r.top) * H / r.height;
}
canvas.addEventListener('mousemove', pointer);
canvas.addEventListener('mousedown', e => { pointer(e); if (e.button === 0) { input.clicked = true; input.firePressed = true; input.mousePainting = true; input.painting = true; input.strokePulse = true; } });
window.addEventListener('mouseup', e => { if (e.button === 0) { input.mousePainting = false; input.painting = input.gamepadPainting; } });
window.addEventListener('keydown', e => { const key = e.key.toLowerCase(); if (!input.keys.has(key) && key === 'e') input.interact = true; if (!input.keys.has(key) && key === 'f') input.finish = true; if (!input.keys.has(key) && key === 'tab') input.toggleFireMode = true; if (!input.keys.has(key) && key === 'q') input.toggleFlashlight = true; input.keys.add(key); if ([' ', 'tab', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault(); });
window.addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { input.keys.clear(); input.mousePainting = false; input.painting = input.gamepadPainting; });

function updateGamepad() {
  const pads = navigator.getGamepads?.() || [];
  const pad = Array.from(pads).find(candidate => candidate?.connected);
  input.padMoveX = 0; input.padMoveY = 0;
  if (!pad) { input.gamepadPainting = false; input.painting = input.mousePainting; return; }
  input.padMoveX = Math.abs(pad.axes[0] || 0) > .18 ? pad.axes[0] : 0;
  input.padMoveY = Math.abs(pad.axes[1] || 0) > .18 ? pad.axes[1] : 0;
  const aimX = Math.abs(pad.axes[2] || 0) > .22 ? pad.axes[2] : 0, aimY = Math.abs(pad.axes[3] || 0) > .22 ? pad.axes[3] : 0;
  if (aimX || aimY) { input.x = game.player.x + aimX * 260; input.y = game.player.y + aimY * 260; }
  const wasPainting = input.painting;
  input.gamepadPainting = !!(pad.buttons[7]?.pressed || pad.buttons[6]?.pressed || pad.buttons[0]?.pressed);
  input.painting = input.mousePainting || input.gamepadPainting;
  if (input.painting && !wasPainting) { input.strokePulse = true; input.firePressed = true; }
  if (pad.buttons[0]?.pressed && !wasPainting && game.state !== 'playing') input.clicked = true;
}

function beginDreamAudio() {
  if (dreamAudio) { dreamAudio.context.resume?.(); return; }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  try {
    const context = new AudioCtor();
    const tone = context.createOscillator();
    const watcherTone = context.createOscillator();
    const shaper = context.createWaveShaper();
    const master = context.createGain();
    const watcherGain = context.createGain();
    const watcherPan = context.createStereoPanner ? context.createStereoPanner() : null;
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) { const x = i * 2 / (curve.length - 1) - 1; curve[i] = Math.tanh(x * 2.2); }
    tone.type = 'sine'; tone.frequency.value = 43; shaper.curve = curve; shaper.oversample = '2x'; master.gain.value = .003;
    tone.connect(shaper); shaper.connect(master); watcherTone.type = 'triangle'; watcherTone.frequency.value = 92; watcherGain.gain.value = 0;
    watcherTone.connect(watcherGain); if (watcherPan) { watcherGain.connect(watcherPan); watcherPan.connect(master); } else watcherGain.connect(master);
    master.connect(context.destination); tone.start(); watcherTone.start();
    dreamAudio = { context, tone, master, watcherTone, watcherGain, watcherPan };
  } catch (_) { dreamAudio = null; }
}

function updateDreamAudio() {
  if (!dreamAudio || dreamAudio.context.state !== 'running') return;
  const dread = 1 - game.player.sanity / 100 + Math.min(.4, game.cracks * .025);
  const watcher = game.bossKind === 'watcher' ? game.enemies.find(enemy => !enemy.dead && enemy.type === 'watcher') : null;
  const clueTone = watcher?.hidden ? Math.sin(game.elapsed * 4.2 + watcher.phase) * 4 : 0;
  dreamAudio.tone.frequency.setTargetAtTime(43 + dread * 21 + Math.sin(game.elapsed * 1.7) * dread * 4 + clueTone, dreamAudio.context.currentTime, .08);
  dreamAudio.tone.detune.setTargetAtTime(Math.sin(game.elapsed * 9) * dread * 65, dreamAudio.context.currentTime, .06);
  dreamAudio.master.gain.setTargetAtTime(.003 + dread * .022, dreamAudio.context.currentTime, .12);
  if (dreamAudio.watcherTone) {
    const direction = watcher ? clamp((watcher.x - game.player.x) / 420, -1, 1) : 0;
    const audible = watcher?.hidden ? .028 : 0;
    dreamAudio.watcherTone.frequency.setTargetAtTime(88 + Math.abs(direction) * 45 + Math.sin(game.elapsed * 4.2) * 7, dreamAudio.context.currentTime, .06);
    dreamAudio.watcherGain.gain.setTargetAtTime(audible, dreamAudio.context.currentTime, .08);
    dreamAudio.watcherPan?.pan.setTargetAtTime(direction, dreamAudio.context.currentTime, .08);
  }
}

function playGunSound() {
  const now = performance.now();
  if (now - lastGunSoundAt < 48) return;
  lastGunSoundAt = now;
  const sound = gunSounds[gunSoundIndex++ % gunSounds.length];
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function playCounterTone(success = false) {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  try {
    const context = dreamAudio?.context || new AudioCtor();
    context.resume?.();
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = success ? 'triangle' : 'square';
    tone.frequency.value = success ? 760 : 520;
    gain.gain.value = success ? .045 : .025;
    tone.connect(gain); gain.connect(context.destination);
    tone.start();
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + (success ? .18 : .1));
    tone.stop(context.currentTime + (success ? .18 : .1));
  } catch (_) {}
}

function updateWalkingSound() {
  const shouldPlay = game?.state === 'playing' && !game.activeFragment && game.player?.walking;
  if (shouldPlay) {
    if (walkingSound.paused) walkingSound.play().catch(() => {});
    return;
  }
  if (!walkingSound.paused) {
    walkingSound.pause();
    walkingSound.currentTime = 0;
  }
}

function ensureWatcherStepAudio() {
  if (watcherStepAudio) return watcherStepAudio;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    const context = dreamAudio?.context || new AudioCtor();
    const source = context.createMediaElementSource(watcherStepSound);
    const gain = context.createGain();
    const pan = context.createStereoPanner ? context.createStereoPanner() : null;
    gain.gain.value = 0;
    source.connect(gain);
    if (pan) { gain.connect(pan); pan.connect(context.destination); }
    else gain.connect(context.destination);
    watcherStepAudio = { context, gain, pan };
  } catch (_) {
    watcherStepAudio = null;
  }
  return watcherStepAudio;
}

function updateWatcherStepSound() {
  const watcher = game?.state === 'playing' && game.bossKind === 'watcher'
    ? game.enemies.find(enemy => !enemy.dead && enemy.type === 'watcher')
    : null;
  const shouldPlay = Boolean(watcher?.hidden && !game.activeFragment);
  if (!shouldPlay) {
    watcherStepAudio?.gain.gain.setTargetAtTime(0, watcherStepAudio.context.currentTime, .05);
    if (!watcherStepSound.paused) {
      watcherStepSound.pause();
      watcherStepSound.currentTime = 0;
    }
    return;
  }
  const distance = len(game.player.x - watcher.x, game.player.y - watcher.y);
  const closeness = 1 - clamp((distance - 120) / 760, 0, 1);
  const volume = lerp(.12, 1, Math.pow(closeness, .55));
  const pan = clamp((watcher.x - game.player.x) / 360, -1, 1);
  const audio = ensureWatcherStepAudio();
  if (audio) {
    audio.context.resume?.();
    audio.gain.gain.setTargetAtTime(volume, audio.context.currentTime, .06);
    audio.pan?.pan.setTargetAtTime(pan, audio.context.currentTime, .05);
  } else {
    watcherStepSound.volume = volume;
  }
  watcherStepSound.playbackRate = lerp(.9, 1.12, closeness);
  if (watcherStepSound.paused) watcherStepSound.play().catch(() => {});
}

function fit() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fit); fit();

// ─── Reusable combat pools ─────────────────────────────────────────────────
const playerShots = new Pool();
const hostileShots = new Pool();
const particles = new Pool();
const combatMarkers = new Pool();

const COLORS = SHARED_COLORS;
const STAGE_NAMES = SHARED_STAGE_NAMES;
const LORE = [
  'The expedition calls the ruins R’lyeh. You call them a memory, because you painted their stairways before you knew the sea.',
  'The sailors do not beg you to save them. They beg you not to look. Their mouths move only when your attention gives them permission.',
  'Every angle in the city leads somewhere it should not. The map in your notebook has started to redraw the shape of your hand.',
];

// ─── Run state and entity creation ─────────────────────────────────────────
let game;
function newGame() {
  playerShots.clear(); hostileShots.clear(); particles.clear(); combatMarkers.clear();
  const cycles = Number(localStorage.getItem('shattered-instant-cycles') || 0);
  const persistentCracks = Number(localStorage.getItem('shattered-instant-cracks') || 0);
  game = {
    state: 'menu', stage: 1, phase: 'clearing', enemies: [], elapsed: 0, stateTime: 0, fireClock: 0, fireMode: 'fullAuto', phaseOneMode: false,
    player: {
      x: W / 2, y: H / 2 + 120, vx: 0, vy: 0,
      // MARKER: Player-HP — starting and maximum body health are both 100.
      hp: 100, ink: 100, maxInk: 100,
      sanity: 100,
      // MARKER: Player-Damage — automatic perception-fire damage per hit.
      // Kept low enough that an observed threat can reach its escalation levels.
      damage: 8,
      hurtClock: 0, invuln: 0, r: 16,
      // Cursor/Gaze direction and body travel direction are intentionally separate.
      facing: -Math.PI / 2, moveFacing: -Math.PI / 2, walking: false,
      spriteKey: 'player', spriteFrame: 0,
    },
    upgrades: new Set(), storyIndex: 0, cycles, cracks: persistentCracks, runCracks: 0, shake: 0, flash: 0, message: '', messageTimer: 0, bossLabel: '', endingLine: 0,
    hazards: [], bossTotal: 0, observedCount: 0, brushTarget: null, inspectedBullet: null, stageKey: null, keyCollected: false, stageDoor: null, roomSpawnClock: ROOM_SPAWN_CONFIG[1].interval, visionRadius: PLAYER_VISION_RADIUS, flashlight: null, batteryPickups: [], hasFlashlight: false, flashlightOn: false, flashlightBattery: 0,
    bossKind: '', observationPressure: 0, strokeOutput: 0, strokeTime: 0, brushSettleTime: 0, growlCooldown: 0, minGrowlCooldown: MIN_GROWL_COOLDOWN, regularGrowlCooldown: 0, growlRequested: false, aggressionMeter: 0, unisonWindow: 0, unisonPunished: false, avatarBaseline: 7.5, avatarElapsed: 0, avatarAspect: 0, avatarPhase: 1, safePath: null, bossPhase: 1, bossSeal: 0, bossMaxSeal: 100, bossFinishTimer: 0,
    loreFragments: [], nearbyFragment: null, activeFragment: null, choirBeat: .65, choirIndex: 0, choirPhase: 1, choirPending: null, unisonResolvePending: false,
  };
}
newGame();

function makeEnemy(type, x, y, opts = {}) {
  const specs = {
    dreamer: { hp: 120, speed: 37, r: 18, color: COLORS.mint, attack: 1.3, shape: 4, name: 'Dreamer' },
    whisperer: { hp: 155, speed: 18, r: 16, color: COLORS.violet, attack: .86, shape: 6, name: 'Whisperer' },
    husk: { hp: 185, speed: 74, r: 22, color: COLORS.gold, attack: 1.12, shape: 4, name: 'Husk' },
    choirFace: { hp: 260, speed: 12, r: 35, color: COLORS.violet, attack: .7, shape: 6, name: 'Singer of the Choir', spriteKey: 'dreamer' },
    cartographer: { hp: 650, speed: 20, r: 40, color: COLORS.gold, attack: .72, shape: 4, name: 'The Cartographer' },
    watcher: { hp: 580, speed: 16, r: 33, color: COLORS.red, attack: .62, shape: 0, name: 'The Watcher' },
    avatar: { hp: 2200, speed: 7, r: 70, color: COLORS.red, attack: .61, shape: 7, name: 'Avatar of Cthulhu' },
  };
  const s = specs[type];
  const health = opts.hp ?? s.hp;
  const e = { type, x, y, vx: 0, vy: 0, ...s, hp: health, maxHp: health, seal: 0, maxSeal: opts.maxSeal || 100, growlTimer: 0, growlClock: opts.growlClock ?? rand(1.5, 2.7), finishTimer: 0, cooldown: rand(.15, .8) + rand(0, ENEMY_ATTACK_STAGGER_MAX), phase: rand(0, TAU), observed: false, wasObserved: false, dead: false, boss: !!opts.boss, ignoresFogDarkening: !!opts.ignoresFogDarkening, part: opts.part || '', drift: rand(-1, 1), hit: 0, neglect: 0, exposure: 0, attackCount: 0, hesitate: 0, lastFullAutoSealHit: -Infinity, twin: opts.twin || 0, stability: opts.stability || 0, observation: 0, observationLevel: 0, hidden: !!opts.hidden, revealTimer: 0, stationary: !!opts.stationary, telegraph: 0, eyeState: opts.eyeState || '', eyeIndex: opts.eyeIndex ?? -1, eyeMiniPhase: opts.eyeMiniPhase || 1, awakened: !!opts.awakened, activeMaxHp: opts.activeMaxHp || health, awakenedReserve: opts.awakenedReserve || 0, coherenceMaxHp: opts.coherenceMaxHp || health, damageTakenMultiplier: opts.damageTakenMultiplier || 1, spriteKey: opts.spriteKey || s.spriteKey || type, spriteFrame: opts.spriteFrame ?? 0 };
  game.enemies.push(e); return e;
}

function resetBossState() {
  game.bossKind = ''; game.bossLabel = ''; game.bossTotal = 0; game.brushTarget = null;
  game.inspectedBullet = null; game.choirBeat = .65; game.choirIndex = 0; game.choirPhase = 1;
  game.growlCooldown = 0; game.growlRequested = false; game.aggressionMeter = 0; game.unisonWindow = 0; game.unisonPunished = false; game.avatarBaseline = 7.5; game.avatarElapsed = 0; game.avatarAspect = 0; game.avatarPhase = 1; game.safePath = null; game.bossPhase = 1; game.bossSeal = 0; game.bossMaxSeal = BOSS_SEAL_REQUIREMENT_BY_PHASE[1]; game.bossFinishTimer = 0; game.bossTransitionTimer = 0;
  game.choirPending = null; game.unisonResolvePending = false;
}

// ─── Encounter creation ────────────────────────────────────────────────────
function spawnCurrentStage() {
  resetBossState(); game.enemies.length = 0; game.hazards.length = 0; hostileShots.clear(); playerShots.clear();
  const edge = () => {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return [rand(ARENA.x + 60, ARENA.x + ARENA.w - 60), ARENA.y + 38];
    if (side === 1) return [ARENA.x + ARENA.w - 38, rand(ARENA.y + 60, ARENA.y + ARENA.h - 60)];
    if (side === 2) return [rand(ARENA.x + 60, ARENA.x + ARENA.w - 60), ARENA.y + ARENA.h - 38];
    return [ARENA.x + 38, rand(ARENA.y + 60, ARENA.y + ARENA.h - 60)];
  };
  if (game.phaseOneMode && game.stage === 1) {
    makeEnemy('dreamer', W / 2, ARENA.y + 180, { hp: 180, maxSeal: 100, stationary: true, growlClock: 1.8 });
    game.message = 'PHASE 1 TEST — paint while calm to lower HP. During a GROWL, paint to fill SEAL. Press F when SEAL is full.';
    game.messageTimer = 7;
  } else if (game.stage === 1) { for (let i = 0; i < 3; i++) { const p = edge(); makeEnemy('dreamer', ...p); } }
  if (game.stage === 2) {
    for (let i = 0; i < 4; i++) { const p = edge(); makeEnemy('whisperer', ...p, { twin: i % 2 ? -1 : 1 }); }
    for (let i = 0; i < 2; i++) { const p = edge(); makeEnemy('dreamer', ...p); }
  }
  if (game.stage === 3) {
    for (let i = 0; i < 2; i++) { const p = edge(); makeEnemy('husk', ...p); }
    for (let i = 0; i < 2; i++) { const p = edge(); makeEnemy('whisperer', ...p, { twin: i % 2 ? -1 : 1 }); }
    { const p = edge(); makeEnemy('dreamer', ...p); }
    spawnRifts(4, 'city');
  }
  if (game.stage === 4) spawnFinal();
  else { spawnLoreFragments(game.stage); spawnStageKey(); spawnStageDoor(); spawnFlashlightItems(); game.roomSpawnClock = ROOM_SPAWN_CONFIG[game.stage].interval; }
}

function spawnFlashlightItems() {
  game.flashlight = game.stage === 1 ? { x: rand(ARENA.x + 95, ARENA.x + ARENA.w - 95), y: rand(ARENA.y + 95, ARENA.y + ARENA.h - 95), r: 15 } : null;
  game.batteryPickups = game.stage === 1 ? [{ x: ARENA.x + ARENA.w - 145, y: ARENA.y + 110, r: 12 }, { x: ARENA.x + 165, y: ARENA.y + 135, r: 12 }] : [];
}

function spawnStageKey() {
  game.keyCollected = false;
  game.stageKey = {
    x: rand(ARENA.x + 90, ARENA.x + ARENA.w - 90),
    y: rand(ARENA.y + 90, ARENA.y + ARENA.h - 90),
    r: 15,
    bob: rand(0, TAU),
  };
}

function spawnStageDoor() {
  const doorPosition = game.stage === 1
    ? { x: ARENA.x + 900, y: ARENA.y + 234 }
    : { x: ARENA.x + ARENA.w - 44, y: ARENA.y + ARENA.h / 2 };
  game.stageDoor = { ...doorPosition, r: 28, state: 'locked', openTimer: 0 };
}

function updateStageKey() {
  const key = game.stageKey;
  if (!key || game.keyCollected || game.phase !== 'clearing') return;
  if (len(game.player.x - key.x, game.player.y - key.y) < game.player.r + key.r + 10) {
    game.keyCollected = true;
    game.message = 'THE GUARDIAN KEY TURNS IN YOUR HAND.';
    game.messageTimer = 2.5;
  }
}

function updateFlashlightItems(dt) {
  const p = game.player;
  if (input.toggleFlashlight && game.hasFlashlight && game.flashlightBattery > 0) game.flashlightOn = !game.flashlightOn;
  if (game.flashlight && len(p.x - game.flashlight.x, p.y - game.flashlight.y) < p.r + game.flashlight.r + 8) {
    game.hasFlashlight = true; game.flashlightOn = true; game.flashlightBattery = 100; game.flashlight = null;
    game.message = 'YOU FIND A FLASHLIGHT — [Q] TO TOGGLE.'; game.messageTimer = 2.5;
  }
  game.batteryPickups = game.batteryPickups.filter(battery => {
    if (len(p.x - battery.x, p.y - battery.y) >= p.r + battery.r + 8) return true;
    game.flashlightBattery = Math.min(100, game.flashlightBattery + FLASHLIGHT_BATTERY_PICKUP_AMOUNT);
    game.message = 'BATTERY RECOVERED.'; game.messageTimer = 1.2; return false;
  });
  if (game.flashlightOn) {
    game.flashlightBattery = Math.max(0, game.flashlightBattery - FLASHLIGHT_BATTERY_DRAIN_PER_SECOND * dt);
    if (!game.flashlightBattery) { game.flashlightOn = false; game.message = 'FLASHLIGHT BATTERY EMPTY.'; game.messageTimer = 1.4; }
  }
}

function updateStageDoor(dt) {
  const door = game.stageDoor;
  if (!door || game.phase !== 'clearing') return;
  if (door.state === 'opening') {
    door.openTimer -= dt;
    if (door.openTimer <= 0) { game.state = 'upgrade'; game.stateTime = 0; }
    return;
  }
  const nearDoor = len(game.player.x - door.x, game.player.y - door.y) < game.player.r + door.r + 25;
  if (!nearDoor) return;
  if (!game.keyCollected) {
    game.message = 'LOCKED — FIND THE GUARDIAN KEY.'; game.messageTimer = .12;
    return;
  }
  game.message = '[E] OPEN DOOR'; game.messageTimer = .12;
  if (input.interact) {
    door.state = 'opening'; door.openTimer = .72;
    game.message = 'THE LOCK YIELDS.'; game.messageTimer = .72;
  }
}

function updateVisionRadius(dt) {
  const activeEnemies = game.enemies.filter(enemy => !enemy.dead).length;
  const inBossEncounter = game.phase === 'boss' || game.phase === 'final';
  const combatRadius = inBossEncounter || activeEnemies >= COMBAT_VISION_ENEMY_THRESHOLD
    ? PLAYER_COMBAT_VISION_RADIUS
    : PLAYER_VISION_RADIUS;
  const targetRadius = game.flashlightOn ? Math.max(combatRadius, FLASHLIGHT_VISION_RADIUS) : combatRadius;
  game.visionRadius = lerp(game.visionRadius ?? PLAYER_VISION_RADIUS, targetRadius, 1 - Math.exp(-VISION_RADIUS_LERP_SPEED * dt));
}

function updateRoomSpawns(dt) {
  if (game.phase !== 'clearing' || game.stage >= 4 || game.stageDoor?.state === 'opening') return;
  const config = ROOM_SPAWN_CONFIG[game.stage];
  game.roomSpawnClock -= dt;
  if (game.roomSpawnClock > 0 || game.enemies.filter(enemy => !enemy.dead).length >= config.maxConcurrent) return;
  const side = Math.floor(Math.random() * 4);
  const x = side === 1 ? ARENA.x + ARENA.w - 38 : side === 3 ? ARENA.x + 38 : rand(ARENA.x + 60, ARENA.x + ARENA.w - 60);
  const y = side === 0 ? ARENA.y + 38 : side === 2 ? ARENA.y + ARENA.h - 38 : rand(ARENA.y + 60, ARENA.y + ARENA.h - 60);
  const kind = game.stage === 1 ? 'dreamer' : game.stage === 2 ? 'whisperer' : (Math.random() < .5 ? 'husk' : 'whisperer');
  makeEnemy(kind, x, y);
  game.roomSpawnClock = config.interval;
}

function spawnLoreFragments(stage) {
  const spots = [
    [[202, 172], [1076, 525]],
    [[226, 512], [1030, 182]],
    [[176, 270], [1100, 426]],
    [[192, 490], [1082, 184]],
  ][stage - 1] || [];
  const entries = [
    ['A wet note says: the Choir stops together before it begins again.', 'CHOIR HINT: at half strength, put the brush down when all three inhale.'],
    ['A margin drawing labels one ink-drop “real” and the others “merciful.”', 'CARTOGRAPHER HINT: hover a cluster before laying down paint.'],
    ['A sailor scratched: shadows do not move; the eye moves around them.', 'WATCHER HINT: a single tap at a shadow is safer than a spray.'],
    ['The final page ends: it did not rise for us. We rose into the edge of its dream.', 'AVATAR HINT: its Choir, Chart, and Shadow return in sequence.'],
  ][stage - 1] || [];
  game.loreFragments = spots.map((spot, index) => ({ x: spot[0], y: spot[1], r: 20, used: false, title: 'TORN TESTIMONY', text: entries[index] || entries[0], hint: entries[index + 1] || entries[1] }));
}

function updateLoreFragments() {
  if (game.activeFragment) {
    if (input.interact) {
      const fragment = game.activeFragment;
      fragment.used = true; game.activeFragment = null;
      game.player.damage += .75;
      increaseCracksFromLore('THE WORDS SETTLE WRONG IN YOUR MIND. THE WORLD SHIFTS.');
      game.messageTimer = 4.2;
    } else if (input.clicked) { game.activeFragment = null; input.mousePainting = false; input.painting = input.gamepadPainting; }
    return;
  }
  game.nearbyFragment = game.loreFragments.find(fragment => !fragment.used && len(game.player.x - fragment.x, game.player.y - fragment.y) < fragment.r + 28) || null;
  if (game.nearbyFragment && input.interact) game.activeFragment = game.nearbyFragment;
}

function spawnRifts(amount, kind = 'dream') {
  for (let i = 0; i < amount; i++) {
    const a = i * TAU / amount + rand(-.22, .22);
    game.hazards.push({ kind, phase: a, speed: kind === 'dream' ? rand(.18, .31) : rand(.09, .16), orbitX: kind === 'dream' ? rand(250, 410) : rand(180, 330), orbitY: kind === 'dream' ? rand(125, 210) : rand(95, 180), r: kind === 'dream' ? rand(22, 30) : rand(18, 25), damage: kind === 'dream' ? 9 : 6 });
  }
}

function spawnBoss() {
  resetBossState(); game.enemies.length = 0; game.hazards.length = 0; game.loreFragments = []; game.nearbyFragment = null; hostileShots.clear(); playerShots.clear(); game.phase = 'boss';
  if (game.stage === 1) {
    [[W / 2 - 145, 204], [W / 2, 154], [W / 2 + 145, 204]].forEach((point, index) => makeEnemy('choirFace', point[0], point[1], { boss: true, twin: index - 1, ignoresFogDarkening: true }));
    game.bossKind = 'choir'; game.choirBeat = .7; game.choirIndex = 0; game.choirPending = null; game.bossLabel = 'THE CHOIR';
  }
  if (game.stage === 2) { makeEnemy('cartographer', W / 2, ARENA.y + 185, { boss: true, ignoresFogDarkening: true }); game.bossKind = 'cartographer'; game.bossLabel = 'THE CARTOGRAPHER'; }
  if (game.stage === 3) { makeEnemy('watcher', W / 2 + 120, ARENA.y + 280, { boss: true, hidden: true, stationary: true }); spawnRifts(3, 'city'); game.bossKind = 'watcher'; game.bossLabel = 'THE WATCHER'; }
  game.bossTotal = game.enemies.reduce((sum, e) => sum + e.maxHp, 0);
  game.message = game.stage === 1 ? 'PAINT LIGHTLY. EACH SINGER GROWLS BEFORE A PHRASE.' : game.stage === 2 ? 'HOVER OVER A BULLET TO VERIFY WHAT IS REAL.' : 'A SHORT STROKE AT A SHADOW FORCES IT INTO VIEW.';
  game.messageTimer = 3.2;
}

function spawnFinal() {
  resetBossState(); game.enemies.length = 0; game.hazards.length = 0; hostileShots.clear(); playerShots.clear();
  game.phase = 'final'; game.bossKind = 'avatar'; game.bossLabel = 'AVATAR OF CTHULHU';
  const avatar = makeEnemy('avatar', W / 2, ARENA.y + 238, { boss: true, stationary: true, ignoresFogDarkening: true });
  avatar.telegraph = .7; game.bossTotal = avatar.maxHp;
  spawnLoreFragments(4);
  game.message = 'IT DOES NOT NOTICE YOU. PAINT ANYWAY.'; game.messageTimer = 3.4;
}

// ─── Combat, gaze, and damage ──────────────────────────────────────────────
function launch(pool, x, y, angle, speed, data = {}) {
  if (pool.count() >= 260) return;
  // Pools retain object keys. Reset Cartographer-only metadata so a reused
  // projectile can never become an accidental harmless decoy in another fight.
  return pool.get({ truth: undefined, inspectable: false, source: '', inspectTimer: 0, intendedAngle: 0, intendedSpeed: 0, decoyMoving: false, cluster: -1, beamAngle: angle, beamLength: 0, beamWidth: 0, spriteKey: '', spriteFrame: 0, ...data, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: data.r ?? 5, life: data.life ?? 8, damage: data.damage ?? 7, color: data.color || COLORS.red, spin: data.spin || 0, age: 0, delay: data.delay || 0, turn: data.turn || 0, wobble: data.wobble || 0, wobbleRate: data.wobbleRate || 0, kind: data.kind || 'orb' });
}

function enemyFire(e) {
  if (fireBossPattern(e, { game, launch, hostileShots }, e.observationLevel || 1)) return;
  const tier = e.hp / e.maxHp < .4 ? 2 : e.hp / e.maxHp < .7 ? 1 : 0; e.attackCount++;
  const fan = (n, spread, speed, offset, data = {}) => { for (let i = 0; i < n; i++) launch(hostileShots, e.x, e.y, offset + (i / Math.max(1, n - 1) - .5) * spread, speed, { color: e.color, ...data }); };
  const aimedAtPlayer = Math.atan2(game.player.y - e.y, game.player.x - e.x);
  if (e.type === 'dreamer') {
    fan(1 + Math.min(tier, 1), .12, 120, aimedAtPlayer, { r: 4, life: 5.8, kind: 'ring' });
  }
  if (e.type === 'whisperer') {
    fan(1 + Math.min(tier, 2), .18, 152, aimedAtPlayer, { r: 3, life: 5.7, kind: 'echo', delay: .12 });
  }
  if (e.type === 'husk') {
    fan(1 + Math.min(tier, 2), .22, 128, aimedAtPlayer, { r: 5, life: 5.4, kind: 'square' });
  }
}

function damagePlayer(amount) {
  // Enemy contact and projectiles damage the player body only. Enemy Seal is
  // reserved for paint landed during a growl and is never touched here.
  const p = game.player; if (p.invuln > 0) return;
  p.hp -= amount; p.invuln = .6; game.shake = 10; game.flash = .35; addCombatMarker(combatMarkers, p.x, p.y - 18, `BODY -${amount}`, COLORS.red, { vx: rand(-10, 10), life: .72 });
  if (p.hp <= 0) shatterLoop();
}

function shatterLoop() {
  if (game.state === 'dead') return;
  game.failureRecorded = true;
  game.state = 'dead'; game.stateTime = 0;
}

function increaseCracksFromLore(words) {
  game.cracks++; game.runCracks++;
  localStorage.setItem('shattered-instant-cracks', String(game.cracks));
  game.message = `${words} — CRACK +1.`; game.messageTimer = 4.2;
  addCombatMarker(combatMarkers, game.player.x, game.player.y - 30, 'CRACK +1', COLORS.violet, { vx: rand(-10, 10), life: 1.1 });
}

function applyGrowlPenalty(words, severity = 1, source = null) {
  const p = game.player;
  const sanityLoss = (4 + severity * 3) * (game.upgrades.has('varnish') ? .8 : 1);
  p.sanity = Math.max(0, p.sanity - sanityLoss);
  game.shake = Math.max(game.shake, 8 + severity * 2); game.flash = Math.max(game.flash, .34);
  if (source) source.telegraph = Math.max(source.telegraph || 0, .68);
  game.message = `GROWL — ${words}`; game.messageTimer = 1.45;
  addCombatMarker(combatMarkers, p.x, p.y - 30, `SANITY -${Math.ceil(sanityLoss)}`, COLORS.violet, { vx: rand(-10, 10), life: 1.1 });
  if (p.sanity <= 0) shatterLoop();
}

function startCounterBeat(enemy, opts = {}) {
  if (!enemy || enemy.dead) return;
  enemy.counterTimer = opts.window ?? COUNTER_WINDOW_SECONDS;
  enemy.counterMax = enemy.counterTimer;
  enemy.counterActive = true;
  enemy.counterResolved = false;
  enemy.counterMissed = false;
  enemy.counterOnMiss = opts.onMiss || null;
  enemy.growlTimer = Math.max(enemy.growlTimer || 0, enemy.counterTimer + .18);
  enemy.telegraph = Math.max(enemy.telegraph || 0, .75);
  enemy.counterFlash = .34;
  game.counterFlash = .22;
  playCounterTone(false);
  if (opts.message) { game.message = opts.message; game.messageTimer = opts.messageTimer ?? .9; }
}

function updateCounterBeats(dt) {
  for (const enemy of game.enemies) {
    enemy.counterFlash = Math.max(0, (enemy.counterFlash || 0) - dt);
    if (!enemy.counterActive || enemy.dead) continue;
    enemy.counterTimer -= dt;
    if (enemy.counterTimer > 0) continue;
    enemy.counterActive = false;
    enemy.counterMissed = true;
    const onMiss = enemy.counterOnMiss;
    enemy.counterOnMiss = null;
    if (onMiss) onMiss(enemy);
  }
}

function updatePlayer(dt) {
  const p = game.player; let dx = input.padMoveX, dy = input.padMoveY;
  if (input.toggleFireMode) {
    game.fireMode = game.fireMode === 'fullAuto' ? 'precision' : 'fullAuto';
    game.message = `FIRE MODE — ${FIRE_MODES[game.fireMode].label}`;
    game.messageTimer = 1.25;
  }
  if (input.keys.has('w')) dy--; if (input.keys.has('s')) dy++; if (input.keys.has('a')) dx--; if (input.keys.has('d')) dx++;
  if (dx || dy) { const l = len(dx, dy); dx /= l; dy /= l; }
  const speed = game.upgrades.has('reflex') ? 305 : 250;
  p.vx = lerp(p.vx, dx * speed, 1 - Math.exp(-dt * 14)); p.vy = lerp(p.vy, dy * speed, 1 - Math.exp(-dt * 14));
  p.x = clamp(p.x + p.vx * dt, ARENA.x + p.r, ARENA.x + ARENA.w - p.r); p.y = clamp(p.y + p.vy * dt, ARENA.y + p.r, ARENA.y + ARENA.h - p.r);
  const travelSpeed = len(p.vx, p.vy); p.walking = travelSpeed > 12;
  if (p.walking) p.moveFacing = Math.atan2(p.vy, p.vx);
  p.facing = Math.atan2(input.y - p.y, input.x - p.x); p.spriteFrame = playerCharacterFrame(p, game.elapsed); p.invuln = Math.max(0, p.invuln - dt); p.hurtClock = Math.max(0, p.hurtClock - dt);
  p.sanity = Math.min(100, p.sanity + SANITY_REGEN_PER_SECOND * dt);
  game.aggressionMeter = Math.max(0, game.aggressionMeter - AGGRESSION_DECAY_PER_SECOND * dt);
  const mode = FIRE_MODES[game.fireMode];
  const fullAuto = game.fireMode === 'fullAuto';
  const canPaint = fullAuto && input.painting && p.ink > 0;
  // A released brush remains unsettled briefly, so a quick release/re-press
  // cannot erase the penalty from a long continuous stroke.
  if (canPaint) {
    game.strokeTime += dt;
    game.brushSettleTime = 0;
  } else {
    game.brushSettleTime += dt;
    if (game.brushSettleTime >= .24) game.strokeTime = 0;
  }
  p.ink = canPaint ? Math.max(0, p.ink - dt * mode.inkDrainPerSecond) : Math.min(p.maxInk, p.ink + dt * 18);
  game.strokeOutput = Math.max(0, game.strokeOutput - dt * (game.upgrades.has('dilution') ? 38 : 20));
  game.unisonWindow = Math.max(0, game.unisonWindow - dt);
  if (canPaint && game.unisonWindow > 0 && !game.unisonPunished) {
    game.unisonPunished = true;
    applyGrowlPenalty('THE UNISON ENTERS THE SEAL', 2);
  }
  game.fireClock -= dt;
  const precisionShotRequested = !fullAuto && input.firePressed && p.ink >= mode.inkCost;
  if ((canPaint || precisionShotRequested) && game.fireClock <= 0) {
    const intensity = fullAuto ? clamp(.45 + game.strokeTime / .62, .45, 1) : 1;
    const chargeMultiplier = fullAuto
      ? intensity * (game.upgrades.has('pigment') ? 1.3 : 1)
      : mode.damageMultiplier * (game.upgrades.has('pigment') ? 1.3 : 1);
    // Cap at the projectile source, before collision resolution, so every
    // target type receives the same bounded charged-shot damage.
    const damage = p.damage * Math.min(chargeMultiplier, MAX_CHARGED_INK_DAMAGE_MULTIPLIER);
    const width = fullAuto ? (game.upgrades.has('broad') ? 6 : 4) : 5;
    // Short taps are clean. Sustained painting slows down and becomes less accurate.
    const heldPenalty = fullAuto ? clamp((game.strokeTime - .3) / 2.2, 0, 1) : 0;
    const fireInterval = fullAuto ? lerp(mode.fireInterval, .24, heldPenalty) : mode.fireCooldown;
    const lowInk = 1 - p.ink / p.maxInk;
    const holdSpread = heldPenalty * .34;
    const inkBleed = lowInk > .35 ? (lowInk - .35) * .42 : 0;
    const bleed = (Math.random() - .5) * (holdSpread + inkBleed);
    game.fireClock += fireInterval;
    if (!fullAuto) p.ink = Math.max(0, p.ink - mode.inkCost);
    game.strokeOutput += damage;
    launch(playerShots, p.x + Math.cos(p.facing) * 18, p.y + Math.sin(p.facing) * 18, p.facing + bleed, fullAuto ? 610 : 740, { r: width + lowInk * 2, damage, life: 1.15, color: fullAuto ? COLORS.cyan : COLORS.gold, intensity, fireMode: game.fireMode, aggressionContribution: mode.aggressionPerHit });
    playGunSound();
  }
}

function updateBrushAndEnemies(dt) {
  const p = game.player;
  game.regularGrowlCooldown = Math.max(0, game.regularGrowlCooldown - dt);
  const candidates = game.enemies.filter(e => !e.dead && !e.hidden);
  const aimed = candidates.filter(e => len(input.x - e.x, input.y - e.y) < e.r + 28).sort((a, b) => len(input.x - a.x, input.y - a.y) - len(input.x - b.x, input.y - b.y))[0] || null;
  game.brushTarget = aimed;
  for (const e of game.enemies) { e.observed = e === aimed; e.observationLevel = e.observed ? 1 : 0; }

  const inspected = [];
  hostileShots.each(b => { if (b.source === 'cartographer' && b.inspectable && b.age >= b.delay && len(input.x - b.x, input.y - b.y) < b.r + 22) inspected.push(b); });
  game.inspectedBullet = inspected.sort((a, b) => len(input.x - a.x, input.y - a.y) - len(input.x - b.x, input.y - b.y))[0] || null;
  if (game.inspectedBullet) game.inspectedBullet.inspectTimer = .18;

  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.type === 'whisperer') e.spriteFrame = whispererIdleFrame(e, game.elapsed);
    if (e.type === 'dreamer' || e.type === 'choirFace') {
      e.walking = len(e.vx, e.vy) > 8;
      if (e.walking) e.moveFacing = Math.atan2(e.vy, e.vx);
      e.spriteFrame = playerCharacterFrame(e, game.elapsed);
    }
    let move = e.stationary ? 0 : e.speed;
    const randomWanderingEnemy = !e.stationary && !e.hidden;
    const randomWanderingChoir = game.bossKind === 'choir' && e.type === 'choirFace' && e.boss && !e.stationary;
    if (e.type === 'whisperer') move *= 1.75;
    if (randomWanderingChoir) move *= 3.4;
    if (e.type === 'husk') move *= Math.sin(game.elapsed * 3 + e.phase) > .35 ? 1.25 : .62;
    if (randomWanderingEnemy) {
      e.wanderClock = (e.wanderClock ?? rand(.2, 1.1)) - dt;
      if (e.wanderAngle === undefined || e.wanderClock <= 0) {
        e.wanderAngle = rand(0, TAU);
        e.wanderClock = randomWanderingChoir ? rand(.75, 1.9) : rand(.65, 1.85);
      }
      const margin = e.boss ? 130 : 85;
      const nearEdge = e.x < ARENA.x + margin || e.x > ARENA.x + ARENA.w - margin || e.y < ARENA.y + margin || e.y > ARENA.y + ARENA.h - margin;
      const inwardAngle = Math.atan2(ARENA.y + ARENA.h / 2 - e.y, ARENA.x + ARENA.w / 2 - e.x);
      let steering = nearEdge ? e.wanderAngle + angleDiff(inwardAngle, e.wanderAngle) * .76 : e.wanderAngle + Math.sin(game.elapsed * 1.8 + e.phase) * .35;
      if (randomWanderingChoir) {
        const nearest = game.enemies
          .filter(other => other !== e && !other.dead && other.type === 'choirFace')
          .sort((a, b) => len(e.x - a.x, e.y - a.y) - len(e.x - b.x, e.y - b.y))[0];
        if (nearest) {
          const distance = len(e.x - nearest.x, e.y - nearest.y);
          if (distance < 185) {
            const awayAngle = Math.atan2(e.y - nearest.y, e.x - nearest.x);
            steering += angleDiff(awayAngle, steering) * clamp((185 - distance) / 85, 0, .86);
            move *= lerp(1.15, 1.7, clamp((185 - distance) / 185, 0, 1));
          }
        }
      }
      e.vx = lerp(e.vx, Math.cos(steering) * move, 1 - Math.exp(-dt * (e.boss ? 3.5 : 4.2))); e.vy = lerp(e.vy, Math.sin(steering) * move, 1 - Math.exp(-dt * (e.boss ? 3.5 : 4.2)));
    } else {
      e.vx = lerp(e.vx, 0, 1 - Math.exp(-dt * 5)); e.vy = lerp(e.vy, 0, 1 - Math.exp(-dt * 5));
    }
    e.x = clamp(e.x + e.vx * dt, ARENA.x + e.r, ARENA.x + ARENA.w - e.r); e.y = clamp(e.y + e.vy * dt, ARENA.y + e.r, ARENA.y + ARENA.h - e.r);
    e.cooldown -= dt; e.hit = Math.max(0, e.hit - dt);
    if (game.phase === 'clearing' && !e.boss) {
      e.growlClock -= dt;
      if (e.growlTimer > 0) e.growlTimer = Math.max(0, e.growlTimer - dt);
      else if (e.growlClock <= 0 && game.regularGrowlCooldown <= 0) {
        e.growlClock = rand(2.8, 4.2);
        game.regularGrowlCooldown = 2.3;
        startCounterBeat(e, {
          message: `${e.name.toUpperCase()} PREPARES — COUNTER NOW`,
          onMiss: enemy => {
            applyGrowlPenalty(`${enemy.name.toUpperCase()} PUSHES BACK`, 1, enemy);
            enemyFire(enemy);
          },
        });
      }
      if (e.finishTimer > 0) e.finishTimer = Math.max(0, e.finishTimer - dt);
      else e.seal = Math.max(0, e.seal - dt * 13);
    }
    if (!e.boss && !e.counterActive && e.cooldown <= 0) { enemyFire(e); e.cooldown = e.attack; }
    const dist = len(p.x - e.x, p.y - e.y); const blockRadius = e.r + 14;
    if (!e.stationary && !e.hidden && dist < blockRadius) {
      const nx = (p.x - e.x) / Math.max(1, dist), ny = (p.y - e.y) / Math.max(1, dist), shove = (blockRadius - dist) * .86;
      p.x = clamp(p.x + nx * shove, ARENA.x + p.r, ARENA.x + ARENA.w - p.r); p.y = clamp(p.y + ny * shove, ARENA.y + p.r, ARENA.y + ARENA.h - p.r); damagePlayer(e.boss ? 16 : 7);
    }
  }
  game.observedCount = aimed ? 1 : 0;
  game.observationPressure = clamp(game.strokeOutput / 70, 0, 1);
  if (input.finish) {
    if (game.bossFinishTimer > 0) { finishBossPhase(); return; }
    const ready = game.enemies.find(e => !e.dead && e.finishTimer > 0 && len(e.x - p.x, e.y - p.y) < 330);
    if (ready) { game.message = 'THE SEAL CLOSES.'; game.messageTimer = 1.5; p.sanity = Math.min(100, p.sanity + SANITY_RESTORE_ON_FINISHER); defeat(ready); }
    else { game.message = 'NO OPEN SEAL TO FINISH.'; game.messageTimer = .7; }
  }
}

function updateHazards(dt) {
  const p = game.player; const cx = W / 2, cy = ARENA.y + ARENA.h / 2;
  for (const h of game.hazards) {
    const t = game.elapsed * h.speed + h.phase; h.x = cx + Math.cos(t) * h.orbitX; h.y = cy + Math.sin(t * 1.37 + h.phase) * h.orbitY;
    const dx = p.x - h.x, dy = p.y - h.y, d = len(dx, dy), radius = h.r + 13;
    if (d < radius) { const nx = dx / Math.max(1, d), ny = dy / Math.max(1, d), shove = (radius - d) * .7; p.x = clamp(p.x + nx * shove, ARENA.x + p.r, ARENA.x + ARENA.w - p.r); p.y = clamp(p.y + ny * shove, ARENA.y + p.r, ARENA.y + ARENA.h - p.r); damagePlayer(h.damage); }
  }
}

function refreshFinalCoherence() {
  const eyes = game.enemies.filter(enemy => enemy.type === 'eye');
  const total = eyes.reduce((sum, eye) => sum + eye.coherenceMaxHp, 0);
  const remaining = eyes.reduce((sum, eye) => sum + (eye.dead ? 0 : Math.max(0, eye.hp) + (eye.awakened ? 0 : eye.awakenedReserve)), 0);
  game.bossTotal = total; game.coherence = total ? remaining / total * 100 : 0; game.dreamPhase = game.coherence > 50 ? 1 : 2;
}

function awakenFinalEye(eye) {
  eye.awakened = true; eye.eyeState = 'awakened'; eye.hp = eye.awakenedReserve; eye.maxHp = eye.awakenedReserve;
  eye.eyeMiniPhase = 4; eye.damageTakenMultiplier = 1.1; eye.finalPatternClock = .08; eye.telegraph = .86;
  game.message = 'THE EYE REFUSES TO CLOSE — AWAKENED'; game.messageTimer = 2.1; game.flash = .45; game.shake = Math.max(game.shake, 9);
  refreshFinalCoherence();
}

function recordAggressionHit(shot) {
  game.aggressionMeter += shot.aggressionContribution || 0;
  if (!game.bossKind || game.aggressionMeter < GROWL_THRESHOLD || game.growlCooldown > 0) return;
  console.debug(`[Growl] aggression threshold crossed by ${shot.fireMode || 'unknown'} fire (meter: ${game.aggressionMeter.toFixed(2)})`);
  game.growlRequested = true;
  game.aggressionMeter = GROWL_THRESHOLD * .28;
}

function landCounter(target) {
  target.counterActive = false;
  target.counterResolved = true;
  target.counterOnMiss = null;
  target.growlTimer = 0;
  target.cooldown = Math.max(target.cooldown || 0, target.attack || .8);
  target.telegraph = Math.max(target.telegraph || 0, .9);
  target.counterFlash = .5;
  game.counterFlash = .42;
  playCounterTone(true);
  if (target.boss) {
    const gain = game.bossMaxSeal / BOSS_COUNTERS_PER_PHASE;
    game.bossSeal = Math.min(game.bossMaxSeal, game.bossSeal + gain);
    if (game.bossSeal >= game.bossMaxSeal && game.bossFinishTimer <= 0) { game.bossFinishTimer = 2.4; game.message = `COUNTER SEAL COMPLETE — PRESS F TO BREAK PHASE ${game.bossPhase}`; game.messageTimer = 2.4; }
    else { game.message = 'COUNTER LANDED — ATTACK INTERRUPTED'; game.messageTimer = 1.05; }
    addCombatMarker(combatMarkers, target.x, target.y - target.r - 24, `COUNTER +${Math.ceil(gain)}`, COLORS.gold, { vx: rand(-8, 8), life: 1.2 });
  } else {
    target.seal = Math.min(target.maxSeal, target.seal + REGULAR_SEAL_GAIN_PER_COUNTER);
    if (target.seal >= target.maxSeal && target.finishTimer <= 0) { target.finishTimer = 2.4; game.message = 'COUNTER SEAL COMPLETE — PRESS F TO FINISH'; game.messageTimer = 2.4; }
    else { game.message = 'COUNTER LANDED — ATTACK INTERRUPTED'; game.messageTimer = 1.05; }
    addCombatMarker(combatMarkers, target.x, target.y - target.r - 24, 'COUNTER +SEAL', COLORS.gold, { vx: rand(-8, 8), life: 1.2 });
  }
}

function finishBossPhase() {
  const bosses = game.enemies.filter(enemy => !enemy.dead && enemy.boss);
  if (!bosses.length) return;
  game.bossFinishTimer = 0; game.bossSeal = 0;
  game.player.sanity = Math.min(100, game.player.sanity + SANITY_RESTORE_ON_FINISHER);
  hostileShots.clear(); game.shake = Math.max(game.shake, 13); game.flash = .6;
  if (game.bossPhase >= BOSS_PHASE_COUNT) {
    bosses.forEach(defeat); game.message = 'THE FINAL SEAL CLOSES.'; game.messageTimer = 2;
    return;
  }
  game.bossPhase++;
  game.bossMaxSeal = BOSS_SEAL_REQUIREMENT_BY_PHASE[game.bossPhase] || BOSS_SEAL_REQUIREMENT_BY_PHASE[BOSS_PHASE_COUNT];
  bosses.forEach(enemy => { enemy.growlTimer = 0; enemy.hp = enemy.maxHp; enemy.telegraph = 1.05; });
  game.bossTransitionTimer = .8;
  game.message = `THE BOSS SHUDDERS — PHASE ${game.bossPhase}/${BOSS_PHASE_COUNT}.`;
  game.messageTimer = 2.2;
}

function updateShots(dt) {
  playerShots.each(b => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.age += dt;
    if (b.life <= 0 || b.x < ARENA.x || b.x > ARENA.x + ARENA.w || b.y < ARENA.y || b.y > ARENA.y + ARENA.h) b.active = false;
    if (!b.active) return;
    hostileShots.each(sign => {
      if (!b.active || sign.source !== 'cartographer' || sign.age < sign.delay || len(b.x - sign.x, b.y - sign.y) >= b.r + sign.r + 2) return;
      if (sign.inspectTimer <= 0 && game.growlCooldown <= 0) {
        const cartographer = game.enemies.find(e => !e.dead && e.type === 'cartographer');
        applyGrowlPenalty('YOU STRUCK A CLUSTER WITHOUT READING IT', 1, cartographer);
        game.growlCooldown = MIN_GROWL_COOLDOWN; game.strokeOutput *= .35;
      }
      sign.active = false; b.active = false;
    });
    if (!b.active) return;
    for (const e of game.enemies) { if (!e.dead && !e.hidden && len(b.x - e.x, b.y - e.y) < b.r + e.r) {
      const dealt = b.damage;
      recordAggressionHit(b);
      if (e.counterActive) {
        landCounter(e);
      } else {
        e.hp = e.boss ? Math.max(1, e.hp - dealt) : e.hp - dealt;
        addCombatMarker(combatMarkers, e.x + rand(-6, 6), e.y - e.r - 24, `HP -${dealt % 1 ? dealt.toFixed(1) : dealt}`, COLORS.cyan, { vx: rand(-8, 8) });
      }
      e.hit = .12; b.active = false; burst(e.x, e.y, e.color, 4); if (e.hp <= 0) defeat(e); break;
    } }
  });
  hostileShots.each(b => {
    b.age += dt; b.inspectTimer = Math.max(0, (b.inspectTimer || 0) - dt); if (b.age < b.delay) return;
    b.life -= dt;
    if (b.turn) { const speed = len(b.vx, b.vy); const angle = Math.atan2(b.vy, b.vx) + b.turn * dt; b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed; }
    const speed = Math.max(1, len(b.vx, b.vy)); const wobble = b.wobble ? Math.sin(b.age * b.wobbleRate + b.spin) * b.wobble : 0;
    b.x += b.vx * dt - b.vy / speed * wobble * dt; b.y += b.vy * dt + b.vx / speed * wobble * dt;
    if (b.life <= 0 || b.x < ARENA.x - 30 || b.x > ARENA.x + ARENA.w + 30 || b.y < ARENA.y - 30 || b.y > ARENA.y + ARENA.h + 30) b.active = false;
    const hitsPlayer = b.kind === 'beam'
      ? (() => { const dx = game.player.x - b.x, dy = game.player.y - b.y, c = Math.cos(b.beamAngle), s = Math.sin(b.beamAngle); const along = dx * c + dy * s, across = -dx * s + dy * c; return along >= 0 && along <= b.beamLength && Math.abs(across) < b.beamWidth / 2 + 12; })()
      : len(b.x - game.player.x, b.y - game.player.y) < b.r + game.player.r;
    if (b.active && b.truth !== false && hitsPlayer) { if (b.kind !== 'beam') b.active = false; damagePlayer(b.damage); burst(game.player.x, game.player.y, COLORS.red, 5); }
  });
  particles.each(v => { v.x += v.vx * dt; v.y += v.vy * dt; v.life -= dt; if (v.life <= 0) v.active = false; });
  updateCombatMarkers(combatMarkers, dt);
}

function burst(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU; particles.get({ x, y, vx: Math.cos(a) * rand(25, 95), vy: Math.sin(a) * rand(25, 95), life: rand(.22, .55), maxLife: .55, color, active: true }); } }

function defeat(e) {
  e.dead = true; burst(e.x, e.y, e.color, 20); game.shake = Math.max(game.shake, e.boss ? 8 : 3);
}

function advanceIfClear() {
  if (game.state !== 'playing') return;
  if (game.phase === 'clearing') return;
  if (game.enemies.some(e => !e.dead)) return;
  else if (game.phase === 'boss') { game.state = 'story'; game.storyIndex = game.stage - 1; game.stateTime = 0; }
  else if (game.phase === 'final') {
    hostileShots.clear(); playerShots.clear(); particles.clear(); combatMarkers.clear(); game.hazards.length = 0;
    game.state = 'collapse'; game.stateTime = 0; game.endingLine = 0; localStorage.setItem('shattered-instant-cycles', String(game.cycles + 1));
  }
}

/* v0.1 stat upgrades retired; v0.2 uses perception upgrades below.
  { id: 'extended', key: '1', title: 'EXTENDED GAZE', sub: '+20% gaze range', desc: 'Push the boundary of what you dare to understand.' },
  { id: 'focused', key: '2', title: 'FOCUSED MIND', sub: '−30% sanity drain', desc: 'Hold the terrible thought a little longer.' },
  { id: 'fractured', key: '3', title: 'FRACTURED PERCEPTION', sub: 'Observe two enemies', desc: 'A second truth enters through the same wound.' },
  { id: 'reflex', key: '4', title: 'UNNATURAL REFLEX', sub: '+22% movement speed', desc: 'Your body flees before it understands.' },
  { id: 'persistence', key: '5', title: 'DREAM PERSISTENCE', sub: 'Damage restores sanity', desc: 'Pain reminds you that something is still real.' },
*/

/* Upgrade definitions moved to src/data/upgrades.js.
const PERCEPTION_UPGRADES = [
  { id: 'extended', key: '1', title: 'FORBIDDEN PERSPECTIVE', sub: '+20% gaze range', desc: 'See farther into the thing that is approaching.' },
  { id: 'fractured', key: '2', title: 'FRACTURED PERCEPTION', sub: 'Briefly observe two targets', desc: 'The split gaze opens in short, dangerous intervals.' },
  { id: 'borrowed', key: '3', title: 'BORROWED SANITY', sub: 'Observed kills restore sanity', desc: 'A broken thought lends you a little time.' },
  { id: 'recognition', key: '4', title: 'FALSE RECOGNITION', sub: 'Dormant enemies sometimes hesitate', desc: 'For a moment, they mistake you for something older.' },
  { id: 'reflex', key: '5', title: 'UNNATURAL REFLEX', sub: '+22% movement speed', desc: 'Your body flees before it understands.' },
]; */

function isUnlockedUpgrade() { return true; }

function chooseUpgrade(id) {
  if (game.upgrades.has(id)) return;
  game.upgrades.add(id); game.state = 'playing'; game.stateTime = 0; spawnBoss();
}

function clickIn(x, y, w, h) { return input.x >= x && input.x <= x + w && input.y >= y && input.y <= y + h; }

function prepareEncounter(stage) {
  game.stage = stage; game.state = 'playing'; game.stateTime = 0; game.message = ''; game.messageTimer = 0;
  game.fireClock = 0; game.observationPressure = 0; game.observedCount = 0; game.shake = 0; game.flash = 0;
  const p = game.player;
  p.x = W / 2; p.y = H / 2 + 120; p.vx = 0; p.vy = 0; p.hp = 100; p.ink = p.maxInk; p.sanity = 100; p.invuln = 0; p.hurtClock = 0;
  p.facing = -Math.PI / 2; p.moveFacing = -Math.PI / 2; p.walking = false; p.spriteFrame = 0;
  game.strokeOutput = 0; game.strokeTime = 0; game.brushSettleTime = 0; game.growlRequested = false; game.regularGrowlCooldown = 0; game.visionRadius = PLAYER_VISION_RADIUS; game.unisonWindow = 0;
  particles.clear(); combatMarkers.clear(); input.strokePulse = false;
}

function startAtStage(stage) {
  prepareEncounter(stage); game.phase = 'clearing';
  spawnCurrentStage();
}

function startAtBoss(stage) {
  prepareEncounter(stage);
  if (stage === 4) spawnCurrentStage();
  else spawnBoss();
}

function selectedMenuEncounter() {
  for (let i = 0; i < 3; i++) if (clickIn(262 + i * 192, 600, 180, 30)) return { kind: 'horde', stage: i + 1 };
  for (let i = 0; i < 4; i++) if (clickIn(262 + i * 192, 636, 180, 30)) return { kind: 'boss', stage: i + 1 };
  return null;
}

function handleScreens() {
  if (game.state === 'menu' && (input.clicked || input.keys.has('enter') || input.keys.has('1') || input.keys.has('2') || input.keys.has('3') || input.keys.has('4'))) {
    let encounter = null;
    if (input.keys.has('1')) encounter = { kind: 'horde', stage: 1 };
    else if (input.keys.has('2')) encounter = { kind: 'horde', stage: 2 };
    else if (input.keys.has('3')) encounter = { kind: 'horde', stage: 3 };
    else if (input.keys.has('4')) encounter = { kind: 'boss', stage: 4 };
    else if (input.clicked) encounter = selectedMenuEncounter();
    beginDreamAudio();
    if (!encounter) { game.state = 'opening'; game.stateTime = 0; }
    else if (encounter.kind === 'boss') startAtBoss(encounter.stage);
    else startAtStage(encounter.stage);
  }
  else if (game.state === 'opening' && (input.clicked || input.keys.has('enter') || input.keys.has(' '))) startAtStage(1);
  else if (game.state === 'upgrade') {
    UPGRADE_DATA.forEach((u, i) => { const x = 154 + (i % 3) * 330; const y = 214 + Math.floor(i / 3) * 205; if ((input.keys.has(u.key) || (input.clicked && clickIn(x, y, 300, 165))) && isUnlockedUpgrade(u) && !game.upgrades.has(u.id)) chooseUpgrade(u.id); });
  } else if (game.state === 'story' && (input.clicked || input.keys.has('enter') || input.keys.has(' '))) { game.stage++; game.state = 'playing'; game.stateTime = 0; game.phase = 'clearing'; spawnCurrentStage(); }
  else if (game.state === 'dead' && (input.clicked || input.keys.has('enter') || input.keys.has(' '))) newGame();
  else if (game.state === 'ending' && game.stateTime > 5.1 && (input.clicked || input.keys.has('enter') || input.keys.has(' '))) newGame();
  input.clicked = false;
}

function update(dt) {
  game.elapsed += dt; game.stateTime += dt; game.messageTimer = Math.max(0, game.messageTimer - dt); game.shake = Math.max(0, game.shake - dt * 25); game.flash = Math.max(0, game.flash - dt); game.counterFlash = Math.max(0, (game.counterFlash || 0) - dt); if (game.safePath) { game.safePath.timer -= dt; if (game.safePath.timer <= 0) game.safePath = null; }
  updateGamepad();
  if (input.keys.has('escape') || input.keys.has('p')) { if (game.state === 'playing') { game.state = 'paused'; input.keys.delete('p'); input.keys.delete('escape'); } else if (game.state === 'paused') { game.state = 'playing'; input.keys.delete('p'); input.keys.delete('escape'); } }
  handleScreens(); updateDreamAudio();
  if (game.state === 'playing' && game.activeFragment) { updateLoreFragments(); updateWalkingSound(); updateWatcherStepSound(); input.strokePulse = false; input.interact = false; input.clicked = false; input.firePressed = false; input.toggleFireMode = false; input.toggleFlashlight = false; return; }
  if (game.state === 'playing') {
    updatePlayer(dt);
    updateWalkingSound(); updateWatcherStepSound();
    updateBrushAndEnemies(dt); updateBossSystems({ game, input, launch, hostileShots, applyGrowlPenalty, startCounterBeat }, dt); updateCounterBeats(dt); updateHazards(dt); updateShots(dt); updateStageKey(); updateStageDoor(dt); updateRoomSpawns(dt); updateFlashlightItems(dt); updateVisionRadius(dt); updateLoreFragments(); advanceIfClear();
  }
  else if (game.state === 'collapse' && game.stateTime >= 1.32) { game.state = 'ending'; game.stateTime = 0; }
  updateWalkingSound(); updateWatcherStepSound();
  input.strokePulse = false; input.interact = false; input.finish = false; input.firePressed = false; input.toggleFireMode = false; input.toggleFlashlight = false;
}

// ─── Rendering and UI ──────────────────────────────────────────────────────
function drawImageCover(image, x, y, w, h, zoom = 1) {
  if (!image.complete || !image.naturalWidth) return false;
  const cacheKey = `${image.naturalWidth}x${image.naturalHeight}:${w}x${h}:${zoom}`;
  const cached = coverFrameCache.get(image);
  if (cached?.key === cacheKey) {
    ctx.drawImage(image, cached.sx, cached.sy, cached.sw, cached.sh, x, y, w, h);
    return true;
  }
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = w / h;
  let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  if (zoom > 1) {
    const zoomedWidth = sw / zoom;
    const zoomedHeight = sh / zoom;
    sx += (sw - zoomedWidth) / 2;
    sy += (sh - zoomedHeight) / 2;
    sw = zoomedWidth;
    sh = zoomedHeight;
  }
  coverFrameCache.set(image, { key: cacheKey, sx, sy, sw, sh });
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  return true;
}

function drawBackground() {
  ctx.fillStyle = COLORS.ink; ctx.fillRect(0, 0, W, H);
  const p = game.player; const insanity = clamp(1 - p.sanity / 100 + game.observationPressure * .18, 0, 1);
  ctx.save(); ctx.globalAlpha = .12 + insanity * .12; ctx.strokeStyle = COLORS.line; ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) { const yy = ARENA.y + 20 + i * 34 + Math.sin(game.elapsed * .4 + i) * 4; ctx.beginPath(); ctx.moveTo(ARENA.x, yy); ctx.lineTo(ARENA.x + ARENA.w, yy + Math.sin(i * 2.1) * 48); ctx.stroke(); }
  for (let i = 0; i < 13; i++) { const xx = ARENA.x + 25 + i * 92 + Math.cos(game.elapsed * .3 + i) * 4; ctx.beginPath(); ctx.moveTo(xx, ARENA.y); ctx.lineTo(xx + Math.sin(i) * 45, ARENA.y + ARENA.h); ctx.stroke(); }
  ctx.restore();
  const stageOneMapBackground = game.stage === 1 && game.phase === 'boss' ? stageOneBossBackground : stageOneBackground;
  const stageOneMapZoom = game.stage === 1 && game.phase === 'boss' ? 1.45 : game.stage === 1 ? 1.24 : 1;
  const stageTwoMapBackground = game.stage === 2 && game.phase === 'boss' ? stageTwoBossBackground : stageTwoBackground;
  const stageThreeMapBackground = game.stage === 3 && game.phase === 'boss' ? stageThreeBossBackground : stageThreeBackground;
  ctx.fillStyle = game.stage === 1 ? '#111b22' : game.stage === 2 ? '#071827' : game.stage === 3 ? '#0c1020' : '#171017'; ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  if (game.stage === 1) drawImageCover(stageOneMapBackground, ARENA.x, ARENA.y, ARENA.w, ARENA.h, stageOneMapZoom);
  if (game.stage === 2) drawImageCover(stageTwoMapBackground, ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  if (game.stage === 3) drawImageCover(stageThreeMapBackground, ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  if (game.stage === 4) drawImageCover(avatarBackground, ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.strokeStyle = '#31526b'; ctx.lineWidth = 2; ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.save(); ctx.beginPath(); ctx.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.clip();
  if (game.stage === 1) {
    if (!stageOneMapBackground.complete || !stageOneMapBackground.naturalWidth) {
      ctx.strokeStyle = 'rgba(137,242,255,.16)'; ctx.lineWidth = 2;
      for (let y = ARENA.y + 34; y < ARENA.y + ARENA.h; y += 54) { ctx.beginPath(); ctx.moveTo(ARENA.x, y); ctx.lineTo(ARENA.x + ARENA.w, y + Math.sin(y) * 8); ctx.stroke(); }
      for (let x = ARENA.x + 30; x < ARENA.x + ARENA.w; x += 94) { ctx.beginPath(); ctx.moveTo(x, ARENA.y); ctx.lineTo(x - 22, ARENA.y + ARENA.h); ctx.stroke(); }
    }
  } else if (game.stage === 2) {
    if (!stageTwoMapBackground.complete || !stageTwoMapBackground.naturalWidth) {
    ctx.strokeStyle = 'rgba(137,242,255,.18)'; ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) { const y = ARENA.y + 35 + i * 36; ctx.beginPath(); ctx.moveTo(ARENA.x, y); for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 45) ctx.lineTo(x, y + Math.sin(x * .018 + game.elapsed * 2 + i) * 7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,211,126,.08)'; ctx.fillRect(ARENA.x, ARENA.y + 75, ARENA.w, 2);
    }
  } else if (game.stage === 3) {
    if (!stageThreeMapBackground.complete || !stageThreeMapBackground.naturalWidth) {
    ctx.strokeStyle = 'rgba(173,140,255,.22)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const x = ARENA.x + (i * 131) % ARENA.w, y = ARENA.y + (i * 71) % ARENA.h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 110 + Math.sin(game.elapsed + i) * 38, y - 55); ctx.lineTo(x + 188, y + 91); ctx.lineTo(x - 34, y + 128); ctx.closePath(); ctx.stroke(); }
    }
  } else {
    if (!avatarBackground.complete || !avatarBackground.naturalWidth) {
    ctx.strokeStyle = 'rgba(255,108,128,.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(W / 2, ARENA.y + 390, 430, 140, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,239,244,.13)'; ctx.strokeRect(W / 2 - 285, ARENA.y + 76, 570, 324);
    }
  }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = .075 + insanity * .13; ctx.strokeStyle = insanity > .45 ? COLORS.violet : COLORS.line; ctx.lineWidth = 1; ctx.setLineDash([14, 20]);
  for (let i = 0; i < 9; i++) { const yy = ARENA.y + 35 + i * 58; const bend = Math.sin(game.elapsed * 1.3 + i * 1.7) * (8 + insanity * 28); ctx.beginPath(); ctx.moveTo(ARENA.x + 2, yy); ctx.quadraticCurveTo(W / 2 + bend, yy + bend, ARENA.x + ARENA.w - 2, yy - bend); ctx.stroke(); }
  ctx.setLineDash([]); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .07 + insanity * .08; ctx.fillStyle = COLORS.violet; ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.restore();
  if (game.cracks) {
    ctx.save(); ctx.beginPath(); ctx.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.clip(); ctx.strokeStyle = 'rgba(220,239,244,.19)'; ctx.lineWidth = 1;
    for (let i = 0; i < Math.min(36, game.cracks * 2); i++) { const x = ARENA.x + 60 + (i * 173) % (ARENA.w - 120), y = ARENA.y + 45 + (i * 97) % (ARENA.h - 90); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(i * 7) * 25, y + 28); ctx.lineTo(x + Math.cos(i * 11) * 47, y + 51); ctx.stroke(); } ctx.restore();
  }
}

function drawFog() {
  // A soft desaturated purple-grey mask, rather than a black cut-out. The
  // player and HUD remain readable above the overlay.
  const p = game.player;
  const sanityRatio = clamp(p.sanity / 100, 0, 1);
  const baseRadius = game.visionRadius ?? PLAYER_VISION_RADIUS;
  const lowSanityRadius = LOW_SANITY_VISION_RADIUS * (baseRadius / PLAYER_VISION_RADIUS);
  const clearRadius = lerp(lowSanityRadius, baseRadius, sanityRatio);
  const gradient = fogCtx.createRadialGradient(p.x, p.y, clearRadius * .16, p.x, p.y, clearRadius * 1.42);
  gradient.addColorStop(0, 'rgba(28,27,42,0)');
  gradient.addColorStop(.28, 'rgba(28,27,42,.16)');
  gradient.addColorStop(.52, 'rgba(24,24,37,.78)');
  gradient.addColorStop(.76, 'rgba(18,18,29,.97)');
  gradient.addColorStop(1, 'rgba(15,15,25,1)');
  fogCtx.clearRect(0, 0, W, H);
  fogCtx.save(); fogCtx.beginPath(); fogCtx.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); fogCtx.clip();
  fogCtx.fillStyle = gradient; fogCtx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  for (const cloud of FOG_CLOUDS) {
    const x = ARENA.x + (cloud.x + game.elapsed * cloud.speed * 28) % ARENA.w;
    const y = ARENA.y + (cloud.y + Math.sin(game.elapsed * cloud.speed + cloud.phase) * 34 + ARENA.h) % ARENA.h;
    const haze = fogCtx.createRadialGradient(x, y, 0, x, y, cloud.radius);
    haze.addColorStop(0, 'rgba(34,31,48,.16)'); haze.addColorStop(1, 'rgba(34,31,48,0)');
    fogCtx.fillStyle = haze; fogCtx.fillRect(x - cloud.radius, y - cloud.radius, cloud.radius * 2, cloud.radius * 2);
  }
  if (game.flashlightOn && game.flashlightBattery > 0) carveFlashlightBeam(fogCtx);
  fogCtx.restore();
  ctx.drawImage(fogCanvas, 0, 0);
}

function flashlightBeamGeometry() {
  const p = game.player;
  const angle = p.facing;
  const start = {
    x: p.x + Math.cos(angle) * 18,
    y: p.y + Math.sin(angle) * 18,
  };
  return { start, angle };
}

function fillFlashlightCone(targetCtx, spread, length) {
  const { start, angle } = flashlightBeamGeometry();
  targetCtx.beginPath();
  targetCtx.moveTo(start.x, start.y);
  targetCtx.arc(start.x, start.y, length, angle - spread, angle + spread);
  targetCtx.closePath();
}

function carveFlashlightBeam(targetCtx) {
  const strength = clamp(game.flashlightBattery / 100, .2, 1);
  targetCtx.save();
  targetCtx.globalCompositeOperation = 'destination-out';
  const wideBeam = targetCtx.createRadialGradient(game.player.x, game.player.y, 20, game.player.x, game.player.y, FLASHLIGHT_BEAM_LENGTH);
  wideBeam.addColorStop(0, `rgba(255,255,255,${.82 * strength})`);
  wideBeam.addColorStop(.62, `rgba(255,255,255,${.62 * strength})`);
  wideBeam.addColorStop(.86, `rgba(255,255,255,${.22 * strength})`);
  wideBeam.addColorStop(1, 'rgba(255,255,255,0)');
  targetCtx.fillStyle = wideBeam;
  fillFlashlightCone(targetCtx, FLASHLIGHT_BEAM_SPREAD, FLASHLIGHT_BEAM_LENGTH);
  targetCtx.fill();
  targetCtx.fillStyle = `rgba(255,255,255,${.92 * strength})`;
  fillFlashlightCone(targetCtx, FLASHLIGHT_BEAM_INNER_SPREAD, FLASHLIGHT_BEAM_LENGTH * .82);
  targetCtx.fill();
  targetCtx.restore();
}

function drawFlashlightBeam() {
  if (!game.flashlightOn || game.flashlightBattery <= 0) return;
  const strength = clamp(game.flashlightBattery / 100, .25, 1);
  const { start, angle } = flashlightBeamGeometry();
  ctx.save();
  ctx.beginPath(); ctx.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  const beam = ctx.createRadialGradient(start.x, start.y, 8, start.x, start.y, FLASHLIGHT_BEAM_LENGTH);
  beam.addColorStop(0, `rgba(255,233,164,${.42 * strength})`);
  beam.addColorStop(.48, `rgba(255,211,126,${.2 * strength})`);
  beam.addColorStop(.82, `rgba(255,211,126,${.08 * strength})`);
  beam.addColorStop(1, 'rgba(137,242,255,0)');
  ctx.fillStyle = beam;
  fillFlashlightCone(ctx, FLASHLIGHT_BEAM_SPREAD, FLASHLIGHT_BEAM_LENGTH);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,239,188,${.5 * strength})`;
  ctx.shadowColor = COLORS.gold;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(start.x + Math.cos(angle) * FLASHLIGHT_BEAM_LENGTH * .72, start.y + Math.sin(angle) * FLASHLIGHT_BEAM_LENGTH * .72);
  ctx.stroke();
  ctx.restore();
}

function drawSealReadyGlows() {
  ctx.save(); ctx.beginPath(); ctx.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.clip();
  for (const e of game.enemies) {
    const ready = e.boss ? game.bossSeal >= game.bossMaxSeal && game.bossFinishTimer > 0 : e.seal >= e.maxSeal;
    if (e.dead || !ready) continue;
    const pulse = .65 + Math.sin(game.elapsed * 6) * .25;
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .55 + pulse * .28; ctx.strokeStyle = COLORS.gold; ctx.shadowColor = COLORS.violet; ctx.shadowBlur = 28; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 25 + pulse * 9, 0, TAU); ctx.stroke();
    ctx.fillStyle = COLORS.gold; ctx.globalAlpha = .16 + pulse * .12; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 16, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawLowSanitySafePath() {
  const path = game.safePath;
  if (!path || game.player.sanity >= 33) return;
  const boss = game.enemies.find(enemy => !enemy.dead && enemy.type === 'avatar');
  if (!boss) return;
  ctx.save(); ctx.beginPath(); ctx.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.clip();
  ctx.globalAlpha = clamp(path.timer / .35, 0, 1) * .78; ctx.strokeStyle = COLORS.mint; ctx.shadowColor = COLORS.mint; ctx.shadowBlur = 18; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(boss.x + Math.cos(path.angle) * 900, boss.y + Math.sin(path.angle) * 900); ctx.stroke();
  ctx.globalAlpha = .95; ctx.lineWidth = 2; ctx.strokeStyle = COLORS.pale; ctx.stroke(); ctx.restore();
}

function drawBrushGuide() {
  const p = game.player; const intensity = input.painting ? clamp(.45 + game.strokeTime / .62, .45, 1) : .18;
  ctx.save(); ctx.globalAlpha = .18 + intensity * .42; ctx.strokeStyle = COLORS.cyan; ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 14; ctx.lineWidth = input.painting ? 2 + intensity * 5 : 1;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(input.x, input.y); ctx.stroke(); ctx.restore();
}

function drawEnemy(e) {
  if (e.dead) return;
  if (e.hidden) { ctx.save(); ctx.globalAlpha = .17 + Math.sin(game.elapsed * 5 + e.phase) * .05; ctx.strokeStyle = e.color; ctx.lineWidth = 1; const clueX = e.x + Math.sin(game.elapsed * 2 + e.phase) * 18, clueY = e.y + Math.cos(game.elapsed * 1.7 + e.phase) * 12; ctx.beginPath(); ctx.arc(clueX, clueY, e.r * .86, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(clueX - e.r, clueY + e.r); ctx.lineTo(clueX + e.r, clueY - e.r); ctx.stroke(); ctx.restore(); return; }
  const finalEye = game.phase === 'final' && e.type === 'eye'; const asleepEye = finalEye && e.eyeState === 'asleep';
  const alpha = asleepEye ? .24 : e.observed ? 1 : .52; ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = e.color; ctx.shadowBlur = e.type === 'whisperer' || e.type === 'dreamer' || e.type === 'choirFace' ? 0 : e.observed ? 17 : 4;
  const eyeFrame = asleepEye ? 0 : e.awakened ? 2 : 1;
  const spriteSize = e.type === 'whisperer'
    ? { width: e.r * 3.65, height: e.r * 3.9, rotation: 0 }
    : e.type === 'dreamer'
      ? { width: e.r * 1.85, height: e.r * 2.55, rotation: 0 }
    : e.type === 'choirFace'
      ? { width: e.r * 1.8, height: e.r * 2.5, rotation: 0 }
    : { width: e.r * 2.7, height: e.r * 2.7, rotation: e.phase };
  const drewSprite = sprites.draw(ctx, e.spriteKey, finalEye ? eyeFrame : e.spriteFrame, e.x, e.y, spriteSize);
  if (!drewSprite && e.type === 'eye') {
    ctx.fillStyle = '#32151f'; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 1.35, e.r * .75, e.phase, 0, TAU); ctx.fill();
    if (asleepEye) { ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x - e.r * .62, e.y); ctx.quadraticCurveTo(e.x, e.y + 5, e.x + e.r * .62, e.y); ctx.stroke(); }
    else { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * .36, 0, TAU); ctx.fill(); ctx.fillStyle = COLORS.ink; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * .16, 0, TAU); ctx.fill(); }
  }
  else if (!drewSprite && e.type === 'watcher') { ctx.fillStyle = '#32151f'; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 1.35, e.r * .75, e.phase, 0, TAU); ctx.fill(); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * .36, 0, TAU); ctx.fill(); ctx.fillStyle = COLORS.ink; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * .16, 0, TAU); ctx.fill(); }
  else if (!drewSprite && e.type === 'avatar') {
    ctx.fillStyle = '#25101a'; ctx.beginPath(); ctx.ellipse(e.x, e.y - 8, e.r * .78, e.r * .62, 0, 0, TAU); ctx.fill();
    const avatarTint = game.avatarPhase === 3 ? COLORS.violet : game.avatarPhase === 2 ? COLORS.gold : e.color;
    ctx.strokeStyle = avatarTint; ctx.lineWidth = 4;
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + game.elapsed * .16; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * 25, e.y + 20 + Math.sin(a) * 12); ctx.quadraticCurveTo(e.x + Math.cos(a) * 82, e.y + 65 + Math.sin(a * 2 + game.elapsed) * 28, e.x + Math.cos(a) * 102, e.y + 88); ctx.stroke(); }
    ctx.fillStyle = avatarTint; ctx.beginPath(); ctx.arc(e.x, e.y - 12, e.r * .22, 0, TAU); ctx.fill(); ctx.fillStyle = COLORS.ink; ctx.beginPath(); ctx.arc(e.x, e.y - 12, e.r * .09, 0, TAU); ctx.fill();
  }
  else if (!drewSprite && e.type !== 'dreamer' && e.type !== 'choirFace') { poly(e.x, e.y, e.r, e.shape, e.phase + game.elapsed * (e.observed ? .55 : .12), e.color); ctx.fillStyle = COLORS.ink; ctx.globalAlpha = alpha * .75; poly(e.x, e.y, e.r * .45, Math.max(3, e.shape), -e.phase, COLORS.ink); }
  if (game.cracks) {
    ctx.save(); ctx.globalAlpha = Math.min(.72, .16 + game.cracks * .025); ctx.strokeStyle = COLORS.pale; ctx.lineWidth = 1;
    for (let i = 0; i < Math.min(7, Math.ceil(game.cracks / 2)); i++) { const a = i * 2.27 + e.phase; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * e.r * .18, e.y + Math.sin(a) * e.r * .18); ctx.lineTo(e.x + Math.cos(a + .27) * e.r * .78, e.y + Math.sin(a + .27) * e.r * .78); ctx.stroke(); } ctx.restore();
  }
  ctx.shadowBlur = 0;
  if (e.counterActive || e.counterFlash > 0) {
    const pulse = e.counterActive ? .75 + Math.sin(game.elapsed * 42) * .25 : clamp(e.counterFlash / .5, 0, 1);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .35 + pulse * .5; ctx.strokeStyle = '#ffffff'; ctx.shadowColor = COLORS.red; ctx.shadowBlur = 18; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 17 + pulse * 9, 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.globalAlpha = alpha;
  }
  if (!e.boss && e.seal >= e.maxSeal) {
    const pulse = .65 + Math.sin(game.elapsed * 6) * .25;
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .55 + pulse * .25; ctx.strokeStyle = COLORS.gold; ctx.shadowColor = COLORS.violet; ctx.shadowBlur = 24; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 23 + pulse * 7, 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.globalAlpha = alpha;
  }
  if (e.type !== 'whisperer' && e.type !== 'dreamer' && e.type !== 'choirFace' && e.telegraph > 0) { ctx.globalAlpha = .2 + e.telegraph * 1.1; ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 12 + (1 - e.telegraph / .36) * 16, 0, TAU); ctx.stroke(); }
  if (e.type !== 'whisperer' && e.type !== 'dreamer' && e.type !== 'choirFace' && !e.observed && e.neglect > 2.8) { ctx.globalAlpha = Math.min(.7, .12 + e.neglect * .05); ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5 + Math.sin(game.elapsed * 4 + e.phase) * 3, 0, TAU); ctx.stroke(); }
  if (e.observed || finalEye || e.counterActive || (!e.boss && (e.growlTimer > 0 || e.seal > 0))) { const barW = Math.max(92, e.r * 2.5); const barY = e.y - e.r - 21; const eyeLabel = asleepEye ? 'ASLEEP EYE' : e.awakened ? 'EYE — AWAKENED' : `EYE — ACTIVE ${e.eyeMiniPhase}/3`; const label = finalEye ? `${eyeLabel}  HP ${Math.max(0, Math.ceil(e.hp))}/${e.maxHp}` : `${e.name}  HP ${Math.max(0, Math.ceil(e.hp))}/${e.maxHp}`; ctx.fillStyle = 'rgba(2,5,8,.8)'; ctx.fillRect(e.x - barW / 2, barY, barW, 4); ctx.fillStyle = asleepEye ? COLORS.dim : e.color; ctx.fillRect(e.x - barW / 2, barY, barW * Math.max(0, e.hp / e.maxHp), 4); ctx.fillStyle = 'rgba(2,5,8,.8)'; ctx.fillRect(e.x - barW / 2, barY + 7, barW, 4); ctx.fillStyle = COLORS.gold; ctx.fillRect(e.x - barW / 2, barY + 7, barW * Math.max(0, e.seal / e.maxSeal), 4); text(label, e.x, barY - 6, 9, asleepEye ? COLORS.dim : COLORS.pale, 'center'); if (e.counterActive) text('COUNTER NOW', e.x, barY - 18, 10, COLORS.gold, 'center'); else if (e.growlTimer > 0) text('PREPARING', e.x, barY - 18, 9, COLORS.red, 'center'); if (e.finishTimer > 0) text('PRESS F — FINISH', e.x, barY - 30, 10, COLORS.gold, 'center'); }
  if (e.observed) { const indicatorY = e.y - e.r - 39; for (let i = 0; i < 3; i++) { ctx.fillStyle = i < e.observationLevel ? COLORS.cyan : 'rgba(137,242,255,.22)'; ctx.fillRect(e.x - 11 + i * 8, indicatorY, 5, 3); } }
  ctx.restore();
}

function drawHazards() {
  for (const h of game.hazards) {
    const color = h.kind === 'dream' ? COLORS.red : COLORS.gold; ctx.save(); ctx.globalAlpha = h.kind === 'dream' ? .75 : .58; ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r + Math.sin(game.elapsed * 3 + h.phase) * 3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r * .43, 0, TAU); ctx.stroke(); ctx.translate(h.x, h.y); poly(0, 0, h.r * .72, 4, game.elapsed * (h.kind === 'dream' ? .9 : -.5) + h.phase, color, false); ctx.restore();
  }
}

function drawLoreFragments() {
  for (const fragment of game.loreFragments) {
    if (fragment.used) continue;
    const near = fragment === game.nearbyFragment;
    ctx.save(); ctx.translate(fragment.x, fragment.y); ctx.rotate(game.elapsed * .35); ctx.globalAlpha = near ? 1 : .58; ctx.shadowColor = COLORS.gold; ctx.shadowBlur = near ? 18 : 5; ctx.fillStyle = '#d6c29a'; ctx.fillRect(-9, -12, 18, 24); ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 1; ctx.strokeRect(-9, -12, 18, 24); ctx.restore();
    if (near) text('PRESS E TO READ', fragment.x, fragment.y - 27, 10, COLORS.gold, 'center');
  }
  if (game.activeFragment) {
    const fragment = game.activeFragment; ctx.fillStyle = 'rgba(1,4,8,.72)'; ctx.fillRect(0, 0, W, H); panel(280, 220, 720, 250, .97); text(fragment.title, W / 2, 266, 14, COLORS.gold, 'center'); wrap(fragment.text, W / 2, 325, 545, 28, 18, COLORS.pale, 'center'); text('PRESS E TO READ — GAIN A HINT AND +0.75 PIGMENT, ADD 1 CRACK', W / 2, 410, 11, COLORS.violet, 'center'); text('CLICK TO LEAVE IT UNREAD', W / 2, 438, 11, COLORS.dim, 'center');
  }
}

function drawStageKey() {
  const key = game.stageKey;
  if (!key || game.keyCollected || game.phase !== 'clearing') return;
  // Combat visibility never reveals a key outside normal exploration range.
  if (len(game.player.x - key.x, game.player.y - key.y) > PLAYER_VISION_RADIUS) return;
  const y = key.y + Math.sin(game.elapsed * 2.4 + key.bob) * 5;
  ctx.save(); ctx.translate(key.x, y); ctx.rotate(game.elapsed * .8);
  ctx.globalAlpha = .64; ctx.shadowColor = COLORS.gold; ctx.shadowBlur = 3; ctx.strokeStyle = '#b09a66'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -7, 7, 0, TAU); ctx.moveTo(7, -2); ctx.lineTo(18, 9); ctx.lineTo(13, 14); ctx.moveTo(16, 7); ctx.lineTo(11, 12); ctx.stroke();
  ctx.restore();
}

function drawStageDoor() {
  const door = game.stageDoor;
  if (!door || game.phase !== 'clearing') return;
  const opening = door.state === 'opening';
  ctx.save(); ctx.translate(door.x, door.y);
  ctx.fillStyle = opening ? '#33495a' : '#202637'; ctx.fillRect(-18, -32, 36, 64);
  ctx.strokeStyle = opening ? COLORS.mint : COLORS.gold; ctx.lineWidth = 3; ctx.strokeRect(-18, -32, 36, 64);
  if (!opening) { ctx.fillStyle = COLORS.gold; ctx.fillRect(-4, -3, 8, 11); ctx.beginPath(); ctx.arc(0, -4, 7, Math.PI, 0); ctx.stroke(); }
  else { ctx.globalAlpha = .7; ctx.strokeStyle = COLORS.mint; ctx.beginPath(); ctx.moveTo(-13, -25); ctx.lineTo(13, 25); ctx.stroke(); }
  ctx.restore();
}

function drawFlashlightItems() {
  if (game.phase !== 'clearing') return;
  if (game.flashlight) {
    const item = game.flashlight; ctx.save(); ctx.translate(item.x, item.y); ctx.globalAlpha = .8; ctx.fillStyle = '#9db8b6'; ctx.fillRect(-12, -5, 18, 10); ctx.fillStyle = COLORS.gold; ctx.fillRect(6, -3, 8, 6); ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 7; ctx.fillStyle = COLORS.cyan; ctx.fillRect(-16, -3, 4, 6); ctx.restore();
  }
  for (const battery of game.batteryPickups) { ctx.save(); ctx.translate(battery.x, battery.y); ctx.globalAlpha = .72; ctx.fillStyle = '#78869a'; ctx.fillRect(-7, -11, 14, 22); ctx.fillStyle = COLORS.cyan; ctx.fillRect(-3, -14, 6, 4); ctx.restore(); }
}

function drawShots() {
  hostileShots.each(b => {
    ctx.save(); ctx.shadowBlur = 11; ctx.shadowColor = b.color;
    if (b.kind === 'beam') {
      const telegraph = b.age < b.delay; ctx.beginPath(); ctx.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.clip(); ctx.translate(b.x, b.y); ctx.rotate(b.beamAngle); ctx.globalAlpha = telegraph ? .3 : .78; ctx.lineWidth = telegraph ? 2 : b.beamWidth;
      ctx.strokeStyle = b.color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(b.beamLength, 0); ctx.stroke();
      if (telegraph) { ctx.globalAlpha = .18; ctx.lineWidth = b.beamWidth; ctx.stroke(); }
      ctx.restore(); return;
    }
    if (b.age < b.delay) { ctx.globalAlpha = .26 + .25 * Math.sin(game.elapsed * 12); ctx.strokeStyle = b.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6 + Math.sin(game.elapsed * 7) * 2, 0, TAU); ctx.stroke(); ctx.restore(); return; }
    if (sprites.draw(ctx, b.spriteKey || 'hostileBullet', b.spriteFrame, b.x, b.y, { width: b.r * 2.4, height: b.r * 2.4, rotation: Math.atan2(b.vy, b.vx) })) { ctx.restore(); return; }
    ctx.fillStyle = b.color;
    if (b.kind === 'ring') { ctx.lineWidth = 2; ctx.strokeStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
    else if (b.kind === 'square') { ctx.translate(b.x, b.y); ctx.rotate(b.age * 2 + b.spin); ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2); }
    else if (b.kind === 'wave') { ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); poly(0, 0, b.r + 1, 4, Math.PI / 4, b.color); }
    else { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
    if (b.inspectTimer > 0) { const muddled = game.cracks > 3 && Math.sin(game.elapsed * (7 + game.cracks) + b.cluster * 3) > 1 - Math.min(.62, game.cracks * .055); ctx.shadowBlur = 0; ctx.globalAlpha = muddled ? .38 : .9; ctx.strokeStyle = muddled ? COLORS.violet : (b.truth ? COLORS.mint : COLORS.dim); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5, 0, TAU); ctx.stroke(); }
    ctx.restore();
  });
  playerShots.each(b => { if (!sprites.draw(ctx, b.spriteKey || 'playerBullet', b.spriteFrame, b.x, b.y, { width: 8, height: 8, rotation: Math.atan2(b.vy, b.vx) })) { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = COLORS.cyan; ctx.fillStyle = COLORS.cyan; ctx.fillRect(b.x - 2, b.y - 2, 4, 4); ctx.restore(); } });
  particles.each(v => { ctx.globalAlpha = clamp(v.life / v.maxLife, 0, 1) * .55; ctx.fillStyle = v.color; ctx.fillRect(v.x - 1, v.y - 1, 2, 2); }); ctx.globalAlpha = 1;
  combatMarkers.each(marker => { ctx.globalAlpha = clamp(marker.life / marker.maxLife, 0, 1); text(marker.value, marker.x, marker.y, 12, marker.color, 'center'); }); ctx.globalAlpha = 1;
}

function drawPlayer() {
  const p = game.player; const alpha = p.invuln > 0 ? .55 + Math.sin(game.elapsed * 28) * .35 : 1;
  const drewSprite = sprites.draw(ctx, p.spriteKey, p.spriteFrame, p.x, p.y, { width: 38, height: 60, alpha });
  const lightColor = game.flashlightOn ? COLORS.gold : COLORS.pale;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.facing); ctx.globalAlpha = alpha; ctx.shadowColor = game.flashlightOn ? COLORS.gold : COLORS.cyan; ctx.shadowBlur = game.flashlightOn ? 28 : 20;
  if (!drewSprite) { ctx.fillStyle = COLORS.cyan; ctx.fillRect(-11, -11, 22, 22); ctx.fillStyle = COLORS.ink; ctx.fillRect(-4, -4, 8, 8); }
  ctx.strokeStyle = lightColor; ctx.lineWidth = game.flashlightOn ? 3 : 2; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(21, 0); ctx.stroke();
  if (game.hasFlashlight) { ctx.fillStyle = lightColor; ctx.fillRect(17, -2, 7, 4); }
  ctx.restore();
}

function bar(x, y, w, label, value, color) { text(label, x, y - 7, 11, COLORS.dim); text(`${Math.max(0, Math.ceil(value))}/100`, x + w, y - 7, 10, color, 'right'); ctx.fillStyle = '#020609'; ctx.fillRect(x, y, w, 9); ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(value / 100, 0, 1), 9); ctx.strokeStyle = COLORS.line; ctx.strokeRect(x, y, w, 9); }
function aggressionColor(ratio) {
  if (ratio < .5) return COLORS.cyan;
  if (ratio < .82) return COLORS.gold;
  return COLORS.red;
}
const COHERENCE_WORD = 'COHERENCE';
const COHERENCE_GLYPHS = '#7@%4?9&0';
function coherenceCipher() {
  const revealed = game.coherence <= .001 ? COHERENCE_WORD.length : clamp(Math.floor((1 - game.coherence / 100) * COHERENCE_WORD.length + 1e-6), 0, COHERENCE_WORD.length);
  let output = '';
  for (let i = 0; i < COHERENCE_WORD.length; i++) output += i < revealed ? COHERENCE_WORD[i] : COHERENCE_GLYPHS[Math.abs(Math.floor(game.elapsed * 11 + game.coherence * 2.7 + i * 13)) % COHERENCE_GLYPHS.length];
  return { output, complete: revealed === COHERENCE_WORD.length };
}
function drawHud() {
  panel(22, 18, 385, 53, .8); text('THE SHATTERED INSTANT', 38, 41, 17, COLORS.pale, 'left', 'serif'); text(`STAGE ${game.stage}  /  ${STAGE_NAMES[game.stage - 1]}`, 38, 61, 11, COLORS.dim);
  panel(902, 18, 356, 53, .8); bar(916, 33, 100, 'BODY', game.player.hp, COLORS.red); bar(1030, 33, 100, 'INK', game.player.ink, COLORS.cyan); bar(1144, 33, 100, 'SANITY', game.player.sanity, COLORS.violet); text(`MODE: ${FIRE_MODES[game.fireMode].label} [TAB]`, 1080, 61, 9, game.fireMode === 'precision' ? COLORS.gold : COLORS.cyan, 'center');
  const aggressionRatio = clamp(game.aggressionMeter / GROWL_THRESHOLD, 0, 1);
  panel(600, 18, 270, 34, .8); text('AGGRESSION', 614, 36, 9, COLORS.dim); ctx.fillStyle = '#020609'; ctx.fillRect(694, 31, 156, 8); ctx.fillStyle = aggressionColor(aggressionRatio); ctx.fillRect(694, 31, 156 * aggressionRatio, 8); ctx.strokeStyle = COLORS.line; ctx.strokeRect(694, 31, 156, 8); if (aggressionRatio > .82) text('COUNTER SOON', 772, 49, 9, COLORS.red, 'center');
  if (game.phase === 'boss' || game.phase === 'final') {
    const boss = game.enemies.filter(e => !e.dead && e.boss); const current = boss.reduce((n, e) => n + Math.max(0, e.hp), 0); panel(430, 18, 420, 52, .8); text(`${game.bossLabel} — PHASE ${game.bossPhase}/${BOSS_PHASE_COUNT}`, 640, 34, 11, game.phase === 'final' ? COLORS.red : COLORS.gold, 'center'); ctx.fillStyle = '#020609'; ctx.fillRect(491, 42, 298, 5); ctx.fillStyle = game.phase === 'final' ? COLORS.red : COLORS.gold; ctx.fillRect(491, 42, 298 * (game.bossTotal ? current / game.bossTotal : 0), 5); ctx.fillStyle = '#020609'; ctx.fillRect(491, 54, 298, 5); ctx.fillStyle = COLORS.gold; ctx.fillRect(491, 54, 298 * game.bossSeal / game.bossMaxSeal, 5); if (game.bossFinishTimer > 0) text('PRESS F — BREAK THE SEAL', 640, 70, 9, COLORS.gold, 'center');
  }
  if (game.hasFlashlight) { panel(420, 18, 170, 34, .8); text(`LIGHT [Q] ${game.flashlightOn ? 'ON' : 'OFF'}`, 434, 36, 9, game.flashlightOn ? COLORS.gold : COLORS.dim); ctx.fillStyle = '#020609'; ctx.fillRect(434, 40, 140, 5); ctx.fillStyle = COLORS.gold; ctx.fillRect(434, 40, 140 * game.flashlightBattery / 100, 5); }
  ctx.fillStyle = COLORS.ink; ctx.fillRect(0, 648, W, 72);
  panel(22, 646, 620, 53, .78); text('WASD / LEFT STICK  MOVE    /    CURSOR / RIGHT STICK  AIM    /    TAB MODE    /    Q FLASHLIGHT    /    F FINISH', 38, 666, 9, COLORS.dim); text(`${FIRE_MODES[game.fireMode].label}: ${game.fireMode === 'fullAuto' ? 'HOLD TO FIRE' : 'CLICK TO FIRE'}   |   INK: ${Math.ceil(game.player.ink)}/${game.player.maxInk}   |   INSIGHTS: ${game.upgrades.size}`, 38, 687, 10, game.fireMode === 'precision' ? COLORS.gold : COLORS.cyan);
  panel(730, 646, 528, 53, .78); text(`BODY: ${Math.max(0, Math.ceil(game.player.hp))}/100   |   SANITY: ${Math.max(0, Math.ceil(game.player.sanity))}/100   |   CRACKS: ${game.cracks}`, 1242, 666, 10, COLORS.pale, 'right'); text('CRACKS: FORBIDDEN KNOWLEDGE LEAVES THE WORLD LESS WHOLE. ATMOSPHERIC ONLY.', 1242, 687, 9, COLORS.dim, 'right');
  if (game.messageTimer > 0) { ctx.globalAlpha = Math.min(1, game.messageTimer * 2); text(game.message, W / 2, 112, 16, COLORS.gold, 'center', 'serif'); ctx.globalAlpha = 1; }
}

function drawReticle() {
  const x = input.x, y = input.y; const dread = clamp(1 - game.player.sanity / 100 + game.observationPressure * .14, 0, 1);
  if (dread > .16) { ctx.save(); ctx.strokeStyle = COLORS.violet; ctx.globalAlpha = dread * .28; for (let i = 1; i <= Math.floor(dread * 4); i++) { const ox = Math.sin(game.elapsed * (9 + i) + i) * i * 9; const oy = Math.cos(game.elapsed * (7 + i) + i) * i * 7; ctx.strokeRect(x - 8 + ox, y - 8 + oy, 16, 16); } ctx.restore(); }
  ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.moveTo(x, y - 16); ctx.lineTo(x, y + 16); ctx.stroke(); ctx.globalAlpha = 1;
}

function drawPainterLoopFrame() {
  drawBackground();
  ctx.save(); ctx.fillStyle = 'rgba(1,4,8,.62)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#122534'; ctx.beginPath(); ctx.ellipse(370, 514, 72, 118, -.18, 0, TAU); ctx.fill();
  ctx.fillStyle = COLORS.pale; ctx.beginPath(); ctx.arc(352, 376, 31, 0, TAU); ctx.fill();
  ctx.strokeStyle = COLORS.pale; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(411, 455); ctx.lineTo(560, 405); ctx.stroke();
  ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(554, 407); ctx.lineTo(658, 361); ctx.stroke();
  ctx.fillStyle = '#0b1420'; ctx.fillRect(674, 188, 376, 390); ctx.strokeStyle = COLORS.pale; ctx.lineWidth = 8; ctx.strokeRect(674, 188, 376, 390);
  ctx.strokeStyle = COLORS.red; ctx.lineWidth = 7;
  for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + .3; ctx.beginPath(); ctx.moveTo(857, 398); ctx.quadraticCurveTo(857 + Math.cos(a) * 98, 430 + Math.sin(a) * 90, 857 + Math.cos(a) * 122, 490 + Math.sin(a) * 42); ctx.stroke(); }
  ctx.fillStyle = '#351827'; ctx.beginPath(); ctx.ellipse(857, 350, 82, 66, 0, 0, TAU); ctx.fill(); ctx.fillStyle = COLORS.red; ctx.beginPath(); ctx.arc(857, 350, 25, 0, TAU); ctx.fill(); ctx.fillStyle = COLORS.ink; ctx.beginPath(); ctx.arc(857, 350, 10, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawOpening() {
  drawPainterLoopFrame(); panel(130, 74, 1020, 108, .94);
  text('THE SHORE AFTER THE WRECK', W / 2, 113, 25, COLORS.pale, 'center', 'serif');
  wrap('You wake alone. The crew is gone from your memory, but your hand is already painting what the shore refuses to show you.', W / 2, 145, 800, 22, 15, COLORS.pale, 'center');
  text('CLICK OR PRESS ENTER TO FOLLOW THE BRUSH', W / 2, 665, 12, COLORS.mint, 'center'); drawReticle();
}

function drawMenu() {
  drawBackground(); ctx.fillStyle = 'rgba(2,5,9,.55)'; ctx.fillRect(0, 0, W, H); panel(190, 76, 900, 604, .94);
  text('THE SHATTERED INSTANT', W / 2, 205, 46, COLORS.pale, 'center', 'serif'); text('A PAINTING-DRIVEN COSMIC HORROR BULLET HELL', W / 2, 238, 13, COLORS.cyan, 'center');
  wrap('You are a painter haunted by a drowned city. Look at a thing and it may be harmed—but it will look back. What you leave unseen still comes closer.', W / 2, 315, 540, 25, 17, COLORS.pale, 'center');
  ctx.fillStyle = 'rgba(10,20,31,.98)'; ctx.fillRect(255, 278, 770, 96);
  wrap('Your ship is gone. Your mind sealed the wreck away. A brush is already moving in your hand, painting fragments of the truth into monsters you can fight.', W / 2, 310, 675, 24, 16, COLORS.pale, 'center');
  panel(427, 405, 426, 62, .95); text('BEGIN THE SHATTERED INSTANT', W / 2, 443, 19, COLORS.mint, 'center'); text('CLICK OR PRESS ENTER', W / 2, 528, 12, COLORS.dim, 'center');
  text(`SHATTERED INSTANTS: ${game.cycles}   /   PERSISTENT CRACKS: ${game.cracks}`, W / 2, 553, 11, COLORS.dim, 'center');
  if (game.cycles > 0) text('JOURNAL UNLOCKED: “THE CITY REMEMBERS.”', W / 2, 577, 10, COLORS.violet, 'center');
  ctx.fillStyle = 'rgba(10,20,31,.98)'; ctx.fillRect(340, 562, 600, 24); if (game.cycles > 0) text('THE ACCOUNT STARTS OVER MID-SENTENCE.', W / 2, 577, 10, COLORS.violet, 'center');
  text('SKIP TO AN ENCOUNTER', W / 2, 591, 11, COLORS.cyan, 'center');
  for (let i = 0; i < 3; i++) { const x = 262 + i * 192; panel(x, 600, 180, 30, .82); text(`[${i + 1}]  HORDE ${i + 1}`, x + 90, 620, 10, COLORS.pale, 'center'); }
  const bossLabels = ['BOSS 1  ·  CHOIR', 'BOSS 2  ·  CARTOGRAPHER', 'BOSS 3  ·  WATCHER', '[4]  FINAL SHAPE'];
  for (let i = 0; i < 4; i++) { const x = 262 + i * 192; panel(x, 636, 180, 30, .82); text(bossLabels[i], x + 90, 656, 9, i === 3 ? COLORS.red : COLORS.gold, 'center'); }
  for (let i = 0; i < 4; i++) { const x = 262 + i * 192; panel(x, 636, 180, 30, .92); }
  ['BOSS 1 · CHOIR', 'BOSS 2 · CARTOGRAPHER', 'BOSS 3 · WATCHER', '[4] AVATAR'].forEach((label, i) => text(label, 352 + i * 192, 656, 9, i === 3 ? COLORS.red : COLORS.gold, 'center'));
  drawReticle();
}

function drawUpgrade() {
  drawBackground(); text('CHOOSE HOW TO KEEP PAINTING', W / 2, 145, 25, COLORS.pale, 'center', 'serif'); text('The seal changes for this shattered instant only.', W / 2, 172, 13, COLORS.dim, 'center');
  UPGRADE_DATA.forEach((u, i) => { const x = 154 + (i % 3) * 330, y = 214 + Math.floor(i / 3) * 205; const got = game.upgrades.has(u.id); panel(x, y, 300, 165, got ? .38 : .95); text(`[${u.key}]`, x + 22, y + 31, 12, got ? COLORS.dim : COLORS.cyan); text(u.title, x + 22, y + 65, 16, got ? COLORS.dim : COLORS.pale); text(u.sub, x + 22, y + 94, 14, got ? COLORS.dim : COLORS.mint); wrap(got ? 'Already understood.' : u.desc, x + 22, y + 123, 256, 17, 12, COLORS.dim); }); drawReticle();
}

function drawStory() {
  drawBackground(); ctx.fillStyle = 'rgba(3,6,10,.62)'; ctx.fillRect(0, 0, W, H); panel(230, 184, 820, 344, .96); text(`MEMORY FRAGMENT ${game.storyIndex + 1} / 3`, W / 2, 237, 12, COLORS.cyan, 'center');
  wrap(STORY_LORE[game.storyIndex], W / 2, 312, 600, 34, 22, COLORS.pale, 'center'); text('CLICK OR PRESS ENTER TO DESCEND', W / 2, 481, 12, COLORS.dim, 'center'); drawReticle();
}

function drawPause() { ctx.fillStyle = 'rgba(2,5,9,.7)'; ctx.fillRect(0, 0, W, H); panel(445, 280, 390, 150, .95); text('THE DREAM HOLDS ITS BREATH', W / 2, 334, 20, COLORS.pale, 'center', 'serif'); text('PRESS P OR ESC TO RETURN', W / 2, 382, 12, COLORS.dim, 'center'); }
function drawDeath() { drawBackground(); ctx.fillStyle = 'rgba(25,0,8,.65)'; ctx.fillRect(0, 0, W, H); panel(326, 236, 628, 238, .95); text('THE SEAL CRACKS OPEN', W / 2, 310, 31, COLORS.red, 'center', 'serif'); wrap('The shore recedes. Your hand is still moving across the same unfinished canvas. A new fracture remains when you wake.', W / 2, 359, 470, 25, 16, COLORS.pale, 'center'); text('CLICK OR PRESS ENTER TO WAKE AGAIN', W / 2, 430, 12, COLORS.dim, 'center'); drawReticle(); }
function drawCollapse() {
  drawBackground(); drawBrushGuide(); drawPlayer(); drawHud(); drawReticle();
  // The completed Coherence bar is the only climax cue. The dream simply withdraws.
  const fade = clamp((game.stateTime - .56) / .6, 0, 1);
  if (fade > 0) { ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
function drawEnding() { drawPainterLoopFrame(); ctx.fillStyle = 'rgba(18,5,25,.24)'; ctx.fillRect(0, 0, W, H); panel(258, 124, 764, 474, .78); text('ACCOUNT OF THE EXPEDITION', W / 2, 181, 22, COLORS.pale, 'center', 'serif');
  const lines = ['I survived the thing beneath the risen city.', 'It was not Cthulhu. Only a fragment of its dreaming, rendered by my frightened hand.', 'The creature did not fight me. It never noticed me.', 'I begin to write down what happened on the shore, but the sentence has begun before.', 'I begin to write down what happened on the shore, but the sentence has begun before.', 'I begin to write down what happened on the shore, but the sentence has begun before.'];
  const shown = Math.min(lines.length, Math.floor(game.stateTime * 1.45));
  for (let i = 0; i < shown; i++) { const glitch = i > 3 ? Math.sin(game.elapsed * 18 + i) * 4 : 0; text(lines[i], W / 2 + glitch, 256 + i * 42, 18, i > 3 ? COLORS.violet : COLORS.pale, 'center', 'serif'); }
  if (game.stateTime > 5.1) { text('THE MOMENT YOU UNDERSTOOD IS STILL HAPPENING.', W / 2, 536, 14, COLORS.red, 'center'); text('CLICK OR PRESS ENTER TO BEGIN AGAIN', W / 2, 570, 11, COLORS.dim, 'center'); } drawReticle(); const fadeIn = clamp(game.stateTime / .8, 0, 1); if (fadeIn < 1) { ctx.save(); ctx.globalAlpha = 1 - fadeIn; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }

function render() {
  ctx.save(); const shakeX = game.state === 'playing' ? rand(-game.shake, game.shake) : 0, shakeY = game.state === 'playing' ? rand(-game.shake, game.shake) : 0; ctx.translate(shakeX, shakeY);
  if (game.state === 'menu') drawMenu();
  else if (game.state === 'opening') drawOpening();
  else if (game.state === 'upgrade') drawUpgrade();
  else if (game.state === 'story') drawStory();
  else if (game.state === 'dead') drawDeath();
  else if (game.state === 'collapse') drawCollapse();
  else if (game.state === 'ending') drawEnding();
  else { drawBackground(); drawBrushGuide(); drawHazards(); game.enemies.forEach(drawEnemy); drawStageKey(); drawStageDoor(); drawFlashlightItems(); drawShots(); drawFog(); drawFlashlightBeam(); drawSealReadyGlows(); game.enemies.filter(enemy => enemy.ignoresFogDarkening && !enemy.dead).forEach(drawEnemy); drawLowSanitySafePath(); drawPlayer(); drawHud(); drawLoreFragments(); drawReticle(); if (game.counterFlash > 0) { ctx.globalAlpha = game.counterFlash * .45; ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10); ctx.globalAlpha = 1; } if (game.state === 'paused') drawPause(); const insanity = clamp(1 - game.player.sanity / 100 + game.observationPressure * .22, 0, 1); if (insanity > .04) { ctx.globalAlpha = insanity * .19; ctx.fillStyle = COLORS.violet; ctx.fillRect(0, 0, W, H); for (let i = 0; i < Math.floor(insanity * 20); i++) { ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(rand(0, W), rand(0, H), rand(15, 90), 1); } ctx.globalAlpha = 1; } }
  if (game.flash > 0) { ctx.globalAlpha = game.flash * .45; ctx.fillStyle = COLORS.red; ctx.fillRect(0, 0, W, H); } ctx.restore();
}

let previous = performance.now();
function frame(now) { const dt = Math.min(.033, (now - previous) / 1000); previous = now; update(dt); render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
