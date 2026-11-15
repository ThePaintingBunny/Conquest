/*
 * Sorcerer Kings
 *
 * Ritual and spell Courts, Elemental Confluence, spell markers, and the Warlord masteries Vizier of the
 * Morning Star and Prince of the Setting Moon.
 *
 * In this file: skRitualCourt(), skSpellCourt(), skConfluence(), skSpellMarker(), skVizier(),
 *   skPrince()
 */

/* Sorcerer Kings: the Court whose Ritual is being prepared, and Elemental Confluence (a friendly Maharajah: Elemental
   Conduit adds its marker to any Ritual) */
function skRitualCourt(side) {
  const n = frG(side, 'sk').ritual;
  const e = n && Object.entries(RITUALS).find(([, L]) => L.some(x => x[0] === n));
  return e ? e[0].replace('Court of ', '') : '';
}

function skSpellCourt(name) {
  return Object.keys(SK_COURTS).find(c => SK_COURTS[c].includes(name)) || '';
}

function skConfluence(side) {
  return supAll(side).some(S => S.k === 'Elemental Confluence');
}

/* a Ritual Marker for each spell of the prepared Ritual's Court that is cast (successful or not: "Every time a Spell
   is cast"); Shu'laat adds one more once per
   activation */
async function skSpellMarker(cid, sp, asChar, failed) {
  const u = base(cid);
  if (!u || frFac(u) !== 'Sorcerer Kings') return;
  const g = frG(u.side, 'sk'),
    rc = skRitualCourt(u.side),
    sc = skSpellCourt(sp && sp.name ? sp.name : sp);
  if (!g.ritual || !rc || sc !== rc) return;
  let n = 1;
  const notes = [sp.name || sp];
  /* Shu'laat: only for a successfully cast Spell */
  if (asChar && !failed && upgOf(u, /Shu'laat/) && u.shulR !== state.round) {
    n++;
    notes.push("Shu'laat +1");
  }
  await putState({
    fr: frPatch(u.side, 'sk', { rm: (+g.rm || 0) + n }),
    units:
      n > 1
        ? state.units.map(x => (x.id === u.id ? Object.assign({}, x, { shulR: state.round }) : x))
        : state.units
  });
  toast(
    'Ritual: +' + n + ' marker' + (n > 1 ? 's' : '') + ' for ' + g.ritual + ' (' + notes.join(', ') + ').'
  );
}

/* Vizier of the Morning Star (Sorcerer Kings Warlord Mastery): at the end of the Supremacy Phase, friendly regiments
   of its Court lose Broken */
async function skVizier() {
  let units = state.units,
    notes = [];
  ['cs', 'nord'].forEach(side => {
    const wl = supWl(side);
    if (!wl || wl.destroyed || !upgOf(wl, /Vizier of the Morning Star/)) return;
    const c =
      frRoles(wl, true).find(x => /^Court of/.test(x)) || (wl.cschool ? 'Court of ' + wl.cschool : '');
    if (!c) return;
    units = units.map(x => {
      if (x.side !== side || !(x.effects || []).includes('Broken') || !frRoles(x).includes(c)) return x;
      notes.push(x.short || x.name);
      return Object.assign({}, x, { effects: x.effects.filter(e => e !== 'Broken') });
    });
  });
  if (notes.length)
    await putState({
      units,
      lastTitle: 'Vizier of the Morning Star',
      lastText: notes.join(', ') + (notes.length > 1 ? ' are' : ' is') + ' no longer Broken.'
    });
}

/* Prince of the Setting Moon (Sorcerer Kings Warlord Mastery): at the start of the Victory Phase, while the character
   is on the table, friendly Mortal regiments within range of an Objective Zone heal 3 wounds */
async function skPrince() {
  let units = state.units;
  const notes = [];
  ['cs', 'nord'].forEach(side => {
    const wl = supWl(side);
    if (!wl || wl.destroyed || !wl.onTable || !upgOf(wl, /Prince of the Setting Moon/)) return;
    units = units.map(x => {
      if (x.side !== side || !x.onTable || x.destroyed || !(+x.wounds > 0)) return x;
      if (!supRoles(x).includes('Mortals') || !inObjZone(x) || !canHeal(x)) return x;
      const h = Math.min(3, +x.wounds);
      notes.push((x.short || x.name) + ' ' + h);
      return Object.assign({}, x, { wounds: x.wounds - h });
    });
  });
  if (notes.length)
    await putState({
      units,
      lastTitle: 'Prince of the Setting Moon',
      lastText: 'Heals: ' + notes.join(', ') + '.'
    });
}
