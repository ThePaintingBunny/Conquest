/*
 * Ruler
 *
 * Measures between two points or regiments; online, the opponent sees it.
 *
 * In this file: rulerPoly(), closestPts(), rRuler, rulerT, lastRulerJson, lastHover, rulerSer(),
 *   rulerDes(), pushRuler(), onRuler(), rulerLine(), drawRuler(), toggleRuler()
 */

function rulerPoly(e) {
  if (e && e.id) {
    const u = byId(e.id);
    if (u && u.onTable) return corners(u);
  }
  return [[e[0], e[1]]];
}

function closestPts(P, Q) {
  if (P.length > 2 && Q.length > 2 && polyDist(P, Q) === 0) return null;
  let best = [Infinity, null, null];
  const seg = (p, a, b) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L = dx * dx + dy * dy;
    let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return [a[0] + t * dx, a[1] + t * dy];
  };
  const edges = X => (X.length < 2 ? [[X[0], X[0]]] : X.map((p, i) => [p, X[(i + 1) % X.length]]));
  for (const [A, B, sw] of [
    [P, Q, false],
    [Q, P, true]
  ])
    for (const p of A)
      for (const [a, b] of edges(B)) {
        const q = seg(p, a, b),
          d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d < best[0]) best = sw ? [d, q, p] : [d, p, q];
      }
  return best;
}

/* the ruler: yours in pale gold, the opponent's (online) in their colour */
let rRuler = null,
  rulerT = null,
  lastRulerJson = '',
  lastHover = null;

function rulerSer(p) {
  return p ? (p.id ? { id: p.id } : { x: +(+p[0]).toFixed(2), y: +(+p[1]).toFixed(2) }) : null;
}

function rulerDes(p) {
  return p ? (p.id ? { id: p.id } : [p.x, p.y]) : null;
}

function pushRuler(a, b) {
  if (!PVP() || !db || !seatSide()) return;
  const v = JSON.stringify(ruler && a && b ? { a: rulerSer(a), b: rulerSer(b) } : null);
  if (v === lastRulerJson) return;
  lastRulerJson = v;
  clearTimeout(rulerT);
  rulerT = setTimeout(() => {
    db.doc('game/ruler')
      .set({ by: HU, r: v, at: Date.now() })
      .catch(() => {});
  }, 90);
}

function onRuler(d) {
  if (!d || d.by === HU) return;
  try {
    const r = JSON.parse(d.r || 'null');
    rRuler = r && r.a && r.b ? { a: rulerDes(r.a), b: rulerDes(r.b), side: d.by } : null;
  } catch (e) {
    rRuler = null;
  }
  drawRuler();
}

function rulerLine(g, a, b, col, prefix) {
  if ((a.id && !byId(a.id)) || (b.id && !byId(b.id))) return;
  const cp = closestPts(rulerPoly(a), rulerPoly(b));
  if (!cp) {
    const at = a.id ? byId(a.id) : { x: a[0], y: a[1] };
    const t = el(
      'text',
      {
        x: px(at.x),
        y: py(at.y),
        'text-anchor': 'middle',
        fill: col,
        'font-size': 13,
        'font-weight': 700,
        stroke: '#1C2421',
        'stroke-width': 3,
        'paint-order': 'stroke'
      },
      g
    );
    t.textContent = prefix + '0″ (in contact)';
    return;
  }
  const A = cp[1],
    B = cp[2];
  el(
    'line',
    Object.assign(
      { x1: px(A[0]), y1: py(A[1]), x2: px(B[0]), y2: py(B[1]), stroke: col, 'stroke-width': 2 },
      prefix ? { 'stroke-dasharray': '6 3' } : {}
    ),
    g
  );
  [A, B].forEach(p => el('circle', { cx: px(p[0]), cy: py(p[1]), r: 3, fill: col }, g));
  const t = el(
    'text',
    {
      x: (px(A[0]) + px(B[0])) / 2,
      y: (py(A[1]) + py(B[1])) / 2 - 8,
      'text-anchor': 'middle',
      fill: col,
      'font-size': 13,
      'font-weight': 700,
      'font-family': 'Alegreya Sans, sans-serif',
      stroke: '#1C2421',
      'stroke-width': 3,
      'paint-order': 'stroke'
    },
    g
  );
  t.textContent = prefix + cp[0].toFixed(1) + '″' + (a.id || b.id ? ' (closest points)' : '');
}

function drawRuler(hover) {
  if (hover !== undefined) lastHover = hover;
  const g = $('rulerg');
  g.innerHTML = '';
  g.setAttribute('pointer-events', 'none');
  if (rRuler)
    rulerLine(
      g,
      rRuler.a,
      rRuler.b,
      (COL[rRuler.side] && COL[rRuler.side].light) || '#9FD3FF',
      (PN(rRuler.side) || N(rRuler.side)) + ': '
    );
  const B0 = ruler && rA ? rB || lastHover : null;
  pushRuler(rA, B0);
  if (!ruler || !rA || !B0) return;
  rulerLine(g, rA, B0, '#FFF3C4', '');
}

function toggleRuler(on) {
  ruler = on == null ? !ruler : !!on;
  $('ruler').setAttribute('aria-pressed', ruler);
  rA = rB = null;
  lastHover = null;
  drawRuler();
}
