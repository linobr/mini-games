# Mooslicht: Hausform und Gartenlounge, 15. September 2026

Überarbeitung des Originalspiels anhand der tatsächlich geöffneten lokalen
JPGs IMG_4286, IMG_4280 und IMG_4281. Proportionen sind aus den Fotos abgeleitet,
nicht vermessen. Der KI-Ableger bleibt unverändert.

## Änderungen

- Neben dem Balkon ersetzt ein vorspringender Quergiebel das bisherige hohe,
  flache Wandende. Ein niedrigeres Anschlussdach mit Dachfenster, Traufe und
  Fallrohren führt über die zurückgesetzte Fassade zur Lounge. Die doppelten
  Fenster hinter dem Balkon wurden entfernt; dessen eigene Verglasung bleibt.
- Die Lounge erhält helle, versetzte Steinverkleidung, ein gerahmtes Hausfenster,
  einen goldfarbenen Spiegelrahmen, zwei gefleckte Teppiche, ein dunkles Ecksofa
  mit Sitzpolstern und hellen Überwürfen, einen Holztisch mit Kufen, zwei helle
  Sessel, zusätzliche Vorhänge und hohe Kerzenhalter.
- Alle Oberflächen entstehen im Code. Keine privaten Fotos werden als Assets
  verwendet. Die Originaldateien sind weiterhin lokal von Git ausgeschlossen.
- Hauskörper, Giebel und Sessel besitzen passende vereinfachte Kollisionen.
  Fünf konservative Stufen schützen die Kamera am schrägen Giebel. Spiegelglas
  ist stilisiert und besitzt keine Echtzeitspiegelung.

## Prüfung

- `npm test`: 84/84 bestanden. Ein neuer Regressionstest prüft die vorspringende
  Fassade, die Giebelkollision und den freien Himmel über dem niedrigeren Hausende.
  Bestehende Laufwege, Balkonzugang, Story und Ressourcenbudgets bestehen.
- `npm run build`: erfolgreich einschließlich beider bestehender Spieleinträge.
  Unveränderte Vite-Warnung zum gemeinsamen Three.js-Chunk über 500 kB.
- Hohe Qualität: 349.711 Dreiecke; niedrige Qualität: 276.671. Jeweils 339 Meshes
  und 16 Schattenwerfer. Keine Budgetgrenze gelockert.
- Lokaler Edge, 1440 × 1000: Ansichten von Haus, Giebel, Anbau, Innenraum und
  Gartenblick aufgenommen und visuell geprüft. Ein Schattenmuster auf dem neuen
  Dach wurde durch korrigierte Flächennormalen und Schattenseiten behoben.
- Mit echten Tastatureingaben von der Terrasse um die Hausecke in die Lounge
  und zurück gelaufen; alle fünf Herzen erhalten. Vier separate Kameraumrundungen
  mit je 240 Schritten an Lounge, Sesseln, Giebel und Balkonecke: keine verbleibenden
  Kamerastrahlen durch massive Collider. Diese Umrundungen verwenden gezielt
  gesetzte Positionen; sie ersetzen nicht den separat gelaufenen Weg.
- Produktionsbuild in Edge: Startseite, Originalspiel, Start/Intro, Bewegung,
  Sprung, Aussehen speichern und laden, WebGL-Kontextwiederherstellung und
  Rücknavigation bestanden. Touchprüfung bei 390 × 844 mit gleichzeitigem
  Joystick und Sprung sowie Aussehensmenü ebenfalls bestanden. Keine JS-/WebGL-
  Fehler, Konsolenwarnungen oder fehlenden Assets in diesem Lauf.

Screenshots und Browserprüfskripte liegen ausschließlich unter
`%TEMP%/mooslicht-review/photo-refinement/`. Der integrierte Browser war nicht
verfügbar; der lokale Edge lief mit einem isolierten Testprofil. Beobachtungszugriffe
auf Spielzustand und Kamera wurden nur in lokalen Browserantworten ergänzt.
Produktionscode enthält keine Prüfschnittstelle. Keine neue FPS-Messung.
