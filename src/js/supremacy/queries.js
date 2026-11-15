/*
 * Supremacy queries
 *
 * Which Supremacy Ability a side holds, whether it is active, and its per-battle memory.
 *
 * In this file: supK(), supHasK(), supOn(), supAct(), srIsWl(), srRnd(), supMemo(), supMem()
 */

function supK(side) {
  const S = supOf(side);
  return S ? S.k : '';
}

/* does the side hold this Supremacy Ability (the Warlord's, or the Dynastic Ally's) */
function supHasK(side, k) {
  return supAll(side).some(S => S.k === k);
}

function supOn(side, k) {
  return supAll(side).some(S => S.k === k && (S.d.t !== 'Battlefield' || S.on));
}

function supAct(side, k) {
  return supAll(side).some(S => S.k === k && S.active);
}

function srIsWl(u) {
  const w = supWl(u.side);
  return !!w && w.id === u.id && !w.destroyed && !!w.charName;
}

function srRnd() {
  return state.round || 1;
}

function supMemo(side, patch) {
  const sup = Object.assign({}, state.sup || {});
  sup[side] = Object.assign({}, sup[side] || {}, patch);
  return sup;
}

function supMem(side) {
  return (state.sup || {})[side] || {};
}
