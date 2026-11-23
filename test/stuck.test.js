// Stuck-proof check: after any amount of random play, the game can still be won.
// Run: node test/stuck.test.js [walks]
const assert = require('assert');
const G = require('../js/game.js');
const clone = s => JSON.parse(JSON.stringify(s));
const VERBS = ['walk', 'look', 'hand', 'talk', 'item'];

// seeded random, so a failure can be replayed
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];

// Apply a result's follow-ups; returns false (state untouched) if the action kills you.
function settle(s, r, chooser) {
  for (let i = 0; r && i < 6; i++) {
    if (r.die) return false;
    if (r.go) G.enter(s, r.go);
    if (!r.choose) break;
    const opt = chooser(r.choose); if (!opt) break;
    r = G.choose(s, r.choose.id, opt);
  }
  return true;
}
function attempt(s, fn, chooser = () => null) {
  const c = clone(s); let ok = false;
  try { ok = settle(c, fn(c), chooser); } catch (e) { throw new Error('crash: ' + e.message + ' in ' + s.room); }
  if (ok) Object.assign(s, c, { flags: c.flags, inv: c.inv });
  return ok;
}
function randomStep(s) {
  const k = rnd();
  if (k < 0.06) return attempt(s, c => G.travel(c, pick(Object.keys(G.ISLES))));
  if (k < 0.12 && s.inv.length) return attempt(s, c => G.invAct(c, pick(c.inv), pick(VERBS), pick(c.inv)));
  const spots = G.spotsIn(s, s.room); if (!spots.length) return false;
  return attempt(s, c => G.act(c, pick(spots).id, pick(VERBS), c.inv.length ? pick(c.inv) : undefined), ch => pick(ch.options)[0]);
}

// The known solution, with the room each step happens in, recorded from a clean run.
const SOLUTION = require('./walkthrough.test.js').SOLUTION;

// Walk (exits, boats, ferries, the magic map) to a room without doing anything else.
function goTo(s, room) {
  if (s.room === room) return true;
  const seen = new Set([s.room]); let frontier = [clone(s)];
  while (frontier.length) {
    const next = [];
    for (const st of frontier) {
      const moves = G.spotsIn(st, st.room).map(sp => [c => G.act(c, sp.id, 'walk'), null]);
      for (const isle of Object.keys(G.ISLES)) { moves.push([c => G.travel(c, isle), null]); moves.push([c => G.act(c, 'boat', 'walk'), isle]); }
      for (const [fn, ferry] of moves) {
        const c = clone(st);
        if (!attempt(c, fn, ch => ferry && ch.options.some(o => o[0] === ferry) ? ferry : null) || seen.has(c.room)) continue;
        seen.add(c.room);
        if (c.room === room) { Object.assign(s, c); return true; }
        next.push(c);
      }
    }
    frontier = next;
  }
  return false;
}
function doStep(s, [room, st]) {
  if (!goTo(s, room)) return;
  if (typeof st === 'function') st(s, attempt); else if (st[0] === '@choose') attempt(s, c => G.choose(c, st[1], st[2]));
  else if (st[0] === '@sail') attempt(s, c => G.travel(c, st[1]));
  else attempt(s, c => G.act(c, st[0], st[1], st[2]));
}
function solve(s) {
  for (let pass = 0; pass < 5 && !s.won; pass++) for (const st of SOLUTION) { if (s.won) break; doStep(s, st); }
  return !!s.won;
}

const walks = +process.argv[2] || 300;
let stuck = 0;
for (let w = 1; w <= walks; w++) {
  seed = w; const s = G.newState(rnd); G.enter(s, { to: 'beach', x: 160, y: 172 });
  // Get some way into the game by the known route, fooling around at random on the way, then fool around some more.
  const k = Math.floor(rnd() * SOLUTION.length), n = Math.floor(rnd() * 250);
  for (let i = 0; i < k && !s.won; i++) { doStep(s, SOLUTION[i]); if (rnd() < 0.4) for (let j = 0; j < 4; j++) randomStep(s); }
  for (let i = 0; i < n && !s.won; i++) randomStep(s);
  const snap = clone(s);
  if (!solve(s)) { stuck++; if (stuck <= 5) console.log(`STUCK walk ${w} after ${k} solution + ${n} random steps: room ${snap.room}, inv [${snap.inv}], ended in ${s.room} with [${s.inv}], score ${s.score}`); }
}
assert.strictEqual(stuck, 0, `${stuck} of ${walks} random games could not be finished`);
console.log(`stuck-proof ok — ${walks} random games, all still winnable`);
