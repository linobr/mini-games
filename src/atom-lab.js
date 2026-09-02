const elementsData = [
  ["H", "Wasserstoff", 1, 1],
  ["He", "Helium", 2, 4],
  ["Li", "Lithium", 3, 7],
  ["Be", "Beryllium", 4, 9],
  ["B", "Bor", 5, 11],
  ["C", "Kohlenstoff", 6, 12],
  ["N", "Stickstoff", 7, 14],
  ["O", "Sauerstoff", 8, 16],
  ["F", "Fluor", 9, 19],
  ["Ne", "Neon", 10, 20],
  ["Na", "Natrium", 11, 23],
  ["Mg", "Magnesium", 12, 24],
  ["Al", "Aluminium", 13, 27],
  ["Si", "Silicium", 14, 28],
  ["P", "Phosphor", 15, 31],
  ["S", "Schwefel", 16, 32],
  ["Cl", "Chlor", 17, 35],
  ["Ar", "Argon", 18, 40],
  ["K", "Kalium", 19, 39],
  ["Ca", "Calcium", 20, 40],
].map(([symbol, name, atomicNumber, commonMass]) => ({
  symbol,
  name,
  atomicNumber,
  commonMass,
}));

const canvas = document.querySelector("#atom-canvas");
const ctx = canvas.getContext("2d");
const protonInput = document.querySelector("#protons");
const neutronInput = document.querySelector("#neutrons");
const electronInput = document.querySelector("#electrons");
const elementSelect = document.querySelector("#element-select");
const animationButton = document.querySelector("#toggle-animation");

const output = {
  title: document.querySelector("#atom-title"),
  protons: document.querySelector("#proton-value"),
  neutrons: document.querySelector("#neutron-value"),
  electrons: document.querySelector("#electron-value"),
  element: document.querySelector("#fact-element"),
  number: document.querySelector("#fact-number"),
  mass: document.querySelector("#fact-mass"),
  charge: document.querySelector("#fact-charge"),
  ion: document.querySelector("#fact-ion"),
  shells: document.querySelector("#fact-shells"),
  shellCount: document.querySelector("#fact-shell-count"),
};

let state = {
  protons: 6,
  neutrons: 6,
  electrons: 6,
  animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

let animationStart = performance.now();

function getElement(protons = state.protons) {
  return elementsData[protons - 1];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shellDistribution(electrons) {
  const capacities = [2, 8, 8, 2];
  const shells = [];
  let remaining = electrons;

  for (const capacity of capacities) {
    if (remaining <= 0) break;
    const count = Math.min(capacity, remaining);
    shells.push(count);
    remaining -= count;
  }

  return shells;
}

function syncControls() {
  protonInput.value = String(state.protons);
  neutronInput.value = String(state.neutrons);
  electronInput.value = String(state.electrons);
  output.protons.textContent = state.protons;
  output.neutrons.textContent = state.neutrons;
  output.electrons.textContent = state.electrons;
  elementSelect.value = String(state.protons);
}

function renderFacts() {
  const element = getElement();
  const mass = state.protons + state.neutrons;
  const charge = state.protons - state.electrons;
  const shells = shellDistribution(state.electrons);
  const isotopeName = `${element.name}-${mass}`;

  output.title.textContent = isotopeName;
  output.element.textContent = `${element.name} (${element.symbol})`;
  output.number.textContent = `Ordnungszahl ${element.atomicNumber}`;
  output.mass.textContent = String(mass);

  if (charge === 0) {
    output.charge.textContent = "0 · neutral";
  } else if (charge > 0) {
    output.charge.textContent = `+${charge} · Kation`;
  } else {
    output.charge.textContent = `${charge} · Anion`;
  }

  output.ion.textContent = `${state.protons} p⁺ und ${state.electrons} e⁻`;
  output.shells.textContent = shells.length ? shells.join(" · ") : "keine";
  output.shellCount.textContent =
    shells.length === 1 ? "1 besetzte Schale" : `${shells.length} besetzte Schalen`;
}

function particlePositions(count) {
  if (count === 1) return [{ x: 0, y: 0 }];
  const points = [];
  const spacing = 22;

  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.3999632297;
    const radius = spacing * Math.sqrt(i);
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  return points;
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

function drawAtom(now) {
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2 + 8;
  const shells = shellDistribution(state.electrons);
  const maxRadius = Math.min(width, height) * 0.4;
  const shellGap = shells.length > 1 ? maxRadius / shells.length : maxRadius * 0.72;
  const time = state.animate ? (now - animationStart) / 1000 : 0;

  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxRadius + 90);
  gradient.addColorStop(0, "rgba(216,255,98,0.08)");
  gradient.addColorStop(1, "rgba(216,255,98,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  shells.forEach((count, shellIndex) => {
    const radius = shellGap * (shellIndex + 1);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.19)";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < count; i += 1) {
      const base = (Math.PI * 2 * i) / count - Math.PI / 2;
      const speed = 0.28 + shellIndex * 0.08;
      const direction = shellIndex % 2 === 0 ? 1 : -1;
      const angle = base + time * speed * direction;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      ctx.shadowBlur = 18;
      ctx.shadowColor = "#d8ff62";
      drawCircle(x, y, 10, "#d8ff62", "#17221d", 2);
      ctx.shadowBlur = 0;
    }
  });

  const nucleusCount = state.protons + state.neutrons;
  const nucleusRadius = clamp(34 + nucleusCount * 1.5, 42, 82);
  drawCircle(cx, cy, nucleusRadius, "rgba(255,253,248,0.08)", "rgba(255,255,255,0.16)", 2);

  const positions = particlePositions(nucleusCount);
  const scale = nucleusCount > 24 ? 0.72 : nucleusCount > 14 ? 0.86 : 1;
  const particleRadius = 10 * scale;

  positions.forEach((point, index) => {
    const isProton = index < state.protons;
    const x = cx + point.x * scale;
    const y = cy + point.y * scale;
    drawCircle(
      x,
      y,
      particleRadius,
      isProton ? "#f25f5c" : "#5b7cfa",
      "rgba(255,255,255,0.38)",
      1,
    );
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 15px system-ui, sans-serif";
  const element = getElement();
  ctx.fillText(element.symbol, cx, cy + nucleusRadius + 24);

  if (state.animate) requestAnimationFrame(drawAtom);
}

function rerender({ restartAnimation = false } = {}) {
  syncControls();
  renderFacts();
  if (restartAnimation) animationStart = performance.now();
  if (!state.animate) drawAtom(performance.now());
}

function setParticle(key, value) {
  const limits = {
    protons: [1, 20],
    neutrons: [0, 24],
    electrons: [0, 20],
  };
  const [min, max] = limits[key];
  state[key] = clamp(Number(value), min, max);

  if (key === "protons") {
    neutronInput.max = "24";
  }

  rerender();
}

elementsData.forEach((element) => {
  const option = document.createElement("option");
  option.value = String(element.atomicNumber);
  option.textContent = `${element.atomicNumber}. ${element.name} (${element.symbol})`;
  elementSelect.append(option);
});

protonInput.addEventListener("input", () => setParticle("protons", protonInput.value));
neutronInput.addEventListener("input", () => setParticle("neutrons", neutronInput.value));
electronInput.addEventListener("input", () => setParticle("electrons", electronInput.value));

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.step;
    const delta = Number(button.dataset.delta);
    setParticle(key, state[key] + delta);
  });
});

elementSelect.addEventListener("change", () => {
  const protons = Number(elementSelect.value);
  const element = elementsData[protons - 1];
  state.protons = protons;
  state.neutrons = element.commonMass - protons;
  state.electrons = protons;
  rerender({ restartAnimation: true });
});

document.querySelector("#make-neutral").addEventListener("click", () => {
  state.electrons = state.protons;
  rerender();
});

document.querySelector("#common-isotope").addEventListener("click", () => {
  const element = getElement();
  state.neutrons = element.commonMass - element.atomicNumber;
  rerender();
});

animationButton.addEventListener("click", () => {
  state.animate = !state.animate;
  animationButton.textContent = state.animate ? "Animation pausieren" : "Animation starten";
  if (state.animate) {
    animationStart = performance.now();
    requestAnimationFrame(drawAtom);
  } else {
    drawAtom(performance.now());
  }
});

window.addEventListener("resize", () => {
  if (!state.animate) drawAtom(performance.now());
});

rerender({ restartAnimation: true });
requestAnimationFrame(drawAtom);
