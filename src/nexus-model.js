export const PROFILE_KEY = 'mini-games:nexus-profile:v1';
export const AVATARS = ['✦', '⛰', '⚡', '◈', '☾', '✿'];
export const GAME_META = {
  berggarten: { selector: 'a[href="./berggarten/"]', category: 'Aufbau', mode: 'Solo', icon: '⛰', color: '#478e74' },
  mooslicht: { selector: 'a[href="./mooslicht/"]', category: 'Abenteuer', mode: 'Solo', icon: '✧', color: '#567a96' },
  'ki-mooslicht': { selector: 'a[href="./ki-mooslicht/"]', category: 'Abenteuer', mode: 'Solo · Live', icon: '✧', color: '#a45e91' },
  tictactoe: { selector: '#open-tictactoe', category: 'Strategie', mode: '2 · Lokal / WLAN', icon: '× ○', color: '#4d789f' },
  turbo: { selector: '#open-turbo', category: 'Arcade', mode: '2–4 · WLAN', icon: '⚡', color: '#8465c1' },
  color: { selector: '#open-color-clash', category: 'Strategie', mode: '1–4 · Solo / WLAN', icon: '⇄', color: '#af5c88' },
  meteor: { selector: 'a[href="./meteor-run.html"]', category: 'Arcade', mode: 'Solo', icon: '☄', color: '#7f914e' },
  neon: { selector: 'a[href="./neon-defender.html"]', category: 'Arcade', mode: 'Solo', icon: '✦', color: '#29899e' },
  atom: { selector: 'a[href="./atom-lab.html"]', category: 'Lernen', mode: 'Solo', icon: '⚛', color: '#578c80' },
  rift: { selector: 'a[href="./rift-relay/"]', category: 'Arcade', mode: 'Solo', icon: 'ϟ', color: '#6265a5' },
};
const integer = (v, max = 1e7) => Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
export function normalizeProfile(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const stats = {};
  for (const id of Object.keys(GAME_META)) {
    const entry = p.stats?.[id];
    if (entry && integer(entry.opens)) stats[id] = { opens: integer(entry.opens), lastOpened: integer(entry.lastOpened, Date.now()) };
  }
  return { version: 1, name: typeof p.name === 'string' ? p.name.trim().slice(0, 24) : 'Spieler',
    avatar: AVATARS.includes(p.avatar) ? p.avatar : AVATARS[0],
    favorites: Array.isArray(p.favorites) ? [...new Set(p.favorites.filter(id => Object.hasOwn(GAME_META, id)))] : [],
    muted: p.muted === true, reducedMotion: p.reducedMotion === true, stats };
}
export function loadProfile(storage) {
  try { return normalizeProfile(JSON.parse(storage.getItem(PROFILE_KEY))); } catch { return normalizeProfile(null); }
}
export function persistProfile(storage, profile) {
  try { storage.setItem(PROFILE_KEY, JSON.stringify(normalizeProfile(profile))); return true; } catch { return false; }
}
export function recordOpen(profile, id, now = Date.now()) {
  if (!Object.hasOwn(GAME_META, id) || !Number.isFinite(now)) return profile;
  const next = normalizeProfile(profile), old = next.stats[id];
  next.stats[id] = { opens: Math.min(1e7, (old?.opens || 0) + 1), lastOpened: Math.max(0, Math.min(Date.now(), now)) };
  return next;
}
export function toggleFavorite(profile, id) {
  const next = normalizeProfile(profile);
  if (!Object.hasOwn(GAME_META, id)) return next;
  next.favorites = next.favorites.includes(id) ? next.favorites.filter(x => x !== id) : [...next.favorites, id];
  return next;
}
export function progress(profile) {
  const entries = Object.entries(profile.stats), unique = entries.length;
  const categories = new Set(entries.map(([id]) => GAME_META[id].category));
  return { xp: unique * 25, level: 1 + Math.floor(unique / 4), opens: entries.reduce((n, [, s]) => n + s.opens, 0),
    achievements: [{ title: 'Erster Start', value: unique, goal: 1 }, { title: 'Entdecker', value: unique, goal: 5 },
      { title: 'Horizonte', value: categories.size, goal: 4 }] };
}
export function selectGames(games, profile, { query = '', category = '', favorites = false, sort = 'featured' } = {}) {
  const term = query.trim().toLocaleLowerCase('de');
  const list = games.filter(g => (!category || g.category === category) && (!favorites || profile.favorites.includes(g.id)) &&
    `${g.title} ${g.description} ${g.category}`.toLocaleLowerCase('de').includes(term));
  if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  if (sort === 'recent') list.sort((a, b) => (profile.stats[b.id]?.lastOpened || 0) - (profile.stats[a.id]?.lastOpened || 0));
  return list;
}
export function recommendedGames(games, profile) {
  const weights = {};
  for (const [id, stat] of Object.entries(profile.stats)) weights[GAME_META[id].category] = (weights[GAME_META[id].category] || 0) + stat.opens;
  return games.filter(g => !profile.stats[g.id]).sort((a, b) => (weights[b.category] || 0) - (weights[a.category] || 0)).slice(0, 3);
}
