# KI-Mooslicht – Live-Kopie

Eigenständige Kopie des geprüften Original-Mooslichts von Commit `3b4882d`.
Der Ausgangsstand enthält den erweiterten Garten mit Hausecke, Lounge und
begehbarem Balkon, Charakteranpassung, männliche Hosenform, Sonnensteuerung,
Ball, vier Nebeninseln, Hauptgeschichte und anschliessendes freies Erkunden.

**[Live-Spiel](https://linobr.github.io/mini-games/ki-mooslicht/)** · [Spieleübersicht](../README.md) · [Agent-Scope](../AGENT_SCOPE.md)

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

Voraussetzungen: Node.js 22.13.0 oder neuer und npm. Alle Befehle vom Repository-Stamm ausführen; dieser Unterordner ist kein separates npm-Projekt.

```bash
npm ci
npm test
npm run build
npm run preview
```

Die Preview verwendet normalerweise Port 4173:

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
Die Three.js-Lizenz steht in [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt). Bedienung und Abenteuer des Ausgangsstands beschreibt die [Original-Anleitung](../mooslicht/README.md).
