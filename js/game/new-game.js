/*
 * Starting a new game
 *
 * Resets the state for a new game.
 *
 * In this file: newGameNow(), newGame()
 */

async function newGameNow() {
  resetArm = true;
  await newGame();
}

async function newGame() {
  if (!resetArm) {
    resetArm = true;
    render();
    setTimeout(() => {
      resetArm = false;
      render();
    }, 5000);
    return;
  }
  resetArm = false;
  act = null;
  cb = null;
  selId = null;
  charAct = null;
  await putState({
    step: 'setup',
    fr: null,
    sup: null,
    aiSupWant: null,
    units: [],
    round: 0,
    turn: null,
    vp: { cs: 0, nord: 0 },
    aiStack: [],
    huStack: [],
    huHeld: null,
    huLastCard: null,
    strategicHeld: false,
    moves: [],
    setup: null,
    phase: 'New game',
    ready: {},
    chooser: null,
    reinfTurn: 'cs',
    lastTitle: 'New game',
    lastText: 'Set up the armies to begin.'
  });
  $('ai-report').hidden = true;
}
