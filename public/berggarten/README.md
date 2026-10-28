# Berggarten Tycoon

Ein Browser-Tycoon mit Ressourcenabbau, Produktion und Gartenaufbau. Three.js erzeugt die 3D-Grafik aus prozeduralen Modellen; Web Audio erzeugt die Klänge. Eine Canvas-Ansicht übernimmt auf Geräten ohne WebGL.

**[Spielen](https://linobr.github.io/mini-games/berggarten/)** · [Spieleübersicht](../../README.md) · [Steuerung](#steuerung) · [Spielstand](#spielstand) · [Entwicklung](#entwicklung)

## Spielkreislauf

Ressourcen abbauen, verkaufen oder einlagern. Mit dem Erlös Werkzeuge und Rucksack verbessern, weitere Regionen erschliessen und Produktionsketten aufbauen.

- Fünf Regionen: Sonnenwiese, Steinbruch, Kristallhöhen, Waldtal sowie Schneegipfel und Alpendorf.
- Acht Werkzeugstufen, sieben Rucksackgrössen und bis zu drei Helfer.
- Drei Manufakturstufen und drei Gartenrestaurierungen.
- Vier platzierbare Produktionsbetriebe: Sägewerk, Steinwerk, Kristallschleiferei und Alpenwerkstatt.
- Handelsaufträge, Quests, Meilensteine und XP-Level.
- Offlineproduktion für höchstens fünf Minuten pro Abwesenheit.

Helfer liefern alle zehn Sekunden ins Lager. Jedes Gartenprojekt liefert zwei Münzen pro 15 Sekunden. Produktion und Aufträge verwenden Holz, Stein, Kristalle sowie weiterverarbeitete Waren.

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| Ressource anklicken oder antippen | Hinlaufen und abbauen |
| WASD / Pfeiltasten | Figur bewegen |
| Leertaste | Abbauen |
| `R` | Einlagern |
| `F` | Verkaufen |
| Auto-Schaltfläche | Erreichbare Ressourcen automatisch suchen |
| Kamera-Schaltflächen | Drehen und zoomen |

Die Wegsuche berücksichtigt lebende Ressourcen. Das Freiräumen erschliesst weitere Wege. Auf Mobilgeräten stehen Touch-Eingaben bereit.

## Spielstand

Der lokale Speicherschlüssel bleibt `berggarten-save-v1`. Das aktuelle interne Format ist Version **3**. Ältere Versionen 1 und 2 werden übernommen; vorher wird unter `berggarten-save-before-evolution` eine Migrationssicherung angelegt.

JSON-Export und -Import ermöglichen eigene Sicherungen. Beschädigte oder unbekannte Spielstände werden nicht automatisch überschrieben. Bei blockiertem Speicher den Fortschritt vor dem Schliessen exportieren.

Berggarten nur in einem schreibenden Tab öffnen. Eine Browser-Sperre schützt den schreibenden Zugriff; ohne verfügbare Sperre kann das Speichern eingeschränkt sein. **Neu anfangen** verlangt eine Bestätigung.

## Lokal starten

Node.js 22.13.0 oder neuer und npm verwenden. Vom Repository-Stamm:

```bash
npm ci
npm run dev
```

Normalerweise `http://localhost:5173/mini-games/berggarten/` öffnen. Dieser README-Ordner enthält die Anleitung; der HTML-Einstieg liegt unter `berggarten/`.

## Entwicklung

| Pfad | Aufgabe |
| --- | --- |
| [berggarten/index.html](../../berggarten/index.html) | Spieloberfläche |
| [src/berggarten/](../../src/berggarten/) | Spielmodule |
| [engine.js](../../src/berggarten/engine.js) | Spielzustand und Wirtschaft |
| [evolution.js](../../src/berggarten/evolution.js) | Regionen-Erweiterung, Bauplätze, Betriebe und Quests |
| [storage.js](../../src/berggarten/storage.js) | Speicherung, Migration und Zugriffssperre |

```bash
npm test
npm run build
```

Build und Veröffentlichung erfolgen über die bestehende GitHub-Pages-Pipeline. Weitere Architektur- und Prüfhinweise: [NEXUS und Berggarten Evolution](../../docs/nexus-evolution.md).

## Herkunft und Grenzen

Der Spielkreislauf ist von Forager und Outpath inspiriert. Die Grafik und Klänge werden im Projekt erzeugt. Es gibt kein eigenes Backend und keine Echtgeldkäufe. Lokale Spielstände sind geräte- und browsergebunden, solange sie nicht exportiert werden.
