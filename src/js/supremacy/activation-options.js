/*
 * Supremacy choices on activation
 *
 * The choices Supremacy Abilities offer the active regiment. One long function, supOptions, builds the
 * list.
 *
 * In this file: supOptions(), supWlIdeal(), supSpell(), supIdealMatch()
 */

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
