/*
 * Conquest Table: standalone runtime.
 * Provides the small API the game expects (db, user, sample) outside Claude:
 *  - db: a document store. Offline it lives in this browser (localStorage).
 *        Online, the host's browser holds the game and every guest syncs with it
 *        peer-to-peer (PeerJS / WebRTC). Paths under data/users/ never leave the device,
 *        so Command Stacks stay hidden.
 *  - user: a random id kept in this browser.
 *  - sample: Claude through the player's own Anthropic API key (optional).
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

  /* ---------- identity ---------- */
  let myId = LS.get(PREFIX + 'me', null);
  if (!myId) { myId = 'p' + Math.random().toString(36).slice(2, 10); LS.set(PREFIX + 'me', myId); }

  /* ---------- session: offline, hosting or joined ---------- */
  const params = new URLSearchParams(location.search);
  const joinCode = (params.get('join') || '').trim().toUpperCase();
  const hostCode = (params.get('host') || '').trim().toUpperCase();
  const mode = joinCode ? 'guest' : hostCode ? 'host' : 'local';
  const room = joinCode || hostCode || 'local';
  const PEER_PREFIX = 'conquest-table-v1-';

  /* ---------- store ---------- */
  const isPrivate = p => p.startsWith('data/users/');
  const storeKey = PREFIX + 'room-' + room;
  const privKey = PREFIX + 'priv-' + room;
  // The host and offline players keep the game in localStorage, so a refresh resumes it.
  let docs = (mode === 'guest') ? {} : LS.get(storeKey, {});
  let priv = LS.get(privKey, {});
  const subs = {};
  function persist() { if (mode !== 'guest') LS.set(storeKey, docs); LS.set(privKey, priv); }
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

  /* ---------- peer-to-peer ---------- */
  let peer = null, hostConn = null; const guests = new Set();
  let ready = mode !== 'guest', readyWaiters = [];
  let status = mode === 'local' ? 'Offline: this device only' : 'Connecting…';
  function setStatus(t) { status = t; renderBar(); }
  function whenReady() { return ready ? Promise.resolve() : new Promise(r => readyWaiters.push(r)); }
  function markReady() { ready = true; readyWaiters.splice(0).forEach(r => r()); }
  function broadcast(msg, except) { guests.forEach(c => { if (c !== except && c.open) try { c.send(msg); } catch (e) { } }); }

  function hostWrite(p, data, isUpdate, from) {
    applyLocal(p, data, isUpdate);
    broadcast({ t: 'doc', p, v: docs[p] == null ? null : docs[p] }, null);
  }
  async function write(p, data, isUpdate) {
    if (isPrivate(p) || mode === 'local') { applyLocal(p, data, isUpdate); return; }
    if (mode === 'host') { hostWrite(p, data, isUpdate); return; }
    await whenReady();
    if (!hostConn || !hostConn.open) throw Object.assign(new Error('Not connected to the host'), { code: 'unavailable' });
    hostConn.send({ t: 'write', p, v: data, u: !!isUpdate });
    // Show our own change straight away; the host's copy follows and wins.
    applyLocal(p, data, isUpdate);
  }

  function loadPeerJs() {
    return new Promise((res, rej) => {
      if (window.Peer) return res();
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('PeerJS failed to load'));
      document.head.appendChild(s);
    });
  }
  async function startNetwork() {
    if (mode === 'local') return;
    try { await loadPeerJs(); } catch (e) { setStatus('Could not load the online play library. Check your connection.'); return; }
    if (mode === 'host') {
      peer = new window.Peer(PEER_PREFIX + room);
      peer.on('open', () => setStatus('Hosting game ' + room + ' · keep this tab open'));
      peer.on('error', err => {
        if (err && err.type === 'unavailable-id') setStatus('Game ' + room + ' is already hosted in another tab or by someone else.');
        else setStatus('Connection problem: ' + ((err && err.type) || 'unknown') + '. Reload to retry.');
      });
      peer.on('disconnected', () => { setStatus('Lost the signalling server, reconnecting…'); try { peer.reconnect(); } catch (e) { } });
      peer.on('connection', conn => {
        conn.on('open', () => {
          guests.add(conn); conn.send({ t: 'snapshot', docs });
          setStatus('Hosting game ' + room + ' · ' + guests.size + ' connected');
        });
        conn.on('data', msg => {
          if (msg && msg.t === 'write' && typeof msg.p === 'string' && !isPrivate(msg.p)) hostWrite(msg.p, msg.v, msg.u, conn);
        });
        conn.on('close', () => { guests.delete(conn); setStatus('Hosting game ' + room + ' · ' + guests.size + ' connected'); });
      });
    } else {
      peer = new window.Peer();
      const connect = () => {
        setStatus('Joining game ' + room + '…');
        hostConn = peer.connect(PEER_PREFIX + room, { reliable: true });
        hostConn.on('open', () => setStatus('Connected to game ' + room));
        hostConn.on('data', msg => {
          if (!msg) return;
          if (msg.t === 'snapshot') {
            const old = Object.keys(docs); docs = msg.docs || {};
            new Set(old.concat(Object.keys(docs))).forEach(fire); markReady();
          } else if (msg.t === 'doc') {
            if (msg.v == null) delete docs[msg.p]; else docs[msg.p] = msg.v; fire(msg.p);
          }
        });
        hostConn.on('close', () => { setStatus('The host left or the connection dropped. Retrying…'); setTimeout(connect, 3000); });
      };
      peer.on('open', connect);
      peer.on('error', err => {
        if (err && err.type === 'peer-unavailable') { setStatus('No game ' + room + ' is running right now. Retrying…'); setTimeout(connect, 4000); }
        else setStatus('Connection problem: ' + ((err && err.type) || 'unknown') + '.');
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

  /* ---------- Claude through the player's own API key ---------- */
  const settings = () => LS.get(PREFIX + 'claude', { key: '', model: 'claude-sonnet-5-5', strong: 'claude-opus-5-5' });
  function extractJson(t) {
    t = String(t || '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (fence) t = fence[1];
    const i = t.search(/[\[{]/); if (i < 0) throw new Error('no JSON');
    const open = t[i], close = open === '{' ? '}' : ']'; let depth = 0, inStr = false, esc = false;
    for (let j = i; j < t.length; j++) {
      const ch = t[j];
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true; else if (ch === open) depth++; else if (ch === close && --depth === 0) return JSON.parse(t.slice(i, j + 1));
    }
    throw new Error('incomplete JSON');
  }
  async function callClaude(prompt, opts) {
    const s = settings();
    if (!s.key) throw Object.assign(new Error('No Anthropic API key set'), { code: 'not_granted' });
    const model = opts && opts.modelTier === 'complex' ? (s.strong || s.model) : s.model;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error.message; } catch (e) { } throw Object.assign(new Error(m || ('HTTP ' + r.status)), { code: r.status === 401 ? 'not_granted' : r.status === 429 ? 'rate_limited' : 'unavailable' }); }
    const j = await r.json();
    return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  }
  const sample = Object.assign(async (prompt, opts) => ({ text: await callClaude(prompt, opts) }), {
    async json(prompt, opts) {
      const text = await callClaude(prompt + '\n\nAnswer with the JSON only, no other text.', opts);
      try { return extractJson(text); } catch (e) { throw Object.assign(new Error('Claude did not return valid JSON'), { code: 'bad_output' }); }
    }
  });

  window.claude = { use: async name => name === 'db' ? db : name === 'user' ? user : name === 'sample' ? sample : null };

  /* ---------- connection bar and settings ---------- */
  let bar = null;
  function newCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function urlWith(q) { return location.origin + location.pathname + (q ? '?' + q : ''); }
  function renderBar() {
    if (!document.body) return;
    if (!bar) { bar = document.createElement('div'); bar.id = 'net-bar'; document.body.insertBefore(bar, document.body.firstChild); }
    bar.innerHTML = '';
    const left = document.createElement('div'); left.className = 'nb-l';
    const dot = document.createElement('span'); dot.className = 'nb-dot ' + (mode === 'local' ? 'off' : /Connected|Hosting game \w+ ·/.test(status) ? 'on' : 'wait');
    const st = document.createElement('span'); st.textContent = status; left.append(dot, st); bar.appendChild(left);
    const right = document.createElement('div'); right.className = 'nb-r';
    const btn = (t, fn, primary) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (primary ? '' : ' ghost'); b.textContent = t; b.onclick = fn; right.appendChild(b); return b; };
    if (mode === 'local') {
      btn('Host an online game', () => { location.href = urlWith('host=' + newCode()); }, true);
      btn('Join with a code', () => { const c = prompt('Game code from the host:'); if (c && c.trim()) location.href = urlWith('join=' + encodeURIComponent(c.trim().toUpperCase())); });
    } else {
      if (mode === 'host') btn('Copy invite link', async () => {
        const link = urlWith('join=' + room);
        try { await navigator.clipboard.writeText(link); flash('Invite link copied: ' + link); } catch (e) { flash('Send this link to your opponent: ' + link); }
      }, true);
      btn('Leave', () => { location.href = urlWith(''); });
    }
    btn('Claude settings', openSettings);
    bar.appendChild(right);
  }
  function flash(t) { const n = document.createElement('div'); n.className = 'nb-flash'; n.textContent = t; document.body.appendChild(n); setTimeout(() => n.remove(), 6000); }
  function openSettings() {
    let d = document.getElementById('claude-settings');
    if (!d) { d = document.createElement('dialog'); d.id = 'claude-settings'; d.className = 'en-dlg'; document.body.appendChild(d); }
    const s = settings(); d.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'en-dbody';
    const h = document.createElement('h2'); h.textContent = 'Play against Claude'; h.style.cssText = 'margin:0;font-family:var(--display)';
    const p = document.createElement('p'); p.className = 'hint'; p.style.margin = '0';
    p.textContent = 'Claude reads army lists, designs its own army and plays as your opponent. Outside claude.ai it needs your own Anthropic API key, which is billed to your Anthropic account per game. The key is stored only in this browser and is sent only to api.anthropic.com. Online games against a friend do not need a key.';
    const lab = (t, el) => { const l = document.createElement('label'); l.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:14px'; const sp = document.createElement('span'); sp.textContent = t; l.append(sp, el); return l; };
    const key = Object.assign(document.createElement('input'), { type: 'password', value: s.key, placeholder: 'sk-ant-…', autocomplete: 'off' });
    const model = Object.assign(document.createElement('input'), { type: 'text', value: s.model });
    const strong = Object.assign(document.createElement('input'), { type: 'text', value: s.strong });
    [key, model, strong].forEach(i => i.style.cssText = 'font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)');
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap';
    const save = document.createElement('button'); save.type = 'button'; save.className = 'btn'; save.textContent = 'Save';
    save.onclick = () => { LS.set(PREFIX + 'claude', { key: key.value.trim(), model: model.value.trim() || 'claude-sonnet-5-5', strong: strong.value.trim() || 'claude-opus-5-5' }); d.close(); flash('Claude settings saved in this browser.'); };
    const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn ghost'; clear.textContent = 'Remove key';
    clear.onclick = () => { LS.set(PREFIX + 'claude', Object.assign(settings(), { key: '' })); key.value = ''; flash('API key removed from this browser.'); };
    const close = document.createElement('button'); close.type = 'button'; close.className = 'btn ghost'; close.textContent = 'Close'; close.onclick = () => d.close();
    row.append(clear, close, save);
    wrap.append(h, p, lab('Anthropic API key', key), lab('Model for turns', model), lab('Model for building armies', strong), row);
    d.appendChild(wrap); d.showModal();
  }
  const css = document.createElement('style');
  css.textContent = '#net-bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;max-width:1240px;margin:8px auto 0;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel);font-size:14px}' +
    '#net-bar .nb-l{display:flex;align-items:center;gap:8px;min-width:0}#net-bar .nb-r{display:flex;flex-wrap:wrap;gap:6px}' +
    '.nb-dot{width:9px;height:9px;border-radius:50%;flex:none;background:var(--muted)}.nb-dot.on{background:var(--ok)}.nb-dot.wait{background:var(--gold)}' +
    '.nb-flash{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);max-width:calc(100vw - 32px);background:var(--ink);color:var(--bg);padding:10px 14px;border-radius:10px;font-size:14px;z-index:60;overflow-wrap:anywhere}';
  document.head.appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderBar); else renderBar();
  startNetwork();
  window.__conquestNet = { mode, room, docs: () => docs };
})();
