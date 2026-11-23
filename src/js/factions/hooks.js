/*
 * Faction hooks
 *
 * The points where the game asks the faction rules what applies: on a Charge, as effects on a regiment,
 * when healing, after an activation and at the end of a round.
 *
 * In this file: frOnCharge(), frFx(), frHeal(), frAfterAct(), frRoundEnd()
 */

function frOnCharge(id) {
  const u = base(id);
  if (!u || frFac(u) !== 'Dweghom') return;
  const c = dwCreed(u.side),
    r = frRoles(u);
  if (/Ardent/.test(c) && (r.includes('Ardent') || r.includes('Clan')))
    awaken(id, 'Ardent Creed: successful Charge');
}

/* round effects that come from state rather than actions */
function frFx(u) {
  const out = [];
  if (!state || !u || u.type === 'marker') return out;
  const f = frFac(u);
  const gt = tGarrisonOf(u);
  if (gt)
    out.push(
      'In ' +
        tInfo(gt).name.toLowerCase() +
        ' (+' +
        (u.garrisonD || tInfo(gt).def) +
        ' Defense, 360° sight, all stands front rank)'
    );
  if (u.onTable && rh(u.rules, 'Water Elemental')) {
    if (srInWater(u))
      out.push((tWater(u) ? 'In Water' : 'Counts as in Water (Tidecaller)') + ': re-rolls failed hits of 6, no Clash penalty');
  } else if (u.onTable && tWater(u)) out.push('In water (−1 Clash)');
  {
    const e = terrainOf().find(t => tHas(t, 'Elevated') && inT(t, [u.x, u.y]));
    if (e) out.push('On ' + tInfo(e).name.toLowerCase() + ' (Size ' + uSize(u) + ')');
  }
  if (f === 'Old Dominion' && animate(u) && odTierU(u, 'dark') >= 3) out.push('Inspired (Dark Power III)');
  if (
    f === 'Nords' &&
    typeof cb !== 'undefined' &&
    cb &&
    cb.type === 'clash' &&
    cb.att === u.id &&
    /Cavalry|Brute/.test(u.cls || '') &&
    (byId(cb.tgt) || {}).type === 'monster' &&
    supRoles(u).includes('Half-Bloods') &&
    all().some(x => x.side === u.side && !x.destroyed && x.charName && upgOf(x, /Pack Tactics/))
  )
    /* X is the regiment's Attacks at that moment, bonuses included */
    out.push('Support (' + (prof(u, 'reg').A || 0) + ') (Pack Tactics)');
  if (f === 'Dweghom' && firstInFray(u) && rx((u.rules || []).concat(itemRegRules(u)), 'Terrifying') < 2)
    out.push('Terrifying (+1) (First in the Fray)');
  if (
    f === 'Hundred Kingdoms' &&
    /Infantry/.test(u.cls || '') &&
    frRoles(u).includes('Veteran') &&
    live(u) - (u.char != null ? 1 : 0) >= 5
  )
    out.push('Inspired (Relentless Drills)');
  return out;
}

function frHeal(u) {
  if (
    frFac(u) === 'Spires' &&
    spSect(u.side) === 'Underspire' &&
    frRoles(u).some(r => r === 'Drone' || r === 'Clone')
  )
    return 2;
  return 0;
}

/* end of an activation: Decay, Seed Markers, Elemental Power */
function frAfterAct(a, units) {
  const out = { units, fr: null, notes: [] };
  const i = units.findIndex(x => x.id === a.id);
  if (i < 0) return out;
  let u = units[i];
  const f = frFac(u);
  if ((f === 'Spires' && a.frDecay) || (!a.frDecay && RU(u).some(x => /^Decay\b/.test(x)))) {
    const n = decayN(u);
    const AL = allocate(u, n);
    u = Object.assign(
      {},
      u,
      { wounds: AL.w, auxWounds: AL.aw },
      AL.dead ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round } : {}
    );
    out.notes.push('Decay: ' + n + ' wounds' + (AL.dead ? ', destroyed' : ''));
    if (n && u.charName && upgOf(u, /Degenerative Aura/))
      engaged(u).forEach(e0 => {
        const e = typeof e0 === 'string' ? byId(e0) : e0,
          j = e && units.findIndex(x => x.id === e.id);
        if (!e || j < 0) return;
        const k = live(e),
          A2 = allocate(units[j], k);
        units[j] = Object.assign(
          {},
          units[j],
          { wounds: A2.w, auxWounds: A2.aw },
          A2.dead ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round } : {}
        );
        out.notes.push('Degenerative Aura: ' + (e.short || e.name) + ' takes ' + k + ' wounds');
      });
  }
  if (f === 'Weaver Courts' && a.actions.some(x => x.type === 'clash' || x.type === 'volley')) {
    const s = Math.min(3, (+u.seeds || 0) + 1);
    if (s !== (+u.seeds || 0)) out.notes.push('gains a Seed Marker (' + s + ')');
    u = Object.assign({}, u, { seeds: s });
  }
  if (f === 'Dweghom' && frRoles(u).includes('Forged') && !a.frForged) {
    const g = frG(u.side, 'dw'),
      ep = Math.min(10, (+g.ep || 0) + 1);
    out.fr = frPatch(u.side, 'dw', { ep });
    out.notes.push('Forged: +1 Elemental Power (' + ep + ')');
  }
  {
    const L = supLeadByExample(units, a);
    if (L) {
      out.notes.push(L);
      state.sup = supMemo(u.side, { lbR: srRnd() });
    }
  }
  if (!out.fr && frG(u.side, 'sk').airNow) out.fr = frPatch(u.side, 'sk', { airNow: false });
  units[i] = u;
  return out;
}

/* end of round: drop round-long grants, advance the Seasons */
function frRoundEnd(units, nextRound) {
  let fr = JSON.parse(JSON.stringify(state.fr || {}));
  units = units
    .map(suiRestore)
    .map(u =>
      rh(u.rules, 'Enlightening Fury') ? ungrantU(u, src => !/^Ideal Card: /.test(src)) : ungrantU(u)
    );
  ['cs', 'nord'].forEach(side => {
    const g = (fr[side] || {}).wc || {};
    if (g.season && units.some(u => u.side === side && frFac(u) === 'Weaver Courts')) {
      const nx = SEASONS[(SEASONS.indexOf(g.season) + 1) % 4];
      fr[side].wc = Object.assign({}, g, { season: nx, round: nextRound });
      const keep = state.fr;
      state.fr = fr;
      units = frSeasonUnits(units, side, nx);
      state.fr = keep;
    }
  });
  return { units, fr };
}
