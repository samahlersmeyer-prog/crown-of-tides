// Crown of Tides family scoreboard. A standalone Google Apps Script web app.
// Scores live in the script's own storage (Script Properties), so it needs no access to any Google data.
// Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone. Put the /exec URL in js/board.js.
var MAX_ROWS = 200;

function doGet() {
  var all = PropertiesService.getScriptProperties().getProperties(), rows = [];
  for (var k in all) if (k.indexOf('row:') === 0) { try { rows.push(JSON.parse(all[k])); } catch (e) {} }
  return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var d; try { d = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput('bad'); }
  // Anyone can post, so trust nothing: fixed shapes and ranges only.
  var name = String(d.name || '').replace(/[^A-Za-z0-9 À-ɏ]/g, '').trim().slice(0, 12);
  var id = String(d.id || '').replace(/[^a-z0-9: à-ɏ]/g, '').slice(0, 24);
  if (!name || !id) return ContentService.createTextOutput('bad');
  var num = function (v, max) { v = Math.floor(Number(v)); return isFinite(v) ? Math.max(0, Math.min(max, v)) : 0; };
  var row = { id: id, name: name, score: num(d.score, 231), ending: d.ending === 'long' || d.ending === 'short' ? d.ending : '', secs: num(d.secs, 360000), deaths: num(d.deaths, 28), updated: new Date().toISOString() };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties(), key = 'row:' + id;
    // cap, so junk posts cannot fill the store
    if (props.getProperty(key) === null && props.getKeys().length >= MAX_ROWS) return ContentService.createTextOutput('full');
    props.setProperty(key, JSON.stringify(row));
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput('ok');
}

// Housekeeping, run from the script editor: take one row off the board.
function removeRow_(id) { PropertiesService.getScriptProperties().deleteProperty('row:' + id); }
function removeSelftest() { removeRow_('selftest:zz'); }
