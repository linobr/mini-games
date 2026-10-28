# Mooslicht – Der schwebende Garten

Ein Three.js-Abenteuer in einem schwebenden Garten: erkunden, Klangrätsel lösen, Mooswächter besiegen und den Herzbaum erwecken. Tastatur, Maus und Touch werden unterstützt; der Fortschritt bleibt lokal im Browser.

**[Spielen](https://linobr.github.io/mini-games/mooslicht/)** · [Spieleübersicht](../README.md) · [Garten und Steuerung](#garten-und-abenteuer) · [Technik](#technik) · [Prüfung](#prüfung)

## Lokal starten

Node.js 22.13.0 oder neuer und npm verwenden. Vom Repository-Stamm:

```bash
npm ci
npm run dev
```

`http://localhost:5173/mini-games/mooslicht/` öffnen, sofern Vite den Standardport verwendet. Für einen Produktionsbuild `npm run build` und danach `npm run preview` ausführen.

Der Spieleinstieg liegt in [index.html](index.html), die Implementierung in [src/mooslicht/](../src/mooslicht/). Die getrennte [KI-Live-Kopie](../ki-mooslicht/README.md) hat eigene Dateien und Spielstände.

## Garten und Abenteuer

Der längliche Hauptgarten folgt der gelieferten Referenz: Hauswand und Kies links,
versetzter Plattenweg, weisse Hütte mit Giebeldach hinten, dreieckiges Sonnensegel
links darüber, Holzlager daneben, Hecke rechts, Baum im weissen Steinkreis und
Fächerpalme im Vordergrund. Die übrigen Bilder dienen als Material- und Möbelreferenz;
die angrenzenden Gartenteile sind keine vollständige Rekonstruktion.
Die privaten Originalfotos werden nicht veröffentlicht.

- **Echolicht:** Holz-, Glas- und Metallklang in der begehbaren Hütte,
  Reihenfolge Gelb → Blau → Rosa; hörbares und sichtbares Feedback.
- **Steinlicht:** drei Mooswächter beim Steinkreis; angekündigte Attacken,
  Dreiercombo, kurze Trefferpause und Ausweichrolle.
- **Blattlicht:** 13 Trittsteine um die Palme, drei Windfunken, Schrein oben.
- **Herzbaum:** elf Sekunden langes, überspringbares Finale: kurze Ruhe, ein
  Lichtweg vom zuletzt erweckten Schrein über den Garten zur Palme und zum Baum,
  Wurzelnetz, leuchtende Krone, Lichtimpuls und abschliessende Gartenübersicht.
  Hütte, Segel und Nebeninseln reagieren; danach kann man weiter erkunden.
- Optional: Holzaufstieg zum Hüttendach, der Weg am Sonnensegel, sechs gespeicherte
  Geheimnisse und die ursprüngliche Truhe. Nach dem Finale frei weiter erkunden.

| Aktion | Desktop | Touch |
| --- | --- | --- |
| Bewegung | WASD / Pfeile, relativ zur Kamera | linker Stick |
| Springen | Leertaste | ↑ |
| Interagieren | E | E |
| Schwert | J / kurzer Linksklick | ⚔ |
| Ausweichen | Shift | ↝ |
| Kamera | Ziehen, Mausrad, C zurücksetzen | Ziehen |
| Karte und Hinweise | M / ◈ | ◈ |
| Garten von oben | V / ⌘ | ⌘ |
| Pause und Einstellungen | Esc / Ⅱ | Ⅱ |
| Leistungsanzeige | F3 | – |

Das zehn Sekunden lange Intro und das Finale sind überspringbar.
„Ruhige Kamera“ überspringt die Kamerafahrten und reduziert Umgebungsbewegung.
Grafik: automatisch, niedrig, mittel, hoch. Touch startet automatisch niedrig.
Spielstände behalten den bisherigen Schlüssel und die bisherigen Quest-IDs;
alte Fortschritte werden an die entsprechenden neuen Rücksetzpunkte übertragen.

## Die schwebende Gartenwelt

Eine gemeinsame, unregelmässige Küstenlinie definiert die begehbare Gartenfläche,
ihre sichtbare Grasoberseite und die Karte. Darunter verjüngen sich Erde und Fels;
Wurzeln, Moos, kleine Kristalle und Lichtadern gliedern die Kante. Nur die reale
Hauswand und die Hütte besitzen Wandkollisionen. Die Hecke besteht aus unterschiedlich
grossen Pflanzenclustern mit Stämmen und einem Durchgang. Offene Kanten führen zu
einem kurzen Fall mit Wind, Nebelblende und Rückkehr zum letzten sicheren Checkpoint.

Vier erreichbare Nebeninseln ergänzen den Garten: Mooswiese, Kieselinsel mit Steinbogen,
Blüteninsel und Holz-Echoinsel hinter der Hütte. Alle Verbindungen sind mit normalen
Sprüngen erreichbar, auch ohne Lichter und auf niedriger Grafik. Entdeckte Himmelsorte
werden gespeichert. Sechs bisherige Geheimnisse bleiben an ihren bisherigen Plätzen;
die Karte verrät ihre Positionen nicht. Wolken und entfernte Fels-/Baumsilhouetten
bilden die Tiefenstaffelung. Die Gartenansicht zeigt die gesamte Inselgruppe.

Der Himmel ist an den Fortschritt gekoppelt: Tag → später Nachmittag → goldene
Stunde/Dämmerung → Nacht → Mooslicht-Nacht. Licht, Nebelfarbe, Sterne, Mond,
prozedurales Galaxienband, Segel und Sound ändern sich gemeinsam. Der Nachthimmel
verwendet einen Kugelshader und ein begrenztes Sternenfeld, keine Bildkulisse und
kein volumetrisches Raymarching. Nachtlicht erhält die Lesbarkeit der Wege.
Pausen stoppen den Tageszeitenfortschritt; alte Spielstände erhalten sofort den
passenden Himmel. Ein Neustart setzt die Welt auf Tag zurück.

## Technik

- Bestehende Three.js-/Vite-Versionen, keine neuen Laufzeit-Abhängigkeiten.
- Instanzierte Vegetation, Kies, Holz und Bauteile. Gras: 3'000 / 6'500 / 11'000
  Instanzen. Wind im Vertexshader, begrenzte Effektpartikel und Audiostimmen.
- Eine Schatten-Sonne, deaktiviert auf niedrig; gedeckelte Pixeldichte. Nur elf
  Schatten werfende Szenenobjekte; Palmenblätter und Dachleisten sind zusammengeführt.
- Getestete Szenenbudgets: unter 350'000 Dreiecken / 340 Meshes auf hoch,
  unter 280'000 Dreiecken auf niedrig. Das sind Geometriegrenzen, keine FPS-Messung.
- Vegetation auf niedrig/mittel/hoch: 7'000 / 12'000 / 18'500 Blätter,
  3'000 / 6'500 / 11'000 Grashalme; Gras blendet in der Entfernung aus.
  Sterne 500 / 1'000 / 1'600, Wolken 18 / 30 / 46, Effektpool maximal 180,
  Glühwürmchen maximal 80, Audiostimmen maximal 32.
- Automatische Grafik misst reale Frameabstände und reduziert Qualität bei
  anhaltend niedriger Bildrate. Gameplayflächen werden dabei nie entfernt.
- Gemeinsame Definition von begehbaren Flächen, aufsteigenden Platten und
  Kollisionen. Übereinanderliegende Flächen erlauben Innenraum und Dach.
- Kamera verkürzt Sichtstrahlen an Wänden und Baumstämmen; die Hütte blendet
  ihr Dach im Innenraum aus. Eine Silhouette hilft hinter Blättern.
- WebGL 2 nötig. Keine externen Texturen, Modelle oder Audiostreams.
- Audio nach Nutzeraktion: Wind, Vogelrufe, abends Insekten, nachts Grillen und
  Resonanzen; im Finale tiefe Flächen und zurückhaltende Glocken.

## Prüfung

`npm test` prüft Spielablauf, alle Palmensprünge, Dach- und Segelaufstieg,
Kampf, Speicherung, Kamera-Kollision, steigende Platten, Touch-Eingaben,
Szenenanimationen und Geometriebudget. `npm run build` erzeugt die gesamte Seite.
Die vorhandenen Tests umfassen ausserdem komplette Hin- und Rückwege zu allen Nebeninseln,
Sturzblende, alte/neue Spielstände, Himmelsübergänge, Finale, Kartenränder und
Qualitätsbudgets. Der Pages-Workflow führt vor dem Build die Tests aus.

Bei der bisherigen dokumentierten Prüfung blockierte die Browserumgebung lokale URLs und WebGL. Ein gerenderter Browser-Spieltest, die endgültige Schatten-/Shaderkontrolle und reale Desktop-/Mobile-FPS sind in diesem Prüfstand **nicht bestätigt**. Separate CPU-Projektionen
der tatsächlichen Szenengeometrie wurden auf Gartenanordnung, Palmenform und
Bodenperspektive sowie Gartenhaus, Inselränder und Nebeninseln geprüft. Sie ersetzen keinen WebGL-Test. Die Tests der
Szenenanimation verwenden einen Renderer-Stub und messen keine Bildrate.

Lizenzhinweise für Three.js: [THIRD-PARTY-LICENSES.txt](../public/mooslicht/THIRD-PARTY-LICENSES.txt). Details zur vorhandenen Produktionsprüfung stehen in [docs/mooslicht-production-review.md](../docs/mooslicht-production-review.md).
