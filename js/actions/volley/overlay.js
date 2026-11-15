/*
 * Volley overlay
 *
 * Draws effective and full range for each shooting stand and the lines to the target.
 *
 * In this file: drawVolleyZones(), drawVolleyLines(), drawVolleyNeeds()
 */

/* volley overlay: per front-rank stand, the effective range (half Barrage range, +1 shot) and the full range, over its firing arc */
function drawVolleyZones(u, g) {
  const vr = u && volleyRange(u);
  if (!vr) return;
  const span = volleyArcSpan(u),
    R = vr.range,
    long = rh(RU(u).concat(fx(u)), 'Longshot'),
    H = long ? R : R / 2;
  const pts = q => q.map(p => px(p[0]) + ',' + py(p[1])).join(' ');
  const fa = ((u.facing || 0) * Math.PI) / 180,
    G = geom(u),
    f = [Math.sin(fa), Math.cos(fa)],
    r = [Math.cos(fa), -Math.sin(fa)],
    fe = G.d / 2,
    hw = G.w / 2;
  const P = (fw, rr) => [u.x + f[0] * fw + r[0] * rr, u.y + f[1] * fw + r[1] * rr];
  /* union of the stands' fans: straight ahead of the front edge plus a sector at each front corner out to the arc's edge */
  const shape = Rad => {
    const sp = (span * Math.PI) / 180,
      o = [],
      n = Math.max(8, Math.round(span / 4));
    o.push(P(fe, -hw));
    for (let k = 0; k <= n; k++) {
      const an = -sp + (sp * k) / n;
      o.push(P(fe + Rad * Math.cos(an), -hw + Rad * Math.sin(an)));
    }
    for (let k = 0; k <= n; k++) {
      const an = (sp * k) / n;
      o.push(P(fe + Rad * Math.cos(an), hw + Rad * Math.sin(an)));
    }
    o.push(P(fe, hw));
    return o;
  };
  const front = standsOf(u).filter(s => s.rank === 0);
  if (rh(RU(u), 'Weapon Platform') && !rh(RU(u), 'Acute Senses') && !u.garrison) {
    /* Weapon Platform: front and both flank arcs, measured from the front and side facings */
    if (!long)
      el(
        'polygon',
        {
          points: pts(wpReach(u, R)),
          fill: '#6FA8FF',
          'fill-opacity': 0.2,
          stroke: '#9CC4FF',
          'stroke-width': 2,
          'stroke-dasharray': '6 4',
          'pointer-events': 'none'
        },
        g
      );
    el(
      'polygon',
      {
        points: pts(wpReach(u, H)),
        fill: '#FFD66B',
        'fill-opacity': 0.32,
        stroke: '#FFE39A',
        'stroke-width': 2,
        'pointer-events': 'none'
      },
      g
    );
    return;
  }
  if (span >= 180) {
    /* every direction: the shooting stands' outline grown by the range (a rounded rectangle). Acute Senses fires from the front rank only; Fluid Formation from whichever side faces the target, so the whole regiment */
    const back = rh(RU(u), 'Fluid Formation') || u.garrison ? -fe : fe - G.sd;
    const ring = Rad => {
      const o = [],
        C = [
          [fe, hw, 0],
          [back, hw, 1],
          [back, -hw, 2],
          [fe, -hw, 3]
        ];
      C.forEach(([a, b, q]) => {
        for (let k = 0; k <= 10; k++) {
          const an = ((q + k / 10) * Math.PI) / 2;
          o.push(P(a + Rad * Math.cos(an), b + Rad * Math.sin(an)));
        }
      });
      return o;
    };
    if (!long)
      el(
        'polygon',
        {
          points: pts(ring(R)),
          fill: '#6FA8FF',
          'fill-opacity': 0.2,
          stroke: '#9CC4FF',
          'stroke-width': 2,
          'stroke-dasharray': '6 4',
          'pointer-events': 'none'
        },
        g
      );
    el(
      'polygon',
      {
        points: pts(ring(H)),
        fill: '#FFD66B',
        'fill-opacity': 0.32,
        stroke: '#FFE39A',
        'stroke-width': 2,
        'pointer-events': 'none'
      },
      g
    );
    return;
  }
  if (!long)
    el(
      'polygon',
      {
        points: pts(shape(R)),
        fill: '#6FA8FF',
        'fill-opacity': 0.2,
        stroke: '#9CC4FF',
        'stroke-width': 2,
        'stroke-dasharray': '6 4',
        'pointer-events': 'none'
      },
      g
    );
  el(
    'polygon',
    {
      points: pts(shape(H)),
      fill: '#FFD66B',
      'fill-opacity': 0.32,
      stroke: '#FFE39A',
      'stroke-width': 2,
      'pointer-events': 'none'
    },
    g
  );
  front.forEach(s => {
    const c = [(s.poly[0][0] + s.poly[1][0]) / 2, (s.poly[0][1] + s.poly[1][1]) / 2];
    el('circle', { cx: px(c[0]), cy: py(c[1]), r: 2.5, fill: '#FFE39A', 'pointer-events': 'none' }, g);
  });
}

function drawVolleyLines(u, t, L, AF) {
  const VS = volleyStands(u, t);
  let vg = L.querySelector('#vlines');
  if (vg) vg.remove();
  vg = el('g', { id: 'vlines', 'pointer-events': 'none' }, L);
  VS.filter(v => !v.none && v.to && (!AF || v.arcing)).forEach(v => {
    const ok = v.inRange && (v.clear || AF),
      c = !v.inRange ? '#B9B9B9' : ok ? (v.eff ? '#FFE39A' : '#9CC4FF') : '#FF7A6B';
    el(
      'line',
      {
        x1: px(v.f0[0]),
        y1: py(v.f0[1]),
        x2: px(v.to[0]),
        y2: py(v.to[1]),
        stroke: c,
        'stroke-width': 2.4,
        'stroke-dasharray': ok ? (AF && !v.clear ? '2 3' : '') : '5 4'
      },
      vg
    );
    el('circle', { cx: px(v.f0[0]), cy: py(v.f0[1]), r: 3.5, fill: c }, vg);
  });
  return vg;
}

function drawVolleyNeeds(u, g) {
  const vr = u && volleyRange(u);
  if (!vr) return;
  const long = rh(RU(u).concat(fx(u)), 'Longshot');
  all()
    .filter(t => t.onTable && !t.destroyed && t.side !== u.side)
    .forEach(t => {
      const gu = g.querySelector('g[data-id="' + t.id + '"]');
      if (!gu) return;
      const why = volleyWhy(u, t);
      const d = Math.min(
        ...standsOf(u)
          .filter(s => s.rank === 0)
          .map(s => polyDist(s.poly, corners(t)))
      );
      const eff = !why && (long || d <= vr.range / 2 + 1e-6);
      const VS = volleyStands(u, t),
        AF = arcingOn(u);
      gu.querySelectorAll(':scope>title').forEach(x => x.remove());
      const ti = document.createElementNS(NS, 'title');
      ti.textContent =
        (t.short || t.name) +
        ': ' +
        d.toFixed(1) +
        '″ from its nearest front stand. ' +
        (why ? why : (AF ? 'Arcing Fire: ' : '') + volleySummary(VS, AF) + ' Click to volley.');
      gu.insertBefore(ti, gu.firstChild);
      gu.addEventListener('mouseenter', () => {
        const L = $('rings');
        if (!L) return;
        let vg = L.querySelector('#vlines');
        if (vg) vg.remove();
        vg = el('g', { id: 'vlines', 'pointer-events': 'none' }, L);
        VS.filter(v => !v.none && v.to && (!AF || v.arcing)).forEach(v => {
          const ok = v.inRange && (v.clear || AF),
            c = !v.inRange ? '#B9B9B9' : ok ? (v.eff ? '#FFE39A' : '#9CC4FF') : '#FF7A6B';
          el(
            'line',
            {
              x1: px(v.f0[0]),
              y1: py(v.f0[1]),
              x2: px(v.to[0]),
              y2: py(v.to[1]),
              stroke: c,
              'stroke-width': 2.2,
              'stroke-dasharray': ok ? (AF && !v.clear ? '2 3' : '') : '5 4'
            },
            vg
          );
          el('circle', { cx: px(v.f0[0]), cy: py(v.f0[1]), r: 3.5, fill: c }, vg);
        });
      });
      gu.addEventListener('mouseleave', () => {
        const vg = document.getElementById('vlines');
        if (vg) vg.remove();
        const ts = act && act.cur && act.cur.sel && byId(act.cur.sel);
        if (ts && $('rings')) drawVolleyLines(u, ts, $('rings'), arcingOn(u));
      });
    });
}
