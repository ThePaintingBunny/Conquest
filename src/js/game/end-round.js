/*
 * Ending a round
 *
 * Counts the round's kills and ends the round.
 *
 * In this file: roundKills(), endRound()
 */

function roundKills(side) {
  const R = state.round;
  let v = 0;
  const why = [];
  (state.units || [])
    .filter(u => u.side !== side && u.destroyed && u.destroyedRound === R)
    .forEach(u => {
      v += 2;
      why.push(u.name + ' destroyed 2');
      if (u.charName) {
        v += 2;
        why.push(u.charName + ' slain 2');
        if (u.warlord) {
          v += 2;
          why.push('enemy Warlord 2');
        }
      }
    });
  return { v, why };
}

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
