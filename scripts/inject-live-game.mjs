import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, "../dist/index.html");

export function injectLiveGame(html) {
if (/data-live-section(?:\s|[=>])/.test(html)) return html;

const cards = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
const card = cards.find(card => /\bclass=["'][^"']*\bmooslicht-card\b[^"']*["']/.test(card.split('>')[0]));
const match = card ? [card] : null;

if (!match) {
  throw new Error("Mooslicht card not found in built index.html");
}

const liveCard = match[0]
  .replace('href="./mooslicht/"', 'href="./ki-mooslicht/"')
  .replace('aria-label="Mooslicht – 3D-Fantasy-Abenteuer spielen"', 'aria-label="KI-Mooslicht – Live Game spielen"')
  .replace('<span class="available-badge">3D · Garten-Update</span>', '<span class="available-badge">LIVE · KI-ENTWICKLUNG</span>')
  .replace('<strong>Mooslicht</strong>', '<strong>KI-Mooslicht</strong>')
  .replace('<small>1 Spieler · Dein Garten als magische Miniaturwelt</small>', '<small>Live · autonom vom Jetson weiterentwickelt</small>');

// Match the game grid by its purpose, regardless of extra attributes or their order.
const gridMarker = html.match(
  /<div\b(?=[^>]*\bid=["']game-grid["'])[^>]*>/,
)?.[0];
if (!gridMarker) {
  throw new Error("Main game grid not found in built index.html");
}

const liveSection = `
        <section data-live-section aria-label="Live Game" style="margin-top: 30px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
            <span style="display:inline-flex; align-items:center; gap:7px; font-weight:800; letter-spacing:.08em; font-size:12px; padding:7px 10px; border-radius:999px; background:#ff4f63; color:white;">
              <span aria-hidden="true">●</span> LIVE GAME
            </span>
            <strong>KI-Mooslicht</strong>
            <span style="opacity:.7; font-size:14px;">Separater KI-Ableger · das normale Mooslicht bleibt unverändert.</span>
          </div>
          <div class="game-grid" aria-label="Aktuelles Live Game" style="grid-template-columns:minmax(0, 1fr); margin-top:0;">
            ${liveCard}
          </div>
        </section>

        <div data-games-heading style="display:flex; align-items:center; gap:12px; margin:34px 0 14px;">
          <strong style="letter-spacing:.08em; font-size:12px; opacity:.72;">NORMALE GAMES</strong>
          <span style="height:1px; flex:1; background:currentColor; opacity:.14;"></span>
        </div>
`;

html = html.replace(
  gridMarker,
  `${liveSection}        ${gridMarker}`,
);

return html;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(indexPath, injectLiveGame(readFileSync(indexPath, 'utf8')));
  console.log('KI-Mooslicht Live Game section injected into dist/index.html');
}
