/*
 * Placing a charging regiment
 *
 * Puts the charger flush against the charged facing.
 *
 * In this file: placeCharge(), placeChargeFlush()
 */

function placeCharge() {
  const c = act.cur,
    u = Object.assign({}, byId(act.id), { x: c.start.x, y: c.start.y, facing: c.start.facing }),
    t = byId(c.target);
  let pl;
  try {
    pl = planCharge(u, t, c.cd != null ? c.cd : 99);
  } catch (e) {
    console.error(e);
    pl = { ok: false, why: '' };
  }
  c.plan = pl;
  if (!pl.ok) return false;
  Object.assign(c, { face: pl.face, e: pl.F.e, n: pl.F.n, along: pl.F.along, half: pl.F.half });
  Object.assign(act.pose, { x: pl.P3.x, y: pl.P3.y, facing: pl.P3.facing });
  act.tgtPose = pl.tgtPose ? { id: t.id, pose: pl.tgtPose } : null;
  return true;
}

function placeChargeFlush() {
  const u = byId(act.id),
    t = byId(act.cur.target),
    c = act.cur,
    Gt = geom(t),
    Gc = geom(u);
  const at = ((t.facing || 0) * Math.PI) / 180,
    ft = [Math.sin(at), Math.cos(at)],
    rt = [Math.cos(at), -Math.sin(at)];
  const ac = ((u.facing || 0) * Math.PI) / 180,
    fc = [Math.sin(ac), Math.cos(ac)],
    rc = [Math.cos(ac), -Math.sin(ac)];
  const cnt = { front: 0, rear: 0, left: 0, right: 0 };
  for (let i = 0; i < Gc.files; i++) {
    const o = -Gc.w / 2 + Gc.sw * (i + 0.5);
    cnt[
      arcOf(t, [
        u.x + fc[0] * (Gc.d / 2 - Gc.sd / 2) + rc[0] * o,
        u.y + fc[1] * (Gc.d / 2 - Gc.sd / 2) + rc[1] * o
      ])
    ]++;
  }
  const face = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  let n, e, along, half;
  if (face === 'front') {
    n = ft;
    half = Gt.w / 2;
    along = rt;
    e = [t.x + (ft[0] * Gt.d) / 2, t.y + (ft[1] * Gt.d) / 2];
  } else if (face === 'rear') {
    n = [-ft[0], -ft[1]];
    half = Gt.w / 2;
    along = rt;
    e = [t.x - (ft[0] * Gt.d) / 2, t.y - (ft[1] * Gt.d) / 2];
  } else if (face === 'right') {
    n = rt;
    half = Gt.d / 2;
    along = ft;
    e = [t.x + (rt[0] * Gt.w) / 2, t.y + (rt[1] * Gt.w) / 2];
  } else {
    n = [-rt[0], -rt[1]];
    half = Gt.d / 2;
    along = ft;
    e = [t.x - (rt[0] * Gt.w) / 2, t.y - (rt[1] * Gt.w) / 2];
  }
  const proj = (u.x - e[0]) * along[0] + (u.y - e[1]) * along[1],
    off = Math.max(-half, Math.min(half, proj));
  const fac = ((Math.atan2(-n[0], -n[1]) * 180) / Math.PI + 360) % 360;
  Object.assign(c, { face, e, n, along, half });
  Object.assign(act.pose, {
    facing: fac,
    x: e[0] + (n[0] * Gc.d) / 2 + along[0] * off,
    y: e[1] + (n[1] * Gc.d) / 2 + along[1] * off
  });
}
