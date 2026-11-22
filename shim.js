/*
 * Conquest Table: standalone runtime.
 * Provides the small API the game expects (db, user) outside Claude:
 *  - db: a document store. Offline it lives in this browser (localStorage).
 *        Online, the host's browser holds the game and guests sync with it through a
 *        public MQTT broker over secure WebSockets. Paths under data/users/ never leave
 *        the device, so Command Stacks stay hidden. Every message is signed: only the
 *        host can publish the game, and only seated players can make moves.
 *  - user: a random id kept in this browser.
 */
(function () {
  'use strict';
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  const PREFIX = 'conquest-table-';
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  function merge(a, b) {
    const o = (a && typeof a === 'object' && !Array.isArray(a)) ? Object.assign({}, a) : {};
    for (const k in b) { const v = b[k]; o[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? merge(o[k], v) : v; }
    return o;
  }

  /* ---------- session: offline, hosting or joined ---------- */
  const params = new URLSearchParams(location.search);
  const clean = v => (v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const joinCode = clean(params.get('join'));
  const hostCode = clean(params.get('host'));
  const mode = joinCode ? 'guest' : hostCode ? 'host' : 'local';
  const room = joinCode || hostCode || 'local';

  /* ---------- identity ----------
     The host and offline player use one id per browser. A guest gets an id per game,
     so a second tab in the same browser can join as a different player, and the same
     guest gets their seat back after a reload. */
  const idKey = mode === 'guest' ? PREFIX + 'me-guest-' + room : PREFIX + 'me';
  let myId = LS.get(idKey, null);
  if (!myId) { myId = (mode === 'guest' ? 'g' : 'p') + Math.random().toString(36).slice(2, 10); LS.set(idKey, myId); }

  /* ---------- store ---------- */
  const isPrivate = p => p.startsWith('data/users/');
  const storeKey = PREFIX + 'room-' + room;
  const privKey = PREFIX + 'priv-' + room + '-' + myId;
  // The host and offline players keep the game in localStorage, so a refresh resumes it.
  // Firebase (when configured in firebase-config.js) keeps online games in the cloud;
  // otherwise online games relay through MQTT with the host's browser as referee.
  const FB = (mode !== 'local' && window.CONQUEST_FIREBASE && window.CONQUEST_FIREBASE.projectId) ? window.CONQUEST_FIREBASE : null;
  let docs = (mode === 'guest' || FB) ? {} : LS.get(storeKey, {});
  let priv = LS.get(privKey, {});
  const subs = {};
  function persist() { if (mode !== 'guest' && !FB) LS.set(storeKey, docs); LS.set(privKey, priv); }
  function read(p) { return isPrivate(p) ? priv[p] : docs[p]; }
  function fire(p) {
    const v = read(p), list = subs[p] || [];
    list.forEach(fn => { try { fn({ exists: v != null, id: p.split('/').pop(), data: () => clone(v) }); } catch (e) { console.error(e); } });
  }
  function applyLocal(p, data, isUpdate) {
    const tgt = isPrivate(p) ? priv : docs;
    if (data === null && !isUpdate) delete tgt[p];
    else tgt[p] = isUpdate ? merge(tgt[p], data) : clone(data);
    persist(); fire(p);
  }

  /* ---------- signed messages ----------
     The relay is public: anyone who knows a game code can read its messages and send their own. So every
     message is signed with ECDSA (P-256) keys kept in this browser:
     - The host's key decides the game code (the code is made from a hash of the key), so a guest who has the
       code can check that documents really come from the host and ignores everything else.
     - Each guest signs its moves with its own key. The host ties that key to the guest's player id the first
       time it sees it; from then on only that key can write as that player.
     - The host only accepts moves from players in a seat. Watchers can show up in the lobby and take an open
       seat, nothing else. Nobody but the host can change who else sits where, or who the host is. */
  const SUB = (window.isSecureContext && window.crypto && crypto.subtle) || null;
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const enc = t => new TextEncoder().encode(t);
  const b64 = buf => { let t = ''; new Uint8Array(buf).forEach(c => (t += String.fromCharCode(c))); return btoa(t); };
  const unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  const pubOnly = j => ({ kty: j.kty, crv: j.crv, x: j.x, y: j.y });
  async function newKeyPair() {
    const kp = await SUB.generateKey(ALG, true, ['sign', 'verify']);
    return { pub: pubOnly(await SUB.exportKey('jwk', kp.publicKey)), priv: await SUB.exportKey('jwk', kp.privateKey) };
  }
  /* the 8-letter game code that belongs to a host key */
  async function codeOf(jwk) {
    const h = new Uint8Array(await SUB.digest('SHA-256', enc(jwk.crv + '.' + jwk.x + '.' + jwk.y)));
    let c = ''; for (let i = 0; i < 8; i++) c += CODE_CHARS[h[i] % 32];
    return c;
  }
  const sameKey = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
  const keyName = PREFIX + 'key-' + (mode === 'guest' ? 'guest-' : 'host-') + room;
  const keysP = (mode === 'local' || !SUB) ? null : (async () => {
    let j = LS.get(keyName, null);
    if (!j) { j = await newKeyPair(); LS.set(keyName, j); }
    return { pub: j.pub, priv: await SUB.importKey('jwk', j.priv, ALG, false, ['sign']) };
  })();
  async function signed(body, withKey) {
    if (!keysP) return { b: body, s: '' };
    const K = await keysP;
    const m = { b: body, s: b64(await SUB.sign(SIG, K.priv, enc(body))) };
    if (withKey) m.k = K.pub;
    return m;
  }
  async function checks(jwk, m) {
    if (!SUB) return true;
    if (!jwk || !m || typeof m.b !== 'string' || typeof m.s !== 'string') return false;
    try { return await SUB.verify(SIG, await SUB.importKey('jwk', pubOnly(jwk), ALG, false, ['verify']), unb64(m.s), enc(m.b)); } catch (e) { return false; }
  }
  /* sequence numbers only go up, so an old message sent again is ignored */
  let lastSeq = 0;
  const nextSeq = () => (lastSeq = Math.max(Date.now(), lastSeq + 1));
  /* one message at a time, in the order they arrive */
  let chain = Promise.resolve();
  const inOrder = fn => (chain = chain.then(fn).catch(e => console.error(e)));

  /* ---------- who may write what (the host checks every guest write) ---------- */
  const regKey = PREFIX + 'players-' + room;
  const reg = mode === 'host' ? LS.get(regKey, {}) : {};
  function seatOf(id, seats) { return seats.cs === id ? 'cs' : seats.nord === id ? 'nord' : null; }
  /* the seats after a guest's change: they may take an open seat (if not seated already) or leave their own */
  function allowedSeats(from, cur, want) {
    const out = Object.assign({ cs: null, nord: null }, cur), mine = seatOf(from, cur);
    ['cs', 'nord'].forEach(side => {
      if (!want || !(side in want)) return;
      const was = cur[side] || null, now = want[side] || null;
      if (was === now) return;
      if (now === from && !was && !mine) out[side] = from;
      else if (now === null && was === from) out[side] = null;
    });
    return out;
  }
  /* the game's board as the host has it now (the game keeps it in its own global) */
  function hostBoard() {
    try { if (typeof state !== 'undefined' && state) return state; } catch (e) { }
    return docs['game/state'] || {};
  }
  /* a change inside a game log entry: the same rules as a direct write to the board. Returns the change to keep,
     or null to refuse the entry */
  function vetChange(from, d, seated) {
    if (d == null) return d;
    if (typeof d !== 'object' || Array.isArray(d)) return null;
    const st = hostBoard(), cur = st.seats || {};
    d = Object.assign({}, d);
    if ('seats' in d) {
      const want = d.seats && typeof d.seats === 'object' ? d.seats : {};
      const ok = allowedSeats(from, cur, want), out = {};
      ['cs', 'nord'].forEach(side => { if (side in want && (ok[side] || null) !== (cur[side] || null)) out[side] = ok[side]; });
      if (Object.keys(out).length) d.seats = out; else delete d.seats;
    }
    if ('hostId' in d) delete d.hostId;
    /* before the game starts the host decides: the scenario, the terrain, opening the review and starting the
       game; a player only sends their own army */
    if (seated && ['setup', 'review', undefined].includes(st.step)) {
      const me = seatOf(from, cur);
      if (['step', 'scenario', 'terrain', 'zones', 'units', 'round', 'gid', 'mode', 'turn'].some(k => k in d)) return null;
      if (d.setup && typeof d.setup === 'object') {
        if (Object.keys(d.setup).some(k => k !== me)) return null;
      }
      if (d.names && typeof d.names === 'object' && Object.keys(d.names).some(k => k !== me)) return null;
    }
    if (seated) return d;
    /* not seated: only taking an open seat, with your name on it */
    const side = d.seats ? Object.keys(d.seats).find(k => d.seats[k] === from) : null;
    if (!side) return null;
    if (Object.keys(d).some(k => !['seats', 'players', 'updatedAt'].includes(k))) return null;
    if (d.players) {
      if (d.players[side] == null) delete d.players;
      else d.players = { [side]: String(d.players[side]).slice(0, 24) };
    }
    return d;
  }
  /* a write to the game log (game/lg-…, game/ck-…, game/c0-…, game/head): entries are checked one by one */
  function vetLog(from, p, v, u) {
    const st = hostBoard(), seated = !!seatOf(from, st.seats || {});
    if (!v || typeof v !== 'object') return null;
    if (/^game\/lg-/.test(p)) {
      /* creating an empty entry document */
      if (!u) return docs[p] == null && v.e && typeof v.e === 'object' && !Object.keys(v.e).length ? { e: {} } : null;
      const E = v.e && typeof v.e === 'object' ? v.e : null;
      if (!E) return null;
      const out = {};
      Object.keys(E).forEach(k => {
        const e = E[k];
        if (!e || typeof e !== 'object' || e.u !== from) return;
        if (docs[p] && docs[p].e && docs[p].e[k]) return; /* entries are never rewritten */
        if (!seated && e.k !== 'setup') return;
        if (e.k === 'undo' && !seated) return;
        const d = vetChange(from, e.d, seated);
        if (d === null) return;
        out[k] = Object.assign({}, e, { d });
      });
      return Object.keys(out).length ? { e: out } : null;
    }
    /* the board as a whole (a checkpoint, a new game, which game is current): seated players only, never the host */
    if (!seated) return null;
    if (/^game\/(ck|c0)-/.test(p) && v.s && typeof v.s === 'object') {
      const hid = st.hostId;
      v = Object.assign({}, v, { s: Object.assign({}, v.s) });
      if (hid !== undefined) v.s.hostId = hid; else delete v.s.hostId;
    }
    return v;
  }
  /* returns the write to apply, or null to refuse it */
  function vet(from, p, v, u) {
    if (isPrivate(p) || p.startsWith('events/') || !/^game\/[A-Za-z0-9-]+$/.test(p)) return null;
    if (/^game\/(lg|ck|c0)-[A-Za-z0-9-]+$/.test(p) || p === 'game/head') return vetLog(from, p, v, u);
    if (p === 'game/lobby') {
      /* the lobby: everyone may update their own line, nothing else */
      return u && v && typeof v === 'object' && Object.keys(v).length === 1 && Object.keys(v)[0] === from ? v : null;
    }
    /* who sits where: the board as the game has it now (the old game/state document is no longer kept up to date) */
    const st = hostBoard(), cur = st.seats || {}, mine = seatOf(from, cur);
    if (p !== 'game/state') return mine ? v : null;
    if (!v || typeof v !== 'object') return null;
    v = Object.assign({}, v);
    if (!u || 'seats' in v) v.seats = allowedSeats(from, cur, v.seats || (u ? {} : cur));
    if ('hostId' in v || (!u && st.hostId !== undefined)) v.hostId = st.hostId;
    if (mine) return v;
    /* not seated: only taking an open seat, with your name on it */
    const side = seatOf(from, v.seats || {});
    if (!u || !side) return null;
    const keys = Object.keys(v).filter(k => !['seats', 'players', 'updatedAt'].includes(k));
    if (keys.length) return null;
    if (v.players) v.players = v.players[side] != null ? { [side]: String(v.players[side]).slice(0, 24) } : undefined;
    if (v.players === undefined) delete v.players;
    return v;
  }

  /* ---------- online play ----------
     Players meet on a public MQTT broker over secure WebSockets, which works on almost
     any network (no WebRTC, no TURN). The host's browser is the referee: guests send
     write requests, the host applies them and publishes each shared document as a
     retained message. Private paths (data/users/...) are never sent. */
  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const TOPIC = 'conquest-table/v2/' + room + '/';
  let client = null, brokerIx = -1;
  let ready = mode !== 'guest', readyWaiters = [], hostSeen = false, wq = [];
  let status = mode === 'local' ? 'Offline: this device only' : 'Connecting…';
  function setStatus(t) { status = t; renderBar(); }
  function whenReady() { return ready ? Promise.resolve() : new Promise(r => readyWaiters.push(r)); }
  function markReady() { if (ready) return; ready = true; readyWaiters.splice(0).forEach(r => r()); }
  function pub(topic, obj, retain) { if (client && client.connected) client.publish(topic, obj == null ? '' : JSON.stringify(obj), { qos: 1, retain: !!retain }); }

  const lastPub = {}, rejected = [];
  function hostPublish(p) {
    const body = JSON.stringify({ room, p, v: docs[p] == null ? null : docs[p], seq: nextSeq() });
    lastPub[p] = body;
    return signed(body).then(m => pub(TOPIC + 'doc/' + p, m, true));
  }
  function hostWrite(p, data, isUpdate) {
    applyLocal(p, data, isUpdate);
    inOrder(() => hostPublish(p));
  }
  /* a guest's write: check the signature, the player's key and what they may change */
  async function hostReceive(m) {
    if (!m || typeof m.b !== 'string') return;
    let w; try { w = JSON.parse(m.b); } catch (e) { return; }
    if (!w || w.room !== room || typeof w.from !== 'string' || typeof w.p !== 'string' || !(+w.seq > 0)) return;
    if (!(await checks(m.k, m))) return;
    const known = reg[w.from];
    if (known && !sameKey(known.k, m.k)) return;
    if (known && +w.seq <= +known.seq) return;
    const v = vet(w.from, w.p, w.v, !!w.u);
    reg[w.from] = { k: pubOnly(m.k), seq: +w.seq };
    LS.set(regKey, reg);
    if (v === null) {
      /* refused: the writer already shows its own change, so send everyone the real document again */
      rejected.push({ from: w.from, p: w.p, at: Date.now() }); if (rejected.length > 20) rejected.shift();
      if (docs[w.p] !== undefined && /^game\/(state|lg-|ck-|c0-|head)/.test(w.p)) return hostPublish(w.p);
      return;
    }
    hostWrite(w.p, v, !!w.u);
  }
  async function write(p, data, isUpdate) {
    if (isPrivate(p) || mode === 'local') { applyLocal(p, data, isUpdate); return; }
    if (FB) { await whenReady(); applyLocal(p, data, isUpdate); return fbWrite(p, data, isUpdate); }
    if (mode === 'host') { hostWrite(p, data, isUpdate); return; }
    await whenReady();
    const msg = await signed(JSON.stringify({ room, p, v: data, u: !!isUpdate, from: myId, seq: nextSeq() }), true);
    if (client && client.connected) pub(TOPIC + 'w', msg, false); else wq.push(msg);
    // Show our own change straight away; the host's copy follows and wins.
    applyLocal(p, data, isUpdate);
  }

  function loadLib() {
    return new Promise((res, rej) => {
      if (window.mqtt) return res();
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js';
      s.onload = () => window.mqtt ? res() : rej(new Error('mqtt missing')); s.onerror = () => rej(new Error('MQTT library failed to load'));
      document.head.appendChild(s);
    });
  }
  function brokers() { const o = window.__conquestBrokers; return Array.isArray(o) && o.length ? o : BROKERS; }
  function tryConnect(url) {
    return new Promise(res => {
      const opts = { clientId: 'ct-' + myId + '-' + Math.random().toString(36).slice(2, 6), clean: true, connectTimeout: 5000, reconnectPeriod: 3000, keepalive: 30 };
      if (mode === 'host') opts.will = { topic: TOPIC + 'host', payload: JSON.stringify({ online: false, at: Date.now() }), qos: 1, retain: true };
      const c = window.mqtt.connect(url, opts); let done = false;
      const fin = ok => { if (done) return; done = true; if (!ok) { try { c.end(true); } catch (e) { } } res(ok ? c : null); };
      c.once('connect', () => fin(true)); c.once('error', () => fin(false)); setTimeout(() => fin(false), 6000);
    });
  }
  /* the host's key as this guest has checked it: its hash must give the game code. A game code made before
     signed messages (or typed wrong) has no matching key; then the first key seen is trusted for this game. */
  const hostPinKey = PREFIX + 'hostkey-' + room;
  let hostKey = mode === 'guest' ? LS.get(hostPinKey, null) : null, hostKeyChecked = false;
  const docSeq = {}, pendingDocs = [];
  async function learnHostKey(k) {
    if (!k || !SUB || (hostKey && hostKeyChecked)) return;
    const ok = (await codeOf(k)) === room;
    if (ok) { hostKey = pubOnly(k); hostKeyChecked = true; LS.set(hostPinKey, hostKey); }
    else if (!hostKey) { hostKey = pubOnly(k); LS.set(hostPinKey, hostKey); }
    pendingDocs.splice(0).forEach(([p, m]) => guestDoc(p, m));
  }
  async function guestDoc(p, m) {
    if (SUB && !hostKey) { pendingDocs.push([p, m]); return; }
    if (!(await checks(hostKey, m))) return;
    let d; try { d = JSON.parse(m.b); } catch (e) { return; }
    if (!d || d.room !== room || d.p !== p || !(+d.seq > (docSeq[p] || 0))) return;
    docSeq[p] = +d.seq;
    if (d.v == null) delete docs[p]; else docs[p] = d.v;
    fire(p);
  }
  function onMessage(topic, buf) {
    const rest = topic.slice(TOPIC.length); let v = null; const txt = buf ? buf.toString() : '';
    if (txt) { try { v = JSON.parse(txt); } catch (e) { return; } }
    if (rest === 'host' && mode === 'guest' && v && v.key) inOrder(() => learnHostKey(v.key));
    if (rest === 'host') { if (mode === 'guest') { hostSeen = !!(v && v.online); setStatus(hostSeen ? 'Connected to game ' + room : 'Game ' + room + ': waiting for the host to come back…'); if (hostSeen) markReady(); } return; }
    if (rest === 'w') { if (mode === 'host') inOrder(() => hostReceive(v)); return; }
    if (rest.startsWith('doc/')) {
      const p = rest.slice(4);
      if (mode === 'guest') { if (v) inOrder(() => guestDoc(p, v)); }
      else if (mode === 'host') inOrder(async () => {
        if (!v || v.b === lastPub[p]) return;
        /* the host's own document from an earlier session: take it back after a reload */
        if (restoring && docs[p] == null && keysP && (await checks((await keysP).pub, v))) {
          try { const d = JSON.parse(v.b); if (d.room === room && d.p === p && d.v != null) { docs[p] = d.v; lastPub[p] = v.b; persist(); fire(p); } } catch (e) { }
          return;
        }
        /* our own messages come back from the relay, sometimes an older one after a newer one: never answer
           them, or two copies in flight keep setting each other off. Only a message someone else put on the host's
           topic is answered, by publishing the real document again */
        if (keysP && (await checks((await keysP).pub, v))) return;
        if (!restoring && docs[p] !== undefined) return hostPublish(p);
      });
    }
  }
  /* ---------- Firebase (Cloud Firestore) ---------- */
  const FBV = '10.12.2';
  let fs = null, fdb = null, fbFirst = true;
  const fbId = p => p.replace(/\//g, '~');
  const fbPath = id => id.replace(/~/g, '/');
  function fbRef(p) { return fs.doc(fdb, 'rooms', room, 'docs', fbId(p)); }
  async function fbWrite(p, data, isUpdate) {
    const ref = fbRef(p);
    try {
      if (data === null && !isUpdate) await fs.deleteDoc(ref);
      else if (!isUpdate) await fs.setDoc(ref, { j: JSON.stringify(data), at: Date.now(), by: myId });
      else await fs.runTransaction(fdb, async t => {
        const snap = await t.get(ref); const cur = snap.exists() ? JSON.parse(snap.data().j) : undefined;
        t.set(ref, { j: JSON.stringify(merge(cur, data)), at: Date.now(), by: myId });
      });
    } catch (e) { console.error(e); setStatus('Could not save to Firebase (' + (e.code || e.message) + '). Check the Firestore rules.'); throw Object.assign(e, { code: 'unavailable' }); }
  }
  async function startFirebase() {
    setStatus('Connecting to game ' + room + '…');
    let app;
    try {
      app = await import('https://www.gstatic.com/firebasejs/' + FBV + '/firebase-app.js');
      fs = await import('https://www.gstatic.com/firebasejs/' + FBV + '/firebase-firestore.js');
    } catch (e) { setStatus('Could not load Firebase. Check your internet connection and reload.'); return; }
    try { fdb = fs.getFirestore(app.initializeApp(FB)); } catch (e) { setStatus('Firebase is not set up correctly (' + e.message + ').'); return; }
    fs.onSnapshot(fs.collection(fdb, 'rooms', room, 'docs'), snap => {
      const changed = [];
      snap.docChanges().forEach(ch => {
        const p = fbPath(ch.doc.id);
        if (ch.type === 'removed') delete docs[p];
        else { try { docs[p] = JSON.parse(ch.doc.data().j); } catch (e) { return; } }
        changed.push(p);
      });
      if (fbFirst) { fbFirst = false; setStatus('Online game ' + room + ' · saved in the cloud'); markReady(); Object.keys(subs).forEach(fire); }
      else changed.forEach(fire);
    }, err => setStatus('Firebase refused the connection (' + (err.code || err.message) + '). Check the Firestore rules.'));
    addEventListener('online', () => setStatus('Online game ' + room + ' · saved in the cloud'));
    addEventListener('offline', () => setStatus('You are offline. Moves will sync when you reconnect.'));
  }

  let restoring = false, firstAnnounce = null;
  async function startNetwork() {
    if (mode === 'local') return;
    if (FB) return startFirebase();
    try { await loadLib(); } catch (e) { setStatus('Could not load the online play library. Check your internet connection and reload.'); return; }
    const list = brokers(); let order = list.map((u, i) => i), fallback = null;
    const pref = +params.get('b'); if (pref >= 0 && pref < list.length) order = [pref].concat(order.filter(i => i !== pref));
    for (const i of order) {
      setStatus((mode === 'host' ? 'Starting game ' : 'Looking for game ') + room + '… (server ' + (i + 1) + ' of ' + list.length + ')');
      const c = await tryConnect(list[i]); if (!c) continue;
      if (mode === 'guest') {
        // Check that the host is on this server before settling on it.
        const found = await new Promise(res => {
          let ok = false; const h = (t, b) => { if (t === TOPIC + 'host') { try { const v = JSON.parse(b.toString() || 'null'); if (v && v.key) firstAnnounce = v; if (v && v.online) { ok = true; res(true); } } catch (e) { } } };
          c.on('message', h); c.subscribe(TOPIC + 'host', { qos: 1 }); setTimeout(() => { c.removeListener('message', h); res(ok); }, 3500);
        });
        if (!found) { if (!fallback) fallback = [c, i]; else { try { c.end(true); } catch (e) { } } continue; }
        if (fallback) { try { fallback[0].end(true); } catch (e) { } fallback = null; }
        hostSeen = true;
      }
      client = c; brokerIx = i; break;
    }
    // No host anywhere yet: wait on the first server that answered.
    if (!client && fallback) { client = fallback[0]; brokerIx = fallback[1]; }
    if (!client) { setStatus('Could not reach any game server. Your network may block them; try another network (for example mobile data).'); return; }
    client.on('message', onMessage);
    /* the host's announcement was read while looking for the host: learn its key from it */
    if (mode === 'guest' && firstAnnounce) inOrder(() => learnHostKey(firstAnnounce.key));
    client.on('reconnect', () => setStatus('Connection lost, reconnecting…'));
    client.on('offline', () => setStatus('Offline, reconnecting…'));
    if (mode === 'host') {
      const announce = async () => { pub(TOPIC + 'host', { online: true, at: Date.now(), id: myId, key: keysP ? (await keysP).pub : null }, true); setStatus('Hosting game ' + room + ' · keep this tab open'); };
      const publishAll = () => Object.keys(docs).forEach(p => inOrder(() => hostPublish(p)));
      client.on('connect', () => { announce(); publishAll(); });
      restoring = !Object.keys(docs).length;
      client.subscribe([TOPIC + 'w', TOPIC + 'doc/#'], { qos: 1 }, () => {
        setTimeout(() => inOrder(() => { restoring = false; publishAll(); announce(); }), 1500);
      });
      addEventListener('pagehide', () => { try { client.publish(TOPIC + 'host', JSON.stringify({ online: false, at: Date.now() }), { qos: 0, retain: true }); } catch (e) { } });
    } else {
      client.on('connect', () => { wq.splice(0).forEach(m => pub(TOPIC + 'w', m, false)); });
      client.subscribe([TOPIC + 'doc/#', TOPIC + 'host'], { qos: 1 }, () => {
        setTimeout(() => { Object.keys(docs).forEach(fire); setStatus(hostSeen ? 'Connected to game ' + room : 'No host is online for game ' + room + ' yet. Waiting…'); markReady(); }, 1200);
      });
    }
  }

  /* ---------- db API (shape used by the game) ---------- */
  function doc(path) {
    return {
      id: path.split('/').pop(),
      async get() { await whenReady(); const v = read(path); return { exists: v != null, id: path.split('/').pop(), data: () => clone(v) }; },
      async set(v) { await write(path, v, false); },
      async update(v) { await write(path, v, true); },
      async delete() { await write(path, null, false); },
      onSnapshot(cb, err) {
        (subs[path] = subs[path] || []).push(cb);
        whenReady().then(() => { const v = read(path); cb({ exists: v != null, id: path.split('/').pop(), data: () => clone(v) }); });
        return () => { subs[path] = (subs[path] || []).filter(f => f !== cb); };
      }
    };
  }
  const db = { doc, collection: c => ({ doc: id => doc(c + '/' + id) }) };
  // Event logs are not needed outside Claude; keep them out of the synced store.
  const realDoc = db.doc;
  db.doc = p => p.startsWith('events/') ? { async set() { }, async update() { }, onSnapshot() { return () => { }; } } : realDoc(p);
  db.collection = c => ({ doc: id => db.doc(c + '/' + id) });

  /* ---------- user API ---------- */
  const user = { async id() { return myId; }, async me() { return { id: myId, name: '', email: null }; }, async isOwner() { return mode !== 'guest'; }, async canEdit() { return true; } };

  window.claude = { use: async name => name === 'db' ? db : name === 'user' ? user : null };

  /* ---------- connection bar ---------- */
  let bar = null;
  function newCode() { const a = CODE_CHARS; let s = ''; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  /* a new game: make the host's key first, its hash is the game code */
  async function hostNew() {
    if (!SUB) { location.href = urlWith('host=' + newCode()); return; }
    const j = await newKeyPair(), code = await codeOf(j.pub);
    LS.set(PREFIX + 'key-host-' + code, j);
    location.href = urlWith('host=' + code);
  }
  function urlWith(q) { return location.origin + location.pathname + (q ? '?' + q : ''); }
  function renderBar() {
    if (!document.body) return;
    if (!bar) { bar = document.createElement('div'); bar.id = 'net-bar'; document.body.insertBefore(bar, document.body.firstChild); }
    bar.innerHTML = '';
    const left = document.createElement('div'); left.className = 'nb-l';
    const dot = document.createElement('span'); dot.className = 'nb-dot ' + (mode === 'local' ? 'off' : /^(Connected|Hosting game|Online game)/.test(status) ? 'on' : 'wait');
    const st = document.createElement('span'); st.textContent = status; left.append(dot, st); bar.appendChild(left);
    const right = document.createElement('div'); right.className = 'nb-r';
    const btn = (t, fn, primary) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (primary ? '' : ' ghost'); b.textContent = t; b.onclick = fn; right.appendChild(b); return b; };
    if (mode === 'local') {
      /* hosting and joining happen in the Multiplayer lobby, after you have entered your name */
    } else {
      if (mode === 'host' || FB) btn('Copy invite link', async () => {
        const link = urlWith('join=' + room + (brokerIx > 0 ? '&b=' + brokerIx : ''));
        try { await navigator.clipboard.writeText(link); flash('Invite link copied: ' + link); } catch (e) { flash('Send this link to your opponent: ' + link); }
      }, true);
      btn('Leave', () => { try { window.__presenceLeave && window.__presenceLeave(); } catch (e) { } setTimeout(() => { location.href = urlWith(''); }, 400); });
    }
    bar.appendChild(right);
  }
  function flash(t) { const n = document.createElement('div'); n.className = 'nb-flash'; n.textContent = t; document.body.appendChild(n); setTimeout(() => n.remove(), 6000); }
  const css = document.createElement('style');
  css.textContent = '#net-bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;max-width:1240px;margin:8px auto 0;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel);font-size:14px}' +
    '#net-bar .nb-l{display:flex;align-items:center;gap:8px;min-width:0}#net-bar .nb-r{display:flex;flex-wrap:wrap;gap:6px}' +
    '.nb-join{display:flex;gap:6px}.nb-join input{width:120px;font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);text-transform:uppercase}' +
    '.nb-dot{width:9px;height:9px;border-radius:50%;flex:none;background:var(--muted)}.nb-dot.on{background:var(--ok)}.nb-dot.wait{background:var(--gold)}' +
    '.nb-flash{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);max-width:calc(100vw - 32px);background:var(--ink);color:var(--bg);padding:10px 14px;border-radius:10px;font-size:14px;z-index:60;overflow-wrap:anywhere}';
  document.head.appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderBar); else renderBar();
  startNetwork();
  window.__conquestNet = { mode, room, docs: () => docs, id: () => myId, rejected: () => rejected.slice(),
    host: () => { hostNew(); },
    join: c => { c = clean(c || ''); if (c.length >= 4) location.href = urlWith('join=' + c); else flash('Type the game code your host sent you.'); },
    invite: async () => { const link = urlWith('join=' + room + (brokerIx > 0 ? '&b=' + brokerIx : '')); try { await navigator.clipboard.writeText(link); flash('Invite link copied: ' + link); } catch (e) { flash('Send this link to your opponent: ' + link); } },
    leave: () => { try { window.__presenceLeave && window.__presenceLeave(); } catch (e) { } setTimeout(() => { location.href = urlWith(''); }, 400); } };
})();
