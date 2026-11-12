/* Unique character rules: Master Manipulator, Assassination Directive, Privileged Observer. */
/* ---- Master Manipulator (Merchant Prince): an Offer before Reinforcement Rolls ---- */
function mmSides() {
  return ['cs', 'nord'].filter(s =>
    (state.units || []).some(u => u.side === s && !u.destroyed && /Merchant Prince/.test(u.charName || ''))
  );
}
function mmCur() {
  const R = state.round || 1;
  return state.mm && state.mm.r === R ? state.mm : null;
}
function mmBest(side) {
  return reserves(side)
    .filter(u => reinfRule(u.cls, state.round || 1) !== 'no' && reinfRule(u.cls, state.round || 1) !== 'auto')
    .sort((a, b) => (+b.points || 0) - (+a.points || 0))[0];
}
async function mmOffer(by) {
  const R = state.round || 1,
    o = other(by);
  let m = { r: R, by, ans: null, pick: {} };
  if (!PVP() && o === AI) {
    const acc = reserves(AI).length >= reserves(HU).length;
    m.ans = acc ? 'accept' : 'decline';
    if (acc) {
      const b = mmBest(AI);
      m.pick[AI] = b ? b.id : 'none';
    }
  }
  if (!PVP() && by === AI) {
    m.ans = null;
  }
  await putState({
    mm: m,
    lastTitle: N(by) + ' · Master Manipulator',
    lastText:
      'An Offer is made before Reinforcement Rolls.' +
      (m.ans ? ' ' + N(o) + (m.ans === 'accept' ? ' accept it.' : ' decline it.') : '')
  });
}
async function mmAnswer(ans) {
  const m = Object.assign({}, mmCur());
  m.ans = ans;
  m.pick = Object.assign({}, m.pick || {});
  if (!PVP() && ans === 'accept') {
    const b = mmBest(AI);
    m.pick[AI] = b ? b.id : 'none';
  }
  if (!PVP() && ans === 'decline' && m.by === AI) m.opt = 'reroll';
  await putState({
    mm: m,
    lastTitle: 'Master Manipulator',
    lastText:
      'The Offer is ' +
      (ans === 'accept'
        ? 'accepted: each player picks one more regiment that arrives automatically with Vanguard (3).'
        : 'declined.')
  });
}
function mmBar(add, mk, me, info) {
  const S = mmSides();
  if (!S.length) return false;
  const R = state.round || 1;
  let m = mmCur();
  if (!m) {
    let by = S.length === 1 ? S[0] : state.mmRoll && state.mmRoll.r === R ? state.mmRoll.by : null;
    if (!by) {
      const a = d6(),
        b = d6();
      by = a <= b ? 'cs' : 'nord';
      putState({
        mmRoll: { r: R, by },
        lastTitle: 'Master Manipulator',
        lastText:
          'Both armies have a Merchant Prince: roll-off ' +
          a +
          ' against ' +
          b +
          '; ' +
          N(by) +
          ' make the Offer.'
      });
      return true;
    }
    if (by === me) {
      info.textContent =
        'Master Manipulator: before Reinforcement Rolls you may make your opponent an Offer. Accepted: both of you pick one more regiment that arrives automatically with Vanguard (3). Declined: you may re-roll one failed Reinforcement Roll, or give one reserve Vanguard (3).';
      add(mk('Make the Offer', () => mmOffer(me)));
      add(mk('No Offer this round', () => putState({ mm: { r: R, by: me, ans: 'none' } }), true));
      return true;
    }
    if (!PVP() && by === AI) {
      mmOffer(AI);
      return true;
    }
    info.textContent = 'Waiting for ' + WHO(by) + ' to decide on the Master Manipulator Offer.';
    return true;
  }
  if (m.ans === 'none') return false;
  if (!m.ans) {
    if (m.by === me) {
      info.textContent = 'Offer made. Waiting for ' + WHO(other(me)) + ' to answer.';
      return true;
    }
    info.textContent =
      WHO(m.by) +
      ' make you an Offer (Master Manipulator). Accept: each player picks one more regiment that arrives automatically this round with Vanguard (3). Decline: they may re-roll one failed Reinforcement Roll or give one of their reserves Vanguard (3).';
    add(mk('Accept the Offer', () => mmAnswer('accept')));
    add(mk('Decline', () => mmAnswer('decline'), true));
    return true;
  }
  const pickSel = (lab, fn, skip) => {
    const pool = reserves(me).filter(u => reinfRule(u.cls, R) !== 'no');
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', lab);
    pool.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id;
      o.textContent = u.name + ' (' + u.cls + ')';
      sel.appendChild(o);
    });
    if (!pool.length) {
      skip();
      return null;
    }
    add(sel);
    add(mk('Confirm', () => fn(sel.value)));
    return sel;
  };
  if (m.ans === 'accept' && !(m.pick || {})[me]) {
    info.textContent =
      'Master Manipulator (accepted): pick one more regiment that arrives automatically this round with Vanguard (3).';
    pickSel(
      'Extra automatic arrival',
      id => putState({ mm: Object.assign({}, m, { pick: Object.assign({}, m.pick, { [me]: id }) }) }),
      () => putState({ mm: Object.assign({}, m, { pick: Object.assign({}, m.pick, { [me]: 'none' }) }) })
    );
    return true;
  }
  if (m.ans === 'decline' && m.by === me && !m.opt) {
    info.textContent = 'Master Manipulator (declined): choose your benefit.';
    add(
      mk('Re-roll one failed Reinforcement Roll', () =>
        putState({ mm: Object.assign({}, m, { opt: 'reroll' }) })
      )
    );
    pickSel(
      'Regiment that gains Vanguard (3)',
      id => putState({ mm: Object.assign({}, m, { opt: 'vanguard', vg: id }) }),
      () => putState({ mm: Object.assign({}, m, { opt: 'reroll' }) })
    );
    return true;
  }
  if (m.ans === 'accept' && PVP() && !(m.pick || {})[other(me)]) {
    info.textContent = 'Waiting for ' + WHO(other(me)) + ' to pick their extra regiment.';
    return true;
  }
  return false;
}
/* ---- Assassination Directive (Mimetic Assassin) ---- */
function assassinHolder(side) {
  return (state.units || []).find(x => x.side === side && x.assassinHold && !x.assassinUsed);
}
function assassinOk(u) {
  return !!u && /Infantry/.test(u.cls || '') && !u.charName && engaged(u).length && !!assassinHolder(u.side);
}
function srAssassin(u) {
  const H = assassinHolder(u.side),
    A = H.assassinHold,
    W = +(u.stats && u.stats.W) || 4,
    eng = engaged(u);
  const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
  act.cur = { type: 'clash', assassin: true, start: st, budget: 0, moving: false, reshape: false };
  (async () => {
    const files = geom(u).files;
    await putState({
      units: state.units.map(x => {
        if (x.id === H.id && x.id !== u.id) x = Object.assign({}, x, { assassinUsed: true });
        if (x.id !== u.id) return x;
        return Object.assign({}, x, x.id === H.id ? { assassinUsed: true } : {}, {
          charName: A.name,
          charStats: A.stats,
          charRules: A.rules,
          char: files >= 3 ? Math.min(2, files - 1) : Math.min(files - 1, 1),
          stands: (x.stands || 1) + 1,
          wounds: (x.wounds || 0) + W,
          charActivated: true
        });
      }),
      lastTitle: N(u.side) + ' · Assassination Directive',
      lastText: `The ${A.name} replaces a front-rank stand of ${u.short || u.name} (removed as a casualty; it does not count towards Broken or Shattered), strikes, and may Duel.`
    });
    const ids = eng.map(e => e.id);
    openCombat({
      type: 'lethal',
      att: u.id,
      tgt: ids.length === 1 ? ids[0] : null,
      choices: ids,
      inAct: false,
      lethalHits: W,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Assassination Directive',
      lethalRed: 2,
      selfTitle: 'Assassination Directive',
      selfText: `The ${A.name} strikes: ${W} Hits with Cleave (2) on one enemy regiment in contact. No Morale Tests.`
    });
    const ch = eng.filter(e => e.charName || isMChar(e));
    if (ch.length)
      srQueue({
        type: 'duel',
        att: u.id,
        tgt: ch[0].id,
        inAct: false,
        step: 'offer',
        selfTitle: 'Duel (Assassination Directive)'
      });
    srQueue({ type: 'clash', att: u.id, tgt: ids.length === 1 ? ids[0] : null, choices: ids, inAct: true });
    render();
  })();
  return true;
}
async function exAssassin() {
  startAction('assassin');
  for (let i = 0; i < 400; i++) {
    await sleep(400);
    if (!cb && !cbQueue.length && !(act && act.cur)) break;
  }
  return 'the Mimetic Assassin strikes from the ranks';
}
/* ---- Privileged Observer (Force Grown Drones) and Optimized Fodder ---- */
function privOk(u) {
  return (
    frBase(u) === 'Force Grown Drones' &&
    /Biomancer|Pheromancer/.test(u.charName || '') &&
    !/Medium/.test(u.cls || '') &&
    (state.round || 1) === 1 &&
    !u.onTable
  );
}
function fodder6(u) {
  return (
    frBase(u) === 'Force Grown Drones' &&
    rh(u.rules || [], 'Optimized Fodder') &&
    (u.stands || 0) - (u.char != null ? 1 : 0) - (u.aux != null ? 1 : 0) >= 6
  );
}
function srStrain(u) {
  const S = STRAIN[frBase(u)];
  if (S && fodder6(u)) return [S[0] + ' (Optimized Fodder)', ['Lethal Demise (2)'], '+1 March', { M: 1 }];
  return S;
}
