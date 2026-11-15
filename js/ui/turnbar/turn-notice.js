/*
 * Your-turn notice
 *
 * Tells the player when it becomes their turn.
 *
 * In this file: myTurnCards, myTurnStrat, lastTurnSeen, turnNotice(), turnWatch()
 */

let myTurnCards = null,
  myTurnStrat = false,
  lastTurnSeen = null;

function turnNotice(t) {
  let n = $('turn-note');
  if (!n) {
    n = document.createElement('div');
    n.id = 'turn-note';
    n.className = 'aib';
    n.setAttribute('role', 'status');
    document.body.appendChild(n);
  }
  n.textContent = t;
  n.classList.add('on');
  clearTimeout(n._t);
  n._t = setTimeout(() => n.classList.remove('on'), 2600);
  try {
    if (navigator.vibrate) navigator.vibrate(150);
  } catch (e) {}
  document.title = (t.startsWith('Your turn') ? '● ' : '') + document.title.replace(/^● /, '');
}

function turnWatch() {
  if (!state || state.mode === 'test') return;
  const k = (state.step || '') + ':' + (state.round || 0) + ':' + (state.turn || '');
  if (k === lastTurnSeen) return;
  const prev = lastTurnSeen;
  lastTurnSeen = k;
  if (!prev) return;
  if ((state.step || 'activations') === 'activations' && state.turn === HU && !aiBusy) {
    const tp = humanTop();
    turnNotice('Your turn' + (tp ? ' · next card: ' + cardName(tp) : ''));
  } else if ((state.step || 'activations') === 'activations' && state.turn && state.turn !== HU)
    document.title = document.title.replace(/^● /, '');
}
