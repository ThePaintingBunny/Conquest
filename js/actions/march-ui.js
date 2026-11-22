/*
 * March controls
 *
 * The March panel, dragging a March on the board and the see-through preview.
 *
 * In this file: marchGhost(), marchDrag(), renderMarchUI()
 */

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
    col = bad || near || touchesAny(gu) ? '#E57373' : '#FFE58A';
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
