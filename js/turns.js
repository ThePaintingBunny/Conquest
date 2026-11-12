/* Turns: prompt data for Claude, action executors, planning and running a turn. */
/* ---------- prompt data ---------- */
function unitBrief(u, me) {
  const G = geom(u),
    S0 = u.stats || {},
    W = +S0.W || 4;
  return {
    id: u.id,
    side: u.side === AI ? 'yours' : 'enemy',
    name: u.name + (u.charName ? ' with ' + u.charName : ''),
    class: u.cls,
    type: u.type,
    M: u.m,
    stats: { C: S0.C, A: S0.A, V: S0.V, W: S0.W, R: S0.R, D: S0.D, E: S0.E },
    rules: u.rules || [],
    abilities: (u.abilities || []).map(a => a[0]),
    character: u.charName
      ? {
          name: u.charName,
          rules: u.charRules || [],
          activated: !!u.charActivated,
          spells: (u.spells || []).map(s => s.name)
        }
      : undefined,
    onTable: !!u.onTable,
    arrivingThisRound: !!(u.arriving && !u.onTable),
    activated: !!u.activated,
    stands: live(u),
    woundsOnNextStand: (u.wounds || 0) % W,
    broken: (u.effects || []).includes('Broken'),
    effects: u.effects || [],
    x: u.onTable ? +u.x.toFixed(1) : undefined,
    y: u.onTable ? +u.y.toFixed(1) : undefined,
    facing: u.onTable ? Math.round(u.facing || 0) : undefined,
    width: G.w,
    depth: G.d,
    files: G.files,
    engagedWith: u.onTable ? engaged(u).map(e => e.id) : []
  };
}
function optionsFor(u) {
  if (!u.onTable)
    return { note: 'Arriving: the first action must be a March onto the table from an entry edge.' };
  const en = all().filter(t => t.onTable && !t.destroyed && t.side !== u.side),
    A = corners(u),
    vr = volleyRange(u);
  return {
    enemies: en.map(t => {
      const d = polyDist(A, corners(t)),
        arc = frontArcHas(u, t),
        need = Math.max(1, Math.ceil(d - (u.m || 0) - 1e-6));
      return {
        id: t.id,
        distance: +d.toFixed(1),
        inFrontArc: arc,
        chargeNeedsRoll:
          arc && d <= chargeMax(u) ? (jugg(u) ? (d <= (u.m || 0) + 5 ? 0 : null) : need) : null,
        wouldHitTheir: arcOf(t, [u.x, u.y]),
        volleyInRange: !!(vr && arc && d <= vr.range)
      };
    }),
    zones: zonesOf().map(z => ({
      name: z.name,
      distance: +Math.max(0, Math.hypot(z.x - u.x, z.y - u.y)).toFixed(1),
      bearing: (() => {
        const df = angDiff(heading(u, z), u.facing || 0);
        return Math.abs(df) <= 45 ? 'ahead' : Math.abs(df) >= 135 ? 'behind' : df > 0 ? 'right' : 'left';
      })()
    }))
  };
}
const RULES = `Conquest: The Last Argument of Kings, quick reference.
- Table 72 x 48 inches. x runs west to east (0-72), y runs from YOUR edge (y=0) to the enemy edge (y=48). Facing is degrees clockwise from y+ (0 = toward the enemy edge, 90 = east, 180 = toward your own edge, 270 = west).
- Faction rules: use your army's faction options (listed per activation in factionOptions and per round in faction choices) and your characters' Draw Events and abilities (Pheromancy, Biomancy and similar) whenever they help.
- Terrain: Hindering terrain on a charge path removes Impact attacks; Dangerous/Perilous terrain wounds stands moving through; Water gives -1 Clash; Cover halves Volleys; Impassable and buildings block movement; Infantry can occupy buildings.
- Supremacy: your Warlord's Supremacy Ability may grant rules this round (shown as 'Supremacy: …' effects on your units).
- An activation has 2 actions (plus free ones). March and Reform may repeat; other actions may not. A failed Charge ends the activation.
- Unengaged actions: march (up to M inches; sideways/backward cost double; wheels allowed), reform (turn on the spot up to 180 degrees, change files), charge (target must be in the front arc and within M+6 inches; roll D6+M, needs at least the distance; not in the round a regiment arrives), volley (needs Barrage, target in front arc and range), aim, rally (if Broken).
- Engaged actions (in contact with an enemy): clash, combat_reform (turn to face an enemy that hit a flank), inspire (+1 Clash this activation), withdraw (Light/Medium only, costly), combat_rally (if Broken).
- A successful charge gives Inspired (+1 Clash) and triggers Impact attacks. Flank attacks make the defender re-roll passed Morale; rear attacks make every Morale test fail. Hitting an enemy's flank or rear is very valuable.
- Arriving regiments enter from your table edge (own: front edge on y=0, choose x) or a side edge (west x=0 / east x=72, choose y between 0 and your reinforcement line). Their first action must be a March.
- Seizing a zone: more stands in the zone AND more seizing value (Light 0, Medium/Heavy 1, Monster 3 per stand; Broken counts 0). Objective markers are attackable models (3 wounds, Defense 3) from round 2; you cannot attack your own. Victory points depend on the scenario in BOARD.`;
const PLAN_SCHEMA = `Reply with JSON only: {"plan":[steps],"narration":"1-2 short sentences, in the voice of a commander, saying what this regiment does and why"}.
Steps (in order, at most 2 non-free actions; an arriving regiment's FIRST step is "enter" and then a march):
{"do":"enter","edge":"own"|"west"|"east","at":<x for own edge, y for side edges>,"files":<stands in the front rank>}
{"do":"march","toward":"unit:<id>"|"zone:<name>"|{"x":n,"y":n}}  // wheels to face the point and moves forward as far as it legally can (stops 1 inch short of enemies)
{"do":"march","mode":"fwd"|"back"|"sleft"|"sright","amount":<inches>}
{"do":"reform","face":"unit:<id>"|"zone:<name>"|<degrees>,"files":<optional>}
{"do":"charge","target":"<enemy id>"}   // the page rolls the die, moves, and resolves Impacts
{"do":"clash","target":"<enemy id in contact, optional>"}
{"do":"volley","target":"<enemy id>"}
{"do":"inspire"} {"do":"aim"} {"do":"rally"} {"do":"combat_rally"} {"do":"combat_reform"} {"do":"withdraw"}
{"do":"cast","spell":"<spell name>","target":"<unit id>"}  // Spellcasting regiments only (see spells in THIS ACTIVATION); some casters cast for free
{"do":"memory"}  // Old Dominion Memories of Old as an action (if listed in availableNow)
{"do":"occupy"} {"do":"leave"}  // move into / out of a building (Garrison terrain); each ends the activation
{"do":"faction","option":"<exact text from factionOptions>"}  // faction rules and Draw Events (Chant, Ideal Card, Bloom, Strain Expression, Forged by the Elements, Memories of Old as a Draw Event, Elemental Conduit, Awaken...). Draw Events must come BEFORE the first action. Use them whenever they help; most are free.
Typical good play: march then charge when the charge roll needed is small; clash twice is not allowed, so engaged regiments usually inspire then clash; keep or take objective zones; protect your flanks.`;
async function askJSON(prompt, tier) {
  if (!sample) throw { code: 'unavailable' };
  return await sample.json(prompt, { modelTier: tier || 'default' });
}
/* ---------- action executors ---------- */
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
    Object.assign(act.pose, {
      x: Math.max(G.w / 2, Math.min(72 - G.w / 2, x)),
      y: -G.d / 2,
      facing: 0,
      onTable: true
    });
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
async function autoResolve() {
  let guard = 0;
  while (cb && guard++ < 60) {
    if (cb.split === 'plan') {
      cb.assign = splitDefault(byId(cb.att), cb.engIds.map(byId), true);
      splitGo();
      continue;
    }
    if (!cb.tgt) {
      const id = (cb.choices || [])[0];
      if (!id) {
        cb = null;
        break;
      }
      cb.tgt = id;
      if (cb.type !== 'lethal') cb.groups = buildGroups(cb.type, byId(cb.att), byId(id));
    }
    if (cb.type === 'duel') {
      renderCombat();
      await sleep(800);
      if (!cb) break;
      const T = base(cb.tgt),
        A = base(cb.att);
      if (cb.step === 'offer') {
        if (T.side === AI || duelRefuseWhy(T)) duelDecide(T.side === AI ? aiAcceptDuel(T, A) : true);
        else break;
      } else if (cb.step === 'roll') {
        duelResolve();
      } else {
        await recordDuel();
        break;
      }
      continue;
    }
    renderCombat();
    await sleep(cb.step === 'done' ? 900 : 750);
    if (!cb) break;
    const T = byId(cb.tgt) || base(cb.tgt);
    if (cb.step === 'att') {
      const parry = hitParry(T);
      if (
        cb.groups.some(g => g.blessable) &&
        blessOk(base(cb.att)) &&
        (cb.blessA || base(cb.att).side === AI)
      ) {
        cb.blessA = true;
        cb.blessUsedA = true;
        cb.groups.forEach(g => {
          if (g.blessable) g.blessed = true;
        });
      }
      cb.groups.forEach(g => rollHits(g, g.nUse ?? g.n, parry));
      glimApply();
      cb.hits = cb.groups.reduce((a, g) => a + g.hits, 0);
      cb.wounds = 0;
      cb.extra = 0;
      cb.step = cb.hits ? 'def' : 'done';
    } else if (cb.step === 'def') {
      if (
        (cb.type === 'clash' || cb.type === 'impact') &&
        blessOk(T) &&
        T.side !== AI &&
        !PVP() &&
        cb.blessT == null
      ) {
        await new Promise(res => {
          cb.blessWait = res;
          renderCombat();
        });
        cb.blessWait = null;
      }
      if ((cb.type === 'clash' || cb.type === 'impact') && blessOk(T) && (cb.blessT || T.side === AI)) {
        cb.blessT = true;
        cb.blessUsedT = true;
      }
      rollDef(T);
      cb.step = cb.type !== 'volley' && cb.type !== 'lethal' && cb.wounds ? 'mor' : 'done';
    } else if (cb.step === 'mor') {
      const mi = moraleInfo(T, byId(cb.att) || base(cb.att));
      if (mi.auto) {
        cb.mi = mi;
        cb.extra = 0;
        cb.step = 'done';
      } else {
        rollMor(T);
        cb.step = 'done';
      }
    } else {
      renderCombat();
      const cur = cb;
      await recordCombat();
      logAI(state.lastText);
      if (cb === cur) break;
    }
  }
  renderCombat();
}
async function aiCast(id, spellName, targetId) {
  const u = byId(id),
    sp = (u.spells || []).find(s => s.name.toLowerCase() === String(spellName || '').toLowerCase());
  const pr = rx(u.charRules, 'Priest') || rx(u.charRules, 'Wizard');
  if (!sp || !pr || !u.onTable) {
    await charCommit(id, { note: 'No action.' });
    return `the ${u.charName} takes no action`;
  }
  const cp = corners(u),
    ok = t =>
      sp.req === 'automaton'
        ? rh(t.rules, 'Automaton')
        : sp.req === 'nonmonster'
          ? t.type !== 'monster'
          : true;
  const cands = all().filter(
    t =>
      t.onTable &&
      !t.destroyed &&
      (sp.targets === 'enemy' ? t.side !== u.side : t.side === u.side) &&
      polyDist(cp, corners(t)) <= sp.range + 1e-6 &&
      ok(t)
  );
  const T = cands.find(t => t.id === targetId) || cands[0];
  if (!T) {
    await charCommit(id, { note: 'No action (no target in range).' });
    return `the ${u.charName} finds no target for ${sp.name}`;
  }
  const caster = t =>
    rx(t.rules, 'Priest') ||
    rx(t.rules, 'Wizard') ||
    (t.charName && (rx(t.charRules, 'Priest') || rx(t.charRules, 'Wizard')));
  const interf = all().some(
    t =>
      t.onTable &&
      t.side !== u.side &&
      caster(t) &&
      (polyDist(cp, corners(t)) <= 10 || polyDist(corners(T), corners(t)) <= 10)
  );
  const att = sp.att - (interf ? 1 : 0),
    n = live(T),
    need =
      2 + (sp.scaling ? (n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0) + (T.type === 'monster' ? 1 : 0) : 0),
    devout = rh(T.rules, 'Devout');
  const rolls = Array.from({ length: pr }, d6);
  let succ = rolls.filter(v => v === 1 || (v <= att && v !== 6)).length;
  if (devout && succ < pr) succ++;
  const won = succ >= need;
  banner(
    `${u.charName} casts ${sp.name} on ${T.short || T.name}`,
    rolls.map(v => ({ v, cls: v === 1 || (v <= att && v !== 6) ? 'hit' : 'miss' })),
    `${succ} successes, needs ${need}: ${won ? 'the spell works' : 'the spell fails'}`
  );
  await sleep(1600);
  bannerHide();
  if (!won) nullMage(u);
  await charCommit(id, {
    spell: sp.name,
    target: won ? T.id : null,
    effect: won ? sp.effect : null,
    rolls,
    success: won,
    note: `Cast ${sp.name} on ${T.short || T.name}: ${rolls.join(', ')} (${succ} successes, needed ${need}), ${won ? 'success' : 'failed'}.`
  });
  return `the ${u.charName} casts ${sp.name} on ${T.short || T.name}: ${won ? 'it works' : 'it fails'}`;
}
/* ---------- planning ---------- */
function heuristicPlan(u) {
  const plan = [];
  if (!u.onTable) {
    plan.push({ do: 'enter', edge: 'own', at: 36 });
    const z = zoneControl().find(z => z.holder !== AI) || zonesOf()[0];
    plan.push({ do: 'march', toward: 'zone:' + z.name });
    plan.push({ do: 'march', toward: 'zone:' + z.name });
    return plan;
  }
  const eng = engaged(u);
  if (eng.length) {
    if (!inspWhy(u)) plan.push({ do: 'inspire' });
    plan.push({ do: 'clash', target: eng[0].id });
    return plan;
  }
  const o = optionsFor(u),
    ch = (o.enemies || [])
      .filter(e => e.chargeNeedsRoll != null && e.chargeNeedsRoll <= 4)
      .sort((a, b) => a.chargeNeedsRoll - b.chargeNeedsRoll)[0];
  if (ch && !(u.arrivedRound === state.round)) {
    plan.push({ do: 'charge', target: ch.id });
    return plan;
  }
  const near = (o.enemies || []).sort((a, b) => a.distance - b.distance)[0];
  if (near && near.distance <= (u.m || 0) * 2 + 6) {
    plan.push({ do: 'march', toward: 'unit:' + near.id });
    const c2 = near.distance - (u.m || 0);
    if (c2 <= (u.m || 0) + 3) plan.push({ do: 'charge', target: near.id });
    else plan.push({ do: 'march', toward: 'unit:' + near.id });
    return plan;
  }
  const z = zoneControl()
    .filter(z => z.holder !== AI)
    .sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];
  if (z) plan.push({ do: 'march', toward: 'zone:' + z.name }, { do: 'march', toward: 'zone:' + z.name });
  return plan;
}
function boardFor(activeId) {
  return {
    round: state.round,
    scenario: {
      name: scenOf().name,
      victoryConditions: scenOf()
        .vp.replace(/bottom player/g, 'enemy (bottom) player')
        .replace(/top player/g, 'your (top) side'),
      yourPick: (state.picks || {})[AI] || null
    },
    victoryPoints: { you: state.vp?.[AI] || 0, enemy: state.vp?.[HU] || 0 },
    yourArmy: N(AI),
    enemyArmy: N(HU),
    armyRules: { you: state.army?.[AI] || [], enemy: state.army?.[HU] || [] },
    reinforcementLine: state.rl?.[AI] ?? null,
    zones: zoneControl().map(z => ({
      name: z.name,
      x: z.x,
      y: z.y,
      diameter: z.size,
      friendlyTo: z.friendly ? (z.friendly === AI ? 'you' : 'enemy') : null,
      heldBy: z.holder ? (z.holder === AI ? 'you' : 'enemy') : 'nobody',
      stands: { you: z.tot[AI], enemy: z.tot[HU] }
    })),
    terrain: terrainOf().map(t => {
      const I = tInfo(t);
      return {
        type: I.name,
        size: I.size,
        rules: I.kw,
        x: t.x,
        y: t.y,
        halfWidth: t.rx,
        halfDepth: t.ry,
        occupiedBy: (all().find(o => o.garrison === tId(t)) || {}).id || undefined
      };
    }),
    units: (state.units || [])
      .filter(u => !u.destroyed && (u.onTable || u.arriving || u.id === activeId))
      .map(u => unitBrief(byId(u.id) || u))
  };
}
async function planActivation(u, source) {
  const brief = {
    activeRegiment: u.id,
    source,
    prey: supPrey(AI)
      ? {
          id: supPrey(AI).id,
          note: 'The Big Game Hunt: your Clashes and Volleys against this regiment count as Inspired and Taking Aim'
        }
      : undefined,
    spells: regCaster(u)
      ? spellsOf(u, false).map(s => ({
          name: s.name,
          range: s.range || 'Self',
          attunement: s.att,
          scaling: s.scaling,
          free: !!regCaster(u).free,
          targets: spellTargets(u, s).map(t => t.id),
          text: s.text
        }))
      : undefined,
    magicLevel: regCaster(u) ? magicLevel(u, false) : undefined,
    factionOptions: aiFacOpts(u),
    factionState: frFacs(AI).flatMap(f => frSummary(AI, f)),
    options: optionsFor(u),
    availableNow: u.onTable
      ? availableActions(u)
          .filter(a => !a.why)
          .map(a => a.type)
      : ['enter, then march'],
    arrivedThisRound: !u.onTable || u.arrivedRound === state.round
  };
  const prompt = `You are Claude, commanding the ${N(AI)} army against a human player's ${N(HU)} in a tabletop wargame. Choose this activation's actions.\n\n${RULES}\n\n${PLAN_SCHEMA}\n\nBOARD (JSON):\n${JSON.stringify(boardFor(u.id))}\n\nTHIS ACTIVATION (JSON):\n${JSON.stringify(brief)}\n\nThink like a strong player: concentrate force, hit flanks and rears, use charges whose needed roll is small, take or contest zones, and do not walk into enemy front arcs needlessly. Reply with the JSON object only.`;
  try {
    const r = await askJSON(prompt, 'default');
    if (r && Array.isArray(r.plan))
      return { plan: r.plan, narration: String(r.narration || ''), by: 'claude' };
  } catch (e) {
    if (e && e.code === 'not_granted')
      aiNote('Claude was not allowed to play, so the map used simple tactics.');
  }
  return { plan: heuristicPlan(u), narration: '', by: 'bot' };
}
async function planCharacter(u) {
  const sp = spellsOf(u, true).filter(s => magicLevel(u, true) > 0 && spellTargets(u, s).length),
    AB = chAbil(u)
      .filter(a => !chWhy(u, a))
      .map(a => ({
        name: a.n,
        kind: a.kind === 'draw' ? 'draw event (free, before acting)' : 'action (uses the character action)',
        effect: a.d,
        targets: chTargets(u, a).map(t => t.id)
      }));
  {
    const DT = duelTargets(u);
    if (DT.length)
      AB.push({
        name: 'Duel',
        kind: 'action (uses the character action)',
        effect:
          'Challenge an enemy character in contact: both strike at once and wounds only hit the characters. The enemy may refuse (its regiment then cannot Seize, loses Inspiration and uses its lowest Resolve this round). Your odds per target (above 1 favours you): ' +
          DT.map(t => t.id + ' ' + duelOdds(u, t).toFixed(2)).join(', '),
        targets: DT.map(t => t.id)
      });
  }
  if ((!sp.length && !AB.length) || !u.onTable) return { char: 'pass' };
  if (AB.length) {
    const prompt = `You are Claude, commanding the ${N(AI)} army in Conquest: The Last Argument of Kings. Your character ${u.charName} (with ${u.name}) is activating. It may first use any of its Draw Events, then take ONE action: cast a spell, use an ability, or pass.\nSpells (Magic Level ${magicLevel(u, true)}; each success is a die at or under Attunement; 2 successes needed, more for Scaling spells on big regiments): ${JSON.stringify(sp.map(s => ({ name: s.name, range: s.range || 'Self', attunement: s.att, scaling: s.scaling, targets: spellTargets(u, s).map(t => t.id), text: s.text })))}\nAbilities: ${JSON.stringify(AB)}\nBOARD: ${JSON.stringify(boardFor(u.id))}\nReply with JSON only: {"draws":[{"ability":"<draw event name>","target":"<unit id>"}],"char":"pass"|"cast"|"ability","spell":"<name if cast>","ability":"<name if ability>","target":"<unit id>","narration":"one sentence"}.`;
    try {
      const r = await askJSON(prompt, 'default');
      if (r && r.char) return r;
    } catch (e) {}
    const dr = AB.filter(a => /draw/.test(a.kind)).map(a => ({ ability: a.name, target: a.targets[0] }));
    const bD = duelTargets(u).sort((a, b) => duelOdds(u, b) - duelOdds(u, a))[0];
    return bD && duelOdds(u, bD) >= 1.2
      ? { draws: dr, char: 'ability', ability: 'Duel', target: bD.id }
      : { draws: dr, char: 'pass' };
  }
  const prompt = `You are Claude, commanding the ${N(AI)} army in Conquest: The Last Argument of Kings. Your character ${u.charName} (with ${u.name}) is activating and may cast one spell or pass.\nSpells (Magic Level ${magicLevel(u, true)}; each success is a die at or under Attunement; 2 successes needed, more for Scaling spells on big regiments): ${JSON.stringify(sp.map(s => ({ name: s.name, range: s.range || 'Self', attunement: s.att, scaling: s.scaling, targets: spellTargets(u, s).map(t => t.id), text: s.text })))}\nBOARD: ${JSON.stringify(boardFor(u.id))}\nReply with JSON only: {"char":"pass"} or {"char":"cast","spell":"<name>","target":"<unit id>","narration":"one sentence"}.`;
  try {
    const r = await askJSON(prompt, 'default');
    if (r && r.char) return r;
  } catch (e) {}
  return { char: 'pass' };
}
let aiNotes = [];
function aiNote(t) {
  if (!aiNotes.includes(t)) aiNotes.push(t);
}
async function planRound() {
  const cards = defaultStack();
  const prompt = `You are Claude, commanding the ${N(AI)} army in Conquest: The Last Argument of Kings, round ${state.round}. Arrange your Command Stack for this round: every card exactly once, top first. Cards are "u:<id>" for a regiment and "c:<id>" for the character attached to that regiment. A character card played right before its own regiment lets that regiment act straight after as its Entourage (it counts as a Strategic Stack activation and gains Inspired).\nYour cards: ${JSON.stringify(cards)}\n\n${RULES}\n\nBOARD: ${JSON.stringify(boardFor(null))}\n${frRoundOptions(AI).length ? 'Faction choices available now (pick by id; one per group such as soma/tactic/ritual/season/sect/creed; a Tribal Tactic is once per game, so save it for a decisive round): ' + JSON.stringify(frRoundOptions(AI).map(o => ({ id: o.id, choice: o.label }))) + '\n' : ''}${(() => {
    const S = supOf(AI);
    return S && S.can && !S.d.unknown
      ? `Your Warlord's Supremacy Ability ${S.k} can be activated this round (${S.d.every ? 'every round' : S.d.uses ? S.d.uses - S.used + ' uses left' : 'once per battle'}; the Warlord must be on the table): ${S.d.a} Set "supremacy" true to activate it this round, false to save it for a decisive moment.\n`
      : '';
  })()}Reply with JSON only: {"supremacy":true|false,"faction":["<choice id>",...],"stack":[...],"go_first_if_won":true|false,"effects":[{"unit":"<your unit id>","effect":"<a round-long effect your army rules grant, e.g. a chosen tactic; omit if none>"}],"intent":"one sentence on your plan for the round"}.`;
  try {
    const r = await askJSON(prompt, 'default');
    if (r && Array.isArray(r.stack)) {
      const st = r.stack.map(String).filter(c => cards.includes(c));
      cards.forEach(c => {
        if (!st.includes(c)) st.push(c);
      });
      aiLastPlanBy = 'claude';
      return {
        stack: st,
        first: r.go_first_if_won !== false,
        effects: Array.isArray(r.effects) ? r.effects : [],
        intent: String(r.intent || ''),
        faction: Array.isArray(r.faction) ? r.faction.map(String) : [],
        sup: typeof r.supremacy === 'boolean' ? r.supremacy : null
      };
    }
  } catch (e) {
    if (e && e.code === 'not_granted')
      aiNote('Claude was not allowed to play, so the map used simple tactics.');
  }
  aiLastPlanBy = '';
  return { stack: cards, first: true, effects: [], intent: '', faction: [] };
}
/* ---------- running a turn ---------- */
async function aiRegiment(id, source, report, card) {
  const u0 = base(id);
  startActivation(id, source, card);
  selId = id;
  const u = byId(id);
  aiStatus(`${N(AI)} are deciding what ${u.short || u.name} will do…`);
  const P = await planActivation(u, source);
  aiStatus(`${N(AI)}: ${u.short || u.name} is acting.`);
  const lines = [];
  let steps = P.plan.slice(0, 8);
  if (act.entering && !steps.some(s => s && s.do === 'enter'))
    steps.unshift({ do: 'enter', edge: 'own', at: 36 });
  if (
    !steps.some(
      s =>
        s &&
        s.do === 'faction' &&
        /^(Famine|War|Death|Conquest|Ka|Chi|Fu|Sui|Mu)\b|Chant Marker|Ideal Card activated/i.test(
          String(s.option || '')
        )
    )
  )
    await aiAutoFaction(byId(id), lines);
  for (const st of steps) {
    if (!act || act.chargeFailed) break;
    if (!st || !st.do) continue;
    let r = '';
    aiLog = lines;
    try {
      switch (st.do) {
        case 'enter':
          if (act.entering && !act.placed) r = await exEnter(st);
          break;
        case 'march':
          r = await exMarch(st);
          break;
        case 'reform':
          r = await exReform(st);
          break;
        case 'charge':
          r = await exCharge(st);
          break;
        case 'clash':
          r = await exClash(st);
          break;
        case 'volley':
          r = await exVolley(st);
          break;
        case 'inspire':
          r = await exSimple('inspire', 'inspires its warriors');
          break;
        case 'aim':
          r = await exSimple('aim', 'takes aim');
          break;
        case 'rally':
          r = await exSimple('rally', 'rallies');
          break;
        case 'combat_rally':
          r = await exSimple('crally', 'rallies in combat');
          break;
        case 'combat_reform':
          r = await exCReform();
          break;
        case 'withdraw':
          r = await exWithdraw();
          break;
        case 'faction':
          r = await exFaction(st);
          break;
        case 'cast':
          r = await exRegCast(st);
          break;
        case 'memory':
          r = await exSimple('memory', 'recalls its Memory of Old');
          break;
        case 'occupy':
          r = await exSimple('occupy', 'occupies the building');
          break;
        case 'leave':
          r = await exSimple('leave', 'leaves the building');
          break;
        default:
          r = '';
      }
    } catch (e) {
      r = 'could not ' + st.do;
      if (act && act.cur) {
        try {
          cancelAction();
        } catch (_) {
          act.cur = null;
        }
      }
      cb = null;
      renderCombat();
    }
    if (r) lines.splice(lines.length, 0, r);
    await sleep(300);
  }
  aiLog = null;
  if (act && act.entering && !act.placed) {
    await exEnter({ edge: 'own', at: 36 });
  }
  if (act && act.entering && !act.actions.some(a => a.type === 'march'))
    await exMarch({ mode: 'fwd', amount: 99 });
  if (act) {
    await saveActivation();
  }
  const title = u0.name + (source === 'entourage' ? ' (Entourage)' : '');
  report.push({ title, lines, narration: P.narration });
}
async function runAITurn() {
  if (PVP()) return;
  if (aiBusy || !state || !db) return;
  if (act) {
    toast('Finish or undo your activation first.');
    return;
  }
  aiBusy = true;
  aiNotes = [];
  render();
  const report = [];
  try {
    let st = validCards(state.aiStack || []);
    if (!st.length) st = defaultStack();
    let card = st.shift();
    if (!card) {
      aiBusy = false;
      await afterAITurn([]);
      return;
    }
    await putState({ aiStack: st, turn: AI, phase: 'Round ' + state.round + ' · ' + N(AI) + ' are acting' });
    let id = (cardPick(card) || {}).id || card.slice(2),
      yIdeal = null;
    if (yCard(card)) {
      /* an Ideal Card: its own entry first, otherwise any Yoroni regiment or character still to act */ yIdeal =
        card;
      const own = base(card.slice(2)),
        asC = card[0] === 'c',
        U = (state.units || []).filter(u => u.side === AI);
      const pick =
        (own && ySame(card, own, asC) && [own, asC]) ||
        (x => x && [x, asC])(U.find(u => ySame(card, u, asC))) ||
        (x => x && [x, !asC])(U.find(u => ySame(card, u, !asC)));
      if (pick) {
        id = pick[0].id;
        card = (pick[1] ? 'c:' : 'u:') + id;
      }
    }
    if (card[0] === 'c') {
      await darkHandAI(byId(id));
      const u = byId(id);
      aiStatus(`${N(AI)}: the ${u.charName} is deciding…`);
      const d = await planCharacter(u);
      const cl = [];
      for (const x of (Array.isArray(d.draws) ? d.draws : []).slice(0, 3)) {
        const a = chAbil(byId(id)).find(
          q => q.kind === 'draw' && q.n.toLowerCase() === String(x.ability || '').toLowerCase()
        );
        if (a) {
          const r = await useAbil(id, a.n, x.target);
          if (r) cl.push(r);
        }
      }
      let line;
      if (d.char === 'cast') {
        const r = await aiCastSpell(byId(id), true, d.spell, d.target);
        if (r) {
          const r2 = await srAiExtra(byId(id), d.spell);
          line = `the ${u.charName} ${r}` + r2;
          await charCommit(id, { spell: d.spell, note: r + r2 + '.' });
        } else line = await aiCast(id, d.spell, d.target);
      } else if (d.char === 'duel' || (d.char === 'ability' && /^duel$/i.test(String(d.ability || '')))) {
        line = `the ${u.charName}: ` + (await aiDuel(id, d.target));
      } else if (d.char === 'ability') {
        const a = chAbil(byId(id)).find(
          q => q.kind === 'action' && q.n.toLowerCase() === String(d.ability || '').toLowerCase()
        );
        if (a) {
          const r = await useAbil(id, a.n, d.target);
          await charCommit(id, { note: 'Used ' + a.n + '.' });
          line = r;
        } else {
          await charCommit(id, { note: 'No action.' });
          line = `the ${u.charName} takes no action`;
        }
      } else {
        await charCommit(id, { note: 'No action.' });
        line = `the ${u.charName} takes no action`;
      }
      report.push({ title: u.charName, lines: cl.concat([line]), narration: String(d.narration || '') });
      const nx = validCards(state.aiStack || [])[0];
      if (nx && nx[0] === 'u' && sameCard(nx, byId(id)) && !noEntourage(byId(id))) {
        await putState({ aiStack: validCards(state.aiStack || []).slice(1) });
        await aiRegiment(id, 'entourage', report);
      }
    } else await aiRegiment(id, 'command', report, yIdeal);
  } catch (e) {
    report.push({
      title: 'Problem',
      lines: ['The ' + N(AI) + ' turn stopped early: ' + ((e && e.message) || e)],
      narration: ''
    });
    act = null;
    cb = null;
  }
  aiBusy = false;
  bannerHide();
  aiStatus('');
  showReport(report);
  await afterAITurn(report);
}
async function afterAITurn(report) {
  const hu = humanCardsLeft(),
    ai = aiCardsLeft();
  if (hu > 0) setTimeout(() => turnNotice(N(AI) + ' finished their turn · your turn'), 400);
  if (mwExtra(AI) && ai > 0) {
    await putState({ sup: supMemo(AI, { mwR: srRnd() }) });
    await sleep(800);
    return runAITurn();
  }
  if (hu > 0) {
    await putState({ turn: HU, phase: 'Round ' + state.round + ' · Your turn' });
    return;
  }
  if (ai > 0) {
    await sleep(1500);
    return runAITurn();
  }
  await endRound();
}
function showReport(report) {
  const box = $('ai-report');
  if (!report.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const body = $('air-body');
  body.innerHTML = '';
  $('air-title').textContent = N(AI) + "' turn";
  report.forEach(r => {
    const h = document.createElement('p');
    h.className = 'air-h';
    h.textContent = r.title;
    body.appendChild(h);
    if (r.narration) {
      const q = document.createElement('p');
      q.className = 'air-n';
      q.textContent = '“' + r.narration + '”';
      body.appendChild(q);
    }
    const ul = document.createElement('ul');
    ul.className = 'log';
    r.lines.forEach(l => {
      const li = document.createElement('li');
      li.textContent = l;
      ul.appendChild(li);
    });
    body.appendChild(ul);
  });
  aiNotes.forEach(n => body.appendChild(ptext(n, 'warn')));
  try {
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {}
}
/* ---------- the human ends a turn ---------- */
async function endTurn() {
  if (!db || !state) return;
  if (aiBusy) return;
  if (act) {
    toast('Finish or undo the current activation first.');
    return;
  }
  if (charAct) {
    toast('Finish the character activation first.');
    return;
  }
  if (
    state.mode !== 'test' &&
    myTurnCards != null &&
    humanCardsLeft() > 0 &&
    humanCardsLeft() >= myTurnCards &&
    !myTurnStrat
  ) {
    toast(
      'Play your next card first: activate it (you may take no actions and save), or put it in the Strategic Stack.'
    );
    return;
  }
  if (PVP()) {
    if (state.turn !== HU) {
      toast('It is not your turn.');
      return;
    }
    if (mwExtra(HU) && sideCardsLeft(HU) > 0) {
      await putState({ sup: supMemo(HU, { mwR: srRnd() }) });
      toast('The Matriarch Walks: activate your next card straight away.');
      myTurnCards = humanCardsLeft();
      return;
    }
    const op = sideCardsLeft(AI),
      mine = sideCardsLeft(HU);
    if (op > 0) {
      await putState({ turn: AI, phase: 'Round ' + state.round + ' · ' + N(AI) + ' to act' });
      return;
    }
    if (mine > 0) {
      toast(N(AI) + ' have no cards left this round, so keep activating until you are done.');
      return;
    }
    await endRound();
    return;
  }
  if (mwExtra(HU) && humanCardsLeft() > 0) {
    await putState({ sup: supMemo(HU, { mwR: srRnd() }) });
    toast('The Matriarch Walks: activate your next card straight away.');
    myTurnCards = humanCardsLeft();
    return;
  }
  const ai = aiCardsLeft(),
    hu = humanCardsLeft();
  if (ai > 0) {
    await putState({ turn: AI });
    return runAITurn();
  }
  if (hu > 0) {
    toast(N(AI) + ' have no cards left this round, so keep activating until you are done.');
    return;
  }
  await endRound();
}
