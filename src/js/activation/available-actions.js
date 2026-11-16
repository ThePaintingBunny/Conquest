/*
 * Available actions
 *
 * Which actions the active regiment may take next, and why the others are blocked.
 *
 * In this file: FREE_OF, availableActions(), inspWhy()
 */

/* free actions that count as the action they copy, for the no-repeat rule */
const FREE_OF = { xvolley: 'volley' };

function availableActions(u) {
  const out = [];
  if (!act || act.id !== u.id) return out;
  if (act.entering && !act.placed) return out;
  const used = act.actions.filter(a => !a.free),
    last = used[used.length - 1],
    n = act.actions.filter(
      a => a.type !== 'xreform'
    ).length /* out-of-sequence actions do not count towards the 3 */,
    eng = engaged(u);
  const broken = (u.effects || []).includes('Broken'),
    arrive = act.entering || act.arrivedThisRound;
  const firstMust = act.entering && used.length === 0;
  const cap = used.length >= 2 || n >= 3;
  const can = (type, why) => out.push({ type, why });
  const repeatOk = t => t === 'march' || t === 'reform';
  const blocked = t => {
    if (cb) return 'Resolve the dice in the combat panel first';
    if (act.chargeFailed) return 'The failed Charge ended this activation';
    if (act.occupyT || act.leaveT) return 'Moving in or out of a building ends the activation';
    if (act.cur) return 'Finish the current action first';
    if (cap) return 'No actions left';
    if (firstMust && t !== 'march') return 'An arriving regiment must March first';
    /* no repeats except March and Reform; a free version of an action counts too (core rules 2026) */
    const same = a => a.type === t || (FREE_OF[a.type] === t && a.free !== false);
    /* Spellcasting keeps its own count (Mahotsu and the like may cast twice, never the same spell twice) */
    if (t !== 'cast' && !repeatOk(t) && act.actions.some(same)) return 'Already used this activation';
    if (t === 'cast' && used.some(a => a.type === 'cast')) return 'Already used this activation';
    return '';
  };
  if (u.garrison) {
    if (!eng.length && hasBarrage(u)) {
      can('volley', blocked('volley'));
      can('aim', aimWhy(u) || blocked('aim'));
    }
    if (eng.length) can('clash', blocked('clash'));
    if (!animate(u)) can('inspire', inspWhy(u) || blocked('inspire'));
    can(
      'leave',
      u.garrisonR === (state.round || 1)
        ? 'It occupied the building this round: it cannot leave it in the same round'
        : used.length
          ? 'Leaving takes both actions: do it as the first action'
          : broken
            ? ''
            : blocked('leave')
    );
    return out;
  }
  if (!eng.length && !arrive && tGarrisonNear(u).length) can('occupy', blocked('occupy'));
  if (!eng.length) {
    can('march', blocked('march'));
    can(
      'charge',
      arrive
        ? 'No Charge in the round a regiment arrives'
        : broken
          ? 'A Broken regiment cannot Charge'
          : blocked('charge')
    );
    can('reform', blocked('reform'));
    if (hasBarrage(u)) {
      can('volley', blocked('volley'));
      can('aim', aimWhy(u) || blocked('aim'));
    }
    if (broken) can('rally', blocked('rally'));
  } else {
    can('clash', blocked('clash'));
    can('creform', blocked('creform'));
    if (!animate(u)) can('inspire', inspWhy(u) || blocked('inspire'));
    if (/Light|Medium/.test(u.cls || '')) can('withdraw', blocked('withdraw'));
    if (broken) can('crally', blocked('crally'));
  }
  {
    const RC = regCaster(u);
    if (RC && u.onTable && magicLevel(u, false) && spellsOf(u, false).length) {
      const nc = act.actions.filter(a => a.type === 'cast').length,
        fr = RC.free || act.freeCast || (RC.extra && !act.actions.some(a => a.type === 'cast' && a.free));
      const why = nc >= (RC.extra ? 2 : 1) ? 'Already cast this activation' : fr ? '' : blocked('cast');
      out.push({ type: 'cast', why, free: !!fr });
    }
  }
  if (memOf(u)) {
    can('memory', hasGrant(base(u.id), 'Memories of Old') ? 'Already active this round' : blocked('memory'));
  }
  if (RU(u).some(x => /^Fluid Formation/.test(x)) && !act.actions.some(a => a.type === 'fluid') && !act.cur) {
    const ok = used.length === 0 || cap;
    const narrow = geom(u).files <= 3;
    out.push({
      type: 'fluid',
      why: !narrow
        ? 'Needs 3 or fewer stands in the front rank'
        : ok
          ? ''
          : 'Only before the first action or after the last',
      free: true
    });
  }
  if (
    supOn(u.side, 'Hammer and Anvil') &&
    /Infantry|Cavalry/.test(u.cls || '') &&
    !PS().hammerUsed &&
    !act.actions.some(a => a.type === 'hammer') &&
    !act.cur &&
    used.length >= 1
  ) {
    out.push({ type: 'hammer', why: eng.length ? 'Not while engaged' : '', free: true });
  }
  if (
    used.length === 2 &&
    used[0].type === 'march' &&
    used[1].type === 'march' &&
    hasDraw(u, /^Double Time/) &&
    !act.actions.some(a => a.dt) &&
    !act.cur
  )
    out.push({ type: 'dtmarch', why: '', free: true });
  if (trampleX(u) && !act.actions.some(a => a.type === 'trample') && !act.cur && frontFoes(u).length)
    out.push({ type: 'trample', why: '', free: true });
  if (
    used.length === 2 &&
    used[1].type === 'volley' &&
    hasDraw(u, /Fire and Advance/) &&
    !act.actions.some(a => a.fadv) &&
    !act.cur &&
    act.actions.length < 3
  )
    out.push({ type: 'fadv', why: '', free: true });
  srActions(u, out, used, eng, blocked);
  return out;
}

function inspWhy(u) {
  /* Automatons (Clockwork Hoplites and the like) can never be Inspired */
  if (rh(RU(u), 'Automaton') && !rh(RU(u), 'Dauntless')) return 'An Automaton cannot be Inspired';
  if (act && act.id === u.id && act.actions.some(a => a.type === 'inspire')) return '';
  return fxHas(u, /^Inspired/) || rh(u.rules || [], 'Inspired') ? 'Already Inspired' : '';
}
