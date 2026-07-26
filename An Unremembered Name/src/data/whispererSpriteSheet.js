const WHISPERER_FRAME_WIDTH = 132;
const WHISPERER_FRAME_HEIGHT = 124;

export const WHISPERER_IDLE_SHEET = {
  frameWidth: WHISPERER_FRAME_WIDTH,
  frameHeight: WHISPERER_FRAME_HEIGHT,
  frames: Array.from({ length: 6 }, (_, index) => ({
    x: index * WHISPERER_FRAME_WIDTH,
    y: 0,
    width: WHISPERER_FRAME_WIDTH,
    height: WHISPERER_FRAME_HEIGHT,
  })),
};

export function whispererIdleFrame(enemy, elapsed) {
  const offset = Math.abs(enemy.twin || 0) * .21 + enemy.phase * .06;
  return Math.floor((elapsed + offset) * 4.5) % WHISPERER_IDLE_SHEET.frames.length;
}
