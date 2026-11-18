import { WIDTH, HEIGHT, CHAPTERS, MELODY } from './engine.js';

const ink = '#14232e';
const cream = '#f1d5aa';
const amber = '#e9b16c';
const mint = '#9ad7c4';

function rounded(ctx, x, y, w, h, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}
function text(ctx, value, x, y, size = 13, color = cream, align = 'center', weight = 650) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}
function light(ctx, x, y, radius, color = 'rgba(246,184,103,.2)') {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(246,184,103,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function windows(ctx, x, y, columns, rows, size = 11) {
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const warm = (row * 7 + column * 3) % 5 !== 0;
      rounded(ctx, x + column * (size + 12), y + row * (size + 15), size, size, 1, warm ? '#e6be83' : '#52646c');
      if (warm) rounded(ctx, x + column * (size + 12), y + row * (size + 15), size, 2, 0, '#f7dfb5');
    }
  }
}
function tree(ctx, x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ellipse(ctx, 0, 4, 26, 8, '#10252e66');
  rounded(ctx, -3, -38, 6, 45, 2, '#716050');
  ellipse(ctx, -13, -45, 23, 22, '#687957');
  ellipse(ctx, 13, -49, 25, 25, '#7f8b5d');
  ellipse(ctx, -2, -69, 25, 24, '#9c9566');
  ellipse(ctx, -10, -75, 14, 12, '#b2a46c');
  ctx.restore();
}
function lamp(ctx, x, y) {
  light(ctx, x, y - 90, 100);
  rounded(ctx, x - 3, y - 90, 6, 96, 2, '#45585e');
  rounded(ctx, x - 14, y - 100, 28, 6, 3, '#a49c82');
  rounded(ctx, x - 9, y - 94, 18, 13, 2, '#f7d299');
  ellipse(ctx, x, y + 9, 31, 7, '#d9b47326');
}

export function drawEmil(ctx, x, y, time = 0, moving = false, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ellipse(ctx, 0, 10, 23, 8, '#07182066');
  const step = moving ? Math.sin(time * 13) * 5 : 0;
  rounded(ctx, -13, -6 + step, 11, 22, 4, '#283a4c');
  rounded(ctx, 3, -6 - step, 11, 22, 4, '#283a4c');
  rounded(ctx, -16, 11 + step, 16, 7, 3, '#e5dfcd');
  rounded(ctx, 3, 11 - step, 16, 7, 3, '#e5dfcd');
  rounded(ctx, -19, -39, 38, 35, 10, '#c97d4e');
  rounded(ctx, -24, -35, 10, 29, 5, '#dc9965');
  rounded(ctx, 15, -35, 10, 29, 5, '#dc9965');
  rounded(ctx, -15, -36, 30, 6, 3, '#e4b27a');
  rounded(ctx, -1, -34, 2, 28, 1, '#845b45');
  ellipse(ctx, -17, -10, 5, 6, '#e4b98f');
  ellipse(ctx, 20, -10, 5, 6, '#e4b98f');
  rounded(ctx, 17, -21, 10, 16, 2, '#b9c7c4');
  rounded(ctx, 19, -19, 6, 9, 1, '#294d59');
  rounded(ctx, -8, -49, 17, 14, 5, '#e4b98f');
  ellipse(ctx, 0, -58, 18, 21, '#e5bc94');
  ellipse(ctx, -17, -56, 4, 6, '#ce9e79');
  ellipse(ctx, 17, -56, 4, 6, '#ce9e79');
  polygon(ctx, [[-18,-59],[-19,-73],[-11,-82],[1,-85],[16,-78],[20,-64],[9,-69],[-4,-70],[-14,-61]], '#1b2630');
  polygon(ctx, [[-16,-72],[-6,-81],[4,-81],[13,-76],[-1,-75]], '#37424a');
  ellipse(ctx, -6, -57, 1.7, 2.3, '#26303a');
  ellipse(ctx, 7, -57, 1.7, 2.3, '#26303a');
  ctx.strokeStyle = '#9a6956'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(2, -50, 5, .2, 2.2); ctx.stroke();
  ctx.strokeStyle = '#99bdbe'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -63, 22, Math.PI, Math.PI * 2); ctx.stroke();
  rounded(ctx, -24, -67, 7, 15, 3, '#88acac');
  rounded(ctx, 18, -67, 7, 15, 3, '#88acac');
  ctx.restore();
}
function drawNote(ctx, item, time, reduced) {
  const y = item.y + (reduced ? 0 : Math.sin(time * 4 + item.id) * 3);
  ellipse(ctx, item.x, y + 19, 19, 5, '#10232d44');
  light(ctx, item.x, y - 6, 40, 'rgba(154,215,196,.22)');
  rounded(ctx, item.x - 23, y - 28, 46, 46, 13, '#203f48');
  ctx.strokeStyle = mint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(item.x - 23, y - 28, 46, 46, 13); ctx.stroke();
  text(ctx, '♪', item.x, y + 6, 35, '#aee5cd');
}
function drawObstacle(ctx, item, chapter) {
  const x = item.x, y = item.y;
  ellipse(ctx, x, y + 14, 34, 9, '#0b202b66');
  if (chapter === 0) {
    rounded(ctx, x - 29, y - 27, 58, 36, 5, '#586d76');
    polygon(ctx, [[x-29,y-27],[x-19,y-35],[x+38,y-35],[x+29,y-27]], '#8fa4a5');
    polygon(ctx, [[x+29,y-27],[x+38,y-35],[x+38,y+1],[x+29,y+9]], '#3c5662');
    rounded(ctx, x - 24, y - 15, 48, 3, 1, '#aeb9ae');
    for (const side of [-1, 1]) ellipse(ctx, x + side * 20, y + 10, 5, 6, '#172b36');
    rounded(ctx, x - 21, y - 34, 28, 5, 2, '#bc9868');
    text(ctx, '!', x, y + 2, 13, '#e7d3ad');
  } else {
    for (const offset of [-18, 0, 18]) {
      rounded(ctx, x + offset - 8, y - 15, 16, 25, 6, ['#758da0','#917d75','#648578'][(offset + 18) / 18]);
      ellipse(ctx, x + offset, y - 21, 7, 8, '#d9bba1');
    }
    text(ctx, 'SCHLANGE', x, y - 37, 8, '#e5c7a2');
  }
}

export class EmilRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw Error('Canvas wird nicht unterstützt.');
    this.background = document.createElement('canvas');
    this.background.width = WIDTH; this.background.height = HEIGHT;
    this.scene = -1;
  }
  makeBackground(chapter) {
    const ctx = this.background.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, '#294057'); sky.addColorStop(.53, '#a28d82'); sky.addColorStop(1, '#354b59');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 12; i++) {
      const height = 66 + (i * 41) % 90;
      rounded(ctx, i * 85 - 25, 155 - height, 70, height + 45, 2, i % 2 ? '#405366' : '#4e6070');
      windows(ctx, i * 85 - 15, 171 - height, 2, 3, 5);
    }
    polygon(ctx, [[190,160],[710,160],[815,600],[85,600]], '#314955');
    polygon(ctx, [[190,160],[710,160],[730,600],[170,600]], '#3a515a');
    polygon(ctx, [[174,160],[202,160],[182,600],[80,600]], '#8a8e82');
    polygon(ctx, [[698,160],[726,160],[820,600],[718,600]], '#828e85');
    ctx.strokeStyle = '#c4c3a833'; ctx.lineWidth = 2;
    for (const x of [330, 450, 570]) { ctx.setLineDash([12, 18]); ctx.beginPath(); ctx.moveTo(x, 164); ctx.lineTo(x, 600); ctx.stroke(); }
    ctx.setLineDash([]);
    for (let i = 0; i < 10; i++) {
      const y = 175 + i * 49;
      ctx.strokeStyle = '#b9c7b911'; ctx.beginPath(); ctx.moveTo(170, y); ctx.lineTo(730, y); ctx.stroke();
    }
    if (chapter === 0) this.workshop(ctx); else if (chapter === 1) this.neumarkt(ctx); else this.studio(ctx);
    const vignette = ctx.createRadialGradient(450, 330, 150, 450, 330, 560);
    vignette.addColorStop(0, '#08192200'); vignette.addColorStop(1, '#0819225c');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.scene = chapter;
  }
  workshop(ctx) {
    rounded(ctx, -40, 111, 195, 445, 8, '#334c58');
    polygon(ctx, [[-40,111],[24,73],[185,73],[155,111]], '#667b81');
    rounded(ctx, 8, 122, 125, 33, 4, '#213945');
    text(ctx, 'WERKSTATT', 70, 143, 12, '#dfcaa3');
    for (let i = 0; i < 4; i++) {
      rounded(ctx, 11, 184 + i * 73, 129, 50, 3, '#1b3442');
      windows(ctx, 22, 196 + i * 73, 4, 1, 14);
      rounded(ctx, 11, 237 + i * 73, 129, 5, 0, '#7f8d86');
    }
    rounded(ctx, 756, 178, 190, 323, 5, '#3b5660');
    polygon(ctx, [[735,177],[770,151],[930,151],[945,177]], '#7a8e88');
    for (let i = 0; i < 4; i++) rounded(ctx, 773, 198 + i * 46, 120, 30, 2, '#2d414d');
    rounded(ctx, 770, 425, 63, 63, 3, '#9c8669');
    text(ctx, 'FEIERABEND', 454, 104, 17, '#f7dfb3');
    text(ctx, 'SOUNDS EINPACKEN. AB IN DIE STADT.', 454, 125, 9, '#d8d5c3');
    lamp(ctx, 172, 359); lamp(ctx, 735, 500);
    tree(ctx, 798, 558, .7);
    rounded(ctx, 36, 525, 63, 19, 3, '#1b333f'); text(ctx, 'STUDIO →', 67, 539, 9);
  }
  neumarkt(ctx) {
    const facades = [[-25,113,168,330,'#50605e'],[758,105,160,369,'#6d6a65']];
    for (const [x,y,w,h,color] of facades) {
      rounded(ctx, x, y, w, h, 3, color);
      windows(ctx, x + 22, y + 28, 4, 4, 15);
      rounded(ctx, x + 14, y + h - 76, w - 28, 65, 2, '#253f49');
    }
    for (let i = 0; i < 7; i++) polygon(ctx, [[761+i*23,365],[784+i*23,365],[789+i*23,385],[766+i*23,385]], i % 2 ? '#bc9169' : '#e5c9a0');
    rounded(ctx, 775, 393, 108, 25, 3, '#d4b587');
    text(ctx, 'BOWL & KAFFEE', 829, 410, 10, '#263e46');
    lamp(ctx, 170, 316); lamp(ctx, 734, 480);
    tree(ctx, 103, 500, .9); tree(ctx, 799, 549, .7);
    rounded(ctx, 339, 74, 222, 34, 6, '#263f4a');
    text(ctx, 'NEUMARKT', 450, 97, 17, '#f7dfb3');
    text(ctx, 'NICHT GALLUSMARKT.', 450, 128, 9, '#e6d7b9');
    polygon(ctx, [[130,560],[173,540],[178,594],[131,600]], '#a07b57');
    text(ctx, '♪', 154, 579, 25, '#f1c98d');
  }
  studio(ctx) {
    rounded(ctx, 112, 116, 676, 385, 14, '#223c48');
    for (let i = 0; i < 19; i++) rounded(ctx, 135 + i * 34, 132, 14, 250, 4, i % 2 ? '#2d4b55' : '#304c55');
    rounded(ctx, 234, 158, 432, 110, 12, '#102d39');
    for (let i = 0; i < 45; i++) {
      const h = 12 + Math.abs(Math.sin(i * .65)) * 51;
      rounded(ctx, 258 + i * 8.5, 210 - h / 2, 3, h, 2, i % 4 ? '#78b5aa' : '#e7b779');
    }
    for (const x of [150, 702]) {
      rounded(ctx, x, 291, 48, 112, 5, '#172c36');
      ellipse(ctx, x + 24, 326, 16, 16, '#435968');
      ellipse(ctx, x + 24, 326, 6, 6, '#8daca9');
      ellipse(ctx, x + 24, 373, 12, 12, '#465a64');
    }
    polygon(ctx, [[283,376],[617,376],[650,458],[250,458]], '#b4865f');
    rounded(ctx, 300, 409, 300, 37, 5, '#1b303c');
    for (let i = 0; i < 18; i++) rounded(ctx, 310 + i * 15.4, 416, 13, 23, 1, i % 3 === 1 ? '#6d8b89' : '#d2d9cb');
    text(ctx, 'DEIN FEIERABEND. DEIN SOUND.', 450, 101, 16, '#f3d1a0');
    light(ctx, 450, 286, 205, 'rgba(232,179,105,.12)');
  }
  render(state, seconds, moving, reduced = false) {
    const ctx = this.ctx;
    const isStudio = ['studio', 'meet', 'chat', 'done'].includes(state.phase);
    const chapter = isStudio ? 2 : state.chapter;
    if (this.scene !== chapter) this.makeBackground(chapter);
    ctx.drawImage(this.background, 0, 0);
    const time = reduced ? 0 : seconds;
    if (isStudio) {
      drawEmil(ctx, 450, 365, time, false, 1.3);
      if (state.phase === 'studio') {
        const tone = state.studioFlash >= 0 && state.flashTime > 0 ? state.studioFlash : MELODY[state.studioIndex];
        text(ctx, ['G','H','D'][tone] ?? '♪', 450, 560, 34, '#f5c383');
      }
    } else {
      const actors = state.entities.map(item => ({ y: item.y, draw: () => item.kind === 'note' ? drawNote(ctx, item, time, reduced) : drawObstacle(ctx, item, state.chapter) }));
      actors.push({ y: state.y, draw: () => {
        if (state.invincible > 0) {
          ctx.strokeStyle = '#d7debd'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(state.x, state.y - 25, 32, 55, 0, 0, Math.PI * 2); ctx.stroke();
        }
        drawEmil(ctx, state.x, state.y, time, moving, 1.05);
      } });
      actors.sort((a,b) => a.y-b.y).forEach(actor => actor.draw());
      if (state.pulse > 0) {
        const ratio = 1 - state.pulse / .55;
        ctx.strokeStyle = `rgba(248,214,153,${1-ratio})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(state.x, state.y - 16, reduced ? 100 : 28 + ratio * 150, reduced ? 45 : 14 + ratio * 69, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
}
