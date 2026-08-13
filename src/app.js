import Peer from "peerjs";
import "./styles.css";
import { createTurboBump } from "./turbo-bump.js";
import { createColorClash } from "./color-clash.js";

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const ROOM_PREFIX = "linobr-mini-games-tictactoe-";
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const elements = {
  views: [...document.querySelectorAll(".view")],
  home: document.querySelector("#home-view"),
  setup: document.querySelector("#setup-view"),
  game: document.querySelector("#game-view"),
  brand: document.querySelector("#brand-button"),
  openTicTacToe: document.querySelector("#open-tictactoe"),
  openTurbo: document.querySelector("#open-turbo"),
  openColorClash: document.querySelector("#open-color-clash"),
  setupBack: document.querySelector("#setup-back"),
  createRoom: document.querySelector("#create-room"),
  roomInput: document.querySelector("#room-input"),
  joinRoom: document.querySelector("#join-room"),
  startLocal: document.querySelector("#start-local"),
  setupNotice: document.querySelector("#setup-notice"),
  leaveGame: document.querySelector("#leave-game"),
  roomChip: document.querySelector("#room-chip"),
  roomCode: document.querySelector("#room-code"),
  shareRoom: document.querySelector("#share-room"),
  roundLabel: document.querySelector("#round-label"),
  playerX: document.querySelector("#player-x"),
  playerO: document.querySelector("#player-o"),
  scoreX: document.querySelector("#score-x"),
  scoreO: document.querySelector("#score-o"),
  scoreRowX: document.querySelector("#score-row-x"),
  scoreRowO: document.querySelector("#score-row-o"),
  connectionLine: document.querySelector("#connection-line"),
  connectionLabel: document.querySelector("#connection-label"),
  gameStatus: document.querySelector("#game-status"),
  board: document.querySelector("#board"),
  cells: [...document.querySelectorAll(".cell")],
  gameNotice: document.querySelector("#game-notice"),
  newRound: document.querySelector("#new-round"),
};

let game = createGame();
let mode = null;
let role = null;
let roomCode = "";
let connectionStatus = "idle";
let peer = null;
let connection = null;
let isHost = false;
let connectionTimer = null;
let turboBump = null;
let colorClash = null;

function createGame(score = { X: 0, O: 0 }, round = 1) {
  return {
    board: Array(9).fill(null),
    turn: "X",
    winner: null,
    winningLine: [],
    score,
    round,
  };
}

function playMove(currentGame, index, mark) {
  if (
    currentGame.winner ||
    currentGame.board[index] ||
    currentGame.turn !== mark
  ) {
    return currentGame;
  }

  const board = [...currentGame.board];
  board[index] = mark;
  const winningLine =
    WINNING_LINES.find((line) => line.every((cell) => board[cell] === mark)) ??
    [];
  const winner = winningLine.length
    ? mark
    : board.every(Boolean)
      ? "draw"
      : null;

  return {
    ...currentGame,
    board,
    turn: mark === "X" ? "O" : "X",
    winner,
    winningLine,
    score:
      winner === mark
        ? { ...currentGame.score, [mark]: currentGame.score[mark] + 1 }
        : currentGame.score,
  };
}

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

function isValidGameState(value) {
  return (
    value &&
    typeof value === "object" &&
    Array.isArray(value.board) &&
    value.board.length === 9 &&
    value.board.every((cell) => cell === null || cell === "X" || cell === "O") &&
    (value.turn === "X" || value.turn === "O") &&
    (value.winner === null ||
      value.winner === "X" ||
      value.winner === "O" ||
      value.winner === "draw") &&
    Array.isArray(value.winningLine) &&
    value.score &&
    Number.isInteger(value.score.X) &&
    Number.isInteger(value.score.O) &&
    Number.isInteger(value.round)
  );
}

function showView(view) {
  document.querySelectorAll(".view").forEach((item) => item.classList.add("hidden"));
  view.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showNotice(target, message) {
  target.textContent = message;
  target.classList.toggle("hidden", !message);
}

function setConnectionStatus(status) {
  connectionStatus = status;
  elements.connectionLine.className = `connection-line ${status}`;

  const labels = {
    preparing: "Wird verbunden",
    waiting: "Raum ist offen",
    connected: "Verbunden",
    disconnected: "Getrennt",
    error: "Verbindung fehlgeschlagen",
  };

  elements.connectionLabel.textContent = labels[status] ?? "Getrennt";
  renderGame();
}

function setRoomInUrl(code = "") {
  const url = new URL(window.location.href);
  if (code) {
    url.searchParams.set("game", "tic-tac-toe");
    url.searchParams.set("room", code);
  } else {
    url.searchParams.delete("game");
    url.searchParams.delete("room");
  }
  history.replaceState({}, "", url);
}

function clearConnectionTimer() {
  if (connectionTimer) window.clearTimeout(connectionTimer);
  connectionTimer = null;
}

function cleanConnection() {
  clearConnectionTimer();
  connection?.close();
  peer?.destroy();
  connection = null;
  peer = null;
  isHost = false;
}

function returnHome() {
  turboBump?.closeSession();
  colorClash?.closeSession();
  cleanConnection();
  mode = null;
  role = null;
  roomCode = "";
  connectionStatus = "idle";
  setRoomInUrl();
  showNotice(elements.setupNotice, "");
  showNotice(elements.gameNotice, "");
  showView(elements.home);
}

function openSetup() {
  turboBump?.closeSession();
  colorClash?.closeSession();
  cleanConnection();
  mode = null;
  role = null;
  roomCode = "";
  connectionStatus = "idle";
  setRoomInUrl();
  showNotice(elements.setupNotice, "");
  showNotice(elements.gameNotice, "");
  showView(elements.setup);
}

function startLocalGame() {
  cleanConnection();
  game = createGame();
  mode = "local";
  role = null;
  roomCode = "";
  connectionStatus = "idle";
  setRoomInUrl();
  showNotice(elements.gameNotice, "");
  showView(elements.game);
  renderGame();
}

function startConnectionTimeout() {
  clearConnectionTimer();
  connectionTimer = window.setTimeout(() => {
    if (!connection?.open) {
      setConnectionStatus("error");
      showNotice(
        elements.gameNotice,
        "Die Verbindung dauert zu lange. Prüft den Raumcode oder versucht es nochmals.",
      );
    }
  }, 15000);
}

function bindConnection(nextConnection, host) {
  connection?.close();
  connection = nextConnection;
  isHost = host;
  startConnectionTimeout();

  connection.on("open", () => {
    clearConnectionTimer();
    setConnectionStatus("connected");
    showNotice(elements.gameNotice, "");
    if (host) connection.send({ type: "state", state: game });
  });

  connection.on("data", handleWireMessage);

  connection.on("close", () => {
    clearConnectionTimer();
    setConnectionStatus("disconnected");
  });

  connection.on("error", () => {
    clearConnectionTimer();
    setConnectionStatus("error");
    showNotice(
      elements.gameNotice,
      "Die Verbindung wurde unterbrochen. Bitte erstellt einen neuen Raum.",
    );
  });
}

function sendAuthoritativeState(nextGame) {
  game = nextGame;
  renderGame();
  if (connection?.open) connection.send({ type: "state", state: game });
}

function handleWireMessage(message) {
  if (!message || typeof message !== "object") return;

  if (!isHost && message.type === "state" && isValidGameState(message.state)) {
    game = message.state;
    renderGame();
    return;
  }

  if (
    isHost &&
    message.type === "move" &&
    Number.isInteger(message.index) &&
    message.index >= 0 &&
    message.index <= 8
  ) {
    const nextGame = playMove(game, message.index, "O");
    if (nextGame !== game) sendAuthoritativeState(nextGame);
    return;
  }

  if (isHost && message.type === "new-round") {
    sendAuthoritativeState(createGame(game.score, game.round + 1));
  }
}

function handlePeerError(error, host) {
  clearConnectionTimer();
  setConnectionStatus("error");
  const roomMissing = !host && error?.type === "peer-unavailable";
  showNotice(
    elements.gameNotice,
    roomMissing
      ? "Raum nicht gefunden. Prüfe den Code oder erstellt einen neuen Raum."
      : "Die Online-Verbindung konnte nicht aufgebaut werden. Bitte versucht es nochmals.",
  );
}

function createOnlineRoom() {
  cleanConnection();
  game = createGame();
  mode = "online";
  role = "X";
  roomCode = makeRoomCode();
  isHost = true;
  setRoomInUrl(roomCode);
  showView(elements.game);
  showNotice(elements.gameNotice, "");
  setConnectionStatus("preparing");

  peer = new Peer(`${ROOM_PREFIX}${roomCode}`);
  peer.on("open", () => setConnectionStatus("waiting"));
  peer.on("connection", (incomingConnection) => {
    if (connection?.open) {
      incomingConnection.close();
      return;
    }
    bindConnection(incomingConnection, true);
  });
  peer.on("error", (error) => handlePeerError(error, true));
  renderGame();
}

function joinOnlineRoom() {
  const code = normalizeRoomCode(elements.roomInput.value);
  elements.roomInput.value = code;

  if (code.length !== 6) {
    showNotice(
      elements.setupNotice,
      "Bitte gib den vollständigen 6-stelligen Raumcode ein.",
    );
    return;
  }

  cleanConnection();
  game = createGame();
  mode = "online";
  role = "O";
  roomCode = code;
  isHost = false;
  setRoomInUrl(roomCode);
  showView(elements.game);
  showNotice(elements.gameNotice, "");
  setConnectionStatus("preparing");

  peer = new Peer();
  peer.on("open", () => {
    const nextConnection = peer.connect(`${ROOM_PREFIX}${roomCode}`, {
      reliable: true,
    });
    bindConnection(nextConnection, false);
  });
  peer.on("error", (error) => handlePeerError(error, false));
  renderGame();
}

function selectCell(index) {
  if (mode === "local") {
    game = playMove(game, index, game.turn);
    renderGame();
    return;
  }

  if (
    mode !== "online" ||
    connectionStatus !== "connected" ||
    role !== game.turn ||
    game.board[index] ||
    game.winner
  ) {
    return;
  }

  if (isHost) {
    const nextGame = playMove(game, index, "X");
    if (nextGame !== game) sendAuthoritativeState(nextGame);
  } else if (connection?.open) {
    connection.send({ type: "move", index });
  }
}

function startNewRound() {
  if (mode === "local") {
    game = createGame(game.score, game.round + 1);
    renderGame();
    return;
  }

  if (connectionStatus !== "connected") return;
  if (isHost) {
    sendAuthoritativeState(createGame(game.score, game.round + 1));
  } else {
    connection.send({ type: "new-round" });
  }
}

function currentStatusText() {
  if (mode === "online" && connectionStatus === "preparing")
    return "Verbindung wird vorbereitet …";
  if (mode === "online" && connectionStatus === "waiting")
    return "Warte auf deinen Kollegen …";
  if (mode === "online" && connectionStatus === "disconnected")
    return "Dein Kollege hat den Raum verlassen.";
  if (mode === "online" && connectionStatus === "error")
    return "Online-Verbindung fehlgeschlagen.";
  if (game.winner === "draw") return "Unentschieden – starke Runde!";
  if (game.winner) {
    if (mode === "local") return `${game.winner} gewinnt die Runde!`;
    return game.winner === role
      ? "Du gewinnst die Runde!"
      : "Dein Kollege gewinnt.";
  }
  if (mode === "local") return `${game.turn} ist am Zug`;
  if (connectionStatus === "connected")
    return game.turn === role ? "Du bist am Zug" : "Dein Kollege ist am Zug";
  return "Bereit für die nächste Runde";
}

function renderGame() {
  const online = mode === "online";
  const canPlay =
    mode === "local" ||
    (online && connectionStatus === "connected" && role === game.turn);

  elements.roomChip.classList.toggle("hidden", !online || !roomCode);
  elements.roomCode.textContent = roomCode;
  elements.roundLabel.textContent = `Runde ${game.round}`;
  elements.scoreX.textContent = String(game.score.X);
  elements.scoreO.textContent = String(game.score.O);
  elements.playerX.textContent =
    mode === "local" ? "Spieler X" : role === "X" ? "Du" : "Kollege";
  elements.playerO.textContent =
    mode === "local" ? "Spieler O" : role === "O" ? "Du" : "Kollege";
  elements.scoreRowX.classList.toggle("active", game.turn === "X" && !game.winner);
  elements.scoreRowO.classList.toggle("active", game.turn === "O" && !game.winner);
  elements.connectionLine.classList.toggle("hidden", !online);
  elements.gameStatus.textContent = currentStatusText();
  elements.newRound.classList.toggle("hidden", !game.winner);

  elements.cells.forEach((cell, index) => {
    const mark = game.board[index];
    cell.textContent = mark ?? "";
    cell.className = "cell";
    if (mark) cell.classList.add(`cell-${mark.toLowerCase()}`);
    if (game.winningLine.includes(index)) cell.classList.add("winning");
    cell.disabled = Boolean(mark) || Boolean(game.winner) || !canPlay;
    cell.setAttribute(
      "aria-label",
      mark ? `Feld ${index + 1}: ${mark}` : `Feld ${index + 1}: leer`,
    );
  });
}

async function shareRoom() {
  const url = new URL(window.location.href);
  url.searchParams.set("game", "tic-tac-toe");
  url.searchParams.set("room", roomCode);
  const shareData = {
    title: "Tic-Tac-Toe",
    text: `Spiel mit mir Tic-Tac-Toe. Raumcode: ${roomCode}`,
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
    elements.shareRoom.textContent = "Kopiert";
    window.setTimeout(() => {
      elements.shareRoom.textContent = "Einladen";
    }, 1800);
  } catch {
    showNotice(
      elements.gameNotice,
      `Teile diesen Raumcode mit deinem Kollegen: ${roomCode}`,
    );
  }
}

elements.brand.addEventListener("click", returnHome);
elements.openTicTacToe.addEventListener("click", openSetup);
elements.openTurbo.addEventListener("click", () => {
  colorClash?.closeSession();
  cleanConnection();
  turboBump.openSetup();
});
elements.openColorClash.addEventListener("click", () => {
  turboBump?.closeSession();
  cleanConnection();
  colorClash.openSetup();
});
elements.setupBack.addEventListener("click", returnHome);
elements.createRoom.addEventListener("click", createOnlineRoom);
elements.startLocal.addEventListener("click", startLocalGame);
elements.leaveGame.addEventListener("click", openSetup);
elements.joinRoom.addEventListener("click", joinOnlineRoom);
elements.newRound.addEventListener("click", startNewRound);
elements.shareRoom.addEventListener("click", shareRoom);

elements.roomInput.addEventListener("input", () => {
  elements.roomInput.value = normalizeRoomCode(elements.roomInput.value);
  showNotice(elements.setupNotice, "");
});

elements.roomInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinOnlineRoom();
});

elements.board.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  selectCell(Number(cell.dataset.index));
});

window.addEventListener("beforeunload", () => {
  cleanConnection();
  turboBump?.closeSession({ notify: false });
  colorClash?.closeSession({ notify: false });
});

turboBump = createTurboBump({
  showView,
  onReturnHome: returnHome,
});

colorClash = createColorClash({
  showView,
  onReturnHome: returnHome,
});

const initialParams = new URLSearchParams(window.location.search);
const invitedRoom = normalizeRoomCode(initialParams.get("room") ?? "");
const invitedGame = initialParams.get("game");

if (invitedGame === "color-clash" && invitedRoom.length === 6) {
  colorClash.openSetup(invitedRoom);
} else if (invitedGame === "turbo-bump" && invitedRoom.length === 6) {
  turboBump.openSetup(invitedRoom);
} else if (invitedRoom.length === 6) {
  elements.roomInput.value = invitedRoom;
  showView(elements.setup);
} else {
  showView(elements.home);
}

renderGame();
