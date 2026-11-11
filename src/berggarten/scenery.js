export const meadowColors = [0x829954, 0x96966d, 0x7f9d86, 0x658d58, 0xcad6d4];
export const trailColor = 0xcbb386;
export const woodColors = [0x49723e, 0x5d8748, 0x6e924d, 0x517c53];
export const crystalColors = [0x348f8e, 0x64bdad, 0xace8ce];

export function trailCenter(x) {
  return 7 + Math.sin(x * .76) * .44 + Math.sin(x * .36) * .17;
}

export const berghausBench = { x: .66, y: 11.98 };

export const meadowArch = { x: 2.55, y: trailCenter(2.55), radius: .88 };
export const meadowSpur = [
  [meadowArch.x, meadowArch.y], [2.55, 8.15], [2.44, 8.87],
  [2.16, 9.54], [1.78, 10.06], [1.4, 10.44], [1.1, 10.52],
];
export const meadowBank = [
  [-.5, -.5, -2, -.5], [-.5, 2.3, -2.7, 2.1], [-.5, 5.7, -3.25, 5.36],
  [-.5, 8.4, -2.85, 8.64], [-.5, 11.5, -3.15, 12.25], [-.5, 14.5, -2.2, 16.7],
  [1.85, 14.5, 1.45, 17.05], [4.2, 14.5, 4.3, 16.65], [5.5, 14.5, 5.5, 14.5],
];

function smoothstep(value, start, end) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function eveningLight(clock) {
  return smoothstep(clock, 215, 355) * (1 - smoothstep(clock, 500, 600));
}

export function cameraFocus(player) {
  const meadow = 1 - smoothstep(player.x, 3, 7);
  return { x: player.x - meadow * 1.25, y: player.y + meadow * 1.6 };
}

// The horizon stays behind the game board at every camera angle.
const mountains = [
  [[0,.43],[.07,.29],[.115,.33],[.21,.12],[.28,.28],[.33,.31],[.39,.22],[.45,.35],[.52,.31],[.63,.1],[.72,.28],[.78,.22],[.83,.36],[.92,.18],[1,.3]],
  [[0,.46],[.09,.33],[.15,.45],[.22,.34],[.29,.4],[.37,.27],[.44,.4],[.53,.43],[.61,.34],[.72,.46],[.79,.35],[.84,.41],[.91,.33],[1,.47]],
  [[0,.49],[.07,.44],[.14,.51],[.22,.47],[.32,.57],[.41,.51],[.52,.59],[.62,.53],[.72,.57],[.79,.49],[.88,.51],[.96,.44],[1,.47]],
];
const paintPalette = [
  [[151,180,186],[233,213,175],[128,160,155],[86,126,128]],
  [[62,66,96],[173,132,130],[109,124,148],[57,80,94]],
];
const ridgePalette = [
  [[144,168,174],[111,145,143],[87,124,122]],
  [[107,111,137],[83,104,122],[64,88,102]],
];

function blend(day, evening, dusk, opacity = 1) {
  const color = day.map((channel, i) => Math.round(channel + (evening[i] - channel) * dusk));
  return `rgba(${color.join(',')},${opacity})`;
}

export function paintAlpineBackdrop(ctx, width, height, dusk) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  const stops = [0, .39, .67, 1];
  for (const [i, stop] of stops.entries()) sky.addColorStop(stop, blend(paintPalette[0][i], paintPalette[1][i], dusk));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const polygon = (points, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const [i, [x, y]] of points.entries()) {
      if (i === 0) ctx.moveTo(x * width, y * height);
      else ctx.lineTo(x * width, y * height);
    }
    ctx.closePath();
    ctx.fill();
  };
  mountains.forEach((ridge, i) => {
    const base = .55 + i * .075;
    const day = ridgePalette[0][i], evening = ridgePalette[1][i];
    const fade = ctx.createLinearGradient(0, height * (base - .14), 0, height * (base + .11));
    fade.addColorStop(0, blend(day, evening, dusk));
    fade.addColorStop(.52, blend(day, evening, dusk, .72));
    fade.addColorStop(1, blend(day, evening, dusk, 0));
    polygon([...ridge, [1, base + .11], [0, base + .11]], fade);
    if (i !== 0) return;
    const snow = blend([208,222,218], [151,152,176], dusk);
    polygon([[.155,.236],[.21,.12],[.267,.25],[.226,.212],[.21,.244],[.198,.208]], snow);
    polygon([[.572,.212],[.63,.1],[.698,.235],[.649,.2],[.623,.233],[.614,.189]], snow);
    polygon([[.887,.252],[.92,.18],[.96,.24],[.933,.221],[.919,.248],[.91,.223]], snow);
  });

  const haze = ctx.createLinearGradient(0, height * .35, 0, height * .77);
  haze.addColorStop(0, 'rgba(203,222,212,0)');
  haze.addColorStop(.55, `rgba(183,208,201,${.39 - dusk * .12})`);
  haze.addColorStop(1, 'rgba(140,174,174,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * .35, width, height * .42);
}
