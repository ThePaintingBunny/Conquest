/*
 * Extra actions from special rules
 *
 * Actions a regiment gains from its rules (extra Clash, free Volley, On Soaring Winds, Sweeping Step,
 * Rooted Might) and what starting or finishing them does.
 *
 * In this file: encyOpt(), engVolley(), srActions(), srStartAction(), srFinishAction()
 */

/* ---- extra regiment actions: extra Clash, free Volley, On Soaring Winds, Sweeping Step, Rooted Might ---- */
function encyOpt(u, re) {
  try {
    const e = frEncy(u);
    return !!(e && re.test(String(e.options || '')));
  } catch (x) {
    return false;
  }
}

function engVolley(u) {
  return encyOpt(u, /Volley engaged targets while engaged/i);
}

function srActions(u, out, used, eng, blocked) {
  if (!act || act.cur) return;
  const R = RU(u),
    bar = hasBarrage(u);
  /* Preservation Protocols (Spires): Combat and Out-of-Combat Action */
  if (u.charName && upgOf(u, /Preservation Protocols/) && frRoles(u).includes('Husk'))
    out.push({
      type: 'pres',
      why: (+u.wounds || 0) + (+u.charWounds || 0) ? blocked('pres') : 'No wounds to remove'
    });
  if (act.sweepDone) {
    out.length = 0;
    return;
  }
  if (
    eng.length &&
    (srHas(u, /^Raging Elements/) || offOn(u, 'xclash') || act.lath) &&
    used.some(a => a.type === 'clash') &&
    !act.actions.some(a => a.type === 'xclash')
  )
    out.push({ type: 'xclash', why: '', free: true });
  if (offOn(u, 'flame') && frontFoes(u).length) {
    out.push({
      type: 'flame',
      why: used.some(a => a.type === 'clash' || a.type === 'xclash')
        ? 'Not in the same activation as a Clash'
        : blocked('flame')
    });
    if (act.actions.some(a => a.type === 'flame'))
      out.forEach(o => {
        if (o.type === 'clash' || o.type === 'xclash')
          o.why = 'Not in the same activation as the Flamethrower';
      });
  }
  const fv =
    bar &&
    !act.actions.some(a => a.type === 'xvolley') &&
    (act.freeVolley ||
      (u.rider && upgOf(u, /Apex Master/)) ||
      encyOpt(u, /Free Volley/i) ||
      rh(R, 'Spined Descent') ||
      (rh(R, 'Eye of the Storm') && srAirNow(u.side)));
  if (fv)
    out.push({
      type: 'xvolley',
      why: eng.length && !rh(R, 'Eye of the Storm') && !engVolley(u) ? 'Not while engaged' : '',
      free: true
    });
  if (eng.length && bar && (rh(R, 'Eye of the Storm') || engVolley(u)) && !out.some(o => o.type === 'volley'))
    out.push({ type: 'volley', why: blocked('volley') });
  if (rh(R, 'On Soaring Winds')) out.push({ type: 'soar', why: blocked('march') });
  if (rh(R, 'Sweeping Step'))
    out.push({ type: 'sweep', why: used.length ? 'Only as the first action' : blocked('march') });
  if (rh(R, 'Rooted Might')) out.push({ type: 'rooted', why: blocked('rooted') });
  if (act.freeReform && !act.actions.some(a => a.type === 'xreform'))
    out.push({ type: 'xreform', why: eng.length ? 'Not while engaged' : '', free: true });
  if (assassinOk(u)) out.push({ type: 'assassin', why: blocked('clash') });
  if (!u.charName && canDuel(u) && duelTargets(u).length) {
    const arr = rh(u.rules || [], 'Arrogance');
    out.push({
      type: 'duel',
      why: act.actions.some(a => a.type === 'duel')
        ? 'Already used this activation'
        : arr
          ? ''
          : blocked('duel'),
      free: arr
    });
  }
  if (srHas(u, /^Primal Cacophony/))
    out.forEach(o => {
      if (o.type === 'rally' || o.type === 'crally') o.why = 'Primal Cacophony: cannot Rally';
    });
}

function srStartAction(type) {
  const u = byId(act.id);
  const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
  if (!srFearsome(u, type)) return true;
  if (type === 'assassin') return srAssassin(u);
  if (type === 'xreform') {
    act.cur = {
      type: 'reform',
      xreform: true,
      free: true,
      start: st,
      budget: 0,
      roll: null,
      moving: false,
      reshape: true
    };
    render();
    return true;
  }
  if (type === 'duel') {
    const T = duelTargets(u);
    act.cur = {
      type: 'duel',
      free: rh(u.rules || [], 'Arrogance'),
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    openCombat({
      type: 'duel',
      att: act.id,
      tgt: T.length === 1 ? T[0].id : null,
      choices: T.map(e => e.id),
      inAct: true,
      step: 'offer',
      selfTitle: 'Duel'
    });
    render();
    return true;
  }
  if (type === 'node') return offNode(u);
  if (type === 'flame') {
    act.cur = {
      type: 'volley',
      flame: true,
      stage: 'target',
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    render();
    toast('Flamethrower: click the enemy touching its front, then press Volley.');
    return true;
  }
  if (type === 'xclash') {
    act.cur = {
      type: 'clash',
      xclash: true,
      free: true,
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    clashOpen(u, true);
    render();
    return true;
  }
  if (type === 'xvolley') {
    act.cur = {
      type: 'volley',
      xvolley: true,
      free: true,
      stage: 'target',
      start: st,
      budget: 0,
      moving: false,
      reshape: false
    };
    render();
    toast('Free Volley: click the enemy regiment you are shooting at.');
    return true;
  }
  if (type === 'soar' || type === 'sweep') {
    act.cur = {
      type: 'march',
      soar: true,
      sweep: type === 'sweep',
      start: st,
      budget: (u.m || 0) * (type === 'sweep' ? 2 : 1),
      moving: true,
      reshape: false,
      segs: [],
      segStart: Object.assign({}, st),
      mode: 'fwd',
      pending: null
    };
    render();
    toast(
      type === 'sweep'
        ? 'Sweeping Step: two Marches through regiments; then a free Clash against one you passed through. The activation then ends.'
        : 'On Soaring Winds: March in any direction, ignoring regiments and terrain, even while engaged.'
    );
    return true;
  }
  return false;
}

function srFinishAction(u, c, entry) {
  if (c.flame) entry.type = 'flame';
  if (c.xclash) entry.type = 'xclash';
  if (c.xreform) entry.type = 'xreform';
  if (c.xvolley) entry.type = 'xvolley';
  if (c.soar && !c.sweep) entry.type = 'soar';
  if (c.sweep) {
    entry.type = 'sweep';
    act.sweepDone = true;
    const E = srCrossed(u, entry);
    if (E.length) {
      setTimeout(
        () =>
          openCombat({
            type: 'clash',
            att: act.id,
            tgt: E.length === 1 ? E[0].id : null,
            choices: E.map(e => e.id),
            inAct: false,
            forceContact: true,
            selfTitle: 'Sweeping Step'
          }),
        80
      );
    } else toast('Sweeping Step: it passed through no enemy, so there is no free Clash.');
  }
  if (c.type === 'rooted') {
    const ids = srFriends(u)
      .filter(x => srNear(x, u, 8) && frFac(x) === 'Weaver Courts')
      .map(x => x.id);
    putState({
      units: state.units.map(x =>
        ids.includes(x.id) ? Object.assign({}, x, { seeds: Math.min(3, (+x.seeds || 0) + 1) }) : x
      ),
      lastTitle: N(u.side) + ' · Rooted Might',
      lastText:
        ids.length + ' friendly regiment' + (ids.length === 1 ? '' : 's') + ' within 8″ gain a Seed Marker.'
    }).catch(() => {});
  }
  if (c.type === 'march' && !c.soar) srAfterMarch(base(act.id), entry);
}
