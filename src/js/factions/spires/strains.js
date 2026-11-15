/*
 * Spires: Sects and Strains
 *
 * Sects, Strains with Optimized Fodder, Privileged Observer and what triggers after a Strain.
 *
 * In this file: spSectList(), spSect(), privOk(), fodder6(), srStrain(), srAfterStrain()
 */

function spSectList(side) {
  const a = ((state && state.army && state.army[side]) || []).map(String).find(x => /^Sect: /.test(x));
  return a ? a.slice(6).trim() : '';
}

function spSect(side) {
  return spSectList(side) || frG(side, 'sp').sect || '';
}

/* ---- Privileged Observer (Force Grown Drones) and Optimized Fodder ---- */
function privOk(u) {
  return (
    frBase(u) === 'Force Grown Drones' &&
    /Biomancer|Pheromancer/.test(u.charName || '') &&
    !/Medium/.test(u.cls || '') &&
    (state.round || 1) === 1 &&
    !u.onTable
  );
}

function fodder6(u) {
  return (
    frBase(u) === 'Force Grown Drones' &&
    rh(u.rules || [], 'Optimized Fodder') &&
    (u.stands || 0) - (u.char != null ? 1 : 0) - (u.aux != null ? 1 : 0) >= 6
  );
}

function srStrain(u) {
  const S = STRAIN[frBase(u)];
  if (S && fodder6(u)) return [S[0] + ' (Optimized Fodder)', ['Lethal Demise (2)'], '+1 March', { M: 1 }];
  return S;
}

async function srAfterStrain(u) {
  const B = srFriends(u).filter(
    x =>
      rh(x.rules, 'Indiscriminate Omnivore') &&
      !x.gorged &&
      srNear(x, u, 12) &&
      (x.wounds || 0) > 0 &&
      canHeal(x)
  )[0];
  if (B)
    await putState({
      units: state.units.map(x =>
        x.id === B.id ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - 2) }) : x
      ),
      lastTitle: N(u.side) + ' · Indiscriminate Omnivore',
      lastText: (B.short || B.name) + ' heals 2 wounds.'
    });
}
