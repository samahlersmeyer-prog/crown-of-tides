// Crown of Tides — engine: rendering loop, walking, icon bar, dialogs, save/restore, sound.
(function () {
  'use strict';
  const G = window.Game, A = window.Art;
  const $ = id => document.getElementById(id);
  const cv = $('screen'), cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;

  let s = G.newState();
  let verb = 'walk', item = null;
  let walking = null;           // {tx, ty, then}
  let frame = 0, dir = 1, frameT = 0;
  let queue = [], afterMsgs = null;
  let snapshot = null;          // state before the last action, for "Try again"
  let busy = true;              // title / dialogs block input
  let soundOn = localStorage.getItem('cot_sound') !== 'off';
  let fade = 0;

  // ---------- sound ----------
  let ac = null;
  const tone = (notes, type = 'square', len = 0.12, vol = 0.05) => {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + i * len;
        o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len * 0.95);
        o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + len);
      });
    } catch (e) { /* audio is optional */ }
  };
  const sfx = {
    score: () => tone([523, 659, 784, 1047], 'square', 0.08),
    die: () => tone([392, 330, 262, 196, 131], 'triangle', 0.22, 0.08),
    win: () => tone([523, 523, 784, 659, 784, 1047, 1047], 'square', 0.16),
    step: () => tone([880], 'sine', 0.05, 0.02)
  };

  // ---------- status bar ----------
  const status = txt => { $('status-left').textContent = txt || G.ROOMS[s.room].name; };
  const updateScore = () => { $('score').textContent = `Score: ${s.score} of ${G.MAX_SCORE}`; };

  // ---------- messages ----------
  function showMsgs(lines, then) {
    if (!lines || !lines.length) { if (then) then(); return; }
    queue = lines.slice(); afterMsgs = then || null; nextMsg();
  }
  function nextMsg() {
    if (!queue.length) { $('msg').hidden = true; busy = false; const f = afterMsgs; afterMsgs = null; if (f) f(); return; }
    busy = true; $('msg-text').textContent = queue.shift(); $('msg').hidden = false; $('msg').focus();
  }
  $('msg').addEventListener('click', nextMsg);

  // ---------- results ----------
  function apply(r, before) {
    if (r.die) { die(r.die); return; }
    const done = () => {
      if (s.score > before) sfx.score();
      if (r.win) { setTimeout(win, 300); return; }
      if (r.go) changeRoom(r.go);
    };
    if (s.score > before) updateScore();
    showMsgs(r.say, done);
  }

  function changeRoom(go) {
    fade = 1;
    const lines = G.enter(s, go);
    updateScore(); status(); renderItem();
    autosave();
    if (lines && lines.length) showMsgs(lines);
  }

  // ---------- walking ----------
  const clampWalk = (x, y) => { const [x0, y0, x1, y1] = G.ROOMS[s.room].walk; return [Math.max(x0, Math.min(x1, x)), Math.max(y0, Math.min(y1, y))]; };
  function walkTo(x, y, then) { const [tx, ty] = clampWalk(x, y); walking = { tx, ty, then }; }

  // ---------- input ----------
  function toLogical(e) {
    const b = cv.getBoundingClientRect();
    return [(e.clientX - b.left) * 320 / b.width, (e.clientY - b.top) * 200 / b.height];
  }
  cv.addEventListener('pointermove', e => {
    if (busy) return;
    const [x, y] = toLogical(e), sp = G.hitSpot(s, x, y);
    status(sp ? sp.name : null);
    cv.style.cursor = sp ? 'pointer' : 'crosshair';
  });
  cv.addEventListener('pointerleave', () => status());
  cv.addEventListener('click', e => {
    if (busy) return;
    const [x, y] = toLogical(e), sp = G.hitSpot(s, x, y);
    if (verb === 'item' && !item) { openInv(); return; }
    if (!sp) {
      if (verb === 'walk') walkTo(x, y);
      else showMsgs([verb === 'look' ? describeRoom() : 'There\'s nothing there.']);
      return;
    }
    status(sp.name);
    const run = () => {
      snapshot = JSON.parse(JSON.stringify(s));
      const before = s.score;
      const r = G.act(s, sp.id, verb, item);
      apply(r, before);
      if (verb === 'item' && !G.has(s, item)) { item = null; renderItem(); }
    };
    // Look from where you stand; everything else walks over first.
    if (verb === 'look') run();
    else if (sp.at) walkTo(sp.at[0], sp.at[1], run);
    else if (verb === 'walk') walkTo(x, y, run);
    else run();
  });

  const describeRoom = () => ({
    beach: 'A wide golden beach strewn with the remains of your ship. Cliffs rise to the west; a path leads east toward a village.',
    cliffs: 'Windy cliffs high above the sea. A strange doorway is carved into the rock face.',
    square: 'The village square of Saltmarrow, in the shadow of Tidewater Castle.',
    shop: 'A cluttered little curio shop that smells of salt and old rope.',
    docks: 'Weathered docks. A ferry waits at the end of the pier.',
    mistshore: 'A gloomy, misty shore. Something about this island makes the hair on your neck stand up.',
    oracle: 'A grotto lit by a glowing pool and a few guttering candles.',
    tunnel: 'A cramped, damp smugglers\' tunnel. Mind your step.',
    cellar: 'The castle cellar, full of barrels and one snoring guard.',
    hall: 'The Great Hall, dressed for a wedding nobody seems happy about.'
  }[s.room]);

  // ---------- icon bar ----------
  document.querySelectorAll('[data-verb]').forEach(b => b.addEventListener('click', () => {
    if (busy) return;
    const v = b.dataset.verb;
    if (v === 'item' && !item) { openInv(); return; }
    setVerb(v);
  }));
  function setVerb(v) {
    verb = v;
    document.querySelectorAll('[data-verb]').forEach(b => b.setAttribute('aria-pressed', b.dataset.verb === v));
  }
  function renderItem() {
    const c = $('item-icon').getContext('2d'); c.clearRect(0, 0, 24, 24);
    if (item && G.has(s, item)) { A.items[item](c); $('btn-item').title = 'Use ' + G.ITEMS[item].name; }
    else { item = null; $('btn-item').title = 'Use an item'; if (verb === 'item') setVerb('walk'); }
  }
  $('btn-inv').addEventListener('click', () => { if (!busy) openInv(); });
  $('btn-menu').addEventListener('click', () => { if (!busy) openPanel('menu'); });

  // ---------- inventory ----------
  let invSel = null;
  function openInv() {
    const grid = $('inv-grid'); grid.innerHTML = ''; invSel = null; $('inv-desc').textContent = s.inv.length ? 'Tap an item to examine it.' : 'You aren\'t carrying anything yet.'; $('inv-use').hidden = true;
    s.inv.forEach(id => {
      const b = document.createElement('button'); b.className = 'inv-item'; b.setAttribute('aria-label', G.ITEMS[id].name);
      const c = document.createElement('canvas'); c.width = c.height = 24; A.items[id](c.getContext('2d'));
      const l = document.createElement('span'); l.textContent = G.ITEMS[id].name;
      b.append(c, l);
      b.addEventListener('click', () => {
        invSel = id; grid.querySelectorAll('.inv-item').forEach(x => x.classList.toggle('sel', x === b));
        $('inv-desc').textContent = G.ITEMS[id].desc; $('inv-use').hidden = false; $('inv-use').textContent = 'Use ' + G.ITEMS[id].name;
      });
      grid.append(b);
    });
    openPanel('inv');
  }
  $('inv-use').addEventListener('click', () => { item = invSel; renderItem(); setVerb('item'); closePanels(); });

  // ---------- panels ----------
  function openPanel(id) { busy = true; document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== id); $(id).querySelector('button').focus(); }
  function closePanels() { document.querySelectorAll('.panel').forEach(p => p.hidden = true); busy = !$('msg').hidden; }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePanels));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('.panel:not([hidden])')?.matches('#title,#death,#end')) closePanels();
    if ((e.key === 'Enter' || e.key === ' ') && !$('msg').hidden) { e.preventDefault(); nextMsg(); }
  });

  // ---------- save / restore ----------
  const autosave = () => { try { localStorage.setItem('cot_auto', JSON.stringify(s)); } catch (e) {} };
  function load(key) {
    try { const d = JSON.parse(localStorage.getItem(key)); if (d && G.ROOMS[d.room]) return d; } catch (e) {}
    return null;
  }
  function startFrom(state, intro) {
    s = state; item = null; walking = null; setVerb('walk'); closePanels(); busy = false;
    updateScore(); status(); renderItem(); fade = 1;
    if (intro) showMsgs(G.enter(s, { to: s.room, x: s.x, y: s.y }) || []);
  }
  $('m-save').addEventListener('click', () => { try { localStorage.setItem('cot_save', JSON.stringify(s)); } catch (e) {} closePanels(); showMsgs(['Game saved.']); });
  const restore = () => { const d = load('cot_save') || load('cot_auto'); if (d) { startFrom(d); showMsgs(['Game restored.']); } else showMsgs(['There\'s no saved game yet.']); };
  $('m-restore').addEventListener('click', () => { closePanels(); restore(); });
  $('m-restart').addEventListener('click', () => startFrom(G.newState(), true));
  $('m-sound').addEventListener('click', () => { soundOn = !soundOn; localStorage.setItem('cot_sound', soundOn ? 'on' : 'off'); $('m-sound').textContent = 'Sound: ' + (soundOn ? 'On' : 'Off'); });
  $('m-sound').textContent = 'Sound: ' + (soundOn ? 'On' : 'Off');
  $('m-about').addEventListener('click', () => openPanel('about'));

  // ---------- title / death / end ----------
  $('t-new').addEventListener('click', () => startFrom(G.newState(), true));
  $('t-continue').addEventListener('click', () => { const d = load('cot_auto'); if (d) startFrom(d); });
  $('t-continue').hidden = !load('cot_auto');

  function die(text) {
    sfx.die(); walking = null;
    $('death-text').textContent = text;
    openPanel('death');
  }
  $('d-retry').addEventListener('click', () => { if (snapshot) startFrom(snapshot); });
  $('d-restore').addEventListener('click', () => { closePanels(); restore(); });
  $('d-restart').addEventListener('click', () => startFrom(G.newState(), true));

  function win() {
    sfx.win(); localStorage.removeItem('cot_auto');
    $('end-score').textContent = `Final score: ${s.score} of ${G.MAX_SCORE}`;
    openPanel('end');
  }
  $('e-again').addEventListener('click', () => startFrom(G.newState(), true));

  // ---------- render loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    if (walking) {
      const dx = walking.tx - s.x, dy = walking.ty - s.y, d = Math.hypot(dx, dy), sp = 70 * dt;
      if (Math.abs(dx) > 0.5) dir = dx > 0 ? 1 : -1;
      if (d <= sp) { s.x = walking.tx; s.y = walking.ty; const f = walking.then; walking = null; frame = 0; if (f) f(); }
      else { s.x += dx / d * sp; s.y += dy / d * sp; frameT += dt; if (frameT > 0.14) { frameT = 0; frame++; } }
    }
    const room = A.rooms[s.room];
    cx.clearRect(0, 0, 320, 200);
    room.bg(cx, s, t);
    const actors = (room.actors ? room.actors(s, t) : []).concat([{ y: s.y, d: c => A.player(c, s.x, s.y, frame, dir) }]);
    actors.sort((a, b) => a.y - b.y).forEach(a => a.d(cx));
    if (room.post) room.post(cx, s, t);
    if (fade > 0) { cx.fillStyle = `rgba(0,0,0,${fade})`; cx.fillRect(0, 0, 320, 200); fade = Math.max(0, fade - dt * 3); }
    requestAnimationFrame(loop);
  }

  // Title screen paints the beach behind it.
  s.room = 'beach'; updateScore(); status('Crown of Tides'); setVerb('walk');
  openPanel('title');
  requestAnimationFrame(loop);
})();
