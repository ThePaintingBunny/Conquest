/*
 * Spires: Master Manipulator
 *
 * The Merchant Prince's Offer before Reinforcement Rolls.
 *
 * In this file: mmSides(), mmCur(), mmBest(), mmOffer(), mmAnswer(), mmBar()
 */

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
