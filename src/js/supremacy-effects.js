/* Supremacy Abilities wired into play. */
/* ================= Supremacy Abilities: every passive and activated part wired into the game ================= */
function supK(side) {
  const S = supOf(side);
  return S ? S.k : '';
}
/* does the side hold this Supremacy Ability (the Warlord's, or the Dynastic Ally's) */
function supHasK(side, k) {
  return supAll(side).some(S => S.k === k);
}
function supOn(side, k) {
  return supAll(side).some(S => S.k === k && (S.d.t !== 'Battlefield' || S.on));
}
function supAct(side, k) {
  return supAll(side).some(S => S.k === k && S.active);
}
function srIsWl(u) {
  const w = supWl(u.side);
  return !!w && w.id === u.id && !w.destroyed && !!w.charName;
}
function srRnd() {
  return state.round || 1;
}
function supMemo(side, patch) {
  const sup = Object.assign({}, state.sup || {});
  sup[side] = Object.assign({}, sup[side] || {}, patch);
  return sup;
}
function supMem(side) {
  return (state.sup || {})[side] || {};
}
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
/* re-roll and dice hooks */
function supHitSrc(A, g, T) {
  const S = [];
  if (srHas(A, /^Professional Troops/) && (g.type === 'clash' || !g.type))
    S.push({ k: 'fail', face: 6, src: 'Professional Troops' });
  if (srHas(A, /^Crop Rotation/)) S.push({ k: 'fail', face: 6, src: 'Crop Rotation' });
  return S;
}
function supDefSrc(T) {
  return srHas(T, /^Professional Troops/) ? [{ k: 'fail', face: 6, src: 'Professional Troops' }] : [];
}
function supEvasion(T, E) {
  return supOn(T.side, 'Divine Protection') && E < 2 ? E + 1 : E;
}
/* Glimmers of a Golden Age: once per round, 1+X failed hits become hits in a Legion Clash or Charge */
function glimmerN(A) {
  if (
    !supOn(A.side, 'Glimmers of a Golden Age') ||
    !supRoles(A).includes('The Legion') ||
    supMem(A.side).glR === srRnd()
  )
    return 0;
  return 1 + (supAct(A.side, 'Glimmers of a Golden Age') ? 4 : odTierU(A, 'dark'));
}
/* chants */
function supOnChant(u, cult) {
  let units = state.units;
  const k = supK(u.side),
    notes = [];
  if (k === 'The Matriarch Walks' && (base(u.id).effects || []).includes('Broken')) {
    units = units.map(x =>
      x.id === u.id ? Object.assign({}, x, { effects: x.effects.filter(e => e !== 'Broken') }) : x
    );
    notes.push('The Matriarch Walks: no longer Broken');
  }
  if (k === 'Visions of Conquest' && cult === 'Conquest') {
    const E = engaged(u).map(e => e.id);
    units = units.map(x => (E.includes(x.id) ? grantU(x, 'Dissonance (no Inspiration this round)', []) : x));
    if (E.length) notes.push('Visions of Conquest: engaged enemies lose Inspiration');
  }
  if (k === 'Visions of War' && cult === 'War') {
    units = units.map(x =>
      x.id === u.id ? grantU(x, 'Visions of War (Tenacious (1))', ['Tenacious (1)']) : x
    );
    notes.push('Visions of War: Tenacious (1)');
  }
  if (k === 'Visions of Death' && cult === 'Death' && /Infantry/.test(u.cls || '')) {
    units = units.map(x =>
      x.id === u.id ? grantU(x, 'Visions of Death (Command Stand +3 Attacks)', []) : x
    );
    notes.push('Visions of Death: Command Stand +3 Attacks');
  }
  return { units, notes };
}
/* the Matriarch Walks and Visions of Conquest (card choice) */
function vocOk(c) {
  return supAct(HU, 'Visions of Conquest') && huStackOn() && validCards(PS().huStack).includes(c);
}
function mwExtra(side) {
  return supAct(side, 'The Matriarch Walks') && supMem(side).mwR !== srRnd();
}
/* Carrier of the Godflesh */
function srGodflesh(side, card) {
  if (!card || !supOn(side, 'Carrier of the Godflesh')) return {};
  const id = card.slice(2),
    u = base(id);
  if (!u || !u.onTable) return {};
  const hard = rx((u.rules || []).concat(fx(u)), 'Hardened');
  return {
    units: state.units.map(x =>
      x.id === id && hard < 2 ? grantU(x, 'Carrier of the Godflesh (Hardened (+1))', ['Hardened (+1)']) : x
    ),
    lastText:
      'Carrier of the Godflesh: the Strategic Stack card is revealed (' +
      cardName(card) +
      '); ' +
      (u.short || u.name) +
      ' gains Hardened (+1).'
  };
}
/* reinforcements: Raid Tactics!, Infantry Tactics, Combat Maneuvers, Reigning Season, Tactical Superiority */
function supReinfNeed(u, need) {
  return supK(u.side) === 'Raid Tactics!' &&
    (supRoles(u).includes('Mortals') || supRoles(u).includes('Exalted'))
    ? need + 1
    : need;
}
function supAfterReinf(side, units, res) {
  supAll(side).forEach(S => supAfterReinf1(side, units, res, S));
}
function supAfterReinf1(side, units, res, S) {
  if (!S) return;
  const arr = units.filter(u => u.side === side && u.arriving && !u.onTable);
  const give = (u, src, r) => {
    Object.assign(u, grantU(u, src, r));
  };
  if (S.k === 'Combat Maneuvers') {
    const imp = arr.filter(u => /Infantry/.test(u.cls || '') && supRoles(u).includes('Imperial'));
    const L = imp.length ? imp.slice(0, 2) : arr.filter(u => /Infantry/.test(u.cls || '')).slice(0, 1);
    L.forEach(u => {
      give(u, 'Combat Maneuvers (Vanguard (5))', ['Vanguard (5)']);
      res.push(u.name + ' gains Vanguard (5) (Combat Maneuvers)');
    });
  }
  if (S.k === 'Reigning Season' && supMem(side).rsR !== srRnd()) {
    const u = arr.filter(u => u.type !== 'monster').sort((a, b) => (+b.points || 0) - (+a.points || 0))[0];
    if (u) {
      give(u, 'Reigning Season (Vanguard (3))', ['Vanguard (3)']);
      res.push(u.name + ' gains Vanguard (3) (Reigning Season)');
      state.sup = supMemo(side, { rsR: srRnd() });
    }
  }
}
function supTactical(side, pool, autoId) {
  if (!supHasK(side, 'Tactical Superiority') || !autoId) return null;
  return pool.find(
    u =>
      u.id !== autoId &&
      !u.arriving &&
      supRoles(u).includes('The Orders') &&
      reinfRule(u.cls, state.round || 1) !== 'no'
  );
}
/* Lead by Example: after an Orders regiment activates, the next card's non-Veteran regiment Rallies and gets +1 Clash and +2″ Charge */
function supLeadByExample(units, a) {
  const u = units.find(x => x.id === a.id);
  if (
    !u ||
    !supHasK(u.side, 'Lead by Example') ||
    supMem(u.side).lbR === srRnd() ||
    !supRoles(u).includes('The Orders')
  )
    return null;
  const st = (u.side === HU && !PVP() ? PS().huStack || [] : state.aiStack || []).filter(
    c => c[0] === 'u' && c.slice(2) !== u.id && cardOk(c)
  );
  const nx = st[0];
  if (!nx) return null;
  const t = units.find(x => x.id === nx.slice(2));
  if (!t || supRoles(t).includes('Veteran')) return null;
  const i = units.indexOf(t);
  let y = Object.assign({}, t, { effects: (t.effects || []).filter(e => e !== 'Broken') });
  if ((+y.stats.C || 0) < 4) y = grantU(y, 'Lead by Example (+1 Clash)', [], { C: 1 });
  y = grantU(y, 'Charge +2″ (Lead by Example)', []);
  units[i] = y;
  return 'Lead by Example: ' + (t.short || t.name) + ' Rallies and gets +1 Clash and +2″ Charge';
}
/* Paragon of War: while the Exemplar's regiment is engaged, all friendly regiments are Awakened */
function supParagon(st) {
  ['cs', 'nord'].forEach(side => {
    const w = st.units.find(u => u.side === side && u.warlord);
    if (!w || !/Exemplar/.test(w.charName || '') || !w.onTable || w.destroyed) return;
    const keep = state;
    state = st;
    try {
      if (!engaged(w).length) return;
      st.units = st.units.map(x =>
        x.side === side && x.onTable && !x.destroyed && x.type !== 'marker' && !hasGrant(x, 'Awakened')
          ? grantU(
              Object.assign({}, x, { effects: (x.effects || []).filter(e => e !== 'Broken') }),
              'Awakened',
              awakenRules(x)
            )
          : x
      );
    } finally {
      state = keep;
    }
  });
}
/* Field Studies (Biomancer): Observation tokens */
function fsTok(side) {
  return +supMem(side).fs || 0;
}
/* character extra spells: Divinity Grace, Omnipotence (4+ successes), Forgemaster (once per round), Crop Rotation, The Spirit Shines (activated), Blasphemous Mesa (1 token) */
let lastSpellSucc = 0;
function srExtraCast(u, res) {
  if (charAct && res && res.success && lastSpellSucc >= 4 && upgOf(u, /Unholy Mastery/) && !charAct.um)
    return 'Unholy Mastery';
  const S = supOf(u.side);
  if (!S || !charAct) return '';
  const wl = srIsWl(u),
    R = srRnd(),
    n = (charAct.cast || []).length;
  if (S.k === 'Divinity Grace' && wl && n === 1) return 'Divinity Grace';
  if (S.k === 'Crop Rotation' && wl && n === 1) return 'Crop Rotation';
  if (S.k === 'Forgemaster' && wl && n === 1 && supMem(u.side).fgR !== R) return 'Forgemaster';
  if (S.k === 'Omnipotence' && res && res.success && lastSpellSucc >= 4 && !charAct.omni)
    return 'Omnipotence';
  if (
    supAct(u.side, 'The Spirit Shines') &&
    (frRoles(u, true).includes('Theist') || /Theist|Priest/.test(u.charName || '')) &&
    supMem(u.side).ssR !== R &&
    n === 1
  )
    return 'The Spirit Shines';
  if (charAct.mesa && n === 1) return 'Blasphemous Mesa';
  return '';
}
async function srCharCast(res) {
  if (!charAct) return;
  const u = byId(charAct.id);
  charAct.cast = (charAct.cast || []).concat(res.spell ? [res.spell] : []);
  charAct.notes = (charAct.notes || []).concat([
    (res.success ? 'Cast ' : 'Tried to cast ') + res.spell + ': ' + res.line
  ]);
  const why = srExtraCast(u, res);
  if (why) {
    if (why === 'Forgemaster') await putState({ sup: supMemo(u.side, { fgR: srRnd() }) });
    if (why === 'The Spirit Shines') {
      await putState({ sup: supMemo(u.side, { ssR: srRnd() }) });
      charAct.autoWin = true;
    }
    if (why === 'Omnipotence') charAct.omni = true;
    if (why === 'Unholy Mastery') charAct.um = true;
    if (why === 'Blasphemous Mesa') charAct.mesa = false;
    Object.assign(charAct, { spell: 0, target: null, rolls: null, done: false });
    toast(why + ': the ' + u.charName + ' may cast one more spell (not the same one).');
    render();
    return;
  }
  await charCommit(charAct.id, {
    spell: res.spell,
    target: res.success ? res.target : null,
    success: res.success,
    note: charAct.notes.join('. ') + '.'
  });
}
async function srAiExtra(u, first) {
  const why = (() => {
    const S = supOf(u.side);
    if (!S) return '';
    const wl = srIsWl(u);
    if (S.k === 'Divinity Grace' && wl) return 'x';
    if (S.k === 'Crop Rotation' && wl) return 'x';
    if (S.k === 'Forgemaster' && wl && supMem(u.side).fgR !== srRnd()) return 'fg';
    if (S.k === 'Omnipotence' && lastSpellSucc >= 4) return 'x';
    return '';
  })();
  if (!why) return '';
  if (why === 'fg') await putState({ sup: supMemo(u.side, { fgR: srRnd() }) });
  const sp = spellsOf(u, true).find(s => s.name !== first && spellTargets(u, s).length);
  if (!sp) return '';
  const r = await aiCastSpell(byId(u.id), true, sp.name, null);
  return r ? '; then ' + r : '';
}
/* Supremacy draw-step options for the active regiment */
function supOptions(u) {
  const out = [];
  if (!u || !act || act.id !== u.id) return out;
  const side = u.side,
    S = supOf(side);
  if (!S) return out;
  const fresh = !act.actions.length && !act.cur,
    R = srRnd(),
    roles = supRoles(u),
    add = (label, fn, why) => out.push({ label, fn, why });
  const head = t => out.push({ head: t });
  if (S.k === 'Obdurate Bone and Stone' && supMem(side).obR !== R) {
    const X = odTier(side, 'dark');
    const opts = [];
    if (roles.includes('The Legion'))
      opts.push([
        '+' + X + '″ Charge distance this activation',
        () =>
          grant(
            u.id,
            'Charge +' + X + '″ (Obdurate Bone and Stone)',
            [],
            null,
            'Obdurate Bone and Stone: +' + X + '″ Charge'
          )
      ]);
    if (srIsWl(u))
      opts.push([
        '+' + X + ' Attacks in its Clash this activation',
        () =>
          grant(
            u.id,
            'Obdurate Bone and Stone (+' + X + ' Attacks)',
            [],
            { A: X },
            'Obdurate Bone and Stone: +' + X + ' Attacks'
          )
      ]);
    if (opts.length) {
      head('Obdurate Bone and Stone (once per round, X = Dark Power Tier ' + X + ')');
      opts.forEach(([l, f]) =>
        add(l, async () => {
          await f();
          await putState({ sup: supMemo(side, { obR: R }) });
        })
      );
    }
  }
  if (
    S.k === 'Reign of Terror' &&
    (roles.includes('The Creed') || roles.includes('The Legion')) &&
    supMem(side).rtR !== R &&
    !hasGrant(u, 'Trial of Will')
  ) {
    const g = frG(side, 'od');
    head('Reign of Terror (once per round)');
    add(
      'Spend 1 Power token: Trial of Will for its Clash',
      async () => {
        const pool = (+g.dark || 0) > 0 ? 'dark' : 'pant';
        await putState({
          fr: frPatch(side, 'od', { [pool]: Math.max(0, (+g[pool] || 0) - 1) }),
          sup: supMemo(side, { rtR: R }),
          units: state.units.map(x =>
            x.id === u.id ? grantU(x, 'Reign of Terror (Trial of Will)', ['Trial of Will']) : x
          )
        });
      },
      (+g.dark || 0) + (+g.pant || 0) < 1 ? 'No Power tokens' : ''
    );
  }
  if (
    S.k === 'Blasphemous Mesa' &&
    S.active &&
    (roles.includes('The Creed') || roles.includes('The Legion')) &&
    !act.mesa
  ) {
    const g = frG(side, 'od');
    head('Blasphemous Mesa (spend 1 Dark Power token)');
    [
      ['Aura of Death (+1)', ['Aura of Death (+1)']],
      ['loses Brittle', [], 'Loses Brittle (Blasphemous Mesa)'],
      ['Terrifying (+1)', ['Terrifying (+1)']]
    ].forEach(([l, r, lab]) =>
      add(
        l,
        async () => {
          act.mesa = true;
          await putState({
            fr: frPatch(side, 'od', { dark: (+g.dark || 0) - 1 }),
            units: state.units.map(x => (x.id === u.id ? grantU(x, lab || 'Blasphemous Mesa: ' + l, r) : x))
          });
        },
        (+g.dark || 0) < 1 ? 'No Dark Power tokens' : !fresh ? 'Only before Draw Events and actions' : ''
      )
    );
  }
  if (S.k === 'Ruthless Competence' && roles.includes('Clone') && supMem(side).rcR !== R) {
    head('Ruthless Competence (once per round)');
    add('Opportunist for its Clash or Volley this activation', async () => {
      act.extraFx.push('Opportunist (Ruthless Competence)');
      await putState({ sup: supMemo(side, { rcR: R }) });
    });
  }
  if (
    S.k === 'Induced Aggression' &&
    act.frDecay &&
    ['Drone', 'Clone', 'Monstrosity'].some(r => roles.includes(r)) &&
    !act.iaSwap
  ) {
    head('Induced Aggression');
    add('Swap the Strain for +1 Clash (max 4) and +1 March', async () => {
      act.iaSwap = true;
      const S0 = srStrain(u);
      await putState({
        units: state.units.map(x => {
          if (x.id !== u.id) return x;
          let y = ungrantU(x, src => src === 'Strain: ' + (S0 && S0[0]));
          y = grantU(
            y,
            'Induced Aggression (+1 Clash, +1 March)',
            [],
            Object.assign({ M: 1 }, (+y.stats.C || 0) < 4 ? { C: 1 } : {})
          );
          return y;
        })
      });
    });
  }
  if (S.k === 'Field Studies' && S.on && act.frDecay && !act.fsNoDecay && fsTok(side) >= 2) {
    head('Field Studies');
    add('Spend 2 tokens: this Strain Expression causes no Decay', async () => {
      act.fsNoDecay = true;
      act.frDecay = false;
      await putState({ sup: supMemo(side, { fs: fsTok(side) - 2 }) });
    });
  }
  if (
    [
      'Lord of Roaring Flames',
      'Lord of the Eternal Mountain',
      'Mistress of Azure Gales',
      'Mistress of Winsome Mists',
      'Mistress of the Ghostly Reikai'
    ].includes(S.k) &&
    act.frIdeal &&
    supMem(side).ideR !== R &&
    !act.ideUsed
  ) {
    const k = act.frIdeal,
      need =
        {
          'Lord of the Eternal Mountain': 'Chi',
          'Mistress of Azure Gales': 'Fu',
          'Mistress of Winsome Mists': 'Sui',
          'Mistress of the Ghostly Reikai': 'Mu'
        }[S.k] || supWlIdeal(side);
    if (
      k === need &&
      !(S.k === 'Mistress of the Ghostly Reikai' && u.type === 'monster') &&
      (S.k === 'Lord of Roaring Flames' ||
        S.k === 'Mistress of Winsome Mists' ||
        hasGrant(base(u.id), 'Ideal Card: ' + k))
    ) {
      const done = async () => {
        act.ideUsed = true;
        await putState({ sup: supMemo(side, { ideR: R }) });
      };
      head(S.k + ' (once per round)');
      if (S.k === 'Lord of Roaring Flames')
        add('Also gain Glorious Charge this round', async () => {
          await grant(u.id, 'Lord of Roaring Flames (Glorious Charge)', ['Glorious Charge']);
          await done();
        });
      if (S.k === 'Lord of the Eternal Mountain')
        add('Replace the Chi effect with Hardened (+1) and Oblivious', async () => {
          await putState({
            units: state.units.map(x =>
              x.id === u.id
                ? grantU(
                    ungrantU(x, src => src === 'Ideal Card: Chi'),
                    'Lord of the Eternal Mountain',
                    ['Hardened (+1)', 'Oblivious']
                  )
                : x
            )
          });
          await done();
        });
      if (S.k === 'Mistress of Azure Gales')
        add('Replace the Fu effect with Fluid Formation', async () => {
          act.frFu = false;
          await putState({
            units: state.units.map(x =>
              x.id === u.id
                ? grantU(
                    ungrantU(x, src => src === 'Ideal Card: Fu'),
                    'Mistress of Azure Gales (Fluid Formation)',
                    ['Fluid Formation']
                  )
                : x
            )
          });
          await done();
        });
      if (S.k === 'Mistress of the Ghostly Reikai')
        add('Replace the Mu effect with Loose Formation', async () => {
          await putState({
            units: state.units.map(x =>
              x.id === u.id
                ? grantU(
                    ungrantU(x, src => src === 'Ideal Card: Mu'),
                    'Mistress of the Ghostly Reikai (Loose Formation)',
                    ['Loose Formation']
                  )
                : x
            )
          });
          await done();
        });
      if (S.k === 'Mistress of Winsome Mists')
        ['Blossom in the Wind', 'Misery of Failure Envisioned'].forEach(n => {
          const sp = supSpell(u, n);
          if (!sp) return;
          const T = spellTargets(u, sp);
          if (!T.length) return;
          add(
            'Replace the Sui effect: cast ' + n + ' (automatic) on ' + (T[0].short || T[0].name),
            async () => {
              await putState({
                units: state.units.map(x =>
                  x.id === u.id ? ungrantU(x, src => src === 'Ideal Card: Sui') : x
                )
              });
              const line = await resolveSpell(u.id, sp, T[0].id, 2, false);
              toast(n + ': ' + line);
              await done();
            }
          );
        });
    }
  }
  if (S.k === 'Thesis/Antithesis/Synthesis' && S.active && frRoles(u).includes('Forged') && !act.thesis) {
    act.thesis = true;
    const g = frG(side, 'dw');
    frSet(
      side,
      'dw',
      { ep: Math.min(10, (+g.ep || 0) + 1) },
      {
        lastTitle: N(side) + ' · Thesis/Antithesis/Synthesis',
        lastText: 'A Forged regiment activates: +1 Elemental Power.'
      }
    );
  }
  return out;
}
function supWlIdeal(side) {
  const w = supWl(side);
  return w ? frRoles(w, !!w.charName).find(r => ['Ka', 'Chi', 'Fu', 'Sui', 'Mu'].includes(r)) || '' : '';
}
function supSpell(u, name) {
  const S = typeof SPELLDB !== 'undefined' && SPELLDB[name];
  if (!S) return null;
  return {
    name,
    range: S.r || 0,
    att: S.a,
    scaling: !!S.s,
    targets: S.t === 'enemy' ? 'enemy' : 'friendly',
    text: S.d || '',
    db: S
  };
}
function supIdealMatch(u, k) {
  const S = supOf(u.side);
  if (!S || !S.active) return false;
  const need = {
    'Lord of Roaring Flames': supWlIdeal(u.side),
    'Lord of the Eternal Mountain': 'Chi',
    'Mistress of Azure Gales': 'Fu',
    'Mistress of Winsome Mists': 'Sui',
    'Mistress of the Ghostly Reikai': 'Mu'
  }[S.k];
  return !!need && need === k;
}
/* activated parts that need a choice: Skývald's Hregg, Surrounded by Fear and Dead Men, Master of the Legions, First Born of War */
async function supHregg(side, tid) {
  const T = base(tid);
  if (!T) return;
  const AL = allocate(T, 5);
  await putState({
    units: state.units.map(x =>
      x.id === tid
        ? Object.assign(
            {},
            x,
            { wounds: AL.w, auxWounds: AL.aw },
            AL.dead
              ? {
                  onTable: false,
                  destroyed: true,
                  status: 'Destroyed',
                  destroyedRound: state.round,
                  destroyedBy: side
                }
              : {}
          )
        : x
    ),
    lastTitle: N(side) + ' · Skývald: Hregg',
    lastText: (T.short || T.name) + ' suffers 5 unavoidable wounds. No Morale Tests.'
  });
}
async function supSacrifice(side, tid) {
  const T = base(tid);
  if (!T) return;
  const W = +(T.stats && T.stats.W) || 4,
    before = live(T),
    AL = allocate(T, 3 * W),
    after = AL.dead ? 0 : live(Object.assign({}, T, { wounds: AL.w, auxWounds: AL.aw })),
    lost = Math.max(0, before - after);
  const g = frG(side, 'od');
  await putState({
    fr: frPatch(side, 'od', { pant: (+g.pant || 0) + lost }),
    units: state.units.map(x =>
      x.id === tid
        ? Object.assign(
            {},
            x,
            { wounds: AL.w, auxWounds: AL.aw },
            AL.dead
              ? {
                  onTable: false,
                  destroyed: true,
                  status: 'Destroyed (sacrificed)',
                  destroyedRound: state.round
                }
              : {}
          )
        : x
    ),
    lastTitle: N(side) + ' · Surrounded by Fear and Dead Men',
    lastText:
      (T.short || T.name) +
      ' loses ' +
      lost +
      ' stand' +
      (lost === 1 ? '' : 's') +
      '; +' +
      lost +
      ' Fallen Pantheon token' +
      (lost === 1 ? '' : 's') +
      (AL.dead ? '. It is destroyed (its Command Stand may Die Fighting).' : '.')
  });
}
const MOTL = {
  'Tier +1': ['Master of the Legions (Dark Power Tier +1)', []],
  'Memories of Old': ['Memories of Old', null],
  '2D6 Charge': ['Master of the Legions (2D6 Charge, pick the highest)', []],
  'loses Brittle': ['Loses Brittle (Master of the Legions)', []]
};
async function supMotl(side, picks) {
  let units = state.units;
  const lines = [];
  picks.forEach(([id, b]) => {
    const u = units.find(x => x.id === id);
    if (!u || !MOTL[b]) return;
    let y;
    if (b === 'Memories of Old') {
      const m = memOf(u);
      y = m ? grantU(u, 'Memories of Old', m.rules) : u;
    } else y = grantU(u, MOTL[b][0], MOTL[b][1]);
    units = units.map(x => (x.id === id ? y : x));
    lines.push((u.short || u.name) + ': ' + b);
  });
  await putState({
    units,
    sup: supMemo(side, { motlR: srRnd() }),
    lastTitle: N(side) + ' · Master of the Legions',
    lastText: lines.join('; ') || 'No regiment chosen.'
  });
}
async function supFirstBorn(side, ids) {
  let units = state.units;
  ids.forEach(id => {
    units = units.map(x =>
      x.id === id && !hasGrant(x, 'Awakened')
        ? grantU(
            Object.assign({}, x, { effects: (x.effects || []).filter(e => e !== 'Broken') }),
            'Awakened',
            awakenRules(x)
          )
        : x
    );
  });
  await putState({
    units,
    sup: supMemo(side, { fbR: srRnd() }),
    lastTitle: N(side) + ' · First Born of War',
    lastText:
      ids
        .map(id => {
          const u = base(id);
          return u ? u.short || u.name : id;
        })
        .join(' and ') + ' become Awakened.'
  });
}
const LASTOR = 'Last Oration (re-roll failed Defense within range of an Objective Zone)';
function lastorNeeded(side) {
  return (state.units || []).find(
    u => u.side === side && srAlive(u) && upgOf(u, /Last Oration/) && u.lastorR !== srRnd()
  );
}
async function lastorSet(id, on) {
  const R = srRnd();
  await putState({
    units: state.units.map(x =>
      x.id !== id ? x : Object.assign({}, on ? grantU(x, LASTOR, []) : x, { lastorR: R })
    ),
    lastTitle: N(base(id).side) + ' · Standard of Last Oration',
    lastText: on
      ? (base(id).short || base(id).name) +
        ' re-rolls failed Defense rolls within range of an Objective Zone this round.'
      : 'Standard of Last Oration not used this round.'
  });
}
function supChoiceNeeded(side) {
  if (cdirNeeded(side)) return 'cdir';
  if (lastorNeeded(side)) return 'lastor';
  const S = supOf(side);
  if (!S) return '';
  const R = srRnd();
  if (
    S.k === 'First Born of War' &&
    S.on &&
    supMem(side).fbR !== R &&
    (state.units || []).some(u => u.side === side && srAlive(u))
  )
    return 'fb';
  if (
    S.k === 'Master of the Legions' &&
    S.active &&
    supMem(side).motlR !== R &&
    (state.units || []).some(u => u.side === side && srAlive(u) && supRoles(u).includes('The Legion'))
  )
    return 'motl';
  if (S.k === 'Skývald' && S.active && S.choice === 'Hregg' && supMem(side).hrR !== R) return 'hregg';
  if (S.k === 'Surrounded by Fear and Dead Men' && S.active && supMem(side).sfR !== R) return 'sacrifice';
  return '';
}
function cdirNeeded(side) {
  return (state.units || []).find(
    u => u.side === side && srAlive(u) && /Eidolon/.test(u.charName || '') && !cdirOf(u)
  );
}
async function supAiChoice(side) {
  const c = supChoiceNeeded(side),
    R = srRnd();
  if (c === 'lastor') {
    let e;
    while ((e = lastorNeeded(side))) await lastorSet(e.id, true);
    return supAiChoice(side);
  }
  if (c === 'cdir') {
    let e;
    while ((e = cdirNeeded(side))) await cdirSet(e.id, 'Precision Armament');
    return supAiChoice(side);
  }
  const mine = (state.units || []).filter(u => u.side === side && srAlive(u)),
    foes = (state.units || []).filter(u => u.side !== side && srAlive(u));
  const nearFoe = u => Math.min(99, ...foes.map(e => polyDist(corners(u), corners(e))));
  if (c === 'fb')
    await supFirstBorn(
      side,
      mine
        .sort((a, b) => nearFoe(a) - nearFoe(b))
        .slice(0, 2)
        .map(u => u.id)
    );
  if (c === 'motl')
    await supMotl(
      side,
      mine
        .filter(u => supRoles(u).includes('The Legion'))
        .sort((a, b) => nearFoe(a) - nearFoe(b))
        .slice(0, 2)
        .map(u => [u.id, nearFoe(u) < 12 ? '2D6 Charge' : memOf(u) ? 'Memories of Old' : 'loses Brittle'])
    );
  if (c === 'hregg') {
    const t = foes.sort((a, b) => (+b.points || 0) - (+a.points || 0))[0];
    await putState({ sup: supMemo(side, { hrR: R }) });
    if (t) await supHregg(side, t.id);
  }
  if (c === 'sacrifice') {
    const t = mine
      .filter(
        u =>
          supRoles(u).includes('The Fallen Pantheon') && !/Fallen Divinity/.test(u.name + (u.charName || ''))
      )
      .sort((a, b) => (+a.points || 0) - (+b.points || 0))[0];
    await putState({ sup: supMemo(side, { sfR: R }) });
    if (t) await supSacrifice(side, t.id);
  }
}
function supChoiceBar(add, mk, me, info) {
  const c = supChoiceNeeded(me);
  if (!c) return false;
  const R = srRnd(),
    mine = (state.units || []).filter(u => u.side === me && srAlive(u)),
    foes = (state.units || []).filter(u => u.side !== me && srAlive(u));
  const mkSel = (lab, L, none) => {
    const s = document.createElement('select');
    s.setAttribute('aria-label', lab);
    if (none) {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = none;
      s.appendChild(o);
    }
    L.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id;
      o.textContent = u.short || u.name;
      s.appendChild(o);
    });
    add(s);
    return s;
  };
  if (c === 'lastor') {
    const e = lastorNeeded(me);
    info.textContent =
      'Standard of Last Oration with ' +
      (e.short || e.name) +
      ' (end of the Supremacy Phase): until the end of the round it re-rolls failed Defense rolls while within range of an Objective Zone.';
    add(mk('Activate it', () => lastorSet(e.id, true)));
    add(mk('Not this round', () => lastorSet(e.id, false)));
    return true;
  }
  if (c === 'cdir') {
    const e = cdirNeeded(me);
    info.textContent =
      'Combat Directive for the Eidolon with ' +
      (e.short || e.name) +
      ' (end of the Supremacy Phase): choose one until the end of the round.';
    cdirKeys(e).forEach(k => add(mk(k, () => cdirSet(e.id, k))));
    return true;
  }
  if (c === 'fb') {
    info.textContent = 'First Born of War: choose two friendly regiments to become Awakened this round.';
    const a = mkSel('First regiment', mine),
      b = mkSel('Second regiment', mine, 'none');
    add(
      mk('Awaken them', () =>
        supFirstBorn(
          me,
          [a.value, b.value].filter((v, i, A) => v && A.indexOf(v) === i)
        )
      )
    );
    return true;
  }
  if (c === 'motl') {
    info.textContent = 'Master of the Legions: up to two Legion regiments each gain one benefit this round.';
    const L = mine.filter(u => supRoles(u).includes('The Legion'));
    const rows = [0, 1].map(i => {
      const s = mkSel('Legion regiment ' + (i + 1), L, i ? 'none' : null);
      const b = document.createElement('select');
      b.setAttribute('aria-label', 'Benefit ' + (i + 1));
      Object.keys(MOTL).forEach(k => {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = k;
        b.appendChild(o);
      });
      add(b);
      return [s, b];
    });
    add(
      mk('Apply', () =>
        supMotl(
          me,
          rows.filter(([s]) => s.value).map(([s, b]) => [s.value, b.value])
        )
      )
    );
    return true;
  }
  if (c === 'hregg') {
    info.textContent = 'Skývald, Hregg: one enemy regiment suffers 5 unavoidable wounds (no Morale Tests).';
    const s = mkSel('Hregg target', foes);
    add(
      mk('Strike', async () => {
        await putState({ sup: supMemo(me, { hrR: R }) });
        await supHregg(me, s.value);
      })
    );
    return true;
  }
  if (c === 'sacrifice') {
    info.textContent =
      'Surrounded by Fear and Dead Men: destroy up to 3 stands of another Fallen Pantheon regiment; each stand gives a Fallen Pantheon token.';
    const L = mine.filter(
      u => supRoles(u).includes('The Fallen Pantheon') && !/Fallen Divinity/.test(u.name + (u.charName || ''))
    );
    if (!L.length) {
      putState({ sup: supMemo(me, { sfR: R }) });
      return true;
    }
    const s = mkSel('Regiment to sacrifice', L);
    add(
      mk('Sacrifice', async () => {
        await putState({ sup: supMemo(me, { sfR: R }) });
        await supSacrifice(me, s.value);
      })
    );
    add(mk('Skip', () => putState({ sup: supMemo(me, { sfR: R }) }), true));
    return true;
  }
  return false;
}
/* Army of Lions: once per game, reveal the top card before the Supremacy roll-off; a Polemarch card wins it */
function aolTry(side) {
  if (supK(side) !== 'Army of Lions' || supMem(side).aolUsed) return null;
  const S = supOf(side);
  if (!S.on) return null;
  const st = side === HU && !PVP() ? PS().huStack || [] : state.aiStack || [];
  const top = validCards(st)[0];
  if (!top) return null;
  const u = base(top.slice(2));
  const isP = top[0] === 'c' && u && /Polemarch/.test(u.charName || '');
  return { top, isP };
}
/* Tricks of the Trade: the Influence Pool */
function totPool(side) {
  return supMem(side).pool || [];
}
async function supOnAwaken(u) {
  if (!u) return;
  const k = supK(u.side);
  if (k === 'Herald of War' && srIsWl(u)) {
    for (const x of srFriends(u).filter(
      x => frRoles(x).includes('Ardent') && srNear(x, u, 8) && !hasGrant(x, 'Awakened')
    ))
      await awaken0(x.id, 'Herald of War');
  }
  if (k === 'Thesis/Antithesis/Synthesis') {
    const ids = (state.units || [])
      .filter(
        x =>
          x.side === u.side &&
          hasGrant(x, 'Awakened') &&
          !x.thesisR &&
          frRoles(x).includes('Forged') &&
          x.type !== 'monster' &&
          (x.wounds || 0) > 0 &&
          canHeal(x)
      )
      .map(x => x.id);
    if (ids.length)
      await putState({
        units: state.units.map(x =>
          ids.includes(x.id)
            ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - 2), thesisR: srRnd() })
            : x
        ),
        lastTitle: N(u.side) + ' · Thesis/Antithesis/Synthesis',
        lastText: 'Awakened Forged regiments heal 2 wounds.'
      });
  }
}
async function supAfterCombat(S, before) {
  const A = base(S.att),
    T = base(S.tgt);
  if (!A || !T) return;
  const lostT = Math.max(0, live(before) - (T.destroyed ? 0 : live(T)));
  const kA = supK(A.side);
  if (
    lostT &&
    (S.type === 'clash' || S.type === 'impact') &&
    kA === 'Driven by Carnage' &&
    supRoles(A).includes('Half-Bloods') &&
    canHeal(A) &&
    (A.wounds || 0) > 0
  ) {
    const h = lostT * (supAct(A.side, kA) ? 2 : 1);
    await putState({
      units: state.units.map(x =>
        x.id === A.id ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - h) }) : x
      ),
      lastText: (state.lastText || '') + ' Driven by Carnage: heals ' + h + '.'
    });
  }
  if (T.destroyed && !before.destroyed && act && act.id === A.id) {
    const dc =
        kA === 'Driven by Carnage' &&
        (srIsWl(A) || (supAct(A.side, kA) && supRoles(A).includes('Half-Bloods'))) &&
        (S.type === 'clash' || S.type === 'impact'),
      rp = supHasK(A.side, 'Relentless Protectors') && /Cavalry/.test(A.cls || '') && S.type === 'impact';
    if (dc || rp) {
      act.freeReform = dc ? 'Driven by Carnage' : 'Relentless Protectors';
      toast(act.freeReform + ': it may make a free out-of-sequence Reform.');
      render();
    }
  }
  if (T.destroyed && !before.destroyed) {
    for (const s of ['cs', 'nord'])
      if (supOn(s, 'Field Studies') && fsTok(s) < 4)
        await putState({ sup: supMemo(s, { fs: fsTok(s) + 1 }) });
  }
}
/* Eidolon: Dark Hand of the Scholae (start of its activation): an enemy regiment is Hunted until destroyed */
function huntedOf(side) {
  const id = (state.hunted || {})[side],
    t = id && base(id);
  return t && !t.destroyed ? t : null;
}
function setHunted(side, id) {
  const t = base(id);
  return putState({
    hunted: Object.assign({}, state.hunted || {}, { [side]: id }),
    lastTitle: N(side) + ' · Dark Hand of the Scholae',
    lastText:
      (t ? t.short || t.name : id) +
      ' is Hunted: friendly Inquisitors in contact with it gain Terrifying (2).'
  });
}
function darkHandBox(u, box) {
  if (!/Eidolon/.test(u.charName || '')) return;
  const h = huntedOf(u.side);
  if (h) {
    box.appendChild(ptext('Dark Hand of the Scholae: ' + (h.short || h.name) + ' is Hunted.'));
    return;
  }
  const E = (state.units || []).filter(x => x.side !== u.side && srAlive(x));
  if (!E.length) return;
  const r = document.createElement('div');
  r.className = 'row';
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Hunted regiment');
  E.forEach(e => {
    const o = document.createElement('option');
    o.value = e.id;
    o.textContent = e.short || e.name;
    sel.appendChild(o);
  });
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = 'Mark as Hunted';
  b.onclick = () => setHunted(u.side, sel.value);
  r.append(sel, b);
  box.appendChild(
    ptext(
      'Dark Hand of the Scholae (start of activation, before Draw Events): choose an enemy regiment to be Hunted until it is destroyed.'
    )
  );
  box.appendChild(r);
}
async function darkHandAI(u) {
  if (!u || !/Eidolon/.test(u.charName || '') || huntedOf(u.side)) return;
  const E = (state.units || [])
    .filter(x => x.side !== u.side && srAlive(x))
    .sort((a, b) => (+b.points || 0) - (+a.points || 0));
  if (E[0]) await setHunted(u.side, E[0].id);
}
function supCharBox(u, box) {
  if (!charAct || !u) return;
  darkHandBox(u, box);
  const S = supOf(u.side);
  if (!S) return;
  if (S.k === 'Blasphemous Mesa' && srIsWl(u) && !charAct.mesaUsed) {
    const g = frG(u.side, 'od');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost';
    b.textContent = 'Blasphemous Mesa (Draw Event): spend 1 Dark Power for an extra spell';
    b.disabled = (+g.dark || 0) < 1;
    b.onclick = async () => {
      charAct.mesaUsed = true;
      charAct.mesa = true;
      await frSet(u.side, 'od', { dark: (+g.dark || 0) - 1 });
      toast('Blasphemous Mesa: one extra spell this activation (not the same one).');
      render();
    };
    box.appendChild(b);
  }
}
async function supApplyBloom(u) {
  const B = supBloom(u);
  if (!B) return;
  let units = state.units;
  if (B.rules || B.label)
    units = units.map(x =>
      x.id === u.id ? grantU(x, B.label || "Warlord's Bloom (" + B.rules.join(', ') + ')', B.rules || []) : x
    );
  if (B.heal)
    units = units.map(x =>
      x.id === u.id && canHeal(x)
        ? Object.assign({}, x, { wounds: Math.max(0, (x.wounds || 0) - B.heal) })
        : x
    );
  await putState({ units, lastText: (state.lastText || '') + " Warlord's Bloom Effect: " + B.t + '.' });
}
function glimApply() {
  if (!cb || !(cb.type === 'clash' || cb.type === 'impact')) return;
  const A = base(cb.att);
  if (!A) return;
  let n = glimmerN(A);
  if (!n) return;
  let used = 0;
  for (const g of cb.groups || [])
    for (const r of g.rolls || []) {
      if (n <= 0) break;
      if (!r.hit) {
        r.hit = true;
        r.glim = true;
        g.hits = (g.hits || 0) + 1;
        n--;
        used++;
      }
    }
  if (used) {
    cb.glim = used;
    state.sup = supMemo(A.side, { glR: srRnd() });
    putState({ sup: state.sup }).catch(() => {});
    toast('Glimmers of a Golden Age: ' + used + ' failed hit' + (used > 1 ? 's' : '') + ' become hits.');
  }
}
function totAdd(m) {
  Object.entries(m).forEach(([s, v]) => {
    if (supK(s) === 'Tricks of the Trade' && supMem(s).pool)
      state.sup = supMemo(s, { pool: totPool(s).concat([v]) });
  });
}
function supTrackers(side, box, mine) {
  const S = supOf(side);
  if (!S) return;
  if (S.k === 'Field Studies') {
    const n = fsTok(side);
    box.append(
      frRow(
        'Observation tokens: ' + n + ' / 4',
        mine
          ? abBtn(
              'Spend 1 (Practitioner: roll 1 extra die, pick any result)',
              () => putState({ sup: supMemo(side, { fs: n - 1 }) }),
              'ab-tog'
            )
          : null
      )
    );
    if (mine && n >= 3) {
      const L = (state.units || []).filter(u => u.side === side && srAlive(u) && u.type !== 'monster');
      const sel = bEl('select', { className: 'tf-in' });
      sel.setAttribute('aria-label', 'Field Studies target');
      L.forEach(u => sel.append(bEl('option', { value: u.id, textContent: u.short || u.name })));
      box.append(
        frRow(
          'Spend 3 (on your last card): loses Broken, heals 5:',
          sel,
          abBtn(
            'Spend 3',
            () =>
              putState({
                sup: supMemo(side, { fs: n - 3 }),
                units: state.units.map(x =>
                  x.id === sel.value
                    ? Object.assign({}, x, {
                        effects: (x.effects || []).filter(e => e !== 'Broken'),
                        wounds: canHeal(x) ? Math.max(0, (x.wounds || 0) - 5) : x.wounds
                      })
                    : x
                )
              }),
            'ab-tog'
          )
        )
      );
    }
    box.append(
      ptext(
        'Spending 2 to stop a Strain Expression’s Decay is offered on the regiment when it uses Strain Expression. A token is added automatically whenever a regiment is destroyed.'
      )
    );
  }
  if (S.k === 'Tricks of the Trade') {
    const P = totPool(side);
    if (!supMem(side).pool) {
      if (mine)
        box.append(
          frRow(
            'Influence Pool:',
            abBtn(
              'Roll the Influence Pool (5 dice)',
              () => putState({ sup: supMemo(side, { pool: Array.from({ length: 5 }, d6) }) }),
              'ab-tog'
            )
          )
        );
    } else {
      const r = frRow(
        'Influence Pool (click a die to spend it instead of rolling; not for Reinforcement or Supremacy rolls):'
      );
      P.forEach((v, i) => {
        const b = abBtn(
          String(v),
          () => {
            const q = P.slice();
            q.splice(i, 1);
            putState({ sup: supMemo(side, { pool: q }) });
            toast('Influence die ' + v + ' spent: use ' + v + ' as that roll’s result.');
          },
          'ab-sq'
        );
        if (!mine) b.disabled = true;
        r.append(b);
      });
      if (!P.length) r.append(bEl('span', { textContent: 'empty' }));
      box.append(r);
      box.append(ptext('Your unmodified Supremacy roll is added to the pool each round.'));
    }
  }
}
