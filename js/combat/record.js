/*
 * Recording combat
 *
 * Applies the result of a combat to both regiments: wounds, casualties, Morale, Die Fighting and what
 * follows.
 *
 * In this file: recordCombat(), recordCombat0()
 */

async function recordCombat() {
  if (!cb) return;
  if (cb.type === 'duel') return recordDuel();
  const S = {
    att: cb.att,
    tgt: cb.tgt,
    type: cb.type,
    groups: (cb.groups || []).map(g => ({ rolls: g.rolls })),
    mark: cb.mark,
    healFriend: cb.healFriend
  };
  const before = JSON.parse(JSON.stringify(base(cb.tgt) || {}));
  const c0 = cb,
    hits0 = (cb.groups || []).reduce((a, g) => a + (g.hits || 0), 0);
  await recordCombat0();
  if (cb === c0) return;
  if (S.type === 'volley')
    try {
      await trebAfterVolley(base(S.att), base(S.tgt), hits0);
    } catch (e) {
      console.error(e);
    }
  try {
    await srAfterCombat(S, before);
  } catch (e) {
    console.error(e);
  }
  try {
    await supAfterCombat(S, before);
  } catch (e) {
    console.error(e);
  }
}

async function recordCombat0() {
  if (!db || !state) {
    toast('The board is read-only in this view.');
    return;
  }
  if (PVP() && cb && cb.owner !== HU) return;
  if (cb.blessUsedA || cb.blessUsedT)
    state = Object.assign({}, state, {
      units: state.units.map(u =>
        (u.id === cb.att && cb.blessUsedA) || (u.id === cb.tgt && cb.blessUsedT)
          ? Object.assign({}, u, { blessedR: state.round || 1 })
          : u
      )
    });
  const A = base(cb.att),
    T = base(cb.tgt),
    tot = cb.total || 0,
    LBL = {
      clash: 'Clash',
      impact: 'Impact Attacks',
      volley: 'Volley',
      lethal: 'Lethal Demise',
      freform: 'Fighting Reform'
    };
  if (cb.type === 'lethal' && cb.lethalLabel) LBL.lethal = cb.lethalLabel;
  const sum = {
    type: cb.type,
    attacker: cb.att,
    target: cb.tgt,
    hits: cb.hits || 0,
    wounds: cb.wounds || 0,
    moraleExtra: cb.extra || 0,
    total: tot,
    tenacious: cb.tenacious || 0,
    moraleTarget: cb.mi ? cb.mi.R : null,
    groups: cb.groups.map(g => ({
      label: g.label,
      dice: g.nUse,
      hitOn: g.hitOn,
      rolls: (g.rolls || []).map(r => (r.re ? [r.first, r.v] : r.v)),
      hits: g.hits || 0,
      defense: (g.drolls || []).map(r => (r.re ? [r.first, r.v] : r.v)),
      saveD: g.def ? g.def.D : null,
      saveE: g.def ? g.def.E : null
    })),
    morale: (cb.mrolls || []).map(r => (r.re ? [r.first, r.v] : r.v))
  };
  if (T.type === 'marker') {
    const cap = cb.type === 'volley' ? 1 : /Heavy/.test(A.cls || '') ? 2 : 1,
      w = Math.min(tot, cap),
      dmg = Object.assign({ cs: 0, nord: 0 }, T.dmg || {});
    dmg[A.side] = (dmg[A.side] || 0) + w;
    const dd = dmg[A.side] >= 3;
    const unitsM = state.units.map(u =>
      u.id !== T.id
        ? u
        : Object.assign(
            {},
            u,
            { dmg, wounds: Math.max(dmg.cs, dmg.nord) },
            dd
              ? {
                  onTable: false,
                  destroyed: true,
                  destroyedRound: state.round,
                  destroyedBy: A.side,
                  status: 'Destroyed'
                }
              : {}
          )
    );
    const textM = `${LBL[cb.type]}, ${A.short || A.name} on ${T.name}: ${sum.hits} hits, ${sum.wounds} wounds, ${w} counted (a marker takes at most ${cap} per ${cb.type === 'volley' ? 'Volley' : 'attack'} from this regiment)${dd ? '. The marker is destroyed.' : '.'}`;
    try {
      const nextM = Object.assign({}, state, {
        units: unitsM,
        lastTitle: N(A.side) + ' · ' + LBL[cb.type],
        lastText: textM,
        updatedAt: Date.now()
      });
      state = sanitize(nextM);
      stateSave(state, {
        k: 'combat',
        a: Object.assign({ at: Date.now(), kind: 'combat', side: A.side }, sum)
      });
      const inA = cb.inAct,
        resume = cb.resumeAct;
      cb = null;
      renderCombat();
      if (inA && act && act.cur) {
        act.cur.combat = sum;
        finishAction();
      } else if (resume && act && act.cur) finishAction();
      else render();
      toast('Result recorded.');
    } catch (e) {
      toast('The result could not be saved. Try again in a moment.');
    }
    return;
  }
  const AL = allocate(T, tot),
    newW = AL.w,
    dead = AL.dead;
  /* a Rider has no stand of its own: it counts as in contact with every enemy stand its Monster touches */
  const rider = !!T.charName && rh(T.charRules || [], 'Rider');
  const lastStands = standsOf(T),
    foes = engaged(T).map(corners),
    charStand = s => s.kind === 'char' || (rider && s.kind === 'reg'),
    touching = k =>
      lastStands.some(
        s =>
          (k === 'cmd' ? s.cmd && s.kind === 'reg' : charStand(s)) &&
          foes.some(c => polyDist(s.poly, c) <= 0.35)
      );
  const alwaysDF =
    !!T.charName && upgOf(T, /Bloody-Minded Focus|Strength and Honor|Convulsive/) && touching('char');
  /* Die Fighting: only if neither the character nor its regiment has performed any Action this round (out-of-sequence
     Actions included) */
  const regActed = actedThisRound(T),
    chActed = charActedThisRound(T);
  const dieF =
    dead &&
    cb.type !== 'lethal' &&
    cb.type !== 'freform' &&
    ((!regActed &&
      (((T.abilities || []).some(a => /Shield Biter/.test(a[0])) && touching('cmd')) ||
        (T.charName && !chActed && touching('char')))) ||
      alwaysDF);
  /* Die Fighting: only against enemies touching the stand that fights (the character, or the Command Stand); the dying side picks if there are several */
  const dfKind = alwaysDF || (T.charName && !chActed && touching('char')) ? 'char' : 'cmd',
    dfStand = lastStands.find(s =>
      dfKind === 'char'
        ? charStand(s) && (!rider || foes.some(c => polyDist(s.poly, c) <= 0.35))
        : s.cmd && s.kind === 'reg'
    );
  const dfT =
    dieF && dfStand
      ? engaged(T)
          .filter(e => polyDist(dfStand.poly, corners(e)) <= 0.35)
          .map(e => e.id)
      : [];
  const dfOpen = o => {
    const tg = dfT.length ? dfT : [A.id];
    const pick = tg.length === 1 ? tg[0] : !PVP() && !SBX() && T.side === AI ? tg[0] : null;
    return Object.assign(
      { type: 'clash', att: T.id, tgt: pick, choices: tg, inAct: false, dieFight: true, forceContact: true },
      o || {}
    );
  };
  const dieLost =
    dead &&
    !dieF &&
    !regActed &&
    ((T.abilities || []).some(a => /Shield Biter/.test(a[0])) || (T.charName && !chActed));
  const chN = T.char != null ? 1 : 0,
    stBefore = live(T) - chN,
    stAfter = dead ? 0 : live(Object.assign({}, T, { wounds: newW, auxWounds: AL.aw })) - chN,
    stLost = Math.max(0, stBefore - stAfter);
  const ldX = Math.max(rx(RU(T), 'Lethal Demise'), T.aux != null ? rx(T.auxRules, 'Lethal Demise') : 0),
    ldHits0 = (cb.type === 'clash' || cb.type === 'impact') && !fxHas(A, /^Cure/) ? ldX * stLost : 0,
    caHits =
      cb.type === 'clash' && (rh(RU(T), 'Counter Attack') || rh(RU(T), 'Counter-Attack'))
        ? cb.groups.reduce((a, g) => a + (g.rolls || []).filter(r => r.v === 6).length, 0)
        : 0,
    ldHits = ldHits0 + caHits;
  /* a Catabolic Node also detonates when its regiment is destroyed (not when its own blast destroys it: it is already gone) */
  const nodeFoes =
    dead && offOn(T, 'node') && !(cb.lethalLabel === 'Catabolic Node' && cb.att === T.id)
      ? engaged(T).map(e => e.id)
      : [];
  let units = state.units.map(u =>
    u.id !== cb.tgt
      ? u.id === cb.att && cb.dieFight && A.dyingFight
        ? Object.assign({}, u, {
            onTable: false,
            destroyed: true,
            dyingFight: false,
            status: 'Destroyed',
            destroyedRound: state.round
          })
        : u
      : Object.assign(
          {},
          u,
          { wounds: newW, auxWounds: AL.aw },
          dead
            ? dieF
              ? { dyingFight: true, status: 'Destroyed · command stand may Die Fighting' }
              : { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
            : {}
        )
  );
  /* Abundant Harvest (Weaver Courts Gift): its Court of Autumn regiment destroys an enemy regiment, and every friendly
     regiment within 12″ gains a Seed Marker */
  let harvest = 0;
  if (
    dead &&
    !isMarker(T) &&
    A.charName &&
    upgOf(A, /Abundant Harvest/) &&
    frFac(A) === 'Weaver Courts' &&
    frRoles(A).includes('Court of Autumn')
  ) {
    const Ac = corners(A);
    units = units.map(x => {
      if (x.side !== A.side || !x.onTable || x.destroyed || x.type === 'marker') return x;
      if (x.id !== A.id && polyDist(Ac, corners(x)) > 12) return x;
      if ((+x.seeds || 0) >= 3) return x;
      harvest++;
      return Object.assign({}, x, { seeds: (+x.seeds || 0) + 1 });
    });
  }
  /* Wiped Out in Garrison Terrain: the regiment that destroyed the occupant may occupy the building at once if it can
     (Infantry that fits its Capacity); offered in its activation panel */
  if (dead && T.garrison && act && act.id === A.id && !(!PVP() && !SBX() && A.side === AI)) {
    const gt = tGarrisonOf(T);
    if (gt && /Infantry/.test(A.cls || '') && live(A) <= tInfo(gt).cap && !A.garrison) act.wipedOcc = tId(gt);
  }
  /* Blood (W'adrhŭn, Teaching of Death): the regiment heals 1 wound per enemy stand it destroys in a Clash, at most 5,
     once Morale Tests are done */
  let bloodN = 0;
  if (cb.type === 'clash' && stLost && A.charName && upgOf(A, /: Blood$/) && canHeal(A) && !A.destroyed) {
    bloodN = Math.min(5, stLost, +A.wounds || 0);
    if (bloodN)
      units = units.map(u =>
        u.id === A.id ? Object.assign({}, u, { wounds: (+u.wounds || 0) - bloodN }) : u
      );
  }
  const text =
    `${LBL[cb.type]}, ${A.short || A.name} on ${T.short || T.name}: ${sum.hits} hits, ${sum.wounds} wounds` +
    (sum.moraleExtra ? ` + ${sum.moraleExtra} from Morale` : '') +
    ` = ${tot}.` +
    (dead
      ? ` ${T.short || T.name} ${dieF ? 'is destroyed, but its last stand may Die Fighting first.' : 'is destroyed' + (dieLost ? '; no stand that could Die Fighting is touching an enemy, so none does.' : '.')}`
      : '') +
    (ldHits0
      ? ` Lethal Demise: ${stLost} stand${stLost > 1 ? 's' : ''} lost in contact, so ${A.short || A.name} suffers ${ldHits0} Hits.`
      : '') +
    (caHits
      ? ` Counter-Attack: ${caHits} attack roll${caHits > 1 ? 's' : ''} of 6 cause ${caHits} Hits on ${A.short || A.name}.`
      : '') +
    (cb.dieFight && A.dyingFight ? ` ${A.short || A.name} fought to the last and is removed.` : '') +
    (bloodN ? ` Blood: ${A.short || A.name} heals ${bloodN} wound${bloodN > 1 ? 's' : ''}.` : '') +
    (harvest
      ? ` Abundant Harvest: ${harvest} friendly regiment${harvest > 1 ? 's gain' : ' gains'} a Seed Marker.`
      : '');
  try {
    const nextS = Object.assign({}, state, {
      units,
      lastTitle: N(A.side) + ' · ' + LBL[cb.type] + (cb.dieFight ? ' (Die Fighting)' : ''),
      lastText: text,
      updatedAt: Date.now()
    });
    state = sanitize(nextS);
    stateSave(state, {
      k: 'combat',
      a: Object.assign({ at: Date.now(), kind: 'combat', side: A.side, dieFight: !!cb.dieFight }, sum)
    });
    if (sum.type === 'freform' && act && act.cur && act.cur.type === 'withdraw') {
      cb = null;
      renderCombat();
      wdTurn();
      return;
    }
    if (sum.type === 'freform' && act && act.cur && act.cur.type === 'creform') {
      cb = null;
      act.cur.contact0 = crContact(act.cur);
      renderCombat();
      render();
      toast('Wounds recorded. Now reshape and press Done.');
      return;
    }
    const inA = cb.inAct,
      resume = cb.resumeAct,
      thenDie = cb.thenDie;
    cb = null;
    if (nodeFoes.length) nodeOnDeath(T, nodeFoes);
    if (ldHits) {
      if (inA && act && act.cur) act.cur.combat = sum;
      render();
      openCombat({
        type: 'lethal',
        att: T.id,
        tgt: A.id,
        inAct: false,
        resumeAct: inA || resume,
        lethalHits: ldHits,
        lethalX: ldX,
        lethalLost: stLost,
        selfTitle:
          ldHits0 && caHits
            ? 'Lethal Demise and Counter-Attack'
            : caHits
              ? 'Counter-Attack'
              : 'Lethal Demise',
        selfText:
          caHits && !ldHits0
            ? `${T.short || T.name} counter-attacks: ${A.short || A.name} suffers ${ldHits} automatic Hits to its front. No Morale Tests.`
            : undefined,
        thenDie: dead && dieF ? dfOpen() : null
      });
      toast(`Lethal Demise: ${A.short || A.name} suffers ${ldHits} Hits. Roll Defense for them.`);
      return;
    }
    if (thenDie) {
      render();
      openCombat(Object.assign({}, thenDie, { resumeAct: resume }));
      toast('Now the last stand Dies Fighting: roll that Clash.');
      return;
    }
    if (dead && dieF) {
      if (inA && act && act.cur) act.cur.combat = sum;
      render();
      openCombat(dfOpen({ resumeAct: inA }));
      toast(`${T.short || T.name} is destroyed. Its last stand Dies Fighting: roll that Clash now.`);
      return;
    }
    renderCombat();
    if (inA && act && act.cur) {
      act.cur.combat = sum;
      finishAction();
    } else if (resume && act && act.cur) {
      finishAction();
    } else render();
    toast('Result recorded.');
  } catch (e) {
    toast('The result could not be saved. Try again in a moment.');
  }
}
