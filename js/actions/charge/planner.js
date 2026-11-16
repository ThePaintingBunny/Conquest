/*
 * Charge Move planner
 *
 * Works out the Charge Move.
 *
 * In this file: chgFaceGeom(), chargeFaces(), chgScore(), planCharge()
 */

/* ================= Charge Move planner (core rules, Charge): one free Wheel of up to 90° at the start, a straight Charge Move until contact,
   then "close the door" (pivot up to 90° at the contact point) flush onto the Charged facing. If the charger cannot pivot, the target pivots instead
   (only if it is not engaged). Priorities: 1 legal (no overlapping or touching other enemies, engaged friends, Impassable or Garrison terrain;
   unengaged friends may be passed through but not ended on), 2 most stands in contact, 3 shortest Charge Move. ================= */
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
  const S = standsOf(u);
  if (S.length === 1) {
    /* "A Single Stand Regiment Charges a Target Regiment in the facing the majority of its Stand is in" */
    const [a, b, , d] = S[0].poly,
      N = 12;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const x = (i + 0.5) / N,
          y = (j + 0.5) / N;
        cnt[
          arcOf(t, [
            a[0] + (b[0] - a[0]) * x + (d[0] - a[0]) * y,
            a[1] + (b[1] - a[1]) * x + (d[1] - a[1]) * y
          ])
        ]++;
      }
    const m1 = Math.max(...Object.values(cnt));
    return Object.keys(cnt).filter(k => cnt[k] === m1 && m1 > 0);
  }
  /* "A Stand may find itself in more than one facing": it counts toward each of them */
  S.filter(s => s.rank === 0).forEach(s => {
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
  const fly = rh(
    RU(u),
    'Fly'
  ); /* Fly: may Charge over friendly regiments, even engaged ones, but not end on them */
  let blkPoly = null; /* outline of whatever blocked the last check (a regiment), for the failure preview */
  const block = (P, final, pz) => {
    blkPoly = null;
    if (!onEdge(P)) return 'the table edge';
    for (const o of others) {
      const C = corners(o);
      if (o.side !== u.side) {
        if (polyDist(P, C) <= 0.01) {
          /* while finalising the Charge an unengaged enemy in the way is pushed up to 1″ directly away */
          if (pz && o.type !== 'marker' && !engaged(o).length) {
            pz.add(o.id);
            continue;
          }
          blkPoly = C;
          return o.short || o.name;
        }
      } else if ((final || (engF.has(o.id) && !fly)) && polyOverlap(P, C)) {
        /* friends: unengaged ones may be passed through, engaged ones only by a Fly regiment; no one may end on top of another */
        blkPoly = C;
        return o.short || o.name;
      }
    }
    const tb = terrBlockPoly(u, P, final, t.garrison);
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
    /* most stands in contact, then the longest stretch of the charged face, then the least turning (free Wheel + closing the door), then the shortest move */
    (a, b) =>
      b.sc.pairs - a.sc.pairs ||
      b.sc.len - a.sc.len ||
      Math.abs(a.th) + Math.abs(a.dl) - (Math.abs(b.th) + Math.abs(b.dl)) ||
      a.s - b.s
  );
  /* among Charge Moves that are equally good (same stands and the same stretch of the face in contact), prefer one
     whose stands meet the target's stands edge to edge. Only the Wheel, the straight move and closing the door decide
     where it ends: the charger is never slid along the face afterwards. */
  {
    const prj = (F, p) => (p[0] - F.e[0]) * F.along[0] + (p[1] - F.e[1]) * F.along[1],
      edges = (L, F) => [...new Set(L.flatMap(st => st.poly.map(p => +prj(F, p).toFixed(2))))],
      tEdges = {};
    const mis = c => {
      const TE = (tEdges[c.face] =
        tEdges[c.face] || edges(standsOf(t), c.F).filter(v => v >= -c.F.half - 0.05 && v <= c.F.half + 0.05));
      const fr = standsOf(Object.assign({}, u, c.P3)).filter(st => st.rank === 0);
      return edges(fr, c.F)
        .filter(v => v >= -c.F.half - 0.05 && v <= c.F.half + 0.05)
        .reduce((a, v) => a + Math.min(...TE.map(te => Math.abs(te - v))), 0);
    };
    cands.forEach(c => (c.mis = mis(c)));
    cands.sort(
      (a, b) =>
        b.sc.pairs - a.sc.pairs ||
        Math.round((b.sc.len - a.sc.len) * 20) ||
        (a.mis > 0.05) - (b.mis > 0.05) ||
        Math.abs(a.th) + Math.abs(a.dl) - (Math.abs(b.th) + Math.abs(b.dl)) ||
        a.s - b.s
    );
  }
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
    const pz = new Set(),
      doorPolys = [];
    for (let k = 0; k <= Math.max(1, Math.ceil(Math.abs(c.dl) / 2)); k++) {
      const nd = Math.max(1, Math.ceil(Math.abs(c.dl) / 2));
      const P = PU(rotAbout(c.P2, c.pv, (c.dl * k) / nd));
      if (k && polyOverlap(P, T)) {
        blkPoly = T;
        failAt = { phase: 'door', f: (k - 1) / nd, fHit: k / nd };
        return 'the target';
      }
      const b = block(P, false, pz);
      if (b) {
        failAt = { phase: 'door', f: Math.max(0, (k - 1) / nd), fHit: k / nd };
        return (window.__chgDbg ? 'D:' : '') + b;
      }
      doorPolys.push(P);
    }
    const fb = block(PU(c.P3), true, pz);
    if (fb) {
      failAt = { phase: 'final', f: 1, fHit: 1 };
      return fb;
    }
    doorPolys.push(PU(c.P3));
    c.push = [];
    for (const id of pz) {
      const o = byId(id),
        r = pushAway(o, doorPolys, [c.P3.x, c.P3.y], 0.01, 1, [u.id, t.id]);
      if (!r) {
        blkPoly = corners(o);
        failAt = { phase: 'final', f: 1, fHit: 1 };
        return (o.short || o.name) + ' (it cannot be pushed 1″ away)';
      }
      c.push.push(o.short || o.name);
    }
    return null;
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
        push: c.push || [],
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
