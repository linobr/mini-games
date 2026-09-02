# Mini Games

Eine kleine, erweiterbare Browser-Spielesammlung mit Spielen und einem interaktiven Lernmodul:

- **Tic-Tac-Toe** für zwei Personen, online oder am gleichen Gerät
- **Turbo Bump** für zwei bis vier Personen – Autoscooter trifft Sumo
- **Color Clash Flip** für eine bis vier Personen – ein eigenes doppelseitiges
  Kartenspiel mit Bots, lokalen und Online-Runden
- **Atom-Labor** zum interaktiven Nachbauen von Atomen im Bohrschen Schalenmodell

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

## Color Clash Flip

Color Clash Flip ist ein eigenständiges Kartenspiel mit eigenen Farben,
Symbolen und Kartengrafiken. Eine Karte passt, wenn Farbe, Zahl oder Symbol mit
der obersten Ablage übereinstimmt. Prisma-Karten erlauben eine freie Farbwahl.
Wer zuerst keine Karten mehr besitzt, gewinnt.

Jede physische Karte hat eine helle und eine dunkle Seite. Eine Flip-Karte
wechselt die aktive Seite aller Hände und Stapel, ohne Karten neu zu mischen.
Die helle Seite enthält Pause, Wende, +2, Prisma und Flip. Auf der dunklen Seite
warten Alle Pause, Wende, +5, Prisma, Prisma +3 und Flip. Strafkarten werden
sofort gezogen und nicht gestapelt.

### Spielmodi

- **Solo:** ein Mensch gegen 1–3 Bots; nach dem Laden der Seite ohne
  Internetverbindung spielbar
- **Online:** 2–4 Freunde per Raumcode oder Einladungslink
- **Gemischt:** der Online-Host kann freie Plätze mit Bots füllen
- **Pass & Play:** 2–4 Personen an einem Gerät mit Sichtschutz beim Wechsel

Bots gibt es in den Stufen Einfach und Normal. Einfache Bots wählen zufällig
aus erlaubten Karten. Normale Bots priorisieren Aktionen, reagieren auf kleine
gegnerische Hände und wählen bevorzugt eine häufige Farbe aus ihrer eigenen
Hand. Sie kennen keine fremden Handkarten.

### Bedienung

Spielbare Karten leuchten. Einmal antippen wählt eine Karte, ein zweites
Antippen oder **Karte spielen** legt sie ab. Der Nachziehstapel ist direkt in
der Tischmitte erreichbar. Nach einer spielbaren gezogenen Karte kann sie
sofort gelegt oder der Zug beendet werden. Bei nur noch einer Handkarte muss
innerhalb von drei Sekunden **Letzte Karte!** gedrückt werden, sonst folgen
zwei Strafkarten.

Die Hand ist auf Smartphones als horizontal wischbarer Kartenfächer am unteren
Rand angeordnet. Hochformat, iPhone-Safe-Areas und grosse Touch-Ziele werden
unterstützt. Ton und Bot-Schwierigkeit werden lokal als Einstellungen
gespeichert; Namen und Spielverläufe werden nicht dauerhaft gespeichert.

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

## Atom-Labor

Das Atom-Labor ist ein interaktives Chemie-Lernmodul für alle 118 bekannten
Elemente. Elemente können über Suche, Dropdown oder ein anklickbares
Periodensystem gewählt werden. Protonen, Neutronen und Elektronen lassen sich
einzeln verändern. Die Seite zeigt Element, Isotop, Massenzahl, Ionenladung,
Periode, Gruppe, Elektronenkonfiguration und die Elektronenverteilung im
vereinfachten Bohrschen Schalenmodell. Die Elementdaten liegen lokal im Projekt,
damit das Lernmodul ohne externe API funktioniert.

## Technik

- JavaScript und Vite
- PeerJS/WebRTC für die direkte Verbindung zwischen den Spielern
- Keine Anmeldung und keine Speicherung persönlicher Daten
- GitHub Actions veröffentlicht Änderungen an `main` automatisch über Pages

PeerJS Cloud wird für den Verbindungsaufbau verwendet. Danach kommunizieren die
Browser über WebRTC direkt miteinander. Turbo Bump nutzt den Raum-Ersteller als
autoritativen Host; wenn dessen Browser geschlossen wird, endet der Raum.

Color Clash Flip verwendet dasselbe Host-Prinzip: Nur der Host erstellt und
verwaltet den Kartenstapel, prüft Züge und steuert Bots. Gäste senden lediglich
gewünschte Aktionen. Jeder Gast erhält nur seine eigene Hand; von Gegnern wird
nur die Kartenanzahl übertragen. Es gibt keinen eigenen Backend-Server, keine
Datenbank und keine Accounts. Da WebRTC eine direkte Verbindung aufbaut, kann
der Onlinemodus in einzelnen restriktiven Netzwerken ohne TURN-Relay scheitern.

## Lokal starten

Voraussetzung ist Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

Regeltests und Produktionsbuild:

```bash
npm test
npm run build
```

## Weiterentwickeln

Die Startseite ist als Spiele-Hub aufgebaut. Turbo Bump liegt als eigenes Modul
in `src/turbo-bump.js`. Color Clash trennt die reine Regelengine
(`src/color-clash-engine.js`) von Oberfläche und Netzwerk
(`src/color-clash.js`). Weitere Spiele können nach dem gleichen Muster ergänzt
und als zusätzliche Karten freigeschaltet werden.
