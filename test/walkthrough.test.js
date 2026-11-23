// Plays the whole game through the logic layer. Run: node test/walkthrough.test.js
const assert = require('assert');
const G = require('../js/game.js');

function play(s, steps) {
  for (const [spot, verb, item] of steps) {
    const r = G.act(s, spot, verb, item);
    assert(!r.die, `died at ${s.room}/${spot}/${verb}: ${r.die}`);
    if (r.go) G.enter(s, r.go);
  }
  return s;
}

const s = G.newState();
G.enter(s, { to: 'beach', x: 160, y: 172 });
play(s, [
  ['wreck', 'hand'], ['bottle', 'hand'], ['conch', 'hand'],
  ['east', 'walk'], ['board', 'look'], ['shop', 'walk'],
  ['bram', 'item', 'bottle'], ['door', 'walk'], ['south', 'walk'],
  ['nell', 'item', 'token'], ['boat', 'walk'],
  ['glowcaps', 'hand'], ['cave', 'walk'], ['sibyl', 'talk'], ['sibyl', 'item', 'conch'],
  ['out', 'walk'], ['boat', 'walk'], ['west', 'walk'], ['west', 'walk'], ['west', 'walk'],
  ['door', 'item', 'whistle'], ['door', 'walk'], ['stairs', 'walk'],
  ['stone', 'hand'], ['stairs', 'walk'],
  ['orla', 'item', 'letter'] // refused: no one vouches yet
]);
assert.strictEqual(s.won, false, 'should not win before Elowen trusts you');
play(s, [['elowen', 'item', 'ring'], ['orla', 'item', 'letter']]);
assert.strictEqual(s.won, true);
assert.strictEqual(s.score, G.MAX_SCORE, `score ${s.score} != ${G.MAX_SCORE}`);

// Deaths that must happen.
const dies = (setup, spot, verb, item) => {
  const t = G.newState(); Object.assign(t, setup);
  assert(G.act(t, spot, verb, item).die, `expected death: ${spot}/${verb}`);
};
dies({ room: 'cliffs', flags: { door_open: true } }, 'door', 'walk'); // no light
dies({ room: 'square' }, 'fountain', 'hand');
dies({ room: 'mistshore' }, 'wisp', 'walk');
dies({ room: 'cellar' }, 'guard', 'talk');
dies({ room: 'hall' }, 'varrick', 'talk');

// Every exit points at a real room, and every spot's walk target sits inside its room's walk box.
for (const [id, room] of Object.entries(G.ROOMS)) {
  const [x0, y0, x1, y1] = room.walk;
  for (const sp of room.spots) {
    if (sp.exit) assert(G.ROOMS[sp.exit.to], `${id}/${sp.id} exits to unknown ${sp.exit.to}`);
    if (sp.at) assert(sp.at[0] >= x0 && sp.at[0] <= x1 && sp.at[1] >= y0 && sp.at[1] <= y1, `${id}/${sp.id} walk target outside walk box`);
    if (sp.exit) { const w = G.ROOMS[sp.exit.to].walk; assert(sp.exit.x >= w[0] && sp.exit.x <= w[2] && sp.exit.y >= w[1] && sp.exit.y <= w[3], `${id}/${sp.id} arrival point outside ${sp.exit.to} walk box`); }
  }
}
console.log('walkthrough ok — won with', s.score, 'of', G.MAX_SCORE);
