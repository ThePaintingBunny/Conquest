/*
 * Saving the game state
 *
 * The game lives in one shared document (game/state). Saves send only what changed:
 *   - regiments are stored by id (um, with their order in uo), so two players changing different regiments, or
 *     different things about one regiment, at the same moment both keep their change;
 *   - every other field is compared the same way, down to the smallest part that changed.
 * Saves to the document go one at a time; changes made while one is on its way are combined into the next.
 * Your own change shows at once: the screen does not wait for the server, and an update from the server that does
 * not include your newest saves yet has them laid over it, so pieces never jump back.
 * Timings (how long saves take) are kept for the Connection panel in the Game tab.
 *
 * In this file: netW, netKey(), netIsObj(), stEncode(), stDecode(), stPatch(), stMerge(), stateSave(),
 *   netPump(), netIn(), netEvent(), netGone(), netStat(), netPanel(), netPanelFill()
 */

const netW = {
  exists: null /* does the document exist (null: not heard yet) */,
  base: null /* the document as the server has it, with our unconfirmed saves on top */,
  pending: [] /* saves on their way */,
  acked: [] /* saves confirmed, kept until the next update from the server */,
  q: null /* the next save, waiting for the one on its way */,
  busy: false,
  st: { n: 0, sum: 0, last: 0, max: 0, fail: 0, recent: [], snaps: 0, bytes: 0, live: 0, liveVia: '' }
};

function netKey(id) {
  return String(id).replace(/[^A-Za-z0-9_-]/g, '_');
}

function netIsObj(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/* the state as stored: regiments in a map by id */
function stEncode(st) {
  const s = JSON.parse(JSON.stringify(st || {})),
    um = {},
    uo = [];
  (s.units || []).forEach(u => {
    const k = netKey(u.id);
    um[k] = u;
    uo.push(k);
  });
  s.um = um;
  s.uo = uo;
  s.units = null;
  return s;
}

function netNoNull(v) {
  if (Array.isArray(v)) return v.map(netNoNull);
  if (!netIsObj(v)) return v;
  const o = {};
  Object.keys(v).forEach(k => {
    if (v[k] !== null) o[k] = netNoNull(v[k]);
  });
  return o;
}

/* the stored document as the game uses it (older games keep a plain list of regiments) */
function stDecode(raw) {
  const st = Object.assign({}, raw);
  if (netIsObj(raw.um)) {
    const seen = new Set(),
      units = [];
    (raw.uo || []).forEach(k => {
      if (!seen.has(k) && raw.um[k]) {
        seen.add(k);
        units.push(netNoNull(raw.um[k]));
      }
    });
    Object.keys(raw.um).forEach(k => {
      if (!seen.has(k) && raw.um[k]) units.push(netNoNull(raw.um[k]));
    });
    st.units = units;
  } else st.units = Array.isArray(raw.units) ? raw.units.slice() : [];
  delete st.um;
  delete st.uo;
  return st;
}

/* what changed from a to b, as a merge-write: objects are compared field by field, a removed field is written as
   null, anything else that changed is written whole. null when nothing changed */
function stPatch(a, b) {
  const out = {};
  let n = 0;
  const keys = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
  keys.forEach(k => {
    const x = a ? a[k] : undefined,
      y = b ? b[k] : undefined;
    if (netIsObj(x) && netIsObj(y)) {
      const p = stPatch(x, y);
      if (p) {
        out[k] = p;
        n++;
      }
      return;
    }
    if (y === undefined || y === null) {
      if (x !== undefined && x !== null) {
        out[k] = null;
        n++;
      }
      return;
    }
    if (x === y) return;
    if (typeof y !== 'object' || x === undefined || x === null || JSON.stringify(x) !== JSON.stringify(y)) {
      out[k] = y;
      n++;
    }
  });
  return n ? out : null;
}

/* a merge-write applied to a document, as the server applies it (objects merge, anything else replaces) */
function stMerge(a, p) {
  const o = Object.assign({}, a || {});
  Object.keys(p || {}).forEach(k => {
    const v = p[k];
    o[k] = netIsObj(v) && netIsObj(o[k]) ? stMerge(o[k], v) : v;
  });
  return o;
}

/* save the whole state: only the difference goes out. Resolves once the server has it */
function stateSave(next) {
  if (!db) return Promise.resolve();
  const enc = stEncode(next);
  if (!netW.exists || !netW.base) {
    /* a new game: the whole document */
    netW.base = enc;
    netW.exists = true;
    const t = performance.now();
    return db
      .doc('game/state')
      .set(enc)
      .then(() => netStat(performance.now() - t, JSON.stringify(enc).length))
      .catch(e => {
        netW.st.fail++;
        console.error(e);
      });
  }
  const p = stPatch(netW.base, enc);
  if (!p) return Promise.resolve();
  /* who wrote last and when (this page's own clock, rising): an echo of an older save of ours is ignored */
  p.wb = myId || '';
  p.wt = netW.wt = Math.max((netW.wt || 0) + 1, Date.now());
  netW.base = stMerge(netW.base, p);
  if (netW.q) {
    netW.q.p = stMerge(netW.q.p, p);
    return netW.q.done;
  }
  const job = { p };
  job.done = new Promise(r => (job.res = r));
  netW.q = job;
  netPump();
  return job.done;
}

async function netPump() {
  if (netW.busy || !netW.q) return;
  const job = netW.q;
  netW.q = null;
  netW.busy = true;
  netW.pending.push(job.p);
  const t = performance.now(),
    size = JSON.stringify(job.p).length;
  try {
    try {
      await db.doc('game/state').update(job.p);
    } catch (e) {
      if (!e || e.code !== 'unavailable') throw e;
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
      await db.doc('game/state').update(job.p);
    }
    netStat(performance.now() - t, size);
    netW.acked.push(job.p);
  } catch (e) {
    netW.st.fail++;
    console.error(e);
    toast('A change could not be saved (' + ((e && e.code) || 'error') + '). Check your connection.');
  } finally {
    netW.pending = netW.pending.filter(x => x !== job.p);
    netW.busy = false;
    job.res();
    netPump();
  }
}

/* an update from the server: lay our unconfirmed saves over it and return the state to use */
function netIn(raw) {
  netW.exists = true;
  netW.st.snaps++;
  if (raw && myId && raw.wb === myId && +raw.wt < (netW.seenWt || 0) && netW.base) {
    /* a late copy of one of our own older saves: what we show already has more */
    return stDecode(netW.base);
  }
  if (raw && myId && raw.wb === myId) netW.seenWt = Math.max(netW.seenWt || 0, +raw.wt || 0);
  /* saves the server confirmed before this update are in it now */
  netW.acked = [];
  let r = raw;
  netW.pending.forEach(p => (r = stMerge(r, p)));
  if (netW.q) r = stMerge(r, netW.q.p);
  netW.base = r;
  netPanelFill();
  return stDecode(r);
}

/* the per-action records the game used to write to an events collection: nothing read them, and every one was
   an extra save and a document counted against the database's limits, so they are no longer written */
function netEvent() {
  return Promise.resolve();
}

function netGone() {
  netW.exists = false;
  netW.base = null;
}

function netStat(ms, bytes) {
  const s = netW.st;
  s.n++;
  s.sum += ms;
  s.last = ms;
  s.max = Math.max(s.max, ms);
  s.bytes += bytes || 0;
  s.recent.push(ms);
  if (s.recent.length > 20) s.recent.shift();
  netPanelFill();
}

/* the Connection section of the Game tab (online games) */
function netPanel() {
  const d = bEl('details', { className: 'vc netp' });
  d.append(bEl('summary', { textContent: 'Connection' }));
  d.append(bEl('div', { className: 'netp-body', id: 'netp-body' }));
  setTimeout(netPanelFill, 0);
  return d;
}

function netPanelFill() {
  const b = document.getElementById('netp-body');
  if (!b) return;
  const s = netW.st,
    r = s.recent.slice().sort((x, y) => x - y),
    med = r.length ? r[Math.floor(r.length / 2)] : 0,
    f = ms => (ms >= 1000 ? (ms / 1000).toFixed(1) + ' s' : Math.round(ms) + ' ms');
  const lines = [
    s.n
      ? `Saves: ${s.n}, last ${f(s.last)}, typical ${f(med)}, slowest ${f(s.max)}` +
        (s.fail ? `, ${s.fail} failed` : '') +
        ` · about ${Math.round(s.bytes / s.n)} bytes each`
      : 'Saves: none yet in this session.',
    `Waiting to be saved: ${netW.pending.length + (netW.q ? 1 : 0)} · updates received: ${s.snaps}`,
    `Live moves: ${s.liveVia || 'not connected yet'}` + (s.live ? ` · ${s.live} received` : '')
  ];
  b.textContent = '';
  lines.forEach(t => b.appendChild(bEl('div', { textContent: t })));
}
