# Mini Games

Eine kleine, erweiterbare Browser-Spielesammlung mit zwei Spielen:

- **Tic-Tac-Toe** für zwei Personen, online oder am gleichen Gerät
- **Turbo Bump** für zwei bis vier Personen – Autoscooter trifft Sumo

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

## Turbo Bump

Alle Fahrer bewegen sich gleichzeitig in einer schwebenden Arena. Ramme die
anderen Autos über den Rand, behalte deine drei Leben und überlebe als letzter
Fahrer. Nach 30 Sekunden beginnt die Arena zu schrumpfen. Einsammelbare
Blitz-Symbole liefern neue Boost-Ladungen.

### Steuerung

| Aktion | Desktop | Smartphone |
| --- | --- | --- |
| Gas | `W` oder `↑` | Taste `▲` |
| Bremsen / rückwärts | `S` oder `↓` | Taste `▼` |
| Lenken | `A` / `D` oder `←` / `→` | Tasten `←` / `→` |
| Boost | Leertaste | Taste `BOOST` |

Der Host erstellt den Raum und kann das Match ab zwei verbundenen Fahrern
starten. Die Lobby ist bei vier Fahrern voll. Der Host berechnet die Physik und
verteilt den Spielzustand; die übrigen Browser senden nur ihre Eingaben. Damit
bleibt das Match ohne eigenen Spielserver synchron.

## Technik

- JavaScript und Vite
- PeerJS/WebRTC für die direkte Verbindung zwischen den Spielern
- Keine Anmeldung und keine Speicherung persönlicher Daten
- GitHub Actions veröffentlicht Änderungen an `main` automatisch über Pages

PeerJS Cloud wird für den Verbindungsaufbau verwendet. Danach kommunizieren die
Browser über WebRTC direkt miteinander. Turbo Bump nutzt den Raum-Ersteller als
autoritativen Host; wenn dessen Browser geschlossen wird, endet der Raum.

## Lokal starten

Voraussetzung ist Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

## Weiterentwickeln

Die Startseite ist als Spiele-Hub aufgebaut. Turbo Bump liegt als eigenes Modul
in `src/turbo-bump.js` mit separaten Styles. Weitere Spiele können nach dem
gleichen Muster ergänzt und als zusätzliche Karten freigeschaltet werden.
