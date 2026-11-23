// Crown of Tides — tiny chiptune sequencer with one original theme per island.
(function (root) {
  'use strict';
  // "note:eighths" separated by spaces; "-" is a rest.
  const THEMES = {
    title: { bpm: 104, mel: 'G4:2 C5:2 E5:2 G5:4 E5:2 F5:2 D5:4 B4:2 C5:6 -:6 E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 F5:2 E5:2 D5:2 C5:6 -:4', bass: 'C3:8 G2:8 A2:8 F2:8 C3:8 E3:8 F3:8 G2:8' },
    crown: { bpm: 132, mel: 'D5:2 F#5:1 A5:2 F#5:1 G5:2 E5:1 C#5:3 D5:2 F#5:1 A5:2 B5:1 A5:6 G5:2 F#5:1 E5:2 D5:1 E5:2 F#5:1 A4:3 B4:2 C#5:1 D5:2 E5:1 D5:6', bass: 'D3:6 A2:6 D3:6 A2:6 G2:6 A2:6 A2:6 D3:6' },
    mists: { bpm: 76, mel: 'A4:4 C5:4 E5:6 D5:2 C5:4 B4:4 G#4:8 A4:4 E5:4 F5:6 E5:2 D5:4 C5:4 B4:4 A4:4', bass: 'A2:16 E2:16 D2:16 E2:8 A2:8', wave: 'triangle' },
    clocks: { bpm: 120, mel: 'F5:1 -:1 C5:1 -:1 A4:1 -:1 C5:1 -:1 F5:1 G5:1 A5:2 G5:2 -:2 E5:1 -:1 C5:1 -:1 G4:1 -:1 C5:1 -:1 E5:1 F5:1 G5:2 F5:2 -:2', bass: 'F2:2 C3:2 F2:2 C3:2 F2:2 C3:2 F2:2 C3:2 C2:2 G2:2 C2:2 G2:2 C2:2 G2:2 F2:2 C3:2' },
    sentinels: { bpm: 112, mel: 'E5:4 B4:2 E5:2 F#5:4 G5:4 F#5:2 E5:2 D5:2 B4:2 E5:8 G5:4 A5:2 B5:2 A5:4 G5:4 F#5:2 G5:2 A5:2 F#5:2 E5:8', bass: 'E2:8 E2:8 D2:8 E2:8 C3:8 D3:8 B2:8 E2:8' },
    reef: { bpm: 96, mel: 'D5:2 G5:2 B5:2 A5:4 G5:2 F#5:2 E5:2 D5:4 -:4 B4:2 D5:2 G5:2 F#5:4 E5:2 D5:4 C5:2 B4:4 -:2', bass: 'G2:6 D3:6 C3:6 D3:6 G2:6 E2:6 C3:6 D3:6', wave: 'triangle' },
    castle: { bpm: 100, mel: 'D5:2 -:2 D5:1 E5:1 F5:2 E5:2 C#5:2 -:4 D5:2 F5:2 A5:2 G5:1 F5:1 E5:2 C#5:2 D5:4', bass: 'D2:4 A2:4 D2:4 A2:4 A#2:4 A2:4 D2:4 A2:4' },
    inn: { bpm: 140, mel: 'G5:1 E5:1 C5:1 E5:1 G5:2 C6:2 B5:1 A5:1 G5:1 F5:1 E5:2 D5:2 E5:1 F5:1 G5:1 E5:1 D5:1 C5:1 D5:1 B4:1 C5:4', bass: 'C3:4 G2:4 C3:4 G2:4 F2:4 G2:4 C3:4' },
    tower: { bpm: 150, mel: 'A4:1 A4:1 C5:1 A4:1 D#5:2 D5:2 A4:1 A4:1 C5:1 A4:1 F5:2 E5:2', bass: 'A2:2 A2:2 A2:2 A2:2 A2:2 A2:2 G#2:2 G#2:2' }
  };
  const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = n => { const m = n.match(/^([A-G]#?)(\d)$/); return m ? 440 * Math.pow(2, (SEMI[m[1]] + (+m[2] + 1) * 12 - 69) / 12) : 0; };
  const parse = str => str.split(/\s+/).map(tok => { const [n, d] = tok.split(':'); return { f: n === '-' ? 0 : freq(n), d: +d }; });

  let ac = null, cur = null, voices = [], timer = null, on = true;
  function start(name) {
    if (!on || cur === name || !THEMES[name]) { cur = name; return; }
    stop(); cur = name;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    if (ac.state === 'suspended') ac.resume();
    const th = THEMES[name], eighth = 30 / th.bpm;
    voices = [{ notes: parse(th.mel), i: 0, t: ac.currentTime + 0.1, wave: th.wave || 'square', vol: 0.022 },
      { notes: parse(th.bass), i: 0, t: ac.currentTime + 0.1, wave: 'triangle', vol: 0.05 }];
    timer = setInterval(() => {
      for (const v of voices) while (v.t < ac.currentTime + 0.25) {
        const n = v.notes[v.i], len = n.d * eighth;
        if (n.f) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = v.wave; o.frequency.value = n.f;
          g.gain.setValueAtTime(Math.max(0.0002, v.vol * master), v.t); g.gain.exponentialRampToValueAtTime(0.0001, v.t + len * 0.92);
          o.connect(g).connect(ac.destination); o.start(v.t); o.stop(v.t + len);
        }
        v.t += len; v.i = (v.i + 1) % v.notes.length;
      }
    }, 50);
  }
  function stop() { clearInterval(timer); timer = null; voices = []; }
  let master = 0.7;
  function setVolume(v) { master = v; }
  function setOn(v) { on = v; if (!v) { stop(); } else { const c = cur; cur = null; if (c) start(c); } }
  root.Music = { start, stop, setOn, setVolume, THEMES, get on() { return on; } };
})(this);
