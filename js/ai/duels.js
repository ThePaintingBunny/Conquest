/*
 * The opponent and Duels
 *
 * Whether the opponent accepts a Duel and when it challenges.
 *
 * In this file: aiAcceptDuel(), aiDuel()
 */

function aiAcceptDuel(Tu, Au) {
  if (duelRefuseWhy(Tu)) return true;
  const o = duelOdds(Tu, Au);
  return o >= 0.8 || (duelNoPenalty(Tu) ? false : o >= 0.5);
}

/* the opponent */
async function aiDuel(id, tid) {
  const u = byId(id),
    C = duelTargets(u);
  const t = C.find(x => x.id === tid) || C.sort((a, b) => duelOdds(u, b) - duelOdds(u, a))[0];
  if (!t) {
    await charCommit(id, { note: 'No action.' });
    return `the ${u.charName} takes no action`;
  }
  lastDuelLine = '';
  openCombat({
    type: 'duel',
    att: id,
    tgt: t.id,
    inAct: false,
    charDuel: true,
    step: 'offer',
    selfTitle: 'Duel'
  });
  for (let i = 0; i < 240 && cb && cb.type === 'duel'; i++) await sleep(500);
  return lastDuelLine || `the ${u.charName} duels`;
}
