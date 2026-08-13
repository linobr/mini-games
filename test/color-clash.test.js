import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAction,
  canPlayCard,
  chooseBotAction,
  clientState,
  createDeck,
  createGame,
  expireLastCall,
  fisherYates,
} from "../src/color-clash-engine.js";

function seeded(seed = 123456) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function card(id, light, dark = light) {
  return {
    id,
    light: { side: "light", value: null, ...light },
    dark: { side: "dark", value: null, ...dark },
  };
}

function stateWith(hands, top, side = "light") {
  return {
    version: 1,
    phase: "playing",
    round: 1,
    side,
    players: hands.map((hand, index) => ({
      id: `p${index + 1}`,
      name: `P${index + 1}`,
      isBot: false,
      difficulty: "normal",
      connected: true,
      hand,
    })),
    drawPile: [
      card("draw-a", { color: "aqua", type: "number", value: 8 }),
      card("draw-b", { color: "lime", type: "number", value: 4 }),
      card("draw-c", { color: "violet", type: "number", value: 6 }),
      card("draw-d", { color: "coral", type: "number", value: 1 }),
      card("draw-e", { color: "aqua", type: "number", value: 3 }),
      card("draw-f", { color: "lime", type: "number", value: 9 }),
    ],
    discardPile: [top],
    turnIndex: 0,
    direction: 1,
    activeColor: null,
    drawnCardId: null,
    pendingLastCall: null,
    winnerId: null,
    eventId: 0,
    event: { id: 0, type: "deal" },
  };
}

test("Fisher-Yates verändert die Eingabe nicht und behält alle Werte", () => {
  const source = [1, 2, 3, 4, 5, 6];
  const result = fisherYates(source, seeded(7));
  assert.deepEqual(source, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...result].sort(), source);
  assert.notDeepEqual(result, source);
});

test("der Stapel enthält 112 eindeutige doppelseitige Karten", () => {
  const deck = createDeck(seeded(11));
  assert.equal(deck.length, 112);
  assert.equal(new Set(deck.map((entry) => entry.id)).size, 112);
  assert.ok(deck.every((entry) => entry.light.side === "light" && entry.dark.side === "dark"));
});

test("zwei bis vier Spieler erhalten genau sieben Karten", () => {
  for (let count = 2; count <= 4; count += 1) {
    const game = createGame(
      Array.from({ length: count }, (_, index) => ({ id: `p${index}`, name: `P${index}` })),
      { random: seeded(count) },
    );
    assert.deepEqual(game.players.map((player) => player.hand.length), Array(count).fill(7));
    assert.equal(game.drawPile.length, 112 - count * 7 - 1);
    assert.equal(game.discardPile.length, 1);
  }
});

test("Farbe, Zahl, Symbol und Prisma bestimmen spielbare Karten", () => {
  const top = card("top", { color: "coral", type: "number", value: 7 });
  assert.equal(canPlayCard(card("color", { color: "coral", type: "number", value: 2 }), top, "light"), true);
  assert.equal(canPlayCard(card("number", { color: "aqua", type: "number", value: 7 }), top, "light"), true);
  assert.equal(canPlayCard(card("miss", { color: "aqua", type: "number", value: 2 }), top, "light"), false);
  assert.equal(canPlayCard(card("wild", { color: "wild", type: "wild" }), top, "light"), true);
  const actionTop = card("action-top", { color: "coral", type: "reverse" });
  assert.equal(canPlayCard(card("symbol", { color: "violet", type: "reverse" }), actionTop, "light"), true);
});

test("Flip dreht alle bestehenden Karten durch Seitenwechsel ohne Neuordnung", () => {
  const flip = card(
    "flip",
    { color: "coral", type: "flip" },
    { color: "aqua", type: "flip" },
  );
  const keep = card("keep", { color: "lime", type: "number", value: 3 });
  const game = stateWith([[flip, keep], [card("other", { color: "aqua", type: "number", value: 2 })]], card("top", { color: "coral", type: "number", value: 4 }));
  const beforeIds = [...game.drawPile, ...game.discardPile, ...game.players.flatMap((player) => player.hand)].map((entry) => entry.id).sort();
  const result = applyAction(game, "p1", { type: "play", cardId: "flip" }, { now: 100 });
  const afterIds = [...result.state.drawPile, ...result.state.discardPile, ...result.state.players.flatMap((player) => player.hand)].map((entry) => entry.id).sort();
  assert.equal(result.ok, true);
  assert.equal(result.state.side, "dark");
  assert.deepEqual(afterIds, beforeIds);
  assert.equal(result.state.discardPile.at(-1).id, "flip");
});

test("+2, +5 und Prisma +3 ziehen sofort und überspringen das Ziel", () => {
  for (const [side, type, count] of [["light", "draw2", 2], ["dark", "draw5", 5], ["dark", "wildDraw", 3]]) {
    const action = card(
      `action-${type}`,
      { color: "coral", type: side === "light" ? type : "number", value: side === "light" ? null : 1 },
      { color: type === "wildDraw" ? "wild" : "coral", type },
    );
    const spare = card(`spare-${type}`, { color: "coral", type: "number", value: 2 });
    const game = stateWith([[action, spare], [card(`target-${type}`, { color: "aqua", type: "number", value: 2 })], [card(`third-${type}`, { color: "lime", type: "number", value: 2 })]], card(`top-${type}`, { color: "coral", type: "number", value: 5 }), side);
    const before = game.players[1].hand.length;
    const result = applyAction(game, "p1", { type: "play", cardId: action.id, color: "violet" }, { random: seeded(2) });
    assert.equal(result.ok, true);
    assert.equal(result.state.players[1].hand.length, before + count);
    assert.equal(result.state.turnIndex, 2);
  }
});

test("Richtungswechsel und Alle-aussetzen ändern den nächsten Zug korrekt", () => {
  const reverse = card("reverse", { color: "coral", type: "reverse" });
  let game = stateWith([[reverse, card("r-spare", { color: "coral", type: "number", value: 1 })], [card("r2", { color: "aqua", type: "number", value: 2 })], [card("r3", { color: "lime", type: "number", value: 3 })]], card("r-top", { color: "coral", type: "number", value: 6 }));
  let result = applyAction(game, "p1", { type: "play", cardId: "reverse" });
  assert.equal(result.state.direction, -1);
  assert.equal(result.state.turnIndex, 2);

  const skipAll = card("skip-all", { color: "coral", type: "number", value: 1 }, { color: "coral", type: "skipAll" });
  game = stateWith([[skipAll, card("s-spare", { color: "coral", type: "number", value: 1 })], [card("s2", { color: "aqua", type: "number", value: 2 })], [card("s3", { color: "lime", type: "number", value: 3 })]], card("s-top", { color: "coral", type: "number", value: 6 }, { color: "coral", type: "number", value: 9 }), "dark");
  result = applyAction(game, "p1", { type: "play", cardId: "skip-all" });
  assert.equal(result.state.turnIndex, 0);
});

test("Letzte Karte kann gerufen werden; ein Versäumnis kostet zwei Karten", () => {
  const play = card("last-play", { color: "coral", type: "number", value: 2 });
  const game = stateWith([[play, card("last-keep", { color: "aqua", type: "number", value: 5 })], [card("last-other", { color: "lime", type: "number", value: 8 })]], card("last-top", { color: "coral", type: "number", value: 7 }));
  const played = applyAction(game, "p1", { type: "play", cardId: "last-play" }, { now: 1000 });
  assert.equal(played.state.pendingLastCall.playerId, "p1");
  const called = applyAction(played.state, "p1", { type: "call-last" }, { now: 2000 });
  assert.equal(called.ok, true);
  assert.equal(expireLastCall(called.state, { now: 5000 }).changed, false);

  const expired = expireLastCall(played.state, { now: 5000, random: seeded(3) });
  assert.equal(expired.changed, true);
  assert.equal(expired.state.players[0].hand.length, 3);
});

test("bei leerem Nachziehstapel wird die Ablage bis auf die oberste Karte recycelt", () => {
  const recycled = card("recycled", { color: "aqua", type: "number", value: 1 });
  const top = card("recycle-top", { color: "coral", type: "number", value: 9 });
  const game = stateWith([[card("hand-a", { color: "lime", type: "number", value: 2 })], [card("hand-b", { color: "violet", type: "number", value: 3 })]], top);
  game.drawPile = [];
  game.discardPile = [recycled, top];
  const result = applyAction(game, "p1", { type: "draw" }, { random: seeded(4) });
  assert.equal(result.ok, true);
  assert.equal(result.state.discardPile.length, 1);
  assert.equal(result.state.discardPile[0].id, top.id);
  assert.ok(result.state.players[0].hand.some((entry) => entry.id === recycled.id));
});

test("Client-Zustände enthalten nur die eigene Hand", () => {
  const game = createGame([{ id: "host", name: "Host" }, { id: "guest", name: "Gast" }, { id: "bot", name: "Bot", isBot: true }], { random: seeded(9) });
  const view = clientState(game, "guest");
  assert.equal(view.players.find((player) => player.id === "guest").hand.length, 7);
  assert.equal(view.players.find((player) => player.id === "host").hand, undefined);
  assert.equal(view.players.find((player) => player.id === "bot").hand, undefined);
  assert.equal("drawPile" in view, false);
});

test("Partien mit einem bis drei Bots laufen ohne Hänger bis zum Gewinner", () => {
  for (let bots = 1; bots <= 3; bots += 1) {
    const random = seeded(100 + bots);
    let game = createGame(
      [{ id: "human", name: "Mensch", difficulty: "normal" }, ...Array.from({ length: bots }, (_, index) => ({ id: `bot-${index}`, name: `Bot ${index}`, isBot: true, difficulty: index % 2 ? "easy" : "normal" }))],
      { random },
    );
    let moves = 0;
    while (!game.winnerId && moves < 4000) {
      const player = game.players[game.turnIndex];
      const action = chooseBotAction(game, player.id, random);
      assert.ok(action, "Jeder aktive Zug liefert eine Aktion");
      const result = applyAction(game, player.id, action, { random, now: moves * 10 });
      assert.equal(result.ok, true, result.reason);
      game = result.state;
      if (game.pendingLastCall && !game.pendingLastCall.called) {
        game = applyAction(game, game.pendingLastCall.playerId, { type: "call-last" }, { now: moves * 10 + 1 }).state;
      }
      moves += 1;
    }
    assert.ok(game.winnerId, `${bots} Bot(s) beenden die Partie`);
    assert.ok(moves < 4000);
  }
});
