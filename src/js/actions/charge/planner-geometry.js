/*
 * Charge planner geometry
 *
 * Rotations, overlaps, ray hits and pushing regiments apart, used by the Charge Move planner.
 *
 * In this file: rotAbout(), shrinkPoly(), polyOverlap(), raySeg(), rayHit(), polyHitsEllipse(),
 *   terrBlockPoly(), pushAway(), chargePushes()
 */

function rotAbout(p, c, deg) {
  const a = ((p.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  const v = [p.x - c[0], p.y - c[1]],
    al = v[0] * f[0] + v[1] * f[1],
    be = v[0] * r[0] + v[1] * r[1];
  const fc = (p.facing || 0) + deg,
    b = (fc * Math.PI) / 180,
    f2 = [Math.sin(b), Math.cos(b)],
    r2 = [Math.cos(b), -Math.sin(b)];
  return Object.assign({}, p, {
    x: c[0] + al * f2[0] + be * r2[0],
    y: c[1] + al * f2[1] + be * r2[1],
    facing: ((fc % 360) + 360) % 360
  });
}

function shrinkPoly(P, e) {
  const c = [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
  return P.map(p => {
    const dx = p[0] - c[0],
      dy = p[1] - c[1],
      L = Math.hypot(dx, dy) || 1;
    return [p[0] - (dx / L) * e, p[1] - (dy / L) * e];
  });
}

function polyOverlap(A, B) {
  return polyDist(shrinkPoly(A, 0.03), shrinkPoly(B, 0.03)) === 0;
}

function raySeg(p, d, a, b) {
  const ex = b[0] - a[0],
    ey = b[1] - a[1],
    den = d[0] * ey - d[1] * ex;
  if (Math.abs(den) < 1e-12) return Infinity;
  const wx = a[0] - p[0],
    wy = a[1] - p[1],
    t = (wx * ey - wy * ex) / den,
    s = (wx * d[1] - wy * d[0]) / den;
  return t >= -1e-9 && s >= -1e-9 && s <= 1 + 1e-9 ? Math.max(0, t) : Infinity;
}

/* how far polygon A moves along unit vector d before it touches polygon B */
function rayHit(A, B, d) {
  let t = Infinity;
  const E = X => X.map((p, i) => [p, X[(i + 1) % X.length]]);
  for (const p of A) for (const [a, b] of E(B)) t = Math.min(t, raySeg(p, d, a, b));
  const nd = [-d[0], -d[1]];
  for (const q of B) for (const [a, b] of E(A)) t = Math.min(t, raySeg(q, nd, a, b));
  return t;
}

/* Does a regiment outline P touch or overlap a terrain piece (its drawn outline)? (name kept from the ellipse days) */
function polyHitsEllipse(P, t) {
  return terrDist(P, t) === 0;
}

/* Terrain a Charge Move may not cross or touch: Impassable (except for Fly while moving; Fly may not end on it)
   and Garrison terrain (other than an occupied building being charged). final: the end position of the Charge. */
function terrBlockPoly(u, P, final, skip) {
  if (u.garrison) return null;
  const fly = rh(RU(u), 'Fly');
  for (const t of terrainOf()) {
    if (tHas(t, 'Impassable') && (!fly || final) && polyHitsEllipse(P, t, 1)) return tInfo(t).name;
    if (tHas(t, 'Garrison') && tId(t) !== skip && polyHitsEllipse(P, t, 1)) return tInfo(t).name;
  }
  return null;
}

/* Push an enemy regiment directly away from a point, at most 1″, so that it clears the given outlines.
   need: the smallest gap that must be reached (else null); want: stop once this gap is reached.
   Returns { x, y, gap, moved } or null. Blocked by the table edge, other regiments and Impassable terrain. */
function pushAway(o, polys, from, need, want, ignore) {
  const dx = o.x - from[0],
    dy = o.y - from[1],
    L = Math.hypot(dx, dy) || 1,
    dir = [dx / L, dy / L];
  const rest = all().filter(
    x => x.onTable && !x.destroyed && x.id !== o.id && !(ignore || []).includes(x.id)
  );
  const gapOf = C => Math.min(...polys.map(P => polyDist(P, C)));
  let best = null;
  for (let k = 0.05; k <= 1.0001; k += 0.05) {
    const p = { x: o.x + dir[0] * k, y: o.y + dir[1] * k },
      C = corners(Object.assign({}, o, p));
    if (!C.every(q => q[0] >= -0.01 && q[0] <= 72.01 && q[1] >= -0.01 && q[1] <= 48.01)) break;
    if (rest.some(x => polyDist(C, corners(x)) <= 0.01)) break;
    if (terrBlockPoly(o, C)) break;
    const g = gapOf(C);
    if (g > need && (!best || g > best.gap))
      best = { x: +p.x.toFixed(3), y: +p.y.toFixed(3), gap: g, moved: +k.toFixed(2) };
    if (g >= want - 1e-6) break;
  }
  return best;
}

/* After a Charge: unengaged enemy regiments (other than the target) within 1″ of the charger are pushed up to 1″ directly away. */
function chargePushes(u, targetId) {
  const C = corners(u),
    out = [];
  all()
    .filter(
      o =>
        o.onTable &&
        !o.destroyed &&
        o.side !== u.side &&
        o.id !== targetId &&
        o.type !== 'marker' &&
        !engaged(o).some(e => e.id !== u.id)
    )
    .forEach(o => {
      const d = polyDist(C, corners(o));
      if (d >= 1 - 1e-6) return;
      const r = pushAway(o, [C], [u.x, u.y], Math.max(d, 0.01), 1, [u.id]);
      if (r && r.gap > d + 1e-3)
        out.push({ id: o.id, name: o.short || o.name, x: r.x, y: r.y, moved: r.moved, gap: r.gap });
    });
  return out;
}
