/*
 * Starting and finishing an action
 *
 * Starts the chosen action, finishes it (applying its results) or cancels it.
 *
 * In this file: startAction(), finishAction(), cancelAction()
 */

function startAction(type) {
  if (act && !act.cur && srStartAction(type)) return;
  if (type === 'cast' && act && !act.cur) {
    const u0 = byId(act.id),
      RC = regCaster(u0) || {};
    act.cur = {
      type: 'cast',
      moving: false,
      reshape: false,
      free: !!(RC.free || act.freeCast || (RC.extra && !act.actions.some(a => a.type === 'cast' && a.free))),
      spell: 0,
      target: null,
      rolls: null,
      cast: act.actions.filter(a => a.type === 'cast' && a.spell).map(a => a.spell),
      start: { x: u0.x, y: u0.y, facing: u0.facing || 0, files: geom(u0).files }
    };
    render();
    return;
  }
  const u = byId(act.id);
  const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
  if (type === 'fadv') {
    act.cur = {
      type: 'march',
      start: st,
      budget: u.m || 0,
      moving: true,
      reshape: false,
      free: true,
      noSide: true,
      fadv: true,
      segs: [],
      segStart: Object.assign({}, st),
      mode: 'fwd',
      pending: null
    };
    render();
    return;
  }
  if (type === 'dtmarch') {
    act.cur = {
      type: 'march',
      start: st,
      budget: u.m || 0,
      moving: true,
      reshape: false,
      free: true,
      dt: true,
      segs: [],
      segStart: Object.assign({}, st),
      mode: 'fwd',
      pending: null
    };
    render();
    return;
  }
  if (type === 'trample') {
    const foes = frontFoes(u),
      t = foes[0],
      n =
        trampleX(u) * live(u) -
        (u.char != null ? trampleX(u) : 0) +
        (u.char != null && rx(u.charRules, 'Trample') ? rx(u.charRules, 'Trample') : 0);
    act.actions.push({ type: 'trample', free: true, from: st, to: st, target: t.id, hits: n });
    render();
    openCombat({
      type: 'lethal',
      att: u.id,
      tgt: t.id,
      inAct: false,
      lethalHits: n,
      lethalX: trampleX(u),
      lethalLabel: 'Trample',
      lethalLost: 0,
      selfTitle: 'Trample',
      selfText: `${u.short || u.name} tramples ${t.short || t.name}: ${n} automatic Hits. No Morale Tests.`
    });
    return;
  }
  const firstMarch = type === 'march' && act.entering && !act.actions.some(a => a.type === 'march');
  let b = 0,
    roll = null;
  const secondMarch = type === 'march' && act.actions.filter(a => a.type === 'march').length === 1;
  if (type === 'march')
    b =
      (u.m || 0) +
      srMarchMod(u) +
      (act.frFu && !act.actions.some(a => a.type === 'march') ? 2 : 0) +
      (!act.actions.some(a => a.type === 'march') ? srFirstMarch(u) : 0) +
      (firstMarch ? vgOf(u) : 0) +
      (secondMarch && u.bearer ? (hasRule(u, /^Forced March/) ? 2 : 1) : 0) +
      (secondMarch && relentlessMarch(u) ? 1 : 0);
  if (type === 'charge' && (u.effects || []).includes('Broken')) {
    toast('A Broken regiment cannot Charge. Rally it first.');
    return;
  }
  if (type === 'charge') {
    act.cur = { type, stage: 'target', start: st, budget: 0, moving: false, reshape: false };
    render();
    toast('Click the enemy regiment you are charging.');
    return;
  }
  const moving = type === 'march' || type === 'charge';
  if (type === 'creform') {
    crStart(u, st);
    return;
  }
  if (type === 'withdraw') {
    wdStart(u, st);
    return;
  }
  const reshape = ['reform', 'fluid', 'hammer', 'creform'].includes(type);
  act.cur = { type, start: st, budget: b, roll, moving, reshape, firstMarch };
  if (type === 'march')
    Object.assign(act.cur, { segs: [], segStart: Object.assign({}, st), mode: 'fwd', pending: null });
  if (type === 'clash') {
    act.cur = { type, start: st, budget: 0, moving: false, reshape: false };
    if (nodeClashOffer(u)) {
      act.cur.stage = 'node';
      render();
      toast('Catabolic Node: detonate it before the Clash?');
      return;
    }
    clashOpen(u, true);
    render();
    return;
  }
  if (type === 'volley') {
    act.cur = { type, stage: 'target', start: st, budget: 0, moving: false, reshape: false };
    render();
    toast('Click the enemy regiment you are shooting at.');
    return;
  }
  if (!moving && !reshape) {
    finishAction();
    return;
  }
  render();
}

function finishAction() {
  if (act.cur && MOVE1.includes(act.cur.type) && !act.cur.sweep && act.cur.start) {
    const e = near1(act.cur);
    if (e) {
      if (aiBusy || (!PVP() && base(act.id).side === AI)) pullBack(act.cur);
      else {
        toast(
          e.terr
            ? 'A regiment may not March or Reform to within 1″ of ' +
                e.name +
                ' (a March must end at least 1″ from Garrison terrain; it is ' +
                e.dist.toFixed(1) +
                '″ away). Move it back, or Cancel.'
            : 'A regiment may not March or Reform to within 1″ of an enemy regiment (' +
                (e.short || e.name) +
                ' is ' +
                polyDist(corners(byId(act.id)), corners(e)).toFixed(1) +
                '″ away). Only a Charge brings it into contact. Move it back, or Cancel.'
        );
        return;
      }
    }
  }
  /* Reform: no stand may move further than the regiment's March (checked stand by stand, in formation order) */
  if (act.cur && act.cur.type === 'reform' && act.cur.start) {
    try {
      const u0 = base(act.id),
        A = standsOf(Object.assign({}, u0, act.cur.start)),
        B = standsOf(byId(act.id)),
        mid = s => [(s.poly[0][0] + s.poly[2][0]) / 2, (s.poly[0][1] + s.poly[2][1]) / 2],
        far = Math.max(
          0,
          ...B.map((s, i) => (A[i] ? Math.hypot(mid(s)[0] - mid(A[i])[0], mid(s)[1] - mid(A[i])[1]) : 0))
        ),
        M = +u0.m || 0;
      if (M && far > M + 0.25)
        toast(
          `Check this Reform: a stand moves about ${far.toFixed(1)}″, more than its March of ${M}″. No stand may move further than its March during a Reform.`
        );
    } catch (e) {
      console.error(e);
    }
  }
  if (act.cur && act.cur.type === 'creform') {
    const c0 = act.cur;
    if (cb && cb.type === 'freform') {
      toast('Record the Fighting Reform wounds first.');
      return;
    }
    const n = crContact(c0);
    if (n < c0.contact0) {
      toast(
        `That puts ${n} stand${n === 1 ? '' : 's'} in contact instead of ${c0.contact0}. A Combat Reform cannot reduce the stands in contact.`
      );
      return;
    }
    const uu = byId(act.id),
      uc = corners(uu),
      bad = (c0.foes || [])
        .map(byId)
        .filter(e => e && polyDist(uc, corners(e)) <= 0.35 && crArc(e, uu) !== c0.foeArc[e.id]);
    if (bad.length) {
      const e = bad[0],
        L = a => (a === 'left' || a === 'right' ? a + ' flank' : a);
      toast(
        `You were on the ${L(c0.foeArc[e.id])} of ${e.short || e.name}; a Combat Reform cannot move you to its ${L(crArc(e, uu))}.`
      );
      return;
    }
  }
  if (act.cur && act.cur.type === 'withdraw') {
    const c1 = act.cur;
    if (c1.stage !== 'march') {
      toast(
        cb && cb.type === 'freform' ? 'Record the withdrawal wounds first.' : 'Finish the withdrawal first.'
      );
      return;
    }
    if (!c1.failed) {
      const uu = byId(act.id),
        A = corners(uu);
      if (all().some(o => o.onTable && o.side !== uu.side && polyDist(A, corners(o)) < 1 - 1e-6)) {
        toast(
          'A Withdraw March cannot end within 1″ of an enemy. Move further, or press "Withdraw fails" to return to the start.'
        );
        return;
      }
    }
  }
  const u = byId(act.id),
    c = act.cur;
  const entry = {
    type: c.type,
    free: ['fluid', 'hammer'].includes(c.type) || !!c.free,
    fadv: !!c.fadv,
    from: c.start,
    to: { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files }
  };
  if (c.moving) entry.dist = +curCost(act.pose).cost.toFixed(2);
  if (c.type === 'charge' && act.tgtPose) {
    const tp = act.tgtPose;
    act.tgtPose = null;
    entry.targetPivot = tp.pose;
    putState({ units: state.units.map(x => (x.id === tp.id ? Object.assign({}, x, tp.pose) : x)) });
  }
  if (c.type === 'charge') {
    const pushes = chargePushes(byId(act.id), c.target);
    if (pushes.length) {
      putState({
        units: state.units.map(x => {
          const q = pushes.find(p => p.id === x.id);
          return q ? Object.assign({}, x, { x: q.x, y: q.y }) : x;
        })
      });
      entry.pushed = pushes.map(p => ({ id: p.id, moved: p.moved }));
      toast(
        pushes
          .map(p => `${p.name} is pushed ${p.moved.toFixed(1)}″ directly away from the charger`)
          .join('; ') + (pushes.some(p => p.gap < 1 - 1e-3) ? ' (as far as there is room).' : ', to 1″ away.')
      );
    }
    entry.target = c.target;
    entry.dist = +c.dist.toFixed(2);
    entry.result = 'success';
    entry.face = c.face;
    entry.chargeDistance = c.cd;
    if (c.rerolled) entry.rerolled = true;
    if (!act.extraFx.includes('Inspired (charged)') && !rh(RU(byId(act.id)), 'Automaton'))
      act.extraFx.push('Inspired (charged)');
  }
  if (c.roll != null) entry.roll = c.roll;
  if (c.type === 'withdraw') {
    entry.clean = c.clean;
    entry.resolve = c.R;
    entry.woundDie = c.wd;
    entry.wounds = c.wounds;
    entry.result = c.failed ? 'failed' : 'withdrew';
    entry.from = c.origin || c.start;
  }
  if (c.type === 'creform') {
    entry.clean = c.clean;
    entry.resolve = c.R;
    entry.contact = crContact(c);
  }
  if (c.firstMarch && u.vanguard) entry.vanguard = u.vanguard;
  if (c.dt) entry.dt = true;
  if (c.combat) entry.combat = c.combat;
  if (c.type === 'cast' && c.res) {
    entry.spell = c.res.spell;
    entry.spellTarget = c.res.target;
    entry.success = c.res.success;
  }
  if (c.segs)
    entry.segs = c.segs.map(s => ({ mode: s.mode, amt: +s.amt.toFixed(2), cost: +s.cost.toFixed(2) }));
  if (c.type === 'pres') {
    state.units = state.units.map(x =>
      x.id === act.id ? Object.assign({}, x, { wounds: 0, auxWounds: 0, charWounds: 0 }) : x
    );
    toast('Preservation Protocols: all wounds removed from the character and its regiment.');
  }
  if (c.type === 'btl' && !act.extraFx.includes('Linebreaker (Break Their Lines)'))
    act.extraFx.push('Linebreaker (Break Their Lines)');
  if (c.type === 'inspire' && !act.extraFx.includes('Inspired (Inspire action)'))
    act.extraFx.push('Inspired (Inspire action)');
  if (c.type === 'occupy') {
    const t = tGarrisonNear(base(act.id))[0];
    if (t) {
      act.occupyT = tId(t);
      Object.assign(act.pose, { x: t.x, y: t.y });
      entry.to = { x: t.x, y: t.y, facing: u.facing || 0, files: geom(u).files };
      entry.building = tInfo(t).name;
      toast(
        'The regiment occupies the ' +
          tInfo(t).name.toLowerCase() +
          ': +' +
          tInfo(t).def +
          ' Defense and 360° sight. Its activation ends.'
      );
    }
  }
  if (c.type === 'leave') {
    const t = tGarrisonOf(base(act.id));
    if (t) {
      const G = geom(u),
        a = ((u.facing || 0) * Math.PI) / 180,
        f = [Math.sin(a), Math.cos(a)],
        R = terrR(t) + 1 + G.d / 2;
      act.leaveT = tId(t);
      Object.assign(act.pose, { x: +(t.x + f[0] * R).toFixed(2), y: +(t.y + f[1] * R).toFixed(2) });
      entry.to = { x: act.pose.x, y: act.pose.y, facing: u.facing || 0, files: G.files };
      toast(
        'The regiment leaves the building and forms up 1″ outside it. Its activation ends. Drag it if it needs a different spot.'
      );
    }
  }
  let TM = null;
  if (['march', 'charge', 'withdraw'].includes(c.type) && !c.tloc && entry.from && entry.to) {
    TM = tAfterMove(base(act.id), entry);
    if (TM.notes.length || TM.hindered)
      entry.terrain = TM.notes.concat(TM.hindered ? ['Charged through ' + TM.hindered + ' (Hindering)'] : []);
  }
  srFinishAction(u, c, entry);
  act.actions.push(entry);
  if ((entry.type === 'rally' || entry.type === 'crally') && !entry.failed) {
    /* Rallying removes Broken at once, for everything else this activation does */
    const rid = act.id;
    state.units = state.units.map(x =>
      x.id === rid ? Object.assign({}, x, { effects: (x.effects || []).filter(f => f !== 'Broken') }) : x
    );
    putState({ units: state.units }).catch(() => {});
    toast((byId(rid).short || byId(rid).name) + ' Rallies: it is no longer Broken.');
  }
  act.cur = null;
  render();
  if (TM && TM.wounds) {
    const bu = base(act.id),
      AL = allocate(bu, TM.wounds);
    putState({
      units: state.units.map(x =>
        x.id === bu.id
          ? Object.assign(
              {},
              x,
              { wounds: AL.w, auxWounds: AL.aw },
              AL.dead
                ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
                : {}
            )
          : x
      ),
      lastTitle: N(bu.side) + ' · ' + (bu.short || bu.name),
      lastText: TM.notes.join('; ') + '. No Morale Tests.'
    }).catch(() => {});
  }
  if (TM && TM.notes.length) toast(TM.notes.join(' · ') + '. No Morale Tests.');
  const wildB = (() => {
    const bu = byId(act.id);
    return !!bu && supHasK(bu.side, 'Wild Beasts') && supRoles(bu).includes('Half-Bloods');
  })();
  if (TM && TM.hindered && wildB)
    toast('Wild Beasts: the Half-Bloods still make Impact Attacks through ' + TM.hindered + '.');
  else if (TM && TM.hindered) {
    const bu = byId(act.id),
      ice = frFac(bu) === 'Nords' && armyHas(bu.side, /Ice, Flesh/);
    if (/Medium|Heavy/.test(bu.cls || '') && !ice) {
      act.extraFx = act.extraFx.filter(x => !/Inspired/.test(x));
      act.extraFx.push('Hindered (no Impact, loses Inspiration this round)');
    }
    render();
    toast(
      'Charged through ' +
        TM.hindered +
        ' (Hindering): no Impact Attacks' +
        (/Medium|Heavy/.test(bu.cls || '') && !ice ? ', and it loses Inspired this round.' : '.')
    );
  }
  if (TREB_AMMO[c.type]) {
    const [nm, d] = TREB_AMMO[c.type];
    grant(act.id, 'Load the Next One!: ' + nm, [], null, 'Load the Next One!: ' + nm + '. ' + d + '.').then(
      () => render()
    );
  }
  if (c.type === 'memory') {
    const m = memOf(byId(act.id));
    if (m) grant(act.id, 'Memories of Old', m.rules, null, 'Memories of Old: ' + m.text).then(() => render());
  }
  if (c.type === 'charge') {
    srOnCharge(byId(act.id), c);
    if (srHas(byId(act.id), /^Divine Purpose/) && !act.dpUsed) act.dpUsed = 'charge';
  }
  if (c.type === 'charge') frOnCharge(act.id);
  if (c.type === 'charge') cadOnCharge(act.id, c.target);
  if (
    c.type === 'charge' &&
    hasImpact(byId(act.id)) &&
    (!(TM && TM.hindered) || wildB) &&
    !(byId(c.target) || {}).garrison
  )
    openCombat({ type: 'impact', att: act.id, tgt: c.target, inAct: false, fromCharge: true });
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
