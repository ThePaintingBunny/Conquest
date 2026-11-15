/*
 * Charge range
 *
 * How far a regiment can charge and the rules that change it.
 *
 * In this file: chargeFixed(), lethargyT(), jugg(), chargeMax(), chargeMaxVs()
 */

function chargeFixed(u) {
  return jugg(u) ? 5 : phalanx(u) ? 3 : null;
}

function lethargyT(u) {
  const t =
    act && act.id === u.id && act.cur && act.cur.type === 'charge' && act.cur.target && byId(act.cur.target);
  return !!t && upgOf(t, /Induce Lethargy/);
}

function jugg(u) {
  if (lethargyT(u) && !fx(u).some(x => /Clockwork Parade|^Aristia/.test(x))) return false;
  return hasRule(u, /^Juggernaut/) || fx(u).some(x => /Clockwork Parade|^Aristia/.test(x));
}

function chargeMax(u) {
  const f = chargeFixed(u);
  return (
    (u.m || 0) +
    (f != null ? f : 6 + srChargeBonus(u, act && act.cur && act.cur.target ? byId(act.cur.target) : null)) +
    (act && act.cur && act.cur.pu ? 2 : 0)
  );
}

/* the furthest this regiment can charge against this target (some rules add to the Charge Roll against particular targets) */
function chargeMaxVs(u, t) {
  const c = act && act.cur,
    prev = c ? c.target : null;
  if (c) c.target = t.id;
  try {
    return chargeMax(u);
  } finally {
    if (c) c.target = prev;
  }
}
