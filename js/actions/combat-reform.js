/*
 * Combat Reform
 *
 * Reforming while engaged: which stand anchors the regiment, the new facing and keeping contact with
 * the enemy.
 *
 * In this file: crPrim(), crAnchor(), crFace(), crContact(), crStart()
 */

function crPrim(c) {
  return (c.foes || []).map(byId).filter(x => x && x.onTable)[0];
}

function crAnchor(c, files) {
  const u = byId(act.id),
    e = crPrim(c),
    G0 = geom(u),
    G = geom(Object.assign({}, u, { files })),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  if (!e) return { x: u.x, y: u.y };
  const arc = arcOf(u, [e.x, e.y]);
  let v = [0, 0];
  if (arc === 'front') v = [(f[0] * (G0.d - G.d)) / 2, (f[1] * (G0.d - G.d)) / 2];
  else if (arc === 'rear') v = [(-f[0] * (G0.d - G.d)) / 2, (-f[1] * (G0.d - G.d)) / 2];
  else {
    const sg = arc === 'right' ? 1 : -1;
    v = [(r[0] * sg * (G0.w - G.w)) / 2, (r[1] * sg * (G0.w - G.w)) / 2];
  }
  return { x: u.x + v[0], y: u.y + v[1] };
}

function crFace() {
  const c = act.cur,
    u = byId(act.id),
    e = crPrim(c);
  if (!e) return;
  const side = c.foeArc[e.id],
    ea = ((e.facing || 0) * Math.PI) / 180,
    fE = [Math.sin(ea), Math.cos(ea)],
    rE = [Math.cos(ea), -Math.sin(ea)],
    GE = geom(e);
  const n =
      side === 'front' ? fE : side === 'rear' ? [-fE[0], -fE[1]] : side === 'right' ? rE : [-rE[0], -rE[1]],
    half = side === 'front' || side === 'rear' ? GE.d / 2 : GE.w / 2,
    along = side === 'front' || side === 'rear' ? rE : fE,
    alongHalf = side === 'front' || side === 'rear' ? GE.w / 2 : GE.d / 2;
  const mid = [e.x + n[0] * half, e.y + n[1] * half];
  let t = (u.x - mid[0]) * along[0] + (u.y - mid[1]) * along[1];
  t = Math.max(-alongHalf, Math.min(alongHalf, t));
  const G = geom(u),
    fac = ((((Math.atan2(-n[0], -n[1]) * 180) / Math.PI) % 360) + 360) % 360;
  Object.assign(act.pose, {
    facing: Math.round(fac * 100) / 100,
    x: mid[0] + along[0] * t + (n[0] * G.d) / 2,
    y: mid[1] + along[1] * t + (n[1] * G.d) / 2
  });
  render();
}

function crContact(c) {
  const u = byId(act.id),
    foes = (c.foes || [])
      .map(byId)
      .filter(x => x && x.onTable)
      .map(corners);
  return standsOf(u).filter(st => foes.some(q => polyDist(st.poly, q) <= 0.35)).length;
}

function crStart(u, st) {
  const eng = engaged(u),
    Rs = [u.stats && u.stats.R, u.charName && chStatsX(u).R, u.auxStats && u.auxStats.R]
      .map(Number)
      .filter(n => n > 0),
    R = Rs.length ? Math.max(...Rs) : null,
    roll = d6(),
    clean = R == null || roll <= R;
  const prim = eng
    .map(e => ({ e, n: standsOf(u).filter(s => polyDist(s.poly, corners(e)) <= 0.35).length }))
    .sort((a, b) => b.n - a.n)[0];
  const foes = prim ? [prim.e.id].concat(eng.filter(e => e.id !== prim.e.id).map(e => e.id)) : [],
    foeArc = {};
  eng.forEach(e => {
    foeArc[e.id] = arcOf(e, [u.x, u.y]);
  });
  const c = {
    type: 'creform',
    start: st,
    budget: 0,
    moving: false,
    reshape: true,
    roll,
    R,
    clean,
    foes,
    foeArc
  };
  act.cur = c;
  c.contact0 = crContact(c);
  const nC = c.contact0;
  if (!clean && nC > 0) {
    render();
    openCombat({ type: 'freform', att: u.id, tgt: u.id, inAct: false, resumeAct: false, preWounds: nC });
    toast(
      `Fighting Reform: rolled ${roll} against Resolve ${R}. ${nC} wound${nC > 1 ? 's' : ''}, one per stand in contact. Roll Morale, record it, then reshape.`
    );
    return;
  }
  render();
  toast(
    R == null
      ? 'No Resolve value: Clean Reform.'
      : `Rolled ${roll} against Resolve ${R}: Clean Reform. Reshape now.`
  );
}
