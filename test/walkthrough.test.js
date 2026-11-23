// Plays the whole game through the logic layer. Run: node test/walkthrough.test.js
const assert = require('assert');
const G = require('../js/game.js');

function step(s, [spot, verb, item]) {
  if (spot === '@choose') { const r = G.choose(s, verb, item); assert(!r.die, `died choosing ${verb}/${item}`); if (r.go) G.enter(s, r.go); return r; }
  if (spot === '@sail') { const r = G.travel(s, verb); assert(r.go, `could not sail to ${verb} from ${s.room}`); G.enter(s, r.go); return r; }
  const r = G.act(s, spot, verb, item);
  assert(!r.die, `died at ${s.room}/${spot}/${verb}: ${r.die}`);
  if (r.go) G.enter(s, r.go);
  return r;
}
const play = (s, steps) => { let r; for (const st of steps) r = step(s, st); return r; };

function fresh() { const s = G.newState(); G.enter(s, { to: 'beach', x: 160, y: 172 }); return s; }

function toTower(s) {
  play(s, [
    ['wreck', 'hand'], ['bottle', 'hand'], ['conch', 'hand'], ['east', 'walk'], ['board', 'look'], ['shop', 'walk'],
    ['bram', 'item', 'bottle'], ['door', 'walk'], ['south', 'walk'], ['nell', 'item', 'token'],
    ['boat', 'walk'], ['@choose', 'ferry', 'mists'],
    ['glowcaps', 'hand'], ['cave', 'walk'], ['sibyl', 'talk'], ['sibyl', 'item', 'conch'], ['out', 'walk'],
    ['boat', 'walk'], ['boat', 'walk'], ['@choose', 'ferry', 'clocks'],
    ['workshop', 'walk'], ['pim', 'talk'], ['door', 'walk'], ['tower', 'walk'], ['gear', 'item', 'oilcan'], ['out', 'walk'],
    ['fishmonger', 'talk'], ['workshop', 'walk'], ['pim', 'talk'], ['door', 'walk'],
    ['boat', 'walk'], ['shore', 'walk'], ['hester', 'item', 'lantern'], ['down', 'walk']
  ]);
  assert(G.has(s, 'compass'));
  assert(play(s, [['boat', 'walk']]).map, 'boat should open the map once you have the chart');
  play(s, [['@sail', 'sentinels']]);
  // Ask the clever question, then climb the opposite of the answer.
  const r = play(s, [['granite', 'talk'], ['@choose', 'ask_granite', 'other']]);
  const said = r.say[0][1].includes('LEFT') ? 'left' : 'right';
  play(s, [[said === 'left' ? 'right' : 'left', 'walk'],
    ['chick', 'item', 'fish'], ['feathers', 'hand'], ['down', 'walk'],
    ['@sail', 'reef'], ['lagoon', 'item', 'whistle'], ['nerissa', 'talk'], ['nerissa', 'item', 'ring'],
    ['@sail', 'crown'], ['west', 'walk'], ['west', 'walk'], ['west', 'walk'],
    ['door', 'item', 'whistle'], ['door', 'walk'], ['stairs', 'walk'], ['stone', 'hand'], ['stairs', 'walk'],
    ['orla', 'item', 'letter']]);
  assert(!s.flags.unmasked, 'Orla should refuse before Elowen vouches');
  play(s, [['elowen', 'item', 'ring'], ['orla', 'item', 'letter']]);
  assert.strictEqual(s.room, 'tower');
  play(s, [['varrick', 'item', 'mirror']]);
}

// Long ending: full score.
const s = fresh(); toTower(s);
play(s, [['king', 'item', 'feather']]);
assert.strictEqual(s.won, 'long');
assert.strictEqual(s.score, G.MAX_SCORE, `score ${s.score} != ${G.MAX_SCORE}`);

// Short ending: leave the king asleep.
const t = fresh(); toTower(t);
assert(play(t, [['down', 'walk']]).choose);
play(t, [['@choose', 'leave', 'go']]);
assert.strictEqual(t.won, 'short');
assert.strictEqual(t.score, G.MAX_SCORE - 20);

// Both sentinel layouts work.
for (const liar of ['granite', 'basalt']) for (const safe of ['left', 'right']) {
  const u = G.newState(); u.room = 'sentbase'; u.flags.liar = liar; u.flags.safe = safe;
  for (const who of ['granite', 'basalt']) {
    delete u.flags.asked;
    const ans = G.choose(u, 'ask_' + who, 'other').say[0][1];
    assert(ans.includes((safe === 'left' ? 'right' : 'left').toUpperCase()), `${liar}/${safe}/${who}: ${ans}`);
  }
}

// Deaths that must happen.
const dies = (room, flags, spot, verb, item) => {
  const d = G.newState(); d.room = room; Object.assign(d.flags, flags);
  if (item) d.inv.push(item);
  assert(G.act(d, spot, verb, item).die, `expected death: ${room}/${spot}/${verb}`);
};
dies('cliffs', { door_open: true }, 'door', 'walk');
dies('square', {}, 'fountain', 'hand');
dies('mistshore', {}, 'wisp', 'walk');
dies('cellar', {}, 'guard', 'talk');
dies('hall', {}, 'varrick', 'talk');
dies('clocktower', { clock: true }, 'gear', 'hand');
dies('aerie', {}, 'feathers', 'hand');
dies('aerie', {}, 'chick', 'hand');
dies('tower', {}, 'varrick', 'item', 'feather');
dies('sentbase', { safe: 'left' }, 'right', 'walk');

// Every exit points at a real room; walk targets and arrivals sit inside walk boxes.
const inBox = (w, x, y) => x >= w[0] && x <= w[2] && y >= w[1] && y <= w[3];
for (const [id, room] of Object.entries(G.ROOMS)) {
  for (const sp of room.spots) {
    if (sp.at) assert(inBox(room.walk, ...sp.at), `${id}/${sp.id} walk target outside walk box`);
    if (sp.exit) { assert(G.ROOMS[sp.exit.to], `${id}/${sp.id} -> unknown ${sp.exit.to}`); assert(inBox(G.ROOMS[sp.exit.to].walk, sp.exit.x, sp.exit.y), `${id}/${sp.id} arrival outside ${sp.exit.to}`); }
  }
}
for (const [k, i] of Object.entries(G.ISLES)) assert(inBox(G.ROOMS[i.to].walk, i.x, i.y), `isle ${k} arrival outside walk box`);
console.log('walkthrough ok — long ending', s.score, 'of', G.MAX_SCORE, '| short ending', t.score);
