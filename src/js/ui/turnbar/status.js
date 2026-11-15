/*
 * Turn bar: status
 *
 * The front of the turn bar: whose turn it is (loud when it is yours), the round and the score.
 *
 * In this file: tbStatus()
 */

function tbStatus(tb) {
  if (!tb || !state) return;
  const step = state.step || 'activations';
  if (step === 'setup') return;
  const box = document.createElement('div');
  box.className = 'tb-status';
  const span = (cls, text) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    box.appendChild(s);
    return s;
  };
  const mine = step === 'activations' && state.turn === HU && !aiBusy;
  const label = SBX()
    ? 'Test field'
    : step === 'over'
      ? 'Game over'
      : aiBusy
        ? N(AI) + ' acting'
        : step === 'activations'
          ? mine
            ? 'Your turn'
            : (PVP() ? PN(AI) || N(AI) : N(AI)) + '’s turn'
          : step === 'reinforce'
            ? 'Reinforcements'
            : step === 'supremacy'
              ? 'Command Phase'
              : step === 'picks'
                ? 'Scenario picks'
                : 'Round ' + (state.round || 1);
  span('tb-pill' + (mine ? ' you' : SBX() || step === 'over' ? '' : ' wait'), label);
  if (!SBX()) {
    if (state.round)
      span('tb-round', 'Round ' + state.round + (state.maxRounds ? ' of ' + state.maxRounds : ''));
    ['cs', 'nord'].forEach(side => {
      const s = span('tb-vp', N(side) + ' ' + (state.vp?.[side] ?? 0));
      s.style.background = (COL[side] && COL[side].fill) || '#555';
      s.title = WHO(side) + ': ' + (state.vp?.[side] ?? 0) + ' Victory Points';
    });
  }
  tb.prepend(box);
}
