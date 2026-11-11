export const VALLEY_BUILDINGS = {
  cable: { name: 'Materialseilbahn', zone: 3, coins: 160, stock: { plank: 3 } },
  lantern: { name: 'Kristalllaterne', zone: 3, coins: 90, stock: { crystal: 1 } },
  weather: { name: 'Wetterstation', zone: 2, coins: 70, stock: { rock: 4 } },
  marble: { name: 'Murmelbahn', zone: 2, coins: 55, stock: { plank: 4, rock: 2 } },
};
const planCost = { plank: 2, brick: 1 };

export function freshValley() {
  return { built: [], day: 0, blueprint: false, lastFind: -1, bestRoll: 0 };
}

const whole = (value, min, max, fallback = 0) =>
  Number.isFinite(value) ? Math.floor(Math.max(min, Math.min(max, value))) : fallback;

export function restoreValley(state, saved) {
  const valley = freshValley();
  if (!saved || typeof saved !== 'object') return valley;
  valley.day = whole(saved.day, 0, 1e9);
  valley.lastFind = whole(saved.lastFind, -1, valley.day, -1);
  valley.blueprint = state.zones >= 2 && saved.blueprint === true;
  if (Array.isArray(saved.built)) {
    valley.built = Object.entries(VALLEY_BUILDINGS)
      .filter(([id, building]) => saved.built.includes(id) && state.zones >= building.zone && (id !== 'marble' || valley.blueprint))
      .map(([id]) => id);
  }
  valley.bestRoll = valley.built.includes('marble') ? whole(saved.bestRoll, 0, 42) : 0;
  return valley;
}

export const hasValleyBuilding = (state, id) => state.valley.built.includes(id);
const canPay = (state, materials) => Object.entries(materials).every(([key, amount]) => state.stock[key] >= amount);
function spend(state, materials) {
  for (const [key, amount] of Object.entries(materials)) state.stock[key] -= amount;
}

export function buildStatus(state, id) {
  const building = VALLEY_BUILDINGS[id];
  if (hasValleyBuilding(state, id)) return 'Gebaut';
  if (state.zones < building.zone) return `Ab Region ${building.zone}`;
  if (id === 'marble' && !state.valley.blueprint) return 'Bauplan vom Nachtmarkt nötig';
  if (state.coins < building.coins || !canPay(state, building.stock)) return 'Münzen oder Material fehlen';
  return '';
}

export function buildValley(state, id) {
  if (!Object.hasOwn(VALLEY_BUILDINGS, id) || buildStatus(state, id)) return false;
  const building = VALLEY_BUILDINGS[id];
  state.coins -= building.coins;
  spend(state, building.stock);
  state.valley.built.push(id);
  return true;
}

export const rainyDay = state => state.valley.day % 2 === 1;
export const afterDark = state => state.dayClock >= 300;

export function marketStatus(state) {
  if (state.valley.blueprint) return 'Bauplan erhalten';
  if (state.zones < 2) return 'Ab Region 2';
  if (!afterDark(state)) return 'Öffnet am Abend';
  if (!canPay(state, planCost)) return 'Material im Lager fehlt';
  return '';
}

export function tradeBlueprint(state) {
  if (marketStatus(state)) return false;
  spend(state, planCost);
  state.valley.blueprint = true;
  return true;
}

const blossom = { name: 'Alpenblume', x: 10, y: 7, reward: 24, symbol: '✿' };
const crystal = { name: 'Sternkristall', x: 14, y: 7, reward: 38, symbol: '✦' };

export function valleySite(state) {
  if (state.valley.lastFind === state.valley.day) return null;
  if (rainyDay(state)) return !afterDark(state) && hasValleyBuilding(state, 'weather') ? blossom : null;
  return afterDark(state) && hasValleyBuilding(state, 'lantern') ? crystal : null;
}

export const atValleySite = (site, player) => Math.hypot(site.x - player.x, site.y - player.y) <= 1.15;

export function collectValleySite(state, player) {
  const site = valleySite(state);
  if (!site || !atValleySite(site, player)) return null;
  state.valley.lastFind = state.valley.day;
  state.coins += site.reward;
  state.earned += site.reward;
  return site;
}

export function rollMarble(state, strength) {
  if (!hasValleyBuilding(state, 'marble') || !Number.isFinite(strength)) return null;
  const ideal = rainyDay(state) ? 61 : 74;
  const power = whole(strength, 0, 100);
  const distance = Math.max(0, 42 - Math.round(Math.abs(power - ideal) * .65));
  state.valley.bestRoll = Math.max(state.valley.bestRoll, distance);
  return distance;
}
