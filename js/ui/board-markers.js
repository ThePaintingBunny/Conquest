/*
 * Activation markers on the board
 *
 * Shows on the table itself where the activations are: a brass outline and flag on every regiment you can
 * activate right now, and a tick on every regiment that has already activated this round.
 *
 * In this file: canActivateNow(), drawActivationMarkers()
 */

/* can this regiment (or its character) be activated by this player right now */
function canActivateNow(u) {
  try {
    if (!state || SBX() || act || charAct || aiBusy) return false;
    if ((state.step || 'activations') !== 'activations' || state.turn !== HU) return false;
    if (!u || u.side !== HU || !u.onTable || u.destroyed || isMarker(u)) return false;
    const regFree = !u.activated,
      charFree = !!u.charName && !u.charActivated;
    if (!regFree && !charFree) return false;
    if (!huStackOn()) return true;
    const top = vocOk('u:' + u.id) ? 'u:' + u.id : humanTop(),
      yc = yCard(top),
      okU = regFree && (yc ? ySame(top, u, false) : !!top && top[0] === 'u' && sameCard(top, u)),
      okC = charFree && (yc ? ySame(top, u, true) : !!top && top[0] === 'c' && sameCard(top, u)),
      held = regFree && huHeldOk() && sameCard(PS().huHeld, u) && stratU(u);
    return !!(okU || okC || held);
  } catch (e) {
    return false;
  }
}

function drawActivationMarkers(parent) {
  if (!state || SBX() || (state.step || 'activations') !== 'activations') return;
  const g = el('g', { id: 'actmarks', 'pointer-events': 'none' }, parent);
  all()
    .filter(u => u.onTable && !u.destroyed && !isMarker(u))
    .forEach(u => {
      const P = corners(u).map(q => [px(q[0]), py(q[1])]),
        bx = Math.max(...P.map(q => q[0])),
        by = Math.min(...P.map(q => q[1]));
      const badge = (cls, glyph, label) => {
        const b = el('g', { class: 'am-badge ' + cls, transform: `translate(${bx + 3} ${by - 3})` }, g);
        el('circle', { r: 7 }, b);
        el('text', { 'text-anchor': 'middle', y: 3.4, 'font-size': 9.5, 'font-weight': 700 }, b).textContent =
          glyph;
        el('title', {}, b).textContent = label;
      };
      if (canActivateNow(u)) {
        el(
          'polygon',
          {
            points: grownPoly(corners(u), 0.4)
              .map(q => px(q[0]) + ',' + py(q[1]))
              .join(' '),
            class: 'am-next'
          },
          g
        );
        badge('next', '▶', 'You can activate ' + (u.short || u.name) + ' now');
      } else if (u.activated && !(act && act.id === u.id)) {
        badge('done', '✓', (u.short || u.name) + ' has activated this round');
      }
    });
}
