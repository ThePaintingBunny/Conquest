/*
 * Game state
 *
 * The shared game state and the current activation, the lookups every rule uses (all regiments, one
 * regiment by id) and putState, the single place where a change is saved and the screen redrawn.
 *
 * In this file: state, db, selId, act, ruler, rA, rB, drag, all(), byId(), base(), view(), putState(),
 *   N(), PN(), WHO()
 */

let state = null,
  db = null,
  selId = null,
  act = null,
  ruler = false,
  rA = null,
  rB = null,
  drag = null;

function all() {
  return (state?.units || []).map(view);
}

function byId(id) {
  return all().find(u => u.id === id);
}

function base(id) {
  return (state?.units || []).find(u => u.id === id);
}

function view(u) {
  if (act && act.id === u.id) return Object.assign({}, u, act.pose);
  if (act && act.tgtPose && act.tgtPose.id === u.id) return Object.assign({}, u, act.tgtPose.pose);
  if (ract && ract.id === u.id && ract.pose) return Object.assign({}, u, ract.pose);
  if (rTgt && rTgt.id === u.id) return Object.assign({}, u, rTgt.pose);
  return u;
}

async function putState(patch) {
  const next = Object.assign({}, state, patch, { updatedAt: Date.now() });
  await db.doc('game/state').set(sanitize(next));
  state = next;
  render();
}

function N(side) {
  return (state && state.names && state.names[side]) || (side === 'cs' ? 'City States' : 'Nords');
}

function PN(side) {
  const v = state && state.players && state.players[side];
  return v ? String(v).slice(0, 24) : '';
}

function WHO(side) {
  const p = PN(side);
  return p ? p + ' (' + N(side) + ')' : N(side);
}
