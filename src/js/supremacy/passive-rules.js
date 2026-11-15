/*
 * Supremacy passive rules
 *
 * The rules regiments have because of their army's Supremacy Ability.
 *
 * In this file: supDR(), supDR1(), supForwardForce(), supBloom()
 */

/* passive rules a regiment has from its army's Supremacy */
function supDR(u) {
  const o = [];
  if (!u || u.type === 'marker') return o;
  supAll(u.side).forEach(S =>
    supDR1(u, S.k, S.wl).forEach(x => {
      if (!o.includes(x)) o.push(x);
    })
  );
  return o;
}

/* the passive rules of one ability; "the Warlord" means the character holding it (Warlord or Dynastic Ally) */
function supDR1(u, k, holder) {
  const o = [];
  const side = u.side;
  if (!k) return o;
  let roles = [];
  try {
    roles = supRoles(u);
  } catch (e) {}
  const add = (...r) =>
    r.forEach(x => {
      if (!o.includes(x)) o.push(x);
    });
  const wl = !!holder && holder.id === u.id && !holder.destroyed && !!holder.charName,
    cls = u.cls || '';
  if (k === 'Skývald' && wl)
    add(
      'Ignores Hindering terrain',
      'Ignores Dangerous terrain',
      'Ignores Perilous terrain',
      'Ignores Water terrain'
    );
  if (k === 'Army of Lions' && wl) add('Tenacious (1)');
  if (k === 'Thunderous Assault' && supOn(side, k) && roles.includes('The Speakers')) add('Shock');
  if (k === 'Obdurate Bone and Stone' && roles.includes('The Legion')) {
    if (/Medium/.test(cls)) add('Vanguard (2)');
    if (/Heavy/.test(cls)) add('Vanguard (4)');
  }
  if (k === 'Divinity Grace') add('Loses Brittle (Divinity Grace)');
  if (k === 'Blasphemous Mesa' && u.type !== 'marker') add('Aura of Death (+1)');
  if (
    k === 'Reign of Terror' &&
    (roles.includes('The Creed') || roles.includes('The Legion')) &&
    animate(u) &&
    odTier(side, 'dark') >= 3
  )
    add('Terrifying (+1)');
  if (k === 'Elemental Dominion') {
    if (rh(u.rules, 'Fire Elemental')) add('Fan the Flames');
    if (rh(u.rules, 'Air Elemental')) add('Opportunists');
    if (rh(u.rules, 'Earth Elemental')) add('Regeneration (2)');
  }
  if (k === 'The Spirit Shines' && roles.includes('Theist')) {
    add('Divine Purpose');
    if (
      (state.units || []).some(
        x =>
          x.side === side &&
          srAlive(x) &&
          x.charName &&
          (frRoles(x, true).includes('Theist') || /Theist|Priest/.test(x.charName)) &&
          (x.id === u.id || srNear(x, u, 12))
      )
    )
      add('Indomitable (+1)');
  }
  if (k === 'Remorseless Hunter' && roles.includes('Husk')) add('Designate Target');
  if (k === 'Lambs to the Slaughter' && wl) add('Fearless', 'Fury');
  if (
    k === 'Professional Troops' &&
    roles.includes('Feudal') &&
    (state.units || []).some(
      x =>
        x.side === side &&
        srAlive(x) &&
        x.charName &&
        (frRoles(x, true).includes('Feudal') || /Noble Lord/.test(x.charName)) &&
        (x.id === u.id || srNear(x, u, 8))
    )
  )
    add('Professional Troops (re-roll 6s in Clashes and Defense)');
  if (k === 'Holy Crusade' && supAct(side, k) && roles.includes('Theist'))
    add('Cannot be Broken (Holy Crusade)');

  return o;
}

function supForwardForce(u) {
  const k = supK(u.side);
  return srIsWl(u) && (k === 'Paragon of War' || k === 'First Born of War');
}

/* Weaver Courts: the Warlord's Bloom Effect (Bloom with 2 Seeds) */
function supBloom(u) {
  const S = supOf(u.side);
  if (!S) return null;
  const act2 = S.active;
  if (S.k === "Reaper's Bloom")
    return { rules: [act2 ? 'Cleave (+2)' : 'Cleave (+1)'], t: 'Cleave (+' + (act2 ? 2 : 1) + ')' };
  if (S.k === 'Subtle Sow')
    return { heal: u.type === 'monster' ? 0 : act2 ? 5 : 3, t: 'heals ' + (act2 ? 5 : 3) + ' wounds' };
  if (S.k === 'Reigning Season')
    return {
      label: act2
        ? 'Reigning Season (Deadly Blades and Deadly Shots)'
        : 'Reigning Season (Deadly Blades and Deadly Shots against regiments that have not activated)',
      t: 'Deadly Blades and Deadly Shots' + (act2 ? '' : ' against regiments that have not activated')
    };
  if (S.k === 'Crop Rotation')
    return {
      rules: ['Untouchable'],
      label: 'Crop Rotation (re-roll failed Clash and Impact hits of 6)',
      t: 'Untouchable and re-roll failed hits of 6'
    };
  return null;
}
