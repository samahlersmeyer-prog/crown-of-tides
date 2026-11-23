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
- `js/engine.js` — render loop, walking, icon bar, dialogs, save/restore, sound
- `test/walkthrough.test.js` — plays the full game to 100/100 and checks deaths, exits, walk boxes

Run tests: `node test/walkthrough.test.js`. Keep characters, story and art original — no Sierra assets or characters.
