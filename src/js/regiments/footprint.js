/*
 * Footprint and contact
 *
 * The regiment's outline on the table, its facing arcs, which enemies it is in contact with and whether
 * a position is legal.
 *
 * In this file: corners(), occPoly(), engaged(), overlapsAny(), arcOf(), poseOk()
 */

function corners(u) {
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    rt = [Math.cos(a), -Math.sin(a)];
  return [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1]
  ].map(([i, j]) => [
    u.x + ((f[0] * G.d) / 2) * i + ((rt[0] * G.w) / 2) * j,
    u.y + ((f[1] * G.d) / 2) * i + ((rt[1] * G.w) / 2) * j
  ]);
}

/* a regiment's footprint for contact: its stands, or the outline of the building it occupies (Garrison terrain: a
   regiment in contact with the building is in contact with its occupant, and vice versa) */
function occPoly(u) {
  const t = u && u.garrison && typeof tGarrisonOf === 'function' ? tGarrisonOf(u) : null;
  return t ? terrPoly(t) : corners(u);
}

function engaged(u) {
  if (!u.onTable) return [];
  const A = occPoly(u);
  return all().filter(o => o.onTable && o.side !== u.side && polyDist(A, occPoly(o)) <= 0.3);
}

function overlapsAny(u) {
  const A = corners(u);
  return all().some(o => o.onTable && o.id !== u.id && polyDist(A, corners(o)) <= 0.01);
}

function arcOf(t, p) {
  const G = geom(t),
    a = ((t.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  const v = [p[0] - t.x, p[1] - t.y],
    fw = v[0] * f[0] + v[1] * f[1],
    rr = v[0] * r[0] + v[1] * r[1];
  if (fw >= G.d / 2 - 1e-6 && Math.abs(rr) <= G.w / 2 + (fw - G.d / 2)) return 'front';
  if (fw <= -G.d / 2 + 1e-6 && Math.abs(rr) <= G.w / 2 + (-fw - G.d / 2)) return 'rear';
  return rr > 0 ? 'right' : 'left';
}

function poseOk(u, p, opt) {
  opt = opt || {};
  const v = Object.assign({}, u, p, { onTable: true }),
    A = corners(v);
  if (!opt.offOk && !A.every(q => q[0] >= -0.01 && q[0] <= 72.01 && q[1] >= -0.01 && q[1] <= 48.01))
    return false;
  for (const o of all()) {
    if (!o.onTable || o.destroyed || o.id === u.id) continue;
    const d = polyDist(A, corners(o));
    if (d <= 0.02) return false;
    if (o.side !== u.side && o.type !== 'marker' && d < 1 - 1e-6 && !opt.ignoreEnemy) return false;
  }
  /* terrain: the regiment's whole outline against each piece's outline */
  if (!u.garrison)
    for (const t of terrainOf()) {
      if (tHas(t, 'Impassable') && !rh(u.rules || [], 'Fly') && terrDist(A, t) === 0) return false;
      if (tHas(t, 'Garrison') && terrDist(A, t) < 1) return false;
    }
  return true;
}
