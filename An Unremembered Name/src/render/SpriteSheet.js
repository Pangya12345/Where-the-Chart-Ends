function imageWidth(image) { return image?.naturalWidth || image?.videoWidth || image?.width || 0; }
function imageHeight(image) { return image?.naturalHeight || image?.videoHeight || image?.height || 0; }
function frameKey(frame) { return typeof frame === 'string' ? frame : Math.max(0, Math.floor(Number(frame) || 0)); }
function validFrame(frame) { return frame && [frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) && frame.width > 0 && frame.height > 0; }

function explicitFrame(sheet, frame) {
  const safeFrame = frameKey(frame);
  const defined = Array.isArray(sheet.frames) ? sheet.frames[safeFrame] : sheet.frames?.[safeFrame];
  if (defined) return validFrame(defined) ? { x: defined.x, y: defined.y, width: defined.width, height: defined.height, key: safeFrame } : null;
  if (typeof safeFrame !== 'number') return null;

  const columns = Math.floor((imageWidth(sheet.image) - sheet.margin * 2 + sheet.spacing) / (sheet.frameWidth + sheet.spacing));
  if (columns < 1) return null;
  return {
    x: sheet.margin + safeFrame % columns * (sheet.frameWidth + sheet.spacing),
    y: sheet.margin + Math.floor(safeFrame / columns) * (sheet.frameHeight + sheet.spacing),
    width: sheet.frameWidth,
    height: sheet.frameHeight,
    key: safeFrame,
  };
}

function makeDarkBackdropTransparent(image, frame) {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width; canvas.height = frame.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
  const pixels = context.getImageData(0, 0, frame.width, frame.height);
  const { data } = pixels; const seen = new Uint8Array(frame.width * frame.height); const queue = [];
  const nearBlack = index => data[index * 4] < 14 && data[index * 4 + 1] < 14 && data[index * 4 + 2] < 14;
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return;
    const index = y * frame.width + x;
    if (seen[index] || !nearBlack(index)) return;
    seen[index] = 1; queue.push(index);
  };
  for (let x = 0; x < frame.width; x++) { visit(x, 0); visit(x, frame.height - 1); }
  for (let y = 1; y < frame.height - 1; y++) { visit(0, y); visit(frame.width - 1, y); }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor]; const x = index % frame.width; const y = Math.floor(index / frame.width);
    data[index * 4 + 3] = 0;
    visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1);
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export class SpriteSheetRenderer {
  constructor() { this.sheets = new Map(); }

  register(key, definition = {}) {
    if (!key || (!definition.image && !definition.src)) return null;
    this.unregister(key);
    const sheet = {
      image: definition.image || null,
      frameWidth: definition.frameWidth || 1,
      frameHeight: definition.frameHeight || 1,
      margin: definition.margin || 0,
      spacing: definition.spacing || 0,
      frames: definition.frames || null,
      trimDarkBackdrop: Boolean(definition.trimDarkBackdrop),
      processedFrames: new Map(),
      ready: Boolean(imageWidth(definition.image) && definition.image?.complete !== false),
    };
    const prepare = () => {
      sheet.ready = Boolean(imageWidth(sheet.image));
      if (!sheet.ready || !sheet.trimDarkBackdrop || !sheet.frames) return;
      sheet.processedFrames.clear();
      const entries = Array.isArray(sheet.frames) ? sheet.frames.entries() : Object.entries(sheet.frames);
      for (const [frame, rect] of entries) {
        if (!validFrame(rect)) continue;
        try {
          const cleaned = makeDarkBackdropTransparent(sheet.image, rect);
          if (cleaned) sheet.processedFrames.set(frameKey(frame), cleaned);
        } catch (_) {
          // If a future remote image cannot be read, render its original frame instead.
        }
      }
    };
    if (definition.src) {
      const image = new Image();
      image.onload = prepare;
      image.onerror = () => { sheet.ready = false; sheet.processedFrames.clear(); };
      image.src = definition.src;
      sheet.image = image;
    } else if (sheet.ready) prepare();
    else if (definition.image?.addEventListener) {
      definition.image.addEventListener('load', prepare, { once: true });
      definition.image.addEventListener('error', () => { sheet.ready = false; sheet.processedFrames.clear(); }, { once: true });
    }
    this.sheets.set(key, sheet);
    return sheet;
  }

  unregister(key) { const sheet = this.sheets.get(key); sheet?.processedFrames.clear(); this.sheets.delete(key); }
  clear() { this.sheets.forEach(sheet => sheet.processedFrames.clear()); this.sheets.clear(); }

  draw(ctx, key, frame, x, y, options = {}) {
    const sheet = this.sheets.get(key);
    if (!sheet?.ready || !imageWidth(sheet.image)) return false;
    const source = explicitFrame(sheet, frame);
    if (!source || source.x < 0 || source.y < 0 || source.x + source.width > imageWidth(sheet.image) || source.y + source.height > imageHeight(sheet.image)) return false;
    const cleanedFrame = sheet.processedFrames.get(source.key);
    const image = cleanedFrame || sheet.image;
    const sourceX = cleanedFrame ? 0 : source.x; const sourceY = cleanedFrame ? 0 : source.y;
    const width = options.width || source.width; const height = options.height || source.height;
    ctx.save(); ctx.translate(x, y); ctx.rotate(options.rotation || 0); ctx.globalAlpha *= options.alpha ?? 1;
    const previousSmoothing = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sourceX, sourceY, source.width, source.height, -width / 2, -height / 2, width, height);
    ctx.imageSmoothingEnabled = previousSmoothing;
    ctx.restore();
    return true;
  }
}
