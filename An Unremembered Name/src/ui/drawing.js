export function createDrawing(ctx) {
  function poly(x, y, radius, sides, rotation, color, fill = true) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = rotation + i * Math.PI * 2 / sides;
      const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.stroke(); }
  }

  function text(value, x, y, size = 16, color = '#dceff4', align = 'left', font = 'sans-serif') {
    ctx.fillStyle = color; ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(value, x, y);
  }

  function wrap(value, x, y, maxWidth, lineHeight, size = 16, color = '#dceff4', align = 'left') {
    ctx.font = `${size}px sans-serif`; const words = value.split(' '); let row = '', yy = y;
    for (const word of words) {
      if (ctx.measureText(`${row} ${word}`).width > maxWidth && row) { text(row, x, yy, size, color, align); yy += lineHeight; row = word; }
      else row += `${row ? ' ' : ''}${word}`;
    }
    if (row) { text(row, x, yy, size, color, align); yy += lineHeight; }
    return yy;
  }

  function panel(x, y, width, height, alpha = .9, line = '#29435a') {
    ctx.fillStyle = `rgba(10,20,31,${alpha})`; ctx.fillRect(x, y, width, height); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, width - 1, height - 1);
  }

  return { panel, poly, text, wrap };
}
