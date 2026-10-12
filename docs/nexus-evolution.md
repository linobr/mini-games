# NEXUS 2.0 / Berggarten Evolution

## Analyse und geprüfter Plan

Ausgangsbasis: `58c54e4`, main. `npm ci`, 97 Tests und Produktionsbuild erfolgreich.
Vite 8 / JavaScript / Three.js; keine Framework-Migration oder neuen Laufzeitabhängigkeiten.
Die Originalkarten in index.html sind die Quelle für Titel, Beschreibungen und Spielstarts.
PeerJS-Multiplayer bleibt unverändert; seine vorhandene externe Signalisierung ist weiterhin erforderlich.
Berggarten trennt Engine, 3D-Renderer, Canvas-Renderer und Oberfläche bereits sinnvoll.

Risiken und Massnahmen:
- HTML-Injektion: Originalkarten und Grid erhalten. Selektoren nach Attributen statt Reihenfolge;
  Regressionstests für zusätzliche Klassen, Attribute, mehrmalige Injektion und fehlende Marker.
- Zwei Ansichten: nur ein Satz Spielinstanzen; NEXUS startet die vorhandenen Originalaktionen.
- Fortschritt: ausschliesslich lokale, klar bezeichnete Öffnungsereignisse; keine erfundenen Siege/Spielzeiten.
- Spielstände: unveränderter Speicherschlüssel, Version 3, Backup vor Migration, validierter Import;
  alte Ressourcen-IDs bleiben gleich, neue erhalten einen separaten ID-Bereich.
- Neue Welt: gemeinsame Dimensionen und Bauplätze; der Hauptweg bleibt frei, beide Renderer verwenden dieselben Daten.
- Produktion: Kosten bei Start abbuchen, Ausgabe genau einmal, begrenzter Offline-Fortschritt und Lagerkapazität.
- PWA: vollständiger, versionierter Build-Cache; Aktivierung erst nach Schliessen alter Tabs, keine automatische
  Neuladung während des Spielens. Nur eigene Cache-Namen löschen, niemals Spielstände.

Etappen: Launcher → Profil → PWA → additive Spielwelt/Wirtschaft → Tests/Browserprüfung → Pages.
Auf aufwendige Wetterpartikel, zusätzliche NPC-Systeme und eine komplett neue Engine wird zunächst verzichtet.

## Implementierter Umfang

- NEXUS-Bibliothek aus den Originalkarten (10 Spiele im Produktionsbuild); Suchfeld,
  Kategorien, Sortierung, Favoriten, lokale Empfehlungen, letzte Öffnungen und adressierbare Detaildialoge.
- Dauerhafter Umschalter im Launcher. Originalkarten, Original-CSS und bestehende Spielinstanzen bleiben erhalten.
- Lokaler Name, Symbolavatar, Einstellungen, Öffnungsstatistik und einmalige Entdecker-XP.
  Bewusst keine Behauptung über Siege oder gespielte Minuten. Direktaufrufe einzelner Spiel-URLs werden nicht gezählt.
- Lokale SVG-Cover, PNG-Installationsicons, Manifest, atomarer Build-Cache mit Pfaden unter `/mini-games/`.
- Berggarten: 30 × 15 statt 18 × 15 Felder; Waldtal und Schneegipfel/Alpendorf;
  fünf feste Bauplätze; Sägewerk, Steinwerk, Kristallschleiferei, Alpenwerkstatt.
- Exakte Bau-/Ausbaukosten, drei Gebäudestufen, Einzelauftrag/Automatik, neue Produktionskette zu Alpenbausätzen,
  sieben Quests, einmalige Belohnungen und sanfter Tageslichtwechsel. Beide Renderer erweitert.
- Version-3-Migration; unveränderter Schlüssel `berggarten-save-v1`; Sicherung unter
  `berggarten-save-before-evolution`; validierter JSON-Import/Export und Sicherung vor Import.
- Beschädigte/unbekannte Speicherformate werden nicht automatisch überschrieben.
- Web-Lock verhindert parallele Berggarten-Schreibzugriffe. Speichern geschieht vor Freigabe;
  wiederhergestellte Browser-Cache-Seiten dürfen danach nicht mehr schreiben.
- Lagergrenze 5000 je Ware; volle Lager blockieren Ausgaben ohne bereits bezahlte Aufträge zu verlieren.
- Blockiertes localStorage verhindert den Launcher-Start nicht mehr (auch Color-Clash-Präferenzen abgesichert).

## Architektur und Wartung

Neue Laufzeitabhängigkeiten: keine. Einzige neue **Testabhängigkeit**: Playwright 1.58.2,
exakt im Lockfile fixiert. Keine Accounts, Datenbank oder zusätzlichen Hosting-Dienste.
`src/nexus-model.js` kapselt reine Datenoperationen, `src/nexus.js` den Launcher.
`src/berggarten/evolution.js` kapselt Bau-/Questregeln, `evolution-ui.js` die Verwaltung,
`storage.js` die Migrationseinbindung und Schreibsperre. Die bestehende Engine bleibt der Spielkern.
Alte Ressourcen-IDs verwenden weiterhin `y * 18 + x`, neue Regionen einen separaten ID-Bereich.
Pfadfindung verwendet davon unabhängige Weltkoordinaten.

Die ursprüngliche Manufaktur bleibt verfügbar. Neue Betriebe verbrauchen beim Auftragsstart Materialien;
bezahlte Aufträge dürfen bei einem Ausbau nicht ihre Laufzeit wechseln. Alte Handelsaufträge bleiben Teil
 derselben Liste. Kein zusätzlicher Verkauf ohne Ressourcenverbrauch.

## Reproduzierbare Prüfung

```sh
npm ci
npm test
npm run build
npx playwright install --with-deps chromium webkit
NEXUS_QA_SERVE=1 npm run test:browser
NEXUS_QA_SERVE=1 npm run test:smoke
```

Der Pages-Workflow prüft Unit-Tests, Build, mobile Chromium-/WebKit-Abläufe und Spieleinstiege **vor**
Upload/Deployment. Screenshots stehen als Workflow-Artefakt `browser-review` bereit.
Browsertests prüfen unter anderem Suche/Filter, Persistenz, Originalansicht, lokale Runde, Migration,
Produktion, Import/Export, Tab-Sperre, Canvas-Fallback und Offline-Start. Der Smoke-Test kontrolliert
alle Spielseiten, fehlende lokale Assets, JavaScript-Fehler und den Betrieb ohne localStorage.

## Bewusste Grenzen / nächste Schritte

- NEXUS/Original gestaltet den Launcher; eigenständige Spiele behalten ihre eigenen Oberflächen.
- Kein geräteübergreifender Fortschritt. XP dokumentieren Spielöffnungen im Launcher, keine Spielergebnisse.
- System-Symbolavatare, kein Bildupload. Gemeinsamer Tonregler gilt zunächst für Berggarten und Turbo Bump.
- Platzierung erfolgt auf fünf sicheren Grundstücken, nicht frei auf jedem Weltfeld.
- Keine zusätzliche Kristallhöhle, Wetterpartikel oder neue NPC-KI. Bestehende Helfer und Markt bleiben.
- Browser ohne Web Locks können Berggarten nicht schreibend starten; der Spielstand wird geschützt.
- Offline-Produktion bleibt auf fünf Minuten pro Abwesenheit begrenzt; keine Serverzeit oder Anti-Cheat-Garantie.
- Cache-Updates werden erst nach Schliessen aller alten App-Tabs aktiv. Multiplayer bleibt onlineabhängig.
- Echter iPhone-/iPad-Hardwaretest und Multiplayer-Runde über zwei physische Geräte bleiben erforderlich.
- Bestehende Three.js-Bündelwarnung (>500 kB unkomprimiert) bleibt sichtbar. Nächster Schwerpunkt:
  GPU-Messungen auf schwächeren Smartphones, erweiterte Ereignisse aus den einzelnen Spielen,
  feinere Wirtschaftsbalance und frei platzierbare Gebäude mit zusätzlicher Wegprüfung.

## Lokale Prüfergebnisse vor Veröffentlichung

- `npm ci`: erfolgreich (Node 24.19.0; Actions verwendet Node 22).
- `npm test`: 116 Tests erfolgreich, darunter 97 bestehende Tests.
- `npm run build`: erfolgreich; 51 lokale Dateien im PWA-Cache, insgesamt rund 1,5 MB unkomprimiert.
- Chromium 153 / Playwright 1.58.2, iPhone-13-Viewport (390 × 844, Touch): Launcher,
  Filter/Favoriten, Profilpersistenz, Originalwechsel, Tic-Tac-Toe-Runde, Berggarten-Migration,
  Produktion, fünf Regionen, Export/Import und Tab-Ausschluss erfolgreich.
- Desktop 1440 × 960: alle Spieleinstiege und Canvas-Elemente geladen, keine JavaScript-Ausnahmen
  oder fehlenden lokalen Assets; blockiertes localStorage verhindert Spielen nicht.
- Erzwungener Canvas-Fallback und tatsächlicher Offline-Neustart über den Service Worker erfolgreich.
- WebKit lokal nicht ausführbar: Systembibliotheken fehlen, Paketinstallation in dieser Umgebung
  nicht möglich. Der GitHub-Workflow führt deshalb WebKit mit installierten Systembibliotheken vor dem Deployment aus.
- Keine physische iPhone-Hardware und kein Ende-zu-Ende-Test einer Multiplayer-Verbindung verfügbar.

Die automatisch abrufbaren Actions-Ergebnisse beziehen sich auf den jeweiligen Commit und sind die
verbindliche Quelle für CI/Deployment. Ein fehlgeschlagener Browsertest verhindert die Veröffentlichung.

## Geänderte und ergänzte Dateien

- `.github/workflows/pages.yml`
- `README.md`
- `berggarten/index.html`
- `docs/nexus-evolution.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `public/covers/atom.svg`
- `public/covers/berggarten.svg`
- `public/covers/color.svg`
- `public/covers/ki-mooslicht.svg`
- `public/covers/meteor.svg`
- `public/covers/mooslicht.svg`
- `public/covers/neon.svg`
- `public/covers/rift.svg`
- `public/covers/tictactoe.svg`
- `public/covers/turbo.svg`
- `public/icons/nexus-192.png`
- `public/icons/nexus-512.png`
- `public/manifest.webmanifest`
- `qa/browser.mjs`
- `qa/smoke.mjs`
- `scripts/build-pwa.mjs`
- `scripts/inject-live-game.mjs`
- `scripts/sw-template.js`
- `src/app.js`
- `src/berggarten/canvas-world.js`
- `src/berggarten/engine.js`
- `src/berggarten/evolution-ui.js`
- `src/berggarten/evolution.js`
- `src/berggarten/main.js`
- `src/berggarten/storage.js`
- `src/berggarten/style.css`
- `src/berggarten/world.js`
- `src/color-clash.js`
- `src/interface-switch.js`
- `src/nexus-dashboard.css`
- `src/nexus-model.js`
- `src/nexus.js`
- `src/pwa.js`
- `src/turbo-bump.js`
- `test/berggarten-evolution.test.js`
- `test/berggarten.test.js`
- `test/nexus.test.js`
- `test/pwa.test.js`
