# Family play — design (approved by Sam 2026-11-23)

**Why:** Sam's five kids (about 6 to 14) each play their own game on their own device and want to compare. Today the game is one anonymous player, reading-heavy, with nothing to compare and no proof it can't strand a player.

**Goals**
1. Name at the start, used in the story; saves are kept per name.
2. Family scoreboard shared across devices: name, points, ending, time, deaths found.
3. Death album: each distinct death is collected with a title, per player, across games.
4. Young explorer mode: clickable things sparkle; the hint book gives the answer straight away.
5. Stuck-proof: a test that the game can still be won from any state random play reaches.

**Non-goals:** new islands or puzzles; a girl hero sprite (needs new art; offered separately); accounts or PINs.
**Anti-goals:** a kid losing a save because a sibling used the same device; the scoreboard being down ever blocking play.

**Approaches**
- Scoreboard store: (a) Apps Script web app — picked: free, same host as Big Dawg Daily. Scores are kept in Script Properties rather than a Sheet, because a Sheet-backed script must be granted access to every spreadsheet in the account; (b) Firebase — more setup, a second system; (c) local-only — can't compare across devices.
- Name in story: (a) replace "Rowan" at display time in the engine — picked: one place, game logic and tests untouched; (b) thread a name through game.js — touches 300 lines of text.
- Deaths: (a) a title table matched on death text, with a test that every death in the source has exactly one title — picked; (b) ids at each of 30 call sites — more edits, same result.
- Stuck-proof: (a) random play, then replay the known solution tolerantly and require a win — picked: cheap, finds real dead ends; (b) full state search — too large.

**Builder's calls:** names are 1–12 letters/digits/spaces; no name keeps today's keys (`cot2_auto`) so old saves and test scripts still work; scores post when points change (throttled) and on winning; all scoreboard text is rendered with textContent.
