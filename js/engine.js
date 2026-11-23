// Crown of Tides — engine: render loop, walking, icon bar, cursors, dialogs, map, save slots, sound.
(function () {
  'use strict';
  const G = window.Game, A = window.Art, M = window.Music;
  const $ = id => document.getElementById(id);
  const cv = $('screen'), cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.body.classList.toggle('mouse', mouse);

  let s = G.newState();
  let verb = 'walk', item = null;
  let walking = null;
  let frame = 0, dir = 1, frameT = 0;
  let queue = [], afterMsgs = null;
  let snapshot = null;       // state before the last action, for "Try again"
  let busy = true;
  let scene = null;          // cinematic painter while the intro plays
  let fade = 0;
  const pref = (k, d) => { const v = localStorage.getItem('cot_' + k); return v === null ? d : v === 'on'; };
  const num = (k, d) => { const v = parseInt(localStorage.getItem('cot_' + k), 10); return isNaN(v) ? d : v; };
  let soundOn = pref('sound', true);
  let volume = num('vol', 7), speed = num('speed', pref('fast', false) ? 5 : 3);
  let talkMode = localStorage.getItem('cot_talk') || 'both';   // text | both | speech, like the CD versions
  let pinned = pref('pinned', false);
  // Who is playing. Each name has its own saves and death album; no name keeps the plain keys.
  const clean = n => (n || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 12);
  let player = clean(localStorage.getItem('cot_player')), explorer = pref('explorer', false), playing = false;
  const slug = () => player.toLowerCase().replace(/ /g, '_');
  const key = k => 'cot2_' + (player ? slug() + '_' : '') + k;
  const nameIt = t => player ? t.replace(/\bRowan\b/g, player) : t;
  const clock = secs => { const m = Math.floor(secs / 60); return (m >= 60 ? Math.floor(m / 60) + 'h ' : '') + (m % 60) + 'm'; };
  const album = () => { try { const a = JSON.parse(localStorage.getItem('cot_album' + (player ? '_' + slug() : ''))); if (Array.isArray(a)) return a; } catch (e) {} return []; };
  M.setOn(pref('music', true)); M.setVolume(volume / 10);
  document.body.classList.toggle('pinned', pinned);

  // ---------- sound effects ----------
  let ac = null;
  const tone = (notes, type = 'square', len = 0.12, vol = 0.05) => {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + i * len;
        o.type = type; o.frequency.value = f; g.gain.setValueAtTime(Math.max(0.0002, vol * volume / 7), t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len * 0.95);
        o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + len);
      });
    } catch (e) { /* audio is optional */ }
  };
  const sfx = {
    score: () => tone([523, 659, 784, 1047], 'square', 0.08),
    die: () => tone([392, 330, 262, 196, 131], 'triangle', 0.22, 0.08),
    win: () => tone([523, 523, 784, 659, 784, 1047, 1047], 'square', 0.16)
  };

  const themeFor = () => {
    const r = s.room;
    if (s.won) return 'title';
    if (r === 'tower') return s.flags.beaten ? 'reef' : 'tower';
    if (['tunnel', 'cellar', 'hall', 'corridor', 'kitchen', 'study', 'gallery'].includes(r)) return 'castle';
    if (r === 'inn') return 'inn';
    return G.ROOMS[r].isle;
  };

  // ---------- status bar ----------
  const status = txt => { $('status-left').textContent = txt || G.ROOMS[s.room].name; };
  const updateScore = () => { $('score').textContent = `Score: ${s.score} of ${G.MAX_SCORE}`; };

  // ---------- messages with talker portraits ----------
  const SPEAKER = { rowan: 'Rowan', bram: 'Old Bram', nell: 'Ferrywoman', oracle: 'The Oracle', pim: 'Pim', hester: 'Hester', fishmonger: 'Fishmonger', guard: 'Guard', granite: 'Granite', basalt: 'Basalt', nerissa: 'Queen Nerissa', elowen: 'Elowen', orla: 'Captain Orla', varrick: 'Varrick', king: 'King Aldous', marla: 'Marla', fennick: 'Fennick', weft: 'Madame Weft', anvil: 'Anvil', bertha: 'Bertha', goggle: 'Goggle', lugs: 'Lugs', snoot: 'Snoot', lick: 'Lick', grabby: 'Grabby' };
  function showMsgs(lines, then) {
    if (!lines || !lines.length) { if (then) then(); return; }
    queue = lines.slice(); afterMsgs = then || null; nextMsg();
  }
  // ---------- spoken dialogue (browser speech, one voice per character) ----------
  const VOICE = {
    narrator: ['m', 0.95, 0.98], rowan: ['m', 1.1, 1.02], bram: ['m', 0.75, 0.9], nell: ['f', 0.8, 0.9], oracle: ['f', 0.6, 0.78],
    pim: ['m', 1.5, 1.15], hester: ['f', 0.85, 0.92], fishmonger: ['m', 0.6, 0.95], guard: ['m', 0.7, 1], granite: ['m', 0.2, 0.75],
    basalt: ['m', 0.35, 0.85], nerissa: ['f', 1.05, 0.9], elowen: ['f', 1.2, 1], orla: ['f', 0.8, 1], varrick: ['m', 0.5, 0.85],
    king: ['m', 0.65, 0.85], marla: ['f', 1, 1.05], fennick: ['m', 1.3, 1.1], weft: ['f', 0.5, 0.8], anvil: ['m', 0.3, 0.9],
    bertha: ['f', 0.9, 0.95], goggle: ['m', 1.9, 1.25], lugs: ['m', 1.7, 1.2], snoot: ['m', 1.6, 1.15], lick: ['f', 1.9, 1.25], grabby: ['m', 1.8, 1.3]
  };
  const FEMALE = /female|samantha|victoria|karen|zira|susan|fiona|moira|tessa|serena|kate|hazel|libby|sonia|aria|jenny/i;
  const MALE = /\bmale|daniel|alex|david|mark|fred|george|rishi|arthur|oliver|guy|ryan|thomas|aaron/i;
  const speech = window.speechSynthesis;
  function pickVoice(g) {
    const en = speech.getVoices().filter(v => /^en/i.test(v.lang));
    return en.find(v => (g === 'f' ? FEMALE : MALE).test(v.name) && !(g === 'm' && FEMALE.test(v.name))) || en[0] || null;
  }
  function speak(who, text, done) {
    if (!speech || talkMode === 'text' || volume === 0) return false;
    speech.cancel();
    const [g, pitch, rate] = VOICE[who] || VOICE.narrator;
    const u = new SpeechSynthesisUtterance(text.replace(/\n+/g, ' '));
    u.voice = pickVoice(g); u.pitch = pitch; u.rate = rate * (speed >= 4 ? 1.15 : 1); u.volume = volume / 10;
    if (done) u.onend = done;
    speech.speak(u); return true;
  }
  const hush = () => { if (speech) speech.cancel(); };

  function nextMsg() {
    hush();
    if (!queue.length) { $('msg').hidden = true; busy = false; const f = afterMsgs; afterMsgs = null; if (f) f(); return; }
    busy = true;
    const line = queue.shift(), who = Array.isArray(line) ? line[0] : null, text = nameIt(Array.isArray(line) ? line[1] : line);
    const pc = $('portrait'), p = pc.getContext('2d');
    p.clearRect(0, 0, pc.width, pc.height);
    pc.hidden = !(who && A.portrait(p, who));
    $('msg-who').textContent = who ? nameIt(SPEAKER[who] || '') : '';
    $('msg-who').hidden = !who;
    $('msg-text').textContent = who ? `“${text}”` : text;
    $('msg').hidden = false; $('msg').focus();
    // Speech only: the voice carries the line and moves on by itself; the box still shows who is talking.
    const solo = talkMode === 'speech';
    const line0 = queue.length;
    const spoke = speak(who || 'narrator', text, solo ? () => { if (!$('msg').hidden && queue.length === line0) setTimeout(() => { if (queue.length === line0 && !$('msg').hidden) nextMsg(); }, 350); } : null);
    $('msg').classList.toggle('voice-only', solo && spoke);
  }
  $('msg').addEventListener('click', nextMsg);

  // ---------- results ----------
  function apply(r, before) {
    if (r.die) { die(r.die); return; }
    if (s.score > before) { updateScore(); postScore(); }
    syncMapBtn();
    showMsgs(r.say, () => {
      if (s.score > before) sfx.score();
      if (r.win) { setTimeout(() => win(r.win), 300); return; }
      if (r.go) changeRoom(r.go);
      if (r.choose) ask(r.choose);
      if (r.map) openMap();
    });
  }

  function changeRoom(go) {
    fade = 1;
    const before = s.score;
    const lines = G.enter(s, go);
    // Arriving at a screen edge: start just off it and walk in, the way the old games did.
    const edge = go.x <= 32 ? -26 : go.x >= 288 ? 26 : 0;
    if (edge) { s.x = go.x + edge; walking = { pts: [[go.x, go.y]] }; }
    if (s.score > before) sfx.score();
    updateScore(); status(); renderItem(); syncMapBtn(); M.start(themeFor());
    autosave();
    if (lines && lines.length) showMsgs(lines);
  }

  // ---------- choices ----------
  function ask(ch) {
    $('choice-prompt').textContent = ch.prompt;
    const box = $('choice-opts'); box.innerHTML = '';
    ch.options.forEach(([id, text]) => {
      const b = document.createElement('button'); b.textContent = text;
      b.addEventListener('click', () => { closePanels(); snapshot = clone(s); const before = s.score; apply(G.choose(s, ch.id, id), before); });
      box.append(b);
    });
    openPanel('choice');
  }

  // ---------- sea chart ----------
  const mc = $('mapcv'), mx = mc.getContext('2d');
  let mapOpen = false;
  function openMap() {
    if (!G.canSail(s)) { showMsgs([G.has(s, 'compass') ? 'The magic map\'s ink won\'t move indoors. It needs open sky.' : 'You don\'t have a map.']); return; }
    mapOpen = true; $('map-hint').textContent = 'Tap an island to set sail.'; openPanel('map');
  }
  const mapXY = e => { const b = mc.getBoundingClientRect(); return [(e.clientX - b.left) * 320 / b.width, (e.clientY - b.top) * 200 / b.height]; };
  const mapHit = e => { const [x, y] = mapXY(e); return Object.keys(A.MAP_SPOTS).find(k => { const [ix, iy, r] = A.MAP_SPOTS[k]; return Math.hypot(x - ix, y - iy) < r; }); };
  mc.addEventListener('click', e => { const k = mapHit(e); if (!k) return; mapOpen = false; closePanels(); const before = s.score; apply(G.travel(s, k), before); });
  mc.addEventListener('pointermove', e => { const k = mapHit(e); mc.style.cursor = k ? 'pointer' : 'default'; $('map-hint').textContent = k ? 'Sail to ' + G.ISLES[k].name : 'Tap an island to set sail.'; });
  $('map-close').addEventListener('click', () => { mapOpen = false; closePanels(); });

  // ---------- walking ----------
  function walkTo(x, y, then) { walking = { pts: G.path(s.room, s.x, s.y, x, y), then }; }
  const scaleAt = y => { const sc = G.ROOMS[s.room].scale; if (!sc) return 1; const [y0, s0, y1, s1] = sc; return s0 + (s1 - s0) * Math.max(0, Math.min(1, (y - y0) / (y1 - y0))); };

  // ---------- input ----------
  const toLogical = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * 320 / b.width, (e.clientY - b.top) * 200 / b.height]; };
  const clone = o => JSON.parse(JSON.stringify(o));
  cv.addEventListener('pointermove', e => {
    if (mouse && !scene) { const b = cv.getBoundingClientRect(); if (e.clientY - b.top < b.height * 0.1) showBar(); }
    if (busy) return;
    const [x, y] = toLogical(e), sp = G.hitSpot(s, x, y);
    status(sp ? sp.name : null);
  });
  cv.addEventListener('pointerleave', () => { if (!busy) status(); });
  // Right-click cycles verbs, like the old Sierra games.
  cv.addEventListener('contextmenu', e => { e.preventDefault(); if (busy) return; const order = ['walk', 'look', 'hand', 'talk'].concat(item ? ['item'] : []); setVerb(order[(order.indexOf(verb) + 1) % order.length]); });
  cv.addEventListener('click', e => {
    if (scene) { skipIntro(); return; }
    if (busy) return;
    const [x, y] = toLogical(e), sp = G.hitSpot(s, x, y);
    if (verb === 'item' && !item) { openInv(); return; }
    if (!sp) {
      if (verb === 'walk') walkTo(x, y);
      else showMsgs([verb === 'look' ? DESC[s.room] : 'There\'s nothing there.']);
      return;
    }
    status(sp.name);
    const run = () => { snapshot = clone(s); const before = s.score; apply(G.act(s, sp.id, verb, item), before); if (verb === 'item' && !G.has(s, item)) { item = null; renderItem(); } };
    if (verb === 'look') run();
    else if (sp.at) walkTo(sp.at[0], sp.at[1], run);
    else if (verb === 'walk') walkTo(x, y, run);
    else run();
  });

  const DESC = {
    beach: 'A wide golden beach strewn with the remains of your ship. Cliffs rise to the west; a path leads east toward a village.',
    cliffs: 'Windy cliffs high above the sea. A strange doorway is carved into the rock face.',
    square: 'The village square of Saltmarrow, in the shadow of Tidewater Castle.',
    shop: 'A cluttered little curio shop that smells of salt and old rope.',
    docks: 'Weathered docks. A ferry waits at the end of the pier, and a path runs south along the shore to the lighthouse.',
    lighthouse: 'The lamp room at the top of the lighthouse, with windows on every side.',
    mistshore: 'A gloomy, misty shore. Something about this island makes the hair on your neck stand up.',
    oracle: 'A grotto lit by a glowing pool and a few guttering candles.',
    clockharbor: 'The harbor town of the Clockmakers, all brass and gears.',
    workshop: 'Pim\'s workshop: clocks on every wall, inventions on every surface.',
    clocktower: 'The inside of the clock tower, a cathedral of gears.',
    sentbase: 'The foot of a great spire of rock, guarded by two stone sentinels.',
    aerie: 'The windswept summit of the Sentinel Isle, above the clouds.',
    reef: 'A pink coral beach beside a turquoise lagoon.',
    tunnel: 'A cramped, damp smugglers\' tunnel. Mind your step.',
    cellar: 'The castle cellar, full of barrels and one snoring guard.',
    hall: 'The Great Hall, dressed for a wedding nobody seems happy about.',
    tower: 'The top of the tallest tower.',
    inn: 'The Drowned Sailor: low beams, a roaring fire and almost no customers.',
    mistwood: 'A dark, dripping wood. Something in the web is watching you.',
    gearworks: 'The Great Forge of the Clockmakers.',
    ledge: 'A narrow ledge halfway up the spire. The wind is trying very hard to make friends.',
    tidepools: 'Tide pools beneath a great coral arch.',
    corridor: 'A torchlit servants\' hall deep inside the castle.',
    kitchen: 'The castle kitchen, hot and loud and smelling of roast boar.',
    study: 'The Grand Steward\'s private study.',
    gallery: 'A long gallery of royal portraits, ending at the doors of the Great Hall.'
  };

  // ---------- icon bar + cursors ----------
  let barTimer = null;
  function showBar() { if (!mouse || pinned) return; clearTimeout(barTimer); $('icons').classList.add('show'); }
  function hideBar() { if (!mouse || pinned) return; clearTimeout(barTimer); barTimer = setTimeout(() => $('icons').classList.remove('show'), 350); }
  const HELP = {
    walk: 'Walk: click anywhere on the screen to walk there. Click a doorway or path to go through it.',
    look: 'Look: click on anything to look at it. Click on empty ground to look around the whole scene.',
    hand: 'Hand: pick things up, open doors, push, pull and generally get your hands dirty.',
    talk: 'Talk: click on someone to talk to them. Talking to things that are not people is allowed, but rarely rewarding.',
    item: 'Item: the thing you are holding. Click it on someone or something to use it there. Choose it from your bag first.',
    'btn-map': 'Magic map: the sea chart. Open it anywhere outdoors to sail to another island.',
    'btn-inv': 'Bag: everything you are carrying. Look at items, use them on each other, or choose one to use in the world.',
    'btn-menu': 'Controls: save, restore, restart, hints, volume, walking speed, spoken dialogue and the icon bar.',
    'btn-help': 'Help: pick this, then any icon, and you will be told what it does. Exactly like now.'
  };
  let helpMode = false;
  const setHelp = on => { helpMode = on; document.body.classList.toggle('help-mode', on); };
  $('icons').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.id === 'btn-help') { e.stopImmediatePropagation(); setHelp(!helpMode); return; }
    if (!helpMode) return;
    e.stopImmediatePropagation(); setHelp(false); $('icons').classList.remove('show');
    showMsgs([HELP[b.dataset.verb || b.id] || b.title]);
  }, true);
  $('icons').addEventListener('pointerenter', showBar);
  $('icons').addEventListener('pointerleave', hideBar);

  const cursorFor = {};
  document.querySelectorAll('[data-verb] svg').forEach(svg => {
    const inner = svg.innerHTML;
    const art = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#000" stroke-width="4">${inner}</g><g stroke="#f3d27a" stroke-width="1.8">${inner}</g></svg>`;
    cursorFor[svg.parentElement.dataset.verb] = `url("data:image/svg+xml,${encodeURIComponent(art)}") 16 16, crosshair`;
  });
  function applyCursor() {
    if (verb === 'item' && item) {
      const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
      x.imageSmoothingEnabled = false; x.drawImage($('item-icon'), 4, 4, 24, 24);
      cv.style.cursor = `url(${c.toDataURL()}) 16 16, pointer`;
    } else cv.style.cursor = cursorFor[verb] || 'crosshair';
  }

  document.querySelectorAll('[data-verb]').forEach(b => b.addEventListener('click', () => {
    if (busy) return;
    const v = b.dataset.verb;
    if (v === 'item' && !item) { openInv(); return; }
    setVerb(v); $('icons').classList.remove('show');
  }));
  function setVerb(v) {
    verb = v;
    document.querySelectorAll('[data-verb]').forEach(b => b.setAttribute('aria-pressed', b.dataset.verb === v));
    applyCursor();
  }
  function renderItem() {
    const c = $('item-icon').getContext('2d'); c.clearRect(0, 0, 24, 24);
    if (item && G.has(s, item)) { A.items[item](c); $('btn-item').title = 'Use ' + G.ITEMS[item].name; }
    else { item = null; $('btn-item').title = 'Use an item'; if (verb === 'item') setVerb('walk'); }
    applyCursor();
  }
  $('btn-inv').addEventListener('click', () => { if (!busy) { $('icons').classList.remove('show'); openInv(); } });
  $('btn-map').addEventListener('click', () => { if (!busy) { $('icons').classList.remove('show'); openMap(); } });
  const syncMapBtn = () => { $('btn-map').hidden = !G.has(s, 'compass'); $('icons').classList.toggle('has-map', G.has(s, 'compass')); };
  $('btn-menu').addEventListener('click', () => { if (!busy) { $('icons').classList.remove('show'); openPanel('menu'); } });

  // ---------- inventory: its own little verb bar, like the old games ----------
  let invSel = null, invVerb = 'look', combining = false;
  function invSay(r) {
    if (r.map) { closePanels(); openMap(); return; }
    if (r.sound === 'whistle') tone([659, 784, 988], 'sine', 0.22, 0.06);
    $('inv-desc').textContent = (r.say || []).map(l => Array.isArray(l) ? `“${l[1]}”` : l).join(' ');
  }
  function setInvVerb(v) {
    invVerb = v; combining = v === 'combine';
    document.querySelectorAll('[data-iverb]').forEach(b => b.setAttribute('aria-pressed', b.dataset.iverb === v));
    if (combining) $('inv-desc').textContent = invSel ? `Use ${G.ITEMS[invSel].name} on which item?` : 'Pick the first item, then the item to use it on.';
  }
  function openInv() {
    const grid = $('inv-grid'); grid.innerHTML = ''; invSel = null; setInvVerb('look');
    $('inv-desc').textContent = s.inv.length ? 'Pick an action, then an item.' : 'You aren\'t carrying anything yet.';
    s.inv.forEach(id => {
      const b = document.createElement('button'); b.className = 'inv-item'; b.setAttribute('aria-label', G.ITEMS[id].name); b.dataset.id = id;
      const c = document.createElement('canvas'); c.width = c.height = 24; A.items[id](c.getContext('2d'));
      const l = document.createElement('span'); l.textContent = G.ITEMS[id].name;
      b.append(c, l);
      b.addEventListener('click', () => {
        if (combining && invSel && invSel !== id) { invSay(G.invAct(s, invSel, 'item', id)); combining = false; setInvVerb('look'); return; }
        invSel = id; grid.querySelectorAll('.inv-item').forEach(x => x.classList.toggle('sel', x === b));
        if (invVerb === 'select') { item = id; renderItem(); setVerb('item'); closePanels(); return; }
        if (combining) { setInvVerb('combine'); return; }
        invSay(G.invAct(s, id, invVerb));
      });
      grid.append(b);
    });
    openPanel('inv');
  }
  document.querySelectorAll('[data-iverb]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.iverb;
    if (v === 'select' && invSel) { item = invSel; renderItem(); setVerb('item'); closePanels(); return; }
    setInvVerb(v);
    if (v !== 'combine' && v !== 'select' && invSel) invSay(G.invAct(s, invSel, v));
    if (v === 'select' && !invSel) $('inv-desc').textContent = 'Pick the item you want to use in the world.';
  }));

  // ---------- hint book ----------
  function openHints() {
    const h = G.hints(s);
    $('hint-q').textContent = h.q; $('hint-a').textContent = '';
    $('hint-nudge').hidden = explorer; $('hint-answer').hidden = true;
    if (explorer) $('hint-a').textContent = h.nudge + '\n\n' + h.answer;   // young explorers get the answer straight away
    $('hint-nudge').onclick = () => { $('hint-a').textContent = h.nudge; $('hint-nudge').hidden = true; $('hint-answer').hidden = false; };
    $('hint-answer').onclick = () => { $('hint-a').textContent = h.answer; $('hint-answer').hidden = true; };
    openPanel('hints');
  }
  $('m-hints').addEventListener('click', openHints);

  // ---------- panels ----------
  function openPanel(id) { busy = true; document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== id); const f = $(id).querySelector('button:not([disabled])'); if (f) f.focus(); }
  function closePanels() { document.querySelectorAll('.panel').forEach(p => p.hidden = true); busy = !$('msg').hidden; }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { mapOpen = false; closePanels(); }));
  document.addEventListener('keydown', e => {
    const open = document.querySelector('.panel:not([hidden])');
    if (e.key === 'Escape' && open && !open.matches('#title,#death,#end,#choice')) { mapOpen = false; closePanels(); }
    if ((e.key === 'Enter' || e.key === ' ') && !$('msg').hidden) { e.preventDefault(); nextMsg(); }
    if (scene && e.key === 'Escape') skipIntro();
  });

  // ---------- save slots ----------
  const SLOTS = 3;
  const autosave = () => { try { localStorage.setItem(key('auto'), JSON.stringify(s)); } catch (e) {} };
  function load(key) { try { const d = JSON.parse(localStorage.getItem(key)); if (d && G.ROOMS[d.room]) return d; } catch (e) {} return null; }
  function openSlots(mode) {
    $('slots-title').textContent = mode === 'save' ? 'Save game' : 'Restore game';
    const box = $('slot-list'); box.innerHTML = '';
    const keys = (mode === 'restore' ? [[key('auto'), 'Autosave']] : []).concat([1, 2, 3].slice(0, SLOTS).map(i => [key('slot' + i), 'Slot ' + i]));
    keys.forEach(([key, label]) => {
      const d = load(key), b = document.createElement('button');
      b.textContent = `${label}: ${d ? `${G.ROOMS[d.room].name}, ${d.score} points` : 'empty'}`;
      b.disabled = mode === 'restore' && !d;
      b.addEventListener('click', () => {
        if (mode === 'save') { try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {} closePanels(); showMsgs(['Game saved to ' + label + '.']); }
        else { startFrom(d); showMsgs(['Game restored.']); }
      });
      box.append(b);
    });
    openPanel('slots');
  }
  $('m-save').addEventListener('click', () => openSlots('save'));
  $('m-restore').addEventListener('click', () => openSlots('restore'));
  $('m-restart').addEventListener('click', () => newGame());
  const toggleLabel = () => {
    $('m-sound').textContent = 'Sound: ' + (soundOn ? 'On' : 'Off');
    $('m-music').textContent = 'Music: ' + (M.on ? 'On' : 'Off');
    $('m-talk').textContent = 'Dialogue: ' + { text: 'Text only', both: 'Text & Speech', speech: 'Speech only' }[talkMode];
    $('m-bar').textContent = 'Icon bar: ' + (pinned ? 'Always shown' : 'Drops down');
    $('m-explorer').textContent = 'Sparkles: ' + (explorer ? 'On' : 'Off');
    $('m-vol').value = volume; $('m-spd').value = speed;
  };
  $('m-sound').addEventListener('click', () => { soundOn = !soundOn; localStorage.setItem('cot_sound', soundOn ? 'on' : 'off'); toggleLabel(); });
  $('m-music').addEventListener('click', () => { M.setOn(!M.on); localStorage.setItem('cot_music', M.on ? 'on' : 'off'); if (M.on) M.start(themeFor()); toggleLabel(); });
  $('m-talk').addEventListener('click', () => { talkMode = { text: 'both', both: 'speech', speech: 'text' }[talkMode]; localStorage.setItem('cot_talk', talkMode); toggleLabel(); if (talkMode !== 'text') speak('narrator', 'Very well.'); });
  $('m-bar').addEventListener('click', () => { pinned = !pinned; localStorage.setItem('cot_pinned', pinned ? 'on' : 'off'); document.body.classList.toggle('pinned', pinned); $('icons').classList.remove('show'); toggleLabel(); });
  $('m-vol').addEventListener('input', e => { volume = +e.target.value; localStorage.setItem('cot_vol', volume); M.setVolume(volume / 10); });
  $('m-vol').addEventListener('change', () => { tone([523, 659], 'square', 0.08); speak('narrator', 'Volume ' + volume + '.'); });
  $('m-spd').addEventListener('input', e => { speed = +e.target.value; localStorage.setItem('cot_speed', speed); });
  toggleLabel();
  $('m-about').addEventListener('click', () => openPanel('about'));

  function startFrom(state) {
    s = state; item = null; walking = null; scene = null; mapOpen = false; setVerb('walk'); closePanels(); busy = false;
    updateScore(); status(); renderItem(); syncMapBtn(); fade = 1; M.start(themeFor()); playing = true;
  }
  function newGame() { startFrom(G.newState()); showMsgs(G.enter(s, { to: 'beach', x: 160, y: 172 }) || []); }

  // ---------- intro cinematic ----------
  const INTRO = [
    ['mirror', [
      'In the kingdom of Thornmere, a travelling seer showed Prince Rowan a magic mirror.',
      'In its glass he saw a princess with copper hair and sea-green eyes: Elowen of the Tidewater Isles, a month\'s sail to the south.',
      'The seer swore the vision was a cry for help. Rowan set sail the very next morning.'
    ]],
    ['storm', [
      'Thirty days out, a storm rose from a clear sky, black and wrong, as if someone had summoned it.',
      'Off the Tidewater Isles, the lighthouse that should have warned them stood dark.'
    ]]
  ];
  function playIntro() {
    let i = 0;
    closePanels(); M.start('mists');
    status('Crown of Tides');
    const next = () => {
      if (!scene) return;
      if (i >= INTRO.length) { scene = null; newGame(); return; }
      const [name, lines] = INTRO[i++]; scene = A.cine[name]; fade = 1;
      showMsgs(lines, next);
    };
    scene = true; next();
  }
  function skipIntro() { queue = []; afterMsgs = null; $('msg').hidden = true; scene = null; newGame(); }
  $('intro-skip').addEventListener('click', e => { e.stopPropagation(); if (scene) skipIntro(); });
  $('t-new').addEventListener('click', playIntro);
  $('t-continue').addEventListener('click', () => { const d = load(key('auto')); if (d) startFrom(d); });
  const syncTitle = () => { const d = load(key('auto')); $('t-continue').hidden = !d; $('t-continue').textContent = player ? 'Continue as ' + player : 'Continue'; };
  $('t-name').value = player; $('t-explorer').checked = explorer; syncTitle();
  $('t-name').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\p{L}\p{N} ]/gu, ''); player = clean(e.target.value); localStorage.setItem('cot_player', player); syncTitle(); });
  const setExplorer = on => { explorer = on; localStorage.setItem('cot_explorer', on ? 'on' : 'off'); $('t-explorer').checked = on; toggleLabel(); };
  $('t-explorer').addEventListener('change', e => setExplorer(e.target.checked));
  $('m-explorer').addEventListener('click', () => setExplorer(!explorer));

  // ---------- death album ----------
  function openAlbum(back) {
    const got = album(), box = $('album-list'); box.innerHTML = '';
    G.DEATHS.forEach(([, title]) => { const li = document.createElement('li'); const f = got.includes(title); li.textContent = f ? title : '? ? ?'; li.className = f ? 'found' : ''; box.append(li); });
    $('album-count').textContent = `${player ? player + ' has' : 'You have'} found ${got.length} of ${G.DEATHS.length} ways to die. Try everything!`;
    $('album-close').onclick = () => { if (back) openPanel(back); else closePanels(); };
    openPanel('album');
  }
  $('m-album').addEventListener('click', () => openAlbum());
  $('d-album').addEventListener('click', () => openAlbum('death'));

  // ---------- family scoreboard ----------
  let lastPost = 0;
  function postScore(force) {
    if (!player || (!force && Date.now() - lastPost < 60000)) return;
    lastPost = Date.now();
    window.Board.post({ name: player, score: s.score, ending: s.won || '', secs: Math.round(s.secs || 0), deaths: album().length });
  }
  function openBoard(back) {
    const rows = $('board-rows'); rows.innerHTML = '';
    $('board-note').textContent = window.Board.on ? 'Fetching scores...' : 'The scoreboard is not set up yet.';
    $('board-close').onclick = () => { if (back) openPanel(back); else closePanels(); };
    openPanel('board');
    if (!window.Board.on) return;
    if (playing) postScore(true);
    const me = window.Board.dev() + ':' + player.toLowerCase();
    window.Board.list().then(list => {
      $('board-note').textContent = list.length ? (player ? '' : 'Type your name on the title screen to join the board.') : 'No scores yet. Be the first!';
      list.slice(0, 30).forEach((r, i) => {
        const tr = document.createElement('tr'); if (r.id === me) tr.className = 'me';
        [i + 1, r.name, r.score, r.ending === 'long' ? 'Happily ever after' : r.ending === 'short' ? 'The End?' : 'still playing', clock(r.secs), r.deaths + ' of ' + G.DEATHS.length]
          .forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
        rows.append(tr);
      });
    }).catch(() => { $('board-note').textContent = 'Could not reach the scoreboard. Your game is fine; try again later.'; });
  }
  $('t-board').addEventListener('click', () => openBoard('title'));
  $('m-board').addEventListener('click', () => openBoard());
  $('e-board').addEventListener('click', () => openBoard('end'));

  // ---------- death / endings ----------
  function die(text) {
    sfx.die(); walking = null; playing = false;
    const title = G.deathTitle(text), got = album(), fresh = title && !got.includes(title);
    if (fresh) { got.push(title); try { localStorage.setItem('cot_album' + (player ? '_' + slug() : ''), JSON.stringify(got)); } catch (e) {} }
    $('death-name').textContent = title ? `${fresh ? 'New death! ' : ''}“${title}” — ${got.length} of ${G.DEATHS.length} found` : '';
    $('death-text').textContent = nameIt(text);
    openPanel('death');
  }
  $('d-retry').addEventListener('click', () => { if (snapshot) { snapshot.secs = s.secs; for (const k of Object.keys(snapshot.flags)) if (k.startsWith('warn_')) delete snapshot.flags[k];   // after a death you get the warning again
    startFrom(snapshot); } });
  $('d-restore').addEventListener('click', () => openSlots('restore'));
  $('d-restart').addEventListener('click', newGame);

  const ENDINGS = {
    long: ['Happily Ever After', 'King Aldous gives his blessing before the cake is even cut. The lighthouse burns every night, the clocks keep perfect time, and a small, cross crab lives out his days in the castle moat.\n\nRowan and Elowen sail for Thornmere in the spring, with a golden roc flying escort.'],
    short: ['The End?', 'Varrick is gone and Elowen is free. But the old king sleeps on in his tower, and the wedding waits for a father who cannot give his blessing.\n\nSomewhere, perhaps, a golden feather could have woken him.']
  };
  function win(kind) {
    sfx.win(); M.start('title'); localStorage.removeItem(key('auto')); playing = false;
    $('end-title').textContent = ENDINGS[kind][0];
    $('end-text').textContent = nameIt(ENDINGS[kind][1]);
    $('end-stats').textContent = `Time: ${clock(s.secs || 0)}. Deaths found: ${album().length} of ${G.DEATHS.length}.` + (kind === 'short' ? ' There is a happier ending to find.' : '');
    postScore(true);
    $('end-score').textContent = `Final score: ${s.score} of ${G.MAX_SCORE}`;
    openPanel('end');
  }
  $('e-again').addEventListener('click', newGame);

  // ---------- render loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    document.body.classList.toggle('cine', !!scene);
    if (typeof scene === 'function') scene(cx, s, t);
    else {
      if (walking) {
        const [tx, ty] = walking.pts[0], dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
        const sp = [40, 55, 70, 95, 130][speed - 1] * dt * scaleAt(s.y);
        if (Math.abs(dx) > 0.5) dir = dx > 0 ? 1 : -1;
        frameT += dt; if (frameT > 0.14) { frameT = 0; frame++; }
        if (d <= sp) {
          s.x = tx; s.y = ty; walking.pts.shift();
          if (!walking.pts.length) { const f = walking.then; walking = null; frame = 0; if (f) f(); }
        } else { s.x += dx / d * sp; s.y += dy / d * sp; }
      }
      const room = A.rooms[s.room];
      cx.clearRect(0, 0, 320, 200);
      const painted = A.drawRoom(cx, s.room, s, t);
      if (!painted) room.bg(cx, s, t);
      const sc = scaleAt(s.y);
      const actors = (room.actors ? room.actors(s, t) : []).concat([{ y: s.y, d: c => A.player(c, s.x, s.y, frame, dir, sc) }]);
      actors.sort((a, b) => a.y - b.y).forEach(a => a.d(cx));
      if (room.post && (!painted || s.room === 'tunnel' || s.room === 'mistshore')) room.post(cx, s, t);
      if (!painted && !G.ROOMS[s.room].outdoors && s.room !== 'tunnel') A.vignette(cx);
      if (playing) s.secs = (s.secs || 0) + dt;
      // Young explorer: a twinkle on everything that can be touched.
      if (explorer && playing && !busy) G.spotsIn(s, s.room).forEach((sp, i) => {
        if (!sp.rect || sp.id === 'sea') return;
        const a = (Math.sin(t * 3 + i * 1.7) + 1) / 2, x = Math.round(sp.rect[0] + sp.rect[2] / 2), y = Math.round(sp.rect[1] + sp.rect[3] / 2), r = 1 + Math.round(a * 2);
        cx.fillStyle = `rgba(20,12,40,${0.25 + a * 0.45})`; cx.fillRect(x - r - 1, y - 1, r * 2 + 3, 3); cx.fillRect(x - 1, y - r - 1, 3, r * 2 + 3);   // dark edge so it shows on sand and sky
        cx.fillStyle = `rgba(255,250,210,${0.55 + a * 0.45})`; cx.fillRect(x - r, y, r * 2 + 1, 1); cx.fillRect(x, y - r, 1, r * 2 + 1);
      });
    }
    // VGA finish: grain + this scene's own 256-colour palette with ordered dither.
    const f = s.flags; window.VGA.finish(cx, (typeof scene === 'function' ? 'cine' + INTRO.findIndex(x => A.cine[x[0]] === scene) : s.room) + (f.lit ? 'L' : '') + (f.beaten ? 'B' : '') + (s.won ? 'W' : '') + (f.clock ? 'C' : '') + (f.summoned ? 'S' : ''));
    if (mapOpen) A.chart(mx, s, t, G.ROOMS[s.room].isle);
    if (fade > 0) { cx.fillStyle = `rgba(0,0,0,${fade})`; cx.fillRect(0, 0, 320, 200); fade = Math.max(0, fade - dt * 3); }
    requestAnimationFrame(loop);
  }

  s.room = 'beach'; updateScore(); status('Crown of Tides'); setVerb('walk');
  // Browsers only allow audio after a tap, so the title theme starts on the first one.
  document.addEventListener('pointerdown', () => { if (!s.flags.seen_beach && !scene) M.start('title'); }, { once: true });
  openPanel('title');
  requestAnimationFrame(loop);
})();
