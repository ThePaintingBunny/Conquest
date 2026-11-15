/*
 * Action executors
 *
 * Carries out each step of Claude's plan on the table: enter, March, Reform, Charge, Clash, Volley,
 * cast, Withdraw.
 *
 * In this file: canDo(), aiRl(), exEnter(), aiSeg(), fwdLegal(), exMarch(), describeSpec(), exReform(),
 *   exCharge(), exClash(), exVolley(), exRegCast(), exSimple(), exCReform(), exWithdraw(),
 *   resolvePoint()
 */

function canDo(type) {
  const u = byId(act.id),
    a = availableActions(u).find(x => x.type === type);
  if (!a) return 'not available now';
  return a.why || '';
}

function aiRl() {
  const v = state.rl && state.rl[AI];
  return v != null ? v : 0;
}

async function exEnter(st) {
  const u = base(act.id);
  if (st.files) act.pose.files = Math.max(1, Math.min(u.stands, Math.round(+st.files) || geom(u).files));
  let e = ['own', 'west', 'east'].includes(st.edge) ? st.edge : 'own';
  const G = geom(Object.assign({}, u, act.pose));
  if (e !== 'own' && ((state.round === 3 && /Heavy/.test(u.cls || '')) || aiRl() - G.w < 0)) e = 'own';
  if (e === 'own') {
    const x = isFinite(+st.at) ? +st.at : 36;
    Object.assign(
      act.pose,
      { x: Math.max(G.w / 2, Math.min(72 - G.w / 2, x)), onTable: true },
      ownEntry(u.side, G.d)
    );
  } else {
    const lo = G.w / 2,
      hi = aiRl() - G.w / 2,
      y = Math.max(lo, Math.min(hi, isFinite(+st.at) ? +st.at : (lo + hi) / 2));
    Object.assign(
      act.pose,
      e === 'west'
        ? { x: -G.d / 2, y, facing: 90, onTable: true }
        : { x: 72 + G.d / 2, y, facing: 270, onTable: true }
    );
  }
  act.edge = e;
  confirmEntry();
  drawUnitsFast();
  await sleep(500);
  return `enters from ${e === 'own' ? 'its own table edge' : e === 'west' ? 'the west side' : 'the east side'}`;
}

async function aiSeg(mode, amt) {
  const c = act.cur,
    u = base(act.id),
    S0 = Object.assign({}, c.segStart),
    a = ((S0.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  const ms = Math.min(1500, 350 + amt * (mode[0] === 'w' ? 6 : 110));
  if (mode === 'wleft' || mode === 'wright')
    await tweenWheel(S0, u, mode === 'wright' ? 'right' : 'left', amt, ms);
  else {
    const v = mode === 'fwd' ? f : mode === 'back' ? [-f[0], -f[1]] : mode === 'sright' ? r : [-r[0], -r[1]];
    await tweenPose({ x: S0.x + v[0] * amt, y: S0.y + v[1] * amt, facing: S0.facing }, ms);
  }
  Object.assign(act.pose, { x: S0.x, y: S0.y, facing: S0.facing });
  return marchApply(mode, amt);
}

function fwdLegal(u, S0, want, offOk) {
  const a = ((S0.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)];
  let amt = Math.max(0, want);
  for (let k = 0; k < 200 && amt > 0; k++) {
    const np = { x: S0.x + f[0] * amt, y: S0.y + f[1] * amt, facing: S0.facing, files: S0.files };
    if (poseOk(u, np, { offOk })) return amt;
    amt = Math.max(0, +(amt - 0.25).toFixed(2));
  }
  return 0;
}

async function exMarch(st) {
  const why = canDo('march');
  if (why) return 'could not march (' + why + ')';
  startAction('march');
  const c = act.cur,
    u = base(act.id);
  const entering = act.entering && !act.actions.some(a => a.type === 'march');
  if (st.mode) {
    const m = ['fwd', 'back', 'sleft', 'sright'].includes(st.mode) ? st.mode : 'fwd';
    const rem = c.budget,
      costK = m === 'fwd' ? 1 : 2;
    let amt = Math.min(Math.max(0, +st.amount || 0), rem / costK);
    if (m === 'fwd') amt = fwdLegal(u, c.segStart, amt, entering);
    else {
      const S0 = c.segStart,
        a = ((S0.facing || 0) * Math.PI) / 180,
        f = [Math.sin(a), Math.cos(a)],
        r = [Math.cos(a), -Math.sin(a)],
        v = m === 'back' ? [-f[0], -f[1]] : m === 'sright' ? r : [-r[0], -r[1]];
      while (
        amt > 0 &&
        !poseOk(u, { x: S0.x + v[0] * amt, y: S0.y + v[1] * amt, facing: S0.facing, files: S0.files })
      )
        amt = Math.max(0, +(amt - 0.25).toFixed(2));
    }
    if (amt > 0.05) await aiSeg(m, amt);
  } else {
    const P = resolvePoint(st.toward);
    if (!P) {
      cancelAction();
      return 'could not march (unknown destination)';
    }
    let S0 = c.segStart;
    const G = geom(Object.assign({}, u, S0));
    let rem = c.budget;
    if (!entering) {
      const df = angDiff(heading(S0, P), S0.facing || 0);
      if (Math.abs(df) > 2) {
        const dir = df > 0 ? 'right' : 'left';
        let deg = Math.min(Math.abs(df), rem / ((G.w * Math.PI) / 180), 175);
        for (let k = 0; k < 14 && deg > 0.5; k++) {
          if (poseOk(u, wheelPose(S0, u, dir, deg))) break;
          deg *= 0.75;
        }
        if (deg > 0.5 && poseOk(u, wheelPose(S0, u, dir, deg)))
          await aiSeg(dir === 'right' ? 'wright' : 'wleft', deg);
      }
    }
    S0 = c.segStart;
    rem = c.budget - marchUsedCommitted(c);
    const dist = Math.hypot(P.x - S0.x, P.y - S0.y);
    let want = P.kind === 'zone' || P.kind === 'point' ? Math.min(rem, dist) : rem;
    if (entering) want = rem;
    let amt = fwdLegal(u, S0, want, false);
    if (!amt && entering) amt = fwdLegal(u, S0, want, true);
    if (amt > 0.05) await aiSeg('fwd', amt);
  }
  const moved = marchUsedCommitted(c);
  finishAction();
  return moved > 0.05
    ? `marches ${moved.toFixed(1)}″` + (st.toward ? ' toward ' + describeSpec(st.toward) : '')
    : 'holds its ground (no legal room to march)';
}

function describeSpec(s) {
  if (s && typeof s === 'object') return `(${(+s.x).toFixed(0)}, ${(+s.y).toFixed(0)})`;
  const t = String(s);
  if (t.startsWith('zone:')) return 'the ' + t.slice(5);
  const u = byId(t.replace(/^unit:/, ''));
  return u ? u.short || u.name : t;
}

async function exReform(st) {
  const why = canDo('reform');
  if (why) return 'could not reform (' + why + ')';
  startAction('reform');
  const u = byId(act.id),
    c = act.cur;
  let fac = typeof st.face === 'number' || /^-?\d+(\.\d+)?$/.test(String(st.face)) ? +st.face : null;
  if (fac == null) {
    const P = resolvePoint(st.face);
    fac = P ? heading(u, P) : u.facing || 0;
  }
  fac = ((fac % 360) + 360) % 360;
  const files = st.files ? Math.max(1, Math.min(u.stands, Math.round(+st.files))) : geom(u).files;
  const tgt = { x: c.start.x, y: c.start.y, facing: fac, files };
  if (!poseOk(base(act.id), tgt)) {
    tgt.files = geom(u).files;
    if (!poseOk(base(act.id), tgt)) {
      cancelAction();
      return 'could not reform (no room)';
    }
  }
  act.pose.files = tgt.files;
  await tweenPose({ x: tgt.x, y: tgt.y, facing: fac }, 700);
  finishAction();
  return `reforms to face ${describeSpec(st.face)}`;
}

async function exCharge(st) {
  const why = canDo('charge');
  if (why) return 'could not charge (' + why + ')';
  const t = byId(String(st.target || ''));
  if (!t || !t.onTable) return 'could not charge (no such target)';
  startAction('charge');
  setChargeTarget(t);
  if (!act.cur || act.cur.stage !== 'roll') {
    const m = $('toast').textContent;
    act.cur = null;
    render();
    return 'could not charge ' + (t.short || t.name) + ' (' + m + ')';
  }
  const u = byId(act.id),
    c = act.cur,
    start = Object.assign({}, c.start),
    need = Math.max(1, Math.ceil(c.dist - (u.m || 0) - 1e-6));
  let roll = 0;
  if (!jugg(u)) {
    roll = d6();
    banner(
      'Charge: ' + (u.short || u.name) + ' → ' + (t.short || t.name),
      [{ v: roll, cls: (u.m || 0) + roll >= c.dist - 1e-6 ? 'hit' : 'miss' }],
      `${c.dist.toFixed(1)}″ away · needs ${need}+ · rolled ${roll}`
    );
    await sleep(1100);
  }
  resolveCharge(roll);
  if (act.cur && act.cur.stage === 'reroll') {
    const r2 = d6();
    banner('Unstoppable re-roll', [{ v: r2, cls: (u.m || 0) + r2 >= c.dist - 1e-6 ? 'hit' : 'miss' }], '');
    await sleep(1000);
    resolveCharge(r2, true);
    roll = r2;
  }
  if (act.cur && act.cur.stage === 'blocked') failCharge();
  const to = Object.assign({}, act.pose);
  Object.assign(act.pose, { x: start.x, y: start.y, facing: start.facing });
  if (act.chargeFailed) {
    await tweenPose(to, 700);
    bannerHide();
    return `charges ${t.short || t.name} but falls short (rolled ${roll})`;
  }
  if (c.plan && c.plan.ok) await animateCharge(c.plan);
  else await tweenPose(to, 1000);
  bannerHide();
  logAI(
    `charges ${t.short || t.name}${t.type === 'marker' ? '' : ' in the ' + (c.face === 'left' || c.face === 'right' ? 'flank' : c.face)} (rolled ${roll})`
  );
  finishAction();
  await autoResolve();
  return '';
}

async function exClash(st) {
  const why = canDo('clash');
  if (why) return 'could not clash (' + why + ')';
  if (availableActions(byId(act.id)).some(a => a.type === 'assassin' && !a.why)) return exAssassin();
  if (nodeClashOffer(byId(act.id))) {
    /* Claude always detonates a Catabolic Node when it declares a Clash, resolving the blast first */
    act.nodeAsked = true;
    logAI('detonates its Catabolic Node');
    offNode(byId(act.id));
    for (let g = 0; g < 60 && (cb || cbQueue.length); g++) {
      if (!cb) {
        await sleep(200);
        continue;
      }
      await autoResolve();
    }
    const A = byId(act.id);
    if (!A || A.destroyed || !engaged(A).length) return 'detonated its Catabolic Node; no Clash followed';
  }
  startAction('clash');
  if (cb && cb.split === 'plan') {
    /* several enemies engaged: Claude assigns its stands, then resolves each pool in turn */
    const A0 = byId(act.id);
    cb.assign = splitDefault(A0, cb.engIds.map(byId), true);
    const n = new Set(Object.values(cb.assign)).size;
    splitGo();
    logAI('clashes with ' + n + ' enemy regiments, each pool on its own');
    for (let g = 0; g < 80 && (cb || cbQueue.length); g++) {
      if (!cb) {
        await sleep(200);
        continue;
      }
      await autoResolve();
    }
    return '';
  }
  if (cb && !cb.tgt) {
    const ch = cb.choices || [];
    const id = ch.includes(String(st.target)) ? String(st.target) : ch[0];
    cb.tgt = id;
    cb.groups = buildGroups('clash', byId(act.id), byId(id));
  }
  const t = byId(cb.tgt);
  logAI('clashes with ' + (t ? t.short || t.name : 'the enemy'));
  await autoResolve();
  return '';
}

async function exVolley(st) {
  const why = canDo('volley');
  if (why) return 'could not volley (' + why + ')';
  const u = byId(act.id),
    t = byId(String(st.target || '')),
    vr = volleyRange(u);
  if (!t || !t.onTable || !vr) return 'could not volley (no target)';
  let useArc = false;
  {
    let vw = volleyWhy(u, t, false);
    if (vw && !arcingWhy(u) && !volleyWhy(u, t, true)) {
      vw = '';
      useArc = true;
    }
    if (vw) return 'could not volley at ' + (t.short || t.name) + ' (' + vw + ')';
  }
  startAction('volley');
  act.cur.stage = 'combat';
  act.cur.target = t.id;
  act.cur.arcing = useArc;
  logAI('looses a' + (useArc ? 'n arcing' : '') + ' volley at ' + (t.short || t.name));
  openCombat({ type: 'volley', att: act.id, tgt: t.id, inAct: true, arcing: useArc });
  await autoResolve();
  return '';
}

async function exRegCast(st) {
  const why = canDo('cast');
  if (why) return 'could not cast (' + why + ')';
  const u = byId(act.id);
  const r = await aiCastSpell(u, false, st.spell, st.target);
  if (!r) return 'could not cast ' + (st.spell || '');
  const RC = regCaster(u) || {},
    s0 = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
  act.actions.push({ type: 'cast', free: !!RC.free, from: s0, to: s0, spell: st.spell });
  render();
  await sleep(300);
  return r;
}

async function exSimple(type, done) {
  const why = canDo(type);
  if (why) return `could not ${ACT[type].n.toLowerCase()} (${why})`;
  startAction(type);
  await sleep(400);
  return done;
}

async function exCReform() {
  const why = canDo('creform');
  if (why) return 'could not combat reform (' + why + ')';
  startAction('creform');
  if (cb) await autoResolve();
  if (!act || !act.cur) return 'combat reforms';
  const st0 = Object.assign({}, act.pose);
  crFace();
  const to = Object.assign({}, act.pose);
  Object.assign(act.pose, { x: st0.x, y: st0.y, facing: st0.facing });
  await tweenPose(to, 700);
  finishAction();
  if (act && act.cur) {
    Object.assign(act.pose, { x: act.cur.start.x, y: act.cur.start.y, facing: act.cur.start.facing });
    finishAction();
  }
  return 'combat reforms to face the enemy';
}

async function exWithdraw() {
  const why = canDo('withdraw');
  if (why) return 'could not withdraw (' + why + ')';
  startAction('withdraw');
  if (cb) await autoResolve();
  if (!act || !act.cur) return 'withdraws';
  const c = act.cur,
    u = base(act.id);
  const amt = fwdLegal(u, c.segStart, c.budget, false);
  if (amt > 0.05) {
    await aiSeg('fwd', amt);
    finishAction();
    return `withdraws ${amt.toFixed(1)}″`;
  }
  wdFail();
  return 'tries to withdraw but has no room';
}

function resolvePoint(spec) {
  if (spec && typeof spec === 'object' && isFinite(+spec.x) && isFinite(+spec.y))
    return { x: +spec.x, y: +spec.y, kind: 'point' };
  const s = String(spec || '');
  const id = s.replace(/^unit:/, ''),
    zn = s.replace(/^zone:/, '');
  const u = byId(id);
  if (u && u.onTable) return { x: u.x, y: u.y, kind: 'unit', id: u.id, enemy: u.side !== AI };
  const z = zonesOf().find(z => z.name.toLowerCase() === zn.toLowerCase());
  if (z) return { x: z.x, y: z.y, kind: 'zone' };
  return null;
}
