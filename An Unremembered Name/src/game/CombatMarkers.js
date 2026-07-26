export function addCombatMarker(pool, x, y, value, color, options = {}) {
  pool.get({
    x, y, value, color,
    vx: options.vx || 0,
    vy: options.vy ?? -34,
    life: options.life || .62,
    maxLife: options.life || .62,
  });
}

export function updateCombatMarkers(pool, dt) {
  pool.each(marker => {
    marker.x += marker.vx * dt;
    marker.y += marker.vy * dt;
    marker.life -= dt;
    if (marker.life <= 0) marker.active = false;
  });
}
