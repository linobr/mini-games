import { BUILDINGS, PLOTS, QUESTS, costFor, placeBuilding, upgradeBuilding, startProduction, claimQuest, questProgress } from './evolution.js';
import { NAMES, RECIPES, ZONES, exportSave, importSave } from './engine.js';
export function setupEvolution({ state, changed, toast, backup, replace }) {
  const $ = id => document.getElementById(id);
  const costText = cost => Object.entries(cost).map(([k, n]) => `${n} ${k === 'coins' ? '●' : NAMES[k]}`).join(' · ');
  $('building-kind').innerHTML = Object.entries(BUILDINGS).map(([id, b]) => `<option value="${id}">${b.name}</option>`).join('');
  const root = $('buildings-list'), questList = $('evolution-quests');
  let signature = '';
  function render() {
    const kind = $('building-kind').value;
    const building = BUILDINGS[kind];
    const cost = costFor(kind);
    $('building-cost').textContent = `Baukosten: ${costText(cost)}`;
    const unlocked = building.zone < state.zones;
    const plots = unlocked ? PLOTS.filter(p => p.zone < state.zones && !state.buildings.some(b => b.plot === p.id)) : [];
    const plotSelect = $('building-plot');
    const emptyLabel = unlocked ? 'Kein freier Bauplatz' : 'Region noch gesperrt';
    const previous = plotSelect.value;
    const plotValues = plots.length ? plots.map(p => p.id) : [''];
    const optionsChanged = plotSelect.options.length !== plotValues.length ||
      plotValues.some((value, index) => plotSelect.options[index]?.value !== value);
    if (optionsChanged || (!plots.length && plotSelect.options[0]?.text !== emptyLabel)) {
      const options = plots.length ? plots.map(p => new Option(p.name, p.id)) : [new Option(emptyLabel, '')];
      plotSelect.replaceChildren(...options);
      if (plots.some(p => p.id === previous)) plotSelect.value = previous;
    }
    plotSelect.disabled = !plots.length;

    const missing = Object.fromEntries(Object.entries(cost).flatMap(([key, amount]) => {
      const balance = key === 'coins' ? state.coins : state.stock[key];
      return balance < amount ? [[key, amount - balance]] : [];
    }));
    const affordable = !Object.keys(missing).length;
    let availability = '';
    if (!unlocked) {
      availability = `Erschliesse zuerst «${ZONES[building.zone].name}» im Tab Tal.`;
    } else if (!plots.length) {
      availability = state.zones < ZONES.length ? 'Weitere Bauplätze schaltest du im Tab Tal frei.' : 'Alle Bauplätze sind belegt.';
    } else if (!affordable) {
      availability = `Es fehlen ${costText(missing)}.`;
    }
    const feedback = $('building-availability');
    if (feedback.textContent !== availability) feedback.textContent = availability;
    $('build-place').disabled = !plots.length || !affordable;
    const next = JSON.stringify([state.buildings.map(b => [b.kind, b.plot, b.level, b.auto]), state.quests]);
    if (signature !== next) {
      signature = next;
      root.innerHTML = state.buildings.map(b => `<article class="building-item" data-plot="${b.plot}"><h4>${BUILDINGS[b.kind].name} · Stufe ${b.level}</h4><small>${PLOTS.find(p => p.id === b.plot).name}</small><p data-status></p><progress max="1" value="0" aria-label="Produktionsfortschritt"></progress><div class="building-actions"><button data-start>1 Auftrag</button><button data-auto aria-pressed="${b.auto}">Automatik ${b.auto ? 'an' : 'aus'}</button><button data-upgrade>Ausbauen</button></div><small data-cost></small></article>`).join('') || '<p>Noch kein Betrieb. Lagere Holz und Stein ein und baue dein erstes Sägewerk.</p>';
      questList.innerHTML = QUESTS.map(q => `<article class="evolution-quest"><span>${q.title}</span><small data-quest-progress="${q.id}"></small><button data-claim="${q.id}"></button></article>`).join('');
    }
    for (const b of state.buildings) {
      const card = root.querySelector(`[data-plot="${b.plot}"]`), r = RECIPES[BUILDINGS[b.kind].recipe];
      card.querySelector('[data-status]').textContent = b.job ? `${NAMES[b.job.kind]} · ${Math.ceil(b.job.remaining)} s${b.job.remaining === 0 ? ' · Lager voll' : ''}` : `Bereit · ${costText(r.input)} → 1 ${r.name}`;
      card.querySelector('progress').value = b.job ? 1 - b.job.remaining / b.job.total : 0;
      card.querySelector('[data-start]').disabled = !!b.job;
      card.querySelector('[data-upgrade]').disabled = b.level >= 3 || !!b.job;
      card.querySelector('[data-cost]').textContent = b.level >= 3 ? 'Maximale Stufe' : `Ausbau: ${costText(costFor(b.kind, b.level))}`;
    }
    for (const q of QUESTS) {
      const done = state.quests.includes(q.id), value = questProgress(state, q);
      questList.querySelector(`[data-quest-progress="${q.id}"]`).textContent = `${Math.min(value, q.goal)} / ${q.goal}`;
      const button = questList.querySelector(`[data-claim="${q.id}"]`); button.disabled = done || value < q.goal; button.textContent = done ? 'Erledigt ✓' : `+${q.reward} ●`;
    }
    $('day-phase').textContent = state.dayClock < 300 ? '☀ Tag' : '☾ Abend';
  }
  $('building-kind').onchange = render;
  $('build-place').onclick = () => { if (placeBuilding(state, $('building-kind').value, $('building-plot').value)) { changed(true); toast('Betrieb gebaut. Starte einen Auftrag oder aktiviere die Automatik.'); } else toast('Nicht genügend Münzen oder Materialien im Lager.'); };
  root.onclick = event => {
    const button = event.target.closest('button'), card = button?.closest('[data-plot]'); if (!card) return;
    const b = state.buildings.find(b => b.plot === card.dataset.plot); let ok = true;
    if (button.hasAttribute('data-start')) ok = startProduction(state, b.plot, RECIPES);
    if (button.hasAttribute('data-upgrade')) ok = upgradeBuilding(state, b.plot);
    if (button.hasAttribute('data-auto')) b.auto = !b.auto;
    if (!ok) toast('Material fehlt, Lager voll oder Auftrag noch aktiv.'); else changed(true);
  };
  questList.onclick = event => { const id = event.target.closest('[data-claim]')?.dataset.claim; if (id && claimQuest(state, id)) { toast('Questbelohnung abgeholt.'); changed(false); } };
  function download(text, name) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
  $('export-save').onclick = () => download(exportSave(state), 'berggarten-spielstand.json');
  $('import-save').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Maximale Dateigrösse: 2 MB.');
      const next = importSave(await file.text());
      if (!confirm('Den aktuellen Spielstand durch diese Datei ersetzen? Zuerst wird der aktuelle Stand lokal gesichert.')) return;
      if (!backup()) throw new Error('Sicherung nicht möglich. Exportiere zuerst deinen Spielstand.');
      replace(next); toast('Spielstand importiert.');
    } catch (e) { toast(e.message); } finally { event.target.value = ''; }
  };
  return render;
}
