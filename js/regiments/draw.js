/*
 * Drawing regiments
 *
 * Draws a regiment on the board: stands, labels, wound markers and status chips.
 *
 * In this file: standMark(), drawUnit(), chipFac, chip()
 */

/* the stand-type symbol inside one stand (x, y, w, d: the stand on the board): X infantry, slash cavalry, one long slash
   for cavalry on a double Stand, bold X with a solid block brute, slash and wheel chariot */
function standMark(type, x, y, w, d, g) {
  const i = Math.min(w, d) * 0.22,
    st = {
      stroke: 'rgba(255,243,224,0.72)',
      'stroke-width': 1.1,
      fill: 'none',
      'stroke-linecap': 'round',
      'pointer-events': 'none'
    },
    path = dd => el('path', Object.assign({ d: dd }, st), g),
    X = (x0, y0, x1, y1) => path(`M${x0} ${y0}L${x1} ${y1}M${x1} ${y0}L${x0} ${y1}`);
  if (type === 'inf') X(x + i, y + i, x + w - i, y + d - i);
  else if (type === 'cav') path(`M${x + i} ${y + d - i}L${x + w - i} ${y + i}`);
  else if (type === 'dbl') {
    /* a model on a double Stand: one long slash, top right to bottom left */
    path(`M${x + i} ${y + d - i}L${x + w - i} ${y + i}`);
  } else if (type === 'brute') {
    /* a bold X with a solid block where the strokes cross */
    const cx = x + w / 2,
      cy = y + d / 2,
      r = Math.min(w, d) * 0.25;
    path(`M${x + i} ${y + i}L${x + w - i} ${y + d - i}M${x + w - i} ${y + i}L${x + i} ${y + d - i}`).setAttribute(
      'stroke-width',
      1.6
    );
    el(
      'polygon',
      {
        points: `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`,
        fill: 'rgba(255,243,224,0.82)',
        'pointer-events': 'none'
      },
      g
    );
  } else if (type === 'chariot') {
    /* the slash of cavalry in front, a wheel behind */
    const cx = x + w / 2,
      cy = y + d * 0.64,
      r = w * 0.27;
    path(`M${x + i} ${y + d * 0.3}L${x + w - i} ${y + d * 0.1}`);
    el('circle', Object.assign({ cx, cy, r }, st), g);
    for (let a = 0; a < 4; a++) {
      const t = (a * Math.PI) / 4;
      el(
        'path',
        Object.assign({}, st, {
          d: `M${cx - Math.cos(t) * r} ${cy - Math.sin(t) * r}L${cx + Math.cos(t) * r} ${cy + Math.sin(t) * r}`,
          'stroke-width': 0.7
        }),
        g
      );
    }
  }
}

function drawUnit(u, g) {
  if (u.type === 'marker') {
    drawMarker(u, g);
    return;
  }
  const G = geom(u),
    w = G.w * S,
    d = G.d * S,
    c = COL[u.side],
    sw = G.sw * S,
    sd = G.sd * S;
  const grp = el(
    'g',
    {
      transform: `translate(${px(u.x)} ${py(u.y)}) rotate(${ROT(u.facing)})`,
      'data-id': u.id,
      style: 'cursor:pointer'
    },
    g
  );
  el('rect', { x: -w / 2 + 1.5, y: -d / 2 + 2, width: w, height: d, rx: 2, fill: '#000', opacity: 0.3 }, grp);
  const LAY = layout(u);
  LAY.forEach(L => {
    const rr = Math.floor(L.pos / G.files),
      f = L.pos % G.files,
      cmd = L.cmd,
      aux = L.kind === 'aux',
      ch = L.kind === 'char';
    const scx = -w / 2 + f * sw + sw / 2,
      scy = -d / 2 + rr * sd + sd / 2,
      AS = aux ? auxStyle(u) : null;
    if (!L.rider)
      el(
        'rect',
        {
          x: -w / 2 + f * sw + 0.6,
          y: -d / 2 + rr * sd + 0.6,
          width: sw - 1.2,
          height: sd - 1.2,
          rx: u.type === 'monster' ? 6 : 1.5,
          fill: aux ? AS.fill : rr === 0 ? c.fill : c.light,
          stroke: cmd ? '#E8C65A' : '#F3E6C4',
          'stroke-width': cmd ? 2.2 : 0.8
        },
        grp
      );
    /* what kind of stand it is, as a map symbol: X infantry, a slash cavalry, a boxed X brute, a wheel chariot */
    if (!L.rider && !aux && u.type !== 'monster')
      standMark(
        u.dbl ? 'dbl' : u.type,
        -w / 2 + f * sw + 0.6,
        -d / 2 + rr * sd + 0.6,
        sw - 1.2,
        sd - 1.2,
        grp
      );
    if (L.mod && MODSTYLE[L.mod]) {
      const M = MODSTYLE[L.mod],
        bg = el(
          'g',
          { transform: `translate(${scx} ${scy + (cmd ? 3.5 : 0)}) rotate(${-ROT(u.facing)})` },
          grp
        );
      el(
        'rect',
        { x: -6, y: -4, width: 12, height: 8, rx: 2, fill: M[1], stroke: '#1C1410', 'stroke-width': 0.5 },
        bg
      );
      const tt = el(
        'text',
        {
          x: 0,
          y: 0.3,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          'font-size': 6,
          'font-weight': 700,
          fill: '#1C1410',
          'font-family': 'Alegreya Sans, sans-serif'
        },
        bg
      );
      tt.textContent = M[0];
    }
    if (cmd)
      el(
        'path',
        {
          d: L.mod
            ? `M${scx} ${scy - 6} L${scx + 3} ${scy - 3} L${scx} ${scy} L${scx - 3} ${scy - 3}Z`
            : `M${scx} ${scy - 4.5} L${scx + 4} ${scy} L${scx} ${scy + 4.5} L${scx - 4} ${scy}Z`,
          fill: '#E8C65A',
          stroke: '#4A3418',
          'stroke-width': 0.6
        },
        grp
      );
    if (aux && AS.key === 'mino')
      el(
        'path',
        {
          d: `M${scx - 4.5} ${scy - 3.5} Q${scx - 3} ${scy + 2} ${scx} ${scy + 2} Q${scx + 3} ${scy + 2} ${scx + 4.5} ${scy - 3.5}`,
          fill: 'none',
          stroke: '#F3E6C4',
          'stroke-width': 1.6,
          'stroke-linecap': 'round'
        },
        grp
      );
    if (aux && AS.key === 'sb') {
      const sg = el('g', { transform: `translate(${scx} ${scy}) rotate(${-ROT(u.facing)})` }, grp);
      el('circle', { cx: 0, cy: 0, r: 4.6, fill: '#B8862E', stroke: '#F3E6C4', 'stroke-width': 0.8 }, sg);
      el(
        'path',
        {
          d: 'M-2.3 2.2 L0 -2.6 L2.3 2.2',
          fill: 'none',
          stroke: '#1C1410',
          'stroke-width': 1.2,
          'stroke-linejoin': 'round'
        },
        sg
      );
    }
    if (ch && L.rider) {
      const rg = el(
        'g',
        { transform: `translate(${scx + sw / 2 - 6} ${scy + sd / 2 - 6}) rotate(${-ROT(u.facing)})` },
        grp
      );
      el('circle', { cx: 0, cy: 0, r: 5, fill: '#F3E6C4', stroke: '#4A3418', 'stroke-width': 0.9 }, rg);
      const rt = el(
        'text',
        {
          x: 0,
          y: 0.4,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          'font-size': 6.5,
          'font-weight': 700,
          fill: '#4A3418',
          'font-family': 'Alegreya Sans, sans-serif'
        },
        rg
      );
      rt.textContent = 'R';
      return;
    }
    if (ch)
      el('circle', { cx: scx, cy: scy, r: 4, fill: '#F3E6C4', stroke: '#4A3418', 'stroke-width': 0.8 }, grp);
  });
  el('line', { x1: -w / 2, y1: -d / 2, x2: w / 2, y2: -d / 2, stroke: '#F3E6C4', 'stroke-width': 2.2 }, grp);
  {
    const rem = woundState(u).rem,
      n = live(u),
      LY = LAY,
      nextDie = removalSeq(u).slice(lostOf(u))[0],
      posOf = t => {
        const q = LY.find(x => x.tok === t);
        return q ? q.pos : null;
      };
    const mark = (k, val) => {
      const rr = Math.floor(k / G.files),
        f = k % G.files,
        mx = -w / 2 + f * sw + sw - 4,
        my = -d / 2 + rr * sd + 4;
      const wg = el('g', { transform: `translate(${mx} ${my}) rotate(${-ROT(u.facing)})` }, grp);
      el('circle', { cx: 0, cy: 0, r: 5.5, fill: '#B3261E', stroke: '#FFF3E0', 'stroke-width': 1.2 }, wg);
      const wt = el(
        'text',
        {
          x: 0,
          y: 0.5,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          fill: '#FFF3E0',
          'font-size': 8.5,
          'font-weight': 700,
          'font-family': 'Alegreya Sans, sans-serif'
        },
        wg
      );
      wt.textContent = String(val);
    };
    if (rem > 0 && !u.dyingFight) {
      const k = posOf('r' + nextDie);
      if (k != null) mark(k, rem);
    }
    const ap = posOf('a');
    if (ap != null && (u.auxWounds || 0) > 0) mark(ap, u.auxWounds);
  }
  if (u.id === selId)
    el(
      'rect',
      {
        x: -w / 2 - 3,
        y: -d / 2 - 3,
        width: w + 6,
        height: d + 6,
        rx: 4,
        fill: 'none',
        stroke: '#E8C65A',
        'stroke-width': 1.5,
        'stroke-dasharray': '4 3'
      },
      grp
    );
  if ((u.effects || []).includes('Broken')) {
    const n = LAY.filter(x => !x.rider).length;
    for (let k = 0; k < n; k++) {
      const rr = Math.floor(k / G.files),
        f = k % G.files,
        x0 = -w / 2 + f * sw,
        y0 = -d / 2 + rr * sd,
        flip = k % 2 ? -1 : 1;
      const cx = x0 + sw / 2,
        cy = y0 + sd / 2,
        ax = sw * 0.38,
        ay = sd * 0.38;
      el(
        'path',
        {
          d: `M${cx - ax * flip} ${cy - ay} L${cx - ax * 0.2 * flip} ${cy - ay * 0.25} L${cx + ax * 0.25 * flip} ${cy + ay * 0.05} L${cx - ax * 0.05 * flip} ${cy + ay * 0.45} L${cx + ax * 0.6 * flip} ${cy + ay}`,
          fill: 'none',
          stroke: '#1C1410',
          opacity: 0.75,
          'stroke-width': 1.6,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        },
        grp
      );
      el(
        'path',
        {
          d: `M${cx + ax * 0.25 * flip} ${cy + ay * 0.05} L${cx + ax * 0.75 * flip} ${cy - ay * 0.15}`,
          fill: 'none',
          stroke: '#1C1410',
          opacity: 0.75,
          'stroke-width': 1.1,
          'stroke-linecap': 'round'
        },
        grp
      );
    }
  }
  if (act && act.cur && act.cur.type === 'charge' && act.cur.target === u.id && act.cur.stage !== 'adjust') {
    el(
      'rect',
      {
        x: -w / 2 - 4,
        y: -d / 2 - 4,
        width: w + 8,
        height: d + 8,
        rx: 4,
        fill: 'none',
        stroke: '#FF8A6B',
        'stroke-width': 2.2,
        'stroke-dasharray': '6 3'
      },
      grp
    );
  }
  /* the name sits just behind the regiment's rear edge, pushed out far enough along that direction that it never overlaps the stands */
  const tag = el(
    'text',
    {
      x: px(u.x),
      y: py(u.y),
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      fill: '#F7F3E6',
      'font-size': 11,
      'font-weight': 700,
      'font-family': 'Alegreya Sans, sans-serif',
      stroke: '#1C2421',
      'stroke-width': 2.4,
      'paint-order': 'stroke',
      'pointer-events': 'none'
    },
    g
  );
  tag.textContent = u.short || u.name;
  {
    const ar = ((u.facing || 0) * Math.PI) / 180;
    let nx = px(u.x - Math.sin(ar)) - px(u.x),
      ny = py(u.y - Math.cos(ar)) - py(u.y);
    const L = Math.hypot(nx, ny) || 1;
    nx /= L;
    ny /= L;
    let tw = 0;
    try {
      tw = tag.getComputedTextLength();
    } catch (e) {}
    if (!tw) tw = (tag.textContent.length || 1) * 6;
    const th = 12,
      dist = d / 2 + (Math.abs(nx) * tw) / 2 + (Math.abs(ny) * th) / 2 + 3;
    tag.setAttribute('x', (px(u.x) + nx * dist).toFixed(1));
    tag.setAttribute('y', (py(u.y) + ny * dist).toFixed(1));
  }
}

let chipFac = null;

function chip(t, cls, fac) {
  const c = document.createElement('span');
  c.className = 'chip' + (cls ? ' ' + cls : '');
  c.textContent = t;
  return tipChip(c, t, fac || chipFac);
}
