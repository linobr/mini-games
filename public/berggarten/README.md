# Berggarten Tycoon
Eigenständiger 3D Abbau-, Produktions- und Garten-Tycoon. Die Grafik ist mit Three.js aus prozeduralen Low-Poly-Modellen gebaut; Web Audio erzeugt alle Sounds. Keine fremden Spielassets, kein Backend, keine Echtgeldkäufe.

Klicken auf Ressourcen: automatisch hinlaufen und abbauen. Der Weg wird um lebende Ressourcen herum gesucht; das Freiräumen erschliesst neue Wege. WASD/Pfeile bewegen, Leertaste abbauen, R einlagern, F verkaufen. Auto sucht selbst erreichbare Ressourcen. Kamera drehen und zoomen mit den sichtbaren Buttons. Touch-Steuerung auf Mobilgeräten.

Wirtschaft: drei Regionen, acht Werkzeugstufen, sieben Rucksackgrössen, drei Helfer, drei Manufakturstufen und drei sichtbare Gartenrestaurierungen. Rohstoffe können direkt verkauft, eingelagert, zu Brettern/Bausteinen/Schmucksteinen verarbeitet oder für besser bezahlte Handelsaufträge verwendet werden. Helfer liefern alle zehn Sekunden ins Lager. Jedes Gartenprojekt bringt 2 Münzen pro 15 Sekunden. Offlineproduktion ist auf fünf Minuten pro Abwesenheit beschränkt. Fünf einmalige Meilenstein-Belohnungen und XP-Level.

Spielstände unter `berggarten-save-v1` werden auf Version 2 migriert und behalten Münzen, Werkzeug, Rucksack, Inventar, Gebiete und Gartenprojekte. Neu anfangen fragt vor dem Zurücksetzen nach.

Quellcode: `src/berggarten/`; HTML: `berggarten/index.html`. Tests: `npm test`. Build und Deployment über die bestehende GitHub-Pages-Pipeline. Inspiration für den eigenen Spielkreislauf: Forager (Ressourcen/Expansion) und Outpath (Automatisierung).
