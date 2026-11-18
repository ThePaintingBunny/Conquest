/*
 * Built-in opponent: movement
 *
 * Predicts where a March ends exactly the way the March executor will carry it out (wheel to face the point, then
 * straight on, stopping 1″ short of enemies and at anything in the way), and lists the places worth marching to:
 * zones, enemies, the flanks and rear of enemies, and away from the worst threat.
 *
 * In this file: botMarchSim(), botFwd(), botDests(), botEntryPose()
 */

/* where a March toward P ends, from pose S0 with this many inches; the same steps as exMarch */
function botMarchSim(u, S0, P, budget) {
  let S = { x: S0.x, y: S0.y, facing: S0.facing || 0, files: S0.files || geom(u).files };
  const G = geom(Object.assign({}, u, S));
  let rem = budget;
  const df = angDiff(heading(S, P), S.facing || 0);
  if (Math.abs(df) > 2) {
    const dir = df > 0 ? 'right' : 'left',
      per = (G.w * Math.PI) / 180;
    let deg = Math.min(Math.abs(df), rem / per, 175);
    for (let k = 0; k < 14 && deg > 0.5; k++) {
      if (poseOk(u, wheelPose(S, u, dir, deg))) break;
      deg *= 0.75;
    }
    if (deg > 0.5 && poseOk(u, wheelPose(S, u, dir, deg))) {
      S = Object.assign({}, S, wheelPose(S, u, dir, deg));
      rem -= deg * per;
    }
  }
  const dist = Math.hypot(P.x - S.x, P.y - S.y),
    want = Math.max(0, Math.min(rem, dist));
  const amt = fwdLegal(u, S, want, false);
  return { pose: botFwd(S, amt), moved: budget - rem + amt };
}

function botFwd(S, amt) {
  const a = ((S.facing || 0) * Math.PI) / 180;
  return Object.assign({}, S, { x: S.x + Math.sin(a) * amt, y: S.y + Math.cos(a) * amt });
}

/* places worth marching toward */
function botDests(ctx, u) {
  const out = [],
    G = geom(u);
  const add = (x, y, why) => {
    if (!isFinite(x) || !isFinite(y)) return;
    x = Math.max(1, Math.min(71, x));
    y = Math.max(1, Math.min(47, y));
    if (Math.hypot(x - u.x, y - u.y) < 0.75) return;
    out.push({ x, y, why });
  };
  zonesOf().forEach(z => add(z.x, z.y, 'zone ' + z.name));
  /* its job from the army's plan, however far */
  const job = botObjOf(u);
  if (job) {
    const T = job.kind === 'foe' ? byId(job.id) : null;
    const q = /flank|guard|lane/.test(job.kind) ? botObjPoint(job, u) : null;
    if (q) add(q.x, q.y, 'its job: ' + job.name);
    else if (T) add(T.x, T.y, 'its job: ' + job.name);
    else if (job.kind === 'zone') {
      /* the near side of the zone, so it is in it after the March */
      const d = Math.hypot(job.x - u.x, job.y - u.y);
      if (d > job.r)
        add(
          job.x + ((u.x - job.x) / d) * job.r * 0.4,
          job.y + ((u.y - job.y) / d) * job.r * 0.4,
          'its job: zone ' + job.name
        );
    }
  }
  const reach = (+u.m || 0) * 2 + 14;
  ctx.foes.concat(ctx.markers).forEach(T => {
    if (polyDist(corners(u), corners(T)) > reach + 10) return;
    add(T.x, T.y, 'toward ' + (T.short || T.name));
    if (isMarker(T)) return;
    const GT = geom(T),
      a = ((T.facing || 0) * Math.PI) / 180,
      f = [Math.sin(a), Math.cos(a)],
      r = [Math.cos(a), -Math.sin(a)],
      off = GT.w / 2 + G.d / 2 + 2,
      back = GT.d / 2 + G.d / 2 + 2;
    add(T.x + r[0] * off, T.y + r[1] * off, 'right flank of ' + (T.short || T.name));
    add(T.x - r[0] * off, T.y - r[1] * off, 'left flank of ' + (T.short || T.name));
    add(T.x - f[0] * back, T.y - f[1] * back, 'rear of ' + (T.short || T.name));
  });
  /* away from the closest enemy */
  const near = ctx.foes
    .filter(T => !engaged(T).length)
    .sort((a, b) => polyDist(corners(u), corners(a)) - polyDist(corners(u), corners(b)))[0];
  if (near) {
    const h = ((heading(near, u) % 360) + 360) % 360,
      a = (h * Math.PI) / 180,
      M = +u.m || 0;
    add(u.x + Math.sin(a) * M, u.y + Math.cos(a) * M, 'away from ' + (near.short || near.name));
  }
  return out;
}

/* entering from the own table edge at x: the pose just off the edge, facing in */
function botEntryPose(u, x) {
  const G = geom(u);
  return Object.assign(
    { x: Math.max(G.w / 2, Math.min(72 - G.w / 2, x)), files: G.files },
    ownEntry(u.side, G.d)
  );
}
