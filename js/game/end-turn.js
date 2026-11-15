/*
 * Ending a turn
 *
 * The player ends their turn and play passes on.
 *
 * In this file: artOfWarOk(), artOfWarPass(), endTurn()
 */

/* Art of War (Hundred Kingdoms, [Battlefield]): once per round, skip drawing a Command Card and pass */
function artOfWarOk(side) {
  return (
    state.mode !== 'test' &&
    myTurnCards != null &&
    !myTurnStrat &&
    humanCardsLeft() > 0 &&
    humanCardsLeft() >= myTurnCards &&
    supMem(side).awR !== srRnd() &&
    all().some(x => x.side === side && x.onTable && !x.destroyed && upgOf(x, /Art of War/))
  );
}

async function artOfWarPass() {
  await putState({
    sup: supMemo(HU, { awR: srRnd() }),
    lastTitle: N(HU) + ' · Art of War',
    lastText: 'Art of War: passes without drawing a Command Card.'
  });
  myTurnStrat = true;
  await endTurn();
}

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
