// Family scoreboard: one Google Apps Script web app (tools/scoreboard.gs) that keeps the scores itself.
// The game never waits on it: if it is unset, offline or broken, play carries on.
(function (root) {
  const URL = 'https://script.google.com/macros/s/AKfycby7whGxo5cbqK1wZsJP061f-mKtKvnzRHekmruuD2whrUA3M7w3Mpj0YcXbi2DQrxK4/exec';   // Apps Script web app. Empty = scoreboard off.
  const dev = () => { let d = localStorage.getItem('cot_dev'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('cot_dev', d); } return d; };
  function post(row) {
    if (!URL || !row.name) return;
    // text/plain + no-cors: Apps Script answers POSTs with a redirect that browsers will not read cross-site.
    fetch(URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(Object.assign({ id: dev() + ':' + row.name.toLowerCase() }, row)) }).catch(() => {});
  }
  function list() {
    if (!URL) return Promise.reject(new Error('off'));
    return fetch(URL).then(r => r.json()).then(d => {
      if (!Array.isArray(d)) throw new Error('bad data');
      return d.map(r => ({ id: String(r.id || ''), name: String(r.name || '').slice(0, 12), score: +r.score || 0, ending: String(r.ending || ''), secs: +r.secs || 0, deaths: +r.deaths || 0 }))
        .filter(r => r.name).sort((a, b) => b.score - a.score || a.secs - b.secs);
    });
  }
  root.Board = { post, list, dev, get on() { return !!URL; } };
})(this);
