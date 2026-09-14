import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, "../dist/index.html");

let html = readFileSync(indexPath, "utf8");

const mooslichtPattern = /<a class="game-card game-card-active mooslicht-card"[\s\S]*?<\/a>/;
const match = html.match(mooslichtPattern);

if (!match) {
  throw new Error("Mooslicht card not found in built index.html");
}

const mooslichtCard = match[0];
html = html.replace(mooslichtPattern, "");

const gridMarker = '<div class="game-grid" aria-label="Verfügbare Spiele">';
if (!html.includes(gridMarker)) {
  throw new Error("Main game grid not found in built index.html");
}

const liveSection = `
        <section aria-label="Live Game" style="margin-top: 30px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
            <span style="display:inline-flex; align-items:center; gap:7px; font-weight:800; letter-spacing:.08em; font-size:12px; padding:7px 10px; border-radius:999px; background:#ff4f63; color:white;">
              <span aria-hidden="true">●</span> LIVE GAME
            </span>
            <strong>Aktiv in Entwicklung</strong>
            <span style="opacity:.7; font-size:14px;">Dieses Spiel wird laufend weiterentwickelt.</span>
          </div>
          <div class="game-grid" aria-label="Aktuelles Live Game" style="grid-template-columns:minmax(0, 1fr); margin-top:0;">
            ${mooslichtCard}
          </div>
        </section>

        <div style="display:flex; align-items:center; gap:12px; margin:34px 0 14px;">
          <strong style="letter-spacing:.08em; font-size:12px; opacity:.72;">NORMALE GAMES</strong>
          <span style="height:1px; flex:1; background:currentColor; opacity:.14;"></span>
        </div>
`;

html = html.replace(
  gridMarker,
  `${liveSection}        <div class="game-grid" aria-label="Normale Spiele">`,
);

writeFileSync(indexPath, html);
console.log("Live Game section injected into dist/index.html");
