/*
 * Saving an activation
 *
 * Ends the activation and saves everything it changed; also records who has acted this round.
 *
 * In this file: actedThisRound(), charActedThisRound(), saveActivation()
 */

/* has the regiment performed any Action this round: its saved activations and out-of-sequence actions, or the
   activation now running (older saved games fall back on "activated") */
function actedThisRound(u) {
  const R = state.round || 1;
  if (act && act.id === u.id && act.actions.length) return true;
  if (u.actedR === R) return true;
  return u.actedR === undefined ? !!u.activated : false;
}

/* has the character performed any Action this round (its own activation; "Pass (no action)" does not count) */
function charActedThisRound(u) {
  const R = state.round || 1;
  if (u.charActedR === R) return true;
  return u.charActedR === undefined ? !!u.charActivated : false;
}

async function saveActivation() {
  const u = byId(act.id),
    G = geom(u),
    side = u.side;
  const units = (state.units || []).map(x =>
    x.id !== act.id
      ? x
      : act.holdBack
        ? /* used the card but stayed off the table: still arriving, it can come on with a later card */
          Object.assign({}, x, { activated: true, arriving: true, onTable: false })
        : Object.assign({}, x, u.order ? { order: u.order.slice() } : {}, {
            x: u.x,
            y: u.y,
            facing: u.facing,
            files: G.files,
            onTable: true,
            arriving: false,
            activated: true,
            /* Die Fighting needs to know whether it performed any Action this round */
            actedR: act.actions.length ? state.round || 1 : x.actedR === (state.round || 1) ? x.actedR : 0,
            arrivedRound: act.entering ? state.round : x.arrivedRound,
            effects: (x.effects || [])
              .filter(
                f =>
                  !(
                    f === 'Broken' &&
                    act.actions.some(a => (a.type === 'rally' || a.type === 'crally') && !a.failed)
                  )
              )
              .concat(
                act.extraFx.filter(
                  f => !(x.effects || []).includes(f) && !/charged|Inspire action|Heaven's Descent/.test(f)
                )
              )
          })
  );
  (act.postFx || []).forEach(([id, src]) => {
    const i = units.findIndex(x => x.id === id);
    if (i >= 0 && !(units[i].effects || []).includes(src))
      units[i] = Object.assign({}, units[i], { effects: (units[i].effects || []).concat([src]) });
  });
  /* Lathander Sacrifice: the regiment is destroyed when the activation ends */
  if (act.lath) {
    const li = units.findIndex(x => x.id === act.id);
    if (li >= 0)
      units[li] = Object.assign({}, units[li], {
        onTable: false,
        destroyed: true,
        status: 'Destroyed (Lathander Sacrifice)',
        destroyedRound: state.round
      });
  }
  const FA = frAfterAct(act, units);
  {
    const gi = units.findIndex(x => x.id === act.id);
    if (gi >= 0) {
      const x = units[gi];
      if (act.occupyT) {
        const t = terrainOf().find(q => tId(q) === act.occupyT),
          d = t ? tInfo(t).def : 1;
        units[gi] = Object.assign({}, x, {
          garrison: act.occupyT,
          garrisonR: state.round || 1,
          garrisonD: d,
          stats: Object.assign({}, x.stats, { D: (+x.stats.D || 0) + d })
        });
      }
      if (act.leaveT) {
        const d = +x.garrisonD || 0;
        units[gi] = Object.assign({}, x, {
          garrison: null,
          garrisonD: 0,
          stats: Object.assign({}, x.stats, { D: (+x.stats.D || 0) - d })
        });
      }
    }
  }
  const pts = act.actions.length
    ? [[act.actions[0].from.x, act.actions[0].from.y]].concat(act.actions.map(a => [a.to.x, a.to.y]))
    : [];
  const desc =
    act.actions
      .map(a =>
        a.type === 'charge'
          ? `Charge vs ${(base(a.target) || {}).short || a.target} at ${a.dist.toFixed(1)}″, rolled ${a.roll}${a.rerolled ? ' (re-rolled)' : ''}: ${a.result === 'failed' ? 'failed, moved ' + (a.moved || 0).toFixed(1) + '″' : 'contact on the ' + a.face}`
          : ACT[a.type].n + (a.dist != null ? ' ' + a.dist.toFixed(1) + '″' : '')
      )
      .join(', ') || (act.holdBack ? 'card used, stays off the table for now' : 'no actions');
  const note = side === ME ? $('note').value.trim() : '';
  const pp =
    side === ME
      ? {
          strategicHeld: act.source === 'strategic' ? false : !!PS().strategicHeld,
          hammerUsed: !!PS().hammerUsed || act.actions.some(a => a.type === 'hammer')
        }
      : {};
  if (side === ME && Array.isArray(PS().huStack)) {
    if (yCard(act.card)) {
      const i = PS().huStack.indexOf(act.card);
      pp.huStack = PS().huStack.filter((c, j) => j !== i);
    } else {
      const own = 'u:' + act.id,
        used = act.card && act.card !== own && act.card[0] === 'u' ? act.card : own;
      pp.huStack = PS()
        .huStack.filter(c => c !== used)
        .map(c => (c === own ? used : c));
    }
    pp.huLastCard = 'u:' + act.id;
    if (act.source === 'strategic') pp.huHeld = null;
  }
  if (PVP() && side === ME) await savePS(pp);
  if (ovrMine()) myTurnStrat = true;
  const next = Object.assign(
    {},
    state,
    PVP() ? {} : pp,
    FA.fr ? { fr: FA.fr } : {},
    ovrMine() ? { ovr: Object.assign({}, state.ovr, { n: (+state.ovr.n || 1) - 1 }) } : {},
    {
      units,
      moves: pts.length > 1 ? [{ unit: act.id, path: pts }] : [],
      lastTitle:
        N(side) +
        ' · ' +
        u.name +
        (act.source === 'strategic'
          ? ' (Strategic Stack)'
          : act.source === 'entourage'
            ? ' (Entourage)'
            : ''),
      lastText: desc + (FA.notes.length ? '. ' + FA.notes.join('; ') : '') + (note ? '. Note: ' + note : ''),
      phase: 'Round ' + (state.round || 1) + ' · ' + (side === ME ? 'Your turn' : N(side) + ' acting'),
      updatedBy: side,
      updatedAt: Date.now()
    }
  );
  state = sanitize(next);
  stateSave(state, {
    k: 'activation',
    a: {
      at: Date.now(),
      side,
      unit: act.id,
      source: act.source,
      entering: act.entering,
      actions: act.actions,
      note,
      final: { x: u.x, y: u.y, facing: u.facing, files: G.files }
    }
  });
  act = null;
  render();
}
