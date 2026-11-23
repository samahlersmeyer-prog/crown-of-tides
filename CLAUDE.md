# Crown of Tides

Original Sierra-style point-and-click adventure (inspired by King's Quest VI). Plain HTML/CSS/JS, no build step, hosted on GitHub Pages.

## Skills (check these first)
- Any coding task → `.claude/skills/ponytail` (trim with ponytail-review / ponytail-audit)
- New feature → `brainstorming` → `writing-plans` → `executing-plans`
- Any bug → `systematic-debugging`
- Before saying done → `verification-before-completion`
- UI work → `impeccable`

## Layout
- `js/game.js` — story, rooms, hotspots, puzzle logic (pure, runs in Node)
- `js/art.js` — every scene, sprite and item icon, drawn on a 320×200 canvas
- `js/engine.js` — render loop, walking, icon bar, cursors, portraits, choices, sea chart, intro, save slots
- `js/vga.js` — painted textures (fbm noise) and the VGA finish: per-scene 256-colour palette + ordered dither
- `js/painted.js` — painted backgrounds from `assets/bg/*.jpg` plus live overlays (pickups, state changes, light)
- `tools/import_bg.py` — turns a captured painting into a 320×200 background
- `js/music.js` — chiptune sequencer, one original theme per island
- `test/walkthrough.test.js` — plays both endings (long = 231/231) and checks deaths, exits, walk boxes

- `js/board.js` + `tools/scoreboard.gs` — family scoreboard (Apps Script web app)
- `test/stuck.test.js` — random play, then proves the game can still be won (no dead ends)

Run tests: `node test/walkthrough.test.js && node test/stuck.test.js`. Keep characters, story and art original — no Sierra assets or characters.
