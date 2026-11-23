// Plays the whole game through the logic layer. Run: node test/walkthrough.test.js
const assert = require('assert');
const G = require('../js/game.js');

function step(s, [spot, verb, item]) {
  if (spot === '@choose') { const r = G.choose(s, verb, item); assert(!r.die, `died choosing ${verb}/${item}`); if (r.go) G.enter(s, r.go); return r; }
  if (spot === '@notsummoned') { assert(!s.flags.summoned, 'wardens should block the whistle'); return {}; }
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
    ['bram', 'item', 'bottle'], ['door', 'walk'], ['inn', 'walk'], ['marla', 'talk'], ['fennick', 'talk'], ['jar', 'hand'], ['out', 'walk'],
    ['south', 'walk'], ['nell', 'item', 'token'],
    ['boat', 'walk'], ['@choose', 'ferry', 'mists'],
    ['glowcaps', 'hand'], ['cave', 'walk'], ['sibyl', 'talk'], ['sibyl', 'item', 'conch'], ['out', 'walk'],
    ['west', 'walk'], ['weft', 'item', 'glowcap'], ['stinkhorn', 'hand'], ['east', 'walk'],
    ['boat', 'walk'], ['west', 'walk'], ['inn', 'walk'], ['fennick', 'item', 'thread'], ['out', 'walk'], ['south', 'walk'],
    ['boat', 'walk'], ['@choose', 'ferry', 'clocks'],
    ['workshop', 'walk'], ['pim', 'talk'], ['door', 'walk'], ['tower', 'walk'], ['gear', 'item', 'oilcan'], ['out', 'walk'],
    ['fishmonger', 'talk'], ['workshop', 'walk'], ['pim', 'talk'], ['bench', 'hand'], ['back', 'walk'], ['forge', 'item', 'emptylantern'], ['west', 'walk'], ['door', 'walk'],
    ['boat', 'walk'], ['shore', 'walk'], ['hester', 'item', 'lantern'], ['down', 'walk']
  ]);
  assert(G.has(s, 'compass') && G.has(s, 'lantern'), 'Hester gives the map and hands the lantern back');
  assert(play(s, [['boat', 'walk']]).map, 'boat should open the map once you have it');
  play(s, [['@sail', 'sentinels']]);
  const r = play(s, [['kelp', 'hand'], ['granite', 'talk'], ['@choose', 'ask_granite', 'other']]);
  const said = r.say[0][1].includes('LEFT') ? 'left' : 'right';
  play(s, [[said === 'left' ? 'right' : 'left', 'walk']]);
  assert.strictEqual(s.room, 'ledge');
  assert(!play(s, [['up', 'walk']]).go, 'the goat should block the ledge');
  play(s, [['goat', 'item', 'bun'], ['up', 'walk'],
    ['chick', 'item', 'fish'], ['feathers', 'hand'], ['down', 'walk'],
    ['@sail', 'reef'],
    ['lagoon', 'item', 'whistle'], ['@notsummoned'],
    ['goggle', 'item', 'prism'], ['lugs', 'item', 'rattler'], ['snoot', 'item', 'stinkhorn'], ['lick', 'item', 'pickle'], ['grabby', 'item', 'kelp'],
    ['lagoon', 'item', 'whistle'], ['nerissa', 'talk'], ['nerissa', 'item', 'ring'],
    ['west', 'walk'], ['octopus', 'hand'], ['east', 'walk'],
    ['@sail', 'crown'], ['west', 'walk'], ['west', 'walk'], ['west', 'walk'],
    ['door', 'item', 'whistle'], ['door', 'walk'], ['stairs', 'walk'], ['stone', 'hand'], ['keys', 'hand'],
    ['back', 'walk'], ['back', 'walk'], ['east', 'walk'], ['east', 'walk'], ['fountain', 'item', 'coin'], ['west', 'walk'], ['west', 'walk'], ['door', 'walk'], ['stairs', 'walk'], ['stairs', 'walk'],
    ['hound', 'item', 'songsheet'], ['study', 'item', 'keys'], ['study', 'walk'], ['desk', 'hand'], ['out', 'walk'],
    ['kitchen', 'walk'], ['bertha', 'item', 'ring'], ['out', 'walk'],
    ['arch', 'walk'], ['doors', 'walk'],
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
assert.strictEqual(t.score, G.MAX_SCORE - 12);

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
dies('mistwood', {}, 'web', 'hand');
dies('reef', {}, 'lick', 'hand');
dies('mistwood', {}, 'weft', 'hand');
dies('ledge', {}, 'goat', 'hand');
dies('corridor', {}, 'kitchen', 'walk');
dies('corridor', {}, 'hound', 'hand');
dies('gallery', {}, 'doors', 'walk');
dies('gearworks', { clock: true }, 'forge', 'hand');

// Every exit points at a real room; walk targets and arrivals sit inside walk boxes.
const inBox = (w, x, y) => x >= w[0] && x <= w[2] && y >= w[1] && y <= w[3];
for (const [id, room] of Object.entries(G.ROOMS)) {
  for (const sp of room.spots) {
    if (sp.at) assert(inBox(room.walk, ...sp.at), `${id}/${sp.id} walk target outside walk box`);
    if (sp.exit) { assert(G.ROOMS[sp.exit.to], `${id}/${sp.id} -> unknown ${sp.exit.to}`); assert(inBox(G.ROOMS[sp.exit.to].walk, sp.exit.x, sp.exit.y), `${id}/${sp.id} arrival outside ${sp.exit.to}`); }
  }
}
for (const [k, i] of Object.entries(G.ISLES)) assert(inBox(G.ROOMS[i.to].walk, i.x, i.y), `isle ${k} arrival outside walk box`);
// Magic map: works from any outdoor screen, never indoors.
{
  const m = G.newState(); m.flags.compass = true; m.inv.push('compass');
  m.room = 'cliffs'; assert(G.travel(m, 'reef').go, 'map should work on the cliffs');
  m.room = 'shop'; assert(!G.travel(m, 'reef').go, 'map should not work indoors');
  m.room = 'tower'; assert(!G.travel(m, 'reef').go, 'map should not work in the tower');
  m.room = 'square'; assert(G.act(m, 'board', 'item', 'compass').map, 'using the map on anything outdoors opens it');
}

// Pathfinding: every walk target and arrival is free, and reachable from every arrival point without crossing a block.
for (const [id, room] of Object.entries(G.ROOMS)) {
  const targets = room.spots.filter(sp => sp.at).map(sp => sp.at);
  const starts = [];
  for (const [rid, r] of Object.entries(G.ROOMS)) for (const sp of r.spots) if (sp.exit && sp.exit.to === id) starts.push([sp.exit.x, sp.exit.y]);
  for (const [x, y] of targets.concat(starts)) assert(G.freeAt(id, x, y), `${id}: point ${x},${y} is inside a block`);
  for (const [sx, sy] of starts) for (const [tx, ty] of targets) {
    const pts = G.path(id, sx, sy, tx, ty), last = pts[pts.length - 1];
    assert(Math.hypot(last[0] - tx, last[1] - ty) < 1, `${id}: path to ${tx},${ty} ends at ${last}`);
    let px = sx, py = sy;
    for (const [qx, qy] of pts) { for (let i = 1; i <= 20; i++) assert(G.freeAt(id, px + (qx - px) * i / 20, py + (qy - py) * i / 20) || i < 2, `${id}: path crosses a block`); px = qx; py = qy; }
  }
}

// Every item answers Look/Hand/Talk; hints exist at every stage of the long walkthrough.
for (const id of Object.keys(G.ITEMS)) { const h = G.newState(); h.inv.push(id); for (const v of ['look', 'hand', 'talk']) { const r = G.invAct(h, id, v); assert(r.say || r.map, `${id}/${v}`); } }
assert.strictEqual(G.newState().inv.length, 0);
{ const h = fresh(); const seen = new Set(); seen.add(G.hints(h).q); toTower(h); seen.add(G.hints(h).q); assert(seen.size === 2 && G.hints(h).answer.includes('Feather')); }

console.log('walkthrough ok — long ending', s.score, 'of', G.MAX_SCORE, '| short ending', t.score);
