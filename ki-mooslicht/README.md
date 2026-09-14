# KI-Mooslicht · Live

Eigenständige Kopie des geprüften Original-Mooslichts von Commit `3b4882d`.
Der Ausgangsstand enthält den erweiterten Garten mit Hausecke, Lounge und
begehbarem Balkon, Charakteranpassung, männliche Hosenform, Sonnensteuerung,
Ball, vier Nebeninseln, Hauptgeschichte und anschliessendes freies Erkunden.

## Technische Trennung

- `index.html` lädt `./src/style.css` und `./src/main.js`.
- Alle 21 spielinternen Quell- und Stildateien liegen hier in `src/`.
  Keine Laufzeitimporte aus dem geschützten `src/mooslicht/`.
- Spielstand: `minigames.ki-mooslicht.v1`.
- Einstellungen inklusive Tageszeit: `minigames.ki-mooslicht.settings`.
- Das Original nutzt weiterhin seine eigenen `minigames.mooslicht.*`-Schlüssel.
  Bestehende KI-Spielstände werden kompatibel übernommen, keine Originalstände kopiert.
- Three.js und die vorhandene Vite-Buildkonfiguration bleiben gemeinsame
  Projektabhängigkeiten. Es gibt keine neue Renderpipeline.
- Modelle, Materialien und Himmel entstehen im Code; keine privaten Fotos
  oder externen Bilddateien sind für das Spiel erforderlich.

## Lokal prüfen

Vom Repository-Stamm: `npm test`, `npm run build` und `npm run preview`.

- Original: `http://localhost:4173/mini-games/mooslicht/`
- Live-Kopie: `http://localhost:4173/mini-games/ki-mooslicht/`

Die gemeinsame Startseite zeigt die Live-Kopie oben und das Original weiterhin
bei den normalen Games. Der Produktionsbuild übernimmt diese bestehende Anordnung.

## Spätere Jetson-Arbeit

Ausgangsbranch: `agent-live`. Der autonome Agent darf ausschliesslich Dateien
unter `ki-mooslicht/**` bearbeiten. `AGENT_SCOPE.md` im Repository-Stamm gilt
weiterhin. Das Original, andere Games und die Deploymentkonfiguration bleiben
geschützt. Diese Kopie enthält keine neue Agent-Infrastruktur.

Screenshots, Prüfskripte, Logs und private Referenzen gehören nicht ins Paket.
Die Three.js-Lizenz steht in `THIRD-PARTY-LICENSES.txt`.
