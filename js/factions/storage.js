/*
 * Faction trackers storage
 *
 * Reads and saves each side's faction tracker values (tokens, pools, chosen options).
 *
 * In this file: frG(), frPatch(), frSet()
 */

function frG(side, k) {
  return Object.assign({}, ((state.fr || {})[side] || {})[k] || {});
}

function frPatch(side, k, p) {
  const fr = JSON.parse(JSON.stringify(state.fr || {}));
  fr[side] = fr[side] || {};
  fr[side][k] = Object.assign({}, fr[side][k] || {}, p);
  return fr;
}

function frSet(side, k, p, extra) {
  return putState(Object.assign({ fr: frPatch(side, k, p) }, extra || {}));
}
