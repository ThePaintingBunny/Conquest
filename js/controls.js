/* Settings, the dice-roll animation, combat/reform helpers and starting an action. */
/* ---------- settings and the dice-roll animation ---------- */
let lastRollAt = -1e9;
const SET = (() => {
  const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let v = {};
  try {
    v = JSON.parse(localStorage.getItem('conquest-settings') || '{}') || {};
  } catch (e) {}
  return Object.assign({ diceAnim: !rm, diceSpeed: 'normal' }, v);
})();
function saveSet() {
  try {
    localStorage.setItem('conquest-settings', JSON.stringify(SET));
  } catch (e) {}
}
const DSPEED = { fast: 700, normal: 1300, slow: 2000 };
let rollingN = 0;
function animateDie(d, v, cls) {
  const now = performance.now(),
    dur = DSPEED[SET.diceSpeed] || 850,
    end = lastRollAt + dur + Math.random() * dur * 0.35,
    left = end - now;
  if (left <= 60) {
    return false;
  }
  d.classList.add('rolling');
  d.style.setProperty('--rd', (left / 1000).toFixed(2) + 's');
  d.style.setProperty('--rx', (Math.random() * 18 - 9).toFixed(1) + 'px');
  rollingN++;
  document.body.classList.add('dice-rolling');
  const face = f => {
    [...d.children].forEach((p, i) => (p.className = PIPS[f] && PIPS[f].includes(i) ? 'on' : ''));
  };
  let f = 1 + Math.floor(Math.random() * 6);
  face(f);
  const iv = setInterval(() => {
    f = 1 + ((f + Math.floor(Math.random() * 4)) % 6);
    face(f);
  }, 70);
  setTimeout(() => {
    clearInterval(iv);
    face(v);
    d.classList.remove('rolling');
    if (cls)
      cls
        .split(' ')
        .filter(Boolean)
        .forEach(c => d.classList.add(c));
    d.classList.add('landed');
    rollingN = Math.max(0, rollingN - 1);
    if (!rollingN) document.body.classList.remove('dice-rolling');
  }, left);
  return true;
}
function openSettings() {
  let dg = $('set-dlg');
  if (!dg) {
    dg = document.createElement('dialog');
    dg.id = 'set-dlg';
    dg.className = 'en-dlg set-dlg';
    dg.setAttribute('aria-labelledby', 'set-h');
    document.body.appendChild(dg);
    dg.addEventListener('click', e => {
      if (e.target === dg) dg.close();
    });
  }
  dg.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'en-head';
  const h = document.createElement('h2');
  h.id = 'set-h';
  h.textContent = 'Settings';
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'btn ghost';
  x.textContent = 'Close';
  x.onclick = () => dg.close();
  head.append(h, x);
  dg.appendChild(head);
  const body = document.createElement('div');
  body.className = 'set-body';
  const row = (label, hint, ctl) => {
    const r = document.createElement('div');
    r.className = 'set-row';
    const t = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = label;
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = hint;
    t.append(b, p);
    r.append(t, ctl);
    body.appendChild(r);
  };
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'set-sw';
  sw.setAttribute('role', 'switch');
  const upd = () => {
    sw.setAttribute('aria-checked', String(!!SET.diceAnim));
    sw.textContent = SET.diceAnim ? 'On' : 'Off';
  };
  upd();
  sw.onclick = () => {
    SET.diceAnim = !SET.diceAnim;
    saveSet();
    upd();
    sp.querySelectorAll('button').forEach(b => (b.disabled = !SET.diceAnim));
  };
  row('Dice roll animation', 'Dice tumble before showing their result. Turn it off for instant results.', sw);
  const sp = document.createElement('div');
  sp.className = 'grp';
  sp.setAttribute('role', 'group');
  sp.setAttribute('aria-label', 'Animation speed');
  [
    ['fast', 'Fast'],
    ['normal', 'Normal'],
    ['slow', 'Slow']
  ].forEach(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String(SET.diceSpeed === k));
    b.disabled = !SET.diceAnim;
    b.onclick = () => {
      SET.diceSpeed = k;
      saveSet();
      sp.querySelectorAll('button').forEach(q => q.setAttribute('aria-pressed', String(q === b)));
    };
    sp.appendChild(b);
  });
  row('Animation speed', 'How long the dice tumble.', sp);
  const tr = document.createElement('button');
  tr.type = 'button';
  tr.className = 'btn ghost';
  tr.textContent = 'Roll test dice';
  tr.onclick = () => {
    const box = dg.querySelector('.set-test');
    box.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const v = d6();
      box.appendChild(dieMini(v, v <= 3 ? 'hit' : 'miss'));
    }
  };
  const tb = document.createElement('div');
  tb.className = 'row';
  const tbox = document.createElement('div');
  tbox.className = 'drow set-test';
  tb.append(tr, tbox);
  row('Try it', 'Roll four dice with the current settings.', tb);
  dg.appendChild(body);
  dg.showModal();
}

function crPrim(c) {
  return (c.foes || []).map(byId).filter(x => x && x.onTable)[0];
}
function crAnchor(c, files) {
  const u = byId(act.id),
    e = crPrim(c),
    G0 = geom(u),
    G = geom(Object.assign({}, u, { files })),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  if (!e) return { x: u.x, y: u.y };
  const arc = arcOf(u, [e.x, e.y]);
  let v = [0, 0];
  if (arc === 'front') v = [(f[0] * (G0.d - G.d)) / 2, (f[1] * (G0.d - G.d)) / 2];
  else if (arc === 'rear') v = [(-f[0] * (G0.d - G.d)) / 2, (-f[1] * (G0.d - G.d)) / 2];
  else {
    const sg = arc === 'right' ? 1 : -1;
    v = [(r[0] * sg * (G0.w - G.w)) / 2, (r[1] * sg * (G0.w - G.w)) / 2];
  }
  return { x: u.x + v[0], y: u.y + v[1] };
}
function crFace() {
  const c = act.cur,
    u = byId(act.id),
    e = crPrim(c);
  if (!e) return;
  const side = c.foeArc[e.id],
    ea = ((e.facing || 0) * Math.PI) / 180,
    fE = [Math.sin(ea), Math.cos(ea)],
    rE = [Math.cos(ea), -Math.sin(ea)],
    GE = geom(e);
  const n =
      side === 'front' ? fE : side === 'rear' ? [-fE[0], -fE[1]] : side === 'right' ? rE : [-rE[0], -rE[1]],
    half = side === 'front' || side === 'rear' ? GE.d / 2 : GE.w / 2,
    along = side === 'front' || side === 'rear' ? rE : fE,
    alongHalf = side === 'front' || side === 'rear' ? GE.w / 2 : GE.d / 2;
  const mid = [e.x + n[0] * half, e.y + n[1] * half];
  let t = (u.x - mid[0]) * along[0] + (u.y - mid[1]) * along[1];
  t = Math.max(-alongHalf, Math.min(alongHalf, t));
  const G = geom(u),
    fac = ((((Math.atan2(-n[0], -n[1]) * 180) / Math.PI) % 360) + 360) % 360;
  Object.assign(act.pose, {
    facing: Math.round(fac * 100) / 100,
    x: mid[0] + along[0] * t + (n[0] * G.d) / 2,
    y: mid[1] + along[1] * t + (n[1] * G.d) / 2
  });
  render();
}
function crContact(c) {
  const u = byId(act.id),
    foes = (c.foes || [])
      .map(byId)
      .filter(x => x && x.onTable)
      .map(corners);
  return standsOf(u).filter(st => foes.some(q => polyDist(st.poly, q) <= 0.35)).length;
}
function crStart(u, st) {
  const eng = engaged(u),
    Rs = [u.stats && u.stats.R, u.charName && chStatsX(u).R, u.auxStats && u.auxStats.R]
      .map(Number)
      .filter(n => n > 0),
    R = Rs.length ? Math.max(...Rs) : null,
    roll = d6(),
    clean = R == null || roll <= R;
  const prim = eng
    .map(e => ({ e, n: standsOf(u).filter(s => polyDist(s.poly, corners(e)) <= 0.35).length }))
    .sort((a, b) => b.n - a.n)[0];
  const foes = prim ? [prim.e.id].concat(eng.filter(e => e.id !== prim.e.id).map(e => e.id)) : [],
    foeArc = {};
  eng.forEach(e => {
    foeArc[e.id] = arcOf(e, [u.x, u.y]);
  });
  const c = {
    type: 'creform',
    start: st,
    budget: 0,
    moving: false,
    reshape: true,
    roll,
    R,
    clean,
    foes,
    foeArc
  };
  act.cur = c;
  c.contact0 = crContact(c);
  const nC = c.contact0;
  if (!clean && nC > 0) {
    render();
    openCombat({ type: 'freform', att: u.id, tgt: u.id, inAct: false, resumeAct: false, preWounds: nC });
    toast(
      `Fighting Reform: rolled ${roll} against Resolve ${R}. ${nC} wound${nC > 1 ? 's' : ''}, one per stand in contact. Roll Morale, record it, then reshape.`
    );
    return;
  }
  render();
  toast(
    R == null
      ? 'No Resolve value: Clean Reform.'
      : `Rolled ${roll} against Resolve ${R}: Clean Reform. Reshape now.`
  );
}
function wdStart(u, st) {
  const eng = engaged(u),
    Rs = [u.stats && u.stats.R, u.charName && chStatsX(u).R, u.auxStats && u.auxStats.R]
      .map(Number)
      .filter(n => n > 0),
    R = Rs.length ? Math.max(...Rs) : 0,
    roll = d6(),
    clean = roll <= R,
    wd = d6();
  const foes = eng.map(e => corners(e)),
    nC = standsOf(u).filter(s => foes.some(q => polyDist(s.poly, q) <= 0.35)).length,
    wounds = clean ? wd : wd * nC;
  act.cur = {
    type: 'withdraw',
    stage: 'test',
    start: st,
    budget: 0,
    moving: false,
    reshape: false,
    roll,
    R,
    clean,
    wd,
    nC,
    wounds,
    foes: eng.map(e => e.id)
  };
  render();
  const txt = clean
    ? `Clean Withdrawal: rolled ${roll} against Resolve ${R}. Even a clean withdrawal costs D6 wounds: rolled ${wd}, so ${wounds} wound${wounds === 1 ? '' : 's'}, with no Morale Tests. Record them, then the regiment turns away and Marches.`
    : `Fighting Withdrawal: rolled ${roll} against Resolve ${R}. One D6 rolled ${wd}, applied to each of the ${nC} stand${nC === 1 ? '' : 's'} in contact: ${wounds} wound${wounds === 1 ? '' : 's'}. Test Morale for them, record, then the regiment turns away and Marches.`;
  if (wounds > 0) {
    openCombat({
      type: 'freform',
      att: u.id,
      tgt: u.id,
      inAct: false,
      resumeAct: false,
      preWounds: wounds,
      noMorale: clean,
      selfTitle: (clean ? 'Clean' : 'Fighting') + ' Withdrawal: ' + (u.short || u.name),
      selfText: txt
    });
    toast(txt);
  } else wdTurn();
}
function wdTurn() {
  const c = act.cur,
    u = byId(act.id);
  if (!u || !u.onTable || u.destroyed) {
    act.cur = null;
    render();
    return;
  }
  const foes = (c.foes || []).map(byId).filter(e => e && e.onTable);
  let vx = 0,
    vy = 0;
  foes.forEach(e => {
    vx += u.x - e.x;
    vy += u.y - e.y;
  });
  let fac = u.facing || 0;
  if (foes.length) {
    const raw = (Math.atan2(vx, vy) * 180) / Math.PI;
    const a = u.facing || 0;
    const opts = [0, 90, 180, 270].map(k => (a + k) % 360);
    const diff = o => Math.abs(((((o - raw) % 360) + 540) % 360) - 180);
    fac = opts.sort((x, y) => diff(x) - diff(y))[0];
  }
  c.origin = Object.assign({}, c.start);
  Object.assign(act.pose, { facing: fac });
  const st = { x: u.x, y: u.y, facing: fac, files: geom(u).files };
  Object.assign(c, {
    stage: 'march',
    start: st,
    budget: u.m || 0,
    moving: true,
    segs: [],
    segStart: Object.assign({}, st),
    mode: 'fwd',
    pending: null,
    withdraw: true
  });
  render();
  toast(`The regiment turns to face away (${fac}°). March it now; it cannot end within 1″ of an enemy.`);
}
function wdFail() {
  const c = act.cur;
  if (!c || c.type !== 'withdraw') return;
  Object.assign(act.pose, { x: c.origin.x, y: c.origin.y, facing: c.origin.facing, files: c.origin.files });
  c.failed = true;
  c.start = Object.assign({}, c.origin);
  finishAction();
}
function startAction(type) {
  if (act && !act.cur && srStartAction(type)) return;
  if (type === 'cast' && act && !act.cur) {
    const u0 = byId(act.id),
      RC = regCaster(u0) || {};
    act.cur = {
      type: 'cast',
      moving: false,
      reshape: false,
      free: !!(RC.free || act.freeCast || (RC.extra && !act.actions.some(a => a.type === 'cast' && a.free))),
      spell: 0,
      target: null,
      rolls: null,
      cast: act.actions.filter(a => a.type === 'cast' && a.spell).map(a => a.spell),
      start: { x: u0.x, y: u0.y, facing: u0.facing || 0, files: geom(u0).files }
    };
    render();
    return;
  }
  const u = byId(act.id);
  const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
  if (type === 'fadv') {
    act.cur = {
      type: 'march',
      start: st,
      budget: u.m || 0,
      moving: true,
      reshape: false,
      free: true,
      noSide: true,
      fadv: true,
      segs: [],
      segStart: Object.assign({}, st),
      mode: 'fwd',
      pending: null
    };
    render();
    return;
  }
  if (type === 'dtmarch') {
    act.cur = {
      type: 'march',
      start: st,
      budget: u.m || 0,
      moving: true,
      reshape: false,
      free: true,
      dt: true,
      segs: [],
      segStart: Object.assign({}, st),
      mode: 'fwd',
      pending: null
    };
    render();
    return;
  }
  if (type === 'trample') {
    const foes = frontFoes(u),
      t = foes[0],
      n =
        trampleX(u) * live(u) -
        (u.char != null ? trampleX(u) : 0) +
        (u.char != null && rx(u.charRules, 'Trample') ? rx(u.charRules, 'Trample') : 0);
    act.actions.push({ type: 'trample', free: true, from: st, to: st, target: t.id, hits: n });
    render();
    openCombat({
      type: 'lethal',
      att: u.id,
      tgt: t.id,
      inAct: false,
      lethalHits: n,
      lethalX: trampleX(u),
      lethalLost: 0,
      selfTitle: 'Trample',
      selfText: `${u.short || u.name} tramples ${t.short || t.name}: ${n} automatic Hits. No Morale Tests.`
    });
    return;
  }
  const firstMarch = type === 'march' && act.entering && !act.actions.some(a => a.type === 'march');
  let b = 0,
    roll = null;
  const secondMarch = type === 'march' && act.actions.filter(a => a.type === 'march').length === 1;
  if (type === 'march')
    b =
      (u.m || 0) +
      srMarchMod(u) +
      (act.frFu && !act.actions.some(a => a.type === 'march') ? 2 : 0) +
      (!act.actions.some(a => a.type === 'march') ? srFirstMarch(u) : 0) +
      (firstMarch ? vgOf(u) : 0) +
      (secondMarch && u.bearer ? (hasRule(u, /^Forced March/) ? 2 : 1) : 0);
  if (type === 'charge') {
    act.cur = { type, stage: 'target', start: st, budget: 0, moving: false, reshape: false };
    render();
    toast('Click the enemy regiment you are charging.');
    return;
  }
  const moving = type === 'march' || type === 'charge';
  if (type === 'creform') {
    crStart(u, st);
    return;
  }
  if (type === 'withdraw') {
    wdStart(u, st);
    return;
  }
  const reshape = ['reform', 'fluid', 'hammer', 'creform'].includes(type);
  act.cur = { type, start: st, budget: b, roll, moving, reshape, firstMarch };
  if (type === 'march')
    Object.assign(act.cur, { segs: [], segStart: Object.assign({}, st), mode: 'fwd', pending: null });
  if (type === 'clash') {
    act.cur = { type, start: st, budget: 0, moving: false, reshape: false };
    if (nodeClashOffer(u)) {
      act.cur.stage = 'node';
      render();
      toast('Catabolic Node: detonate it before the Clash?');
      return;
    }
    clashOpen(u, true);
    render();
    return;
  }
  if (type === 'volley') {
    act.cur = { type, stage: 'target', start: st, budget: 0, moving: false, reshape: false };
    render();
    toast('Click the enemy regiment you are shooting at.');
    return;
  }
  if (!moving && !reshape) {
    finishAction();
    return;
  }
  render();
}
