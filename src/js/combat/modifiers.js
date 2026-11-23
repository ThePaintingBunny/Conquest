/*
 * Combat modifiers
 *
 * Hit modifiers, Impact, lost Support and Tenacious against Volleys.
 *
 * In this file: tenVol(), supportLost(), supportX(), hasImpact(), hitMods()
 */

function tenVol(rules) {
  let v = 0;
  for (const r of rules || []) {
    const m = String(r).match(/Tenacious\s*\((\d+)\)\s*(?:against|vs\.?)\s*Volleys/i);
    if (m) v = Math.max(v, +m[1]);
  }
  return v;
}

/* Support (X) is lost while an enemy regiment is Engaged with the regiment's flank or rear. The side is the one the
   enemy actually touches, so an enemy in front contact but offset to one side still counts as the front */
function supportLost(u) {
  if (rh(RU(u), 'Iron Discipline')) return false;
  return engaged(u).some(e => (contactArc(u, e) || arcOf(u, [e.x, e.y])) !== 'front');
}

/* the Supporting Attacks each unengaged stand adds: 1, or X from Support (X); a Support (+X) bonus is added to that
   (to 1 when the regiment has no Support (X) of its own) */
function supportX(u) {
  if (supportLost(u)) return 1;
  const R = RU(u);
  let base = 0,
    add = 0;
  R.forEach(r => {
    const m = String(r).match(/(?:^|, )Support\s*\((\+?)(\d+)\)/);
    if (!m) return;
    if (m[1]) add += +m[2];
    else base = Math.max(base, +m[2]);
  });
  return (base || 1) + add;
}

function hasImpact(u) {
  if (!u || rh(RU(u), 'Loose Formation')) return false;
  if (u.modProfiles && Object.values(u.modProfiles).some(m => rx(m.rules, 'Impact') > 0)) return true;
  return (
    rx(u.rules, 'Impact') > 0 ||
    (u.aux != null && rx(u.auxRules, 'Impact') > 0) ||
    (u.char != null && rx(u.charRules, 'Impact') > 0)
  );
}

function hitMods(A, p, type, T) {
  let base = type === 'volley' ? p.V : p.C,
    r6 = false;
  const inFront = T && cArcU(T, A) === 'front',
    pike = T && rh(RU(T), 'Pike Formation') && inFront && fxHas(A, /charged/);
  if (type === 'clash' && T && rh(RU(T), 'Disruptive') && inFront) base -= 1;
  /* Water: −1 Clash, except for Water Elementals, which re-roll failed hits of 6 there instead (groups.js) */
  if (type === 'clash' && (tWater(A) || srClashWater(A)) && !rh(RU(A), 'Water Elemental')) base = Math.max(1, base - 1);
  if (type === 'clash' && T && rh(RU(A), 'Endless Hunger') && uSize(T) < uSize(A)) base += 1;
  if (type === 'impact' && fxHas(A, /^Glorious Charge/)) base += 1;
  if (type === 'volley' && ((cb && cb.arcing) || (act && act.id === A.id && act.arcUsed))) base -= 1;
  if (type === 'clash' && fxHas(A, /Aggression Directive/) && base < 4) base += 1;
  if (
    (type === 'clash' || type === 'impact') &&
    !pike &&
    !fxHas(A, /^Phantom Onslaught/) &&
    rh((A.rules || []).concat(fx(A)), 'Shock') &&
    (type === 'impact' || fxHas(A, /charged/))
  )
    base += 1;
  const prey = !!(T && supPrey(A.side) && supPrey(A.side).id === T.id);
  if (type === 'clash' && cb && cb.wiNoInsp && cb.att === A.id) r6 = r6;
  else if (type === 'clash') {
    const dread = engaged(A).some(e => rh(RU(e), 'Dread') || (e.char != null && rh(e.charRules, 'Dread')));
    /* Dauntless: always counts as Inspired, and overrides every rule that would stop it benefiting (Hindering, Dread,
       Broken and the like) */
    const daunt = rh(RU(A), 'Dauntless');
    if (daunt) {
      if (base + 1 >= 5) r6 = true;
      else base += 1;
    } else if (
      (fxHas(A, /Inspired/) || prey) &&
      !fxHas(A, /^Hindered/) &&
      !fxHas(A, /^Refused a Duel/) &&
      !fxHas(A, /^Dissonance \(no Inspiration/) &&
      !fxHas(A, /Siphon Strength|Bane of Deeds/) &&
      !pike &&
      !rh(A.rules, 'Automaton') &&
      !(A.effects || []).includes('Broken') &&
      !dread
    ) {
      if (base + 1 >= 5) r6 = true;
      else base += 1;
    }
  }
  if (type === 'volley') {
    const aim =
      (act && act.id === A.id && act.actions.some(a => a.type === 'aim')) ||
      rh(p.rules, 'Deadshot') ||
      rh(p.rules, 'Deadshots') ||
      alwaysAim(A) ||
      prey;
    if (aim) {
      if (base + 1 >= 5) r6 = true;
      else base += 1;
    }
  }
  if ((A.offR6 || []).includes(type) && offOn(A, 'r6')) r6 = true;
  return { hitOn: Math.max(1, Math.min(6, base)), reroll6: r6 };
}
