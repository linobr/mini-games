# Mooslicht – Garteniteration, 14. September 2026

Historisches Iterationsprotokoll. Der aktuelle Abschlussstand einschließlich
Hausecke, Balkon, Glaszimmer und Charakteranpassung ist in der
[Produktionsabnahme](mooslicht-production-review.md) dokumentiert.

Die bestehende Gartenwelt wurde entlang ihrer Haus-/Heckenachse erweitert. Hütte,
Palme, Herzbaum, Rätsel, Speicherformat und ursprüngliche Kontrollpunkte bleiben
erhalten. Die Terrasse verbindet jetzt beide Rasenbereiche; der zweite endet am
gerundeten Kies-Sitzplatz. Die Blüteninsel liegt vor dem neuen Inselrand bei Z=87,
ihr Sprungweg beginnt bei Z=72. Die anderen drei Nebeninseln bleiben unverändert.

## Referenzanalyse

Alle 14 JPGs wurden angesehen; keine Referenzdatei wurde verändert oder als
Spielasset verwendet. Die Fotos sind weiterhin über `.git/info/exclude` lokal
ausgeschlossen. Massangaben fehlen: Die Proportionen sind aus überlappenden
Perspektiven rekonstruiert, keine vermessene Kopie.

| JPG | Verwendete räumliche Information |
| --- | --- |
| IMG_4271 | Blick von oben: Haus links, Hütte hinten, Steinweg, Palme vorne |
| IMG_4272 | Gegenrichtung von oben: zweiter Rasen, Bananenstaude, Kies-Sitzplatz |
| IMG_4273 | Terrassentisch und Übergang über Palme/Steinweg zur Hütte |
| IMG_4274 | Geflechttisch mit Glasplatte, zwei Liegen gegenüber an der Hecke |
| IMG_4275 | Terrasse → zweiter Rasen → helle Kiesfläche mit geschlossener Schirmhülle |
| IMG_4276 | Gegenblick vom Kies: gerundete Rasenkante, Haus und Bananenstaude |
| IMG_4280/4281 | Innenraum-/Schwellenperspektiven; Holzrichtung und Gartenorientierung |
| IMG_4282/4283 | Rasenkanten, Kiesübergänge, Position der Bananenstaude am Haus |
| IMG_4284 | Lange Sichtachse: zweiter Rasen → Terrasse → Palme → Gartenhaus |
| IMG_4285/4286 | Gegenblicke zwischen Holzterrasse, Palme, Baum und Gartenhaus |
| IMG_4287 | Balkonmöbel/-geländer; nicht mit der ebenerdigen Terrasse verwechselt |

## Visuelle Schleifen

1. **Geometrie:** Gesamtinsel, Terrasse, Rückblick und Kies von oben in Edge geprüft.
   Flimmernde, zu nahe Bodenflächen und leere neue Rasenfläche erkannt.
2. **Objekte:** Dielenfugen, Geflecht, Glasplatte, Tisch-/Stuhlbeine, geneigte Liegen,
   Kiesrand und Bananenstaude ergänzt. Boden mit Polygonoffset stabilisiert.
   Geometriebudget zunächst überschritten; kleine Kiesel und Blüten vereinfacht,
   bestehende Testbudgets unverändert beibehalten.
3. **Atmosphäre:** Tag, goldene Stunde, Dämmerung, Nacht, Galaxie, Hauptinsel von
   oben und Felsunterseite geprüft. Schattenbereich auf den erweiterten Garten
   angepasst, Wurzeln/Adern über die neue Küste geführt, ferne Felsen nach aussen
   gerückt. Hecken und Fantasysysteme bleiben erhalten.
4. **Kamerapolish:** Normale Folgekamera an elf Positionen überprüft. Dominantes
   Tischbein im Startblick durch kleinere Tischproportionen und versetzte Beine
   korrigiert. Freier ursprünglicher Laufkorridor und Startblick erneut geprüft.
   Kürzerer zweiter Rasen macht den Ball sichtbar. Übersicht und Karte zeigen den
   vollständigen erweiterten Garten.

Screenshots und die lokalen Browserprüfskripte liegen ausschliesslich unter
`%TEMP%/mooslicht-review/`, ausserhalb von Repository und Produktionsassets.
Die integrierte Browserverbindung war nicht verfügbar. Die Prüfung erfolgte mit
lokalem Edge über Playwright, auf der tatsächlich gestarteten Vite-Anwendung.
Review-Zugriff auf Kamera/Spielzustand wurde nur in Browserantworten injiziert;
der Produktionscode enthält dafür keine Debug-Schnittstelle.

## Spielprüfung und Budget

- Echte Tastaturbewegung unter dem Tisch bis zum zweiten Rasen: erfolgreich,
  fünf Herzen erhalten. Normale Folgekamera bei Hütte, Palme, Liegen, Tisch,
  Terrassenkante, Kiesrundung und Gegenblick überprüft.
- Ball per Anlaufen bewegt; begrenzte Geschwindigkeit, Reibung und Reflexion
  an vorhandenen Kollidern. Verzögerte Rückkehr bei Absturz, längerer Entfernung
  oder festgestelltem Feststecken. Ballzustand wird nicht gespeichert.
- Pause/Fortsetzen, Karte und Übersicht über die tatsächliche Oberfläche getestet.
- 69 Tests erfolgreich: alle bisherigen 64 plus fünf neue Regressionstests.
  Storydurchlauf, Speicherkompatibilität, Respawn, vier erreichbare Nebeninseln,
  Geometrie-/Schattenbudgets und neue Kollisionen sind abgedeckt.
- Der Nebeninseltest verwendet für die verlegte Blüteninsel deren tatsächliche
  Koordinaten und prüft zusätzlich den Boden unter dem Spieler auf der Zielinsel.
  Keine Testgrenze wurde gelockert.
- Edge, 1440 × 1000, RTX 2070 SUPER / ANGLE D3D11: etwa 240 FPS über je
  240 Frames in hoher und niedriger Qualität, p95 rund 4,3 ms. Dies ist eine
  lokale Headless-Messung, keine Zusage für andere Geräte oder Auflösungen.
- Keine JavaScript-, Shader- oder WebGL-Fehler in den Browserprüfungen.
- `npm run build` erfolgreich; Vite meldet einen minifizierten JS-Chunk über
  500 kB (ca. 626 kB unkomprimiert nach Minifizierung / 169 kB gzip).
- Produktionsartefakt zusätzlich über Vite Preview auf Port 4173 in Edge
  gestartet: Start, übersprungene Ankunftssequenz und Übersicht ohne Fehler.

## Bewusste Grenzen

Die Möbelsilhouetten sind stilisiert, die Kollisionsformen vereinfacht. Glas hat
einen günstigen Glanz statt einer zusätzlichen Echtzeit-Spiegelung. Der Ball ist
ein frei spielbares Spielzeug ohne Tor- oder Punktesystem. Wintergarten, kompletter
Balkon und botanische Feindetails bleiben mögliche spätere Vertiefungen.

Kein Commit und kein Push ausgeführt.

## Zweite Überarbeitung – 14. September 2026 (Browserabnahme abgeschlossen)

Die obigen Browser- und FPS-Ergebnisse gehören zur vorigen Iteration, nicht zu
diesem neuen Stand. Für diese Überarbeitung wurden IMG_4271, IMG_4272, IMG_4274,
IMG_4281, IMG_4282, IMG_4283, IMG_4284, IMG_4285, IMG_4286 und IMG_4287 als JPG
tatsächlich angesehen. Der obere Balkon in IMG_4287 wurde von der Gartenterrasse
und der verglaste Sitzbereich in IMG_4281 vom separaten Gartenhaus unterschieden.

Implementierter erster Durchgang:

- Dichter Bananenhorst aus unterschiedlich hohen Scheinstämmen, breiten gebogenen
  Blättern auf mehreren Höhen, Mittelrippen, einzelnen Einrissen und jungen Blättern.
- Fächerpalme mit kürzeren Stielen, gefalteten überlappenden Fächern und Stammfasern.
  Hausnahe Position aus den Gegenansichten; Aufstiegssteine, Windfunken, Schrein,
  Checkpoint und Kartenposition folgen gemeinsam. Save-IDs bleiben unverändert.
- Tisch längs zur Fassade mit entsprechend gedrehten Stühlen, dünnem Rahmen und
  dunkler Glasfläche. Möbelkollisionen verwenden dieselben Abmessungen.
- Tieferer Balkon, zwei schlanke Stützen, obere Verglasung und eine durchgehende
  helle Stoffmarkise. Balkonplatte und Stützen schützen die Kamera; die Platte ist
  als Oberfläche berücksichtigt. Der bisherige Fantasy-Aufstieg bleibt begehbar,
  hat aber eine dünne Bandfläche statt dominanter Querklötze.
- Dunkles Graubraun mit zurückhaltender Dielenvariation, feinerer heller Kies und
  schmale graue Einfassungen an Sitzplatz und Baumring.
- Überlappende Heckenvolumen, kleinere Außenblätter, weiße Blüten am Terrassenrand,
  kurzer Rasen und feine Bodenvariation anstelle großer radialer Farbdreiecke.
- Neutraleres Tageslicht, Himmelslicht und Nebel; Nacht-/Galaxy-System erhalten.

Aktuelle technische Prüfungen: `npm test` 69/69 erfolgreich, `npm run build`
erfolgreich (bestehende Warnung zum JS-Chunk über 500 kB; jetzt ca. 630 kB / 171 kB
gzip). Finaler Build: 630,59 kB / 170,86 kB gzip. Szene: Hoch 344.163 Dreiecke,
Niedrig 271.123; 326 Meshes und 14
Schattenwerfer. Die bestehenden Budgetgrenzen wurden nicht verändert.

Der Ball-Kollisionstest verwendet nun PALM.x/PALM.z statt der alten fest
eingetragenen Stammposition; Prüfkriterien bleiben identisch. Vollständiger
Storydurchlauf, vier Nebeninseln, neuer Palmaufstieg und Tischdurchgang bestehen.

Mit ausdrücklicher Zustimmung des Benutzers wurde lokaler Edge verwendet.
Vite auf Port 5173 und abschließend der frisch gebaute Produktionsstand auf
Port 4173 wurden gestartet und über Browser-Screenshots tatsächlich angesehen.

Im Browser gefundene und korrigierte Fehler:

- Der neue Rasenshader verwendete das reservierte GLSL-Wort `patch`. Dadurch war
  der Inselboden zunächst nicht renderbar. Umbenennung zu `turfPatch`; alle
  anschließenden Shaderkompilierungen waren fehlerfrei.
- Die erste Palmform hatte drei künstliche Blattetagen. Blattansätze und Neigungen
  sind nun unregelmäßig verteilt; die obere Krone überlappt dichter.
- Separat modellierte Bananen-Mittelrippen lagen stellenweise neben der gekrümmten
  Blattfläche. Die Rippen sind jetzt Teil derselben Geometrie, ohne zusätzliche
  Stabmeshes. Rasen weiter gekürzt; weiße Blüten als kleine fünfblättrige Formen
  auf die sichtbare Seite des Strauchs gesetzt.
- Der Pfosten des Fantasy-Aufstiegs ist schlanker; sein Kollisionsradius wird
  gemeinsam für Bewegung, Ball und Kamera verwendet.
- Die vorhandene Sichtbarkeitshilfe zeigte zuvor die Rückseiten der Figur durch
  deren eigene Körperteile. Eine Stencil-Maske schützt jetzt sichtbare Figurenpixel.
  Die Hilfe bleibt hinter der Tischplatte sichtbar. Kein zusätzlicher Render-Pass.
- Kamera zieht vor dünnen Möbelbeinen und Balkonstützen früher ein und fährt
  anschließend langsamer aus. Sie berücksichtigt die nächste Dreh-/Neigungsumgebung,
  ohne Pflanzenblätter zu Kamerahindernissen zu machen oder pro Frame Objekte anzulegen.

Visuelle Vergleiche und Funktionsprüfungen:

- Ausgangszustand aus lokal gesichertem Quellcode im Browser rekonstruiert, ohne
  Arbeitsdateien zurückzusetzen. Vergleich mit identischen Spielerpositionen,
  Orbitwinkeln, Tagesphase 0 und 1440 × 1000 Pixeln, hoher Grafikqualität.
- Normale Folgekamera: Bananenrasen → Terrasse (IMG_4284), Gartenhaus → Terrasse/Haus
  (IMG_4286), Rasen → Kies-Sitzplatz (IMG_4272/4283), zusätzlich alter Gartenbereich.
- Weitere bodennahe Ansichten: Terrasse → Palme/Baum/Gartenhaus (IMG_4285), kompletter
  Terrassenblick, Rückblick vom Kies. Übersicht, Inselunterseite, Golden Hour, Nacht
  und nach oben gerichteter Galaxy-Blick ebenfalls selbst angesehen.
- Erster Browserdurchgang, Korrekturdurchgang und gezielter abschließender Polish
  wurden jeweils mit neuen Screenshots überprüft.
- Echte Tastaturbewegung durch den Tischbereich, Springen/Landen und Ballkontakt
  erfolgreich. Ball rollte über z=43 mit begrenzter Geschwindigkeit. Ball-Absturz
  und Spieler-Respawn zusätzlich in der laufenden Browseranwendung simuliert;
  Ball kehrt nach (-3, 0,75, 40), Spieler zum Home-Checkpoint zurück.
- Sieben komplette Kameraumrundungen mit je 180 Schritten an Tisch, Stühlen, Liegen,
  Balkon, Palme, Banane und Kies: kein verbleibender Schnitt zwischen Kamerastrahl
  und den massiven Kollidern. Bei dieser schnellen Drehung sank der größte
  Kameraschritt am Balkon von ca. 1,89 auf 0,75 Welteinheiten; enge Stellen ziehen
  die Kamera weiterhin sichtbar ein. Die sichtbaren Ansichten wurden separat geprüft.
- Keine JS-, Shader-, WebGL- oder Kontextwarnungen im abschließenden Funktionslauf;
  keine JS-/WebGL-Fehler beim Start des Produktionsbuilds.
- `npm test`: abschließend 69/69 erfolgreich. `npm run build`: erfolgreich mit der
  unveränderten Vite-Warnung zum großen JS-Chunk. Tests und Budgets nicht gelockert.
- Performance: Edge Headless, 1440 × 1000, NVIDIA RTX 2070 SUPER / ANGLE D3D11.
  Nach 120 Aufwärmframes über je 600 Frames auf Hoch und Niedrig ca. 239,8 FPS,
  p95 4,3 ms, Maximum 4,4 ms und keine Frames über 16,67 ms. Eine vorherige kurze
  Stichprobe direkt beim Wechsel auf Niedrig hatte einen Ausreißer (Durchschnitt
  137,6 FPS bei p95 4,3 ms); die längere Kontrolle reproduzierte ihn nicht.
  Kein Nachweis einer dauerhaften Performanceverschlechterung, keine Garantie
  für andere Geräte, Auflösungen oder einen durchgehend störungsfreien Desktop.

Drei Vergleichsbilder (links vorher, rechts nachher), ausschließlich Ingame-Pixel:
`%TEMP%/mooslicht-review/vergleich-banana.png`, `vergleich-shed.png`,
`vergleich-gravel.png`. Zusätzliche Ansichten und Prüfskripte liegen im gleichen
temporären Ordner außerhalb des Repositorys. Private Fotos wurden weder verändert
noch kopiert, eingebettet, gestagt oder als Assets verwendet. Git-Ausschluss geprüft.

Verbleibende gestalterische Grenzen: Heckenvolumen sind aus nächster Nähe noch
deutlich stilisiert; der separate verglaste Sitzbereich ist nur angedeutet.
Die Rekonstruktion beruht auf relativen Fotoproportionen, nicht auf Vermessung.
Kein Staging, Commit oder Push.
