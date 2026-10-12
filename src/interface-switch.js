export const PREFERENCE_KEY = "mini-games:interface";

export const normalizeInterface = value => value === "original" ? "original" : "nexus";

export function setupInterfaceSwitch() {
  if (document.documentElement.dataset.switchReady) return;
  document.documentElement.dataset.switchReady = "true";
  const buttons = [...document.querySelectorAll("[data-interface-option]")];
  if (buttons.length !== 2) return;

  function applyInterface(option, persist = false) {
    const next = normalizeInterface(option);
    document.documentElement.dataset.interface = next;

    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.interfaceOption === next));
    }

    if (persist) {
      try {
        window.localStorage.setItem(PREFERENCE_KEY, next);
      } catch {
        // Private browsing or disabled storage: the switch still works for this visit.
      }
    }
  }

  applyInterface(document.documentElement.dataset.interface);

  for (const button of buttons) {
    button.addEventListener("click", () => {
      applyInterface(button.dataset.interfaceOption, true);
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === PREFERENCE_KEY || event.key === null) applyInterface(event.newValue);
  });
}
