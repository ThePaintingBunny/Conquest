/*
 * Casting a spell
 *
 * Dice needed, the casting roll and resolving the spell's effect on its target.
 *
 * In this file: sacrSpend(), globeWizard(), spellSizeBonus(), spellNeed(), jadooAvail(), jadooMark(),
 *   spellHitRes(), resolveSpell(), resolveSpell0()
 */

/* counts as 3 stands larger against enemy spells (Scaling): Inscription of Balance on its own regiment;
   Heralds of the Storm and Fudoshin for friends within 10″ */
/* Primodynamic Globe (City States banner): friendly regiments within 8″ of the character stand count as having
   Wizard (1) for Enemy Interference */
/* Unholy Sacrament is spent on the first Spellcasting Action of the round */
function sacrSpend(u, asChar) {
  if (!asChar || !fxHas(u, /^Unholy Sacrament/) || (base(u.id) || {}).sacrR === srRnd()) return;
  state.units = state.units.map(x => (x.id === u.id ? Object.assign({}, x, { sacrR: srRnd() }) : x));
}

function globeWizard(t) {
  return all().some(
    x =>
      x.side === t.side &&
      x.onTable &&
      !x.destroyed &&
      upgOf(x, /Primodynamic Globe/) &&
      (x.id === t.id || polyDist(casterPoly(x), corners(t)) <= 8)
  );
}

function spellSizeBonus(T, sp) {
  if (!T || !sp || sp.targets !== 'enemy') return 0;
  if (upgOf(T, /Inscription of Balance/)) return 3;
  const near = all().some(
    x =>
      x.side === T.side &&
      x.onTable &&
      !x.destroyed &&
      (upgOf(x, /Heralds of the Storm/) || upgOf(x, /Fudoshin/)) &&
      (x.id === T.id || polyDist(corners(x), corners(T)) <= 10)
  );
  return near ? 3 : 0;
}

function spellNeed(sp, T) {
  const S = sp.db || {};
  if (S.a === null) return 0;
  const n = live(T) + spellSizeBonus(T, sp);
  /* Protective Glyphs (Hundred Kingdoms): enemy spells on a regiment within 10″ of the character need one more success */
  const glyph =
    sp.targets === 'enemy' &&
    all().some(
      x =>
        x.side === T.side &&
        x.onTable &&
        !x.destroyed &&
        upgOf(x, /Protective Glyphs/) &&
        (x.id === T.id || polyDist(casterPoly(x), corners(T)) <= 10)
    );
  return (
    (glyph ? 1 : 0) +
    ((S.need || 2) +
      (sp.scaling ? (n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0) + (T.type === 'monster' ? 1 : 0) : 0))
  );
}

/* Jadoo Kavach (Sorcerer Kings): friendly spellcasters within 10″ of the character may re-roll Spellcasting dice of 6,
   in one Spellcasting Action of their choice per activation: once per round for each spellcaster (the character and a
   spellcasting regiment count separately). The player decides after seeing the dice; the AI uses it on its first cast. */
function jadooAvail(u, asChar) {
  if (!u) return false;
  const k = all().some(
    x =>
      x.side === u.side &&
      x.onTable &&
      !x.destroyed &&
      x.charName &&
      upgOf(x, /Jadoo Kavach/) &&
      (x.id === u.id || polyDist(corners(x), corners(u)) <= 10)
  );
  const b = base(u.id) || u;
  return k && (asChar ? b.jadooC : b.jadooR) !== (state.round || 1);
}

function jadooMark(u, asChar) {
  const k = asChar ? 'jadooC' : 'jadooR';
  return putState({
    units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { [k]: state.round || 1 }) : x))
  }).catch(() => {});
}

/* Hits from a spell: Defense rolls, then Morale */
function spellHitRes(T, hits, ap, noMorale) {
  if (rh(RU(T), 'Loose Formation')) hits = Math.ceil(hits / 2);
  const D = Math.max(0, (+T.stats.D || 0) - (ap || 0)),
    E = +T.stats.E || 0,
    sv = Math.max(D, E);
  const dr = [];
  let w = 0;
  for (let i = 0; i < hits; i++) {
    const d = d6();
    dr.push(d);
    if (!(d <= sv && d !== 6) || d === 6) w++;
  }
  let mw = 0;
  const mr = [];
  const MI = moraleInfo(T, T),
    R = MI.R,
    auto = noMorale || MI.auto || rh(RU(T), 'Fearless') || rh(RU(T), 'Oblivious');
  if (w && !auto && R > 0) {
    for (let i = 0; i < w; i++) {
      const d = d6();
      mr.push(d);
      if (d > R || d === 6) mw++;
    }
  }
  return {
    hits,
    w: w + mw,
    txt:
      `${hits} Hit${hits === 1 ? '' : 's'}${ap ? ' (AP ' + ap + ')' : ''}; Defense rolls ${dr.join(', ')} (saves on ${sv} or less) → ${w} wound${w === 1 ? '' : 's'}` +
      (mr.length
        ? `; Morale rolls ${mr.join(', ')} (passes on ${R} or less) → ${mw} more wound${mw === 1 ? '' : 's'}`
        : auto && w
          ? '; no Morale Test'
          : '') +
      ` = ${w + mw} wound${w + mw === 1 ? '' : 's'} in total`
  };
}

/* apply a successful spell */
async function resolveSpell(cid, sp, tid, succ, asChar) {
  lastSpellSucc = succ;
  const t00 = base(tid),
    alive0 = !!(t00 && !t00.destroyed);
  const r = await resolveSpell0(cid, sp, tid, succ, asChar);
  /* the built-in opponent's turn: its spell's hits are rolled (the defending player still rolls their own Defense) */
  if (aiBusy) await cbDrain();
  try {
    const c0 = base(cid),
      t1 = base(tid);
    if (
      asChar &&
      c0 &&
      alive0 &&
      t1 &&
      t1.destroyed &&
      t1.side !== c0.side &&
      !isMarker(t1) &&
      upgOf(c0, /Thaumaturge/) &&
      (+c0.thaum || 0) < 2
    ) {
      await putState({
        units: state.units.map(x =>
          x.id === c0.id ? Object.assign({}, x, { thaum: (+x.thaum || 0) + 1 }) : x
        )
      });
      toast('Thaumaturge: the ' + c0.charName + ' gains Wizard (+1) for the rest of the battle.');
    }
  } catch (e) {}
  try {
    await skSpellMarker(cid, sp, asChar);
  } catch (e) {}
  /* Tempered Creed (Dweghom): a [Tempered] character that casts a spell of an Elemental School adds an Elemental Power
     marker (at most 10 in the pool) */
  try {
    const c0 = base(cid),
      nm = (sp && sp.name) || sp;
    if (
      asChar &&
      c0 &&
      frFac(c0) === 'Dweghom' &&
      /Tempered/.test(dwCreed(c0.side)) &&
      frRoles(c0, true).includes('Tempered') &&
      Object.values(DW_SCHOOLS).some(L => L.includes(nm))
    ) {
      const ep = +frG(c0.side, 'dw').ep || 0;
      if (ep < 10) {
        await putState({ fr: frPatch(c0.side, 'dw', { ep: ep + 1 }) });
        toast('Tempered Creed: +1 Elemental Power (' + (ep + 1) + ').');
      }
    }
  } catch (e) {}
  /* Elemental Feedback (Sorcerer Kings Mastery): the first successful spell of its activation heals its regiment 2
     wounds per 2 successes */
  try {
    const c0 = base(cid);
    if (asChar && c0 && upgOf(c0, /Elemental Feedback/) && c0.fbR !== state.round) {
      const h = Math.min(Math.floor(succ / 2) * 2, +c0.wounds || 0),
        ok = canHeal(c0);
      await putState({
        units: state.units.map(x =>
          x.id === c0.id
            ? Object.assign({}, x, { fbR: state.round }, ok && h ? { wounds: (+x.wounds || 0) - h } : {})
            : x
        )
      });
      if (ok && h) toast('Elemental Feedback: ' + (c0.short || c0.name) + ' heals ' + h + ' wounds.');
    }
  } catch (e) {}
  try {
    const c0 = base(cid),
      t0 = base(tid);
    if (
      asChar &&
      c0 &&
      t0 &&
      t0.side === c0.side &&
      upgOf(c0, /Kabuki/) &&
      !hasGrant(t0, 'Kabuki (any Ideal Card)')
    )
      await putState({
        units: state.units.map(x => (x.id === t0.id ? grantU(x, 'Kabuki (any Ideal Card)', []) : x))
      });
  } catch (e) {}
  try {
    await srAfterSpell(cid, sp, tid, asChar);
  } catch (e) {}
  try {
    const u = base(cid),
      T = base(tid);
    if (
      asChar &&
      u &&
      T &&
      supAct(u.side, 'The Spirit Shines') &&
      (frRoles(u, true).includes('Theist') || /Theist|Priest/.test(u.charName || '')) &&
      T.side === u.side &&
      supRoles(T).includes('Theist')
    ) {
      for (const x of state.units.filter(
        x => x.side === u.side && x.id !== T.id && srAlive(x) && supRoles(x).includes('Theist')
      ))
        await resolveSpell0(cid, sp, x.id, succ, asChar);
    }
  } catch (e) {}
  return r;
}

async function resolveSpell0(cid, sp, tid, succ, asChar) {
  const u = byId(cid),
    T = byId(tid) || u,
    S = sp.db || {},
    nm = t => t.short || t.name,
    src = 'Spell: ' + sp.name;
  let units = state.units.slice(),
    parts = [],
    extra = {};
  /* hits are not rolled here: the defending player rolls Defense (and Morale) for them in the combat panel */
  const pend = [];
  const doHits = (t, n, ap, noM) => {
    if (n <= 0) return;
    pend.push({ id: t.id, n, ap: ap || 0, morale: !(noM || S.nm) });
    parts.push(nm(t) + ': ' + n + ' Hit' + (n === 1 ? '' : 's') + (ap ? ' (Armor Piercing ' + ap + ')' : '') + ', to roll Defense against');
  };
  if (!sp.db) {
    units = units.map(x =>
      x.id === T.id
        ? grantU(
            x,
            src + (sp.effect && sp.effect !== sp.name ? ' (' + String(sp.effect).slice(0, 60) + ')' : ''),
            [],
            null
          )
        : x
    );
    parts.push('effect noted on ' + nm(T));
  }
  if (S.h && S.x !== 'blackflame') doHits(T, S.h[0] * succ, S.h[1]);
  if (S.hf) doHits(T, S.hf[0], S.hf[1]);
  if (S.heal) {
    const n = S.heal === 's' ? succ : S.heal;
    units = units.map(x =>
      x.id === T.id ? Object.assign({}, x, { wounds: Math.max(0, (+x.wounds || 0) - n) }) : x
    );
    parts.push(nm(T) + ' heals ' + n);
  }
  if ((S.g || S.st || S.lbl) && !S.h && !S.hf) {
    units = units.map(x =>
      x.id === T.id ? grantU(x, S.lbl ? src + ' · ' + S.lbl : src, S.g || [], S.st || null) : x
    );
    if (S.cap && S.st)
      units = units.map(x => {
        if (x.id !== T.id) return x;
        const st = Object.assign({}, x.stats);
        Object.entries(S.cap).forEach(([k, m]) => {
          if (+st[k] > m) {
            const d = +st[k] - m;
            st[k] = m;
            const g = (x.temp || []).find(gg => gg.src.startsWith(src));
            if (g && g.d) g.d[k] = (g.d[k] || 0) - d;
          }
        });
        return Object.assign({}, x, { stats: st });
      });
    parts.push(
      nm(T) +
        ': ' +
        (S.lbl ||
          (S.g || []).join(', ') ||
          Object.entries(S.st || {})
            .map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + k)
            .join(', '))
    );
  } else if (S.lbl && (S.h || S.hf))
    units = units.map(x => (x.id === T.id && !x.destroyed ? grantU(x, src + ' · ' + S.lbl, [], null) : x));
  switch (S.x) {
    case 'enrage': {
      const cp = corners(u);
      units = units.map(x =>
        x.side === u.side && x.onTable && polyDist(cp, corners(x)) <= 12
          ? Object.assign({}, x, { effects: (x.effects || []).filter(e => e !== 'Broken') })
          : x
      );
      parts.push('friendly regiments within 12″ Rally (Broken removed)');
      break;
    }
    case 'crescendo': {
      const g = frG(u.side, 'wa');
      extra.fr = frPatch(u.side, 'wa', { seq: (g.seq || []).concat(['Conquest']).slice(-3) });
      parts.push('adds a Conquest Chant Marker');
      break;
    }
    case 'supplication': {
      /* the token goes to the pool the caster's player chose (the built-in opponent: where it gains a Tier) */
      const g = frG(u.side, 'od'),
        pool = suppPool === 'pant' || suppPool === 'dark' ? suppPool : odSuppPool(u.side);
      suppPool = null;
      extra.fr = frPatch(u.side, 'od', { [pool]: (+g[pool] || 0) + 1 });
      parts.push(pool === 'pant' ? '+1 Fallen Pantheon' : '+1 Dark Power');
      break;
    }
    case 'blackflame': {
      const tr = Math.max(odTier(u.side, 'dark'), odTier(u.side, 'pant'));
      parts.push(succ + ' success' + (succ === 1 ? '' : 'es') + ' + Empowerment Tier ' + tr);
      doHits(T, succ + tr, 0);
      break;
    }
    case 'hazlia': {
      const t = odTier(u.side, 'dark'),
        n = t + (/Legion|Creed/.test(frRoles(T).join()) ? 1 : 0);
      units = units.map(x =>
        x.id === T.id ? Object.assign({}, x, { wounds: Math.max(0, (+x.wounds || 0) - n) }) : x
      );
      parts.push(nm(T) + ' heals ' + n);
      break;
    }
    case 'bloodwater': {
      if (
        engaged(T)
          .map(byId)
          .some(e => e && frRoles(e).includes('Court of Water'))
      )
        doHits(T, +T.stats.R || 2, 0);
      break;
    }
    case 'lightning': {
      if (
        engaged(T)
          .map(byId)
          .some(e => e && frRoles(e).includes('Court of Air'))
      )
        doHits(T, +T.stats.D || 0, 0);
      break;
    }
    case 'liftwinds': {
      const cp = corners(u);
      units = units.map(x =>
        x.side === u.side &&
        x.onTable &&
        polyDist(cp, corners(x)) <= 12 &&
        frRoles(byId(x.id) || x).includes('Court of Air')
          ? grantU(x, src, ['Unstoppable'], null)
          : x
      );
      parts.push('Court of Air regiments within 12″ gain Unstoppable');
      break;
    }
    case 'ironsoul': {
      units = units.map(x =>
        x.id === T.id
          ? grantU(x, src, ['Untouchable'].concat(live(T) < (T.stands || 0) ? ['Tenacious (1)'] : []), null)
          : x
      );
      parts.push(nm(T) + ' gains Untouchable');
      break;
    }
    case 'propagate': {
      parts.push(
        'move the Seed Markers yourself (Seed −1 on ' + nm(T) + ', +1 on up to three friends within 8″)'
      );
      break;
    }
    case 'flamewall': {
      if (succ >= 4)
        units = units.map(x =>
          x.id === T.id && !x.destroyed ? grantU(x, src + ' · in Hindering terrain', [], null) : x
        );
      break;
    }
    case 'roots': {
      units = units.map(x =>
        x.id !== T.id
          ? x
          : T.side === u.side
            ? grantU(x, src, ['Counter-Attack', 'Parry'], null)
            : grantU(x, src, [], { M: -2 })
      );
      parts.push(T.side === u.side ? nm(T) + ' gains Counter-Attack and Parry' : nm(T) + ' −2 March');
      break;
    }
    case 'rockshape': {
      const g = frG(u.side, 'dw');
      extra.fr = frPatch(u.side, 'dw', { ep: Math.min(10, (+g.ep || 0) + 1) });
      parts.push('+1 Elemental Power');
      break;
    }
    case 'hone': {
      const tp = frRoles(T).includes('Tempered');
      units = units.map(x =>
        x.id === T.id
          ? grantU(x, src + (tp ? '' : ' · re-roll Clash hits of 6'), tp ? ['Deadly Blades'] : [], null)
          : x
      );
      parts.push(nm(T) + (tp ? ' gains Deadly Blades' : ' re-rolls Clash hits of 6'));
      break;
    }
    case 'resolve': {
      const n = Math.min(3, Math.floor(succ / 2));
      if (n) units = units.map(x => (x.id === T.id ? grantU(x, src, ['Indomitable (' + n + ')'], null) : x));
      parts.push(nm(T) + ' gains Indomitable (' + n + ')');
      break;
    }
    case 'songs': {
      const cp = corners(u),
        n = Math.min(
          6,
          all().filter(
            x => x.side === u.side && x.onTable && hasGrant(x, 'Awakened') && polyDist(cp, corners(x)) <= 12
          ).length
        );
      doHits(T, 1 + n, 0);
      break;
    }
  }
  if (S.t === 'zone' || S.t === 'terrain')
    parts.push(
      'apply it to the chosen ' +
        (S.t === 'zone' ? 'Objective Zone' : 'terrain piece') +
        ' yourself: ' +
        sp.text
    );
  if (!hasSpell(units.find(x => x.id === T.id) || {}, sp.name) && !(S.h || S.hf))
    units = units.map(x => (x.id === T.id ? grantU(x, src, [], null) : x));
  await putState(
    Object.assign({ units, lastTitle: N(u.side) + ' · ' + sp.name, lastText: parts.join('; ') + '.' }, extra)
  );
  const thaum = asChar && upgOf(u, /Thaumaturge/) ? u.id : null;
  pend.forEach(p =>
    queueHits({
      att: u.id,
      tgt: p.id,
      n: p.n,
      ap: p.ap,
      morale: p.morale,
      loose: true,
      label: sp.name,
      thaumBy: thaum,
      text: (asChar ? 'The ' + u.charName : nm(u)) + ' casts ' + sp.name + '.'
    })
  );
  return parts.join('; ');
}
