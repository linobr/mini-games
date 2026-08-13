import Peer from "peerjs";
import "./color-clash.css";
import {
  COLORS,
  applyAction,
  canPlayCard,
  chooseBotAction,
  clientState,
  createGame,
  expireLastCall,
  faceOf,
  replaceDisconnectedWithBot,
} from "./color-clash-engine.js";

const ROOM_PREFIX = "linobr-mini-games-color-clash-";
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TYPE_LABELS = {
  skip: "Pause",
  skipAll: "Alle Pause",
  reverse: "Wende",
  draw2: "+2",
  draw5: "+5",
  wild: "Prisma",
  wildDraw: "Prisma +3",
  flip: "Flip",
};
const TYPE_SYMBOLS = {
  skip: "⊘",
  skipAll: "✦",
  reverse: "↻",
  draw2: "+2",
  draw5: "+5",
  wild: "◇",
  wildDraw: "+3",
  flip: "⇄",
};

const normalizeRoomCode = (value) =>
  value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join("");
}

function makeId(prefix = "player") {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `${prefix}-${values[0].toString(36)}${values[1].toString(36)}`;
}

function sanitizeName(value, fallback = "Spieler") {
  const name = String(value ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 18);
  return name || fallback;
}

function buildMarkup() {
  return `
    <section class="cc-setup-view view hidden" id="cc-setup-view">
      <button class="back-link" id="cc-setup-back">← Alle Spiele</button>
      <div class="cc-setup-shell">
        <div class="cc-setup-intro">
          <span class="cc-kicker">Color Clash Flip</span>
          <h1>Zwei Seiten.<br>Ein letzter Zug.</h1>
          <p>Spiele passende Farben, Zahlen oder Zeichen – und drehe mit Flip die komplette Runde auf ihre dunkle Seite.</p>
          <div class="cc-mini-cards" aria-hidden="true"><i>7</i><i>⇄</i><i>+5</i></div>
        </div>
        <div class="cc-setup-panel">
          <label class="cc-field"><span>Dein Name</span><input id="cc-player-name" maxlength="18" autocomplete="nickname" placeholder="Spieler"></label>
          <label class="cc-field"><span>Bot-Stufe</span><select id="cc-difficulty"><option value="normal">Normal – taktisch</option><option value="easy">Einfach – entspannt</option></select></label>
          <div class="cc-mode-list">
            <button class="cc-mode-button cc-mode-primary" id="cc-start-solo"><span><strong>Solo gegen Bots</strong><small>Offline spielbar · 1–3 Bots</small></span><b>→</b></button>
            <label class="cc-inline-select"><span>Anzahl Bots</span><select id="cc-bot-count"><option value="1">1 Bot</option><option value="2" selected>2 Bots</option><option value="3">3 Bots</option></select></label>
            <button class="cc-mode-button" id="cc-create-room"><span><strong>Online-Raum erstellen</strong><small>Freunde und Bots mischen</small></span><b>→</b></button>
            <div class="cc-join-box"><span><strong>Online beitreten</strong><small>Sechsstelligen Raumcode eingeben</small></span><div><input id="cc-room-input" maxlength="6" autocomplete="off" placeholder="ABC123" aria-label="Raumcode"><button id="cc-join-room" aria-label="Beitreten">→</button></div></div>
            <button class="cc-mode-button" id="cc-start-pass"><span><strong>Pass &amp; Play</strong><small>2–4 Personen an einem Gerät</small></span><b>→</b></button>
            <label class="cc-inline-select"><span>Personen</span><select id="cc-pass-count"><option value="2">2 Personen</option><option value="3">3 Personen</option><option value="4">4 Personen</option></select></label>
          </div>
          <p class="cc-notice hidden" id="cc-setup-notice" role="alert"></p>
        </div>
      </div>
    </section>

    <section class="cc-lobby-view view hidden" id="cc-lobby-view">
      <div class="cc-toolbar"><button class="cc-back" id="cc-leave-lobby">← Raum verlassen</button><div class="cc-room-chip"><span>Raum</span><strong id="cc-lobby-code"></strong><button id="cc-share-lobby">Link kopieren</button></div></div>
      <div class="cc-lobby-shell">
        <div><span class="cc-kicker">Online-Lobby</span><h1>Team zusammenstellen.</h1><p id="cc-lobby-status">Raum wird geöffnet …</p></div>
        <div class="cc-lobby-panel">
          <div class="cc-lobby-head"><strong>Teilnehmer</strong><span id="cc-player-count">1 / 4</span></div>
          <div id="cc-player-list" class="cc-player-list"></div>
          <div class="cc-bot-tools hidden" id="cc-bot-tools"><select id="cc-lobby-difficulty"><option value="normal">Bot: Normal</option><option value="easy">Bot: Einfach</option></select><button id="cc-add-bot">+ Bot hinzufügen</button></div>
          <p class="cc-notice hidden" id="cc-lobby-notice" role="alert"></p>
          <button class="cc-start-button" id="cc-start-game" disabled>Runde starten <span>→</span></button>
          <small class="cc-lobby-hint" id="cc-lobby-hint">Mindestens zwei Teilnehmer werden benötigt.</small>
        </div>
      </div>
    </section>

    <section class="cc-game-view view hidden" id="cc-game-view">
      <div class="cc-toolbar cc-game-toolbar"><button class="cc-back" id="cc-leave-game">← Spiel verlassen</button><div class="cc-round-meta"><span id="cc-side-label">Helle Seite</span><strong id="cc-turn-label">Runde 1</strong></div><button class="cc-sound" id="cc-sound" aria-label="Ton umschalten">Ton an</button></div>
      <div class="cc-table" id="cc-table">
        <div class="cc-opponents" id="cc-opponents"></div>
        <div class="cc-center">
          <div class="cc-direction" id="cc-direction">↻ Spielrichtung</div>
          <button class="cc-stack cc-draw-stack" id="cc-draw-stack" aria-label="Karte ziehen"><span id="cc-draw-count">0</span><small>Ziehen</small></button>
          <div class="cc-discard" id="cc-discard"></div>
          <div class="cc-color-indicator" id="cc-active-color"><i></i><span>Aktive Farbe</span></div>
        </div>
        <p class="cc-status" id="cc-status" aria-live="polite"></p>
        <div class="cc-action-row"><button class="cc-last-button hidden" id="cc-last-card">Letzte Karte! <span id="cc-last-countdown">3.0</span></button><button class="cc-pass-button hidden" id="cc-pass">Zug beenden</button><button class="cc-play-button" id="cc-play" disabled>Karte spielen</button></div>
        <div class="cc-hand-wrap"><div class="cc-hand" id="cc-hand" aria-label="Deine Handkarten"></div></div>
        <p class="cc-notice cc-game-notice hidden" id="cc-game-notice" role="alert"></p>
      </div>
      <div class="cc-overlay hidden" id="cc-color-overlay" role="dialog" aria-modal="true"><div><span class="cc-kicker">Prisma-Karte</span><h2>Wähle eine Farbe</h2><div class="cc-color-grid" id="cc-color-grid"></div><button class="cc-overlay-cancel" id="cc-color-cancel">Abbrechen</button></div></div>
      <div class="cc-overlay hidden" id="cc-privacy-overlay"><div><span class="cc-kicker">Sichtschutz</span><h2 id="cc-privacy-title">Weitergeben</h2><p>Gib das Gerät weiter. Erst danach werden die Handkarten sichtbar.</p><button class="cc-reveal-button" id="cc-reveal">Karten anzeigen</button></div></div>
      <div class="cc-overlay hidden" id="cc-result-overlay"><div><span class="cc-kicker">Rundenergebnis</span><h2 id="cc-result-title">Gewonnen!</h2><p id="cc-result-copy"></p><button class="cc-reveal-button" id="cc-new-round">Neue Runde</button><button class="cc-overlay-cancel" id="cc-result-home">Zur Spieleauswahl</button></div></div>
    </section>`;
}

class ClashAudio {
  constructor(muted) {
    this.muted = muted;
    this.context = null;
  }

  unlock() {
    if (this.muted) return;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.context = new AudioContext();
    }
    this.context?.resume();
  }

  play(type) {
    if (this.muted || !this.context || this.context.state !== "running") return;
    const notes = { play: [260, 420], draw: [180, 140], flip: [220, 720], penalty: [110, 70], win: [360, 760] }[type];
    if (!notes) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type === "penalty" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(notes[0], now);
    oscillator.frequency.exponentialRampToValueAtTime(notes[1], now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.24);
  }
}

export function createColorClash({ showView, onReturnHome }) {
  return new ColorClash({ showView, onReturnHome });
}

class ColorClash {
  constructor({ showView, onReturnHome }) {
    this.showView = showView;
    this.onReturnHome = onReturnHome;
    const footer = document.querySelector("footer");
    footer.insertAdjacentHTML("beforebegin", buildMarkup());
    this.elements = Object.fromEntries(
      [
        "setup-view", "lobby-view", "game-view", "setup-back", "player-name", "difficulty",
        "bot-count", "start-solo", "create-room", "room-input", "join-room", "start-pass",
        "pass-count", "setup-notice", "leave-lobby", "lobby-code", "share-lobby", "lobby-status",
        "player-count", "player-list", "bot-tools", "lobby-difficulty", "add-bot", "lobby-notice",
        "start-game", "lobby-hint", "leave-game", "side-label", "turn-label", "sound", "table",
        "opponents", "direction", "draw-stack", "draw-count", "discard", "active-color", "status",
        "last-card", "last-countdown", "pass", "play", "hand", "game-notice", "color-overlay",
        "color-grid", "color-cancel", "privacy-overlay", "privacy-title", "reveal", "result-overlay",
        "result-title", "result-copy", "new-round", "result-home",
      ].map((id) => [id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), document.querySelector(`#cc-${id}`)]),
    );

    this.peer = null;
    this.hostConnection = null;
    this.connections = new Map();
    this.connectionPlayers = new Map();
    this.participants = [];
    this.fullState = null;
    this.remoteState = null;
    this.localId = null;
    this.roomCode = "";
    this.mode = null;
    this.isHost = false;
    this.clientSequence = 0;
    this.lastSequences = new Map();
    this.selectedCardId = null;
    this.pendingWildCardId = null;
    this.botTimer = null;
    this.lastCardTimer = null;
    this.tickTimer = null;
    this.connectionTimer = null;
    this.passCovered = false;
    this.lastRenderedEvent = -1;
    this.difficulty = localStorage.getItem("color-clash-difficulty") === "easy" ? "easy" : "normal";
    this.muted = localStorage.getItem("color-clash-muted") === "true";
    this.audio = new ClashAudio(this.muted);
    this.elements.difficulty.value = this.difficulty;
    this.elements.lobbyDifficulty.value = this.difficulty;
    this.bindEvents();
    this.renderSound();
  }

  bindEvents() {
    const e = this.elements;
    e.setupBack.addEventListener("click", () => this.returnHome());
    e.startSolo.addEventListener("click", () => this.startSolo());
    e.createRoom.addEventListener("click", () => this.createRoom());
    e.joinRoom.addEventListener("click", () => this.joinRoom());
    e.startPass.addEventListener("click", () => this.startPassAndPlay());
    e.leaveLobby.addEventListener("click", () => this.openSetup());
    e.leaveGame.addEventListener("click", () => this.openSetup());
    e.shareLobby.addEventListener("click", () => this.shareRoom());
    e.addBot.addEventListener("click", () => this.addBot());
    e.startGame.addEventListener("click", () => this.startOnlineGame());
    e.drawStack.addEventListener("click", () => this.requestAction({ type: "draw" }));
    e.pass.addEventListener("click", () => this.requestAction({ type: "pass" }));
    e.play.addEventListener("click", () => this.playSelected());
    e.lastCard.addEventListener("click", () => this.requestAction({ type: "call-last" }));
    e.colorCancel.addEventListener("click", () => this.closeColorChoice());
    e.reveal.addEventListener("click", () => this.revealPassHand());
    e.newRound.addEventListener("click", () => this.newRound());
    e.resultHome.addEventListener("click", () => this.returnHome());
    e.sound.addEventListener("click", () => this.toggleSound());
    e.hand.addEventListener("click", (event) => this.selectCard(event));
    e.playerList.addEventListener("click", (event) => this.removeBot(event));
    e.opponents.addEventListener("click", (event) => this.replacePlayer(event));
    e.roomInput.addEventListener("input", () => {
      e.roomInput.value = normalizeRoomCode(e.roomInput.value);
      this.notice(e.setupNotice, "");
    });
    e.roomInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.joinRoom();
    });
    e.difficulty.addEventListener("change", () => this.saveDifficulty(e.difficulty.value));
    e.lobbyDifficulty.addEventListener("change", () => this.saveDifficulty(e.lobbyDifficulty.value));
    e.colorGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-color]");
      if (button) this.finishWild(button.dataset.color);
    });
    COLORS.forEach((color) => {
      const button = document.createElement("button");
      button.dataset.color = color;
      button.className = `cc-color-choice cc-${color}`;
      button.setAttribute("aria-label", color);
      e.colorGrid.append(button);
    });
  }

  saveDifficulty(value) {
    this.difficulty = value === "easy" ? "easy" : "normal";
    this.elements.difficulty.value = this.difficulty;
    this.elements.lobbyDifficulty.value = this.difficulty;
    localStorage.setItem("color-clash-difficulty", this.difficulty);
  }

  rememberName() {
    const name = sanitizeName(this.elements.playerName.value, "Spieler");
    this.elements.playerName.value = name;
    return name;
  }

  notice(target, message) {
    target.textContent = message;
    target.classList.toggle("hidden", !message);
  }

  setRoomUrl(code = "") {
    const url = new URL(window.location.href);
    if (code) {
      url.searchParams.set("game", "color-clash");
      url.searchParams.set("room", code);
    } else if (url.searchParams.get("game") === "color-clash") {
      url.searchParams.delete("game");
      url.searchParams.delete("room");
    }
    history.replaceState({}, "", url);
  }

  openSetup(invitedCode = "") {
    this.closeSession();
    this.notice(this.elements.setupNotice, "");
    this.elements.roomInput.value = normalizeRoomCode(invitedCode);
    this.showView(this.elements.setupView);
  }

  returnHome() {
    this.closeSession();
    this.onReturnHome();
  }

  closeSession({ notify = true } = {}) {
    if (notify && this.isHost) {
      this.connections.forEach((connection) => {
        if (connection.open) connection.send({ type: "host-ended" });
      });
    }
    window.clearTimeout(this.botTimer);
    window.clearTimeout(this.lastCardTimer);
    window.clearInterval(this.tickTimer);
    window.clearTimeout(this.connectionTimer);
    this.hostConnection?.close();
    this.connections.forEach((connection) => connection.close());
    this.peer?.destroy();
    this.peer = null;
    this.hostConnection = null;
    this.connections.clear();
    this.connectionPlayers.clear();
    this.participants = [];
    this.fullState = null;
    this.remoteState = null;
    this.roomCode = "";
    this.mode = null;
    this.isHost = false;
    this.selectedCardId = null;
    this.passCovered = false;
    document.body.classList.remove("cc-playing");
    this.setRoomUrl();
  }

  startSolo() {
    this.closeSession({ notify: false });
    const botCount = Number(this.elements.botCount.value);
    const human = { id: makeId(), name: this.rememberName(), isBot: false, connected: true };
    this.localId = human.id;
    this.mode = "solo";
    this.isHost = true;
    this.participants = [human, ...Array.from({ length: botCount }, (_, index) => ({
      id: makeId("bot"), name: `Nova Bot ${index + 1}`, isBot: true,
      difficulty: this.difficulty, connected: true,
    }))];
    this.beginGame();
  }

  startPassAndPlay() {
    this.closeSession({ notify: false });
    const count = Number(this.elements.passCount.value);
    const firstName = this.rememberName();
    this.participants = Array.from({ length: count }, (_, index) => ({
      id: makeId(), name: index === 0 ? firstName : `Spieler ${index + 1}`, isBot: false, connected: true,
    }));
    this.mode = "pass";
    this.isHost = true;
    this.localId = this.participants[0].id;
    this.passCovered = true;
    this.beginGame();
  }

  beginGame(round = 1) {
    this.fullState = createGame(this.participants, { round });
    this.remoteState = null;
    this.selectedCardId = null;
    this.lastRenderedEvent = -1;
    document.body.classList.add("cc-playing");
    this.showView(this.elements.gameView);
    this.startTick();
    this.broadcastState();
    this.renderGame();
    this.scheduleBot();
  }

  createRoom() {
    this.closeSession({ notify: false });
    this.mode = "online";
    this.isHost = true;
    this.roomCode = makeRoomCode();
    this.localId = makeId();
    this.participants = [{ id: this.localId, name: this.rememberName(), isBot: false, connected: true }];
    this.setRoomUrl(this.roomCode);
    this.showView(this.elements.lobbyView);
    this.renderLobby("Raum wird vorbereitet …");
    this.peer = new Peer(`${ROOM_PREFIX}${this.roomCode}`);
    this.peer.on("open", () => this.renderLobby("Raum ist offen – teile den Code."));
    this.peer.on("connection", (connection) => this.bindIncoming(connection));
    this.peer.on("error", (error) => this.peerError(error, true));
  }

  joinRoom() {
    const code = normalizeRoomCode(this.elements.roomInput.value);
    this.elements.roomInput.value = code;
    if (code.length !== 6) {
      this.notice(this.elements.setupNotice, "Bitte gib einen vollständigen sechsstelligen Raumcode ein.");
      return;
    }
    this.closeSession({ notify: false });
    this.mode = "online";
    this.isHost = false;
    this.roomCode = code;
    this.setRoomUrl(code);
    this.showView(this.elements.lobbyView);
    this.renderLobby("Verbindung wird aufgebaut …");
    this.peer = new Peer();
    this.connectionTimer = window.setTimeout(() => {
      this.notice(this.elements.lobbyNotice, "Die Verbindung dauert zu lange. Prüfe den Code oder versuche es erneut.");
    }, 15000);
    this.peer.on("open", () => {
      this.hostConnection = this.peer.connect(`${ROOM_PREFIX}${code}`, { reliable: true });
      this.bindHostConnection();
    });
    this.peer.on("error", (error) => this.peerError(error, false));
  }

  bindIncoming(connection) {
    connection.on("data", (message) => this.handleHostMessage(connection, message));
    connection.on("close", () => this.handleGuestDisconnect(connection));
    connection.on("error", () => this.handleGuestDisconnect(connection));
  }

  bindHostConnection() {
    const connection = this.hostConnection;
    connection.on("open", () => {
      window.clearTimeout(this.connectionTimer);
      connection.send({ type: "join", name: this.rememberName() });
    });
    connection.on("data", (message) => this.handleClientMessage(message));
    connection.on("close", () => this.hostEnded());
    connection.on("error", () => this.hostEnded());
  }

  handleHostMessage(connection, message) {
    if (!message || typeof message !== "object") return;
    let playerId = this.connectionPlayers.get(connection.peer);
    if (message.type === "join" && !playerId) {
      if (this.fullState || this.participants.length >= 4) {
        connection.send({ type: "rejected", reason: this.fullState ? "Die Runde läuft bereits." : "Der Raum ist voll." });
        window.setTimeout(() => connection.close(), 100);
        return;
      }
      playerId = makeId();
      this.connectionPlayers.set(connection.peer, playerId);
      this.connections.set(playerId, connection);
      this.participants.push({ id: playerId, name: sanitizeName(message.name, "Gast"), isBot: false, connected: true });
      connection.send({ type: "joined", playerId, roomCode: this.roomCode });
      this.broadcastLobby();
      return;
    }
    if (!playerId || message.type !== "action" || !this.fullState) return;
    const sequence = Number(message.sequence);
    if (!Number.isInteger(sequence) || sequence <= (this.lastSequences.get(playerId) ?? 0)) return;
    this.lastSequences.set(playerId, sequence);
    this.authoritativeAction(playerId, message.action);
  }

  handleClientMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "joined") {
      this.localId = message.playerId;
      return;
    }
    if (message.type === "lobby") {
      this.participants = message.participants;
      this.renderLobby("Mit dem Host verbunden.");
      return;
    }
    if (message.type === "state") {
      this.remoteState = message.state;
      document.body.classList.add("cc-playing");
      this.showView(this.elements.gameView);
      this.startTick();
      this.renderGame();
      return;
    }
    if (message.type === "rejected") {
      this.notice(this.elements.lobbyNotice, message.reason || "Beitritt nicht möglich.");
      return;
    }
    if (message.type === "host-ended") this.hostEnded();
  }

  peerError(error, hosting) {
    window.clearTimeout(this.connectionTimer);
    const missing = !hosting && error?.type === "peer-unavailable";
    this.notice(
      this.fullState ? this.elements.gameNotice : this.elements.lobbyNotice,
      missing ? "Raum nicht gefunden. Prüfe den Code." : "Die Peer-to-Peer-Verbindung konnte nicht aufgebaut werden.",
    );
  }

  hostEnded() {
    window.clearTimeout(this.connectionTimer);
    this.notice(this.elements.gameView.classList.contains("hidden") ? this.elements.lobbyNotice : this.elements.gameNotice, "Der Host hat den Raum beendet. Erstellt bitte einen neuen Raum.");
    this.elements.status.textContent = "Host-Verbindung beendet";
    this.hostConnection = null;
  }

  handleGuestDisconnect(connection) {
    const playerId = this.connectionPlayers.get(connection.peer);
    if (!playerId) return;
    this.connectionPlayers.delete(connection.peer);
    this.connections.delete(playerId);
    if (!this.fullState) {
      this.participants = this.participants.filter((player) => player.id !== playerId);
      this.broadcastLobby();
      return;
    }
    const player = this.fullState.players.find((entry) => entry.id === playerId);
    if (player) player.connected = false;
    this.broadcastState();
    this.renderGame();
  }

  broadcastLobby() {
    const data = { type: "lobby", participants: this.participants };
    this.connections.forEach((connection) => {
      if (connection.open) connection.send(data);
    });
    this.renderLobby("Raum ist offen – teile den Code.");
  }

  addBot() {
    if (!this.isHost || this.fullState || this.participants.length >= 4) return;
    this.saveDifficulty(this.elements.lobbyDifficulty.value);
    const number = this.participants.filter((player) => player.isBot).length + 1;
    this.participants.push({ id: makeId("bot"), name: `Nova Bot ${number}`, isBot: true, difficulty: this.difficulty, connected: true });
    this.broadcastLobby();
  }

  removeBot(event) {
    const button = event.target.closest("[data-remove-bot]");
    if (!button || !this.isHost || this.fullState) return;
    this.participants = this.participants.filter((player) => player.id !== button.dataset.removeBot);
    this.broadcastLobby();
  }

  replacePlayer(event) {
    const button = event.target.closest("[data-replace-player]");
    if (!button || !this.isHost || !this.fullState) return;
    const result = replaceDisconnectedWithBot(this.fullState, button.dataset.replacePlayer, this.difficulty);
    if (result.changed) {
      this.fullState = result.state;
      this.broadcastState();
      this.renderGame();
      this.scheduleBot();
    }
  }

  startOnlineGame() {
    if (!this.isHost || this.participants.length < 2 || this.participants.length > 4) return;
    this.beginGame();
  }

  renderLobby(status) {
    const e = this.elements;
    e.lobbyCode.textContent = this.roomCode || "––––––";
    e.lobbyStatus.textContent = status;
    e.playerCount.textContent = `${this.participants.length} / 4`;
    e.playerList.replaceChildren();
    this.participants.forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "cc-player-row";
      const badge = document.createElement("i");
      badge.textContent = String(index + 1);
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = player.name;
      const meta = document.createElement("small");
      meta.textContent = player.id === this.localId ? "Du" : player.isBot ? `Bot · ${player.difficulty === "easy" ? "Einfach" : "Normal"}` : "Online";
      copy.append(name, meta);
      row.append(badge, copy);
      if (this.isHost && player.isBot) {
        const remove = document.createElement("button");
        remove.dataset.removeBot = player.id;
        remove.textContent = "Entfernen";
        row.append(remove);
      }
      e.playerList.append(row);
    });
    e.botTools.classList.toggle("hidden", !this.isHost);
    e.addBot.disabled = this.participants.length >= 4;
    e.startGame.classList.toggle("hidden", !this.isHost);
    e.startGame.disabled = !this.isHost || this.participants.length < 2;
    e.lobbyHint.textContent = this.isHost
      ? this.participants.length < 2 ? "Mindestens zwei Teilnehmer werden benötigt." : "Bereit – du kannst die Runde starten."
      : "Der Host startet die Runde.";
  }

  async shareRoom() {
    const url = new URL(window.location.href);
    url.searchParams.set("game", "color-clash");
    url.searchParams.set("room", this.roomCode);
    const text = `Spiel Color Clash Flip mit mir. Raumcode: ${this.roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Color Clash Flip", text, url: url.toString() });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      this.elements.shareLobby.textContent = "Kopiert";
      window.setTimeout(() => { this.elements.shareLobby.textContent = "Link kopieren"; }, 1600);
    } catch {
      this.notice(this.elements.lobbyNotice, `Teile den Code ${this.roomCode}.`);
    }
  }

  getViewState() {
    if (!this.isHost && this.mode === "online") return this.remoteState;
    if (!this.fullState) return null;
    const viewerId = this.mode === "pass" ? this.fullState.players[this.fullState.turnIndex].id : this.localId;
    return clientState(this.fullState, viewerId);
  }

  requestAction(action) {
    this.audio.unlock();
    if (this.mode === "pass" && this.passCovered) return;
    if (!this.isHost && this.mode === "online") {
      if (!this.hostConnection?.open) {
        this.notice(this.elements.gameNotice, "Keine Verbindung zum Host.");
        return;
      }
      this.clientSequence += 1;
      this.hostConnection.send({ type: "action", sequence: this.clientSequence, action });
      return;
    }
    const playerId = this.mode === "pass" ? this.fullState?.players[this.fullState.turnIndex]?.id : this.localId;
    this.authoritativeAction(playerId, action);
  }

  authoritativeAction(playerId, action) {
    if (!this.fullState) return;
    const previousTurn = this.fullState.players[this.fullState.turnIndex]?.id;
    const result = applyAction(this.fullState, playerId, action);
    if (!result.ok) {
      if (playerId === this.localId || this.mode === "pass") this.notice(this.elements.gameNotice, result.reason);
      return;
    }
    this.notice(this.elements.gameNotice, "");
    this.fullState = result.state;
    this.selectedCardId = null;
    this.afterStateChange(previousTurn);
  }

  afterStateChange(previousTurn) {
    const nextTurn = this.fullState.players[this.fullState.turnIndex]?.id;
    if (this.mode === "pass" && previousTurn !== nextTurn && !this.fullState.winnerId) {
      this.passCovered = true;
      this.localId = nextTurn;
    }
    this.handleBotLastCall();
    this.broadcastState();
    this.renderGame();
    this.scheduleBot();
  }

  broadcastState() {
    if (!this.fullState) return;
    if (this.mode === "online" && this.isHost) {
      this.connections.forEach((connection, playerId) => {
        if (connection.open) connection.send({ type: "state", state: clientState(this.fullState, playerId) });
      });
    }
  }

  handleBotLastCall() {
    window.clearTimeout(this.lastCardTimer);
    const pending = this.fullState?.pendingLastCall;
    if (!pending || pending.called) return;
    const player = this.fullState.players.find((entry) => entry.id === pending.playerId);
    if (!player?.isBot) return;
    if (player.difficulty === "easy" && Math.random() < 0.22) return;
    this.lastCardTimer = window.setTimeout(() => {
      this.authoritativeAction(player.id, { type: "call-last" });
    }, 350 + Math.random() * 900);
  }

  scheduleBot() {
    window.clearTimeout(this.botTimer);
    if (!this.isHost || !this.fullState || this.fullState.phase !== "playing") return;
    const player = this.fullState.players[this.fullState.turnIndex];
    if (!player?.isBot) return;
    this.botTimer = window.setTimeout(() => {
      const action = chooseBotAction(this.fullState, player.id);
      if (action) this.authoritativeAction(player.id, action);
    }, 520 + Math.random() * 850);
  }

  startTick() {
    window.clearInterval(this.tickTimer);
    this.tickTimer = window.setInterval(() => {
      if (this.isHost && this.fullState) {
        const expired = expireLastCall(this.fullState);
        if (expired.changed) {
          this.fullState = expired.state;
          this.broadcastState();
          this.renderGame();
          this.scheduleBot();
        }
      }
      this.renderCountdown();
    }, 100);
  }

  renderCountdown() {
    const state = this.getViewState();
    const pending = state?.pendingLastCall;
    if (!pending || pending.called) return;
    this.elements.lastCountdown.textContent = Math.max(0, (pending.deadline - Date.now()) / 1000).toFixed(1);
  }

  selectCard(event) {
    const button = event.target.closest("[data-card-id]");
    if (!button || button.disabled) return;
    const cardId = button.dataset.cardId;
    if (this.selectedCardId === cardId) {
      this.playSelected();
      return;
    }
    this.selectedCardId = cardId;
    this.renderGame();
  }

  playSelected() {
    const state = this.getViewState();
    const me = state?.players.find((player) => player.id === this.currentViewerId());
    const card = me?.hand?.find((entry) => entry.id === this.selectedCardId);
    if (!card) return;
    if (faceOf(card, state.side).color === "wild") {
      this.pendingWildCardId = card.id;
      this.elements.colorOverlay.classList.remove("hidden");
      return;
    }
    this.requestAction({ type: "play", cardId: card.id });
  }

  finishWild(color) {
    if (!this.pendingWildCardId || !COLORS.includes(color)) return;
    const cardId = this.pendingWildCardId;
    this.closeColorChoice();
    this.requestAction({ type: "play", cardId, color });
  }

  closeColorChoice() {
    this.pendingWildCardId = null;
    this.elements.colorOverlay.classList.add("hidden");
  }

  currentViewerId() {
    if (this.mode === "pass") return this.fullState?.players[this.fullState.turnIndex]?.id;
    return this.localId;
  }

  revealPassHand() {
    this.passCovered = false;
    this.renderGame();
  }

  newRound() {
    if (!this.isHost) return;
    const round = (this.fullState?.round ?? 0) + 1;
    this.passCovered = this.mode === "pass";
    this.beginGame(round);
  }

  toggleSound() {
    this.muted = !this.muted;
    this.audio.muted = this.muted;
    localStorage.setItem("color-clash-muted", String(this.muted));
    this.renderSound();
    if (!this.muted) this.audio.unlock();
  }

  renderSound() {
    this.elements.sound.textContent = this.muted ? "Ton aus" : "Ton an";
    this.elements.sound.classList.toggle("muted", this.muted);
  }

  cardElement(card, side, options = {}) {
    const face = faceOf(card, side);
    const button = document.createElement(options.button ? "button" : "div");
    button.className = `cc-card cc-card-${side} cc-card-${face.color}`;
    if (options.button) button.dataset.cardId = card.id;
    if (options.playable) button.classList.add("playable");
    if (options.selected) button.classList.add("selected");
    if (options.disabled) button.disabled = true;
    const corner = document.createElement("small");
    const symbol = face.type === "number" ? String(face.value) : TYPE_SYMBOLS[face.type];
    corner.textContent = symbol;
    const center = document.createElement("strong");
    center.textContent = symbol;
    const label = document.createElement("span");
    label.textContent = face.type === "number" ? "Color Clash" : TYPE_LABELS[face.type];
    button.append(corner, center, label);
    button.setAttribute("aria-label", `${face.color}, ${face.type === "number" ? face.value : TYPE_LABELS[face.type]}`);
    return button;
  }

  renderGame() {
    const state = this.getViewState();
    if (!state) return;
    const e = this.elements;
    const viewerId = this.currentViewerId();
    const me = state.players.find((player) => player.id === viewerId);
    const current = state.players[state.turnIndex];
    const myTurn = current?.id === viewerId && state.phase === "playing" && !(this.mode === "pass" && this.passCovered);
    const top = state.discardTop;
    const eventChanged = state.event?.id !== this.lastRenderedEvent;
    if (eventChanged) {
      this.lastRenderedEvent = state.event?.id;
      const sound = state.event?.type === "flip" ? "flip" : state.event?.type === "win" ? "win" : state.event?.penalty ? "penalty" : state.event?.type === "draw" ? "draw" : "play";
      this.audio.play(sound);
      e.table.classList.toggle("cc-flash", state.event?.type !== "play" && state.event?.type !== "draw");
      window.setTimeout(() => e.table.classList.remove("cc-flash"), 350);
    }
    e.gameView.dataset.side = state.side;
    e.sideLabel.textContent = state.side === "light" ? "Helle Seite" : "Dunkle Seite";
    e.turnLabel.textContent = `Runde ${state.round}`;
    e.direction.textContent = `${state.direction === 1 ? "↻" : "↺"} Spielrichtung`;
    e.drawCount.textContent = String(state.drawCount);
    e.drawStack.disabled = !myTurn || Boolean(state.drawnCardId);
    e.discard.replaceChildren(this.cardElement(top, state.side));
    e.activeColor.className = `cc-color-indicator cc-active-${state.activeColor || faceOf(top, state.side).color}`;
    e.status.textContent = state.winnerId
      ? "Runde beendet"
      : myTurn ? "Du bist am Zug" : `${current?.name ?? "Spieler"} ist am Zug`;

    e.opponents.replaceChildren();
    state.players.filter((player) => player.id !== viewerId).forEach((player) => {
      const item = document.createElement("div");
      item.className = `cc-opponent ${player.id === current?.id ? "active" : ""} ${player.connected === false ? "disconnected" : ""}`;
      const avatar = document.createElement("i");
      avatar.textContent = player.isBot ? "BOT" : player.name.slice(0, 1).toUpperCase();
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = player.name;
      const cards = document.createElement("small");
      cards.textContent = `${player.handCount} Karten${player.connected === false ? " · getrennt" : ""}`;
      copy.append(name, cards);
      item.append(avatar, copy);
      if (this.isHost && player.connected === false) {
        const replace = document.createElement("button");
        replace.dataset.replacePlayer = player.id;
        replace.textContent = "Bot übernehmen";
        item.append(replace);
      }
      e.opponents.append(item);
    });

    e.hand.replaceChildren();
    const playableIds = new Set(
      (me?.hand ?? []).filter((card) => myTurn && canPlayCard(card, top, state.side, state.activeColor) && (!state.drawnCardId || state.drawnCardId === card.id)).map((card) => card.id),
    );
    (me?.hand ?? []).forEach((card) => {
      e.hand.append(this.cardElement(card, state.side, {
        button: true,
        playable: playableIds.has(card.id),
        selected: this.selectedCardId === card.id,
        disabled: !playableIds.has(card.id),
      }));
    });
    const selectedPlayable = playableIds.has(this.selectedCardId);
    e.play.disabled = !selectedPlayable;
    e.pass.classList.toggle("hidden", !myTurn || !state.drawnCardId);
    e.lastCard.classList.toggle("hidden", !state.pendingLastCall || state.pendingLastCall.called);
    e.privacyOverlay.classList.toggle("hidden", this.mode !== "pass" || !this.passCovered || Boolean(state.winnerId));
    if (this.mode === "pass" && this.passCovered) e.privacyTitle.textContent = `${current?.name}, du bist dran`;
    e.resultOverlay.classList.toggle("hidden", !state.winnerId);
    if (state.winnerId) {
      const winner = state.players.find((player) => player.id === state.winnerId);
      e.resultTitle.textContent = winner?.id === viewerId ? "Du gewinnst!" : `${winner?.name ?? "Spieler"} gewinnt!`;
      e.resultCopy.textContent = `Runde ${state.round} ist entschieden. Bereit für die Revanche?`;
      e.newRound.classList.toggle("hidden", !this.isHost);
    }
    this.renderCountdown();
  }
}
