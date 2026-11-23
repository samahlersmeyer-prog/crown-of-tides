# Family Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Names, per-kid saves, death album, young explorer mode, shared scoreboard, and a stuck-proof test.
**Architecture:** Game logic stays pure in `js/game.js` (gains `DEATHS`, `deathTitle`). Everything per-player lives in `js/engine.js` and localStorage. The scoreboard is one fetch to an Apps Script URL held in `js/board.js`.
**Tech Stack:** plain JS, Node test, Google Apps Script.
**Spec:** `docs/superpowers/specs/2026-11-23-family-play-design.md`

## Global Constraints
- No function-key shortcuts. No build step. Characters, story and art stay original.
- `node test/walkthrough.test.js` stays at 231 / 219.

## Review Focus
- Two kids, one device: second name must not see or overwrite the first one's saves.
- Scoreboard URL unset, offline, or returning junk: game plays on, board says it's unavailable.
- A name with HTML or 200 characters: trimmed to 12 safe characters, never rendered as markup.
- A death text edited later without a title: test fails.
- Old save with no `secs`/`deaths` fields: loads and counts from zero.

### Task 1: Stuck-proof test
- Test: `test/stuck.test.js` — 300 seeded random walks of up to 250 non-dying actions (act/choose/travel over every spot, verb and held item), then replay the long-ending script up to 4 times ignoring failures; assert `won`. Fix any dead end found in `js/game.js`.

### Task 2: Deaths
- `js/game.js`: `DEATHS = [[substring, title], …]`, `deathTitle(text) -> string|null`, exported.
- Test (walkthrough): every `die:` literal in the source matches exactly one entry.

### Task 3: Player, saves, stats, album, explorer mode (`js/engine.js`, `index.html`, `css/style.css`)
- `player` (localStorage `cot_player`), `slug`, `key(k)` → `cot2_<slug>_<k>` or `cot2_<k>` when unnamed.
- Title: name field, "Young explorer" checkbox; shows whose game Continue resumes.
- `nameIt(text)` swaps `Rowan` for the player's name in messages, speaker label, speech, endings.
- `s.secs` ticks while playing; `s.deaths` counts; album in `cot_album_<slug>`.
- Death screen shows the title and "n of N found"; Control Panel gets Deaths and Scoreboard buttons.
- Explorer mode: twinkle at each visible spot; hint book shows the answer with the nudge.

### Task 4: Scoreboard (`js/board.js`, `tools/scoreboard.gs`)
- `Board.post({name, score, ending, secs, deaths})`, `Board.list() -> Promise<rows>`; both no-ops/reject cleanly when `Board.URL` is empty.
- Apps Script: `doGet` returns rows as JSON; `doPost` upserts by `id` (device+name), clamps every field.

### Task 5: Verify and ship
- Walkthrough, stuck test, browser playthrough (222), screenshots of title, death, album, board.
