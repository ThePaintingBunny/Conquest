/*
 * Charge target
 *
 * Line of sight for a Charge, whether a Charge against a target is legal, and choosing the target.
 *
 * In this file: segPolyHit(), chargeLos(), chargeCheck(), setChargeTarget()
 */

/* ===== Line of Sight for a Charge. Sight lines run from points along the charger's front edge to points of the target
   inside its front arc; the Charge needs at least one clear line. A line is blocked by another regiment (either side) or
   by Obstructing/Garrison terrain whose Size is at least the Size of both the charger and the target. ===== */
function segPolyHit(a, b, P) {
  const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const inside = q => {
    let s0 = 0;
    for (let i = 0; i < P.length; i++) {
      const c = cross(P[i], P[(i + 1) % P.length], q);
      if (Math.abs(c) < 1e-9) continue;
      if (!s0) s0 = Math.sign(c);
      else if (Math.sign(c) !== s0) return false;
    }
    return true;
  };
  if (inside(a) || inside(b)) return true;
  for (let i = 0; i < P.length; i++) {
    const c = P[i],
      d = P[(i + 1) % P.length];
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
  }
  return false;
}

function chargeLos(u, t) {
  const sa = uSize(u),
    st = uSize(t),
    G = geom(u),
    an = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(an), Math.cos(an)],
    r = [Math.cos(an), -Math.sin(an)];
  const from = [];
  for (let i = 0; i <= 6; i++) {
    const o = -G.w / 2 + (G.w * i) / 6;
    from.push([u.x + (f[0] * G.d) / 2 + r[0] * o, u.y + (f[1] * G.d) / 2 + r[1] * o]);
  }
  const T = corners(t),
    to = T.concat(
      T.map((p, i) => [(p[0] + T[(i + 1) % 4][0]) / 2, (p[1] + T[(i + 1) % 4][1]) / 2]),
      [[t.x, t.y]]
    ).filter(p => arcOf(u, p) === 'front');
  if (!to.length) return { ok: false, by: 'nothing (the target is not in the front arc)' };
  const walls = all()
    .filter(
      o =>
        o.onTable &&
        !o.destroyed &&
        o.id !== u.id &&
        o.id !== t.id &&
        o.type !== 'marker' &&
        uSize(o) >= sa &&
        uSize(o) >= st
    )
    .map(o => ({ name: o.short || o.name, P: shrinkPoly(corners(o), 0.05) }));
  const terr = terrainOf().filter(x => {
    if (!tHas(x, 'Obstructing') && !tHas(x, 'Garrison')) return false;
    if (inT(x, [u.x, u.y]) || inT(x, [t.x, t.y])) return false;
    const I = tInfo(x);
    return I.size >= sa && I.size >= st;
  });
  let by = null;
  for (const a of from)
    for (const b of to) {
      const w = walls.find(W => segPolyHit(a, b, W.P));
      if (w) {
        by = by || w.name;
        continue;
      }
      const x = terr.find(X => segHits(X, a, b));
      if (x) {
        by = by || tInfo(x).name + ' (Size ' + tInfo(x).size + ')';
        continue;
      }
      return { ok: true };
    }
  return { ok: false, by };
}

/* Is a Charge against t legal at all, and how long is the shortest legal Charge Move?
   Uses the Charge Move planner from where the regiment stands: { ok, why, req } with req in inches. */
function chargeCheck(u, t, dist, max) {
  const s = (act && act.cur && act.cur.start) || u,
    U = Object.assign({}, u, { x: s.x, y: s.y, facing: s.facing != null ? s.facing : u.facing || 0 });
  const plan = cd => {
    try {
      return planCharge(U, t, cd);
    } catch (e) {
      console.error(e);
      return { ok: false, why: '' };
    }
  };
  const best = plan(max);
  if (!best.ok) return { ok: false, why: best.why || '', fail: best.fail };
  if (chargeFixed(u) != null || plan(dist).ok) return { ok: true, req: dist };
  let lo = dist,
    hi = max;
  while (hi - lo > 0.05) {
    const mid = (lo + hi) / 2;
    if (plan(mid).ok) hi = mid;
    else lo = mid;
  }
  return { ok: true, req: Math.ceil(hi * 20) / 20 };
}

function setChargeTarget(t) {
  const u = byId(act.id);
  if (fx(t).some(x => /^Prowling/.test(x)) && polyDist(corners(u), corners(t)) >= 8) {
    toast('That regiment is Prowling: it cannot be seen from 8″ or more.');
    return;
  }
  if (t.type === 'marker' && (state.round || 1) < 2) {
    toast('Objective Markers cannot be attacked before round 2.');
    return;
  }
  const dist = polyDist(corners(u), corners(t));
  const arcOk = corners(t)
    .concat([[t.x, t.y]])
    .some(p => arcOf(u, p) === 'front');
  if (!arcOk) {
    toast((t.short || t.name) + ' is not in this regiment’s front arc.');
    return;
  }
  const pu = armyHas(u.side, /Prophecy Unfulfilled/) && engaged(t).length > 0;
  const max = chargeMaxVs(u, t) + (pu ? 2 : 0);
  if (dist > max + 1e-6) {
    toast(
      `Out of reach: ${t.short || t.name} is ${dist.toFixed(1)}″ away and the furthest this regiment can charge is ${max}″.`
    );
    return;
  }
  /* legality before the roll: Line of Sight, then is there any legal Charge Move into the target with the best possible roll? */
  const st0 = act.cur.start || u,
    los = chargeLos(
      Object.assign({}, u, { x: st0.x, y: st0.y, facing: st0.facing != null ? st0.facing : u.facing }),
      t
    );
  if (!los.ok) {
    act.cur.illegal = { target: t.id, name: t.short || t.name, why: '', los: los.by, fail: null };
    render();
    toast(
      `No Line of Sight to ${t.short || t.name}` +
        (los.by ? `: ${los.by} blocks every sight line` : '') +
        '. A Charge needs Line of Sight, so no roll is made. Choose another target or another action.'
    );
    return;
  }
  const chk = chargeCheck(u, t, dist, max);
  if (!chk.ok) {
    act.cur.illegal = { target: t.id, name: t.short || t.name, why: chk.why, fail: chk.fail || null };
    render();
    toast(
      `No legal Charge against ${t.short || t.name}` +
        (chk.why ? `: the Charge Move is blocked by ${chk.why}` : '') +
        '. Even the best Charge Roll could not reach it, so no roll is made. Choose another target or another action.'
    );
    return;
  }
  act.cur.illegal = null;
  clearChargeFail();
  Object.assign(act.cur, {
    stage: 'roll',
    target: t.id,
    straight: dist,
    dist: Math.max(dist, chk.req),
    pu
  });
  toast(t.garrison ? 'The target is in a building: no Impact Attacks against it.' : '');
  render();
}
