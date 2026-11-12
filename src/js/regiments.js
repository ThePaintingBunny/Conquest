/* Regiments on the table: stand layout, formations, casualty order and footprint geometry. */
/* ---------- game logic ---------- */
const PAL = {
  red: { name: 'Red', fill: '#9A3328', light: '#C9655A', edge: '#8E2F2F', ui: '#D0675B' },
  blue: { name: 'Blue', fill: '#2C5A8E', light: '#5E8BC0', edge: '#2F578E', ui: '#6E9BD3' },
  green: { name: 'Green', fill: '#2F6B3A', light: '#6E9E72', edge: '#2A5F34', ui: '#6FB57A' },
  purple: { name: 'Purple', fill: '#5B3A8C', light: '#8C70B8', edge: '#523480', ui: '#A58BD6' },
  gold: { name: 'Gold', fill: '#946414', light: '#C79A4A', edge: '#87590F', ui: '#D9A74A' },
  teal: { name: 'Teal', fill: '#1F6E73', light: '#5C9EA2', edge: '#1B6368', ui: '#5DB5BA' },
  orange: { name: 'Orange', fill: '#B0501A', light: '#D98A5A', edge: '#A04716', ui: '#E38A5B' },
  black: { name: 'Black', fill: '#2E3438', light: '#687176', edge: '#25292C', ui: '#9AA3A8' }
};
const COL = { cs: Object.assign({}, PAL.red), nord: Object.assign({}, PAL.blue) };
function colId(side) {
  const c = (state && state.colors) || {};
  const id = c[side] || (side === 'cs' ? 'red' : 'blue');
  return PAL[id] ? id : side === 'cs' ? 'red' : 'blue';
}
function colName(side) {
  return PAL[colId(side)].name.toLowerCase();
}
function applyColors() {
  ['cs', 'nord'].forEach(sd => Object.assign(COL[sd], PAL[colId(sd)]));
  let st = document.getElementById('side-colors');
  if (!st) {
    st = document.createElement('style');
    st.id = 'side-colors';
    document.head.appendChild(st);
  }
  const D = `--cs:${COL.cs.ui};--nord:${COL.nord.ui};`,
    L = document.documentElement.dataset.ui === 'steel' ? D : `--cs:${COL.cs.fill};--nord:${COL.nord.fill};`;
  const css = `:root,:root[data-ui]{${L}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${D}}}:root[data-theme="dark"]{${D}}`;
  if (st.textContent !== css) st.textContent = css;
  const et = $('edge-top'),
    eb = $('edge-bot');
  if (et) et.setAttribute('fill', (FLIP ? COL.cs : COL.nord).edge);
  if (eb) eb.setAttribute('fill', (FLIP ? COL.nord : COL.cs).edge);
  const ly = $('leg-you'),
    lt2 = $('leg-them');
  if (ly) ly.setAttribute('fill', COL[HU].fill);
  if (lt2) lt2.setAttribute('fill', COL[AI].fill);
}
async function setColor(side, id) {
  const c = Object.assign({ cs: colId('cs'), nord: colId('nord') }, state.colors || {});
  const o = side === 'cs' ? 'nord' : 'cs';
  if (c[o] === id) {
    toast('The other side already uses ' + PAL[id].name.toLowerCase() + '. Pick another colour.');
    return;
  }
  c[side] = id;
  await putState({ colors: c });
}
function colorPicker(side, label, editable) {
  const r = bEl('div', { className: 'col-pick' });
  r.setAttribute('role', 'group');
  r.setAttribute('aria-label', label);
  r.append(bEl('span', { className: 'tf-l', textContent: label }));
  const o = side === 'cs' ? 'nord' : 'cs',
    mine = colId(side),
    theirs = colId(o);
  Object.entries(PAL).forEach(([id, P]) => {
    const b = bEl('button', { type: 'button', className: 'col-sw' + (id === mine ? ' on' : '') });
    b.style.background = P.fill;
    b.title = P.name + (id === theirs ? ' (taken by the other side)' : '');
    b.setAttribute('aria-label', P.name + (id === theirs ? ', taken' : ''));
    b.setAttribute('aria-pressed', String(id === mine));
    b.disabled = !editable || id === theirs;
    if (id === theirs) b.classList.add('taken');
    b.onclick = () => {
      if (id !== mine) setColor(side, id);
    };
    r.append(b);
  });
  return r;
}
const ACT = {
  march: { n: 'March', d: 'Move up to M; sideways and back at half' },
  charge: { n: 'Charge', d: 'Roll D6 + M to reach a target' },
  reform: { n: 'Reform', d: 'Turn up to 180° and reshape' },
  volley: { n: 'Volley', d: 'Shoot with Barrage' },
  aim: { n: 'Take Aim', d: '+1 Volley this activation' },
  rally: { n: 'Rally', d: 'Remove Broken' },
  xclash: { n: 'Extra Clash', d: 'One more Clash (Raging Elements or Savage)' },
  node: { n: 'Detonate Catabolic Node', d: 'D6+4 Hits on every engaged enemy, D6 on itself' },
  flame: { n: 'Flamethrower', d: 'A Volley at the enemy touching its front' },
  xvolley: { n: 'Free Volley', d: 'A Volley that costs no action' },
  soar: { n: 'On Soaring Winds', d: 'March any way, through regiments and terrain' },
  sweep: { n: 'Sweeping Step', d: 'Two Marches through regiments, then a free Clash' },
  rooted: { n: 'Rooted Might', d: 'Seed Markers to friends within 8″' },
  duel: { n: 'Duel', d: 'Challenge an enemy character in contact' },
  xreform: { n: 'Free Reform', d: 'Out of sequence, after destroying a regiment' },
  assassin: { n: 'Clash with the Mimetic Assassin', d: 'Assassination Directive: once per game' },
  clash: { n: 'Clash', d: 'Fight the enemy in contact' },
  creform: { n: 'Combat Reform', d: 'Resolve test, then reshape' },
  inspire: { n: 'Inspire', d: '+1 Clash this activation' },
  cast: { n: 'Spellcasting', d: 'Cast one of its spells' },
  occupy: { n: 'Occupy building', d: 'Move into it; ends the activation' },
  leave: { n: 'Leave building', d: 'Takes both actions; ends the activation' },
  memory: { n: 'Memories of Old', d: 'Gain its Memory until the end of the round' },
  withdraw: { n: 'Withdraw', d: 'Resolve test, fall back' },
  crally: { n: 'Combat Rally', d: 'Remove Broken in combat' },
  fluid: { n: 'Free Reform', d: 'Fluid Formation, first or last' },
  hammer: { n: 'Free Reform', d: 'Hammer and Anvil, last action' },
  fadv: { n: 'Free March', d: 'Fire and Advance, forward or wheel only' },
  dtmarch: { n: 'Free March', d: 'Double Time, after two Marches' },
  trample: { n: 'Trample', d: 'End of activation: automatic Hits on the enemy in front' }
};
let state = null,
  db = null,
  selId = null,
  act = null,
  ruler = false,
  rA = null,
  rB = null,
  drag = null;
function regTot(u) {
  return Math.max(1, (u.stands || 1) - (u.char != null ? 1 : 0) - (u.aux != null && u.auxStats ? 1 : 0));
}
function auxDead(u) {
  return !!(u.aux != null && u.auxStats && (u.auxWounds || 0) >= (+u.auxStats.W || 4));
}
function modHas(u, re) {
  if (!u || !u.mods || !u.modProfiles) return false;
  const liveN = regTot(u) - lostOf(u);
  return u.mods.slice(0, liveN).some(t => ((u.modProfiles[t] || {}).rules || []).some(r => re.test(r)));
}
function sW(u, i) {
  if (u.mods && u.modProfiles) {
    const pr = u.modProfiles[u.mods[i]];
    if (pr) return +pr.W || 4;
  }
  return +(u.stats && u.stats.W) || 4;
}
function woundState(u, wounds) {
  const rt = regTot(u);
  let w = wounds == null ? u.wounds || 0 : wounds,
    l = 0;
  if (!u.mods) {
    const W = sW(u, 0);
    l = Math.min(rt, Math.floor(w / W));
    return { lost: l, rem: l >= rt ? 0 : w - l * W, max: rt * W };
  }
  let max = 0;
  for (let i = 0; i < rt; i++) max += sW(u, i);
  for (const i of removalSeq(u)) {
    const W = sW(u, i);
    if (w >= W) {
      w -= W;
      l++;
    } else break;
  }
  return { lost: l, rem: l >= rt ? 0 : w, max };
}
/* stand order: tokens r0 (command stand), r1.. (other regiment stands), a (auxiliary), c (character) */
function removalSeq(u) {
  const rt = regTot(u),
    out = [];
  if (Array.isArray(u.order)) {
    u.order
      .slice()
      .reverse()
      .forEach(t => {
        if (/^r\d+$/.test(t) && t !== 'r0') {
          const i = +t.slice(1);
          if (i < rt && !out.includes(i)) out.push(i);
        }
      });
  }
  if (!Array.isArray(u.order)) {
    const FS = u.slotBase && u.slotFiles ? { slots: u.slotBase, files: u.slotFiles } : fullSlots(u),
      F = Math.max(1, FS.files || u.files || 1),
      rk = [];
    for (let k = 0; k < FS.slots.length; k += F) rk.push(FS.slots.slice(k, k + F));
    /* rear rank first; within a rank work in from the ends so the survivors stay side by side */
    const ok = t => t && /^r\d+$/.test(t) && t !== 'r0' && +t.slice(1) < rt;
    /* core rules: rearmost rank first; in it, the stand furthest from the Command Stand, alternating ends, the centre-most last */
    const cmdCol = Math.max(0, FS.slots.indexOf('r0')) % F;
    let last = 0;
    rk.reverse().forEach(row => {
      let cand = row.map((t, c) => ({ t, c })).filter(o => ok(o.t));
      while (cand.length) {
        const md = Math.max(...cand.map(o => Math.abs(o.c - cmdCol))),
          tied = cand.filter(o => Math.abs(o.c - cmdCol) === md);
        const pick =
          tied.length > 1
            ? tied.find(o => Math.sign(o.c - cmdCol) === -last) || tied[tied.length - 1]
            : tied[0];
        last = Math.sign(pick.c - cmdCol) || last;
        cand = cand.filter(o => o !== pick);
        const i = +pick.t.slice(1);
        if (!out.includes(i)) out.push(i);
      }
    });
  }
  for (let i = rt - 1; i >= 1; i--) if (!out.includes(i)) out.unshift(i);
  out.push(0);
  return out;
}
/* full-strength positions of every stand (command stand centre front, then the character, then the auxiliary) */
function fullSlots(u) {
  const rt = regTot(u),
    all = [];
  for (let i = 0; i < rt; i++) all.push('r' + i);
  if (u.aux != null && u.auxStats) all.push('a');
  if (u.char != null) all.push('c');
  const N0 = all.length,
    fF = Math.max(1, Math.min(u.files || 1, N0));
  const SP = specials(Object.assign({}, u, { auxWounds: 0 }), fF),
    full = new Array(N0).fill(null);
  const put = (k, t) => {
    if (k != null && k < N0 && full[k] == null && all.includes(t)) full[k] = t;
  };
  put(SP.cmd, 'r0');
  put(SP.aux, 'a');
  put(SP.ch, 'c');
  const rest = all.filter(t => !full.includes(t));
  for (let k = 0; k < N0; k++) if (full[k] == null) full[k] = rest.shift();
  return { files: fF, slots: full };
}
function layout(u) {
  if (riderOn(u)) {
    /* Rider: the character is on the Monster's stand and measures from it */ const v = Object.assign({}, u, {
      char: null,
      rider: false,
      stands: Math.max(1, (u.stands || 2) - 1)
    });
    const L = layout(v),
      m = L.find(x => x.cmd) || L[0];
    return L.concat([
      { pos: m ? m.pos : 0, tok: 'c', kind: 'char', cmd: false, ri: null, mod: null, rider: true }
    ]);
  }
  const G = geom(u),
    n = live(u),
    rt = regTot(u),
    lost = lostOf(u),
    rs = removalSeq(u),
    dead = new Set(rs.slice(0, lost).map(i => 'r' + i));
  const alive = [];
  for (let i = 0; i < rt; i++) if (!dead.has('r' + i)) alive.push('r' + i);
  if (u.aux != null && u.auxStats && !auxDead(u)) alive.push('a');
  if (u.char != null) alive.push('c');
  let seq;
  if (Array.isArray(u.order)) {
    seq = u.order.filter(t => alive.includes(t));
    alive.forEach(t => {
      if (!seq.includes(t)) seq.push(t);
    });
    const sp = t => t === 'r0' || t === 'c' || t === 'a';
    for (let k = G.files; k < seq.length; k++)
      if (sp(seq[k])) {
        let j = Math.min(G.files, seq.length) - 1;
        while (j >= 0 && sp(seq[j])) j--;
        if (j >= 0) {
          [seq[j], seq[k]] = [seq[k], seq[j]];
        }
      }
  } else {
    const FS = u.slotBase && u.slotFiles ? { files: u.slotFiles, slots: u.slotBase } : fullSlots(u);
    if (G.files === FS.files || (G.files < FS.files && G.ranks === 1)) {
      /* every stand keeps its place; casualties leave the rear. If a character (or the command stand) is lost, the rear-most stand steps into its place */
      const slots = FS.slots.map(t => (t && alive.includes(t) ? t : null));
      alive.forEach(t => {
        if (!slots.includes(t)) slots.push(t);
      });
      for (let k = 0; k < slots.length; k++) {
        if (slots[k]) continue;
        let last = -1;
        for (let m = slots.length - 1; m > k; m--)
          if (slots[m]) {
            last = m;
            break;
          }
        if (last < 0) break;
        if (Math.floor(last / FS.files) > Math.floor(k / FS.files)) {
          slots[k] = slots[last];
          slots[last] = null;
        }
      }
      const out = [];
      slots.forEach((t, k) => {
        if (t) out.push({ pos: k, tok: t });
      });
      if (G.files < FS.files && out.length === alive.length && out.every(o => o.pos < FS.files)) {
        out.sort((a, b) => a.pos - b.pos).forEach((o, i) => (o.pos = i));
      }
      if (
        out.length === alive.length &&
        Math.max(...out.map(o => o.pos)) < Math.ceil(n / FS.files) * FS.files
      )
        return out.map(o => ({
          pos: o.pos,
          tok: o.tok,
          kind: o.tok === 'a' ? 'aux' : o.tok === 'c' ? 'char' : 'reg',
          cmd: o.tok === 'r0',
          ri: o.tok[0] === 'r' ? +o.tok.slice(1) : null,
          mod: u.mods && o.tok[0] === 'r' ? u.mods[+o.tok.slice(1)] : null
        }));
    }
    const SP = specials(u, G.files);
    seq = new Array(n).fill(null);
    const put = (k, t) => {
      if (k != null && k < n && seq[k] == null && alive.includes(t)) seq[k] = t;
    };
    put(SP.cmd, 'r0');
    put(SP.aux, 'a');
    put(SP.ch, 'c');
    const rest = alive.filter(t => !seq.includes(t));
    for (let k = 0; k < n; k++) if (seq[k] == null) seq[k] = rest.shift();
    seq = seq.filter(Boolean);
  }
  return seq
    .slice(0, n)
    .map((t, k) => ({
      pos: k,
      tok: t,
      kind: t === 'a' ? 'aux' : t === 'c' ? 'char' : 'reg',
      cmd: t === 'r0',
      ri: t[0] === 'r' ? +t.slice(1) : null,
      mod: u.mods && t[0] === 'r' ? u.mods[+t.slice(1)] : null
    }));
}
const MODSTYLE = {
  'Oni Ayakashi': ['ON', '#C8553D'],
  'Kami Ayakashi': ['KA', '#6B9E5A'],
  'Tengu Bushi': ['TB', '#5B8FC7'],
  'Tengu Ayakashi': ['TA', '#8C6BB1'],
  'Kappa Bushi': ['KB', '#3E9C95'],
  'Origami Warriors': ['OR', '#E9E2CF']
};
function auxStyle(u) {
  return /sacred band/i.test(u.auxName || '')
    ? { key: 'sb', fill: '#2E3B55', label: 'Sacred Band' }
    : { key: 'mino', fill: '#3B1A14', label: 'Minotaur' };
}
function lostOf(u) {
  return Math.max(0, woundState(u).lost);
}
function live(u) {
  return Math.max(1, (u.stands || 1) - lostOf(u) - (auxDead(u) ? 1 : 0));
}
/* front-rank slots: the Command Stand in the centre, then the Character as close to the centre as possible, then the Auxiliary */
function specials(u, files) {
  const used = new Set(),
    mid = (files - 1) / 2,
    order = Array.from({ length: files }, (_, c) => c).sort(
      (a, b) => Math.abs(a - mid) - Math.abs(b - mid) || b - a
    );
  const pick = on => {
    if (!on) return null;
    for (const c of order)
      if (!used.has(c)) {
        used.add(c);
        return c;
      }
    return null;
  };
  const cmd = pick(true),
    ch = pick(u.char != null),
    aux = pick(u.aux != null && !auxDead(u));
  return { cmd, aux, ch };
}
function allocate(T, tot) {
  if (T.mods) {
    const mx = woundState(T).max,
      w = Math.min(mx, (T.wounds || 0) + tot);
    return { w, aw: T.auxWounds || 0, dead: w >= mx };
  }
  const W = +(T.stats && T.stats.W) || 4,
    hasAux = T.aux != null && !!T.auxStats,
    aW = hasAux ? +T.auxStats.W || W : 0,
    rt = regTot(T);
  let w = T.wounds || 0,
    aw = T.auxWounds || 0,
    left = tot,
    t;
  t = Math.min(left, Math.max(0, Math.max(0, rt - 1) * W - w));
  w += t;
  left -= t;
  if (hasAux) {
    t = Math.min(left, Math.max(0, aW - aw));
    aw += t;
    left -= t;
  }
  t = Math.min(left, Math.max(0, rt * W - w));
  w += t;
  left -= t;
  return { w, aw, dead: w >= rt * W && (!hasAux || aw >= aW) };
}
function riderOn(u) {
  return !!(u && u.rider && u.char != null);
}
function geom(u) {
  const LS = Math.max(1, live(u) - (riderOn(u) ? 1 : 0)),
    files = Math.max(1, Math.min(u.files || 1, LS)),
    ranks = Math.ceil(LS / files),
    sw = u.sw || 2,
    sd = u.sd || 2;
  return { files, ranks, w: files * sw, d: ranks * sd, sw, sd };
}
function view(u) {
  if (act && act.id === u.id) return Object.assign({}, u, act.pose);
  if (act && act.tgtPose && act.tgtPose.id === u.id) return Object.assign({}, u, act.tgtPose.pose);
  if (ract && ract.id === u.id && ract.pose) return Object.assign({}, u, ract.pose);
  return u;
}
function all() {
  return (state?.units || []).map(view);
}
function byId(id) {
  return all().find(u => u.id === id);
}
function base(id) {
  return (state?.units || []).find(u => u.id === id);
}
function corners(u) {
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    rt = [Math.cos(a), -Math.sin(a)];
  return [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1]
  ].map(([i, j]) => [
    u.x + ((f[0] * G.d) / 2) * i + ((rt[0] * G.w) / 2) * j,
    u.y + ((f[1] * G.d) / 2) * i + ((rt[1] * G.w) / 2) * j
  ]);
}
function segDist(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = dx * dx + dy * dy;
  let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function inside(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function polyDist(A, B) {
  if (A.some(p => inside(p, B)) || B.some(p => inside(p, A))) return 0;
  let m = 1e9;
  for (const P of [
    [A, B],
    [B, A]
  ])
    for (const p of P[0]) for (let i = 0; i < 4; i++) m = Math.min(m, segDist(p, P[1][i], P[1][(i + 1) % 4]));
  return m;
}
function engaged(u) {
  if (!u.onTable) return [];
  const A = corners(u);
  return all().filter(o => o.onTable && o.side !== u.side && polyDist(A, corners(o)) <= 0.3);
}
function overlapsAny(u) {
  const A = corners(u);
  return all().some(o => o.onTable && o.id !== u.id && polyDist(A, corners(o)) <= 0.01);
}
function hasRule(u, re) {
  return (u.rules || []).concat(fx(u)).some(x => re.test(x));
}
function moveCost(p, st, u) {
  if (act && act.cur && act.cur.soar) {
    const dx0 = p.x - st.x,
      dy0 = p.y - st.y,
      wh =
        ((Math.abs((((((p.facing || 0) - (st.facing || 0)) % 360) + 540) % 360) - 180) * Math.PI) / 180) *
        geom(u).w;
    const d = Math.hypot(dx0, dy0);
    return { fwd: d, side: 0, wheel: wh, cost: d + wh };
  }
  const dx = p.x - st.x,
    dy = p.y - st.y,
    a = ((st.facing || 0) * Math.PI) / 180,
    fx = Math.sin(a),
    fy = Math.cos(a);
  const fwd = dx * fx + dy * fy,
    side = Math.abs(dx * fy - dy * fx);
  const wheel =
    ((Math.abs((((((p.facing || 0) - (st.facing || 0)) % 360) + 540) % 360) - 180) * Math.PI) / 180) *
    geom(u).w;
  return { fwd, side, wheel, cost: Math.max(0, fwd) + (fwd < 0 ? -2 * fwd : 0) + 2 * side + wheel };
}
function budget() {
  if (!act || !act.cur) return 0;
  return act.cur.budget;
}
function wheelPose(p, u, dir, deg) {
  const G = geom(Object.assign({}, u, p)),
    a = ((p.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    s = dir === 'right' ? 1 : -1;
  const P = [
      p.x + (f[0] * G.d) / 2 + ((r[0] * G.w) / 2) * s,
      p.y + (f[1] * G.d) / 2 + ((r[1] * G.w) / 2) * s
    ],
    th = (s * deg * Math.PI) / 180,
    vx = p.x - P[0],
    vy = p.y - P[1];
  return Object.assign({}, p, {
    x: P[0] + vx * Math.cos(th) + vy * Math.sin(th),
    y: P[1] - vx * Math.sin(th) + vy * Math.cos(th),
    facing: ((((p.facing || 0) + s * deg) % 360) + 360) % 360
  });
}
function marchUsedCommitted(c) {
  return (c.segs || []).reduce((a, s) => a + s.cost, 0);
}
function marchUsed(c) {
  return marchUsedCommitted(c) + (c.pending ? c.pending.cost : 0);
}
function marchPose(mode, amt) {
  const c = act.cur,
    u = base(act.id),
    S0 = c.segStart,
    G = geom(Object.assign({}, u, S0)),
    a = ((S0.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    rem = c.budget - marchUsedCommitted(c);
  let np, cost;
  if (mode === 'fwd') {
    cost = amt;
    np = { x: S0.x + f[0] * amt, y: S0.y + f[1] * amt };
  } else if (mode === 'back') {
    cost = 2 * amt;
    np = { x: S0.x - f[0] * amt, y: S0.y - f[1] * amt };
  } else if (mode === 'sright' || mode === 'sleft') {
    const sg = mode === 'sright' ? 1 : -1;
    cost = 2 * amt;
    np = { x: S0.x + r[0] * amt * sg, y: S0.y + r[1] * amt * sg };
  } else {
    cost = (G.w * amt * Math.PI) / 180;
    np = wheelPose(S0, u, mode === 'wright' ? 'right' : 'left', amt);
  }
  return { np, cost, rem, S0 };
}
