// Additive economy: fixed plots keep the main walking route clear.
export const WORLD_WIDTH = 30;
export const WORLD_HEIGHT = 15;
export const STOCK_LIMIT = 5000;
export const PLOTS = [
  { id: 'home', name: 'Dorfplatz', x: 1, y: 13, zone: 0 },
  { id: 'garden', name: 'Gartenrand', x: 9, y: 4, zone: 1 },
  { id: 'forest', name: 'Waldlichtung', x: 20, y: 10, zone: 3 },
  { id: 'summit', name: 'Gipfelterrasse', x: 26, y: 10, zone: 4 },
  { id: 'alpine', name: 'Alpendorf', x: 26, y: 4, zone: 4 },
];
export const BUILDINGS = {
  sawmill: { name: 'Sägewerk', recipe: 'plank', zone: 0, cost: { coins: 120, bush: 8, rock: 4 } },
  stoneworks: { name: 'Steinwerk', recipe: 'brick', zone: 1, cost: { coins: 240, bush: 8, rock: 12 } },
  gemworks: { name: 'Kristallschleiferei', recipe: 'gem', zone: 2, cost: { coins: 450, plank: 5, brick: 5 } },
  alpineworks: { name: 'Alpenwerkstatt', recipe: 'kit', zone: 4, cost: { coins: 800, plank: 8, brick: 8, gem: 3 } },
};
export function costFor(kind, level = 0) {
  if (!Object.hasOwn(BUILDINGS, kind) || !Number.isInteger(level) || level < 0 || level > 2) return null;
  return Object.fromEntries(Object.entries(BUILDINGS[kind].cost).map(([k, v]) => [k, v * (level + 1)]));
}
export function canPay(s, cost) { return !!cost && Object.entries(cost).every(([k, n]) => (k === 'coins' ? s.coins : s.stock[k]) >= n); }
function pay(s, cost) { for (const [k, n] of Object.entries(cost)) { if (k === 'coins') s.coins -= n; else s.stock[k] -= n; } }
export function placeBuilding(s, kind, plotId) {
  const plot = PLOTS.find(p => p.id === plotId), building = BUILDINGS[kind], cost = costFor(kind);
  if (!plot || !cost || plot.zone >= s.zones || building.zone >= s.zones || s.buildings.some(b => b.plot === plotId) || !canPay(s, cost)) return false;
  pay(s, cost); s.buildings.push({ plot: plotId, kind, level: 1, auto: false, job: null }); s.xp += 15; return true;
}
export function upgradeBuilding(s, plotId) {
  const b = s.buildings.find(b => b.plot === plotId);
  if (!b || b.level >= 3 || b.job) return false;
  const cost = costFor(b.kind, b.level); if (!canPay(s, cost)) return false;
  pay(s, cost); b.level++; s.buildingUpgrades++; s.xp += 15; return true;
}
export function startProduction(s, plotId, recipes) {
  const b = s.buildings.find(b => b.plot === plotId); if (!b || b.job) return false;
  const kind = BUILDINGS[b.kind].recipe, r = recipes[kind];
  if (!r || s.stock[kind] >= STOCK_LIMIT || !canPay(s, r.input)) return false;
  pay(s, r.input); const total = r.time / b.level; b.job = { kind, total, remaining: total }; return true;
}
export function tickBuildings(s, seconds, recipes) {
  let completed = 0;
  for (const b of s.buildings) {
    let budget = seconds;
    // At most 300 seconds / minimum recipe time; bound also protects corrupt runtime state.
    for (let step = 0; step < 200 && budget > 0; step++) {
      if (!b.job && (!b.auto || !startProduction(s, b.plot, recipes))) break;
      const used = Math.min(budget, b.job.remaining); b.job.remaining -= used; budget -= used;
      if (b.job.remaining > 0 || s.stock[b.job.kind] >= STOCK_LIMIT) break;
      s.stock[b.job.kind]++; s.crafted++; s.xp += 4; completed++; b.job = null;
      if (!b.auto) break;
    }
  }
  return completed;
}
export function buildingAt(s, x, y) {
  return s.buildings.some(b => { const p = PLOTS.find(p => p.id === b.plot); return p && Math.abs(p.x - x) < .65 && Math.abs(p.y - y) < .65; });
}
export const QUESTS = [
  { id: 'workshop', title: 'Die erste Manufaktur', stat: 'workshop', goal: 1, reward: 40 },
  { id: 'builder', title: 'Ein eigener Produktionsbetrieb', stat: 'buildings', goal: 1, reward: 60 },
  { id: 'delivery', title: 'Den ersten Handel abschliessen', stat: 'orders', goal: 1, reward: 40 },
  { id: 'forest', title: 'Das Waldtal erschliessen', stat: 'zones', goal: 4, reward: 120 },
  { id: 'upgrade', title: 'Eine Produktionsanlage verbessern', stat: 'buildingUpgrades', goal: 1, reward: 80 },
  { id: 'production', title: '20 neue Waren herstellen', stat: 'crafted', goal: 20, reward: 150 },
  { id: 'summit', title: 'Das Alpendorf erreichen', stat: 'zones', goal: 5, reward: 200 },
];
export const questProgress = (s, q) => q.stat === 'buildings' ? s.buildings.length : s[q.stat];
export function claimQuest(s, id) {
  const q = QUESTS.find(q => q.id === id);
  if (!q || s.quests.includes(id) || questProgress(s, q) < q.goal) return 0;
  s.quests.push(id); s.coins += q.reward; s.earned += q.reward; s.xp += 15; return q.reward;
}
