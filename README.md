# Mini Games

Eine kleine, erweiterbare Browser-Spielesammlung. Version 1 enthält
Tic-Tac-Toe für zwei Personen.

## Spielen

Nach der ersten erfolgreichen GitHub-Pages-Veröffentlichung ist die Seite unter
`https://linobr.github.io/mini-games/` erreichbar.

## Funktionen

- Online-Räume mit sechsstelligen Einladungscodes
- Direkter Einladungslink und Teilen-Funktion
- Lokaler Modus für zwei Spieler am gleichen Gerät
- Synchronisiertes Spielfeld, Rundenzähler und Punktestand
- Responsive Oberfläche für Smartphone und Desktop
- Startseite als Basis für weitere Spiele

## Technik

- JavaScript und Vite
- PeerJS/WebRTC für die direkte Verbindung zwischen den Spielern
- Keine Anmeldung und keine Speicherung persönlicher Daten
- GitHub Actions veröffentlicht Änderungen an `main` automatisch über Pages

PeerJS Cloud wird für den Verbindungsaufbau verwendet. Nach erfolgreicher
Verbindung werden die Spielzüge direkt zwischen den Browsern übertragen.

## Lokal starten

Voraussetzung ist Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

## Weiterentwickeln

Die Startseite ist bereits als Spiele-Hub aufgebaut. Neue Spiele können später
als eigene Module ergänzt und als zusätzliche Karten freigeschaltet werden.
Als nächster Kandidat ist **Vier gewinnt** vorgesehen.
