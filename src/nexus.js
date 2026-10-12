import { GAME_META, AVATARS, loadProfile, persistProfile, recordOpen, toggleFavorite, progress, selectGames, recommendedGames, PROFILE_KEY } from './nexus-model.js';
import './nexus-dashboard.css';

export function setupNexus() {
  const root = document.getElementById('nexus-dashboard');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  let storage; try { storage = localStorage; } catch {}
  let profile = loadProfile(storage);
  let persistAvailable = persistProfile(storage, profile);
  const games = Object.entries(GAME_META).flatMap(([id, meta]) => {
    const source = document.querySelector('#game-grid ' + meta.selector) || document.querySelector('[data-live-section] ' + meta.selector);
    return source ? [{ id, ...meta, source, title: source.querySelector('strong').textContent,
      description: source.querySelector('small').textContent }] : [];
  });
  const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
  root.innerHTML = `<nav class="nx-nav" aria-label="NEXUS"><a href="#nexus-dashboard">Entdecken</a><a href="#nx-library">Bibliothek</a><button id="nx-profile-open">Mein Profil</button><button id="nx-fullscreen">Vollbild</button><button id="nx-install" hidden>Installieren</button></nav>
    <div class="nx-overview"><div><span class="nx-eyebrow">DEIN NÄCHSTES ABENTEUER</span><h2 id="nx-greeting"></h2><p>Deine Spiele. Dein Tempo. Direkt im Browser.</p></div><div class="nx-level" id="nx-level"></div></div>
    <p id="nx-message" role="status"></p>
    <section class="nx-strip"><h3>Zuletzt geöffnet</h3><div id="nx-recent" class="nx-compact"></div></section>
    <section class="nx-strip"><h3 id="nx-recommend-title">Für deinen nächsten Start</h3><div id="nx-recommend" class="nx-compact"></div></section>
    <section id="nx-library"><div class="nx-section-head"><h2>Spielebibliothek</h2><span id="nx-count" role="status"></span></div>
    <div class="nx-filters"><label>Suche<input id="nx-search" type="search" placeholder="Spiel finden …"></label><label>Kategorie<select id="nx-category"><option value="">Alle Kategorien</option></select></label><label>Sortierung<select id="nx-sort"><option value="featured">Empfohlen</option><option value="title">Name A–Z</option><option value="recent">Zuletzt geöffnet</option></select></label><button id="nx-favorites" aria-pressed="false">♡ Favoriten</button></div><div id="nx-cards" class="nx-cards"></div></section>`;
  const $ = id => document.getElementById(id);
  const detail = el('dialog', undefined, 'nx-dialog'); detail.id = 'nx-detail'; detail.setAttribute('aria-labelledby', 'nx-detail-title');
  const account = el('dialog', undefined, 'nx-dialog'); account.id = 'nx-profile'; account.setAttribute('aria-labelledby', 'nx-profile-title');
  document.body.append(detail, account);
  account.innerHTML = `<form method="dialog"><button class="nx-close" aria-label="Profil schliessen">×</button></form><span class="nx-eyebrow">NUR AUF DIESEM GERÄT</span><h2 id="nx-profile-title">Dein Spielerprofil</h2><form id="nx-profile-form"><label>Spielername<input id="nx-name" maxlength="24" required></label><label>Avatar<select id="nx-avatar"></select></label><label class="nx-check"><input type="checkbox" id="nx-muted"> Ton aus in Berggarten und Turbo Bump</label><label class="nx-check"><input type="checkbox" id="nx-motion"> Weniger Bewegung in NEXUS</label><button class="nx-primary">Speichern</button></form><p>Keine Anmeldung. Keine Synchronisation. Weitere Spiele haben eigene Tonregler.</p><div id="nx-stats"></div><p>25 XP pro erstmals geöffnetem Spiel. Wiederholte Starts geben keine zusätzlichen XP. Öffnungen sind keine abgeschlossenen Spielrunden.</p><h3>Herausforderungen</h3><div id="nx-achievements"></div><p id="nx-profile-message" role="status"></p><p id="nx-install-help">Auf iPhone: in Safari «Teilen» → «Zum Home-Bildschirm». Offline stehen die Spiele nach dem ersten vollständigen Laden der App bereit; Multiplayer benötigt eine Verbindung.</p>`;
  for (const avatar of AVATARS) $('nx-avatar').append(new Option(avatar, avatar));
  for (const category of [...new Set(games.map(g => g.category))]) $('nx-category').append(new Option(category, category));
  function save() {
    const ok = persistProfile(storage, profile);
    persistAvailable = ok;
    $('nx-message').textContent = ok ? '' : 'Dein Browser blockiert das Speichern. Änderungen gelten nur in dieser Sitzung.';
    document.documentElement.classList.toggle('nx-reduced', profile.reducedMotion);
    window.dispatchEvent(new CustomEvent('nexus-profile-change', { detail: profile }));
    return ok;
  }
  function start(game) { detail.close(); game.source.click(); }
  function mini(game) { const b = el('button', undefined, 'nx-mini'); b.append(el('span', game.icon), el('strong', game.title), el('small', game.category)); b.onclick = () => start(game); return b; }
  function favoriteButton(game) {
    const b = el('button', profile.favorites.includes(game.id) ? '♥' : '♡', 'nx-favorite');
    b.setAttribute('aria-label', `${game.title}: Favorit`); b.setAttribute('aria-pressed', String(profile.favorites.includes(game.id)));
    b.onclick = () => { profile = toggleFavorite(profile, game.id); save(); render(); b.setAttribute('aria-pressed', String(profile.favorites.includes(game.id))); b.textContent = profile.favorites.includes(game.id) ? '♥' : '♡'; };
    return b;
  }
  function showDetail(game, setHash = true) {
    detail.replaceChildren();
    const close = el('button', '×', 'nx-close'); close.setAttribute('aria-label', 'Spieldetails schliessen'); close.onclick = () => detail.close();
    const title = el('h2', game.title); title.id = 'nx-detail-title';
    const play = el('button', 'Jetzt spielen →', 'nx-primary'); play.onclick = () => start(game);
    detail.append(close, el('span', game.category.toUpperCase(), 'nx-eyebrow'), title, el('p', game.description), el('p', game.mode), play, favoriteButton(game), el('p', 'Spielstände bleiben lokal in diesem Browser.'));
    if (game.mode.includes('WLAN')) detail.append(el('p', 'Mehrspieler: gleiches WLAN / LAN und Internet für die vorhandene PeerJS-Signalisierung erforderlich.'));
    if (!detail.open) detail.showModal();
    if (setHash) history.replaceState(null, '', `#spiel/${game.id}`);
  }
  detail.addEventListener('close', () => { if (location.hash.startsWith('#spiel/')) history.replaceState(null, '', location.pathname + location.search + '#nx-library'); });
  function render() {
    const focused = document.activeElement?.closest('[data-game]')?.dataset.game;
    const p = progress(profile);
    $('nx-greeting').textContent = `${profile.avatar} Hallo, ${profile.name || 'Spieler'}.`;
    $('nx-level').textContent = `LEVEL ${p.level} · ${p.xp} XP`;
    const filtered = selectGames(games, profile, { query: $('nx-search').value, category: $('nx-category').value, sort: $('nx-sort').value, favorites: $('nx-favorites').getAttribute('aria-pressed') === 'true' });
    $('nx-count').textContent = `${filtered.length} von ${games.length} Spielen`;
    $('nx-cards').replaceChildren(...filtered.map(game => {
      const card = el('article', undefined, 'nx-card'); card.dataset.game = game.id; card.style.setProperty('--cover', game.color);
      const cover = el('button', undefined, 'nx-cover'); cover.setAttribute('aria-label', `${game.title}: Details`);
      const art = el('img', undefined, 'nx-cover-art'); art.src = `${import.meta.env.BASE_URL}covers/${game.id}.svg`; art.alt = ''; art.loading = 'lazy'; art.width = 640; art.height = 350;
      cover.append(art, el('span', game.category, 'nx-cover-tag'), el('span', game.title, 'nx-cover-name')); cover.onclick = () => showDetail(game);
      const body = el('div', undefined, 'nx-card-body'); const play = el('button', 'Spielen ↗', 'nx-play'); play.onclick = () => start(game);
      const more = el('button', 'Details', 'nx-more'); more.onclick = () => showDetail(game);
      const actions = el('div', undefined, 'nx-card-actions'); actions.append(play, more, favoriteButton(game));
      body.append(el('small', game.mode), el('h3', game.title), el('p', game.description), actions); card.append(cover, body); return card;
    }));
    if (!filtered.length) $('nx-cards').append(el('p', 'Keine Treffer. Ändere die Suche oder den Filter.'));
    const recent = selectGames(games.filter(g => profile.stats[g.id]), profile, { sort: 'recent' }).slice(0, 3);
    $('nx-recent').replaceChildren(...(recent.length ? recent.map(mini) : [el('p', 'Öffne dein erstes Spiel. Deine letzten Starts erscheinen hier.')]));
    $('nx-recommend-title').textContent = p.opens ? 'Entdecken nach deinen lokal geöffneten Kategorien' : 'Für deinen nächsten Start';
    const recommendations = recommendedGames(games, profile);
    $('nx-recommend').replaceChildren(...(recommendations.length ? recommendations.map(mini) : [el('p', 'Du hast alle Spiele entdeckt. Zeit für eine neue Runde!')]));
    $('nx-stats').textContent = `${p.opens} Spielöffnungen · ${Object.keys(profile.stats).length} verschiedene Spiele · ${p.xp} XP`;
    $('nx-achievements').replaceChildren(...p.achievements.map(a => el('p', `${a.value >= a.goal ? '✓' : '○'} ${a.title} · ${Math.min(a.value, a.goal)} / ${a.goal}`)));
    if (focused) $('nx-cards').querySelector(`[data-game="${focused}"] .nx-favorite`)?.focus();
  }
  for (const game of games) game.source.addEventListener('click', () => { profile = recordOpen(loadCurrent(), game.id); save(); render(); });
  function loadCurrent() { return storage && persistAvailable ? loadProfile(storage) : profile; }
  document.querySelector('.nexus-cta').addEventListener('click', e => { e.preventDefault(); start(games.find(g => g.id === 'berggarten')); });
  for (const id of ['nx-search', 'nx-category', 'nx-sort']) $(id).addEventListener('input', render);
  $('nx-favorites').onclick = () => { const b = $('nx-favorites'); b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); render(); };
  $('nx-profile-open').onclick = () => { $('nx-name').value = profile.name; $('nx-avatar').value = profile.avatar; $('nx-muted').checked = profile.muted; $('nx-motion').checked = profile.reducedMotion; account.showModal(); };
  $('nx-profile-form').onsubmit = e => { e.preventDefault(); profile = { ...loadCurrent(), name: $('nx-name').value.trim() || 'Spieler', avatar: $('nx-avatar').value, muted: $('nx-muted').checked, reducedMotion: $('nx-motion').checked }; persistAvailable = save(); $('nx-profile-message').textContent = persistAvailable ? 'Profil gespeichert.' : 'Speichern blockiert – nur diese Sitzung.'; render(); };
  if (!document.documentElement.requestFullscreen) $('nx-fullscreen').hidden = true;
  $('nx-fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { $('nx-message').textContent = 'Vollbild ist in diesem Browser nicht verfügbar.'; } };
  window.addEventListener('storage', e => { if (e.key === PROFILE_KEY || e.key === null) { profile = loadProfile(storage); render(); } });
  window.addEventListener('pageshow', () => { profile = loadCurrent(); render(); });
  window.addEventListener('hashchange', () => { const g = games.find(g => location.hash === `#spiel/${g.id}`); if (g) showDetail(g, false); });
  document.documentElement.classList.add('nexus-ready'); document.documentElement.classList.remove('nexus-loading'); document.documentElement.classList.toggle('nx-reduced', profile.reducedMotion);
  render(); const initial = games.find(g => location.hash === `#spiel/${g.id}`); if (initial) showDetail(initial, false);
  if (!persistAvailable) $('nx-message').textContent = 'Lokales Speichern ist blockiert. Du kannst trotzdem spielen.';
}
