/*
 * Charge overlay
 *
 * Draws what the active regiment can charge: its front arc, the zone within its March and the extra
 * reach of a Charge Roll.
 *
 * In this file: drawChargeZones(), drawChargeNeeds()
 */

/* charge overlay: the front arc it can see, the zone within its March, and the extra reach a Charge Roll can add */
function drawChargeZones(u, g) {
  if (!u) return;
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  const P = (fw, rr) => [u.x + f[0] * fw + r[0] * rr, u.y + f[1] * fw + r[1] * rr],
    fe = G.d / 2,
    hw = G.w / 2,
    M = +(u.m || 0),
    fix = chargeFixed(u),
    max = chargeMax(u);
  const clip = Q => {
    let out = Q;
    [
      [0, 0, 1],
      [0, 72, -1],
      [1, 0, 1],
      [1, 48, -1]
    ].forEach(([ax, v, sg]) => {
      const inn = p => sg * (p[ax] - v) >= 0,
        cut = (a, b) => {
          const t = (v - a[ax]) / (b[ax] - a[ax]);
          return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        };
      const src = out;
      out = [];
      src.forEach((cur, i) => {
        const prev = src[(i + src.length - 1) % src.length];
        if (inn(cur)) {
          if (!inn(prev)) out.push(cut(prev, cur));
          out.push(cur);
        } else if (inn(prev)) out.push(cut(prev, cur));
      });
    });
    return out;
  };
  const pts = q =>
    clip(q)
      .map(p => px(p[0]) + ',' + py(p[1]))
      .join(' ');
  /* front arc limited to R: straight ahead of the front edge, plus a 45° sector at each front corner */
  const zone = R => {
    const o = [];
    const cL = [fe, -hw],
      cR = [fe, hw];
    o.push(P(cL[0], cL[1]));
    for (let k = 0; k <= 12; k++) {
      const an = -Math.PI / 4 + ((Math.PI / 4) * k) / 12;
      o.push(P(cL[0] + R * Math.cos(an), cL[1] + R * Math.sin(an)));
    }
    for (let k = 0; k <= 12; k++) {
      const an = ((Math.PI / 4) * k) / 12;
      o.push(P(cR[0] + R * Math.cos(an), cR[1] + R * Math.sin(an)));
    }
    o.push(P(cR[0], cR[1]));
    return o;
  };
  const far = 120;
  el(
    'polygon',
    {
      points: pts([P(fe, -hw), P(fe + far, -hw - far), P(fe + far, hw + far), P(fe, hw)]),
      fill: '#BFD8F2',
      'fill-opacity': 0.1,
      stroke: '#D6E6F7',
      'stroke-opacity': 0.8,
      'stroke-width': 1.4,
      'stroke-dasharray': '7 5',
      'pointer-events': 'none'
    },
    g
  );
  const certain = fix != null ? max : M;
  if (max > certain + 1e-6)
    el(
      'polygon',
      {
        points: pts(zone(max)),
        fill: '#F29A3A',
        'fill-opacity': 0.32,
        stroke: '#FFB45C',
        'stroke-opacity': 1,
        'stroke-width': 2,
        'stroke-dasharray': '6 4',
        'pointer-events': 'none'
      },
      g
    );
  el(
    'polygon',
    {
      points: pts(zone(certain)),
      fill: '#FFF6D8',
      'fill-opacity': 0.38,
      stroke: '#FFF6D8',
      'stroke-opacity': 1,
      'stroke-width': 2,
      'pointer-events': 'none'
    },
    g
  );
}

function drawChargeNeeds(u, g) {
  if (!u) return;
  const M = +(u.m || 0),
    fix = chargeFixed(u),
    max = chargeMax(u);
  all()
    .filter(t => t.onTable && !t.destroyed && t.side !== u.side)
    .forEach(t => {
      if (
        !corners(t)
          .concat([[t.x, t.y]])
          .some(p => arcOf(u, p) === 'front')
      )
        return;
      const d = polyDist(corners(u), corners(t));
      if (d > max + 1e-6) return;
      const need =
        fix != null
          ? 'in reach, no roll needed'
          : Math.max(1, Math.ceil(d - M - 1e-6)) <= 1
            ? 'any roll reaches it'
            : 'needs ' + Math.ceil(d - M - 1e-6) + '+ on the Charge Roll';
      const gu = g.querySelector('g[data-id="' + t.id + '"]');
      if (!gu) return;
      gu.querySelectorAll(':scope>title').forEach(x => x.remove());
      const ti = document.createElementNS(NS, 'title');
      ti.textContent = (t.short || t.name) + ': ' + d.toFixed(1) + '″ away, ' + need + '. Click to charge.';
      gu.insertBefore(ti, gu.firstChild);
    });
}
