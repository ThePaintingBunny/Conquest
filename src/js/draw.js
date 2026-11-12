/* Drawing the board: regiments, labels, the ruler and the formation editor. */
/* ---------- drawing ---------- */
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
let chipFac = null;
function chip(t, cls, fac) {
  const c = document.createElement('span');
  c.className = 'chip' + (cls ? ' ' + cls : '');
  c.textContent = t;
  return tipChip(c, t, fac || chipFac);
}
/* formation editor: arrange stands when arriving or reforming */
let formSel = null;
function formEditable() {
  if (!act) return false;
  if (act.entering && !act.placed) return true;
  const c = act.cur;
  return !!(c && (c.reshape || c.type === 'reform'));
}
function tokLabel(u, t) {
  if (t === 'c') return { name: u.charName || 'Character', sub: 'Character', cls: 'ch' };
  if (t === 'a') return { name: u.auxName || 'Auxiliary', sub: 'Auxiliary', cls: 'aux ' + auxStyle(u).key };
  const i = +t.slice(1),
    m = u.mods ? u.mods[i] : null;
  return {
    name: m || u.short || u.name,
    sub: t === 'r0' ? 'Command Stand' : 'Stand',
    cls: (t === 'r0' ? 'cmd ' : '') + (m ? 'mod' : ''),
    mod: m
  };
}
function renderFormation() {
  const box = $('c-form');
  if (!box) return;
  const u = act ? byId(act.id) : null;
  if (!u || selId !== u.id || !formEditable() || live(u) < 2) {
    box.hidden = true;
    box.innerHTML = '';
    formSel = null;
    return;
  }
  box.hidden = false;
  box.innerHTML = '';
  const G = geom(u),
    L = layout(u),
    seq = L.map(x => x.tok);
  box.append(Object.assign(document.createElement('h3'), { textContent: 'Formation' }));
  box.append(
    ptext(
      'Front rank at the top. Drag a stand onto another to swap them, or tap one then the other. Command, character and auxiliary stands stay in the front rank.'
    )
  );
  const grid = document.createElement('div');
  grid.className = 'fm-grid';
  grid.style.gridTemplateColumns = `repeat(${G.files},minmax(0,1fr))`;
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Stand positions, front rank first');
  const swap = (a, b) => {
    if (a === b) return;
    const s2 = seq.slice(),
      ia = s2.indexOf(a),
      ib = s2.indexOf(b);
    [s2[ia], s2[ib]] = [s2[ib], s2[ia]];
    const bad = s2.findIndex((t, k) => (t === 'r0' || t === 'c' || t === 'a') && k >= G.files);
    if (bad >= 0) {
      toast('The ' + tokLabel(u, s2[bad]).sub.toLowerCase() + ' must stay in the front rank.');
      formSel = null;
      renderFormation();
      return;
    }
    act.pose.order = s2.concat((u.order || []).filter(t => !s2.includes(t)));
    formSel = null;
    render();
  };
  L.forEach(x => {
    const lab = tokLabel(u, x.tok),
      b = document.createElement('button');
    b.type = 'button';
    b.className = 'fm-st ' + lab.cls + (formSel === x.tok ? ' sel' : '');
    b.draggable = true;
    const rr = Math.floor(x.pos / G.files);
    b.setAttribute(
      'aria-label',
      `${lab.name}, ${lab.sub}, rank ${rr + 1}, file ${(x.pos % G.files) + 1}` +
        (formSel === x.tok ? ', selected' : '')
    );
    if (lab.mod && MODSTYLE[lab.mod]) {
      const tag = document.createElement('span');
      tag.className = 'fm-tag';
      tag.textContent = MODSTYLE[lab.mod][0];
      tag.style.background = MODSTYLE[lab.mod][1];
      b.append(tag);
    }
    b.append(
      Object.assign(document.createElement('strong'), { textContent: lab.name }),
      Object.assign(document.createElement('span'), { textContent: lab.sub })
    );
    b.onclick = () => {
      if (formSel && formSel !== x.tok) swap(formSel, x.tok);
      else {
        formSel = formSel === x.tok ? null : x.tok;
        renderFormation();
      }
    };
    b.ondragstart = e => {
      e.dataTransfer.setData('text/plain', x.tok);
      e.dataTransfer.effectAllowed = 'move';
    };
    b.ondragover = e => {
      e.preventDefault();
      b.classList.add('over');
    };
    b.ondragleave = () => b.classList.remove('over');
    b.ondrop = e => {
      e.preventDefault();
      b.classList.remove('over');
      const t = e.dataTransfer.getData('text/plain');
      if (t) swap(t, x.tok);
    };
    grid.append(b);
  });
  box.append(grid);
  if (u.mods) {
    const leg = document.createElement('div');
    leg.className = 'fm-leg';
    [...new Set(u.mods)].forEach(m => {
      const s2 = MODSTYLE[m];
      if (!s2) return;
      const c = document.createElement('span');
      const t = document.createElement('span');
      t.className = 'fm-tag';
      t.textContent = s2[0];
      t.style.background = s2[1];
      c.append(t, document.createTextNode(' ' + m));
      leg.append(c);
    });
    box.append(leg);
  }
  if (act.pose.order)
    box.append(
      (() => {
        const r = document.createElement('button');
        r.type = 'button';
        r.className = 'btn ghost';
        r.textContent = 'Reset formation';
        r.onclick = () => {
          delete act.pose.order;
          render();
        };
        return r;
      })()
    );
}
