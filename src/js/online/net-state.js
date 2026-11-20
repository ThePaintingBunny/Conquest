/*
 * The game log: how the game is saved and shared
 *
 * The game is an ordered list of entries. Every change (a march, a charge, a Clash with its dice, a recorded result,
 * a seat taken, an army chosen, the end of a round) is one entry, numbered, and every screen works out the board
 * by applying the entries in order to the last checkpoint. Nothing is ever overwritten: a new entry is a new key in
 * the log, so two players acting at the same moment both keep what they did, and every screen ends up with exactly
 * the same board.
 *
 * Stored in the shared database:
 *   game/head            which game is current (its epoch)
 *   game/c0-<epoch>      the board when that game began (for replays)
 *   game/ck-<epoch>      the latest checkpoint: the board with the entries folded into it so far
 *   game/lg-<epoch>-<c>  the entries, 25 to a document, keyed by number and writer ("0000043~ab12xy")
 *
 * An entry holds what the action was (its kind, a readable line and its inputs, such as the dice) and what it
 * changed (a merge-patch of the board). Applying entries only ever merges those changes, so every screen gets the
 * same result; each entry also carries a fingerprint of the board after it, so a screen that ever works out
 * something different notices at once (the Connection panel and the game log show it).
 *
 * Your own entries apply on your screen immediately and are written in the background (one write at a time,
 * several entries to the same document together). If someone else's entry turns out to come before yours, the
 * board is worked out again in the right order.
 *
 * Undo: an entry that puts the board back as it was after an earlier entry. Replays: the first board and every entry
 * since, stepped through in the Game tab.
 *
 * In this file: netW, LOG_CHUNK, LOG, netKey(), netIsObj(), stEncode(), netNoNull(), stDecode(),
 *   stPatch(), stMerge(), netHash(), logKeyN(), logChunkOf(), logPath, logStart(), logOpen(),
 *   logSetCk(), logSubChunks(), logRebuild(), logApply(), logChecked, logCheck(), logEmit(), logMaxN(),
 *   logAppend(), stateSave(), stateUpdate(), logPump(), logVerify(), logEnsureChunk(), logCheckpoint(),
 *   logNewEpoch(), logFlushEarly(), logMigrating, logMigrate(), logRecent(), logUndo(), netEvent(),
 *   netStat(), netPanel(), netPanelFill()
 */

const netW = {
  st: { n: 0, sum: 0, last: 0, max: 0, fail: 0, recent: [], snaps: 0, bytes: 0, live: 0, liveVia: '' }
};

const LOG_CHUNK = 25;

const LOG = {
  tab: Math.random().toString(36).slice(2, 6),
  epoch: null,
  ck: null /* {s, inc: Set, top, floor} */,
  ent: new Map() /* key → entry, every entry known that is not folded into the checkpoint */,
  mine: new Set() /* keys of our own entries not yet written */,
  sent: new Map() /* key → when our entry was written (to notice one the host refused) */,
  subs: new Map() /* chunk number → unsubscribe */,
  have: new Set() /* chunk documents known to exist */,
  cache: [] /* [{key, enc}]: the board after each entry, in order */,
  enc: null /* the board now (stored form) */,
  q: [],
  busy: false,
  issues: [],
  desync: 0,
  unsub: [],
  onState: null /* main.js: called with the board when it changes */,
  replay: null
};

function netKey(id) {
  return String(id).replace(/[^A-Za-z0-9_-]/g, '_');
}

function netIsObj(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/* the board as stored: regiments in a map by id, so changes to one regiment never touch another */
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
  delete s.units;
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

/* the stored board as the game uses it */
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

/* what changed from a to b, as a merge-patch: objects compared field by field, a removed field becomes null */
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

/* a merge-patch applied (objects merge, anything else replaces) */
function stMerge(a, p) {
  const o = Object.assign({}, a || {});
  Object.keys(p || {}).forEach(k => {
    const v = p[k];
    o[k] = netIsObj(v) && netIsObj(o[k]) ? stMerge(o[k], v) : v;
  });
  return o;
}

/* a fingerprint of a board: the same board always gives the same text, whatever order its fields are in */
function netHash(v) {
  let h = 0x811c9dc5;
  const add = s => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  };
  const walk = x => {
    if (x === null || x === undefined) return add('n');
    if (Array.isArray(x)) {
      add('[');
      x.forEach(walk);
      return add(']');
    }
    if (typeof x === 'object') {
      add('{');
      Object.keys(x)
        .filter(k => x[k] !== null && x[k] !== undefined)
        .sort()
        .forEach(k => {
          add(k + ':');
          walk(x[k]);
        });
      return add('}');
    }
    add(typeof x === 'number' ? String(+x.toFixed(6)) : String(x));
  };
  walk(v);
  return h.toString(36);
}

function logKeyN(k) {
  return parseInt(String(k).slice(0, 7), 10) || 0;
}

function logChunkOf(n) {
  return Math.floor(n / LOG_CHUNK);
}

const logPath = {
  head: () => 'game/head',
  c0: e => 'game/c0-' + e,
  ck: e => 'game/ck-' + e,
  lg: (e, c) => 'game/lg-' + e + '-' + c
};

/* ---------- reading ---------- */

/* follow the current game; onState(board) is called whenever the board changes */
function logStart(onState) {
  LOG.onState = onState;
  db.doc(logPath.head()).onSnapshot(
    sn => {
      if (!sn.exists) {
        logMigrate();
        return;
      }
      const h = sn.data() || {};
      if (h.epoch && h.epoch !== LOG.epoch) logOpen(h.epoch);
    },
    () => {
      $('phase').textContent = 'The map stopped updating. Reload to reconnect.';
    }
  );
}

/* switch to a game (epoch): its checkpoint, then the entry documents after it */
function logOpen(epoch, ck0) {
  LOG.unsub.forEach(f => {
    try {
      f();
    } catch (e) {}
  });
  LOG.unsub = [];
  LOG.subs.forEach(f => {
    try {
      f();
    } catch (e) {}
  });
  LOG.subs = new Map();
  LOG.epoch = epoch;
  LOG.ck = null;
  LOG.ent = new Map();
  LOG.mine = new Set();
  LOG.have = new Set();
  LOG.cache = [];
  /* saves for the game being left are dropped; whoever waits on them carries on */
  LOG.q.filter(j => j.epoch !== epoch).forEach(j => j.res());
  LOG.q = LOG.q.filter(j => j.epoch === epoch);
  if (ck0) logSetCk(ck0);
  const un = db.doc(logPath.ck(epoch)).onSnapshot(
    sn => {
      if (!sn.exists || LOG.epoch !== epoch) return;
      logSetCk(sn.data());
    },
    () => {}
  );
  LOG.unsub.push(un);
}

function logSetCk(d) {
  if (!d || !d.s) return;
  if (LOG.ck && LOG.ck.top > (+d.top || -1)) return; /* an older checkpoint than the one we have */
  LOG.ck = {
    s: d.s,
    inc: new Set(d.inc || []),
    top: d.top == null ? -1 : +d.top,
    floor: +d.floor || 0,
    h: d.h || ''
  };
  /* entries now inside the checkpoint are no longer needed */
  [...LOG.ent.keys()].forEach(k => {
    if (LOG.ck.inc.has(k) || logKeyN(k) < LOG.ck.floor) LOG.ent.delete(k);
  });
  LOG.cache = [];
  logSubChunks();
  logRebuild();
  /* changes made before the log was loaded */
  if (LOG.early && LOG.early.length) logFlushEarly();
}

/* follow the entry documents from the checkpoint to just past the newest entry */
function logSubChunks() {
  if (!LOG.ck) return;
  let top = LOG.ck.top;
  LOG.ent.forEach((e, k) => (top = Math.max(top, logKeyN(k))));
  const from = logChunkOf(Math.max(0, LOG.ck.floor)),
    to = logChunkOf(Math.max(0, top + 1)) + 1,
    ep = LOG.epoch;
  for (let c = from; c <= to; c++) {
    if (LOG.subs.has(c)) continue;
    const un = db.doc(logPath.lg(ep, c)).onSnapshot(
      sn => {
        if (LOG.epoch !== ep) return;
        if (!sn.exists) return;
        LOG.have.add(c);
        netW.st.snaps++;
        const e = (sn.data() || {}).e || {};
        let ch = false;
        /* our own entry, written a while ago but not in the document: the game's host refused it */
        const now = Date.now();
        [...LOG.ent.keys()].forEach(k => {
          if (logChunkOf(logKeyN(k)) !== c || e[k] || LOG.mine.has(k)) return;
          const at = LOG.sent.get(k);
          if (at && now - at > 2500) {
            LOG.ent.delete(k);
            LOG.sent.delete(k);
            ch = true;
            toast('A change was not accepted by the game’s host.');
          }
        });
        Object.keys(e).forEach(k => {
          if (!e[k] || LOG.ent.get(k) === e[k]) return;
          if (LOG.ck && (LOG.ck.inc.has(k) || logKeyN(k) < LOG.ck.floor)) return;
          if (!LOG.ent.has(k)) ch = true;
          LOG.ent.set(k, e[k]);
        });
        if (ch) {
          logSubChunks();
          logRebuild();
        }
      },
      () => {}
    );
    LOG.subs.set(c, un);
  }
  /* documents wholly before the checkpoint: stop following them */
  [...LOG.subs.keys()].forEach(c => {
    if (c < from) {
      try {
        LOG.subs.get(c)();
      } catch (e) {}
      LOG.subs.delete(c);
    }
  });
}

/* work the board out: the checkpoint, then every entry in order. Only the part after the first entry that changed
   is worked out again */
function logRebuild() {
  if (!LOG.ck) return;
  const order = [...LOG.ent.keys()].sort();
  let i = 0;
  while (i < LOG.cache.length && i < order.length && LOG.cache[i].key === order[i]) i++;
  LOG.cache.length = i;
  let enc = i ? LOG.cache[i - 1].enc : LOG.ck.s;
  for (let j = i; j < order.length; j++) {
    const k = order[j],
      e = LOG.ent.get(k);
    enc = logApply(enc, e, LOG.cache);
    LOG.cache.push({ key: k, enc });
    if (!LOG.mine.has(k) && e.u !== myId) logCheck(k, e, enc, order);
  }
  if (enc === LOG.enc) return;
  /* worked out again from the checkpoint: only hand it on if the board really changed */
  if (!i && LOG.enc && netHash(enc) === netHash(LOG.enc)) {
    LOG.enc = enc;
    return;
  }
  LOG.enc = enc;
  logEmit();
}

/* one entry applied to a board */
function logApply(enc, e, cache) {
  if (!e) return enc;
  if (e.k === 'undo') {
    if (e.to === '') return LOG.ck.s;
    const at = cache.find(c => c.key === e.to);
    return at ? at.enc : enc;
  }
  return e.d ? stMerge(enc, e.d) : enc;
}

/* checks on someone else's entry: the board fingerprint, who wrote it, its dice */
const logChecked = new Set();
function logCheck(k, e, enc, order) {
  if (logChecked.has(k)) return;
  logChecked.add(k);
  const n = logKeyN(k),
    idx = order.indexOf(k),
    before = netHash(['ck:' + (LOG.ck ? LOG.ck.top : -1)].concat(order.slice(0, idx))),
    /* the writer saw the same entries before it as we do: the boards must match */
    same = e.pv === before;
  const issue = t => {
    LOG.issues.push(t);
    if (LOG.issues.length > 50) LOG.issues.shift();
    try {
      glogAdd({ kind: 'act', title: 'Check', text: t });
    } catch (x) {}
    netPanelFill();
  };
  if (e.h && same && e.k !== 'undo' && netHash(enc) !== e.h) {
    LOG.desync++;
    issue(
      `Entry ${n} (${e.l || e.k}) gave a different board here than on the screen that made it; both screens now follow the log.`
    );
  }
  const st = stDecode(enc);
  if (st.mode === 'pvp' && e.by && st.seats && st.seats[e.by] && e.u && st.seats[e.by] !== e.u)
    issue(`Entry ${n} (${e.l || e.k}) was made for ${N(e.by)} by someone not sitting on that side.`);
  const dice = [];
  const grab = x => {
    if (Array.isArray(x)) x.forEach(grab);
    else if (typeof x === 'number') dice.push(x);
  };
  if (e.k === 'combat' && e.a)
    (e.a.groups || []).forEach(g => {
      grab(g.rolls);
      grab(g.defense);
    });
  if (dice.some(v => !(v >= 1 && v <= 6 && v === Math.floor(v))))
    issue(`Entry ${n} (${e.l || e.k}) has dice that are not 1 to 6.`);
  if (e.k === 'activation' && e.a && (e.a.actions || []).length > 4)
    issue(`Entry ${n} (${e.l || e.k}) has ${(e.a.actions || []).length} actions in one activation.`);
}

/* the board changed: hand it to the game (not while a replay is showing) */
function logEmit() {
  const st = stDecode(LOG.enc);
  if (LOG.replay) {
    LOG.replay.live = st;
    return;
  }
  if (LOG.onState) LOG.onState(st);
}

/* ---------- writing ---------- */

function logMaxN() {
  let m = LOG.ck ? LOG.ck.top : -1;
  LOG.ent.forEach((e, k) => (m = Math.max(m, logKeyN(k))));
  return m;
}

/* add an entry: applied here at once, written in the background. d: the change (merge-patch of the stored board);
   meta: {k: kind, a: inputs, l: readable line} */
function logAppend(d, meta) {
  if (!LOG.ck || !LOG.epoch) {
    /* not connected to a game yet: keep it until we are */
    LOG.early = LOG.early || [];
    return new Promise(r => LOG.early.push({ d, meta, r }));
  }
  meta = meta || {};
  const n = logMaxN() + 1,
    wid = netKey(String(myId || 'x').slice(-6)) + LOG.tab,
    key = String(n).padStart(7, '0') + '~' + wid;
  const e = {
    n,
    u: myId || '',
    by: (typeof seatSide === 'function' && seatSide()) || (state && state.turn) || '',
    k: meta.k || 'change',
    l: String(meta.l || (d && d.lastTitle ? d.lastTitle + (d.lastText ? ': ' + d.lastText : '') : '')).slice(
      0,
      160
    ),
    t: Date.now()
  };
  if (meta.a !== undefined) e.a = JSON.parse(JSON.stringify(meta.a));
  if (meta.to !== undefined) e.to = meta.to;
  if (d) e.d = d;
  /* every entry before it on this screen: the fingerprint is only compared where the other screen had exactly the same */
  {
    const prior = [...LOG.ent.keys()].sort();
    e.pv = netHash(['ck:' + LOG.ck.top].concat(prior));
  }
  /* apply now; the fingerprint is the board after it, as this screen has it */
  const enc = logApply(LOG.enc || LOG.ck.s, e, LOG.cache);
  e.h = netHash(enc);
  LOG.ent.set(key, e);
  LOG.mine.add(key);
  const order = [...LOG.ent.keys()].sort();
  if (order[order.length - 1] === key && LOG.cache.length === order.length - 1) {
    /* the usual case: our entry is the newest, so it simply goes on the end */
    LOG.cache.push({ key, enc });
    LOG.enc = enc;
  } else logRebuild();
  const job = { key, e, epoch: LOG.epoch };
  job.done = new Promise(r => (job.res = r));
  LOG.q.push(job);
  logPump();
  if (n % LOG_CHUNK === 12) logEnsureChunk(logChunkOf(n) + 1).catch(() => {});
  return job.done;
}

/* save the whole board: only the difference becomes an entry */
function stateSave(next, meta) {
  if (!db) return Promise.resolve();
  if (!LOG.ck) return logAppend(null, Object.assign({ full: next }, meta || {}));
  const d = stPatch(LOG.enc, stEncode(next));
  if (!d) return Promise.resolve();
  /* the readable line: the result line the game shows, when this change set it */
  meta = Object.assign({}, meta || {});
  if (!meta.l && (d.lastTitle !== undefined || d.lastText !== undefined) && (next.lastTitle || next.lastText))
    meta.l = (next.lastTitle || '') + (next.lastText ? ': ' + next.lastText : '');
  return logAppend(d, meta);
}

/* a few fields changed directly (seats, names, armies chosen, ready): an entry, and the board shows it now */
function stateUpdate(patch, meta) {
  const p = logAppend(patch, Object.assign({ k: 'setup' }, meta || {}));
  if (LOG.ck) logEmit();
  return p;
}

/* write queued entries: one write at a time, every entry for the same document together */
async function logPump() {
  if (LOG.busy || !LOG.q.length) return;
  LOG.busy = true;
  const all = LOG.q.splice(0, LOG.q.length),
    jobs = all.filter(j => j.epoch === LOG.epoch);
  all.filter(j => j.epoch !== LOG.epoch).forEach(j => j.res());
  const byChunk = new Map();
  jobs.forEach(j => {
    const c = logChunkOf(j.e.n);
    if (!byChunk.has(c)) byChunk.set(c, []);
    byChunk.get(c).push(j);
  });
  for (const [c, js] of byChunk) {
    const body = { e: {} };
    js.forEach(j => (body.e[j.key] = j.e));
    const path = logPath.lg(js[0].epoch, c),
      t = performance.now(),
      size = JSON.stringify(body).length;
    try {
      await logEnsureChunk(c, js[0].epoch);
      try {
        await db.doc(path).update(body);
      } catch (e) {
        if (e && e.code === 'invalid_argument' && !LOG.have.has(c)) {
          LOG.have.delete(c);
          await logEnsureChunk(c, js[0].epoch, true);
          await db.doc(path).update(body);
        } else if (e && e.code === 'unavailable') {
          await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
          await db.doc(path).update(body);
        } else throw e;
      }
      netStat(performance.now() - t, size);
    } catch (e) {
      netW.st.fail++;
      console.error(e);
      /* the entries never reached the log: take them back out */
      js.forEach(j => LOG.ent.delete(j.key));
      LOG.cache = [];
      logRebuild();
      toast('A change could not be saved (' + ((e && e.code) || 'error') + '). Check your connection.');
    }
    js.forEach(j => {
      LOG.mine.delete(j.key);
      if (LOG.ent.has(j.key)) LOG.sent.set(j.key, Date.now());
      j.res();
    });
    if (LOG.sent.size > 200) [...LOG.sent.keys()].slice(0, 100).forEach(k => LOG.sent.delete(k));
    /* a few seconds on, check the entries really are in the log (outside Claude the game's host can refuse them) */
    {
      const keys = js.map(j => j.key),
        ep = js[0].epoch;
      setTimeout(() => logVerify(ep, c, keys), 3000);
    }
  }
  LOG.busy = false;
  logCheckpoint();
  if (LOG.q.length) logPump();
}

/* our entries that the stored log does not have: taken back out */
async function logVerify(ep, c, keys) {
  if (ep !== LOG.epoch) return;
  let sn = null;
  try {
    sn = await db.doc(logPath.lg(ep, c)).get();
  } catch (e) {
    return;
  }
  if (!sn || !sn.exists || ep !== LOG.epoch) return;
  const e = (sn.data() || {}).e || {},
    gone = keys.filter(k => !e[k] && LOG.ent.has(k) && !LOG.mine.has(k));
  if (!gone.length) return;
  gone.forEach(k => {
    LOG.ent.delete(k);
    LOG.sent.delete(k);
  });
  logRebuild();
  toast('A change was not accepted by the game’s host.');
}

/* make sure an entry document exists before writing to it; created empty, under a short lease so two screens never
   create it at once */
async function logEnsureChunk(c, ep, force) {
  ep = ep || LOG.epoch;
  if (!force && LOG.have.has(c) && ep === LOG.epoch) return;
  const ref = db.doc(logPath.lg(ep, c));
  try {
    const sn = await ref.get();
    if (sn.exists) {
      if (ep === LOG.epoch) LOG.have.add(c);
      return;
    }
  } catch (e) {}
  let got = true;
  try {
    if (typeof ref.acquire === 'function')
      got = (await ref.acquire({ holder: (myId || 'x') + LOG.tab, ttlMs: 3000 })).acquired;
  } catch (e) {}
  if (!got) {
    await new Promise(r => setTimeout(r, 700));
    return logEnsureChunk(c, ep);
  }
  const sn2 = await ref.get().catch(() => null);
  if (!sn2 || !sn2.exists) await ref.set({ e: {} });
  if (ep === LOG.epoch) LOG.have.add(c);
}

/* every 40 entries, fold the older ones into a new checkpoint (the newest 8 stay out, for undo and late entries) */
function logCheckpoint() {
  if (!LOG.ck || LOG.replay) return;
  const order = [...LOG.ent.keys()].sort();
  if (order.length < 40 || LOG.mine.size) return;
  const cut = order.length - 8,
    folded = order.slice(0, cut),
    at = LOG.cache[cut - 1];
  if (!at || at.key !== folded[folded.length - 1]) return;
  const top = logKeyN(folded[folded.length - 1]),
    floor = Math.max(0, top - 60);
  const inc = [...LOG.ck.inc].filter(k => logKeyN(k) >= floor).concat(folded);
  const d = { s: at.enc, inc, top, floor, h: netHash(at.enc), at: Date.now(), by: myId || '' };
  db.doc(logPath.ck(LOG.epoch))
    .set(d)
    .catch(() => {});
  logSetCk(d);
}

/* start a new game: a fresh log beginning from this board */
async function logNewEpoch(st) {
  const ep = Date.now().toString(36) + LOG.tab,
    enc = stEncode(st),
    ck = { s: enc, inc: [], top: -1, floor: 0, h: netHash(enc), at: Date.now(), by: myId || '' };
  const old = LOG.epoch,
    oldTop = logMaxN();
  logOpen(ep, ck);
  LOG.enc = null;
  logRebuild();
  try {
    await db.doc(logPath.c0(ep)).set({ s: enc, at: Date.now() });
    await db.doc(logPath.ck(ep)).set(ck);
    await logEnsureChunk(0, ep);
    await db.doc(logPath.head()).set({ epoch: ep, at: Date.now(), prev: old || '' });
    /* the previous game's log is no longer needed (a browser that keeps the game, as the host does outside
       Claude, has limited room) */
    if (old)
      [logPath.c0(old), logPath.ck(old)]
        .concat(Array.from({ length: logChunkOf(Math.max(0, oldTop)) + 2 }, (_, c) => logPath.lg(old, c)))
        .forEach(path => {
          try {
            db.doc(path)
              .delete()
              .catch(() => {});
          } catch (e) {}
        });
  } catch (e) {
    console.error(e);
    toast('The new game could not be saved. Check your connection.');
  }
}

function logFlushEarly() {
  const E = LOG.early || [];
  LOG.early = [];
  E.forEach(x => {
    const p = x.meta && x.meta.full ? stateSave(x.meta.full, x.meta) : logAppend(x.d, x.meta);
    p.then(x.r);
  });
}

/* no log yet: start one from the game as it was saved before (or an empty table) */
let logMigrating = false;
async function logMigrate() {
  if (logMigrating) return;
  logMigrating = true;
  try {
    const head = db.doc(logPath.head());
    try {
      if (typeof head.acquire === 'function') {
        const r = await head.acquire({ holder: (myId || 'x') + LOG.tab, ttlMs: 5000 });
        if (!r.acquired) return;
      }
    } catch (e) {}
    const h = await head.get().catch(() => null);
    if (h && h.exists) return;
    const old = await db
      .doc('game/state')
      .get()
      .catch(() => null);
    const st =
      old && old.exists
        ? stDecode(old.data())
        : { step: 'setup', units: [], vp: { cs: 0, nord: 0 }, round: 0, phase: 'New game' };
    await logNewEpoch(st);
  } finally {
    logMigrating = false;
  }
}

/* ---------- undo, the recent entries ---------- */

/* the newest entries (for undo), newest first */
function logRecent(n) {
  const order = [...LOG.ent.keys()].sort();
  return order
    .slice(-(n || 8))
    .reverse()
    .map(k => ({ key: k, e: LOG.ent.get(k), i: order.indexOf(k), prev: order[order.indexOf(k) - 1] || '' }));
}

/* put the board back as it was before entry `key` */
function logUndo(key, label) {
  const order = [...LOG.ent.keys()].sort(),
    i = order.indexOf(key);
  if (i < 0) {
    toast('That change is too old to undo.');
    return Promise.resolve();
  }
  const to = i ? order[i - 1] : '';
  act = null;
  cb = null;
  const p = logAppend(null, { k: 'undo', to, l: 'Undone: ' + (label || 'changes') });
  logRebuild();
  logEmit();
  return p;
}

/* the per-action records the game used to keep separately: they now travel inside the log entries */
function netEvent() {
  return Promise.resolve();
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

/* ---------- the Connection section of the Game tab ---------- */
function netPanel() {
  const d = bEl('details', { className: 'vc netp' });
  d.append(bEl('summary', { textContent: 'Connection and log' }));
  d.append(bEl('div', { className: 'netp-body', id: 'netp-body' }));
  const bar = bEl('div', { className: 'glog-bar' });
  const rp = bEl('button', {
    type: 'button',
    className: 'btn ghost',
    textContent: 'Watch a replay of this game'
  });
  rp.onclick = () => replayOpen();
  bar.append(rp);
  d.append(bar);
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
    `Log: entry ${Math.max(0, logMaxN() + 1)} · ${LOG.ent.size} since the last checkpoint · waiting to be saved: ${LOG.q.length + LOG.mine.size}`,
    `Live moves: ${s.liveVia || 'saved updates, about 5 a second'}` + (s.live ? ` · ${s.live} received` : ''),
    LOG.issues.length
      ? `Checks: ${LOG.issues.length} note${LOG.issues.length > 1 ? 's' : ''} (latest: ${LOG.issues[LOG.issues.length - 1]})`
      : 'Checks: every entry matches on both screens.'
  ];
  b.textContent = '';
  lines.forEach(t => b.appendChild(bEl('div', { textContent: t })));
}
