import Peer from "peerjs";
import "./turbo-bump.css";

const ROOM_PREFIX = "linobr-mini-games-turbo-bump-";
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PLAYER_COLORS = ["#4df7c8", "#ff4f87", "#ffc857", "#718cff"];
const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 600;
const CENTER_X = WORLD_WIDTH / 2;
const CENTER_Y = WORLD_HEIGHT / 2;
const START_RADIUS = 248;
const MIN_RADIUS = 154;
const CAR_RADIUS = 22;
const FIXED_STEP = 1 / 60;
const STATE_INTERVAL = 1 / 20;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const deepCopy = (value) => JSON.parse(JSON.stringify(value));

function normalizeRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
}

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length],
  ).join("");
}

function sanitizeName(value) {
  const cleaned = value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 16);
  return cleaned || "Spieler";
}

function normalizeInput(value) {
  return {
    up: Boolean(value?.up),
    down: Boolean(value?.down),
    left: Boolean(value?.left),
    right: Boolean(value?.right),
    boost: Boolean(value?.boost),
  };
}

function shortestAngle(from, to) {
  let difference = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
}

function playerSpawn(index, total) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    x: CENTER_X + Math.cos(angle) * 98,
    y: CENTER_Y + Math.sin(angle) * 98,
    angle: angle + Math.PI,
  };
}

function makeWorld(players, round) {
  const worldPlayers = players.map((player, index) => {
    const spawn = playerSpawn(index, players.length);
    return {
      ...player,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      angle: spawn.angle,
      lives: 3,
      active: true,
      invulnerableUntil: 2.2,
      respawnAt: 0,
      boostCharges: 1,
      boostCooldownUntil: 0,
      boostingUntil: 0,
      boostHeld: false,
    };
  });

  return {
    phase: "playing",
    round,
    time: 0,
    arenaRadius: START_RADIUS,
    winnerId: null,
    players: worldPlayers,
    pickups: [
      { id: 0, x: CENTER_X, y: CENTER_Y, active: true, respawnAt: 0 },
      { id: 1, x: CENTER_X - 132, y: CENTER_Y + 62, active: true, respawnAt: 0 },
      { id: 2, x: CENTER_X + 132, y: CENTER_Y - 62, active: true, respawnAt: 0 },
    ],
    eventSequence: 0,
    events: [],
  };
}

function isWorldSnapshot(value) {
  return (
    value &&
    typeof value === "object" &&
    (value.phase === "playing" || value.phase === "ended") &&
    Number.isFinite(value.time) &&
    Number.isFinite(value.arenaRadius) &&
    Array.isArray(value.players) &&
    value.players.length >= 2 &&
    value.players.length <= 4 &&
    value.players.every(
      (player) =>
        typeof player.id === "string" &&
        typeof player.name === "string" &&
        Number.isFinite(player.x) &&
        Number.isFinite(player.y) &&
        Number.isInteger(player.lives),
    ) &&
    Array.isArray(value.pickups) &&
    Array.isArray(value.events)
  );
}

class TurboAudio {
  constructor() {
    this.context = null;
    this.lastSound = new Map();
  }

  unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.context = new AudioContext();
    }
    this.context?.resume();
  }

  play(type, intensity = 1) {
    if (!this.context || this.context.state !== "running") return;
    const now = this.context.currentTime;
    const minimumGap = type === "collision" ? 0.08 : 0.02;
    if (now - (this.lastSound.get(type) ?? 0) < minimumGap) return;
    this.lastSound.set(type, now);

    const settings = {
      boost: [130, 55, 0.12, "sawtooth"],
      collision: [95, 48, 0.09, "square"],
      pickup: [520, 880, 0.1, "sine"],
      fall: [180, 48, 0.35, "triangle"],
      win: [420, 760, 0.55, "triangle"],
    }[type];
    if (!settings) return;

    const [startFrequency, endFrequency, duration, wave] = settings;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.015, 0.055 * clamp(intensity, 0.25, 1.5)),
      now + 0.012,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

export function createTurboBump({ showView, onReturnHome }) {
  return new TurboBump({ showView, onReturnHome });
}

class TurboBump {
  constructor({ showView, onReturnHome }) {
    this.showView = showView;
    this.onReturnHome = onReturnHome;
    this.elements = {
      setup: document.querySelector("#turbo-setup-view"),
      lobby: document.querySelector("#turbo-lobby-view"),
      game: document.querySelector("#turbo-game-view"),
      setupBack: document.querySelector("#turbo-setup-back"),
      playerName: document.querySelector("#turbo-player-name"),
      roomInput: document.querySelector("#turbo-room-input"),
      createRoom: document.querySelector("#turbo-create-room"),
      joinRoom: document.querySelector("#turbo-join-room"),
      setupNotice: document.querySelector("#turbo-setup-notice"),
      leaveLobby: document.querySelector("#turbo-leave-lobby"),
      lobbyCode: document.querySelector("#turbo-lobby-code"),
      shareLobby: document.querySelector("#turbo-share-lobby"),
      lobbyStatus: document.querySelector("#turbo-lobby-status"),
      playerCount: document.querySelector("#turbo-player-count"),
      playerSlots: document.querySelector("#turbo-player-slots"),
      lobbyNotice: document.querySelector("#turbo-lobby-notice"),
      startGame: document.querySelector("#turbo-start-game"),
      hostHint: document.querySelector("#turbo-host-hint"),
      leaveGame: document.querySelector("#turbo-leave-game"),
      gameCode: document.querySelector("#turbo-game-code"),
      shareGame: document.querySelector("#turbo-share-game"),
      roundLabel: document.querySelector("#turbo-round-label"),
      arenaLabel: document.querySelector("#turbo-arena-label"),
      stage: document.querySelector("#turbo-stage"),
      hud: document.querySelector("#turbo-hud"),
      canvas: document.querySelector("#turbo-canvas"),
      message: document.querySelector("#turbo-message"),
      messageKicker: document.querySelector("#turbo-message-kicker"),
      messageTitle: document.querySelector("#turbo-message-title"),
      messageCopy: document.querySelector("#turbo-message-copy"),
      newRound: document.querySelector("#turbo-new-round"),
      mobileControls: document.querySelector("#turbo-mobile-controls"),
      gameNotice: document.querySelector("#turbo-game-notice"),
    };

    this.context = this.elements.canvas.getContext("2d");
    this.audio = new TurboAudio();
    this.peer = null;
    this.hostConnection = null;
    this.connections = new Map();
    this.remoteInputs = new Map();
    this.players = [];
    this.localId = null;
    this.roomCode = "";
    this.isHost = false;
    this.connectionStatus = "idle";
    this.world = null;
    this.renderWorld = null;
    this.targetWorld = null;
    this.round = 0;
    this.animationFrame = null;
    this.lastFrameTime = 0;
    this.physicsAccumulator = 0;
    this.stateAccumulator = 0;
    this.inputAccumulator = 0;
    this.hudAccumulator = 0;
    this.lastProcessedEvent = 0;
    this.particles = [];
    this.shake = 0;
    this.collisionCooldowns = new Map();
    this.manualClose = false;
    this.controls = normalizeInput();
    this.activePointers = new Map();
    this.bindInterface();
  }

  bindInterface() {
    this.elements.setupBack.addEventListener("click", () => this.leaveToHome());
    this.elements.createRoom.addEventListener("click", () => this.createRoom());
    this.elements.joinRoom.addEventListener("click", () => this.joinRoom());
    this.elements.leaveLobby.addEventListener("click", () => this.leaveToHome());
    this.elements.leaveGame.addEventListener("click", () => this.leaveToHome());
    this.elements.shareLobby.addEventListener("click", () => this.shareRoom());
    this.elements.shareGame.addEventListener("click", () => this.shareRoom());
    this.elements.startGame.addEventListener("click", () => this.startMatch());
    this.elements.newRound.addEventListener("click", () => this.startMatch());

    this.elements.roomInput.addEventListener("input", () => {
      this.elements.roomInput.value = normalizeRoomCode(
        this.elements.roomInput.value,
      );
      this.showNotice(this.elements.setupNotice, "");
    });
    this.elements.roomInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.joinRoom();
    });
    this.elements.playerName.addEventListener("input", () => {
      this.showNotice(this.elements.setupNotice, "");
    });

    const keyToControl = {
      KeyW: "up",
      ArrowUp: "up",
      KeyS: "down",
      ArrowDown: "down",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
      Space: "boost",
    };

    window.addEventListener("keydown", (event) => {
      const control = keyToControl[event.code];
      if (!control || !this.isPlaying()) return;
      event.preventDefault();
      this.audio.unlock();
      this.controls[control] = true;
    });
    window.addEventListener("keyup", (event) => {
      const control = keyToControl[event.code];
      if (!control || !this.isPlaying()) return;
      event.preventDefault();
      this.controls[control] = false;
    });
    window.addEventListener("blur", () => this.releaseControls());

    this.elements.mobileControls
      .querySelectorAll("[data-control]")
      .forEach((button) => {
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          this.audio.unlock();
          button.setPointerCapture?.(event.pointerId);
          const control = button.dataset.control;
          this.activePointers.set(event.pointerId, control);
          this.controls[control] = true;
          button.classList.add("pressed");
        });

        const release = (event) => {
          event.preventDefault();
          const control = this.activePointers.get(event.pointerId);
          this.activePointers.delete(event.pointerId);
          if (control && ![...this.activePointers.values()].includes(control)) {
            this.controls[control] = false;
          }
          button.classList.remove("pressed");
        };

        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("contextmenu", (event) => event.preventDefault());
      });

    const preventTouchMove = (event) => {
      if (this.isPlaying()) event.preventDefault();
    };
    this.elements.stage.addEventListener("touchmove", preventTouchMove, {
      passive: false,
    });
  }

  isPlaying() {
    return !this.elements.game.classList.contains("hidden");
  }

  showNotice(target, message) {
    target.textContent = message;
    target.classList.toggle("hidden", !message);
  }

  setRoomUrl(code = "") {
    const url = new URL(window.location.href);
    if (code) {
      url.searchParams.set("game", "turbo-bump");
      url.searchParams.set("room", code);
    } else {
      url.searchParams.delete("game");
      url.searchParams.delete("room");
    }
    history.replaceState({}, "", url);
  }

  openSetup(invitedCode = "") {
    this.closeSession({ notify: false });
    this.elements.roomInput.value = normalizeRoomCode(invitedCode);
    this.elements.playerName.value = this.elements.playerName.value || "Spieler";
    this.showNotice(this.elements.setupNotice, "");
    this.showView(this.elements.setup);
    if (invitedCode) this.setRoomUrl(normalizeRoomCode(invitedCode));
    else this.setRoomUrl();
  }

  leaveToHome() {
    this.closeSession();
    this.onReturnHome();
  }

  releaseControls() {
    this.controls = normalizeInput();
    this.activePointers.clear();
    this.elements.mobileControls
      .querySelectorAll(".pressed")
      .forEach((button) => button.classList.remove("pressed"));
  }

  closeSession({ notify = true } = {}) {
    this.manualClose = true;
    if (notify && this.isHost) {
      this.broadcast({ type: "host-ended" });
    }
    this.hostConnection?.close();
    this.connections.forEach((connection) => connection.close());
    this.peer?.destroy();
    this.stopLoop();
    this.peer = null;
    this.hostConnection = null;
    this.connections.clear();
    this.remoteInputs.clear();
    this.players = [];
    this.localId = null;
    this.roomCode = "";
    this.isHost = false;
    this.connectionStatus = "idle";
    this.world = null;
    this.renderWorld = null;
    this.targetWorld = null;
    this.particles = [];
    this.releaseControls();
    document.body.classList.remove("turbo-playing");
    this.manualClose = false;
  }

  createRoom() {
    this.audio.unlock();
    const name = sanitizeName(this.elements.playerName.value);
    this.elements.playerName.value = name;
    this.closeSession({ notify: false });
    this.isHost = true;
    this.localId = "host";
    this.roomCode = makeRoomCode();
    this.connectionStatus = "preparing";
    this.players = [
      { id: this.localId, name, color: PLAYER_COLORS[0], host: true, connected: true },
    ];
    this.setRoomUrl(this.roomCode);
    this.showLobby();

    this.peer = new Peer(`${ROOM_PREFIX}${this.roomCode}`);
    this.peer.on("open", () => {
      this.connectionStatus = "waiting";
      this.renderLobby();
    });
    this.peer.on("connection", (connection) => {
      this.bindIncomingConnection(connection);
    });
    this.peer.on("error", (error) => this.handlePeerError(error, true));
  }

  joinRoom() {
    this.audio.unlock();
    const code = normalizeRoomCode(this.elements.roomInput.value);
    const name = sanitizeName(this.elements.playerName.value);
    this.elements.roomInput.value = code;
    this.elements.playerName.value = name;
    if (code.length !== 6) {
      this.showNotice(
        this.elements.setupNotice,
        "Bitte gib den vollständigen 6-stelligen Raumcode ein.",
      );
      return;
    }

    this.closeSession({ notify: false });
    this.isHost = false;
    this.roomCode = code;
    this.connectionStatus = "preparing";
    this.players = [];
    this.setRoomUrl(this.roomCode);
    this.showLobby();

    this.peer = new Peer();
    this.peer.on("open", () => {
      const connection = this.peer.connect(`${ROOM_PREFIX}${this.roomCode}`, {
        reliable: true,
        serialization: "json",
      });
      this.bindHostConnection(connection, name);
    });
    this.peer.on("error", (error) => this.handlePeerError(error, false));
  }

  handlePeerError(error, host) {
    const roomMissing = !host && error?.type === "peer-unavailable";
    const duplicateRoom = host && error?.type === "unavailable-id";
    this.connectionStatus = "error";
    const message = roomMissing
      ? "Raum nicht gefunden. Prüfe den Code oder bitte den Host um einen neuen Link."
      : duplicateRoom
        ? "Der Raumcode war bereits belegt. Bitte erstelle den Raum nochmals."
        : "Die PeerJS-Verbindung konnte nicht aufgebaut werden. Bitte versucht es nochmals.";
    if (this.isPlaying()) this.showGameDisconnect(message);
    else {
      this.showNotice(this.elements.lobbyNotice, message);
      this.renderLobby();
    }
  }

  bindIncomingConnection(connection) {
    let joinedPlayerId = null;
    connection.on("data", (message) => {
      if (!message || typeof message !== "object") return;
      if (message.type === "join" && !joinedPlayerId) {
        if (this.world) {
          connection.send({ type: "reject", reason: "running" });
          window.setTimeout(() => connection.close(), 200);
          return;
        }
        if (this.players.filter((player) => player.connected).length >= 4) {
          connection.send({ type: "reject", reason: "full" });
          window.setTimeout(() => connection.close(), 200);
          return;
        }

        joinedPlayerId = connection.peer;
        const usedColors = new Set(this.players.map((player) => player.color));
        const color = PLAYER_COLORS.find((candidate) => !usedColors.has(candidate));
        const player = {
          id: joinedPlayerId,
          name: sanitizeName(String(message.name ?? "Spieler")),
          color: color ?? PLAYER_COLORS[this.players.length % PLAYER_COLORS.length],
          host: false,
          connected: true,
        };
        this.connections.set(joinedPlayerId, connection);
        this.players.push(player);
        connection.send({
          type: "welcome",
          playerId: joinedPlayerId,
          players: this.publicPlayers(),
        });
        this.broadcastLobby();
        return;
      }

      if (message.type === "input" && joinedPlayerId) {
        this.remoteInputs.set(joinedPlayerId, normalizeInput(message.input));
      }
    });

    connection.on("close", () => {
      if (!joinedPlayerId || this.manualClose) return;
      this.connections.delete(joinedPlayerId);
      this.remoteInputs.delete(joinedPlayerId);
      const descriptor = this.players.find((player) => player.id === joinedPlayerId);
      if (descriptor) descriptor.connected = false;
      if (!this.world) {
        this.players = this.players.filter((player) => player.id !== joinedPlayerId);
      } else {
        const worldPlayer = this.world.players.find(
          (player) => player.id === joinedPlayerId,
        );
        if (worldPlayer) {
          worldPlayer.connected = false;
          worldPlayer.lives = 0;
          worldPlayer.active = false;
          this.emitEvent("disconnect", {
            x: worldPlayer.x,
            y: worldPlayer.y,
            color: worldPlayer.color,
            playerId: joinedPlayerId,
          });
          this.checkRoundEnd();
          this.broadcastState(true);
        }
      }
      this.broadcastLobby();
    });

    connection.on("error", () => {
      if (joinedPlayerId) connection.close();
    });
  }

  bindHostConnection(connection, name) {
    this.hostConnection = connection;
    connection.on("open", () => {
      this.connectionStatus = "connected";
      connection.send({ type: "join", name });
      this.renderLobby();
    });
    connection.on("data", (message) => this.handleClientMessage(message));
    connection.on("close", () => {
      if (this.manualClose) return;
      this.connectionStatus = "disconnected";
      this.showGameDisconnect(
        "Der Host hat den Raum verlassen. Dieser Raum ist nicht mehr verfügbar.",
      );
    });
    connection.on("error", () => {
      if (this.manualClose) return;
      this.connectionStatus = "error";
      this.showGameDisconnect(
        "Die Verbindung zum Host wurde unterbrochen. Bitte erstellt einen neuen Raum.",
      );
    });
  }

  handleClientMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "welcome") {
      this.localId = String(message.playerId);
      this.players = this.validateLobbyPlayers(message.players);
      this.connectionStatus = "connected";
      this.renderLobby();
      return;
    }
    if (message.type === "lobby") {
      this.players = this.validateLobbyPlayers(message.players);
      this.renderLobby();
      return;
    }
    if (message.type === "reject") {
      const copy =
        message.reason === "full"
          ? "Dieser Raum ist bereits voll (4/4 Fahrer)."
          : "Das Match läuft bereits. Bitte wartet auf die nächste Lobby.";
      this.showNotice(this.elements.lobbyNotice, copy);
      this.connectionStatus = "error";
      this.renderLobby();
      return;
    }
    if (message.type === "game-start" && isWorldSnapshot(message.state)) {
      this.receiveInitialWorld(message.state);
      return;
    }
    if (message.type === "state" && isWorldSnapshot(message.state)) {
      this.receiveSnapshot(message.state);
      return;
    }
    if (message.type === "host-ended") {
      this.connectionStatus = "disconnected";
      this.showGameDisconnect(
        "Der Host hat den Raum beendet. Für ein neues Match braucht ihr einen neuen Raum.",
      );
    }
  }

  validateLobbyPlayers(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 4).map((player, index) => ({
      id: String(player.id ?? `player-${index}`),
      name: sanitizeName(String(player.name ?? "Spieler")),
      color: PLAYER_COLORS.includes(player.color)
        ? player.color
        : PLAYER_COLORS[index],
      host: Boolean(player.host),
      connected: player.connected !== false,
    }));
  }

  publicPlayers() {
    return this.players
      .filter((player) => player.connected)
      .map(({ id, name, color, host, connected }) => ({
        id,
        name,
        color,
        host,
        connected,
      }));
  }

  broadcast(message) {
    this.connections.forEach((connection) => {
      if (connection.open) connection.send(message);
    });
  }

  broadcastLobby() {
    const message = { type: "lobby", players: this.publicPlayers() };
    this.broadcast(message);
    this.renderLobby();
  }

  showLobby() {
    document.body.classList.remove("turbo-playing");
    this.elements.lobbyCode.textContent = this.roomCode;
    this.showNotice(this.elements.lobbyNotice, "");
    this.showView(this.elements.lobby);
    this.renderLobby();
  }

  renderLobby() {
    const players = this.players.filter((player) => player.connected);
    this.elements.lobbyCode.textContent = this.roomCode;
    this.elements.playerCount.textContent = `${players.length} / 4`;
    const statuses = {
      preparing: "Verbindung wird vorbereitet …",
      waiting: "Raum offen – teile jetzt Code oder Link.",
      connected: this.isHost
        ? "Fahrer verbunden – du kontrollierst den Start."
        : "Verbunden – warte auf den Start durch den Host.",
      disconnected: "Verbindung getrennt.",
      error: "Verbindung fehlgeschlagen.",
    };
    this.elements.lobbyStatus.textContent =
      statuses[this.connectionStatus] ?? "Raum wird vorbereitet …";

    this.elements.playerSlots.replaceChildren();
    for (let index = 0; index < 4; index += 1) {
      const player = players[index];
      const slot = document.createElement("div");
      slot.className = `turbo-player-slot${player ? " occupied" : ""}`;
      const marker = document.createElement("span");
      marker.className = "turbo-player-color";
      if (player) marker.style.setProperty("--player-color", player.color);
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = player
        ? `${player.name}${player.id === this.localId ? " · Du" : ""}`
        : "Freier Platz";
      const detail = document.createElement("small");
      detail.textContent = player
        ? player.host
          ? "Host"
          : `Fahrer ${index + 1}`
        : "Warte auf Fahrer …";
      copy.append(name, detail);
      slot.append(marker, copy);
      this.elements.playerSlots.append(slot);
    }

    const canStart =
      this.isHost && players.length >= 2 && this.connectionStatus === "waiting";
    this.elements.startGame.classList.toggle("hidden", !this.isHost);
    this.elements.startGame.disabled = !canStart;
    this.elements.hostHint.textContent = this.isHost
      ? players.length < 2
        ? "Mindestens zwei Fahrer werden benötigt."
        : "Alle bereit? Du kannst das Match starten."
      : "Der Host startet das Match, sobald alle bereit sind.";
  }

  startMatch() {
    if (!this.isHost) return;
    const connectedPlayers = this.publicPlayers();
    if (connectedPlayers.length < 2) {
      this.showNotice(
        this.elements.gameNotice,
        "Für eine neue Runde müssen mindestens zwei Fahrer verbunden sein.",
      );
      return;
    }
    this.audio.unlock();
    this.releaseControls();
    this.remoteInputs.clear();
    this.round += 1;
    this.world = makeWorld(connectedPlayers, this.round);
    this.renderWorld = this.world;
    this.targetWorld = this.world;
    this.lastProcessedEvent = 0;
    this.collisionCooldowns.clear();
    this.particles = [];
    this.broadcast({ type: "game-start", state: this.snapshotWorld() });
    this.showGame();
  }

  receiveInitialWorld(state) {
    this.particles = [];
    this.world = deepCopy(state);
    this.targetWorld = this.world;
    this.renderWorld = deepCopy(state);
    this.round = state.round;
    this.lastProcessedEvent = 0;
    this.processSnapshotEvents(state.events);
    this.showGame();
  }

  receiveSnapshot(state) {
    this.world = deepCopy(state);
    this.targetWorld = this.world;
    if (!this.renderWorld) this.renderWorld = deepCopy(state);
    this.processSnapshotEvents(state.events);
    this.renderGameUi();
  }

  showGame() {
    this.showNotice(this.elements.gameNotice, "");
    this.elements.gameCode.textContent = this.roomCode;
    document.body.classList.add("turbo-playing");
    this.showView(this.elements.game);
    this.renderGameUi();
    this.startLoop();
  }

  showGameDisconnect(message) {
    if (this.elements.game.classList.contains("hidden")) {
      this.showNotice(this.elements.lobbyNotice, message);
      this.renderLobby();
      return;
    }
    this.stopLoop();
    this.showNotice(this.elements.gameNotice, message);
    this.elements.messageKicker.textContent = "Verbindung beendet";
    this.elements.messageTitle.textContent = "Raum geschlossen";
    this.elements.messageCopy.textContent = message;
    this.elements.newRound.classList.add("hidden");
    this.elements.message.classList.remove("hidden");
  }

  startLoop() {
    this.stopLoop();
    this.lastFrameTime = performance.now();
    this.physicsAccumulator = 0;
    this.stateAccumulator = 0;
    this.inputAccumulator = 0;
    this.hudAccumulator = 0;

    const frame = (time) => {
      const delta = clamp((time - this.lastFrameTime) / 1000, 0, 0.05);
      this.lastFrameTime = time;
      if (this.isHost && this.world?.phase === "playing") {
        this.physicsAccumulator += delta;
        while (this.physicsAccumulator >= FIXED_STEP) {
          this.simulate(FIXED_STEP);
          this.physicsAccumulator -= FIXED_STEP;
        }
        this.stateAccumulator += delta;
        if (this.stateAccumulator >= STATE_INTERVAL) {
          this.stateAccumulator %= STATE_INTERVAL;
          this.broadcastState();
        }
      } else if (!this.isHost && this.targetWorld) {
        this.interpolateWorld(delta);
        this.inputAccumulator += delta;
        if (this.inputAccumulator >= 1 / 25) {
          this.inputAccumulator %= 1 / 25;
          this.sendLocalInput();
        }
      }

      this.updateParticles(delta);
      this.hudAccumulator += delta;
      if (this.hudAccumulator >= 0.1) {
        this.hudAccumulator = 0;
        this.renderGameUi();
      }
      this.draw();
      this.animationFrame = requestAnimationFrame(frame);
    };
    this.animationFrame = requestAnimationFrame(frame);
  }

  stopLoop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  sendLocalInput() {
    if (this.hostConnection?.open) {
      this.hostConnection.send({ type: "input", input: this.controls });
    }
  }

  inputFor(playerId) {
    if (playerId === this.localId) return this.controls;
    return this.remoteInputs.get(playerId) ?? normalizeInput();
  }

  simulate(delta) {
    const world = this.world;
    if (!world || world.phase !== "playing") return;
    world.time += delta;
    world.arenaRadius = Math.max(
      MIN_RADIUS,
      START_RADIUS - Math.max(0, world.time - 30) * 1.45,
    );

    world.pickups.forEach((pickup) => {
      if (!pickup.active && world.time >= pickup.respawnAt) pickup.active = true;
    });

    world.players.forEach((player, index) => {
      if (!player.connected || player.lives <= 0) return;
      if (!player.active) {
        if (world.time >= player.respawnAt) this.respawnPlayer(player, index);
        return;
      }
      this.drivePlayer(player, this.inputFor(player.id), delta);
      this.collectPickups(player);
    });

    this.resolveCarCollisions();
    world.players.forEach((player) => {
      if (!player.active) return;
      const distance = Math.hypot(player.x - CENTER_X, player.y - CENTER_Y);
      if (distance > world.arenaRadius + CAR_RADIUS * 0.72) {
        this.dropPlayer(player);
      }
    });
    this.checkRoundEnd();
  }

  drivePlayer(player, input, delta) {
    const throttle = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    const steering = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const forwardX = Math.cos(player.angle);
    const forwardY = Math.sin(player.angle);
    const forwardSpeed = player.vx * forwardX + player.vy * forwardY;

    if (throttle !== 0) {
      const acceleration = throttle > 0 ? 285 : 195;
      player.vx += forwardX * throttle * acceleration * delta;
      player.vy += forwardY * throttle * acceleration * delta;
    }

    const steeringGrip = 0.75 + Math.min(1, Math.abs(forwardSpeed) / 100) * 1.95;
    const travelDirection = Math.abs(forwardSpeed) < 12 ? Math.sign(throttle || 1) : Math.sign(forwardSpeed);
    player.angle += steering * steeringGrip * travelDirection * delta;

    if (input.boost && !player.boostHeld && player.boostCharges > 0 && this.world.time >= player.boostCooldownUntil) {
      player.boostCharges -= 1;
      player.boostCooldownUntil = this.world.time + 0.55;
      player.boostingUntil = this.world.time + 0.3;
      player.vx += forwardX * 205;
      player.vy += forwardY * 205;
      this.emitEvent("boost", {
        x: player.x - forwardX * 18,
        y: player.y - forwardY * 18,
        color: player.color,
        playerId: player.id,
        angle: player.angle,
      });
    }
    player.boostHeld = input.boost;

    const drag = Math.exp(-1.35 * delta);
    player.vx *= drag;
    player.vy *= drag;
    const speed = Math.hypot(player.vx, player.vy);
    const maximumSpeed = player.boostingUntil > this.world.time ? 430 : 285;
    if (speed > maximumSpeed) {
      player.vx = (player.vx / speed) * maximumSpeed;
      player.vy = (player.vy / speed) * maximumSpeed;
    }
    player.x += player.vx * delta;
    player.y += player.vy * delta;
  }

  collectPickups(player) {
    this.world.pickups.forEach((pickup) => {
      if (!pickup.active || player.boostCharges >= 3) return;
      if (Math.hypot(player.x - pickup.x, player.y - pickup.y) < CAR_RADIUS + 15) {
        pickup.active = false;
        pickup.respawnAt = this.world.time + 7;
        player.boostCharges = Math.min(3, player.boostCharges + 1);
        this.emitEvent("pickup", {
          x: pickup.x,
          y: pickup.y,
          color: player.color,
          playerId: player.id,
        });
      }
    });
  }

  resolveCarCollisions() {
    const activePlayers = this.world.players.filter((player) => player.active);
    for (let firstIndex = 0; firstIndex < activePlayers.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < activePlayers.length; secondIndex += 1) {
        const first = activePlayers[firstIndex];
        const second = activePlayers[secondIndex];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const minimumDistance = CAR_RADIUS * 2;
        if (distance >= minimumDistance) continue;

        const normalX = dx / distance;
        const normalY = dy / distance;
        const overlap = minimumDistance - distance;
        const firstProtected = first.invulnerableUntil > this.world.time;
        const secondProtected = second.invulnerableUntil > this.world.time;
        const firstWeight = firstProtected ? 0.25 : 0.5;
        const secondWeight = secondProtected ? 0.25 : 0.5;
        first.x -= normalX * overlap * firstWeight;
        first.y -= normalY * overlap * firstWeight;
        second.x += normalX * overlap * secondWeight;
        second.y += normalY * overlap * secondWeight;

        const relativeVelocity =
          (second.vx - first.vx) * normalX +
          (second.vy - first.vy) * normalY;
        if (relativeVelocity >= 0) continue;
        let impulse = (-(1 + 0.82) * relativeVelocity) / 2;
        if (first.boostingUntil > this.world.time) impulse += 34;
        if (second.boostingUntil > this.world.time) impulse += 34;
        if (!firstProtected) {
          first.vx -= normalX * impulse;
          first.vy -= normalY * impulse;
        }
        if (!secondProtected) {
          second.vx += normalX * impulse;
          second.vy += normalY * impulse;
        }

        const impact = Math.abs(relativeVelocity);
        const collisionKey = [first.id, second.id].sort().join(":");
        if (
          impact > 55 &&
          (this.collisionCooldowns.get(collisionKey) ?? 0) < this.world.time
        ) {
          this.collisionCooldowns.set(collisionKey, this.world.time + 0.12);
          this.emitEvent("collision", {
            x: (first.x + second.x) / 2,
            y: (first.y + second.y) / 2,
            color: impact > 130 ? "#ffffff" : first.color,
            intensity: clamp(impact / 170, 0.35, 1.35),
          });
        }
      }
    }
  }

  dropPlayer(player) {
    player.lives -= 1;
    player.active = false;
    player.vx = 0;
    player.vy = 0;
    player.respawnAt = player.lives > 0 ? this.world.time + 1.5 : 0;
    this.emitEvent("fall", {
      x: player.x,
      y: player.y,
      color: player.color,
      playerId: player.id,
      lives: player.lives,
    });
  }

  respawnPlayer(player, index) {
    const spawn = playerSpawn(index, this.world.players.length);
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.angle = spawn.angle;
    player.active = true;
    player.invulnerableUntil = this.world.time + 2;
  }

  checkRoundEnd() {
    if (!this.world || this.world.phase !== "playing" || this.world.time < 1.2) return;
    const survivors = this.world.players.filter(
      (player) => player.connected && player.lives > 0,
    );
    if (survivors.length > 1) return;
    this.world.phase = "ended";
    this.world.winnerId = survivors[0]?.id ?? null;
    const winner = survivors[0];
    this.emitEvent("win", {
      x: winner?.x ?? CENTER_X,
      y: winner?.y ?? CENTER_Y,
      color: winner?.color ?? "#ffffff",
      playerId: winner?.id ?? null,
    });
    this.broadcastState(true);
    this.renderGameUi();
  }

  emitEvent(type, payload) {
    const event = {
      id: ++this.world.eventSequence,
      type,
      time: this.world.time,
      ...payload,
    };
    this.world.events.push(event);
    if (this.world.events.length > 18) this.world.events.shift();
    this.processEvent(event);
  }

  snapshotWorld() {
    if (!this.world) return null;
    const state = deepCopy(this.world);
    state.events = state.events.slice(-12);
    return state;
  }

  broadcastState(force = false) {
    if (!this.isHost || !this.world) return;
    if (force) this.stateAccumulator = 0;
    this.broadcast({ type: "state", state: this.snapshotWorld() });
  }

  processSnapshotEvents(events) {
    events.forEach((event) => {
      if (!Number.isInteger(event.id) || event.id <= this.lastProcessedEvent) return;
      this.lastProcessedEvent = event.id;
      this.processEvent(event);
    });
  }

  processEvent(event) {
    const counts = {
      boost: 14,
      collision: 20,
      pickup: 18,
      fall: 28,
      disconnect: 22,
      win: 42,
    };
    const count = counts[event.type] ?? 10;
    const direction = Number.isFinite(event.angle) ? event.angle + Math.PI : null;
    for (let index = 0; index < count; index += 1) {
      const angle = direction ?? Math.random() * Math.PI * 2;
      const spread = direction ? (Math.random() - 0.5) * 1.25 : Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * (event.type === "fall" ? 190 : 125);
      this.particles.push({
        x: Number(event.x) || CENTER_X,
        y: Number(event.y) || CENTER_Y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        color: event.color || "#ffffff",
        life: 0.35 + Math.random() * 0.55,
        maxLife: 0.9,
        size: 2 + Math.random() * 5,
      });
    }
    if (event.type === "collision") this.shake = Math.max(this.shake, 7 * (event.intensity ?? 1));
    if (event.type === "fall") this.shake = Math.max(this.shake, 9);
    if (event.type === "win") this.shake = Math.max(this.shake, 5);
    this.audio.play(event.type, event.intensity ?? 1);
  }

  updateParticles(delta) {
    this.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= Math.exp(-2.2 * delta);
      particle.vy *= Math.exp(-2.2 * delta);
      particle.life -= delta;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);
    this.shake *= Math.exp(-8 * delta);
  }

  interpolateWorld(delta) {
    if (!this.targetWorld) return;
    if (!this.renderWorld) {
      this.renderWorld = deepCopy(this.targetWorld);
      return;
    }
    const blend = 1 - Math.exp(-14 * delta);
    this.renderWorld.time += (this.targetWorld.time - this.renderWorld.time) * blend;
    this.renderWorld.arenaRadius +=
      (this.targetWorld.arenaRadius - this.renderWorld.arenaRadius) * blend;
    this.renderWorld.phase = this.targetWorld.phase;
    this.renderWorld.winnerId = this.targetWorld.winnerId;
    this.renderWorld.pickups = deepCopy(this.targetWorld.pickups);

    this.targetWorld.players.forEach((targetPlayer) => {
      let renderPlayer = this.renderWorld.players.find(
        (player) => player.id === targetPlayer.id,
      );
      if (!renderPlayer) {
        renderPlayer = deepCopy(targetPlayer);
        this.renderWorld.players.push(renderPlayer);
      }
      const x = renderPlayer.x + (targetPlayer.x - renderPlayer.x) * blend;
      const y = renderPlayer.y + (targetPlayer.y - renderPlayer.y) * blend;
      const angle =
        renderPlayer.angle + shortestAngle(renderPlayer.angle, targetPlayer.angle) * blend;
      Object.assign(renderPlayer, targetPlayer, { x, y, angle });
    });
  }

  renderGameUi() {
    const world = this.world ?? this.renderWorld;
    if (!world) return;
    this.elements.roundLabel.textContent = `Runde ${world.round}`;
    const shrinking = world.time > 30;
    this.elements.arenaLabel.textContent = shrinking
      ? `Arena schrumpft · ${Math.ceil(world.arenaRadius)} m`
      : `Arena stabil · ${Math.max(0, Math.ceil(30 - world.time))} s`;
    this.elements.arenaLabel.classList.toggle("danger", shrinking);
    this.renderHud(world);

    const ended = world.phase === "ended";
    this.elements.message.classList.toggle("hidden", !ended);
    if (!ended) return;
    const winner = world.players.find((player) => player.id === world.winnerId);
    this.elements.messageKicker.textContent = `Runde ${world.round} beendet`;
    this.elements.messageTitle.textContent = winner
      ? winner.id === this.localId
        ? "Du gewinnst!"
        : `${winner.name} gewinnt!`
      : "Keine Sieger";
    const connectedCount = this.publicPlayers().length;
    this.elements.messageCopy.textContent = this.isHost
      ? connectedCount >= 2
        ? "Die nächste Revanche kann sofort starten."
        : "Für eine neue Runde muss noch ein Fahrer verbunden sein."
      : "Warte, bis der Host die nächste Runde startet.";
    this.elements.newRound.classList.toggle("hidden", !this.isHost);
    this.elements.newRound.disabled = !this.isHost || connectedCount < 2;
  }

  renderHud(world) {
    this.elements.hud.replaceChildren();
    world.players.forEach((player) => {
      const item = document.createElement("div");
      item.className = `turbo-hud-player${player.id === this.localId ? " own" : ""}${player.lives <= 0 ? " eliminated" : ""}`;
      item.style.setProperty("--player-color", player.color);
      const name = document.createElement("strong");
      name.textContent = `${player.name}${player.id === this.localId ? " · DU" : ""}`;
      const stats = document.createElement("span");
      const lives = document.createElement("span");
      lives.className = "turbo-lives";
      lives.textContent = player.lives > 0 ? "●".repeat(player.lives) : "RAUS";
      const boost = document.createElement("small");
      boost.textContent = `BOOST ${"▰".repeat(player.boostCharges)}${"▱".repeat(3 - player.boostCharges)}`;
      stats.append(lives, boost);
      item.append(name, stats);
      this.elements.hud.append(item);
    });
  }

  draw() {
    const world = this.isHost ? this.world : this.renderWorld;
    if (!world) return;
    const context = this.context;
    context.save();
    context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    context.translate(shakeX, shakeY);
    this.drawBackground(context, world);
    this.drawArena(context, world);
    world.pickups.forEach((pickup) => this.drawPickup(context, pickup, world.time));
    world.players.forEach((player) => this.drawCar(context, player, world.time));
    this.drawParticles(context);
    context.restore();
  }

  drawBackground(context, world) {
    const gradient = context.createRadialGradient(
      CENTER_X,
      CENTER_Y,
      40,
      CENTER_X,
      CENTER_Y,
      560,
    );
    gradient.addColorStop(0, "#162334");
    gradient.addColorStop(0.55, "#080d18");
    gradient.addColorStop(1, "#03050a");
    context.fillStyle = gradient;
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    context.fillStyle = "rgba(255,255,255,.28)";
    for (let index = 0; index < 62; index += 1) {
      const x = (index * 157 + 41) % WORLD_WIDTH;
      const y = (index * 83 + 27) % WORLD_HEIGHT;
      const size = index % 7 === 0 ? 1.7 : 0.8;
      context.globalAlpha = 0.25 + ((index * 17) % 50) / 100;
      context.fillRect(x, y, size, size);
    }
    context.globalAlpha = 1;
    if (world.time > 30) {
      context.fillStyle = `rgba(255, 61, 112, ${0.025 + Math.sin(world.time * 4) * 0.012})`;
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
  }

  drawArena(context, world) {
    const radius = world.arenaRadius;
    context.save();
    context.shadowColor = world.time > 30 ? "#ff3d70" : "#4df7c8";
    context.shadowBlur = 38;
    context.fillStyle = "rgba(0,0,0,.72)";
    context.beginPath();
    context.ellipse(CENTER_X, CENTER_Y + 17, radius + 16, radius * 0.91, 0, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    const platform = context.createRadialGradient(
      CENTER_X - 70,
      CENTER_Y - 95,
      20,
      CENTER_X,
      CENTER_Y,
      radius,
    );
    platform.addColorStop(0, "#25384c");
    platform.addColorStop(0.62, "#142333");
    platform.addColorStop(1, "#0b1420");
    context.fillStyle = platform;
    context.beginPath();
    context.arc(CENTER_X, CENTER_Y, radius, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.beginPath();
    context.arc(CENTER_X, CENTER_Y, Math.max(0, radius - 5), 0, Math.PI * 2);
    context.clip();
    context.strokeStyle = "rgba(116, 181, 210, .09)";
    context.lineWidth = 1;
    for (let x = CENTER_X - START_RADIUS; x <= CENTER_X + START_RADIUS; x += 42) {
      context.beginPath();
      context.moveTo(x, CENTER_Y - START_RADIUS);
      context.lineTo(x, CENTER_Y + START_RADIUS);
      context.stroke();
    }
    for (let y = CENTER_Y - START_RADIUS; y <= CENTER_Y + START_RADIUS; y += 42) {
      context.beginPath();
      context.moveTo(CENTER_X - START_RADIUS, y);
      context.lineTo(CENTER_X + START_RADIUS, y);
      context.stroke();
    }
    context.strokeStyle = "rgba(77, 247, 200, .09)";
    context.lineWidth = 2;
    [0.35, 0.68].forEach((factor) => {
      context.beginPath();
      context.arc(CENTER_X, CENTER_Y, radius * factor, 0, Math.PI * 2);
      context.stroke();
    });
    context.restore();

    const edgeColor = world.time > 30 ? "#ff3d70" : "#4df7c8";
    context.strokeStyle = edgeColor;
    context.lineWidth = 7;
    context.shadowColor = edgeColor;
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(CENTER_X, CENTER_Y, radius - 2, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(255,255,255,.36)";
    context.lineWidth = 1;
    context.setLineDash([5, 12]);
    context.beginPath();
    context.arc(CENTER_X, CENTER_Y, radius - 11, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  drawPickup(context, pickup, time) {
    if (!pickup.active) return;
    context.save();
    context.translate(pickup.x, pickup.y);
    context.rotate(time * 1.8 + pickup.id);
    context.shadowColor = "#ffc857";
    context.shadowBlur = 24;
    context.fillStyle = "rgba(255, 200, 87, .22)";
    context.beginPath();
    context.arc(0, 0, 18 + Math.sin(time * 5 + pickup.id) * 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffc857";
    context.beginPath();
    for (let point = 0; point < 6; point += 1) {
      const angle = (point / 6) * Math.PI * 2;
      const x = Math.cos(angle) * 10;
      const y = Math.sin(angle) * 10;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#1d1720";
    context.font = "900 11px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("⚡", 0, 1);
    context.restore();
  }

  drawCar(context, player, time) {
    if (!player.active) return;
    const protectedPlayer = player.invulnerableUntil > time;
    if (protectedPlayer && Math.floor(time * 10) % 2 === 0) context.globalAlpha = 0.48;
    const own = player.id === this.localId;
    context.save();
    context.translate(player.x, player.y);

    if (own) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2.5;
      context.setLineDash([5, 5]);
      context.shadowColor = player.color;
      context.shadowBlur = 15;
      context.beginPath();
      context.arc(0, 0, 31 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.shadowBlur = 0;
    }

    context.rotate(player.angle);
    context.fillStyle = "rgba(0,0,0,.45)";
    context.beginPath();
    context.ellipse(-2, 6, 31, 18, 0, 0, Math.PI * 2);
    context.fill();
    context.shadowColor = player.color;
    context.shadowBlur = player.boostingUntil > time ? 25 : 10;
    context.fillStyle = player.color;
    this.roundedRect(context, -27, -15, 54, 30, 11);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(4, 9, 17, .78)";
    this.roundedRect(context, -8, -11, 19, 22, 5);
    context.fill();
    context.fillStyle = "rgba(255,255,255,.5)";
    this.roundedRect(context, 12, -9, 8, 18, 4);
    context.fill();
    context.fillStyle = "#05080d";
    context.fillRect(-18, -18, 11, 5);
    context.fillRect(9, -18, 11, 5);
    context.fillRect(-18, 13, 11, 5);
    context.fillRect(9, 13, 11, 5);
    if (player.boostingUntil > time) {
      context.fillStyle = "#fff2a8";
      context.shadowColor = "#ff7a45";
      context.shadowBlur = 14;
      context.beginPath();
      context.moveTo(-27, -7);
      context.lineTo(-42 - Math.random() * 9, 0);
      context.lineTo(-27, 7);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
    }
    context.restore();

    context.save();
    context.textAlign = "center";
    context.font = own ? "800 12px system-ui" : "700 11px system-ui";
    context.fillStyle = own ? "#ffffff" : "rgba(255,255,255,.82)";
    context.shadowColor = "#000000";
    context.shadowBlur = 5;
    context.fillText(own ? `${player.name} · DU` : player.name, player.x, player.y - 34);
    context.restore();
    context.globalAlpha = 1;
  }

  roundedRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }

  drawParticles(context) {
    this.particles.forEach((particle) => {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.globalAlpha = alpha;
      context.fillStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      context.fill();
    });
    context.shadowBlur = 0;
    context.globalAlpha = 1;
  }

  async shareRoom() {
    if (!this.roomCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set("game", "turbo-bump");
    url.searchParams.set("room", this.roomCode);
    const shareData = {
      title: "Turbo Bump",
      text: `Komm in meine Turbo-Bump-Arena. Raumcode: ${this.roomCode}`,
      url: url.toString(),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      [this.elements.shareLobby, this.elements.shareGame].forEach((button) => {
        button.textContent = "Kopiert";
      });
      window.setTimeout(() => {
        [this.elements.shareLobby, this.elements.shareGame].forEach((button) => {
          button.textContent = "Einladen";
        });
      }, 1800);
    } catch {
      const target = this.isPlaying()
        ? this.elements.gameNotice
        : this.elements.lobbyNotice;
      this.showNotice(target, `Teile diesen Raumcode: ${this.roomCode}`);
    }
  }
}
