/*
 * Volley, stand by stand
 *
 * Which stands shoot, their range and whether their line to the target is clear.
 *
 * In this file: volleyArcOk(), volleyShooters(), volleyStands()
 */

/* ---------- Volley, stand by stand (core rules, Volley): each front-rank stand traces its own line from the centre of its front facing,
   as long as its Barrage range, to any point of the target. Out of reach → no shots; blocked by a regiment or Obstructing terrain of Size ≥ both → no shots.
   Effective range (half range, +1 shot) and the target arc it hits are worked out per stand. ---------- */
function volleyArcOk(A, p) {
  const R = RU(A);
  if (A.garrison || rh(R, 'Acute Senses') || rh(R, 'Fluid Formation')) return true;
  const a = arcOf(A, p);
  return a === 'front' || (rh(R, 'Weapon Platform') && a !== 'rear');
}

/* which stands shoot, and from which facing: the front rank from its front facing; Acute Senses: the front rank from whichever facing is nearest;
   Fluid Formation: the rank or file nearest the target counts as the front rank and shoots from that side */
function volleyShooters(A, T) {
  const R = RU(A),
    ST = standsOf(A),
    mid = P => [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2],
    cen = P => [P.reduce((a, p) => a + p[0], 0) / 4, P.reduce((a, p) => a + p[1], 0) / 4];
  const facings = P =>
    [
      [P[0], P[1]],
      [P[1], P[2]],
      [P[2], P[3]],
      [P[3], P[0]]
    ].map(mid);
  const TP = corners(T),
    Tc = [T.x, T.y];
  if (rh(R, 'Fluid Formation') && !A.garrison) {
    const arc = arcOf(A, Tc),
      a = ((A.facing || 0) * Math.PI) / 180,
      f = [Math.sin(a), Math.cos(a)],
      r = [Math.cos(a), -Math.sin(a)];
    const proj = (P, v) => {
      const c = cen(P);
      return (c[0] - A.x) * v[0] + (c[1] - A.y) * v[1];
    };
    if (arc === 'front')
      return ST.filter(s => s.rank === 0).map(s => ({ s, f0: mid([s.poly[0], s.poly[1]]) }));
    const v = arc === 'rear' ? [-f[0], -f[1]] : arc === 'right' ? r : [-r[0], -r[1]],
      mx = Math.max(...ST.map(s => proj(s.poly, v)));
    const edge = arc === 'rear' ? [2, 3] : arc === 'right' ? [3, 0] : [1, 2];
    return ST.filter(s => proj(s.poly, v) >= mx - 0.1).map(s => ({
      s,
      f0: mid([s.poly[edge[0]], s.poly[edge[1]]])
    }));
  }
  /* Weapon Platform (chariots): the flank arcs count as front arc, so a stand shoots from its front facing or from
     the side facing nearest the target, never from its rear facing */
  if (rh(R, 'Weapon Platform') && !rh(R, 'Acute Senses') && !A.garrison)
    return ST.filter(s => s.rank === 0).map(s => {
      const F = facings(s.poly);
      let b = F[0],
        bd = ptPoly(F[0], TP)[0];
      [F[1], F[3]].forEach(q => {
        const d = ptPoly(q, TP)[0];
        if (d < bd - 1e-6) {
          bd = d;
          b = q;
        }
      });
      return { s, f0: b };
    });
  if (rh(R, 'Acute Senses') || A.garrison)
    return ST.filter(s => s.rank === 0).map(s => {
      const F = facings(s.poly);
      let b = F[0],
        bd = 1e9;
      F.forEach(q => {
        const d = ptPoly(q, TP)[0];
        if (d < bd) {
          bd = d;
          b = q;
        }
      });
      return { s, f0: b };
    });
  return ST.filter(s => s.rank === 0).map(s => ({ s, f0: mid([s.poly[0], s.poly[1]]) }));
}

function volleyStands(A, T) {
  const vr = volleyRange(A);
  if (!vr || !A || !T) return [];
  const R = vr.range,
    long = rh(RU(A).concat(fx(A)), 'Longshot'),
    sa = uSize(A),
    st = uSize(T),
    need = Math.max(sa, st);
  const TS = standsOf(T),
    others = all()
      .filter(
        o =>
          o.onTable &&
          !o.destroyed &&
          o.id !== A.id &&
          o.id !== T.id &&
          o.type !== 'marker' &&
          uSize(o) >= need
      )
      .map(o => ({ n: o.short || o.name, P: corners(o) }));
  const terr = terrainOf().filter(
    t => (tHas(t, 'Obstructing') || tHas(t, 'Garrison')) && tInfo(t).size >= need && !A.garrison
  );
  const samples = [];
  TS.forEach(s => {
    const P = s.poly;
    for (let i = 0; i < 4; i++) {
      const a = P[i],
        b = P[(i + 1) % 4];
      for (let k = 0; k < 4; k++)
        samples.push([a[0] + ((b[0] - a[0]) * k) / 4, a[1] + ((b[1] - a[1]) * k) / 4]);
    }
    samples.push([(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2]);
  });
  return volleyShooters(A, T).map(({ s, f0 }) => {
    const p = prof(A, s.kind, s.mod),
      pb = barrageOf(p.rules);
    if (!pb) return { s, tok: s.tok, none: true, inRange: false, clear: false };
    const R = rangeAdj(A, pb.range);
    let d = 1e9,
      q0 = null;
    TS.forEach(ts => {
      const r = ptPoly(f0, ts.poly);
      if (r[0] < d) {
        d = r[0];
        q0 = r[1];
      }
    });
    const pts = [q0]
      .concat(samples)
      .filter(
        q =>
          q &&
          (A.garrison && tGarrisonOf(A)
            ? ptPoly(q, terrPoly(tGarrisonOf(A)))[0] <= R + 1e-6 || ptInPolyG(q, terrPoly(tGarrisonOf(A)))
            : Math.hypot(q[0] - f0[0], q[1] - f0[1]) <= R + 1e-6) &&
          volleyArcOk(A, q)
      );
    const inRange = pts.length > 0;
    let clear = false,
      blocker = '',
      best = null;
    for (const q of pts) {
      let b = '';
      for (const o of others)
        if (segPoly(f0, q, o.P)) {
          b = o.n;
          break;
        }
      if (!b)
        for (const t of terr) {
          if (inT(t, f0) || inT(t, q)) continue;
          if (segHits(t, f0, q)) {
            b = tInfo(t).name;
            break;
          }
        }
      if (!b) {
        clear = true;
        best = q;
        break;
      }
      if (!blocker) blocker = b;
    }
    const aim = best || q0;
    return {
      s,
      tok: s.tok,
      f0,
      to: aim,
      d,
      inRange,
      clear,
      blocker,
      arcing: rh(p.rules, 'Arcing Fire'),
      eff: inRange && (long || d <= R / 2 + 1e-6),
      arc: cArc(T, f0)
    };
  });
}
