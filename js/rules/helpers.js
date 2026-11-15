/*
 * Special rules helpers
 *
 * Who is alive, friendly, enemy or near; rule modifiers; same warband; below starting strength. Rule
 * texts follow the 2026 faction lists (City States: Post-Adepticon) and the core rules.
 *
 * In this file: srAlive(), srFriends(), srEnemies(), srNear(), srMods(), srAllMods(), srSameWb(),
 *   srCharWith(), belowStart(), srRound(), srConcentrated(), srHas(), srDrum()
 */

function srAlive(u) {
  return !!u && u.onTable && !u.destroyed && u.type !== 'marker';
}

function srFriends(u) {
  return (state.units || []).filter(x => x.side === u.side && x.id !== u.id && srAlive(x));
}

function srEnemies(u) {
  return (state.units || []).filter(x => x.side !== u.side && srAlive(x));
}

function srNear(a, b, d) {
  return srAlive(a) && srAlive(b) && polyDist(corners(a), corners(b)) <= d + 1e-6;
}

function srMods(u) {
  return Array.isArray(u.mods) ? u.mods : [];
}

function srAllMods(u, re) {
  const m = srMods(u);
  return !m.length || m.every(x => re.test(x));
}

function srSameWb(a, b) {
  return a.wb != null && b.wb != null ? a.wb === b.wb : true;
}

function srCharWith(u, rule) {
  return (state.units || []).filter(x => x.side === u.side && !x.destroyed && rh(cR(x), rule));
}

/* below starting strength: lost a stand (or, for one-stand regiments, took a wound) */
function belowStart(u) {
  if (!u) return false;
  const one = u.type === 'monster' || (u.stands || 1) <= 1;
  return one ? (+u.wounds || 0) > 0 : live(u) < (u.stands || 0);
}

function srRound() {
  return state.round || 1;
}

function srConcentrated(ch) {
  return !!ch.warlord && supKey(ch) === 'Concentrated Assault';
}

function srHas(u, re) {
  return fx(u).some(x => re.test(x));
}

function srDrum(u) {
  return (state.units || []).some(
    x => x.side === u.side && srAlive(x) && rh(x.rules, 'Drum Beat') && (x.id === u.id || srNear(x, u, 10))
  );
}
