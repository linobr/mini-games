# Mooslicht – Der Garten erwacht

Die Garten-Erweiterung des bestehenden Three.js-Abenteuers unter
`/mini-games/mooslicht/`. Spielkern, Steuerung, Rätsel, Kampf, Touch-Eingaben,
24 Glühlichter, Truhe und lokale Spielstände bleiben erhalten.

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
- **Herzbaum:** mit drei Lichtern den realen Gartenbaum berühren. Leuchtende
  Wurzeln wachsen, Hütte und Segel reagieren, die Kamera zeigt den ganzen Garten.
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

Das sieben Sekunden lange Intro und das Finale sind überspringbar.
„Ruhige Kamera“ überspringt die Kamerafahrten und reduziert Umgebungsbewegung.
Grafik: automatisch, niedrig, mittel, hoch. Touch startet automatisch niedrig.
Spielstände behalten den bisherigen Schlüssel und die bisherigen Quest-IDs;
alte Fortschritte werden an die entsprechenden neuen Rücksetzpunkte übertragen.

## Technik

- Bestehende Three.js-/Vite-Versionen, keine neuen Laufzeit-Abhängigkeiten.
- Instanzierte Vegetation, Kies, Holz und Bauteile. Gras: 3'000 / 6'500 / 11'000
  Instanzen. Wind im Vertexshader, begrenzte Effektpartikel und Audiostimmen.
- Eine Schatten-Sonne, deaktiviert auf niedrig; gedeckelte Pixeldichte.
- Gemeinsame Definition von begehbaren Flächen, aufsteigenden Platten und
  Kollisionen. Übereinanderliegende Flächen erlauben Innenraum und Dach.
- Kamera verkürzt Sichtstrahlen an Wänden und Baumstämmen; die Hütte blendet
  ihr Dach im Innenraum aus. Eine Silhouette hilft hinter Blättern.
- WebGL 2 nötig. Keine externen Texturen, Modelle oder Audiostreams.
- Audio nach Nutzeraktion: Wind, Vogelrufe, gebietsabhängige Resonanzen.

## Prüfung

`npm test` prüft Spielablauf, alle Palmensprünge, Dach- und Segelaufstieg,
Kampf, Speicherung, Kamera-Kollision, steigende Platten, Touch-Eingaben,
Szenenanimationen und Geometriebudget. `npm run build` erzeugt die gesamte Seite.
Der Pages-Workflow führt vor dem Build die Tests aus.

Die Browserumgebung blockiert lokale URLs und hat WebGL deaktiviert. Deshalb
sind ein gerenderter Browser-Spieltest, endgültige Schatten-/Shaderkontrolle
und reale Desktop-/Mobile-FPS hier **nicht bestätigt**. Separate CPU-Projektionen
der tatsächlichen Szenengeometrie wurden auf Gartenanordnung, Palmenform und
Bodenperspektive geprüft. Sie ersetzen keinen WebGL-Test. Die Tests der
Szenenanimation verwenden einen Renderer-Stub und messen keine Bildrate.
