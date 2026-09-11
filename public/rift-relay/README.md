# RIFT//RELAY

Ihre Energie. Dein Gegenschlag. Ein Solo-Arcade-Spiel, in dem ein Dash
gegnerische Kugeln in zielsuchende Gegenangriffe umwandelt.

## Controls

| Aktion | Steuerung |
| --- | --- |
| Bewegen | WASD / Pfeiltasten |
| Dash + Kugeln umwandeln | Leertaste / Shift |
| Pause | Esc |
| Neuer Run | R; im Ergebnis auch Enter |
| Ton | M |
| Vollbild | F |
| Touch | Linker Joystick + DASH rechts |

## Gameplay

- Drei Hüllenpunkte, 180 Sekunden bis zum Abschluss.
- Dash in Bewegungsrichtung: 170 ms Unverwundbarkeit, Umwandlungsradius 52,
  920 ms Abklingzeit. Ohne neue Richtung gilt die letzte Bewegungsrichtung.
- Umwandlungen, Abschüsse, knappe Manöver und eingesammelte Energie halten die
  Kombo bis ×16. Nach 4,2 Sekunden ohne Aktion oder einem Treffer verfällt sie.
- Sender zeigen ihren nächsten Schuss an. Später kommen Fächer und Verfolger.
- Nach 60 und 120 Sekunden öffnet sich die Arena und ein Kern erscheint.
  Kernzerstörung repariert einen Hüllenpunkt und wandelt aktive Kugeln um.
- Pulsringe haben eine sichtbare Lücke. Sie lassen sich auch im Dash durchqueren.
- Helle Rauten geben Punkte und Dash-Energie; Kreuze reparieren die Hülle.
- Daily Runs verwenden das UTC-Datum als Seed. Gleiche Eingaben bei gleichem
  Seed erzeugen dieselbe Simulation. Gegner reagieren auf die Spielerbewegung;
  es gibt keinen Online-Leaderboard-Dienst oder Anti-Cheat-Anspruch.
- Zwölf lokale Erfolge. SOLAR wird nach 60 Sekunden, FROST bei 10 000 Punkten
  freigeschaltet. Signalfarben sind rein kosmetisch.
- Abgebrochene Runs werden nicht gewertet. Rekorde werden am Ergebnisbildschirm
  gespeichert, Einstellungen sofort. Bei blockiertem Speicher gilt Sitzungsmodus.

## Running locally

Im Repository: `npm install`, danach `npm run dev` und `/mini-games/rift-relay/`
öffnen. `npm run build` kopiert das eigenständige Spiel unverändert nach
`dist/rift-relay/`. Der bestehende Pages-Workflow veröffentlicht `dist`.

Alternativ aus diesem Ordner: `python3 -m http.server 8080` und
`http://localhost:8080/` öffnen. Ohne Build oder npm verwendbar. Der Link
«Mini Games» setzt voraus, dass das Spiel unterhalb der Spieleübersicht liegt.

## Technology

Vanilla ES-Module, Canvas 2D, Web Audio und localStorage. Keine neuen
Abhängigkeiten oder externen Anfragen. Schriften verwenden eine bewusst
gewählte lokale Font-Kombination. Arena, Geometrie, Symbole, Partikel und
Sounds werden prozedural erzeugt. UI und Simulation sind getrennt.

- `engine.js`: reine Simulation ohne DOM oder Audio, Seed und Kollisionsprüfung
- `renderer.js`: Canvas, vorberechneter Arenaboden, Glow-Sprites, Effekte
- `input.js`: Tastenzustände und Pointer-Steuerung
- `audio.js`: kurze synthetische Sounds und adaptiver Sequencer
- `storage.js`: validierte lokale Einstellungen, Erfolge und Statistiken
- `main.js`: Zustandswechsel, UI, fester Simulationsschritt und Lifecycle

## Performance

Ziel sind 60 FPS; die tatsächliche Rate hängt von Gerät und Browser ab.
120-Hz-Simulation mit Akkumulator, höchstens 100 ms nachzuholender Frame-Zeit.
Swept-Kollisionen berücksichtigen die Bewegung von Spieler und Kugel. Ein
einziger RAF-Loop bleibt über alle Neustarts bestehen. Fokusverlust pausiert
Gameplay; Ton beginnt erst nach einer Nutzeraktion.

Feste Pools: 260 Kugeln, 18 Sender, 24 Pickups, vier Pulsringe, 360 Partikelplätze,
18 Effekt-Ringe, 16 Score-Labels und 36 Trail-Punkte. Gerendert werden je nach
Qualität höchstens 50 / 150 / 300 Partikel. DPR ist auf 1,75 begrenzt (1,25 bei
niedriger Qualität). Automatik reduziert bei dauerhaft langsamen Frames die
Effekte und erholt sich bei stabiler Framerate. Spielregeln bleiben gleich.

`?debug=1` zeigt FPS, Frame-Zeit, Objektzahlen, Qualität und Spielerposition.
Grafik-, Audio-, Bewegungs- und Shake-Einstellungen sind im Menü erreichbar.

## Validation

`npm test` führt die vorhandenen Kartenspieltests sowie die RIFT//RELAY-Tests
aus: deterministische Simulation, framerateunabhängige Bewegung, Dash- und
Trefferkollisionen, Kombos, Arenaereignisse, Neustarts, Speicherfehler und
vollständige Runs mit begrenzten Pools. `npm run build` prüft die Integration.

Die Browser-Vorschau war in der Erstellungsumgebung durch deren URL-Richtlinie
blockiert. Eine echte Browser-, Touch-, Audio- und Sichtprüfung sowie eine
60-FPS-Messung auf Endgeräten sind deshalb noch offen.
