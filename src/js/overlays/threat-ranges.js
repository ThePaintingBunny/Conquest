/*
 * Threat ranges
 *
 * How far a regiment can reach with a Charge or a Volley, from where it stands and after a March,
 * including boosts its army could still give it.
 *
 * Everything in force counts as normal (permanent rules, items, officers, characters, effects granted
 * this round). Everything still to be cast, used, rolled or triggered is listed in the key with the
 * distance it reaches.
 *
 * In this file: friendSpells(), threatNormal(), threatBoosts(), thrRelevant(), fanPoly(),
 *   thrMarchFirst(), threatLayers()
 */

/* ---------- boosts the regiment does not have yet but its army could give it ---------- */
function friendSpells(u) {
  const out = new Set();
  all()
    .filter(x => x.side === u.side && x.onTable && !x.destroyed)
    .forEach(x => {
      [false, true].forEach(ch => {
        try {
          (spellsOf(x, ch) || []).forEach(s => out.add(s.name));
        } catch (e) {}
      });
    });
  return out;
}

/* Two kinds of bonus:
   - normal: anything already in force (permanent rules, items, officers, characters, effects granted this round, a
     drawn card). It is part of the regiment's March or Charge, so it sits in the ordinary layers;
   - extra: anything that still has to be activated, cast, rolled or triggered (an unused Supremacy, a spell, a
     Biomancy or Strain ability, a chant, a target condition). It is not guaranteed, so it gets its own layer. */
function threatNormal(u) {
  const F = fx(u),
    n = { march: 0, charge: 0, src: [] };
  /* Divine Purpose granted this round: +2″ to the first March or the Charge (one of them) */
  if (srHas(u, /^Divine Purpose/) && !(act && act.id === u.id && act.dpUsed)) {
    n.dp = 2;
    n.src.push('Divine Purpose (+2″ first March or Charge)');
  }
  /* W'adrhun Ideal Card Fu in play: +2″ to the first March */
  if (F.some(x => /^Ideal Card: Fu \(/.test(x)) || (act && act.id === u.id && act.frFu)) {
    n.march += 2;
    n.src.push('Ideal Card Fu (+2″ first March)');
  }
  return n;
}

/* Each boost: { key, n, src, kind, grp }
   kind: charge (Charge distance) · march (the March characteristic: both moves) · free (a free move first) ·
         dp (Divine Purpose: +2″ to the first March or the Charge) · cp (Clockwork Parade: Charge = March +5″, no roll) ·
         range (Barrage range) · rangeM (Barrage range after a March)
   grp: boosts in the same group cannot be combined (one Forged option, one free March). */
function threatBoosts(u) {
  const L = [],
    add = (kind, n, src, grp) => L.push({ key: src, n, src, kind, grp: grp || '' }),
    F = fx(u),
    has = re => F.some(x => re.test(x)),
    side = u.side,
    sup = typeof supK === 'function' ? supK(side) : '',
    roles = typeof supRoles === 'function' ? supRoles(u) : [],
    base = typeof frBase === 'function' ? frBase(u) : u.name,
    sp = friendSpells(u),
    fixed = chargeFixed(u),
    friends = all().filter(x => x.side === side && x.onTable && !x.destroyed),
    ST = typeof STRAIN !== 'undefined' ? STRAIN[base] : null;
  const aristia =
      u.type !== 'monster' && friends.some(x => upgOf(x, /Aristia/)) && !fx(u).some(x => /^Aristia/.test(x)),
    seize =
      frRoles(u).includes('Imperial') &&
      seizeAdv(u) &&
      !(act && act.id === u.id && act.source === 'entourage');
  /* Charge distance */
  if (fixed == null) {
    if (rh(u.rules, 'Hubris')) add('charge', 3, 'Hubris (if the target is a monster)');
    if (rh(u.rules, 'Arrogance')) add('charge', 3, 'Arrogance (if the target is a monster or character)');
    if (armyHas(side, /Prophecy Unfulfilled/))
      add('charge', 2, 'Prophecy Unfulfilled (if the target is engaged)');
    if (rh(u.rules, 'Shattered Perfection') && !has(/Shattered Perfection/))
      add('charge', 2, 'Shattered Perfection (once below starting strength)');
    const chants = (u.rules || []).concat(typeof cR === 'function' ? cR(u) : []).map(String);
    if (chants.some(r => /Proven Warriors/.test(r)) && !has(/Proven Warriors/))
      add('charge', 2, 'Chant: Proven Warriors');
    if (sup === 'Lead by Example' && !has(/Lead by Example/)) add('charge', 2, 'Lead by Example (Supremacy)');
    if (sup === 'Obdurate Bone and Stone' && roles.includes('The Legion') && !has(/Obdurate Bone/))
      add('charge', odTier(side, 'dark') || 1, 'Obdurate Bone and Stone (Supremacy)');
    if (all().some(e => e.side !== side && fx(e).some(x => /^Marked \(Designate Target\)/.test(x))))
      add('charge', 2, 'Designate Target (if the target is the Marked regiment)');
    if (ST && /\+2″ Charge/.test(ST[2] || '') && !has(/Strain/))
      add('charge', 2, 'Strain Expression: ' + ST[0]);
    if (sp.has('Clockwork Parade')) add('cp', 5, 'Clockwork Parade (spell): Charge = March +5″, no roll');
    if (aristia) add('cp', 5, 'Aristia (banner, within 8″): Charge = March +5″, no roll');
    if (seize) add('charge', 2, 'Seize the Advantage (if activated as an Entourage)');
  } else {
    if (sp.has('Clockwork Parade') && fixed < 5)
      add('charge', 5 - fixed, 'Clockwork Parade (spell): Charge = March +5″');
    if (aristia && fixed < 5) add('charge', 5 - fixed, 'Aristia (banner, within 8″): Charge = March +5″');
  }
  /* Inscription of Lighter Alloys: +3 March, and a Phalanx loses its fixed 3″ Charge (it rolls instead) */
  if (
    upgOf(u, /Lighter Alloys/) &&
    /Infantry/.test(u.cls || '') &&
    !fx(u).includes('Mobility (Inscription of Lighter Alloys)')
  )
    add(
      'la',
      3,
      'Mobility (Inscription of Lighter Alloys): +3 March' +
        (fixed === 3 ? ', loses Phalanx (rolls its Charge)' : '')
    );
  /* Bloody Sacrifice: +1 March until the end of the first action (2 wounds) */
  if ((upgOf(u, /Beads of Death/) || upgOf(u, /Occultists Charm/)) && !(act && act.id === u.id && act.bloody))
    add('first', 1, 'Bloody Sacrifice (2 wounds): +1 March on its first action');
  /* March */
  if (
    !srHas(u, /^Divine Purpose/) &&
    rh(RU(u), 'Divine Purpose') &&
    friends.some(x => /Theist Priest/.test(x.charName || ''))
  )
    add('dp', 2, 'Divine Purpose (Theist Priest spell): +2″ first March or Charge');
  if (sup === 'Ruthless Competence' && /Infantry/.test(u.cls || '') && !has(/Ruthless Competence/))
    add('march', 1, 'Ruthless Competence (after a Strain Expression)');
  if (ST && !has(/Strain/)) {
    if (typeof fodder6 === 'function' && fodder6(u)) add('march', 1, 'Strain Expression (Optimized Fodder)');
    else if (sup === 'Induced Aggression' && /Drone|Clone|Monstros/i.test(u.name + ' ' + (u.cls || '')))
      add('march', 1, 'Induced Aggression: Strain swapped for +1 March');
  }
  if (u.type !== 'monster' && friends.some(x => chAbil(x).some(a => a.n === 'Unstable Enhancement')))
    add('march', 1, 'Unstable Enhancement (Biomancy, on a 1–2)');
  if (
    sp.has('Translocation') &&
    spellsOf(u, false)
      .concat(spellsOf(u, true))
      .some(s => s.name === 'Translocation')
  )
    add('free', 8, 'Translocation (spell): free 8″ March first', 'free');
  if (sp.has('Air Step') && frRoles(u).includes('Court of Air'))
    add('free', 2, 'Air Step (spell): free 2″ March first', 'free');
  /* Dweghom: Forged by the Elements (one option per activation) */
  const FG = typeof FORGED !== 'undefined' && FORGED[base];
  if (FG && !(act && act.id === u.id && act.frForged))
    FG.forEach(([t, cost, rules, stats, note]) => {
      if (stats && stats.M) add('march', stats.M, 'Forged: ' + t, 'forged');
      if (/Charge/.test(note || '') && fixed == null) add('charge', 2, 'Forged: ' + t, 'forged');
      (rules || []).forEach(r => {
        const m = String(r).match(/^Barrage Range\s*\(\+(\d+)\)/);
        if (m) add('range', +m[1], 'Forged: ' + t, 'forged');
      });
    });
  if ((u.rules || []).some(r => /Momentum/.test(r)) && !(act && act.momentum))
    add('rangeM', 4, 'Chant: Momentum (after a forward March, up to +4″ range)');
  return L;
}

/* which boosts matter in a view */
function thrRelevant(b, mode) {
  return mode === 'charge'
    ? ['charge', 'march', 'free', 'dp', 'cp', 'la', 'first'].includes(b.kind)
    : ['range', 'rangeM', 'march', 'free', 'dp', 'la', 'first'].includes(b.kind);
}

/* ---------- shapes ---------- */
/* the front arc (or a wider firing arc) cut off R inches from the front edge; 180°+ becomes a rounded outline */
function fanPoly(u, R, spanDeg, fromBack) {
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    fe = G.d / 2,
    hw = G.w / 2,
    P = (fw, rr) => [u.x + f[0] * fw + r[0] * rr, u.y + f[1] * fw + r[1] * rr],
    o = [];
  if (spanDeg >= 180) {
    const back = fromBack ? -fe : fe - (G.sd || 0);
    [
      [fe, hw, 0],
      [back, hw, 1],
      [back, -hw, 2],
      [fe, -hw, 3]
    ].forEach(([x, y, q]) => {
      for (let k = 0; k <= 10; k++) {
        const an = ((q + k / 10) * Math.PI) / 2;
        o.push(P(x + R * Math.cos(an), y + R * Math.sin(an)));
      }
    });
    return o;
  }
  const sp = (spanDeg * Math.PI) / 180,
    n = Math.max(8, Math.round(spanDeg / 4));
  o.push(P(fe, -hw));
  for (let k = 0; k <= n; k++) {
    const an = -sp + (sp * k) / n;
    o.push(P(fe + R * Math.cos(an), -hw + R * Math.sin(an)));
  }
  for (let k = 0; k <= n; k++) {
    const an = (sp * k) / n;
    o.push(P(fe + R * Math.cos(an), hw + R * Math.sin(an)));
  }
  o.push(P(fe, hw));
  return o;
}

/* can it March and then act this round? */
function thrMarchFirst(u, why) {
  if (engaged(u).length) return why ? 'Engaged: it cannot March away first.' : false;
  if (act && act.id === u.id && act.actions.filter(a => !a.free).length >= 1)
    return why ? 'It has one action left this activation, so no March first.' : false;
  return why ? '' : true;
}

/* the distances with a set of ticked boosts */
function threatLayers(u, mode, onKeys) {
  const all0 = threatBoosts(u),
    NB = threatNormal(u),
    on = all0.filter(b => (onKeys || []).includes(b.key) && thrRelevant(b, mode)),
    S = k => on.filter(b => b.kind === k).reduce((a, b) => a + b.n, 0),
    M = (+u.m || 0) + srMarchMod(u),
    Ls = [],
    notes = [],
    broken = (u.effects || []).includes('Broken'),
    eng = engaged(u).length > 0,
    canMF = thrMarchFirst(u),
    mfWhy = thrMarchFirst(u, true);
  if (u.activated && !(act && act.id === u.id))
    notes.push('Already activated this round: this is its reach next round.');
  const la = S('la') > 0,
    mOn = S('march') + S('la') /* Lighter Alloys adds +3 March */,
    fOn = S('free'),
    firstOn = S('first') /* +1 March on the first action only */,
    dpOn = NB.dp || (S('dp') ? 2 : 0);
  if (mode === 'charge') {
    if (u.garrison) notes.push('Garrisoned: it Charges out of its building, measured from the building.');
    if (broken)
      return { L: [], all: all0, NB, notes: notes.concat('Broken: it cannot Charge until it Rallies.') };
    if (eng) return { L: [], all: all0, NB, notes: notes.concat('Engaged: it cannot Charge.') };
    const fixed0 = chargeFixed(u),
      /* Lighter Alloys takes Phalanx away: a Phalanx then rolls its Charge like everyone else */
      fixed = la && fixed0 === 3 && !jugg(u) ? null : fixed0,
      selfDp = fixed == null && act && act.id === u.id && srHas(u, /^Divine Purpose/) && !act.dpUsed ? 2 : 0,
      base =
        fixed0 != null && fixed == null
          ? (+u.m || 0) + 6 + srChargeBonus(u, null) - selfDp
          : chargeMax(u) - selfDp /* March + 6 + Charge bonuses in force, without Divine Purpose */,
      cp = S('cp') > 0;
    let sure, roll;
    if (fixed != null) {
      sure = base + mOn + S('charge') + fOn;
      roll = null;
    } else if (cp) {
      sure = M + mOn + 5 + fOn;
      roll = null;
    } else {
      sure = base - 6 + mOn + S('charge') + fOn + dpOn;
      roll = sure + 6;
    }
    /* Divine Purpose on a fixed Charge goes on the March instead */
    const dpMarch = (fixed != null || cp) && dpOn ? dpOn : 0,
      first = M + mOn + NB.march + dpMarch + firstOn; /* the March is the first action */
    /* Bloody Sacrifice also counts when the Charge itself is the first action; after a March it is spent */
    const sure0 = sure,
      roll0 = roll;
    sure += firstOn;
    if (roll != null) roll += firstOn;
    Ls.push({
      k: 'sure',
      R: sure,
      t:
        fixed != null
          ? 'Charge (fixed distance)'
          : cp
            ? 'Charge at March +5″ (no roll)'
            : 'Charge, guaranteed (no roll)'
    });
    if (roll != null) Ls.push({ k: 'roll', R: roll, t: 'Charge on a roll of 6' });
    if (canMF) {
      /* rolling Charges: only the roll of 6 after a March; fixed Charges have no roll, so their one distance */
      if (roll0 != null) Ls.push({ k: 'mroll', R: first + roll0, t: 'March, then Charge on a 6' });
      else Ls.push({ k: 'msure', R: first + sure0, t: 'March, then Charge' });
    } else notes.push(mfWhy);
    return { L: Ls, all: all0, NB, notes, span: 45, back: false, head: roll != null ? roll : sure };
  }
  const vr = volleyRange(u);
  if (!vr) return { L: [], all: all0, NB, notes: notes.concat('No Barrage: it cannot Volley.') };
  const R = vr.range + S('range'),
    long = rh(RU(u).concat(fx(u)), 'Longshot'),
    first = M + mOn + NB.march + dpOn + firstOn;
  if (!long) Ls.push({ k: 'eff', R: R / 2 + fOn, t: 'Volley, effective range (half)' });
  Ls.push({ k: 'full', R: R + fOn, t: long ? 'Volley, full range (Longshot)' : 'Volley, full range' });
  if (canMF) Ls.push({ k: 'mfull', R: first + R + S('rangeM') + fOn, t: 'March, then Volley' });
  else notes.push(mfWhy);
  return {
    L: Ls,
    all: all0,
    NB,
    notes,
    span: volleyArcSpan(u),
    back: rh(RU(u), 'Fluid Formation') || !!u.garrison,
    head: R + fOn
  };
}
