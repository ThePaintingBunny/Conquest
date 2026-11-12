/* March actions: the typed March step, its preview ghost and the March limit. */
/* the typed March step, shown as a see-through regiment where it would end before you press Apply */
function marchGhost() {
  const ug = $('units');
  if (!ug) return;
  let g = $('mghost');
  if (!g) {
    g = el('g', { id: 'mghost', 'pointer-events': 'none' }, ug.parentNode);
  } else if (g.parentNode.lastChild !== g) g.parentNode.appendChild(g);
  g.innerHTML = '';
  const c = act && act.cur;
  if (!c || !c.segs || c.previewAmt == null || !(c.previewAmt > 0) || c.pending) return;
  let P;
  try {
    P = marchPose(c.mode, c.previewAmt);
  } catch (e) {
    return;
  }
  const u0 = base(act.id),
    gu = Object.assign({}, u0, act.pose, P.np),
    bad = P.cost > P.rem + 1e-6,
    near = (() => {
      try {
        return near1(c, Object.assign({}, act.pose, P.np));
      } catch (e) {
        return null;
      }
    })(),
    col = bad || near || overlapsAny(gu) ? '#E57373' : '#FFE58A';
  el(
    'line',
    {
      x1: px(P.S0.x),
      y1: py(P.S0.y),
      x2: px(P.np.x),
      y2: py(P.np.y),
      stroke: col,
      'stroke-width': 1.6,
      'stroke-dasharray': '4 3'
    },
    g
  );
  standsOf(gu).forEach(s2 =>
    el(
      'polygon',
      {
        points: s2.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
        fill: COL[u0.side] ? COL[u0.side].fill : '#888',
        'fill-opacity': 0.35,
        stroke: col,
        'stroke-width': 1.4,
        'stroke-dasharray': '3 2'
      },
      g
    )
  );
  const t = el(
    'text',
    {
      x: px(P.np.x),
      y: py(P.np.y) - (geom(gu).d * S) / 2 - 8,
      'text-anchor': 'middle',
      fill: col,
      'font-size': 12,
      'font-weight': 700,
      'font-family': 'Alegreya Sans, sans-serif',
      stroke: '#1C2421',
      'stroke-width': 3,
      'paint-order': 'stroke'
    },
    g
  );
  t.textContent = bad
    ? 'Too far: costs ' + P.cost.toFixed(1) + '″, ' + P.rem.toFixed(1) + '″ left'
    : near
      ? 'Within 1″ of ' + (near.short || near.name)
      : 'Ends here · ' + P.cost.toFixed(1) + '″ of March';
}
function marchApply(mode, amt) {
  const c = act.cur,
    u = base(act.id),
    { np, cost, rem } = marchPose(mode, amt);
  if (cost > rem + 1e-6) {
    toast(`That costs ${cost.toFixed(1)}″ but only ${rem.toFixed(1)}″ is left.`);
    return false;
  }
  Object.assign(act.pose, np);
  c.segs.push({ mode, amt, cost });
  c.pending = null;
  c.segStart = { x: act.pose.x, y: act.pose.y, facing: act.pose.facing, files: act.pose.files };
  render();
  return true;
}
function marchUndo() {
  const c = act.cur;
  c.segs.pop();
  const segs = c.segs.slice();
  c.segs = [];
  c.pending = null;
  const p = { x: c.start.x, y: c.start.y, facing: c.start.facing, files: c.start.files };
  c.segStart = Object.assign({}, p);
  Object.assign(act.pose, p);
  segs.forEach(s => marchApply(s.mode, s.amt));
  render();
}
function marchDrag(p) {
  const c = act.cur,
    u = base(act.id),
    S0 = c.segStart,
    G = geom(Object.assign({}, u, S0)),
    a = ((S0.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  const vx = (p.x ?? act.pose.x) - S0.x,
    vy = (p.y ?? act.pose.y) - S0.y,
    rem = c.budget - marchUsedCommitted(c),
    m = c.mode;
  let amt, cost, np;
  {
    const ds = c.segs.find(s => s.mode[0] !== 'w');
    if (m[0] !== 'w' && ds && ds.mode !== m) {
      toast('A March goes in one direction only. Wheels are still allowed.');
      return;
    }
  }
  if (m === 'fwd') {
    amt = Math.min(Math.max(0, vx * f[0] + vy * f[1]), rem);
    cost = amt;
    np = { x: S0.x + f[0] * amt, y: S0.y + f[1] * amt, facing: S0.facing };
  } else if (m === 'back') {
    amt = Math.min(Math.max(0, -(vx * f[0] + vy * f[1])), rem / 2);
    cost = 2 * amt;
    np = { x: S0.x - f[0] * amt, y: S0.y - f[1] * amt, facing: S0.facing };
  } else if (m === 'sright' || m === 'sleft') {
    const sg = m === 'sright' ? 1 : -1;
    amt = Math.min(Math.max(0, sg * (vx * r[0] + vy * r[1])), rem / 2);
    cost = 2 * amt;
    np = { x: S0.x + r[0] * amt * sg, y: S0.y + r[1] * amt * sg, facing: S0.facing };
  } else {
    const s = m === 'wright' ? 1 : -1,
      P = [
        S0.x + (f[0] * G.d) / 2 + ((r[0] * G.w) / 2) * s,
        S0.y + (f[1] * G.d) / 2 + ((r[1] * G.w) / 2) * s
      ];
    const a0 = Math.atan2(S0.x - P[0], S0.y - P[1]),
      a1 = Math.atan2(S0.x + vx - P[0], S0.y + vy - P[1]);
    let deg = (((((((a1 - a0) * 180) / Math.PI) * s) % 360) + 540) % 360) - 180;
    deg = Math.max(0, Math.min(deg, rem / ((G.w * Math.PI) / 180)));
    amt = deg;
    cost = (G.w * deg * Math.PI) / 180;
    np = wheelPose(S0, u, m === 'wright' ? 'right' : 'left', deg);
  }
  c.pending = { mode: m, amt, cost };
  Object.assign(act.pose, np);
  if (!drag) {
    if (c.pending.amt > 0) c.segs.push(c.pending);
    c.pending = null;
    c.segStart = { x: act.pose.x, y: act.pose.y, facing: act.pose.facing, files: act.pose.files };
  }
  render();
}
function renderMarchUI(c, chg) {
  const used = marchUsed(c),
    rem = c.budget - used,
    dirSeg = c.segs.find(s => s.mode[0] !== 'w'),
    cls = dirSeg ? dirSeg.mode : null;
  $('c-cur-read').textContent =
    `March: ${used.toFixed(1)}″ of ${c.budget}″ used, ${rem.toFixed(1)}″ left. Forward moves and wheels cost their distance; sideways and backward cost double.`;
  const g = document.createElement('div');
  g.className = 'grp';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'March direction');
  [
    ['fwd', 'Forward'],
    ['wleft', 'Wheel left'],
    ['wright', 'Wheel right'],
    ['sleft', 'Sideways left'],
    ['sright', 'Sideways right'],
    ['back', 'Backward']
  ].forEach(([m, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String(c.mode === m));
    b.disabled =
      (m[0] !== 'w' && !!cls && cls !== m) ||
      (!!c.noSide && (m === 'sleft' || m === 'sright' || m === 'back'));
    b.title = b.disabled ? 'This March already goes in another direction; wheels are still allowed' : '';
    b.onclick = () => {
      c.mode = m;
      render();
    };
    g.appendChild(b);
  });
  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow-x:auto;max-width:100%';
  wrap.appendChild(g);
  chg.appendChild(wrap);
  const wheel = c.mode === 'wleft' || c.mode === 'wright',
    G = geom(Object.assign({}, base(act.id), act.pose)),
    per = (G.w * Math.PI) / 180;
  const row = document.createElement('div');
  row.className = 'row';
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.id = 'march-amt';
  inp.min = '0';
  inp.step = wheel ? '5' : '0.5';
  const mx = wheel ? Math.floor(rem / per) : c.mode === 'fwd' ? rem : rem / 2;
  inp.value = String(Math.max(0, +mx.toFixed(1)));
  inp.setAttribute('aria-label', wheel ? 'Wheel angle in degrees' : 'Distance in inches');
  inp.style.cssText =
    'width:80px;font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 8px';
  const lab = document.createElement('span');
  lab.className = 'read';
  lab.textContent = wheel
    ? `° (up to ${Math.floor(mx)}°; ${per.toFixed(2)}″ of March per degree)`
    : `″ (up to ${Math.max(0, Math.floor(mx * 10 + 1e-6) / 10)}″)`;
  /* never more than the March left: the box stops at the maximum for this direction */
  const mxV = Math.max(0, Math.floor(mx * 10 + 1e-6) / 10);
  inp.max = String(mxV);
  const clampV = () => {
    let v = parseFloat(inp.value);
    if (v > mxV) {
      v = mxV;
      inp.value = String(mxV);
    }
    if (v < 0) {
      v = 0;
      inp.value = '0';
    }
    return v;
  };
  c.previewAmt = clampV();
  inp.oninput = () => {
    c.previewAmt = clampV();
    marchGhost();
  };
  const ap = document.createElement('button');
  ap.type = 'button';
  ap.className = 'btn ghost';
  ap.textContent = 'Apply';
  ap.onclick = () => {
    const v = clampV();
    if (!(v > 0)) {
      toast(mxV > 0 ? 'Enter an amount above 0.' : 'No March left for this direction.');
      return;
    }
    if (c.mode[0] !== 'w' && cls && c.mode !== cls) {
      toast('A March goes in one direction only. Wheels are still allowed.');
      return;
    }
    marchApply(c.mode, v);
  };
  const un = document.createElement('button');
  un.type = 'button';
  un.className = 'btn ghost';
  un.textContent = 'Undo last step';
  un.disabled = !c.segs.length;
  un.onclick = marchUndo;
  row.append(inp, lab, ap, un);
  chg.appendChild(row);
  chg.appendChild(
    ptext(
      wheel
        ? `Wheel ${c.mode === 'wright' ? 'right' : 'left'}: the ${c.mode === 'wright' ? 'right' : 'left'} front corner stays put and the ${c.mode === 'wright' ? 'left' : 'right'} end swings round; the March used is how far that outer front corner travels. Drag to turn, or type the angle.`
        : 'Drag the regiment to move it in the chosen direction, or type an amount and Apply.'
    )
  );
  if (c.segs.length) {
    const t = c.segs
      .map(
        s =>
          ({
            fwd: 'forward',
            back: 'backward',
            sleft: 'sideways left',
            sright: 'sideways right',
            wleft: 'wheel left',
            wright: 'wheel right'
          })[s.mode] +
          ' ' +
          (s.mode[0] === 'w' ? Math.round(s.amt) + '°' : s.amt.toFixed(1) + '″') +
          ' (' +
          s.cost.toFixed(1) +
          '″)'
      )
      .join(', ');
    chg.appendChild(ptext('Steps: ' + t));
  }
}
function curCost(p) {
  if (act.cur && (act.cur.type === 'march' || act.cur.withdraw) && act.cur.segs)
    return { cost: marchUsed(act.cur), fwd: 0, side: 0, wheel: 0 };
  const u = Object.assign({}, base(act.id), p);
  if (act.cur.type === 'charge') {
    return { cost: Math.hypot(p.x - act.cur.start.x, p.y - act.cur.start.y), fwd: 0, side: 0, wheel: 0 };
  }
  return moveCost(p, act.cur.start, u);
}
const FXB = new Set();
function fx(u) {
  const e = (u.effects || []).slice();
  if (!u || FXB.has(u.id)) return e;
  FXB.add(u.id);
  try {
    if (act && act.id === u.id)
      act.extraFx.forEach(x => {
        if (!e.includes(x)) e.push(x);
      });
    try {
      frFx(u).forEach(x => {
        if (!e.includes(x)) e.push(x);
      });
    } catch (err) {}
    try {
      dRules(u).forEach(x => {
        if (!e.includes(x)) e.push(x);
      });
    } catch (err) {}
  } finally {
    FXB.delete(u.id);
  }
  return e;
}
function availableActions(u) {
  const out = [];
  if (!act || act.id !== u.id) return out;
  if (act.entering && !act.placed) return out;
  const used = act.actions.filter(a => !a.free),
    last = used[used.length - 1],
    n = act.actions.length,
    eng = engaged(u);
  const broken = (u.effects || []).includes('Broken'),
    arrive = act.entering || act.arrivedThisRound;
  const firstMust = act.entering && used.length === 0;
  const cap = used.length >= 2 || n >= 3;
  const can = (type, why) => out.push({ type, why });
  const repeatOk = t => t === 'march' || t === 'reform';
  const blocked = t => {
    if (cb) return 'Resolve the dice in the combat panel first';
    if (act.chargeFailed) return 'The failed Charge ended this activation';
    if (act.occupyT || act.leaveT) return 'Moving in or out of a building ends the activation';
    if (act.cur) return 'Finish the current action first';
    if (cap) return 'No actions left';
    if (firstMust && t !== 'march') return 'An arriving regiment must March first';
    if (last && last.type === t && !repeatOk(t)) return 'Already used this activation';
    if (used.some(a => a.type === t) && !repeatOk(t)) return 'Already used this activation';
    return '';
  };
  if (u.garrison) {
    if (!eng.length && hasBarrage(u)) {
      can('volley', blocked('volley'));
      can('aim', aimWhy(u) || blocked('aim'));
    }
    if (eng.length) can('clash', blocked('clash'));
    if (!animate(u)) can('inspire', inspWhy(u) || blocked('inspire'));
    can(
      'leave',
      used.length ? 'Leaving takes both actions: do it as the first action' : broken ? '' : blocked('leave')
    );
    return out;
  }
  if (!eng.length && !arrive && tGarrisonNear(u).length) can('occupy', blocked('occupy'));
  if (!eng.length) {
    can('march', blocked('march'));
    can('charge', arrive ? 'No Charge in the round a regiment arrives' : blocked('charge'));
    can('reform', blocked('reform'));
    if (hasBarrage(u)) {
      can('volley', blocked('volley'));
      can('aim', aimWhy(u) || blocked('aim'));
    }
    if (broken) can('rally', blocked('rally'));
  } else {
    can('clash', blocked('clash'));
    can('creform', blocked('creform'));
    if (!animate(u)) can('inspire', inspWhy(u) || blocked('inspire'));
    if (/Light|Medium/.test(u.cls || '')) can('withdraw', blocked('withdraw'));
    if (broken) can('crally', blocked('crally'));
  }
  {
    const RC = regCaster(u);
    if (RC && u.onTable && magicLevel(u, false) && spellsOf(u, false).length) {
      const nc = act.actions.filter(a => a.type === 'cast').length,
        fr = RC.free || act.freeCast || (RC.extra && !act.actions.some(a => a.type === 'cast' && a.free));
      const why = nc >= (RC.extra ? 2 : 1) ? 'Already cast this activation' : fr ? '' : blocked('cast');
      out.push({ type: 'cast', why, free: !!fr });
    }
  }
  if (memOf(u)) {
    can('memory', hasGrant(base(u.id), 'Memories of Old') ? 'Already active this round' : blocked('memory'));
  }
  if (RU(u).some(x => /^Fluid Formation/.test(x)) && !act.actions.some(a => a.type === 'fluid') && !act.cur) {
    const ok = used.length === 0 || cap;
    const narrow = geom(u).files <= 3;
    out.push({
      type: 'fluid',
      why: !narrow
        ? 'Needs 3 or fewer stands in the front rank'
        : ok
          ? ''
          : 'Only before the first action or after the last',
      free: true
    });
  }
  if (
    supOn(u.side, 'Hammer and Anvil') &&
    /Infantry|Cavalry/.test(u.cls || '') &&
    !PS().hammerUsed &&
    !act.actions.some(a => a.type === 'hammer') &&
    !act.cur &&
    used.length >= 1
  ) {
    out.push({ type: 'hammer', why: eng.length ? 'Not while engaged' : '', free: true });
  }
  if (
    used.length === 2 &&
    used[0].type === 'march' &&
    used[1].type === 'march' &&
    hasDraw(u, /^Double Time/) &&
    !act.actions.some(a => a.dt) &&
    !act.cur
  )
    out.push({ type: 'dtmarch', why: '', free: true });
  if (trampleX(u) && !act.actions.some(a => a.type === 'trample') && !act.cur && frontFoes(u).length)
    out.push({ type: 'trample', why: '', free: true });
  if (
    used.length === 2 &&
    used[1].type === 'volley' &&
    hasDraw(u, /Fire and Advance/) &&
    !act.actions.some(a => a.fadv) &&
    !act.cur &&
    act.actions.length < 3
  )
    out.push({ type: 'fadv', why: '', free: true });
  srActions(u, out, used, eng, blocked);
  return out;
}
function d6() {
  const a = new Uint8Array(1);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= 252);
  lastRollAt = performance.now();
  return (a[0] % 6) + 1;
}
