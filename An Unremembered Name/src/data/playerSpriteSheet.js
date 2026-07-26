// The supplied sheet includes presentation borders and labels. These source rectangles
// deliberately crop only the character cells, so gameplay never renders the sheet UI.
const CHARACTER_CELL_WIDTH = 96;
const CHARACTER_FRAME_WIDTH = 70;
const CHARACTER_FRAME_HEIGHT = 111;
const CHARACTER_LEFT = 12;
const IDLE_TOP = 28;
const WALK_TOP = 193;
const FRAMES_PER_DIRECTION = 4;

function row(top) {
  return Array.from({ length: 16 }, (_, index) => ({
    x: CHARACTER_LEFT + index * CHARACTER_CELL_WIDTH,
    y: top,
    width: CHARACTER_FRAME_WIDTH,
    height: CHARACTER_FRAME_HEIGHT,
  }));
}

export const PLAYER_CHARACTER_SHEET = {
  frameWidth: CHARACTER_FRAME_WIDTH,
  frameHeight: CHARACTER_FRAME_HEIGHT,
  // Background black is removed per cropped frame while preserving enclosed outlines.
  trimDarkBackdrop: true,
  frames: [...row(IDLE_TOP), ...row(WALK_TOP)],
};

// Sheet ordering: down, up, left, right. This deliberately uses the direction
// of travel rather than the cursor/Gaze direction: movement animates the body,
// while the pencil and perception-fire remain free to aim with the mouse.
export function playerCharacterFrame(player, elapsed) {
  const travelDirection = player.moveFacing ?? -Math.PI / 2;
  const horizontal = Math.abs(Math.cos(travelDirection));
  const vertical = Math.abs(Math.sin(travelDirection));
  const direction = horizontal > vertical
    ? (Math.cos(travelDirection) >= 0 ? 3 : 2)
    : (Math.sin(travelDirection) >= 0 ? 0 : 1);
  const moving = Boolean(player.walking);
  const animationRate = moving ? 9 : 2.5;
  const frameInCycle = Math.floor(elapsed * animationRate) % FRAMES_PER_DIRECTION;
  return (moving ? 16 : 0) + direction * FRAMES_PER_DIRECTION + frameInCycle;
}
