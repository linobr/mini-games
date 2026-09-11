# Mooslicht – Die schlafende Insel

Eigenständiges, kleines 3D-Solo-Abenteuer für die bestehende Minigames-Seite.
Route: `/mini-games/mooslicht/`. Originale Welt, Figuren, Modelle und Klänge;
keine übernommenen Zelda- oder It-Takes-Two-Assets.

## Abenteuer

Eine zentrale Insel verbindet drei kleine Aufgaben. Im Westen aktiviert die
Folge **Gelb → Blau → Rosa** die Klangblüten. Im Osten müssen drei Steinwächter
besiegt und ihr Schrein berührt werden. Im Norden führen Sprungsteine, einer
davon beweglich, zu drei Windfunken und dem Windschrein. Mit allen drei
Lichtern erweckt **E am grossen Herzbaum** die Insel. Anschliessend kann man
weiter erkunden. 24 Glühlichter und eine optionale Truhe belohnen Umwege.

| Aktion | Desktop | Touch |
| --- | --- | --- |
| Bewegung | WASD / Pfeile, relativ zur Kamera | linker Stick |
| Springen | Leertaste | ↑ |
| Interagieren | E | E |
| Schwert | J / Linksklick ohne Ziehen | ⚔ |
| Ausweichen | Shift | ↝ |
| Kamera | über Spielwelt ziehen, Mausrad, C zum Zurücksetzen | über Spielwelt ziehen |
| Pause | Esc / Pause-Taste | Pause-Taste |

Fortschritt und Einstellungen werden ausschliesslich lokal gespeichert.
Nach einem Sturz geht es am letzten Insel-Rücksetzpunkt weiter. Alle Lichter
und gesammelten Gegenstände bleiben erhalten. Bei null Herzen werden die
Herzen dort wieder gefüllt. Pause bietet einen Rücksetzpunkt und einen
bestätigten Neustart. Speicherfehler verhindern das Spielen nicht.

## Technik und Prüfung

- Three.js 0.180.0, von Vite lokal gebündelt; keine Laufzeit-CDNs, externen
  Modelle, Musikdateien oder Serververbindungen. WebGL 2 erforderlich.
- Wiederholte Landschaftsobjekte als Instanzen, gemeinsame Geometrien;
  vier Inseln statt unbegrenzter Welt. Begrenzte Partikel- und Audiostimmen.
- Physik mit 60 festen Schritten pro Sekunde, maximal sechs Nachholschritte.
  Sprungpuffer, kurze Kulanz beim Abspringen, mitfahrende Plattform und
  angekündigte Gegnerattacken. Kamera-unabhängige Spiellogik.
- Grafik automatisch, leicht oder schön. Automatisch reduziert Schatten
  und Pixeldichte bei niedriger Bildrate; Touch startet mit leichter Grafik.
  Ruhige Kamera berücksichtigt die Bewegungseinstellung des Geräts.
- Ton startet erst nach einer Nutzeraktion. Tab-Wechsel pausiert das Spiel.
  Context-Loss zeigt eine Wiederherstellungsmöglichkeit statt einer leeren Seite.
- `npm test`: Spiellogik, reale Wegstrecken, alle Sprungsteine, Rätsel,
  Kampf, Rücksetzpunkte, Speicherfehler und Zeitverhalten.
- `npm run build`: bestehende Spiele und zusätzliche Vite-Seite.

Die direkte Browserprüfung ist in der Ausführungsumgebung durch deren
URL-Richtlinie blockiert. Tests und eine separate Darstellung der tatsächlichen
3D-Geometrie ersetzen keinen WebGL- oder Leistungstest auf Endgeräten.
