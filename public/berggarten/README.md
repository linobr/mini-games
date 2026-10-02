# Berggarten
Eigenständiges, entspanntes Abbau- und Garten-Spiel. Alle Grafiken werden direkt mit Canvas gezeichnet, alle Sounds mit Web Audio synthetisiert. Keine heruntergeladenen Spielassets, kein Backend und kein Energie-Limit.

Klicken: zu einer Ressource laufen und einmal schlagen. Halten: automatisch weiter abbauen. WASD/Pfeile: bewegen. Leertaste: nächste Ressource in Reichweite abbauen. E oder Verkaufsbutton: gesamtes Inventar verkaufen. Touch-Steuerung auf schmalen Bildschirmen.

Drei Regionen, acht Werkzeugstufen, sieben Rucksackgrössen, drei sichtbare Gartenrestaurierungen. Ressourcen wachsen nach 45 Sekunden nach. Fortschritt wird lokal unter `berggarten-save-v1` gespeichert; Neu anfangen fragt vor dem Zurücksetzen nach.

Tests: `npm test`. Deployment: vorhandene GitHub Pages Pipeline; `public/berggarten/` wird von Vite unverändert übernommen.
