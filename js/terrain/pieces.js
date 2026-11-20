/*
 * Terrain pieces
 *
 * Looks up a terrain piece's type and keywords, and builds its outline: one irregular shape per piece,
 * generated from its seed, used for both drawing and rules.
 *
 * In this file: tInfo(), tHas(), tId(), terrainOf(), terrPolyCache, terrPtsCache, terrPoly(), terrR(),
 *   terrDist(), inT()
 */

function tInfo(t) {
  const d = TTYPES[t.type] || TTYPES.forest;
  return {
    name: t.name || d.name,
    size: t.size != null ? +t.size : d.size,
    kw: Array.isArray(t.kw) ? t.kw : d.kw,
    cap: t.cap != null ? +t.cap : d.cap || 4,
    def: t.def != null ? +t.def : d.def || 1
  };
}

function tHas(t, k) {
  return tInfo(t).kw.includes(k);
}

function tId(t) {
  return String(t.seed || t.x + '_' + t.y);
}

function terrainOf() {
  if (mapEdit) return mapEdit.terrain;
  if (scenEdit) return (scenEdit.sc.map && mbMaps()[scenEdit.sc.map]) || [];
  return state && Array.isArray(state.terrain) ? state.terrain : TERR0;
}

/* ===== Terrain outlines. Every piece has one irregular outline, generated from its seed in table inches. It is what is
   drawn on the table and what every rule uses (entering, crossing, the 1″ rule, Line of Sight, garrisons). ===== */
const terrPolyCache = new Map();

const terrPtsCache = new WeakMap();
function terrPoly(t) {
  /* a painted piece (Map builder): its own outline, kept relative to its centre so it moves with it */
  if (Array.isArray(t.pts) && t.pts.length > 2) {
    const c = terrPtsCache.get(t.pts);
    if (c && c.x === t.x && c.y === t.y) return c.P;
    const P = t.pts.map(([dx, dy]) => [t.x + dx, t.y + dy]);
    terrPtsCache.set(t.pts, { x: t.x, y: t.y, P });
    return P;
  }
  const key = [t.type, t.x, t.y, t.rx, t.ry, t.seed || 0].join('|');
  let P = terrPolyCache.get(key);
  if (P) return P;
  /* a small seeded generator, independent of the drawing's random numbers */
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => {
    h = (h + 0x6d2b79f5) | 0;
    let q = Math.imul(h ^ (h >>> 15), 1 | h);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
  /* buildings: a rectangle, turned a little (up to 12°), that stays inside the piece's size */
  if (t.type === 'building') {
    const th = ((rnd() - 0.5) * 2 * (12 * Math.PI)) / 180,
      c = Math.cos(th),
      sn = Math.sin(th),
      a = t.rx * 0.82,
      b = t.ry * 0.82;
    P = [
      [-a, -b],
      [a, -b],
      [a, b],
      [-a, b]
    ].map(([x, y]) => [t.x + x * c - y * sn, t.y + x * sn + y * c]);
    terrPolyCache.set(key, P);
    return P;
  }
  /* a wavy outline: the ellipse's radius varies smoothly with the angle (between about 80% and 118%) */
  const waves = [2, 3, 4, 5].map((k, i) => ({
      k,
      ph: rnd() * Math.PI * 2,
      amp: [0.09, 0.06, 0.04, 0.025][i] * (0.6 + rnd() * 0.8)
    })),
    N = 40;
  P = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let f = 1;
    waves.forEach(w => (f += w.amp * Math.sin(w.k * a + w.ph)));
    f = Math.max(0.8, Math.min(1.18, f));
    P.push([t.x + Math.cos(a) * t.rx * f, t.y + Math.sin(a) * t.ry * f]);
  }
  terrPolyCache.set(key, P);
  return P;
}

/* the largest distance from a piece's centre to its outline */
function terrR(t) {
  return Math.max(...terrPoly(t).map(p => Math.hypot(p[0] - t.x, p[1] - t.y)));
}

/* the gap between a regiment outline A and a terrain piece (0 when touching or overlapping) */
function terrDist(A, t) {
  const T = terrPoly(t);
  if (A.some(p => ptInPolyG(p, T)) || T.some(p => ptInPolyG(p, A))) return 0;
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < T.length; j++)
      if (segsCross(A[i], A[(i + 1) % A.length], T[j], T[(j + 1) % T.length])) return 0;
  let m = 1e9;
  A.forEach(p => T.forEach((q, j) => (m = Math.min(m, segDist(p, q, T[(j + 1) % T.length])))));
  T.forEach(q => A.forEach((p, i) => (m = Math.min(m, segDist(q, p, A[(i + 1) % A.length])))));
  return m;
}

function inT(t, p, pad) {
  const P = terrPoly(t);
  if (ptInPolyG(p, P)) return true;
  if (!pad) return false;
  let m = 1e9;
  P.forEach((q, j) => (m = Math.min(m, segDist(p, q, P[(j + 1) % P.length]))));
  return m <= pad;
}
