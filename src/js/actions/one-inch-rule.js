/*
 * The 1″ rule
 *
 * A March may not end within 1″ of an enemy regiment or Garrison terrain (core rules).
 *
 * In this file: MOVE1, terrGap(), near1(), pullBack()
 */

/* March restriction (core rules): a regiment may not March to within 1″ of an enemy regiment; only a Charge brings it into contact */
const MOVE1 = ['march', 'reform', 'fluid', 'hammer', 'dtmarch', 'fadv'];

/* how close a regiment outline comes to a terrain piece (0 = touching or overlapping; up to 1″ is checked) */
function terrGap(P, t) {
  return Math.min(9, terrDist(P, t));
}

/* Core rules 2026: a March may not end within 1″ of an enemy regiment or Garrison terrain; a Reform may not bring
   stands within 1″ of an enemy regiment (unless it started closer; then it may not get closer). */
function near1(c, pose) {
  const u = Object.assign({}, base(act.id), pose || act.pose),
    uc = corners(u),
    st = corners(Object.assign({}, base(act.id), c.start));
  const marchy = ['march', 'dtmarch', 'fadv'].includes(c.type) || c.withdraw;
  const tr =
    u.garrison || !marchy
      ? null
      : terrainOf().find(t => {
          if (!tHas(t, 'Garrison')) return false;
          const g = terrGap(uc, t, 1);
          return g < 1 - 1e-3 && g < terrGap(st, t, 1) - 1e-3;
        });
  if (tr) return { short: tInfo(tr).name, name: tInfo(tr).name, terr: true, dist: terrGap(uc, tr, 1) };
  return (
    all().find(
      e =>
        e.onTable &&
        !e.destroyed &&
        e.type !== 'marker' &&
        e.side !== u.side &&
        e.id !== u.id &&
        (d => d < 1 - 1e-3 && d < polyDist(st, corners(e)) - 1e-3)(polyDist(uc, corners(e)))
    ) || null
  );
}

function pullBack(c) {
  const P = act.pose,
    S = c.start;
  for (let t = 1; t >= 0; t -= 0.02) {
    const q = { x: S.x + (P.x - S.x) * t, y: S.y + (P.y - S.y) * t, facing: t > 0.5 ? P.facing : S.facing };
    if (!near1(c, q) && !touchesAny(Object.assign({}, base(act.id), act.pose, q))) {
      Object.assign(act.pose, q);
      return true;
    }
  }
  Object.assign(act.pose, { x: S.x, y: S.y, facing: S.facing });
  return false;
}
