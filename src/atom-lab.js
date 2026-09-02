import { PERIODIC_TABLE } from "./periodic-table-data.js";

const canvas = document.querySelector("#atom-canvas");
const ctx = canvas.getContext("2d");

const controls = {
  protons: document.querySelector("#protons"),
  neutrons: document.querySelector("#neutrons"),
  electrons: document.querySelector("#electrons"),
  protonNumber: document.querySelector("#proton-number"),
  neutronNumber: document.querySelector("#neutron-number"),
  electronNumber: document.querySelector("#electron-number"),
  elementSelect: document.querySelector("#element-select"),
  elementSearch: document.querySelector("#element-search"),
  elementOptions: document.querySelector("#element-options"),
  searchButton: document.querySelector("#search-element"),
  animationButton: document.querySelector("#toggle-animation"),
  periodicTable: document.querySelector("#periodic-table"),
};

const output = {
  title: document.querySelector("#atom-title"),
  subtitle: document.querySelector("#atom-subtitle"),
  element: document.querySelector("#fact-element"),
  number: document.querySelector("#fact-number"),
  mass: document.querySelector("#fact-mass"),
  atomicMass: document.querySelector("#fact-atomic-mass"),
  charge: document.querySelector("#fact-charge"),
  ion: document.querySelector("#fact-ion"),
  shells: document.querySelector("#fact-shells"),
  shellCount: document.querySelector("#fact-shell-count"),
  position: document.querySelector("#fact-position"),
  group: document.querySelector("#fact-group"),
  config: document.querySelector("#fact-config"),
  configHint: document.querySelector("#fact-config-hint"),
};

const LIMITS = {
  protons: [1, 118],
  neutrons: [0, 220],
  electrons: [0, 130],
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let state = {
  protons: 6,
  neutrons: 6,
  electrons: 6,
  animate: !prefersReducedMotion,
};

let animationStart = performance.now();
let animationFrame = null;

function getElement(atomicNumber = state.protons) {
  return PERIODIC_TABLE[atomicNumber - 1];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function formatAtomicMass(value) {
  if (!Number.isFinite(Number(value))) return "unbekannt";
  const numeric = Number(value);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function referenceMassNumber(element) {
  return Math.max(element.atomicNumber, Math.round(Number(element.atomicMass)));
}

function neutralShellsForElectronCount(electrons) {
  if (electrons <= 0) return [];
  if (electrons <= 118) return [...PERIODIC_TABLE[electrons - 1].shells];

  const capacities = [2, 8, 18, 32, 32, 18, 8, 8];
  const shells = [];
  let remaining = electrons;

  for (const capacity of capacities) {
    if (remaining <= 0) break;
    const count = Math.min(capacity, remaining);
    shells.push(count);
    remaining -= count;
  }

  if (remaining > 0) shells.push(remaining);
  return shells;
}

function shellDistribution() {
  const element = getElement();

  if (state.electrons === state.protons) {
    return [...element.shells];
  }

  if (state.electrons < state.protons) {
    const shells = [...element.shells];
    let toRemove = state.protons - state.electrons;

    for (let i = shells.length - 1; i >= 0 && toRemove > 0; i -= 1) {
      const removed = Math.min(shells[i], toRemove);
      shells[i] -= removed;
      toRemove -= removed;
    }

    while (shells.length && shells[shells.length - 1] === 0) shells.pop();
    return shells;
  }

  return neutralShellsForElectronCount(state.electrons);
}

function setElement(atomicNumber, { keepParticles = false } = {}) {
  const next = clamp(atomicNumber, 1, 118);
  const element = getElement(next);

  state.protons = next;

  if (!keepParticles) {
    const mass = referenceMassNumber(element);
    state.neutrons = clamp(mass - next, ...LIMITS.neutrons);
    state.electrons = next;
  }

  rerender({ restartAnimation: true });
}

function setParticle(key, value) {
  const [min, max] = LIMITS[key];
  state[key] = clamp(value, min, max);
  rerender();
}

function syncControls() {
  controls.protons.value = String(state.protons);
  controls.neutrons.value = String(state.neutrons);
  controls.electrons.value = String(state.electrons);
  controls.protonNumber.value = String(state.protons);
  controls.neutronNumber.value = String(state.neutrons);
  controls.electronNumber.value = String(state.electrons);
  controls.elementSelect.value = String(state.protons);

  document.querySelectorAll(".element-tile.active").forEach((tile) => {
    tile.classList.remove("active");
    tile.removeAttribute("aria-current");
  });

  const activeTile = document.querySelector(`.element-tile[data-z="${state.protons}"]`);
  if (activeTile) {
    activeTile.classList.add("active");
    activeTile.setAttribute("aria-current", "true");
  }
}

function renderFacts() {
  const element = getElement();
  const mass = state.protons + state.neutrons;
  const charge = state.protons - state.electrons;
  const shells = shellDistribution();
  const shellText = shells.length ? shells.join(" · ") : "keine";

  output.title.textContent = `${element.name}-${mass}`;
  output.subtitle.textContent = `${element.symbol} · Ordnungszahl ${element.atomicNumber}`;
  output.element.textContent = `${element.name} (${element.symbol})`;
  output.number.textContent = `Ordnungszahl ${element.atomicNumber}`;
  output.mass.textContent = String(mass);
  output.atomicMass.textContent = `Atommasse ≈ ${formatAtomicMass(element.atomicMass)} u`;

  if (charge === 0) {
    output.charge.textContent = "0 · neutral";
  } else if (charge > 0) {
    output.charge.textContent = `+${charge} · Kation`;
  } else {
    output.charge.textContent = `${charge} · Anion`;
  }

  output.ion.textContent = `${state.protons} p⁺ · ${state.neutrons} n · ${state.electrons} e⁻`;
  output.shells.textContent = shellText;
  output.shellCount.textContent =
    shells.length === 1 ? "1 besetzte Schale" : `${shells.length} besetzte Schalen`;

  output.position.textContent = `Periode ${element.period}`;
  output.group.textContent = element.group ? `Gruppe ${element.group}` : "Lanthanid / Actinid";

  if (charge === 0) {
    output.config.textContent = element.electronConfigurationShort;
    output.configHint.textContent = "Elektronenkonfiguration des Neutralatoms";
  } else {
    output.config.textContent = shellText;
    output.configHint.textContent = "Vereinfachte Schalenverteilung des Ions";
  }
}

function drawCircle(x, y, radius, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawNucleus(cx, cy, nucleusCount, nucleusRadius) {
  drawCircle(
    cx,
    cy,
    nucleusRadius,
    "rgba(255,253,248,0.055)",
    "rgba(255,255,255,0.18)",
    2,
  );

  const particleRadius = clamp(nucleusRadius / (Math.sqrt(nucleusCount) * 2.05), 2.4, 9.5);
  const usableRadius = Math.max(1, nucleusRadius - particleRadius - 4);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < nucleusCount; i += 1) {
    const ratio = nucleusCount === 1 ? 0 : Math.sqrt((i + 0.5) / nucleusCount);
    const angle = i * goldenAngle;
    const radius = usableRadius * ratio;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const isProton = i < state.protons;

    drawCircle(
      x,
      y,
      particleRadius,
      isProton ? "#f25f5c" : "#5b7cfa",
      "rgba(255,255,255,0.22)",
      0.8,
    );
  }

  drawCircle(cx, cy, clamp(nucleusRadius * 0.29, 18, 28), "rgba(23,34,29,0.88)");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 21px system-ui, sans-serif";
  ctx.fillText(getElement().symbol, cx, cy + 1);
}

function drawAtom(now) {
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2 + 8;
  const shells = shellDistribution();
  const maxRadius = Math.min(width, height) * 0.435;
  const shellGap = shells.length ? maxRadius / shells.length : maxRadius;
  const time = state.animate ? (now - animationStart) / 1000 : 0;

  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(cx, cy, 12, cx, cy, maxRadius + 90);
  gradient.addColorStop(0, "rgba(216,255,98,0.09)");
  gradient.addColorStop(1, "rgba(216,255,98,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  shells.forEach((count, shellIndex) => {
    const radius = shellGap * (shellIndex + 1);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.7;
    ctx.stroke();

    const electronRadius = clamp(10.5 - count * 0.08, 5.7, 9.5);

    for (let i = 0; i < count; i += 1) {
      const base = (Math.PI * 2 * i) / count - Math.PI / 2;
      const speed = 0.18 + shellIndex * 0.035;
      const direction = shellIndex % 2 === 0 ? 1 : -1;
      const angle = base + time * speed * direction;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      ctx.shadowBlur = electronRadius * 1.5;
      ctx.shadowColor = "#d8ff62";
      drawCircle(x, y, electronRadius, "#d8ff62", "#17221d", 1.6);
      ctx.shadowBlur = 0;
    }
  });

  const nucleusCount = state.protons + state.neutrons;
  const nucleusRadius = clamp(36 + Math.sqrt(nucleusCount) * 3.0, 42, 96);
  drawNucleus(cx, cy, nucleusCount, nucleusRadius);

  if (state.animate) {
    animationFrame = requestAnimationFrame(drawAtom);
  }
}

function renderAtomOnce() {
  drawAtom(performance.now());
}

function rerender({ restartAnimation = false } = {}) {
  syncControls();
  renderFacts();

  if (restartAnimation) animationStart = performance.now();
  if (!state.animate) renderAtomOnce();
}

function buildElementControls() {
  PERIODIC_TABLE.forEach((element) => {
    const option = document.createElement("option");
    option.value = String(element.atomicNumber);
    option.textContent = `${element.atomicNumber}. ${element.name} (${element.symbol})`;
    controls.elementSelect.append(option);

    const suggestion = document.createElement("option");
    suggestion.value = `${element.atomicNumber} · ${element.name} (${element.symbol})`;
    controls.elementOptions.append(suggestion);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "element-tile";
    tile.dataset.z = String(element.atomicNumber);
    tile.style.gridColumn = String(element.xpos);
    tile.style.gridRow = String(element.ypos);
    tile.title = `${element.atomicNumber}. ${element.name}`;
    tile.setAttribute("aria-label", `${element.name}, Ordnungszahl ${element.atomicNumber}`);
    tile.innerHTML = `
      <small>${element.atomicNumber}</small>
      <strong>${element.symbol}</strong>
      <span>${element.name}</span>
    `;
    tile.addEventListener("click", () => setElement(element.atomicNumber));
    controls.periodicTable.append(tile);
  });
}

function findElement(query) {
  const cleaned = query.trim();
  if (!cleaned) return null;

  const leadingNumber = cleaned.match(/^\d{1,3}/);
  if (leadingNumber) {
    const atomicNumber = Number(leadingNumber[0]);
    if (atomicNumber >= 1 && atomicNumber <= 118) return getElement(atomicNumber);
  }

  const normalized = cleaned.toLocaleLowerCase("de-CH").replace(/[^a-zäöüß]/g, "");
  if (!normalized) return null;

  return (
    PERIODIC_TABLE.find((element) => element.symbol.toLowerCase() === normalized) ||
    PERIODIC_TABLE.find((element) => element.name.toLocaleLowerCase("de-CH") === normalized) ||
    PERIODIC_TABLE.find((element) => element.englishName.toLowerCase() === normalized) ||
    PERIODIC_TABLE.find((element) => element.name.toLocaleLowerCase("de-CH").startsWith(normalized)) ||
    PERIODIC_TABLE.find((element) => element.englishName.toLowerCase().startsWith(normalized)) ||
    null
  );
}

function searchAndSelect() {
  const element = findElement(controls.elementSearch.value);
  if (!element) {
    controls.elementSearch.setCustomValidity("Element nicht gefunden.");
    controls.elementSearch.reportValidity();
    return;
  }

  controls.elementSearch.setCustomValidity("");
  controls.elementSearch.value = `${element.atomicNumber} · ${element.name} (${element.symbol})`;
  setElement(element.atomicNumber);
}

buildElementControls();

controls.protons.addEventListener("input", () => setParticle("protons", controls.protons.value));
controls.neutrons.addEventListener("input", () => setParticle("neutrons", controls.neutrons.value));
controls.electrons.addEventListener("input", () => setParticle("electrons", controls.electrons.value));

controls.protonNumber.addEventListener("change", () => setParticle("protons", controls.protonNumber.value));
controls.neutronNumber.addEventListener("change", () => setParticle("neutrons", controls.neutronNumber.value));
controls.electronNumber.addEventListener("change", () => setParticle("electrons", controls.electronNumber.value));

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.step;
    setParticle(key, state[key] + Number(button.dataset.delta));
  });
});

controls.elementSelect.addEventListener("change", () => {
  setElement(Number(controls.elementSelect.value));
});

controls.searchButton.addEventListener("click", searchAndSelect);
controls.elementSearch.addEventListener("change", () => {
  if (controls.elementSearch.value) searchAndSelect();
});
controls.elementSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchAndSelect();
  }
});
controls.elementSearch.addEventListener("input", () => {
  controls.elementSearch.setCustomValidity("");
});

document.querySelector("#make-neutral").addEventListener("click", () => {
  state.electrons = state.protons;
  rerender();
});

document.querySelector("#reference-isotope").addEventListener("click", () => {
  const element = getElement();
  state.neutrons = clamp(referenceMassNumber(element) - element.atomicNumber, ...LIMITS.neutrons);
  rerender();
});

controls.animationButton.addEventListener("click", () => {
  state.animate = !state.animate;
  controls.animationButton.textContent = state.animate ? "Animation pausieren" : "Animation starten";

  if (state.animate) {
    animationStart = performance.now();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(drawAtom);
  } else {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    renderAtomOnce();
  }
});

rerender({ restartAnimation: true });
if (state.animate) animationFrame = requestAnimationFrame(drawAtom);
