/*
 * Geometry
 *
 * Points, segments and polygons in table inches: distances, intersections, point-in-polygon tests,
 * hulls, headings and angles. No game rules in here.
 *
 * In this file: segDist(), inside(), polyDist(), segSegX(), segPoly(), pip(), ptSeg(), ptPoly(),
 *   ptInPolyG(), segsCross(), segHitsPolyG(), heading(), angDiff(), hull(), grownPoly()
 */

function segDist(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = dx * dx + dy * dy;
  let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function inside(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

function polyDist(A, B) {
  if (A.some(p => inside(p, B)) || B.some(p => inside(p, A))) return 0;
  /* two outlines can also cross like a plus sign with no corner inside the other */
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < B.length; j++)
      if (segSegX(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length])) return 0;
  let m = 1e9;
  for (const P of [
    [A, B],
    [B, A]
  ])
    for (const p of P[0]) for (let i = 0; i < 4; i++) m = Math.min(m, segDist(p, P[1][i], P[1][(i + 1) % 4]));
  return m;
}

function segSegX(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a),
    d2 = o(c, d, b),
    d3 = o(a, b, c),
    d4 = o(a, b, d);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0 && Math.abs(d1) > 1e-9 && Math.abs(d2) > 1e-9;
}

function segPoly(a, b, P) {
  const Q = shrinkPoly(P, 0.05);
  for (let i = 0; i < Q.length; i++) if (segSegX(a, b, Q[i], Q[(i + 1) % Q.length])) return true;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return pip(m, Q);
}

function pip(p, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if (
      P[i][1] > p[1] !== P[j][1] > p[1] &&
      p[0] < ((P[j][0] - P[i][0]) * (p[1] - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]
    )
      c = !c;
  }
  return c;
}

function ptSeg(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = dx * dx + dy * dy;
  let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  const q = [a[0] + dx * t, a[1] + dy * t];
  return [Math.hypot(p[0] - q[0], p[1] - q[1]), q];
}

function ptPoly(p, P) {
  let best = [1e9, null];
  for (let i = 0; i < P.length; i++) {
    const r = ptSeg(p, P[i], P[(i + 1) % P.length]);
    if (r[0] < best[0]) best = r;
  }
  return best;
}

/* point inside any simple polygon (ray casting) */
function ptInPolyG(p, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i],
      b = P[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1] + 1e-12) + a[0])
      c = !c;
  }
  return c;
}

function segsCross(a, b, c, d) {
  const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const d1 = cr(c, d, a),
    d2 = cr(c, d, b),
    d3 = cr(a, b, c),
    d4 = cr(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/* does the segment a-b touch the polygon P (cross an edge or lie inside it)? */
function segHitsPolyG(a, b, P) {
  if (ptInPolyG(a, P) || ptInPolyG(b, P)) return true;
  for (let i = 0; i < P.length; i++) if (segsCross(a, b, P[i], P[(i + 1) % P.length])) return true;
  return false;
}

function heading(from, P) {
  return ((Math.atan2(P.x - from.x, P.y - from.y) * 180) / Math.PI + 360) % 360;
}

function angDiff(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function hull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
    lo = [],
    up = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.slice().reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/* the area within R inches of a (convex) outline */
function grownPoly(P, R) {
  const pts = [];
  P.forEach(v => {
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      pts.push([v[0] + Math.cos(a) * R, v[1] + Math.sin(a) * R]);
    }
  });
  return hull(pts);
}
