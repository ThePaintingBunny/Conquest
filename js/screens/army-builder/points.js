/*
 * Army builder: points
 *
 * Points for a row, a warband, upgrades and the whole army.
 *
 * In this file: rowPts(), wbPts(), bldTotal(), wbPtsChar(), upgPts()
 */

function rowPts(r) {
  if (r.modular) return modPts(r.modular) + (r.custom || []).reduce((a, c) => a + (+c.pts || 0), 0);
  if (r.chariots) return r.chariots.filter(Boolean).reduce((a, n) => a + ((bldUnit(n) || {}).pts || 0), 0);
  const u = bldUnit(r.unit);
  if (!u) return 0;
  const b = bldBase(u);
  const o = regOptions(u).opts;
  return (
    (u.pts || 0) +
    Math.max(0, (r.stands || b) - b) * (u.extra || 0) +
    (r.opts || []).reduce((a, n) => a + ((o.find(x => x.name === n) || {}).cost || 0), 0) +
    (r.custom || []).reduce((a, c) => a + (+c.pts || 0), 0)
  );
}

function wbPts(w) {
  const c = bldUnit(w.char);
  /* Holy Crusade: one 3-stand Crusaders regiment is free (extra stands still cost) */
  const cru = holyCrusadeWb(w) && w.regs.find(r => r.unit === 'Crusaders'),
    free = cru ? (bldUnit('Crusaders') || {}).pts || 0 : 0;
  return (
    (c ? c.pts || 0 : 0) +
    upgPts(w) +
    (w.custom || []).reduce((a, x) => a + (+x.pts || 0), 0) +
    w.regs.reduce((a, r) => a + rowPts(r), 0) -
    free
  );
}

function bldTotal() {
  return bld.wbs.reduce((a, w) => a + wbPts(w), 0);
}

function wbPtsChar(w) {
  const c = bldUnit(w.char);
  return (c ? c.pts || 0 : 0) + upgPts(w) + (w.custom || []).reduce((a, x) => a + (+x.pts || 0), 0);
}

function upgPts(w) {
  return (w.upg || []).reduce((a, n) => a + ((upgFind(n) || [])[2] || 0), 0);
}
