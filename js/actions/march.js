/*
 * March
 *
 * The March as a list of steps (forward, wheel, sideways, backward), what each step costs and applying
 * or undoing a step.
 *
 * In this file: moveCost(), budget(), wheelPose(), marchUsedCommitted(), marchUsed(), marchPose(),
 *   marchApply(), marchUndo(), curCost()
 */

function moveCost(p, st, u) {
  if (act && act.cur && act.cur.soar) {
    const dx0 = p.x - st.x,
      dy0 = p.y - st.y,
      wh =
        ((Math.abs((((((p.facing || 0) - (st.facing || 0)) % 360) + 540) % 360) - 180) * Math.PI) / 180) *
        geom(u).w;
    const d = Math.hypot(dx0, dy0);
    return { fwd: d, side: 0, wheel: wh, cost: d + wh };
  }
  const dx = p.x - st.x,
    dy = p.y - st.y,
    a = ((st.facing || 0) * Math.PI) / 180,
    fx = Math.sin(a),
    fy = Math.cos(a);
  const fwd = dx * fx + dy * fy,
    side = Math.abs(dx * fy - dy * fx);
  const wheel =
    ((Math.abs((((((p.facing || 0) - (st.facing || 0)) % 360) + 540) % 360) - 180) * Math.PI) / 180) *
    geom(u).w;
  return { fwd, side, wheel, cost: Math.max(0, fwd) + (fwd < 0 ? -2 * fwd : 0) + 2 * side + wheel };
}

function budget() {
  if (!act || !act.cur) return 0;
  return act.cur.budget;
}

function wheelPose(p, u, dir, deg) {
  const G = geom(Object.assign({}, u, p)),
    a = ((p.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    s = dir === 'right' ? 1 : -1;
  const P = [
      p.x + (f[0] * G.d) / 2 + ((r[0] * G.w) / 2) * s,
      p.y + (f[1] * G.d) / 2 + ((r[1] * G.w) / 2) * s
    ],
    th = (s * deg * Math.PI) / 180,
    vx = p.x - P[0],
    vy = p.y - P[1];
  return Object.assign({}, p, {
    x: P[0] + vx * Math.cos(th) + vy * Math.sin(th),
    y: P[1] - vx * Math.sin(th) + vy * Math.cos(th),
    facing: ((((p.facing || 0) + s * deg) % 360) + 360) % 360
  });
}

function marchUsedCommitted(c) {
  return (c.segs || []).reduce((a, s) => a + s.cost, 0);
}

function marchUsed(c) {
  return marchUsedCommitted(c) + (c.pending ? c.pending.cost : 0);
}

function marchPose(mode, amt) {
  const c = act.cur,
    u = base(act.id),
    S0 = c.segStart,
    G = geom(Object.assign({}, u, S0)),
    a = ((S0.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    rem = c.budget - marchUsedCommitted(c);
  let np, cost;
  if (mode === 'fwd') {
    cost = amt;
    np = { x: S0.x + f[0] * amt, y: S0.y + f[1] * amt };
  } else if (mode === 'back') {
    cost = 2 * amt;
    np = { x: S0.x - f[0] * amt, y: S0.y - f[1] * amt };
  } else if (mode === 'sright' || mode === 'sleft') {
    const sg = mode === 'sright' ? 1 : -1;
    cost = 2 * amt;
    np = { x: S0.x + r[0] * amt * sg, y: S0.y + r[1] * amt * sg };
  } else {
    cost = (G.w * amt * Math.PI) / 180;
    np = wheelPose(S0, u, mode === 'wright' ? 'right' : 'left', amt);
  }
  return { np, cost, rem, S0 };
}

function marchApply(mode, amt) {
  const c = act.cur,
    u = base(act.id),
    { np, cost, rem } = marchPose(mode, amt);
  if (cost > rem + 1e-6) {
    toast(`That costs ${cost.toFixed(1)}″ but only ${rem.toFixed(1)}″ is left.`);
    return false;
  }
  Object.assign(act.pose, np);
  c.segs.push({ mode, amt, cost });
  c.pending = null;
  c.segStart = { x: act.pose.x, y: act.pose.y, facing: act.pose.facing, files: act.pose.files };
  render();
  return true;
}

function marchUndo() {
  const c = act.cur;
  c.segs.pop();
  const segs = c.segs.slice();
  c.segs = [];
  c.pending = null;
  const p = { x: c.start.x, y: c.start.y, facing: c.start.facing, files: c.start.files };
  c.segStart = Object.assign({}, p);
  Object.assign(act.pose, p);
  segs.forEach(s => marchApply(s.mode, s.amt));
  render();
}

function curCost(p) {
  if (act.cur && (act.cur.type === 'march' || act.cur.withdraw) && act.cur.segs)
    return { cost: marchUsed(act.cur), fwd: 0, side: 0, wheel: 0 };
  const u = Object.assign({}, base(act.id), p);
  if (act.cur.type === 'charge') {
    return { cost: Math.hypot(p.x - act.cur.start.x, p.y - act.cur.start.y), fwd: 0, side: 0, wheel: 0 };
  }
  return moveCost(p, act.cur.start, u);
}
