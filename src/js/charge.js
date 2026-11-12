/* Charges: the Charge Roll and the Charge Move planner (wheel, straight move, close the door). */
/* the Charge Roll happens in the game: one die (two, keep the highest, with Master of the Legions) */
function chargeRollBtn(label, go, need) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = label;
  b.onclick = async () => {
    b.disabled = true;
    const u = byId(act.id),
      two = u && fxHas(u, /2D6 Charge/);
    const d = [d6()].concat(two ? [d6()] : []),
      r = Math.max(...d);
    pubRoll(
      'Charge Roll' +
        (two ? ' (2D6, highest)' : '') +
        ' · ' +
        (u.short || u.name) +
        (act && act.cur && act.cur.target && byId(act.cur.target)
          ? ' → ' + (byId(act.cur.target).short || byId(act.cur.target).name)
          : ''),
      d.map(v => ({ v, cls: v === r && v >= need ? 'hit' : v === r ? 'miss' : '' })),
      'needs ' + need + ' or more'
    );
    banner(
      'Charge Roll' + (two ? ' (2D6, highest)' : ''),
      d.map(v => ({ v, cls: v === r && v >= need ? 'hit' : v === r ? 'miss' : '' })),
      'needs ' + need + ' or more'
    );
    await sleep((DSPEED[SET.diceSpeed] || 1300) + 700);
    bannerHide();
    go(r);
  };
  return b;
}
function resolveCharge(roll, reroll) {
  const u = byId(act.id),
    c = act.cur;
  c.roll = roll;
  if (reroll) c.rerolled = true;
  const tg = byId(c.target);
  if (tg && fxHas(tg, /^Whispered Illusion: Phantom Onslaught/) && !c.wi) {
    const mi = moraleInfo(u, u),
      v = d6();
    c.wi = { v, R: mi.R, pass: mi.auto || v <= mi.R };
    toast(
      'Phantom Onslaught: Resolve test ' +
        v +
        ' against ' +
        mi.R +
        (c.wi.pass ? ' passed: −1″ Charge Distance.' : ' failed: no Shock and −2 Impact this round.')
    );
    if (!c.wi.pass && !act.extraFx.includes('Phantom Onslaught (no Shock, Impact −2)'))
      act.extraFx.push('Phantom Onslaught (no Shock, Impact −2)');
  }
  const f = chargeFixed(u);
  const cd =
    (u.m || 0) +
    (f != null ? f : roll + srChargeBonus(u, byId(c.target))) +
    (c.pu ? 2 : 0) -
    (c.wi && c.wi.pass ? 1 : 0);
  c.cd = cd;
  if (cd >= c.dist - 1e-6) {
    c.success = true;
    if (placeCharge()) {
      c.stage = 'adjust';
      if (!aiBusy && (PVP() || SBX() || base(act.id).side !== AI)) {
        const pl = c.plan;
        c.alts = pl.alts && pl.alts.length ? pl.alts : [pl];
        c.altI = Math.max(0, c.alts.indexOf(pl));
        c.stage = 'place';
        Object.assign(act.pose, { x: pl.start.x, y: pl.start.y, facing: pl.start.facing });
        act.tgtPose = null;
        render();
        return;
      }
      if (!aiBusy) {
        c.animating = true;
        animateCharge(c.plan).then(() => {
          c.animating = false;
          if (act && act.cur === c) finishAction();
          else render();
        });
      }
    } else c.stage = 'blocked';
  } else if (
    (hasRule(u, /Unstoppable/) || u.bearer) &&
    !c.rerolled &&
    chargeFixed(u) == null &&
    !noChargeReroll(u)
  ) {
    c.stage = 'reroll';
  } else failCharge();
  render();
}
function failCharge() {
  const u = byId(act.id),
    c = act.cur;
  const a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)];
  let k = c.roll || 0,
    p = { x: c.start.x + f[0] * k, y: c.start.y + f[1] * k };
  const near = pp => {
    const A = corners(Object.assign({}, u, pp));
    return all().some(o => o.onTable && o.side !== u.side && polyDist(A, corners(o)) < 1);
  };
  while (k > 0 && near(p)) {
    k = Math.max(0, +(k - 0.1).toFixed(2));
    p = { x: c.start.x + f[0] * k, y: c.start.y + f[1] * k };
  }
  Object.assign(act.pose, p);
  act.chargeFailed = true;
  act.actions.push({
    type: 'charge',
    free: false,
    from: c.start,
    to: { x: p.x, y: p.y, facing: u.facing || 0, files: geom(u).files },
    roll: c.roll,
    rerolled: !!c.rerolled,
    target: c.target,
    dist: +c.dist.toFixed(2),
    result: 'failed',
    moved: k
  });
  act.cur = null;
  toast('Charge failed. The regiment moves ' + k.toFixed(1) + '″ straight forward and its activation ends.');
  if (encyOpt(u, /Hurl It/i)) {
    const T = byId(c.target);
    if (T && T.onTable && !T.destroyed) {
      const V = Math.min(6, (+(u.stats || {}).V || 0) + 1),
        d = d6(),
        hit = d <= V,
        n = uSize(T);
      setTimeout(() => {
        banner(
          'Hurl It! Barrage (1), Aimed Shot',
          [{ v: d, cls: hit ? 'hit' : 'miss' }],
          'hits on ' + V + ' or less'
        );
        setTimeout(bannerHide, 2400);
        if (hit) {
          toast(
            'Hurl It! hits ' +
              (T.short || T.name) +
              ': ' +
              n +
              ' wound' +
              (n === 1 ? '' : 's') +
              ' (its Size), no Defense or Morale.'
          );
          putState({
            units: hurt(state.units, T.id, n),
            lastTitle: N(u.side) + ' · Hurl It!',
            lastText:
              (u.short || u.name) +
              ' falls short but hurls something at ' +
              (T.short || T.name) +
              ': ' +
              n +
              ' wound' +
              (n === 1 ? '' : 's') +
              '.'
          });
        } else toast('Hurl It! misses.');
      }, 400);
    }
  }
}
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
/* ================= Charge Move planner (core rules, Charge): one free Wheel of up to 90° at the start, a straight Charge Move until contact,
   then "close the door" (pivot up to 90° at the contact point) flush onto the Charged facing. If the charger cannot pivot, the target pivots instead
   (only if it is not engaged). Priorities: 1 legal (no overlapping or touching other enemies, engaged friends, Impassable or Garrison terrain;
   unengaged friends may be passed through but not ended on), 2 most stands in contact, 3 shortest Charge Move. ================= */
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
function terrBlockPoly(u, P) {
  if (u.garrison) return null;
  const pts = P.concat(
    P.map((p, i) => {
      const q = P[(i + 1) % P.length];
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    }),
    [[P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length]]
  );
  for (const t of terrainOf()) {
    if (
      tHas(t, 'Impassable') &&
      !rh(RU(u), 'Fly') &&
      pts.some(q => ((q[0] - t.x) / t.rx) ** 2 + ((q[1] - t.y) / (t.ry * 0.85)) ** 2 <= 1)
    )
      return tInfo(t).name;
    if (tHas(t, 'Garrison') && pts.some(q => inT(t, q))) return tInfo(t).name;
  }
  return null;
}
function chgFaceGeom(t, face) {
  const Gt = geom(t),
    at = ((t.facing || 0) * Math.PI) / 180,
    ft = [Math.sin(at), Math.cos(at)],
    rt = [Math.cos(at), -Math.sin(at)];
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
  return { face, n, e, along, half, fac: ((Math.atan2(-n[0], -n[1]) * 180) / Math.PI + 360) % 360 };
}
/* the facings the charge may go into: the one holding most of the charger's front-rank stands (a tie lets the player choose) */
function chargeFaces(u, t) {
  const Gc = geom(u),
    ac = ((u.facing || 0) * Math.PI) / 180,
    fc = [Math.sin(ac), Math.cos(ac)],
    rc = [Math.cos(ac), -Math.sin(ac)],
    cnt = { front: 0, rear: 0, left: 0, right: 0 };
  standsOf(u)
    .filter(s => s.rank === 0)
    .forEach(s => {
      const fs = new Set(
        s.poly
          .concat([[s.poly.reduce((a, p) => a + p[0], 0) / 4, s.poly.reduce((a, p) => a + p[1], 0) / 4]])
          .map(p => arcOf(t, p))
      );
      fs.forEach(f => cnt[f]++);
    });
  if (!Object.values(cnt).some(Boolean))
    for (let i = 0; i < Gc.files; i++) {
      const o = -Gc.w / 2 + Gc.sw * (i + 0.5);
      cnt[
        arcOf(t, [
          u.x + fc[0] * (Gc.d / 2 - Gc.sd / 2) + rc[0] * o,
          u.y + fc[1] * (Gc.d / 2 - Gc.sd / 2) + rc[1] * o
        ])
      ]++;
    }
  const mx = Math.max(...Object.values(cnt));
  return Object.keys(cnt).filter(k => cnt[k] === mx && mx > 0);
}
function chgScore(u, t, P, F) {
  const U = Object.assign({}, u, P),
    fr = standsOf(U).filter(s => s.rank === 0),
    ts = standsOf(t);
  let pairs = 0;
  const pr = P => {
    const v = P.map(p => (p[0] - F.e[0]) * F.along[0] + (p[1] - F.e[1]) * F.along[1]);
    return [Math.min(...v), Math.max(...v)];
  };
  const tA = new Set(),
    tB = new Set();
  fr.forEach((a, i) =>
    ts.forEach((b, j) => {
      if (polyDist(a.poly, b.poly) > 0.06) return;
      const A = pr(a.poly),
        B = pr(b.poly);
      if (Math.min(A[1], B[1]) - Math.max(A[0], B[0]) > 0.2) {
        tA.add(i);
        tB.add(j);
      }
    })
  );
  pairs = tA.size + tB.size;
  const C = corners(U),
    proj = C.map(p => (p[0] - F.e[0]) * F.along[0] + (p[1] - F.e[1]) * F.along[1]),
    lo = Math.max(Math.min(...proj), -F.half),
    hi = Math.min(Math.max(...proj), F.half);
  return { pairs, len: Math.max(0, hi - lo) };
}
function planCharge(u0, t, cd) {
  const u = Object.assign({}, u0),
    start = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files },
    T = corners(t),
    G = geom(u);
  const others = all().filter(o => o.onTable && !o.destroyed && o.id !== u.id && o.id !== t.id),
    onEdge = P => P.every(q => q[0] >= -0.01 && q[0] <= 72.01 && q[1] >= -0.01 && q[1] <= 48.01);
  const engF = new Set(
    others.filter(o => o.side === u.side && o.type !== 'marker' && engaged(o).length).map(o => o.id)
  );
  const why = [];
  let blkPoly = null; /* outline of whatever blocked the last check (a regiment), for the failure preview */
  const block = (P, final) => {
    blkPoly = null;
    if (!onEdge(P)) return 'the table edge';
    for (const o of others) {
      const C = corners(o);
      if (o.side !== u.side) {
        if (polyDist(P, C) <= 0.01) {
          blkPoly = C;
          return o.short || o.name;
        }
      } else if ((final || engF.has(o.id)) && polyOverlap(P, C)) {
        blkPoly = C;
        return o.short || o.name;
      }
    }
    const tb = terrBlockPoly(u, P);
    return tb;
  };
  const PU = p => corners(Object.assign({}, u, p));
  const faces = chargeFaces(u, t);
  const cands = [];
  for (const face of faces) {
    const F = chgFaceGeom(t, face);
    for (let th = -90; th <= 90; th += 1) {
      const dir = th >= 0 ? 'right' : 'left',
        P1 = th ? wheelPose(start, u, dir, Math.abs(th)) : Object.assign({}, start);
      const a = (P1.facing * Math.PI) / 180,
        f = [Math.sin(a), Math.cos(a)];
      const C1 = PU(P1);
      if (polyOverlap(C1, T)) continue;
      let s = rayHit(C1, T, f);
      if (!isFinite(s) || s > cd + 0.01) continue;
      s = Math.max(0, s - 0.002);
      const P2 = Object.assign({}, P1, { x: P1.x + f[0] * s, y: P1.y + f[1] * s }),
        C2 = PU(P2);
      const cp = closestPts(C2, T);
      if (!cp || cp[0] > 0.05) continue;
      const p = cp[1],
        q = cp[2],
        pv = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const al = (p[0] - P2.x) * f[0] + (p[1] - P2.y) * f[1];
      if (Math.abs(al - G.d / 2) > 0.06) continue;
      if (Math.abs((q[0] - F.e[0]) * F.n[0] + (q[1] - F.e[1]) * F.n[1]) > 0.06) continue;
      if (Math.abs((q[0] - F.e[0]) * F.along[0] + (q[1] - F.e[1]) * F.along[1]) > F.half + 0.06) continue;
      const dl = angDiff(F.fac, P2.facing);
      if (Math.abs(dl) > 90.01) continue;
      let P3 = rotAbout(P2, pv, dl);
      P3.facing = F.fac;
      {
        const b = (F.fac * Math.PI) / 180,
          f3 = [Math.sin(b), Math.cos(b)],
          fc = [P3.x + (f3[0] * G.d) / 2, P3.y + (f3[1] * G.d) / 2],
          off = (fc[0] - F.e[0]) * F.n[0] + (fc[1] - F.e[1]) * F.n[1];
        P3.x -= F.n[0] * off;
        P3.y -= F.n[1] * off;
      }
      const sc = chgScore(u, t, P3, F);
      if (!sc.pairs && sc.len < 0.05) continue;
      cands.push({ face, F, th, dir, P1, P2, P3, s, pv, dl, sc });
    }
  }
  cands.sort(
    (a, b) => b.sc.pairs - a.sc.pairs || b.sc.len - a.sc.len || a.s - b.s || Math.abs(a.th) - Math.abs(b.th)
  );
  let failAt = null; /* where the last legality check failed: { phase, f } */
  const sweep = (fn, n, final) => {
    for (let k = 0; k <= n; k++) {
      const r = block(fn(k / n), final && k === n);
      if (r) {
        failAt = { f: Math.max(0, (k - 1) / n), fHit: k / n };
        return r;
      }
    }
    return null;
  };
  const legal = c => {
    let r = sweep(
      k => PU(c.th ? wheelPose(start, u, c.dir, Math.abs(c.th) * k) : start),
      Math.max(1, Math.ceil(Math.abs(c.th) / 2))
    );
    if (r) {
      failAt.phase = 'wheel';
      return (window.__chgDbg ? 'W:' : '') + r;
    }
    if (
      sweep(
        k => PU(c.th ? wheelPose(start, u, c.dir, Math.abs(c.th) * k) : start),
        Math.max(1, Math.ceil(Math.abs(c.th) / 2))
      ) === null &&
      false
    )
      return null;
    {
      const a = (c.P1.facing * Math.PI) / 180,
        f = [Math.sin(a), Math.cos(a)];
      r = sweep(
        k => PU(Object.assign({}, c.P1, { x: c.P1.x + f[0] * c.s * k, y: c.P1.y + f[1] * c.s * k })),
        Math.max(1, Math.ceil(c.s / 0.25))
      );
      if (r) {
        failAt.phase = 'move';
        return (window.__chgDbg ? 'M:' : '') + r;
      }
    }
    for (let k = 0; k <= Math.max(1, Math.ceil(Math.abs(c.dl) / 2)); k++) {
      const nd = Math.max(1, Math.ceil(Math.abs(c.dl) / 2));
      const P = PU(rotAbout(c.P2, c.pv, (c.dl * k) / nd));
      if (k && polyOverlap(P, T)) {
        blkPoly = T;
        failAt = { phase: 'door', f: (k - 1) / nd, fHit: k / nd };
        return 'the target';
      }
      const b = block(P, false);
      if (b) {
        failAt = { phase: 'door', f: Math.max(0, (k - 1) / nd), fHit: k / nd };
        return (window.__chgDbg ? 'D:' : '') + b;
      }
    }
    const fb = block(PU(c.P3), true);
    if (fb) failAt = { phase: 'final', f: 1, fHit: 1 };
    return fb;
  };
  if (window.__chgDbg)
    window.__chgDbg.push({
      n: cands.length,
      top: cands.slice(0, 400).map(c => [c.th, c.sc.pairs, +c.s.toFixed(2), legal(c)])
    });
  let fail = null; /* the best Charge Move tried, and where it was blocked */
  {
    let first = null;
    const alts = [],
      seen = new Set();
    let ev = 0;
    for (const c of cands) {
      if (first && c.sc.pairs < first.pairs) break;
      const off = (c.P3.x - c.F.e[0]) * c.F.along[0] + (c.P3.y - c.F.e[1]) * c.F.along[1],
        key = c.face + ':' + Math.round(off / 0.25);
      if (first && (seen.has(key) || ++ev > 80)) continue;
      const r = legal(c);
      if (r) {
        if (!first) why.push(r);
        if (!first && !fail && failAt)
          fail = Object.assign({}, failAt, {
            by: r.replace(/^[A-Z]:/, ''),
            blk: blkPoly,
            start,
            th: c.th,
            dir: c.dir,
            P1: c.P1,
            P2: c.P2,
            P3: c.P3,
            s: c.s,
            pv: c.pv,
            dl: c.dl,
            face: c.face
          });
        continue;
      }
      seen.add(key);
      const o = {
        ok: true,
        start,
        face: c.face,
        F: c.F,
        th: c.th,
        dir: c.dir,
        P1: c.P1,
        P2: c.P2,
        P3: c.P3,
        s: c.s,
        pv: c.pv,
        dl: c.dl,
        pairs: c.sc.pairs,
        off
      };
      if (!first) first = o;
      alts.push(o);
    }
    if (first) {
      alts.sort((a, b) => (a.face === b.face ? a.off - b.off : a.face < b.face ? -1 : 1));
      first.alts = alts;
      return first;
    }
  }
  /* the charger cannot close the door: the target pivots instead, if it is not engaged */
  if (!engaged(t).filter(e => e.id !== u.id).length && t.type !== 'marker')
    for (const c of cands) {
      let r = sweep(
        k => PU(c.th ? wheelPose(start, u, c.dir, Math.abs(c.th) * k) : start),
        Math.max(1, Math.ceil(Math.abs(c.th) / 2))
      );
      if (!r) {
        const a = (c.P1.facing * Math.PI) / 180,
          f = [Math.sin(a), Math.cos(a)];
        r = sweep(
          k => PU(Object.assign({}, c.P1, { x: c.P1.x + f[0] * c.s * k, y: c.P1.y + f[1] * c.s * k })),
          Math.max(1, Math.ceil(c.s / 0.25))
        );
      }
      if (r || block(PU(c.P2), true)) continue;
      const n = Math.max(1, Math.ceil(Math.abs(c.dl) / 2)),
        tp = k => rotAbout({ x: t.x, y: t.y, facing: t.facing || 0 }, c.pv, -c.dl * k);
      const tOthers = all().filter(o => o.onTable && !o.destroyed && o.id !== t.id && o.id !== u.id);
      let bad = null;
      for (let k = 1; k <= n && !bad; k++) {
        const TP = corners(Object.assign({}, t, tp(k / n)));
        if (!TP.every(q => q[0] >= -0.01 && q[0] <= 72.01 && q[1] >= -0.01 && q[1] <= 48.01))
          bad = 'the table edge';
        else if (polyOverlap(TP, PU(c.P2))) bad = 'the charger';
        else {
          for (const o of tOthers)
            if (polyOverlap(TP, corners(o))) {
              bad = o.short || o.name;
              break;
            }
          if (!bad) bad = terrBlockPoly(t, TP);
        }
      }
      if (bad) continue;
      const TF = tp(1);
      const t2 = Object.assign({}, t, TF),
        F2 = chgFaceGeom(t2, c.face),
        P3 = Object.assign({}, c.P2);
      {
        const b = (P3.facing * Math.PI) / 180,
          f3 = [Math.sin(b), Math.cos(b)],
          fc = [P3.x + (f3[0] * G.d) / 2, P3.y + (f3[1] * G.d) / 2],
          off = (fc[0] - F2.e[0]) * F2.n[0] + (fc[1] - F2.e[1]) * F2.n[1];
        P3.x -= F2.n[0] * off;
        P3.y -= F2.n[1] * off;
      }
      return {
        ok: true,
        start,
        face: c.face,
        F: F2,
        th: c.th,
        dir: c.dir,
        P1: c.P1,
        P2: c.P2,
        P3,
        s: c.s,
        pv: c.pv,
        dl: 0,
        tgtPose: { x: TF.x, y: TF.y, facing: TF.facing },
        pairs: c.sc.pairs
      };
    }
  const w = why.filter(Boolean);
  return {
    ok: false,
    start,
    fail,
    why: w.length
      ? [...new Set(w)].slice(0, 2).join(' and ')
      : cands.length
        ? ''
        : 'no straight Charge Move reaches the ' + faces.join(' or ') + ' within ' + cd + '″'
  };
}
/* ===== Preview of a Charge that cannot be made: a see-through regiment follows the best Charge Move the planner tried
   (wheel, straight move, close the door) and stops where it is blocked; the blocking contact is marked in red. ===== */
function chargePathPose(fl, u, e) {
  /* pose along the attempted path; e runs 0..1 over wheel, move and door, ending at the failure point */
  const segs = [];
  const upto = { wheel: 0, move: 1, door: 2, final: 3 }[fl.phase];
  if (fl.th) segs.push(k => wheelPose(fl.start, u, fl.dir, Math.abs(fl.th) * k));
  segs.push(k => {
    const a = (fl.P1.facing * Math.PI) / 180;
    return Object.assign({}, fl.P1, {
      x: fl.P1.x + Math.sin(a) * fl.s * k,
      y: fl.P1.y + Math.cos(a) * fl.s * k
    });
  });
  if (fl.dl) segs.push(k => Object.assign(rotAbout(fl.P2, fl.pv, fl.dl * k)));
  /* how much of each segment is played */
  const plays = [];
  if (fl.th) plays.push(upto === 0 ? fl.f : 1);
  if (upto >= 1) plays.push(upto === 1 ? fl.f : 1);
  if (fl.dl && upto >= 2) plays.push(upto === 2 ? fl.f : 1);
  const n = plays.length,
    i = Math.min(n - 1, Math.floor(e * n)),
    k = e >= 1 ? 1 : e * n - i;
  return segs[i](plays[i] * k);
}
let chgFailAnim = 0;
async function previewChargeFail() {
  const c = act && act.cur,
    ill = c && c.illegal,
    fl = ill && ill.fail;
  const ug = $('units');
  if (!fl || !ug) return;
  const u0 = Object.assign({}, base(act.id), act.pose),
    myRun = ++chgFailAnim;
  let g = $('cfail');
  if (!g) g = el('g', { id: 'cfail', 'pointer-events': 'none' }, ug.parentNode);
  else g.parentNode.appendChild(g);
  const draw = (pose, done) => {
    g.innerHTML = '';
    const gu = Object.assign({}, u0, pose),
      col = done ? '#E57373' : '#FFE58A';
    el(
      'line',
      {
        x1: px(fl.start.x),
        y1: py(fl.start.y),
        x2: px(pose.x),
        y2: py(pose.y),
        stroke: col,
        'stroke-width': 1.6,
        'stroke-dasharray': '4 3'
      },
      g
    );
    standsOf(gu).forEach(s2 =>
      el(
        'polygon',
        {
          points: s2.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
          fill: COL[u0.side] ? COL[u0.side].fill : '#888',
          'fill-opacity': 0.35,
          stroke: col,
          'stroke-width': 1.4,
          'stroke-dasharray': '3 2'
        },
        g
      )
    );
    if (!done) return;
    /* the point of failure: where the next step would touch or overlap what blocks it */
    const hitPose = chargePathPose(Object.assign({}, fl, { f: fl.fHit }), u0, 1),
      HP = corners(Object.assign({}, u0, hitPose));
    let pt = [hitPose.x, hitPose.y];
    if (fl.blk) {
      const cp = closestPts(HP, fl.blk);
      if (cp) pt = [(cp[1][0] + cp[2][0]) / 2, (cp[1][1] + cp[2][1]) / 2];
      el(
        'polygon',
        {
          points: fl.blk.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
          fill: 'none',
          stroke: '#E57373',
          'stroke-width': 2.4
        },
        g
      );
    }
    el('circle', { cx: px(pt[0]), cy: py(pt[1]), r: 9, fill: 'none', stroke: '#E57373', 'stroke-width': 2.5 }, g);
    el('circle', { cx: px(pt[0]), cy: py(pt[1]), r: 3, fill: '#E57373' }, g);
    const t = el(
      'text',
      {
        x: px(pt[0]),
        y: py(pt[1]) - 14,
        'text-anchor': 'middle',
        fill: '#E57373',
        'font-size': 12,
        'font-weight': 700,
        'font-family': 'Alegreya Sans, sans-serif',
        stroke: '#1C2421',
        'stroke-width': 3,
        'paint-order': 'stroke'
      },
      g
    );
    t.textContent = chargeFailText(fl);
  };
  const ms = RM ? 0 : 1600,
    t0 = performance.now();
  await new Promise(res => {
    const step = now => {
      if (myRun !== chgFailAnim) return res();
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      draw(chargePathPose(fl, u0, ease(k)), k >= 1);
      if (k < 1) requestAnimationFrame(step);
      else res();
    };
    requestAnimationFrame(step);
  });
  setTimeout(() => {
    if (myRun === chgFailAnim && g.parentNode) g.innerHTML = '';
  }, 6000);
}
function chargeFailText(fl) {
  const what = fl.by || 'something';
  return fl.phase === 'wheel'
    ? 'Blocked while wheeling: ' + what
    : fl.phase === 'move'
      ? (/table edge/.test(what) ? 'Runs off ' : 'Blocked: would touch ') + what
      : fl.phase === 'door'
        ? 'Cannot close the door: ' + what
        : 'Cannot end here: ' + what;
}
function clearChargeFail() {
  chgFailAnim++;
  const g = $('cfail');
  if (g) g.innerHTML = '';
}
/* play the Charge Move: wheel, straight move, close the door */
async function chargeGo() {
  const c = act.cur;
  if (!c || c.stage !== 'place') return;
  const pl = c.alts[c.altI] || c.plan;
  c.plan = pl;
  Object.assign(c, { face: pl.face, e: pl.F.e, n: pl.F.n, along: pl.F.along, half: pl.F.half });
  act.tgtPose = null;
  c.stage = 'adjust';
  c.animating = true;
  render();
  animateCharge(pl).then(() => {
    c.animating = false;
    if (act && act.cur === c) finishAction();
    else render();
  });
}
function drawChargeGhost(g) {
  const c = act.cur,
    pl = c.alts[c.altI] || c.plan;
  if (!pl) return;
  const u0 = base(act.id);
  const pts = [
    [pl.start.x, pl.start.y],
    [pl.P1.x, pl.P1.y],
    [pl.P2.x, pl.P2.y],
    [pl.P3.x, pl.P3.y]
  ];
  el(
    'polyline',
    {
      points: pts.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
      fill: 'none',
      stroke: '#FFE58A',
      'stroke-width': 2,
      'stroke-dasharray': '5 4',
      opacity: 0.9
    },
    g
  );
  c.alts.forEach((a, i) => {
    if (i === c.altI) return;
    el('circle', { cx: px(a.P3.x), cy: py(a.P3.y), r: 3, fill: '#FFE58A', opacity: 0.45 }, g);
  });
  standsOf(Object.assign({}, u0, { x: pl.P3.x, y: pl.P3.y, facing: pl.P3.facing })).forEach(s =>
    el(
      'polygon',
      {
        points: s.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
        fill: COL[u0.side] ? COL[u0.side].fill : '#888',
        'fill-opacity': 0.35,
        stroke: '#FFE58A',
        'stroke-width': 1.4,
        'stroke-dasharray': '3 2'
      },
      g
    )
  );
  if (pl.tgtPose) {
    const t = base(c.target);
    if (t)
      standsOf(Object.assign({}, t, pl.tgtPose)).forEach(s =>
        el(
          'polygon',
          {
            points: s.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
            fill: 'none',
            stroke: '#FFFFFF',
            'stroke-width': 1.2,
            'stroke-dasharray': '3 2',
            opacity: 0.8
          },
          g
        )
      );
  }
}
async function animateCharge(pl) {
  const u = byId(act.id);
  Object.assign(act.pose, { x: pl.start.x, y: pl.start.y, facing: pl.start.facing });
  if (pl.th)
    await animFrames(Math.round(250 + (350 * Math.abs(pl.th)) / 90), e => {
      const p = wheelPose(pl.start, u, pl.dir, Math.abs(pl.th) * e);
      Object.assign(act.pose, { x: p.x, y: p.y, facing: p.facing });
    });
  {
    const a = (pl.P1.facing * Math.PI) / 180,
      f = [Math.sin(a), Math.cos(a)];
    await animFrames(Math.round(Math.min(1400, 250 + 110 * pl.s)), e => {
      Object.assign(act.pose, {
        x: pl.P1.x + f[0] * pl.s * e,
        y: pl.P1.y + f[1] * pl.s * e,
        facing: pl.P1.facing
      });
    });
  }
  if (pl.tgtPose) {
    const tid = act.cur && act.cur.target,
      t = base(tid),
      t0 = t ? { x: t.x, y: t.y, facing: t.facing || 0 } : null;
    if (t0) {
      const d = angDiff(pl.tgtPose.facing, t0.facing);
      await animFrames(Math.round(250 + (350 * Math.abs(d)) / 90), e => {
        const p = rotAbout(t0, pl.pv, d * e);
        act.tgtPose = { id: tid, pose: { x: p.x, y: p.y, facing: p.facing } };
      });
      act.tgtPose = { id: tid, pose: pl.tgtPose };
    }
  } else if (pl.dl) {
    const P2 = pl.P2;
    await animFrames(Math.round(250 + (350 * Math.abs(pl.dl)) / 90), e => {
      const p = rotAbout(P2, pl.pv, pl.dl * e);
      Object.assign(act.pose, { x: p.x, y: p.y, facing: p.facing });
    });
  }
  Object.assign(act.pose, { x: pl.P3.x, y: pl.P3.y, facing: pl.P3.facing });
}

function rollPicker(label, cb) {
  const w = document.createElement('div');
  w.className = 'row';
  const sel = document.createElement('select');
  sel.id = 'chg-roll';
  sel.setAttribute('aria-label', 'Charge roll');
  for (let i = 1; i <= 6; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = i;
    sel.appendChild(o);
  }
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = label;
  b.onclick = () => cb(+sel.value);
  w.append(sel, b);
  return w;
}
function cancelAction() {
  clearChargeFail();
  if (!act.cur) return;
  if (act.cur.type === 'withdraw') {
    toast('The Withdraw test has been rolled. March away, or press "Withdraw fails".');
    return;
  }
  if (act.cur.type === 'creform') {
    toast(
      'The Resolve test has been rolled. Finish the Combat Reform; keeping the same formation is allowed.'
    );
    return;
  }
  Object.assign(act.pose, {
    x: act.cur.start.x,
    y: act.cur.start.y,
    facing: act.cur.start.facing,
    files: act.cur.start.files
  });
  act.cur = null;
  render();
}
function startActivation(id, source, card) {
  if (PVP() && !myTurnPvp()) {
    toast('It is not your turn.');
    return;
  }
  const u = base(id),
    G = geom(u);
  const entering = !u.onTable;
  act = {
    id,
    source,
    card: card || null,
    entering,
    placed: false,
    snap: { units: state.units, fr: state.fr || null, sup: state.sup || null },
    actions: [],
    cur: null,
    arrivedThisRound: !!u.arrivedRound && u.arrivedRound === state.round,
    pose: entering
      ? Object.assign({ onTable: true, x: 36, files: G.files }, ownEntry(u.side, G.d))
      : { x: u.x, y: u.y, facing: u.facing || 0, files: G.files },
    extraFx:
      source === 'strategic' || (source === 'entourage' && ordersU(u))
        ? (hasRule(u, /Automaton/)
            ? []
            : [source === 'entourage' ? 'Inspired (Direct Orders)' : 'Inspired (Strategic Stack)']
          )
            .concat(u.strategicFx || [])
            .concat(
              /Infantry|Cavalry/.test(u.cls || '') && supOn(u.side, 'Hammer and Anvil')
                ? ['Shock (Hammer and Anvil)']
                : []
            )
            .concat(
              source === 'strategic' &&
                supOn(u.side, 'Bringing Back the Children of Fire') &&
                frRoles(u).includes('Titan')
                ? ['Children of Fire (counts as 6 stands for Seizing)']
                : []
            )
        : []
  };
  selId = id;
  rightTab = 'reg';
  render();
  drawEvents(u);
  if (card && yCard(card) && frFac(u) === 'Yoroni') {
    const k = cardIdeal(card);
    if (fxHas(u, /^Ideal Card: Fu \(/)) act.frFu = true;
    if (k && !(k === 'Mu' && upgOf(u, /Ofuda/)))
      setTimeout(() => {
        if (act && act.id === id && !act.frIdeal) yApply(byId(id), k);
      }, 60);
  }
}
