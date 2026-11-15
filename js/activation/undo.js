/*
 * Undoing an activation
 *
 * Puts everything back as it was before the activation started.
 *
 * In this file: abort()
 */

/* Undo activation: everything the activation changed (Ideal Card, Chant, Draw Events, faction tokens...) goes back as it was */
function abort() {
  const sn = act && act.snap;
  act = null;
  cb = null;
  cbQueue = [];
  try {
    renderCombat();
  } catch (e) {}
  if (sn && (sn.units !== state.units || sn.fr !== (state.fr || null) || sn.sup !== (state.sup || null))) {
    putState({
      _undo: true,
      units: sn.units,
      fr: sn.fr,
      sup: sn.sup,
      lastTitle: 'Activation undone',
      lastText: 'The activation and the effects it gave were undone.'
    }).catch(() => {});
  } else render();
  toast('Activation undone.');
}
