/*
 * Derived rules and stats
 *
 * Rules and stat changes a regiment has because of where it is, who leads it or its state.
 *
 * In this file: dRules(), canHeal(), noBreak(), srStat()
 */

/* ---- derived rules: rule strings a unit has because of where it is, who leads it or its state ---- */
function dRules(u) {
  const o = [];
  if (!state || !u || u.type === 'marker') return o;
  let roles = [];
  try {
    roles = frRoles(u);
  } catch (e) {}
  const add = (...r) =>
    r.forEach(x => {
      if (!o.includes(x)) o.push(x);
    });
  if (rh(cR(u), 'Stoic')) add('Indomitable (1)');
  if (rh(cR(u), "Tribe's Pride")) add(u.rider && upgOf(u, /Tontorr Rider/) ? 'Vanguard (5)' : 'Flurry');
  if (
    roles.includes('Forged') &&
    (state.units || []).some(
      x =>
        x.side === u.side &&
        x.rider &&
        srAlive(x) &&
        upgOf(x, /Ferric Throne/) &&
        (x.id === u.id || srNear(x, u, 8))
    )
  )
    add('Unstable Alloys');
  if (rh(cR(u), 'Ceaseless Hunt')) add('Fire and Advance');
  if (rh(cR(u), 'Imposing Excellence') && roles.includes('Husk')) add('Parry');
  if (/Shaman/.test(u.charName || '') && rh(u.rules, 'Bodyguard while a Shaman is attached'))
    add('Bodyguard');
  if (roles.includes('The Tribes')) {
    for (const ch of srCharWith(u, 'Crushing Force'))
      if (ch.id === u.id || srConcentrated(ch) || srNear(ch, u, 8)) {
        add('Trample (1)');
        break;
      }
    for (const ch of srCharWith(u, 'Tempo')) {
      const c = srConcentrated(ch);
      if (c || srSameWb(ch, u)) {
        add('Vanguard (' + (c ? 4 : 3) + ')');
        break;
      }
    }
  }
  if (frBase(u) === 'Thunder Riders' && srCharWith(u, 'Ride the Lightning').some(ch => srSameWb(ch, u)))
    add('Flank');
  if (roles.includes('The Speakers') && srCharWith(u, 'Expert Hunters').some(ch => srSameWb(ch, u)))
    add('Ignores Hindering terrain', 'Ignores Dangerous terrain', 'Ignores Perilous terrain');
  const below = belowStart(u) || !!u.belowOnce;
  if (rh(u.rules, 'Rampage') && belowStart(u)) add('Rampage (+1 Clash, +1 Attacks)');
  if (rh(u.rules, 'Shattered Perfection') && below)
    add('Smite', 'Fury', 'Oblivious', 'Charge +2″ (Shattered Perfection)');
  if (rh(u.rules, 'Raging Elements') && below) add('Flurry', 'Raging Elements (one extra Clash)');
  if (rh(u.rules, 'Titanic Defiance') && engaged(u).some(e => e.type === 'monster')) add('Fearless');
  if (rh(u.rules, 'Spirit Breeze') || srMods(u).some(m => /Tengu Ayakashi/.test(m)))
    add('March +1 (Spirit Breeze)');
  if (rh(u.rules, 'In the Fold') && srAllMods(u, /Origami/))
    add('Vanguard (3)', 'Cannot be Broken (In the Fold)');
  if (rh(u.rules, 'Fly if only Tengu') && srAllMods(u, /Tengu/)) add('Fly');
  if (rh(u.rules, 'Blade Masters') && srAllMods(u, /Tengu Bushi/))
    add('Blade Masters (Flawless on 1s and 2s)');
  if (rh(u.rules, 'Life for Glory') || rh(u.rules, 'no Resolve, cannot Break'))
    add('Cannot be Broken (Life for Glory)');
  if (
    act &&
    act.id === u.id &&
    u.type !== 'monster' &&
    srFriends(u).some(f => rh(f.rules, 'Cheerful') && srNear(f, u, 8))
  )
    add('Cheerful (+1 Resolve)');
  if (rh(u.rules, 'Just Desserts')) {
    const s = spSect(u.side);
    if (/Sovereign/.test(s)) add('Hardened (1)');
    else if (/Directorate/.test(s)) add('March +2 (Just Desserts)');
    else if (/Underspire/.test(s)) add('Regeneration (2)');
  }
  if (u.gorged) {
    add('Gorged (+6 Attacks, Strain always on)');
    const S = srStrain(u);
    if (S) (S[1] || []).forEach(r => add(r));
  }
  if (
    rh(u.rules, 'Prowl') &&
    u.prowlLost !== srRound() &&
    !srEnemies(u).some(e => srNear(e, u, 8 - 1e-6) && !tLos(e, u))
  )
    add('Prowling (−2 March, does not Seize, unseen from 8″ or more)');
  if (
    rh(u.rules, 'Earthen Aegis') &&
    u.onTable &&
    terrainOf().some(t => tHas(t, 'Earth') && terrDist(corners(u), t) <= 3)
  )
    add('Regeneration (+4)', 'Ignores Dangerous terrain', 'Ignores Perilous terrain');
  if (rh(u.rules, 'Water Elemental') && srFriends(u).some(f => rh(f.rules, 'Dread Tide') && srNear(f, u, 8)))
    add('Terrifying (+1)');
  if (
    srEnemies(u).some(
      e =>
        rh(e.rules, 'Primal Cacophony') &&
        (e.temp || []).some(g => /^Chant: /.test(g.src)) &&
        srNear(e, u, 12)
    )
  )
    add('Primal Cacophony (cannot Heal, Rally or Entourage-activate)');
  if (u.thegnTactic && TACTICS[u.thegnTactic] && offOn(u, 'thegn'))
    TACTICS[u.thegnTactic].forEach(x => add(x + ' (Thegn)'));
  try {
    supDR(u).forEach(x => add(x));
  } catch (e) {}
  try {
    itemRegRules(u).forEach(x => add(x));
  } catch (e) {}
  {
    const h = huntedOf(u.side);
    if (h && /Inquisitor/.test(frBase(u)) && engaged(u).some(e => e.id === h.id))
      add('Terrifying (2) (Hunted)');
  }
  if (supOn(u.side, 'Bringing Back the Children of Fire') && roles.includes('Titan')) add('Priest (+3)');
  return o;
}

function canHeal(u) {
  if (srHas(u, /^Primal Cacophony/)) return false;
  /* core rules: a Broken regiment cannot be Healed. Rapid Blossoming (Weaver Courts Gift): its Court of Spring
     regiment can. */
  if ((u.effects || []).includes('Broken'))
    return !!(u.charName && upgOf(u, /Rapid Blossoming/) && frRoles(u).includes('Court of Spring'));
  return true;
}

function noBreak(u) {
  return srHas(u, /^Cannot be Broken/) || hasGrant(u, 'Awakened');
}

/* stat changes from rules */
function srStat(u, kind) {
  const d = { C: 0, A: 0 };
  if (kind !== 'reg') return d;
  if (srHas(u, /^Rampage \(/)) {
    d.C++;
    d.A++;
  }
  if (srHas(u, /^Fury \(\+1 Attacks\)/)) d.A++;
  if (srHas(u, /^Gorged/)) d.A += 6;
  /* Tribal Spear (W'adrhŭn): its regiment +1 Attacks while within range of an Objective Zone */
  if (u.charName && upgOf(u, /Tribal Spear/) && inObjZone(u)) d.A++;
  return d;
}
