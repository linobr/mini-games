export function setupPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  const message = document.getElementById('nx-message');
  const tell = text => { if (message) message.textContent = text; };
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).then(reg => {
    const update = () => { if (reg.waiting) tell('Update bereit. Schliesse alle Mini-Games-Tabs und öffne die App erneut. Deine Spielstände bleiben erhalten.'); };
    update(); reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', update));
  }).catch(() => tell('Offline-Modus konnte nicht eingerichtet werden. Online kannst du normal spielen.'));
  let installEvent;
  const button = document.getElementById('nx-install');
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; if (button) button.hidden = false; });
  if (button) button.onclick = async () => { if (!installEvent) return; try { await installEvent.prompt(); await installEvent.userChoice; } finally { installEvent = null; button.hidden = true; } };
  window.addEventListener('appinstalled', () => { if (button) button.hidden = true; tell('NEXUS ist installiert.'); });
}
