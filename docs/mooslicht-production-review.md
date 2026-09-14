# Original Mooslicht: Produktionsabnahme, 14. September 2026

Diese Abnahme ergänzt das historische [Gartenprotokoll](mooslicht-garden-review.md).
Insbesondere ist der dort noch nur angedeutete verglaste Sitzbereich jetzt
eingerichtet und begehbar. Die Arbeit betrifft das Original unter `mooslicht/`
und `src/mooslicht/`. Der bereits auf GitHub vorhandene KI-Ableger wurde nicht
bearbeitet. Dessen Remote-Commits und vorhandene Build-Einbindung wurden vor dem
Release unverändert per Fast-Forward übernommen.

## Garten und Architektur

- Orientierung: Beim Blick vom Kies-/Bananenrasen zum Gartenhaus ist links die
  negative X-Richtung. Die Fortsetzung biegt an der Hausstirnseite bei Z=50 nach
  links ab. Eine echte seitliche Fassade fasst die hintere Terrasse ein.
- Rasen, schmaler Kiesstreifen, Einfassung und Trittplatten führen zusammenhängend
  um diese Ecke bis zum offenen Glaszimmer. Gelände, Inselunterseite, Ball,
  Kollisionen, Kamera, Karte und Übersicht verwenden den erweiterten Grundriss.
  Die konkave Inseloberfläche wird trianguliert; keine alte Rechteck-Absturzgrenze.
- Balkon mit begehbarer grauer Bodenplatte, Tür, hellen Geländern, schlanken
  Stützen, getrennten Markisen, Pflanzkästen, zwei runden Sesseln, kleinem Tisch
  und zwei Liegen. Zugang über bestehenden Holzaufstieg und Höhenweg, ergänzt
  um eine Verbindung mit ebenem Eintritt in den Balkonboden.
- Glaszimmer mit dunklen Dielen, hellen Fensterrahmen, offenem Zugang, gefalteten
  zurückgebundenen Vorhängen, grauem Ecksofa, Kissen und niedrigem Holztisch.
  Leicht transparentes Glas ohne zusätzliche Spiegel-Renderpipeline.
- Bestehende Essterrasse und Gartenhaus erhalten. Feinere Heckenvolumen,
  deutlich kürzerer Rasen, kleine fünfblättrige weiße Blüten und dunkle flache
  Kiesmöbel. Bananenstaude und Fächerpalme bleiben deutlich unterscheidbar.

Alle 14 tatsächlichen JPG-Motive wurden geöffnet und betrachtet:
IMG_4271–4276 und IMG_4280–4287. Grundriss und Blickachsen vor allem aus
4271/4272/4273/4276/4282/4283/4284/4285/4286; Essterrasse aus 4274,
Kiesmöbel aus 4272/4275, Glaszimmer aus 4280/4281, Balkon aus 4284/4287.
JPG/DNG-Dubletten zählen nicht doppelt. Relative Proportionen, keine Vermessung.
Die zwei im Auftrag genannten UUID-Screenshots waren lokal nicht auffindbar;
stattdessen wurden neue Ausgangsaufnahmen des vorhandenen Builds aufgenommen.
Private Fotos sind lokal ausgeschlossen und wurden weder verändert noch kopiert,
als Texturen eingebunden oder für den Commit vorgemerkt.

## Aussehen

Zwei dezente Grundvarianten (männlich/weiblich), drei Frisuren (Locken, kurz,
lang), sechs Haarfarben, sechs Hauttöne, vier Augenfarben einschließlich Blau
und fünf Outfitfarben. Augen, Brauen, Ärmel, Gürtel und Schuhe sind ausgearbeitet.
Beide Varianten haben identische Bewegungs- und Kollisionsparameter.

„Aussehen“ ist im Startmenü und während der Reise über Pause erreichbar.
Eine gemeinsame Modellfabrik erzeugt Spielfigur und neutral beleuchtete Vorschau.
Ziehen/Pfeiltasten drehen, Mausrad/Tasten zoomen begrenzt; „Ansicht zurück“ bzw.
Pos1 setzt die Kamera zurück. Änderungen sind Entwürfe: Übernehmen speichert,
Abbrechen/Escape verwirft, Standardaussehen bleibt bis Übernehmen reversibel.
Die Welt pausiert, Eingaben werden zurückgesetzt, vorheriger Pausenzustand bleibt.
Alte Spielstände erhalten Standardwerte, unbekannte Optionen werden validiert.
Geladen wird weiterhin an vorhandenen sicheren Checkpoints; Storydaten bleiben.

## Tatsächlich durchgeführte Browserprüfungen

Lokaler Microsoft Edge mit isolierten Testprofilen; persönliche Spielstände
wurden nicht gelöscht. Automatisierte Läufe benutzen echte DOM-Tastatur- und
Mauseingaben. Beobachtungszugriffe lesen Spielzustand und Renderer; sie ersetzen
keine Bewegung. Gezielte Randfall- und Lichttests sind getrennt davon aufgeführt.

- Frischer Start, Intro, Lumi-Dialog, Klangblüten, drei Wächter mit Schwert,
  Steinschrein, sämtliche Palmenstufen und Windfunken, drittes Licht, Rückkehr zum
  Herzbaum, Finale, Weitererkunden und Fortsetzen nach Neuladen: vollständig mit
  normalen Eingaben gespielt, ohne Fortschritt oder Positionen zu setzen.
- Alle vier Nebeninseln über die vorhandenen Sprungwege besucht und zurückgekehrt.
- Garten bis zur Hausecke, um die Rundung ins Glaszimmer und zurück gelaufen.
  Im Produktionsbuild nochmals mit weiblicher Figur absolviert, einschließlich
  Übersicht und Karte. Keine Teleportation als Ersatz für diesen Weg.
- Balkon über Holzaufstieg, Dach und Höhenweg betreten, beide Möbelbereiche
  begangen, Kamera gedreht und vollständig zurückgelaufen. Auch im Produktionsbuild.
- Beide Varianten, alle Frisuren und Farben, Drehen/Zoomen, Abbrechen, Reset,
  Übernehmen, Neuladen, Laufen und Springen geprüft. Wiederholte Öffnung und
  Entsorgung/Neuinitialisierung der Vorschau ebenfalls geprüft.
- Unter Tisch, Hausecke, Glaszimmer, Balkonecke, Balkonboden, Banane und Kies:
  sieben zusätzliche Kamerarundläufe à 240 Schritte. Keine verbleibenden
  Kollisionsstrahlen durch massive Bauteile. In sehr engen Übergängen wird die
  Figur kurz ausgeblendet; danach kehrt sie zurück. Die echte Laufprüfung hat
  zusätzlich einen zunächst zu späten Kameraausweichbeginn aufgedeckt und korrigiert.
- Ballkontakt mit normalen Eingaben; begrenztes Rollen und Objektkollisionen.
  Absturz an neuer Inselkante und Spieler-Respawn separat als Randfälle gesetzt
  und im laufenden Spiel geprüft. Ball und Figur kehren an sichere Startpunkte zurück.
- Tag, Golden Hour, Nacht und Galaxy; normale Gartenperspektiven, Inselübersicht,
  Rand, Glaszimmer und Balkon. Screenshots tatsächlich geöffnet und beurteilt.
  Fünf Referenzvergleiche: Bananenrasen → Terrasse (4284), Terrasse → Gartenhaus
  (4285), Gartenhaus → Haus (4286), Rasen → Kies (4272/4275), Glaszimmer (4280/4281).
- Produktionsprüfung nach Übernahme der Remote-Build-Konfiguration: Hauptseite,
  Original-Mooslicht-Link, Start, Speichern/Laden, Pause und Rücknavigation.
  Desktop 1440×1000; zusätzlich Touch-Emulation 390×844 mit echtem CDP-Touchinput,
  Joystick und gleichzeitigem Sprung, Eingabefreigabe und Aussehensmenü.
- Absichtlich verlorener WebGL-Kontext zeigt den vorhandenen Wiederladehinweis;
  anschließend erfolgreicher Neustart. Keine unerwarteten JS-/WebGL-Fehler oder
  fehlenden Assets im abschließenden Produktionslauf.

Die reinen Ingame-Aufnahmen und temporären Prüfläufe liegen außerhalb des Repos
unter `%TEMP%/mooslicht-review/final-round/`. Drei unverfälschte Vergleichsbilder:
`vergleich-banana-high.png`, `vergleich-palm-high.png`, `vergleich-shed-high.png`.
Jeweils gleiche Spielerposition, Kamera, Tagesphase und Auflösung; Ausgangscode
dieser Runde separat gesichert, ohne Arbeitsdateien zurückzusetzen. Weitere
aussagekräftige Bilder: `production-overview-map.png`, `production-turn.png`,
`production-rear.png`, `production-balcony-above.png`, `production-balcony-below.png`,
`production-final-appearance.png` und `production-appearance-masculine.png`.
Diese Dateien gehören nicht zum öffentlichen Asset-Paket.

## Performance und Ressourcen

Edge Headless, NVIDIA RTX 2070 SUPER / ANGLE D3D11, 1440×1000, Pixelratio 1,
Tagesphase 0, normale Folgekamera, je 2 Sekunden Aufwärmen und 10 Sekunden Messung.
Alte Quellen dieser Runde und neuer Stand unter gleichen Bedingungen. Werte sind
Headless-Beobachtungen, keine Garantie für sichtbaren Desktop oder andere Geräte.

| Ansicht / Qualität | FPS vorher → nachher | p95 vorher → nachher | Draw Calls vorher → nachher | Dreiecke nachher |
| --- | --- | --- | --- | --- |
| Bananenrasen / Hoch | 239,8 → 239,2 | 4,3 → 4,3 ms | 335 → 337 | 338.649 |
| Terrasse/Palme / Hoch | 239,8 → 239,2 | 4,3 → 4,3 ms | 268 → 262 | 317.995 |
| Gartenhaus / Hoch | 239,8 → 239,7 | 4,3 → 4,3 ms | 189 → 199 | 317.914 |
| Bananenrasen / Niedrig | 239,8 → 239,8 | 4,3 → 4,3 ms | 317 → 319 | 263.025 |
| Hintere Terrasse / Hoch (neu) | — → 239,8 | — → 4,3 ms | — → 327 | 334.527 |

Zwei einzelne Ausreißer von 25,0 bzw. 25,1 ms in den ersten beiden neuen Messungen;
sonst maximal 8,3 ms. Keine dauerhafte Einbruchserie. Die letzten Änderungen am
Kameraverhalten sind enthalten; die danach minimal versetzte Kostümbrosche ändert
weder Geometrieanzahl noch Material oder Renderpfad.

Welt: 58 Geometrien, 2 Texturen, 301 Materialien (vorher 44/2/315).
Vorschau nach fünf gleichen Öffnungs-/Optionszyklen konstant: 7 Geometrien,
0 Texturen, 16 Materialien; erfasste Listenerregistrierungen konstant 126.
Nach dem Schließen bleibt der Vorschau-Framezähler stehen. Kein zweiter Renderloop.
Bestehende Testbudgets unverändert: Hoch <350.000 Dreiecke, Niedrig <280.000,
<340 Meshes, höchstens 20 Shadow-Caster und <100 massive Collider.

## Release-Prüfung

- `npm test`: 77/77 bestanden, einschließlich acht neuer sinnvoller Gelände-,
  Speicher-, Entwurfs-, Ressourcen- und Kollisionsprüfungen. Bestehende Tests nicht
  gelockert; der alte radiale Außenkantentest wurde für die konkave Form auf die
  tatsächliche lokale Außennormale umgestellt und durch Flächenabdeckung ergänzt.
- `npm run build`: erfolgreich, einschließlich unverändert übernommener
  Live-Game-Injektion. Vite warnt weiter bei >500 kB: gemeinsamer Three.js-Chunk
  ca. 534,39 kB nach Einbindung beider existierender Einträge. Warnschwelle unverändert.
- Keine neuen produktiven Bilddateien nötig: Ein kleines eingebettetes SVG-Favicon
  der Hauptseite behebt deren bisherige `/favicon.ico`-404-Anfrage.
  Geometrie, Dielen, Kies, Blüten,
  Figur und kleine Texturen entstehen prozedural. Keine privaten Fotos,
  Entwicklungs-Dateipfade, Debug-Hooks, Testprofile oder Zugangsdaten im Spielpaket.
- Änderungen auf Original-Spiel, zugehörige Tests, Review-Dokumentation und den
  einzelnen Favicon-Eintrag der Hauptseite begrenzt.
  Andere Games und `ki-mooslicht/` wurden nicht bearbeitet.

Gestalterische Grenzen: Hecken und Möbel bleiben sichtbar stilisiert; Proportionen
beruhen auf Fotos statt Messungen. An extrem engen Geländer-/Wandecken schwenkt
die Kamera merklich ein. Keine bekannten Abstürze oder Fortschrittsblockaden im
beschriebenen Prüfumfang; dies ist keine pauschale Behauptung völliger Fehlerfreiheit.
