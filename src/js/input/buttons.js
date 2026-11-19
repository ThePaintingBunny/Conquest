/*
 * Button wiring
 *
 * Connects the fixed buttons on the page to what they do.
 */

$('strat-btn').onclick = async () => {
  if (!db || !state) return;
  if (PS().strategicHeld || PS().strategicUsedRound === state.round || act) return;
  if (PVP() && state.turn !== HU) {
    toast('It is not your turn.');
    return;
  }
  let held = {};
  if (huStackOn()) {
    const top = humanTop();
    if (!top || top[0] !== 'u') {
      toast('Only a regiment card can go into the Strategic Stack, and it must be your top card.');
      return;
    }
    held = { huStack: PS().huStack.filter(c => c !== top), huHeld: top, huLastCard: null };
  }
  myTurnStrat = true;
  const sp = Object.assign(held, { strategicHeld: true, strategicUsedRound: state.round });
  if (PVP()) await savePS(sp);
  const next = Object.assign(
    {},
    state,
    PVP() ? {} : sp,
    {
      moves: [],
      lastTitle: N(HU) + ' · Strategic Stack',
      lastText: 'A Command Card was placed face down in the Strategic Stack.',
      updatedBy: HU,
      updatedAt: Date.now()
    },
    srGodflesh(HU, held.huHeld)
  );
  try {
    await db.doc('game/state').set(sanitize(next));
    state = next;
    render();
    await db
      .collection('events')
      .doc('e' + Date.now())
      .set({ at: Date.now(), side: HU, kind: 'strategic-store' });
    toast('Card placed in the Strategic Stack. Press End turn to pass the turn.');
  } catch (e) {
    toast('That could not be saved. Try again in a moment.');
  }
};

$('cb-close').onclick = closeCombat;

$('c-roll-go').onclick = () => {
  if (!selId) return;
  pick = { type: $('c-roll-type').value, att: selId };
  toast('Click the enemy regiment being attacked.');
};

$('rot-l').onclick = () => rot(-15);
$('rot-r').onclick = () => rot(15);
$('rot-180').onclick = () => rot(180);
$('f-less').onclick = () => form(-1);
$('f-more').onclick = () => form(1);
$('done-act').onclick = finishAction;
$('cancel-act').onclick = cancelAction;
$('abort').onclick = abort;
$('ruler').onclick = () => toggleRuler();
$('hk-btn').onclick = () => openSettings('controls');
$('set-open').onclick = () => openSettings();

$('mm-open').onclick = () => {
  if (mmCurrent() && !mmOverlay) {
    mmGo('home');
    return;
  }
  mmOverlay = !mmOverlay;
  mmPage = mmOverlay ? 'home' : null;
  render();
};

$('tab-reg').onclick = () => setTab('reg');
$('tab-army').onclick = () => setTab('army');
$('tab-game').onclick = () => setTab('game');

$('end').onclick = async () => {
  if (!act) return;
  if (cb && (cb.att === act.id || cb.tgt === act.id)) {
    toast('Resolve the dice in the combat panel first.');
    return;
  }
  if (act.cur) {
    toast('Finish or cancel the current action first.');
    return;
  }
  if (act.entering && !act.placed) {
    toast('Confirm the entry point first.');
    return;
  }
  {
    const why = !act.chargeFailed ? endPoseWhy(byId(act.id)) : '';
    if (why) {
      toast(why + ' Move it clear first.');
      return;
    }
  }
  if (!db) {
    toast('The board is read-only in this view, so nothing was saved.');
    return;
  }
  $('end').disabled = true;
  try {
    await saveActivation();
    $('note').value = '';
    toast('Activation saved. Activate an Entourage or other free play now, or press End turn.');
  } catch (e) {
    toast('The activation could not be saved. Try again in a moment.');
  } finally {
    $('end').disabled = false;
  }
};

$('air-close').onclick = () => {
  $('ai-report').hidden = true;
};
