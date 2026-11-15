/*
 * Faction choices on activation
 *
 * The choices a faction's rules offer the active regiment (tokens to spend, Chants, Rituals, Forged
 * effects and so on). One long function, frOptions0, builds the list for every faction.
 *
 * In this file: frOptions(), frOptions0()
 */

/* options shown during an activation */
function frOptions(u) {
  return frOptions0(u).concat(srOptions(u)).concat(supOptions(u));
}

function frOptions0(u) {
  const out = [];
  if (!u || !act || act.id !== u.id) return out;
  const f = frFac(u),
    fresh = !act.actions.length && !act.cur,
    add = (label, fn, why, cls) => out.push({ label, fn, why, cls });
  if (
    f === 'Yoroni' &&
    act.frIdeal === 'Sui' &&
    hasGrant(base(u.id), 'Ideal Card: Sui') &&
    Array.isArray(u.mods) &&
    !act.suiDone
  ) {
    const cur = u.suiCmd || u.mods[0],
      alive = [...new Set(u.mods.slice(0, regTot(u) - lostOf(u)))].filter(t => t !== cur && CMDR[t]);
    if (alive.length) {
      out.push({ head: 'Sui: take the Command rules of another stand in the regiment' });
      alive.forEach(t =>
        add(t + ': ' + CMDR[t].t, async () => {
          act.suiDone = true;
          await putState({
            units: state.units.map(x => (x.id === u.id ? suiSwap(x, t) : x)),
            lastTitle: N(u.side) + ' · Sui',
            lastText: (u.short || u.name) + ' uses the ' + t + ' Command rules until the end of the round.'
          });
        })
      );
      add('Keep its own Command rules', () => {
        act.suiDone = true;
        render();
      });
    }
  }
  if (
    f === 'Yoroni' &&
    fresh &&
    !act.entering &&
    (u.abilities || []).some(a => a[0] === 'Monstrous Inspiration') &&
    !act.monIns
  ) {
    const mine = (u.temp || []).filter(g => /^Ideal Card: /.test(g.src)),
      F = srFriends(u).filter(x => srNear(x, u, 8) && x.type !== 'marker');
    if (mine.length && F.length) {
      out.push({
        head: 'Monstrous Inspiration (Draw Event): share one Ideal Card effect with a friendly regiment within 8″'
      });
      mine.forEach(g => {
        const k = g.src.replace('Ideal Card: ', '');
        F.forEach(x =>
          add(
            k + ' (' + IDEAL[k][0] + ') to ' + (x.short || x.name),
            async () => {
              act.monIns = true;
              await putState({
                units: state.units.map(y =>
                  y.id === x.id
                    ? grantU(
                        y,
                        'Ideal Card: ' + k + ' (Monstrous Inspiration)',
                        IDEAL[k][1],
                        IDEAL[k][2] || null
                      )
                    : y
                ),
                lastTitle: N(u.side) + ' · Monstrous Inspiration',
                lastText:
                  (x.short || x.name) + ' gains the ' + k + ' Ideal Card effect until the end of the round.'
              });
            },
            hasGrant(x, 'Ideal Card: ' + k) || hasGrant(x, 'Ideal Card: ' + k + ' (Monstrous Inspiration)')
              ? 'Already has it'
              : ''
          )
        );
      });
    } else
      out.push({
        head:
          'Monstrous Inspiration: ' +
          (mine.length ? 'no friendly regiment within 8″' : 'no Ideal Card effect on it to share yet')
      });
  }
  if (
    f === 'Yoroni' &&
    fresh &&
    !act.entering &&
    (u.abilities || []).some(a => a[0] === 'Whispered Illusion') &&
    !fxHas(u, /^Whispered Illusion/)
  ) {
    out.push({ head: 'Whispered Illusion (Draw Event): choose one until the end of the round' });
    add(
      'Phantom Onslaught: enemies charging it test Resolve (pass −1″ Charge; fail no Shock and −2 Impact)',
      () =>
        grant(
          u.id,
          'Whispered Illusion: Phantom Onslaught',
          [],
          null,
          'Whispered Illusion: Phantom Onslaught'
        )
    );
    add('Veil of Doubt: enemies clashing with it test Resolve (−1 Attacks; fail also loses Inspired)', () =>
      grant(u.id, 'Whispered Illusion: Veil of Doubt', [], null, 'Whispered Illusion: Veil of Doubt')
    );
  }
  if (offOn(u, 'thegn') && !u.thegnTactic) {
    out.push({ head: 'Thegn: choose the Tribal Tactic it is always under' });
    Object.keys(TACTICS).forEach(t =>
      add(t + ' (' + TACTICS[t].join(', ') + ')', () =>
        putState({
          units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { thegnTactic: t }) : x)),
          lastTitle: N(u.side) + ' · ' + (u.short || u.name),
          lastText: 'Thegn: always under ' + t + '.'
        })
      )
    );
  }
  if (f === 'Old Dominion' && !act.entering) {
    const m = memOf(u);
    if (m && odTierU(u, 'dark') >= 2 && animate(u))
      add(
        'Memories of Old as a Draw Event: ' +
          m.text +
          (offOn(u, 'cenotaph') ? ' (Dark Cenotaph: +1 Dark Power)' : ''),
        () =>
          grant(
            u.id,
            'Memories of Old',
            m.rules,
            null,
            'Memories of Old (Draw Event, Dark Power Tier II): ' +
              m.text +
              (offOn(u, 'cenotaph') ? '. Dark Cenotaph adds 1 Dark Power token.' : ''),
            offOn(u, 'cenotaph')
              ? { fr: frPatch(u.side, 'od', { dark: (+frG(u.side, 'od').dark || 0) + 1 }) }
              : null
          ),
        hasGrant(u, 'Memories of Old')
          ? 'Already used this round'
          : !fresh
            ? 'Only before the first action'
            : ''
      );
  }
  if (f === "W'adrhŭn" && !act.entering) {
    const g = frG(u.side, 'wa'),
      seq = (g.seq || []).slice(),
      own = wadCult(u);
    /* Adaptability: the player targets the marker */
    if (act.adaptPend) {
      const M = wadAdaptTargets(u);
      if (!M.length) act.adaptPend = false;
      else {
        out.push({ head: 'Adaptability: destroy a non-friendly Objective Marker within 6″' });
        M.forEach(m =>
          add((m.short || m.name) + ' (' + polyDist(corners(u), corners(m)).toFixed(1) + '″)', async () => {
            act.adaptPend = false;
            await putState({
              units: state.units.map(x =>
                x.id === m.id
                  ? Object.assign({}, x, {
                      onTable: false,
                      destroyed: true,
                      destroyedRound: state.round,
                      destroyedBy: u.side,
                      status: 'Destroyed'
                    })
                  : x
              ),
              lastTitle: N(u.side) + ' · Adaptability',
              lastText: (m.short || m.name) + ' is destroyed.'
            });
            toast('Adaptability: ' + (m.short || m.name) + ' is destroyed.');
          })
        );
      }
    }
    /* History: the player decides whether the Unsung markers return as Famine */
    if (act.histPend) {
      const N0 = act.histPend;
      out.push({
        head: 'History (once per round): any of the ' + N0 + ' Unsung Chant Markers may return as Famine'
      });
      for (let n = N0; n >= 1; n--)
        add('Return ' + n + ' as Famine Chant Marker' + (n > 1 ? 's' : ''), async () => {
          act.histPend = 0;
          await frSet(u.side, 'wa', {
            seq: (frG(u.side, 'wa').seq || []).concat(Array.from({ length: n }, () => 'Famine')).slice(0, 3),
            histR: state.round
          });
          toast(
            'History: ' + n + ' Famine Chant Marker' + (n > 1 ? 's return' : ' returns') + ' to the Sequence.'
          );
        });
      add('Leave them Unsung', () => {
        act.histPend = 0;
        render();
      });
    }
    if (!act.frMarker)
      out.push({ head: 'Add this activation’s Chant Marker' + (own ? ' (its cult: ' + own + ')' : '') });
    if (!act.frMarker)
      Object.keys(CULTS).forEach(c =>
        add(
          c,
          () => {
            act.frMarker = true;
            const s = seq.concat([c]);
            frSet(
              u.side,
              'wa',
              { seq: s.slice(-3) },
              {
                lastTitle: N(u.side) + ' · War Chant',
                lastText: 'Chant Marker: ' + c + (s.length > 3 ? ' (replaces the oldest)' : '')
              }
            );
          },
          '',
          own === c ? 'pri' : ''
        )
      );
    if (
      act.frMarker &&
      !act.frMarker2 &&
      (srDrum(u) || (u.abilities || []).some(a => /Aberration/.test(a[0])))
    ) {
      const dr = srDrum(u);
      out.push({
        head: 'Add a second Chant Marker (' + (dr ? 'Drum Beat' : 'Aberration: its own cult') + ')'
      });
      Object.keys(CULTS)
        .filter(c => dr || c === own)
        .forEach(c =>
          add(
            c,
            () => {
              act.frMarker2 = true;
              const s2 = (frG(u.side, 'wa').seq || []).concat([c]);
              frSet(
                u.side,
                'wa',
                { seq: s2.slice(-3) },
                { lastTitle: N(u.side) + ' · War Chant', lastText: 'Second Chant Marker: ' + c }
              );
            },
            '',
            own === c ? 'pri' : ''
          )
        );
    }
    if (seq.length === 3) {
      const cnt = c => seq.filter(x => x === c).length,
        cq = cnt('Conquest');
      Object.keys(CULTS).forEach(c => {
        const ok = c === 'Conquest' ? cq >= 2 : cnt(c) + cq >= 2;
        if (!ok) return;
        if (/^Chosen of /.test(frBase(u)) && own && c !== own) return;
        const C = CULTS[c];
        add(
          'Chant the Battlecry: ' + c + ' (' + C[0] + ')',
          async () => {
            const ok2 = await grant(
              u.id,
              'Chant: ' + c,
              C[1] ? [C[1]] : [],
              c === 'Conquest' ? { E: 2 } : null,
              'Chants the Battlecry of ' + c + ': ' + C[0]
            );
            if (ok2) {
              const CB = srChantBonus(u.id);
              if (CB && CB.units)
                await putState({
                  units: CB.units,
                  lastText:
                    (state.lastText || '') +
                    (CB.notes.length ? ' Chant bonus: ' + CB.notes.join(', ') + '.' : '')
                });
              {
                const SC = supOnChant(base(u.id), c);
                if (SC.notes.length)
                  await putState({
                    units: SC.units,
                    lastText: (state.lastText || '') + ' ' + SC.notes.join('; ') + '.'
                  });
              }
              {
                const next = await wadOnChant(u.id, c, seq);
                await frSet(u.side, 'wa', next.length ? { seq: next, histR: state.round } : { seq: [] });
              }
            }
          },
          rh(u.rules, 'Swarm')
            ? 'Swarm: it cannot Chant'
            : hasGrant(u, 'Chant: ' + c)
              ? 'Already chanted'
              : !fresh
                ? 'Only before the first action'
                : ''
        );
      });
    }
  }
  if (f === 'Sorcerer Kings' && hasDraw(u, /^Elemental Conduit/)) {
    const g = frG(u.side, 'sk'),
      rc = skRitualCourt(u.side),
      myC = (frRoles(u).find(x => /^Court of/.test(x)) || '').replace('Court of ', ''),
      conf = skConfluence(u.side);
    add(
      'Elemental Conduit: +1 Ritual Marker',
      () => {
        act.frConduit = true;
        frSet(
          u.side,
          'sk',
          { rm: (+g.rm || 0) + 1 },
          {
            lastTitle: N(u.side) + ' · Ritual',
            lastText: 'Elemental Conduit adds a Ritual Marker to ' + (g.ritual || 'the Ritual') + '.'
          }
        );
      },
      !g.ritual
        ? 'No Ritual is being prepared (see Faction rules)'
        : act.frConduit
          ? 'Already used'
          : rc && myC && rc !== myC && !conf
            ? 'The Ritual is of the Court of ' + rc + ' (only with Elemental Confluence, a Maharajah Warlord)'
            : ''
    );
  }
  if (f === 'Yoroni' && !act.frIdeal) {
    const ck0 = act.card && yCard(act.card) ? cardIdeal(act.card) : null,
      ofuda = ck0 === 'Mu' && upgOf(u, /Ofuda/),
      ck = ofuda ? null : ck0;
    out.push({
      head: ofuda
        ? 'Ofuda: the Mu Ideal Card may give the effect of another Ideal Card'
        : ck
          ? 'Activated by the ' + ck + ' Ideal Card'
          : 'Which Ideal Card activated it?'
    });
    (ck ? [ck] : Object.keys(IDEAL)).forEach(k => {
      const match = yMatch(u, k) || ofuda;
      add(
        k + (match ? ' · ' + IDEAL[k][0] : ' · no match, no effect'),
        () => yApply(u, k),
        hasGrant(u, 'Ideal Card: ' + k) ? 'Already gained from this card this round' : '',
        match ? 'pri' : ''
      );
    });
  }
  if (f === 'Weaver Courts' && fresh && !act.entering && !act.frBloom) {
    /* Wild Spirit (Gift): the Bloom may also spend Seed Markers of friendly regiments within 12″ */
    const donors =
      u.charName && upgOf(u, /Wild Spirit/)
        ? all()
            .filter(
              x =>
                x.side === u.side &&
                x.id !== u.id &&
                x.onTable &&
                !x.destroyed &&
                (+x.seeds || 0) > 0 &&
                polyDist(corners(u), corners(x)) <= 12
            )
            .sort((a, b) => (+b.seeds || 0) - (+a.seeds || 0))
        : [];
    const own = +u.seeds || 0,
      s = own + donors.reduce((a, x) => a + (+x.seeds || 0), 0),
      g = frG(u.side, 'wc');
    const spend = n => {
      const take = {};
      let left = n - Math.min(n, own);
      take[u.id] = Math.min(n, own);
      donors.forEach(x => {
        const k = Math.min(left, +x.seeds || 0);
        if (k) take[x.id] = k;
        left -= k;
      });
      return take;
    };
    [
      [1, 'Command Stand +2 Attacks (and Barrage +2)'],
      [2, "the Warlord's Bloom effect"],
      [3, 'the ' + (seasonNow(u.side) || 'current Season') + ' Court role']
    ].forEach(([n, t]) =>
      add(
        'Bloom (' + n + ' Seed' + (n > 1 ? 's' : '') + '): ' + t,
        async () => {
          act.frBloom = true;
          const br = n === 1 && hasRule(u, /^Barrage/) ? ['Barrage (+2)'] : [];
          const take = spend(n);
          await putState({
            units: state.units.map(x => {
              const y = take[x.id] ? Object.assign({}, x, { seeds: (+x.seeds || 0) - take[x.id] }) : x;
              return x.id === u.id ? grantU(y, 'Bloom: ' + t, br, null) : y;
            }),
            lastTitle: N(u.side) + ' · Bloom',
            lastText:
              'Bloom, spending ' +
              n +
              ' Seed Marker' +
              (n > 1 ? 's' : '') +
              ': ' +
              t +
              (n === 1 ? ' (apply the Command Stand Attacks yourself)' : '') +
              '.'
          });
          await srAfterBloom(u, n);
          if (n === 2) await supApplyBloom(u);
        },
        s < n
          ? 'Needs ' +
              n +
              ' Seed Marker' +
              (n > 1 ? 's' : '') +
              (donors.length ? ' (Wild Spirit: ' + s + ' in reach)' : '')
          : ''
      )
    );
  }
  if (f === 'Spires' && !act.entering && srStrain(u)) {
    const S = srStrain(u);
    add(
      'Strain Expression: ' + S[0] + ' (' + (S[1].join(', ') || S[2]) + '; Decay)',
      async () => {
        act.frDecay = true;
        await grant(
          u.id,
          'Strain: ' + S[0],
          S[1],
          S[3] || null,
          'Strain Expression, ' +
            S[0] +
            ': ' +
            S[1].concat(S[2] ? [S[2]] : []).join(', ') +
            '. Decay at the end of the activation.'
        );
        await srAfterStrain(u);
        if (supK(u.side) === 'Ruthless Competence' && /Infantry/.test(u.cls || ''))
          await grant(u.id, 'March +1 (Ruthless Competence)', []);
      },
      act.frDecay ? 'Already used' : !fresh ? 'Only before the first action' : ''
    );
  }
  if (f === 'Dweghom' && !act.entering) {
    const g = frG(u.side, 'dw'),
      ep = +g.ep || 0,
      F = FORGED[frBase(u)];
    const F2 =
      F && frBase(u) === 'Hellbringer Drake' && upgOf(u, /Hellbringer Sorcerer/)
        ? F.concat([
            [
              'Barrage +4 (twice; Armor Piercing stays at most 2)',
              3,
              ['Barrage (+4)', 'Armor Piercing (+1)']
            ],
            [
              'Barrage +6 (three times; Armor Piercing stays at most 2)',
              5,
              ['Barrage (+6)', 'Armor Piercing (+1)']
            ]
          ])
        : F;
    if (F2 && !act.frForged)
      F2.forEach(([t, cost, rules, stats, note, heal]) =>
        add(
          'Forged by the Elements (' + cost + '): ' + t,
          async () => {
            act.frForged = true;
            const fr = frPatch(u.side, 'dw', { ep: ep - cost });
            await putState({
              fr,
              units: state.units.map(x => {
                if (x.id !== u.id) return x;
                let y = grantU(x, 'Forged: ' + t, rules, stats);
                if (heal) y = Object.assign({}, y, { wounds: Math.max(0, (+y.wounds || 0) - heal) });
                if (!hasGrant(y, 'Awakened')) y = grantU(y, 'Awakened', awakenRules(y));
                return y;
              }),
              lastTitle: N(u.side) + ' · Forged by the Elements',
              lastText:
                t + (note ? ' (' + note + ')' : '') + '; Awakened. Elemental Power ' + (ep - cost) + '.'
            });
          },
          ep < cost ? 'Needs ' + cost + ' Elemental Power' : ''
        )
      );
    /* Runeforged Plate (Relic): Draw Event, spend 1 or 2 Elemental Power for +2 or +4 Attacks on the character */
    if (u.charName && upgOf(u, /Runeforged Plate/) && fresh && !act.rfPlate)
      [1, 2].forEach(n =>
        add(
          'Runeforged Plate (' +
            n +
            ' Elemental Power): the ' +
            u.charName +
            ' +' +
            2 * n +
            ' Attacks this round',
          async () => {
            act.rfPlate = true;
            await putState({
              fr: frPatch(u.side, 'dw', { ep: ep - n }),
              units: state.units.map(x =>
                x.id === u.id ? grantU(x, 'Runeforged Plate (+' + 2 * n + ' Attacks)', []) : x
              ),
              lastTitle: N(u.side) + ' · Runeforged Plate',
              lastText: 'The ' + u.charName + ' gains +' + 2 * n + ' Attacks until the end of the round.'
            });
          },
          ep < n ? 'Needs ' + n + ' Elemental Power' : ''
        )
      );
    if (!hasGrant(u, 'Awakened'))
      out.push({
        label: 'Awaken (from an ability)',
        fn: () => awaken(u.id, 'ability'),
        why: '',
        cls: 'ghost',
        kind: 'any'
      });
  }
  return out;
}
