/*
 * Ending a round
 *
 * Counts the round's kills and ends the round; when one army has nothing left, simulates the rest.
 *
 * In this file: endRound(), sideHasArmy(), simEndSide(), simEndOk(), simToEnd()
 */

async function endRound() {
  if (!state) return;
  try {
    await skPrince();
  } catch (e) {}
  const R = state.round || 1,
    vp = Object.assign({ cs: 0, nord: 0 }, state.vp || {}),
    SR = scoreRound(R),
    add = SR.add,
    lines = SR.lines;
  vp.cs += add.cs;
  vp.nord += add.nord;
  const rep = [
    {
      title: 'Round ' + R + ' scored',
      lines: [
        `${N('cs')} +${add.cs}: ${lines.cs.join(', ') || 'nothing'}`,
        `${N('nord')} +${add.nord}: ${lines.nord.join(', ') || 'nothing'}`,
        `Score: ${N('cs')} ${vp.cs}, ${N('nord')} ${vp.nord}`
      ],
      narration: ''
    }
  ];
  const last = state.maxRounds || 10;
  if (R >= last) {
    await putState({
      vp,
      step: 'over',
      turn: null,
      phase:
        'Game over · ' + (vp.cs === vp.nord ? 'a draw' : (vp.cs > vp.nord ? N('cs') : N('nord')) + ' win'),
      lastTitle: 'Final score',
      lastText: rep[0].lines.join(' · ')
    });
    showReport(rep);
    $('air-title').textContent = 'Victory Phase';
    return;
  }
  const FRE = frRoundEnd(state.units || [], R + 1);
  const units = FRE.units.map(u =>
    Object.assign({}, u, {
      activated: false,
      charActivated: false,
      effects: (u.effects || []).filter(e => e === 'Broken' || /^Season: /.test(e))
    })
  );
  const RLn = { cs: rlCompute('cs', units), nord: rlCompute('nord', units) };
  await putState({
    ovr: null,
    fr: FRE.fr,
    vp,
    units,
    rl: RLn,
    rlStart: RLn,
    round: R + 1,
    step: 'reinforce',
    turn: null,
    picks: {},
    ready: {},
    reinfTurn: 'cs',
    chooser: null,
    aiStack: [],
    huStack: [],
    huHeld: null,
    huLastCard: null,
    strategicHeld: false,
    hammerUsed: false,
    moves: [],
    phase: 'Round ' + (R + 1) + ' · Reinforcements',
    lastTitle: 'Round ' + R + ' scored',
    lastText: rep[0].lines.join(' · ')
  });
  showReport(rep);
  $('air-title').textContent = 'Victory Phase';
}

/* ---- One army has nothing left: the other may simulate the remaining rounds ----
   Only the Victory Phase is played for the current round and each one after it: every regiment stays where it
   stands, nothing moves, fights or arrives from reserve. */
function sideHasArmy(side) {
  return (state.units || []).some(
    u => u.side === side && !u.destroyed && !isMarker(u) && u.type !== 'marker'
  );
}

/* the side with regiments left, when the other has none (on the table or in reserve); otherwise null */
function simEndSide() {
  if (!state || state.mode === 'test' || SBX()) return null;
  const st = state.step || 'activations';
  if (['over', 'setup', 'review'].includes(st)) return null;
  const c = sideHasArmy('cs'),
    n = sideHasArmy('nord');
  return c && !n ? 'cs' : n && !c ? 'nord' : null;
}

function simEndOk() {
  const s = simEndSide();
  if (!s || act || charAct) return false;
  /* online: the player who still has regiments; against the built-in opponent: you, either way */
  return PVP() ? seatSide() === s : true;
}

async function simToEnd() {
  if (!simEndOk()) return;
  const s0 = state,
    R0 = s0.round || 1,
    last = s0.maxRounds || 10,
    vp = Object.assign({ cs: 0, nord: 0 }, s0.vp || {}),
    lines = [];
  try {
    for (let R = R0; R <= last; R++) {
      state = Object.assign({}, s0, { round: R, picks: R === R0 ? s0.picks || {} : {} });
      const SR = scoreRound(R);
      vp.cs += SR.add.cs;
      vp.nord += SR.add.nord;
      lines.push(
        `Round ${R}: ${N('cs')} +${SR.add.cs}${SR.lines.cs.length ? ' (' + SR.lines.cs.join(', ') + ')' : ''}, ` +
          `${N('nord')} +${SR.add.nord}${SR.lines.nord.length ? ' (' + SR.lines.nord.join(', ') + ')' : ''}`
      );
    }
  } finally {
    state = s0;
  }
  const fin = `Final score: ${N('cs')} ${vp.cs}, ${N('nord')} ${vp.nord}`;
  await putState({
    vp,
    round: last,
    step: 'over',
    turn: null,
    phase: 'Game over · ' + (vp.cs === vp.nord ? 'a draw' : (vp.cs > vp.nord ? N('cs') : N('nord')) + ' win'),
    lastTitle: 'Simulated to the end',
    lastText: lines.concat(fin).join(' · ')
  });
  showReport([
    { title: 'Simulated to the end (Victory Phases only)', lines: lines.concat(fin), narration: '' }
  ]);
  $('air-title').textContent = 'Victory Phase';
}
