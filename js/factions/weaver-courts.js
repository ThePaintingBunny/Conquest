/*
 * Weaver Courts
 *
 * Courts, Seasons, Glacial Presence and what happens after a Bloom.
 *
 * In this file: wcCourtOf(), wcCourt(), glacialOn(), frSeasonUnits(), seasonNow(), srAfterBloom()
 */

/* Weaver Courts: regiments without a fixed Court belong to the Warlord's Seasonal Court (Mhor Sidhe: Autumn, Rhun Sidhe:
   Spring, Taosidhe and Seanchas Sidhe: the Court chosen in the list). An older list falls back to the panel's choice. */
function wcCourtOf(wl) {
  return wl && wl.charName
    ? (frRoles(wl, true).find(x => /^Court of/.test(x)) || '').replace('Court of ', '')
    : '';
}

function wcCourt(side) {
  const wl = supWl(side);
  return (wl && frFac(wl) === 'Weaver Courts' && wcCourtOf(wl)) || frG(side, 'wc').court || 'Spring';
}

/* Glacial Presence (Weaver Courts Gift): an enemy that activates engaged with its Court of Winter regiment gains Decay
   until the end of the round (it keeps it if it withdraws) */
function glacialOn(u) {
  return (
    !!u &&
    u.onTable &&
    engaged(u).some(
      e =>
        e.charName &&
        upgOf(e, /Glacial Presence/) &&
        frFac(e) === 'Weaver Courts' &&
        frRoles(e).includes('Court of Winter')
    )
  );
}

function frSeasonUnits(units, side, season) {
  const g = frG(side, 'wc');
  season = season || g.season;
  if (!season) return units;
  const fxs = SEASONFX[season];
  g.season = season;
  return units.map(u => {
    if (u.side !== side || u.type === 'marker' || frFac(u) !== 'Weaver Courts') return u;
    const r = frRoles(u);
    if (!r.includes('Court of ' + season)) return u;
    return grantU(u, 'Season: ' + fxs[0], fxs[1], fxs[2]);
  });
}

function seasonNow(side) {
  const S = supOf(side),
    g = frG(side, 'wc');
  if (S && S.active) {
    if (S.k === "Reaper's Bloom") return 'Autumn';
    if (S.k === 'Subtle Sow') return 'Spring';
    if (S.k === 'Reigning Season' || S.k === 'Crop Rotation') {
      const c = (frRoles(S.wl, true).find(r => /^Court of/.test(r)) || '').replace('Court of ', '');
      if (c) return c;
    }
  }
  return g.season;
}

async function srAfterBloom(u, n) {
  if (n < 3) return;
  const r = srRound();
  const S = srFriends(u)
    .concat([base(u.id)])
    .filter(
      x =>
        x &&
        rh(x.rules, 'Echoes of Whispers') &&
        x.echoR !== r &&
        srNear(x, u, 8) &&
        (x.wounds || 0) > 0 &&
        canHeal(x)
    )[0];
  if (S)
    await putState({
      units: state.units.map(x =>
        x.id === S.id ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - 3), echoR: r }) : x
      ),
      lastTitle: N(u.side) + ' · Echoes of Whispers',
      lastText: (S.short || S.name) + ' heals 3 wounds.'
    });
}
