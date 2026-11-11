import { NAMES } from './engine.js';
import {
  VALLEY_BUILDINGS, hasValleyBuilding, buildStatus, buildValley, rainyDay,
  afterDark, marketStatus, tradeBlueprint, valleySite, atValleySite,
  collectValleySite, rollMarble,
} from './valley.js';

const descriptions = {
  cable: 'Leert einen vollen Rucksack ab den Kristallhöhen automatisch ins Lager.',
  lantern: 'Deckt an klaren Abenden einen Sternkristall in den Kristallhöhen auf.',
  weather: 'Meldet das Wetter und zeigt bei Regen eine Alpenblume im Steinbruch.',
  marble: 'Teste die Schubkraft auf trockener und nasser Bahn.',
};

export function setupValley({ state, player, toast, changed, moveTo }) {
  const $ = id => document.getElementById(id);
  const buildings = Object.entries(VALLEY_BUILDINGS);
  const marker = $('valley-marker');
  $('valley-buildings').innerHTML = buildings.map(([id, item]) => {
    const cost = [`${item.coins} ●`, ...Object.entries(item.stock).map(([key, amount]) => `${amount} ${NAMES[key]}`)].join(' · ');
    return `<article class="valley-card"><h4>${item.name}</h4><p>${descriptions[id]}</p>
      <small>${cost}</small><button id="valley-build-${id}" type="button" aria-describedby="valley-status-${id}">Bauen</button>
      <small id="valley-status-${id}"></small></article>`;
  }).join('');

  for (const [id, item] of buildings) {
    $('valley-build-' + id).onclick = () => {
      if (!buildValley(state, id)) return;
      toast(`${item.name} gebaut.`);
      changed();
    };
  }
  $('valley-market').onclick = () => {
    if (!tradeBlueprint(state)) return;
    toast('Bauplan für die Murmelbahn erhalten.');
    changed();
  };
  function find() {
    const site = valleySite(state);
    if (!site) return;
    if (!atValleySite(site, player)) {
      moveTo(site);
      return;
    }
    if (!collectValleySite(state, player)) return;
    toast(`${site.name} gefunden! +${site.reward} Münzen`);
    changed();
  }
  $('valley-find').onclick = marker.onclick = find;

  const power = $('valley-power');
  const ball = $('valley-ball');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const record = $('valley-record');
  power.oninput = () => { $('valley-power-value').textContent = power.value; };
  let lastRoll = null;
  let activeSave = state.valley;
  $('valley-roll').onclick = () => {
    lastRoll = rollMarble(state, Number(power.value));
    if (lastRoll === null) return;
    const finish = `${lastRoll / 42 * 100}%`;
    for (const animation of ball.getAnimations?.() ?? []) animation.cancel();
    if (!reduced.matches) ball.animate?.([{ left: '0%' }, { left: finish }], { duration: 700, easing: 'ease-out' });
    changed();
  };

  function render() {
    for (const [id] of buildings) {
      const status = buildStatus(state, id);
      const button = $('valley-build-' + id);
      button.disabled = Boolean(status);
      $('valley-status-' + id).textContent = status;
    }
    const market = marketStatus(state);
    $('valley-market').disabled = Boolean(market);
    $('valley-market-status').textContent = market;
    const station = hasValleyBuilding(state, 'weather');
    const lantern = hasValleyBuilding(state, 'lantern');
    $('valley-discovery').hidden = !station && !lantern;
    const rain = rainyDay(state);
    const site = valleySite(state);
    const today = rain ? 'Regen' : 'Klar';
    const tomorrow = rain ? 'klar' : 'Regen';
    let forecast = station ? `Heute ${today.toLowerCase()} · morgen ${tomorrow}.` : '';
    if (state.valley.lastFind === state.valley.day) forecast += ' Das heutige Fundstück ist eingesammelt.';
    else if (site) forecast += ` ${site.name} entdeckt.`;
    else if (rain) forecast += station ? ' Alpenblumen erscheinen bei Tageslicht.' : ' Wolken verdecken die Sternkristalle.';
    else if (afterDark(state)) forecast += ' Die Kristalllaterne zeigt Sternkristalle am Abend.';
    else forecast += ' Bei klarem Abend kann ein Sternkristall erscheinen.';
    $('valley-forecast').textContent = forecast.trim();
    const findButton = $('valley-find');
    findButton.hidden = !site;
    if (site) findButton.textContent = atValleySite(site, player) ? `${site.name} nehmen` : `Zur Fundstelle · ${site.name}`;

    const track = hasValleyBuilding(state, 'marble');
    $('valley-track').hidden = !track;
    if (!track || state.valley !== activeSave) lastRoll = null;
    activeSave = state.valley;
    ball.style.left = `${(lastRoll ?? 0) / 42 * 100}%`;
    const previous = lastRoll === null ? '' : `Letzter Lauf: ${lastRoll} m · `;
    const message = `${rain ? 'Nasse Bahn' : 'Trockene Bahn'} · ${previous}Bestweite: ${state.valley.bestRoll} m`;
    if (record.textContent !== message) record.textContent = message;
  }

  function positionMarker(world) {
    const site = valleySite(state);
    if (!site) {
      marker.hidden = true;
      return;
    }
    const p = world.screen(site.x, site.y, 1);
    marker.hidden = p.x < 28 || p.x > world.W - 28 || p.y < 24 || p.y > world.H - 54;
    if (marker.hidden) return;
    if (marker.textContent !== site.symbol) marker.textContent = site.symbol;
    const label = atValleySite(site, player) ? `${site.name} nehmen` : `Zu ${site.name} laufen`;
    if (marker.getAttribute('aria-label') !== label) marker.setAttribute('aria-label', label);
    marker.style.left = `${p.x}px`;
    marker.style.top = `${p.y}px`;
  }

  return { render, positionMarker };
}
