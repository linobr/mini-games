export const SIDES = ["light", "dark"];
export const COLORS = ["coral", "aqua", "lime", "violet"];
export const LAST_CARD_SECONDS = 3;

const LIGHT_ACTIONS = ["skip", "reverse", "draw2", "flip"];
const DARK_ACTIONS = ["skipAll", "reverse", "draw5", "flip"];

const clone = (value) => JSON.parse(JSON.stringify(value));

export function fisherYates(items, random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function coloredFaces(side, actions) {
  const faces = [];
  COLORS.forEach((color) => {
    faces.push({ side, color, type: "number", value: 0 });
    for (let value = 1; value <= 9; value += 1) {
      faces.push({ side, color, type: "number", value });
      faces.push({ side, color, type: "number", value });
    }
    actions.forEach((type) => {
      faces.push({ side, color, type, value: null });
      faces.push({ side, color, type, value: null });
    });
  });
  return faces;
}

export function createDeck(random = Math.random) {
  const lightFaces = coloredFaces("light", LIGHT_ACTIONS);
  lightFaces.push(
    ...Array.from({ length: 4 }, () => ({
      side: "light",
      color: "wild",
      type: "wild",
      value: null,
    })),
  );

  const darkFaces = coloredFaces("dark", DARK_ACTIONS);
  darkFaces.push(
    ...Array.from({ length: 2 }, () => ({
      side: "dark",
      color: "wild",
      type: "wild",
      value: null,
    })),
    ...Array.from({ length: 2 }, () => ({
      side: "dark",
      color: "wild",
      type: "wildDraw",
      value: null,
    })),
  );

  const shuffledDark = fisherYates(darkFaces, random);
  return fisherYates(
    lightFaces.map((face, index) => ({
      id: `cc-${index + 1}`,
      light: face,
      dark: shuffledDark[index],
    })),
    random,
  );
}

export function faceOf(card, side) {
  return card?.[side] ?? null;
}

export function canPlayCard(card, topCard, side, activeColor = null) {
  const face = faceOf(card, side);
  const top = faceOf(topCard, side);
  if (!face || !top) return false;
  if (face.color === "wild") return true;
  const requiredColor = activeColor || top.color;
  if (face.color === requiredColor) return true;
  if (face.type === "number" && top.type === "number") {
    return face.value === top.value;
  }
  return face.type !== "number" && face.type === top.type;
}

function nextIndex(players, from, direction, steps = 1) {
  let current = from;
  let remaining = steps;
  while (remaining > 0) {
    current = (current + direction + players.length) % players.length;
    if (players[current].connected !== false || players[current].isBot) remaining -= 1;
  }
  return current;
}

function refillDrawPile(state, random) {
  if (state.drawPile.length || state.discardPile.length <= 1) return;
  const top = state.discardPile.pop();
  state.drawPile = fisherYates(state.discardPile, random);
  state.discardPile = [top];
}

export function drawCards(state, playerIndex, count, random = Math.random) {
  const drawn = [];
  for (let index = 0; index < count; index += 1) {
    refillDrawPile(state, random);
    const card = state.drawPile.pop();
    if (!card) break;
    state.players[playerIndex].hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

function initialTop(state, random) {
  let attempts = state.drawPile.length;
  while (attempts > 0) {
    const card = state.drawPile.pop();
    if (faceOf(card, state.side)?.type === "number") return card;
    state.drawPile.unshift(card);
    attempts -= 1;
  }
  return state.drawPile.pop();
}

export function createGame(participants, options = {}) {
  const random = options.random ?? Math.random;
  if (!Array.isArray(participants) || participants.length < 2 || participants.length > 4) {
    throw new Error("Color Clash benötigt zwei bis vier Teilnehmer.");
  }

  const state = {
    version: 1,
    phase: "playing",
    round: options.round ?? 1,
    side: "light",
    players: participants.map((player) => ({
      id: player.id,
      name: player.name,
      isBot: Boolean(player.isBot),
      difficulty: player.difficulty === "easy" ? "easy" : "normal",
      connected: player.connected !== false,
      hand: [],
    })),
    drawPile: createDeck(random),
    discardPile: [],
    turnIndex: 0,
    direction: 1,
    activeColor: null,
    drawnCardId: null,
    pendingLastCall: null,
    winnerId: null,
    eventId: 0,
    event: { id: 0, type: "deal" },
  };

  for (let card = 0; card < 7; card += 1) {
    state.players.forEach((_, playerIndex) => drawCards(state, playerIndex, 1, random));
  }
  state.discardPile.push(initialTop(state, random));
  return state;
}

function event(state, type, details = {}) {
  state.eventId += 1;
  state.event = { id: state.eventId, type, ...details };
}

function advance(state, steps = 1) {
  state.turnIndex = nextIndex(state.players, state.turnIndex, state.direction, steps);
  state.drawnCardId = null;
}

function removeCard(hand, cardId) {
  const index = hand.findIndex((card) => card.id === cardId);
  if (index < 0) return null;
  return hand.splice(index, 1)[0];
}

export function applyAction(sourceState, playerId, action, options = {}) {
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now();
  const state = clone(sourceState);
  if (state.phase !== "playing" || state.winnerId) return { ok: false, state: sourceState, reason: "Runde beendet" };

  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  if (playerIndex < 0) return { ok: false, state: sourceState, reason: "Spieler unbekannt" };

  if (action?.type === "call-last") {
    if (
      state.pendingLastCall?.playerId !== playerId ||
      state.pendingLastCall.called ||
      now > state.pendingLastCall.deadline
    ) {
      return { ok: false, state: sourceState, reason: "Kein aktiver Letzte-Karte-Ruf" };
    }
    state.pendingLastCall.called = true;
    event(state, "last-called", { playerId });
    return { ok: true, state };
  }

  if (state.pendingLastCall?.called) state.pendingLastCall = null;

  if (state.turnIndex !== playerIndex) return { ok: false, state: sourceState, reason: "Nicht dein Zug" };
  const player = state.players[playerIndex];
  const topCard = state.discardPile.at(-1);

  if (action?.type === "draw") {
    if (state.drawnCardId) return { ok: false, state: sourceState, reason: "Bereits gezogen" };
    const [card] = drawCards(state, playerIndex, 1, random);
    if (!card) {
      advance(state);
      event(state, "pass", { playerId });
      return { ok: true, state };
    }
    const playable = canPlayCard(card, topCard, state.side, state.activeColor);
    state.drawnCardId = playable ? card.id : null;
    event(state, "draw", { playerId, count: 1, playable });
    if (!playable) advance(state);
    return { ok: true, state };
  }

  if (action?.type === "pass") {
    if (!state.drawnCardId) return { ok: false, state: sourceState, reason: "Zuerst ziehen" };
    advance(state);
    event(state, "pass", { playerId });
    return { ok: true, state };
  }

  if (action?.type !== "play" || typeof action.cardId !== "string") {
    return { ok: false, state: sourceState, reason: "Ungültige Aktion" };
  }

  const selected = player.hand.find((card) => card.id === action.cardId);
  if (!selected) return { ok: false, state: sourceState, reason: "Karte nicht vorhanden" };
  if (state.drawnCardId && state.drawnCardId !== selected.id) {
    return { ok: false, state: sourceState, reason: "Nach dem Ziehen ist nur die neue Karte spielbar" };
  }
  if (!canPlayCard(selected, topCard, state.side, state.activeColor)) {
    return { ok: false, state: sourceState, reason: "Karte passt nicht" };
  }

  const face = faceOf(selected, state.side);
  const chosenColor = COLORS.includes(action.color) ? action.color : null;
  if (face.color === "wild" && !chosenColor) {
    return { ok: false, state: sourceState, reason: "Farbe wählen" };
  }

  removeCard(player.hand, selected.id);
  state.discardPile.push(selected);
  state.activeColor = face.color === "wild" ? chosenColor : null;
  state.drawnCardId = null;

  if (player.hand.length === 0) {
    state.phase = "ended";
    state.winnerId = playerId;
    state.pendingLastCall = null;
    event(state, "win", { playerId, cardId: selected.id });
    return { ok: true, state };
  }

  if (player.hand.length === 1) {
    state.pendingLastCall = {
      playerId,
      deadline: now + LAST_CARD_SECONDS * 1000,
      called: false,
    };
  }

  let steps = 1;
  let penalty = 0;
  let penaltyIndex = null;
  if (face.type === "reverse") {
    state.direction *= -1;
    if (state.players.length === 2) steps = 2;
  } else if (face.type === "skip") {
    steps = 2;
  } else if (face.type === "skipAll") {
    steps = state.players.filter((entry) => entry.connected !== false || entry.isBot).length;
  } else if (face.type === "draw2" || face.type === "draw5" || face.type === "wildDraw") {
    penalty = face.type === "draw2" ? 2 : face.type === "draw5" ? 5 : 3;
    penaltyIndex = nextIndex(state.players, playerIndex, state.direction);
    drawCards(state, penaltyIndex, penalty, random);
    steps = 2;
  } else if (face.type === "flip") {
    state.side = state.side === "light" ? "dark" : "light";
    state.activeColor = null;
  }

  advance(state, steps);
  event(state, face.type === "number" ? "play" : face.type, {
    playerId,
    cardId: selected.id,
    penalty,
    penaltyPlayerId: penaltyIndex === null ? null : state.players[penaltyIndex].id,
  });
  return { ok: true, state };
}

export function expireLastCall(sourceState, options = {}) {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  if (
    !sourceState.pendingLastCall ||
    sourceState.pendingLastCall.called ||
    now <= sourceState.pendingLastCall.deadline ||
    sourceState.phase !== "playing"
  ) {
    return { changed: false, state: sourceState };
  }
  const state = clone(sourceState);
  const playerIndex = state.players.findIndex(
    (player) => player.id === state.pendingLastCall.playerId,
  );
  if (playerIndex >= 0) drawCards(state, playerIndex, 2, random);
  const playerId = state.pendingLastCall.playerId;
  state.pendingLastCall = null;
  event(state, "last-penalty", { playerId, penalty: 2 });
  return { changed: true, state };
}

function colorCounts(hand, side) {
  return COLORS.reduce((counts, color) => {
    counts[color] = hand.filter((card) => faceOf(card, side)?.color === color).length;
    return counts;
  }, {});
}

export function chooseColor(hand, side, random = Math.random) {
  const counts = colorCounts(hand, side);
  const highest = Math.max(...Object.values(counts));
  const candidates = COLORS.filter((color) => counts[color] === highest);
  return candidates[Math.floor(random() * candidates.length)] ?? COLORS[0];
}

export function chooseBotAction(state, playerId, random = Math.random) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || state.players[state.turnIndex]?.id !== playerId) return null;
  const top = state.discardPile.at(-1);
  const playable = player.hand.filter((card) =>
    canPlayCard(card, top, state.side, state.activeColor),
  );

  if (state.drawnCardId) {
    const drawn = player.hand.find((card) => card.id === state.drawnCardId);
    if (!drawn) return { type: "pass" };
    return {
      type: "play",
      cardId: drawn.id,
      color: faceOf(drawn, state.side).color === "wild"
        ? chooseColor(player.hand, state.side, random)
        : undefined,
    };
  }
  if (!playable.length) return { type: "draw" };

  let selected;
  if (player.difficulty === "easy") {
    selected = playable[Math.floor(random() * playable.length)];
  } else {
    const lowestOpponentCount = Math.min(
      ...state.players.filter((entry) => entry.id !== playerId).map((entry) => entry.hand.length),
    );
    const scores = playable.map((card) => {
      const face = faceOf(card, state.side);
      let score = face.type === "number" ? 1 : 5;
      if (["draw2", "draw5", "wildDraw", "skip", "skipAll"].includes(face.type)) {
        score += lowestOpponentCount <= 3 ? 7 : 3;
      }
      if (face.type === "wild") score -= 2;
      score += (colorCounts(player.hand, state.side)[face.color] ?? 0) * 0.3;
      return { card, score: score + random() * 0.25 };
    });
    scores.sort((a, b) => b.score - a.score);
    selected = scores[0].card;
  }

  return {
    type: "play",
    cardId: selected.id,
    color: faceOf(selected, state.side).color === "wild"
      ? chooseColor(player.hand, state.side, random)
      : undefined,
  };
}

export function clientState(state, viewerId) {
  return {
    version: state.version,
    phase: state.phase,
    round: state.round,
    side: state.side,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      isBot: player.isBot,
      difficulty: player.isBot ? player.difficulty : undefined,
      connected: player.connected,
      handCount: player.hand.length,
      hand: player.id === viewerId ? clone(player.hand) : undefined,
    })),
    drawCount: state.drawPile.length,
    discardTop: clone(state.discardPile.at(-1)),
    turnIndex: state.turnIndex,
    direction: state.direction,
    activeColor: state.activeColor,
    drawnCardId: state.players[state.turnIndex]?.id === viewerId ? state.drawnCardId : null,
    pendingLastCall:
      state.pendingLastCall?.playerId === viewerId ? clone(state.pendingLastCall) : null,
    winnerId: state.winnerId,
    event: clone(state.event),
  };
}

export function replaceDisconnectedWithBot(sourceState, playerId, difficulty = "normal") {
  const state = clone(sourceState);
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.connected !== false) return { changed: false, state: sourceState };
  player.isBot = true;
  player.connected = true;
  player.difficulty = difficulty === "easy" ? "easy" : "normal";
  player.name = `${player.name} Bot`;
  event(state, "bot-replace", { playerId });
  return { changed: true, state };
}
