/* Online play and the automatic opponent: seats, private stacks, shared combat, presence and animations. */
/* ---------- automatic opponent ---------- */
let AI = 'nord',
  HU = 'cs';
/* ---------- multiplayer: seats, private stacks, shared combat ---------- */
let myId = null,
  realId = null,
  myStk = null,
  ract = null,
  lastCbJson = 'null',
  lastLive = '',
  liveT = null,
  usr = null;
function PVP() {
  return !!(state && state.mode === 'pvp');
}
function SBX() {
  return !!(state && state.mode === 'test');
}
function other(s) {
  return s === 'cs' ? 'nord' : 'cs';
}
function seatSide() {
  if (!PVP() || !myId) return null;
  const st = state.seats || {};
  return st.cs === myId ? 'cs' : st.nord === myId ? 'nord' : null;
}
function applySeat() {
  const was = FLIP;
  const me = PVP() ? seatSide() || 'cs' : SBX() ? state.sbSide || 'cs' : 'cs';
  HU = ME = me;
  AI = other(me);
  FLIP = me === 'nord';
  if (was !== FLIP) {
    terrKey = '';
    zoneKey = '';
  }
  applyColors();
  const ly = $('leg-you'),
    lt2 = $('leg-them'),
    ltt = $('leg-them-t');
  if (ltt) ltt.textContent = PVP() ? 'Opponent' : 'Claude’s army';
  const h = $('view-hint');
  if (h)
    h.textContent =
      (PVP()
        ? seatSide()
          ? 'Shown from your side of the table. '
          : 'You are watching; the view is from the south edge. '
        : 'Shown from your side of the table. ') +
      'Arrow keys nudge ½″, Q and E wheel 15° during a March or Reform. R ruler, A arcs, T threat ranges, P ping; ? lists every hotkey.';
}
function PS() {
  if (!PVP()) return state;
  const d = {
      gid: state.gid,
      round: state.round,
      huStack: [],
      huHeld: null,
      huLastCard: null,
      strategicHeld: false,
      strategicUsedRound: 0,
      hammerUsed: false
    },
    s = myStk || {};
  if (s.gid !== state.gid) return d;
  if (s.round !== state.round) return Object.assign(d, { strategicUsedRound: s.strategicUsedRound || 0 });
  return Object.assign(d, s);
}
function stkPath() {
  return 'data/users/' + realId + '/stack';
}
async function savePS(patch) {
  const n = Object.assign({}, PS(), patch, { gid: state.gid, round: state.round });
  myStk = n;
  try {
    if (realId) await db.doc(stkPath()).set(n);
  } catch (e) {}
  try {
    localStorage.setItem('vob-stack', JSON.stringify(n));
  } catch (e) {}
}
function myTurnPvp() {
  return !PVP() || (!!seatSide() && state.turn === HU);
}
/* live view of the opponent's activation */
function pushLive() {
  if (!PVP() || !db || !seatSide()) return;
  const mine = act && base(act.id) && base(act.id).side === HU,
    chMine = !act && charAct && base(charAct.id) && base(charAct.id).side === HU;
  const v = mine
    ? JSON.stringify({ id: act.id, pose: act.pose, ov: liveOverlay() })
    : chMine
      ? JSON.stringify({ id: charAct.id, char: true, ov: liveOverlay() })
      : 'null';
  if (v === lastLive) return;
  lastLive = v;
  clearTimeout(liveT);
  liveT = setTimeout(() => {
    db.doc('game/live')
      .set({ by: HU, act: v, at: Date.now() })
      .catch(() => {});
  }, 120);
}
const rollSince = Date.now();
let rollSeen = 0,
  rollHideT = null;
function pubRoll(title, dice, text) {
  if (!PVP() || !db || !seatSide()) return;
  db.doc('game/roll')
    .set({ by: HU, title, dice: JSON.stringify(dice), text: text || '', at: Date.now() })
    .catch(() => {});
}
function onRoll(d) {
  if (!d || d.by === HU || !d.at || d.at < rollSince - 2000 || d.at === rollSeen) return;
  rollSeen = d.at;
  let dice = [];
  try {
    dice = JSON.parse(d.dice || '[]');
  } catch (e) {}
  banner((PN(d.by) || N(d.by)) + ' · ' + d.title, dice, d.text);
  clearTimeout(rollHideT);
  rollHideT = setTimeout(bannerHide, (DSPEED[SET.diceSpeed] || 1300) + 2600);
}
function onLive(d) {
  if (!d || d.by === HU) return;
  try {
    const a = JSON.parse(d.act || 'null');
    ract = a && a.id ? a : null;
  } catch (e) {
    ract = null;
  }
  if (!act) render();
}
/* shared combat: each side rolls its own dice */
function cbSync() {
  if (!PVP() || !db) return;
  const v = JSON.stringify(cb || null);
  if (v === lastCbJson) return;
  lastCbJson = v;
  const pose = act && cb ? { id: act.id, pose: act.pose } : null;
  db.doc('game/combat')
    .set({ by: HU, cb: v, pose: JSON.stringify(pose), at: Date.now() })
    .catch(() => {});
}
function onCombat(d) {
  if (!d || d.by === HU) return;
  lastCbJson = d.cb || 'null';
  let c = null;
  try {
    c = JSON.parse(lastCbJson);
  } catch (e) {}
  try {
    const p = JSON.parse(d.pose || 'null');
    if (p && p.id && !(act && act.id === p.id)) ract = p;
  } catch (e) {}
  if (!c && cb && cb.owner === HU) return;
  cb = c;
  renderCombat();
  render();
}
function cbWho() {
  if (!PVP() || !cb) return null;
  const A = base(cb.att),
    T = cb.tgt ? base(cb.tgt) : null;
  return { A: !!A && A.side === HU, T: !!T && T.side === HU, O: cb.owner === HU };
}
function cbGate() {
  const w = cbWho();
  if (!w) {
    $('cb-close').hidden = false;
    return;
  }
  const body = $('cb-body');
  const whoSide = {
    A: cb.att && base(cb.att) ? base(cb.att).side : other(HU),
    T: cb.tgt && base(cb.tgt) ? base(cb.tgt).side : other(HU),
    O: other(HU)
  };
  body.querySelectorAll('[data-who]').forEach(e => {
    if (w[e.dataset.who]) return;
    e.disabled = true;
    if (e.tagName === 'BUTTON') {
      e.hidden = true;
      if (!e.parentNode.querySelector('.waitp')) {
        const p = ptext(
          e.dataset.who === 'O'
            ? 'Waiting for ' + N(whoSide.O) + ' to record the result.'
            : 'Waiting for ' + N(whoSide[e.dataset.who]) + ' to roll.'
        );
        p.classList.add('waitp');
        e.after(p);
      }
    }
  });
  $('cb-close').hidden = !w.O;
}
const RM = (() => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
})();
const sleep = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 120) : ms));
let sample = null,
  aiBusy = false,
  aiLog = null;
const ROCKS = [
  [61, 37],
  [10, 11]
];
function zonesOf() {
  return (state && state.zones) || scenOf().zones;
}
function N(side) {
  return (state && state.names && state.names[side]) || (side === 'cs' ? 'City States' : 'Nords');
}
function PN(side) {
  const v = state && state.players && state.players[side];
  return v ? String(v).slice(0, 24) : '';
}
function WHO(side) {
  const p = PN(side);
  return p ? p + ' (' + N(side) + ')' : N(side);
}
let pnDraft = {};
let lobby = {},
  presLast = 0;
function presencePing(force) {
  if (!db || !myId || !state) return;
  const inMp = state.mode === 'pvp' || mmCurrent() === 'multi';
  if (!inMp) return;
  const now = Date.now();
  if (!force && now - presLast < 8000) return;
  presLast = now;
  const me = { n: savedName() || '', t: now, seat: seatSide() || null };
  const d = db.doc('game/lobby'),
    full = () => {
      try {
        d.set(Object.assign({}, lobby, { [myId]: me })).catch(() => {});
      } catch (e) {}
    };
  try {
    if (typeof d.update === 'function') d.update({ [myId]: me }).catch(full);
    else full();
  } catch (e) {
    full();
  }
}
function lobbyPeople() {
  const now = Date.now(),
    seats = (state && state.seats) || {},
    out = [];
  Object.entries(lobby || {}).forEach(([id, v]) => {
    if (!v || typeof v !== 'object') return;
    const seat = seats.cs === id ? 'cs' : seats.nord === id ? 'nord' : null;
    out.push({
      id,
      left: !!v.left,
      name: v.n || (seat && PN(seat)) || '',
      seat,
      online: now - (+v.t || 0) < 25000,
      me: id === myId
    });
  });
  ['cs', 'nord'].forEach(sd => {
    const id = seats[sd];
    if (id && !out.some(p => p.id === id))
      out.push({ id, name: PN(sd) || '', seat: sd, online: false, me: id === myId });
  });
  return out.sort(
    (a, b) =>
      (a.seat ? 0 : 1) - (b.seat ? 0 : 1) ||
      (a.seat || '').localeCompare(b.seat || '') ||
      String(a.name).localeCompare(String(b.name))
  );
}
function lobbyBox() {
  const box = bEl('div', { className: 'mm-net mm-ppl' });
  box.append(bEl('h3', { textContent: 'In the lobby' }));
  const L = lobbyPeople().filter(p => p.online || p.seat);
  if (!L.length) box.append(bEl('p', { className: 'hint', textContent: 'Nobody else is here yet.' }));
  L.forEach(p => {
    const r = bEl('div', { className: 'mm-pp' });
    r.append(
      bEl('span', {
        className: 'nb-dot ' + (p.online ? 'on' : 'off'),
        title: p.online ? 'Connected' : 'Not connected'
      }),
      bEl('strong', { textContent: (p.name || 'Unnamed player') + (p.me ? ' (you)' : '') }),
      bEl('span', {
        className: 'ab-note',
        textContent: p.seat
          ? (p.seat === 'cs' ? 'South edge' : 'North edge') +
            ' · ' +
            colName(p.seat) +
            ((state.setup || {})[p.seat] ? ' · army ready' : '')
          : 'watching'
      }),
      bEl('span', {
        className: 'ab-note',
        textContent: p.online ? 'connected' : p.left ? 'left' : 'not connected'
      })
    );
    box.append(r);
  });
  box.append(
    bEl('p', {
      className: 'hint',
      textContent: 'Anyone else who opens the invite link can watch the game without taking a seat.'
    })
  );
  return box;
}
/* the opponent's connection, shown during an online game */
function renderPresence() {
  const el0 = $('pres');
  if (!el0) return;
  if (!state || !PVP() || !seatSide() || mmCurrent()) {
    el0.hidden = true;
    return;
  }
  const opp = seatSide() === 'cs' ? 'nord' : 'cs',
    id = (state.seats || {})[opp];
  const v = id && lobby[id];
  const on = !!(v && Date.now() - (+v.t || 0) < 25000);
  const watch = lobbyPeople().filter(p => !p.seat && p.online).length;
  el0.hidden = false;
  el0.innerHTML = '';
  el0.append(
    bEl('span', { className: 'nb-dot ' + (on ? 'on' : 'off') }),
    document.createTextNode(
      (PN(opp) || 'Opponent') +
        (id ? (on ? ' connected' : v && v.left ? ' has left' : ' not connected') : ' — seat open') +
        (watch ? ' · ' + watch + ' watching' : '')
    )
  );
}
function savedName() {
  try {
    return localStorage.getItem('conquest-player-name') || '';
  } catch (e) {
    return '';
  }
}
function nameInput(side, label, editable) {
  const w = bEl('label', { className: 'pn-in' });
  w.append(bEl('span', { className: 'tf-l', textContent: label }));
  const i = bEl('input', {
    type: 'text',
    id: 'pn-' + side,
    maxLength: 24,
    value: pnDraft[side] != null ? pnDraft[side] : PN(side),
    placeholder: editable ? 'Type a name' : 'No name yet'
  });
  i.disabled = !editable;
  i.setAttribute('autocomplete', 'nickname');
  const commit = () => {
    const v = i.value.trim().slice(0, 24);
    delete pnDraft[side];
    if (v === PN(side)) return;
    try {
      localStorage.setItem('conquest-player-name', v);
    } catch (e) {}
    if (PVP())
      db.doc('game/state')
        .update({ players: { [side]: v }, updatedAt: Date.now() })
        .catch(() => toast('The name could not be saved.'));
    else putState({ players: Object.assign({}, state.players || {}, { [side]: v }) });
  };
  i.oninput = () => {
    pnDraft[side] = i.value;
  };
  i.onchange = commit;
  i.onkeydown = e => {
    if (e.key === 'Enter') i.blur();
  };
  w.append(i);
  return w;
}
function logAI(t) {
  if (aiLog && t) aiLog.push(t);
}
async function putState(patch) {
  const next = Object.assign({}, state, patch, { updatedAt: Date.now() });
  await db.doc('game/state').set(sanitize(next));
  state = next;
  render();
}
function drawUnitsFast() {
  const ug = $('units');
  ug.innerHTML = '';
  all()
    .filter(u => u.onTable)
    .forEach(u => drawUnit(u, ug));
}
function ease(k) {
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}
function animFrames(ms, fn) {
  if (RM || ms <= 0) {
    fn(1);
    return Promise.resolve();
  }
  const t0 = performance.now();
  return new Promise(res => {
    function st(now) {
      const k = Math.min(1, (now - t0) / ms);
      fn(ease(k));
      drawUnitsFast();
      if (k < 1) requestAnimationFrame(st);
      else res();
    }
    requestAnimationFrame(st);
  });
}
async function tweenPose(to, ms) {
  const fr = { x: act.pose.x, y: act.pose.y, facing: act.pose.facing || 0 },
    tf = to.facing ?? fr.facing,
    df = ((((tf - fr.facing) % 360) + 540) % 360) - 180;
  await animFrames(ms, e => {
    act.pose.x = fr.x + (to.x - fr.x) * e;
    act.pose.y = fr.y + (to.y - fr.y) * e;
    act.pose.facing = (((fr.facing + df * e) % 360) + 360) % 360;
  });
  Object.assign(act.pose, { x: to.x, y: to.y, facing: tf });
  render();
}
async function tweenWheel(S0, u, dir, deg, ms) {
  await animFrames(ms, e => {
    const p = wheelPose(S0, u, dir, deg * e);
    act.pose.x = p.x;
    act.pose.y = p.y;
    act.pose.facing = p.facing;
  });
}
/* dice banner */
function banner(title, dice, text, cls) {
  const b = $('aibanner');
  b.hidden = false;
  $('aib-t').textContent = title;
  const d = $('aib-d');
  d.innerHTML = '';
  (dice || []).forEach(x => {
    const v = typeof x === 'object' ? x.v : x,
      c = typeof x === 'object' ? x.cls : '';
    d.appendChild(dieMini(v, c || ''));
  });
  $('aib-s').textContent = text || '';
}
function bannerHide() {
  $('aibanner').hidden = true;
}
function aiStatus(t) {
  $('ai-status').textContent = t || '';
}
