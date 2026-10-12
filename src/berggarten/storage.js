import { fresh, restore } from './engine.js';
export const SAVE_KEY = 'berggarten-save-v1';
export const BACKUP_KEY = 'berggarten-save-before-evolution';
export function loadGarden(storage) {
  let raw;
  try { raw = storage.getItem(SAVE_KEY); } catch { return { state: fresh(), raw: null, writable: false, warning: 'Speichern blockiert. Bitte exportiere deinen Fortschritt vor dem Schliessen.' }; }
  if (!raw) return { state: fresh(), raw, writable: true };
  let value;
  try { value = JSON.parse(raw); } catch { return { state: fresh(), raw, writable: false, warning: 'Der gespeicherte Spielstand ist beschädigt. Er wird nicht überschrieben. Importiere eine Sicherung.' }; }
  if (!value || ![1, 2, 3].includes(value.version)) return { state: fresh(), raw, writable: false, warning: 'Unbekannte Spielstandversion. Der vorhandene Spielstand wird nicht überschrieben.' };
  if (value.version < 3) {
    try { if (!storage.getItem(BACKUP_KEY)) storage.setItem(BACKUP_KEY, raw); }
    catch { return { state: restore(raw), raw, writable: false, warning: 'Migrationssicherung nicht möglich. Exportiere den Spielstand; automatisches Speichern bleibt aus.' }; }
  }
  return { state: restore(raw), raw, writable: true };
}
let lockHeld = false;
export const hasSaveLock = () => lockHeld;
// Exclusive for the lifetime of the page. A second tab must not apply offline progress again.
export async function acquireSaveLock() {
  if (!navigator.locks?.request) return false;
  return new Promise(resolve => {
    navigator.locks.request('mini-games-berggarten-writer', { ifAvailable: true }, lock => {
      if (!lock) { resolve(false); return; }
      lockHeld = true;
      resolve(true);
      return new Promise(release => window.addEventListener('pagehide', () => {
        window.dispatchEvent(new Event('berggarten-before-unlock'));
        lockHeld = false;
        release();
      }, { once: true }));
    }).catch(() => resolve(false));
  });
}
