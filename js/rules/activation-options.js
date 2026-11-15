/*
 * Draw Event choices from special rules
 *
 * The choices a regiment's own rules offer when it activates: Sorcerer Kings forms, Tidecaller, Wild
 * Hunters, Fires of the Descent and many more. One long function, srOptions, builds the list.
 *
 * In this file: SKFORMS, srOptions()
 */

/* ---- Sorcerer Kings forms, Tidecaller, Wild Hunters, Fires of the Descent: Draw Events chosen on activation ---- */
const SKFORMS = {
  'Wavebreaker Form': [
    ['Impact (+2)', ['Impact (+2)']],
    ['Brutal Impact (+1)', ['Brutal Impact (+1)']]
  ],
  'Waveborne Form': [
    ['Wizard (+2)', ['Wizard (+2)']],
    ['Barrage (+2)', ['Barrage (+2)']]
  ],
  'Stormqueen Form': [
    ['Impact (+6)', ['Impact (+6)']],
    ['+4 Attacks', [], { A: 4 }]
  ],
  'Arcane Tide Form': [
    ['a free Spellcasting Action', [], null, 'freeCast'],
    ['+4″ spell range', [], null, 'range4']
  ],
  Tidecaller: [
    ['Water Elementals within 8″ count as in Water', [], null, 'aura'],
    ['engaged enemies count as in Water', [], null, 'engaged']
  ]
};

function srOptions(u) {
  const out = [];
  if (!u || !act || act.id !== u.id) return out;
  const fresh = !act.actions.length && !act.cur,
    add = (label, fn, why, cls) => out.push({ label, fn, why, cls });
  /* ---- Wiped Out in Garrison Terrain: occupy the emptied building (free; the activation still ends) ---- */
  if (act.wipedOcc && act.id === u.id && !act.occupyT) {
    const t = terrainOf().find(q => tId(q) === act.wipedOcc);
    if (!t || all().some(o => o.garrison === act.wipedOcc && !o.destroyed)) act.wipedOcc = null;
    else {
      out.push({
        head:
          'Wiped out in Garrison: occupy the ' + tInfo(t).name.toLowerCase() + '? (free; its activation ends)'
      });
      add('Occupy it', () => {
        const G = geom(u),
          from = { x: u.x, y: u.y, facing: u.facing || 0, files: G.files };
        act.occupyT = act.wipedOcc;
        act.wipedOcc = null;
        Object.assign(act.pose, { x: t.x, y: t.y });
        act.actions.push({
          type: 'occupy',
          free: true,
          from,
          to: { x: t.x, y: t.y, facing: u.facing || 0, files: G.files },
          building: tInfo(t).name
        });
        toast(
          'It occupies the ' +
            tInfo(t).name.toLowerCase() +
            ' (+' +
            tInfo(t).def +
            ' Defense). End the activation.'
        );
        render();
      });
      add('Stay outside', () => {
        act.wipedOcc = null;
        render();
      });
    }
  }
  /* ---- Like Gods Among Men: the player picks the Infantry regiment that heals ---- */
  if (act.lgam && act.id === u.id) {
    const L = lgamTargets(u);
    if (!L.length) act.lgam = false;
    else {
      out.push({ head: 'Like Gods Among Men: a friendly Infantry regiment within 8″ heals 4 wounds' });
      L.forEach(x =>
        add(
          (x.short || x.name) + ' (' + (+x.wounds || 0) + ' wound' + (+x.wounds === 1 ? '' : 's') + ')',
          async () => {
            act.lgam = false;
            const n = Math.min(4, +x.wounds || 0);
            await putState({
              units: state.units.map(y =>
                y.id === x.id ? Object.assign({}, y, { wounds: (+y.wounds || 0) - n }) : y
              ),
              lastTitle: N(u.side) + ' · Like Gods Among Men',
              lastText: (x.short || x.name) + ' heals ' + n + ' wound' + (n === 1 ? '' : 's') + '.'
            });
            toast('Like Gods Among Men: ' + (x.short || x.name) + ' heals ' + n + '.');
          }
        )
      );
    }
  }
  /* ---- Lessons of the Jotun War (Nords Mastery): once per battle, when its regiment activates, one Tribal Tactic until
     the end of the round ---- */
  if (
    u.charName &&
    upgOf(u, /Lessons of the Jotun War/) &&
    !u.lessonsUsed &&
    !act.entering &&
    !act.actions.length
  ) {
    out.push({
      head: 'Lessons of the Jotun War (once per battle): a Tribal Tactic for this regiment this round'
    });
    Object.keys(TACTICS).forEach(t =>
      add(t + ' (' + TACTICS[t].join(', ') + ')', () =>
        putState({
          units: state.units.map(x =>
            x.id === u.id
              ? Object.assign(grantU(x, 'Tribal Tactic: ' + t + ' (Lessons of the Jotun War)', TACTICS[t]), {
                  lessonsUsed: true
                })
              : x
          ),
          lastTitle: N(u.side) + ' · Lessons of the Jotun War',
          lastText: (u.short || u.name) + ' is under ' + t + ' until the end of the round.'
        })
      )
    );
  }
  /* ---- Dancing Scimitar (Sorcerer Kings): Draw Event, 3 automatic AP (2) Hits on an enemy regiment or Objective
     Marker within 12″, no Morale ---- */
  if (
    u.charName &&
    upgOf(u, /Dancing Scimitar/) &&
    !act.scimUsed &&
    !act.entering &&
    u.onTable &&
    !act.actions.length &&
    !act.cur
  ) {
    const T = all()
      .filter(e => e.side !== u.side && e.onTable && !e.destroyed)
      .map(e => [e, polyDist(corners(u), corners(e))])
      .filter(([, d]) => d <= 12)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5);
    if (T.length) {
      out.push({ head: 'Dancing Scimitar (Draw Event): 3 Hits, AP (2), no Morale' });
      T.forEach(([e, d]) =>
        add((e.short || e.name) + ' (' + d.toFixed(1) + '″)', async () => {
          act.scimUsed = true;
          const x0 = base(e.id),
            H = spellHitRes(x0, 3, 2, true),
            AL = allocate(x0, H.w);
          await putState({
            units: state.units.map(x =>
              x.id === e.id
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
                          destroyedBy: isMarker(x) ? u.side : x.destroyedBy
                        }
                      : {}
                  )
                : x
            ),
            lastTitle: N(u.side) + ' · Dancing Scimitar',
            lastText: (e.short || e.name) + ': ' + H.txt + (AL.dead ? '; destroyed' : '') + '.'
          });
          toast(
            'Dancing Scimitar on ' +
              (e.short || e.name) +
              ': ' +
              H.w +
              ' wound' +
              (H.w === 1 ? '' : 's') +
              '.'
          );
        })
      );
    }
  }
  /* ---- Kiannun Stalker (Weaver Courts Officer): each activation, 1 wound on an enemy within 12″ ---- */
  if (offOn(u, 'stalker') && !act.stalkUsed && !act.entering && u.onTable) {
    const T = all()
      .filter(e => e.side !== u.side && e.onTable && !e.destroyed && !isMarker(e))
      .map(e => [e, polyDist(corners(u), corners(e))])
      .filter(([, d]) => d <= 12)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5);
    if (T.length) {
      out.push({ head: 'Kiannun Stalker: 1 wound on an enemy within 12″ (no Morale)' });
      T.forEach(([e, d]) =>
        add(e.short || e.name + ' (' + d.toFixed(1) + '″)', async () => {
          act.stalkUsed = true;
          const x0 = base(e.id),
            AL = allocate(x0, 1);
          await putState({
            units: state.units.map(x =>
              x.id === e.id
                ? Object.assign(
                    {},
                    x,
                    { wounds: AL.w, auxWounds: AL.aw },
                    AL.dead
                      ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
                      : {}
                  )
                : x
            ),
            lastTitle: N(u.side) + ' · Kiannun Stalker',
            lastText: (e.short || e.name) + ' suffers 1 wound' + (AL.dead ? ' and is destroyed' : '') + '.'
          });
          toast('Kiannun Stalker: ' + (e.short || e.name) + ' suffers 1 wound.');
        })
      );
    }
  }
  /* ---- Seedbearer (Mhor, Rhun, Taosidhe and Seanchas Sidhe): a Combat or Out-of-Combat Action giving a friendly
     regiment within 12″ a Seed Marker ---- */
  if (
    u.charName &&
    /^(Mhor Sidhe|Rhun Sidhe|Taosidhe|Seanchas Sidhe)$/.test(u.charName) &&
    !act.entering &&
    !act.cur &&
    u.onTable &&
    act.actions.filter(a => !a.free).length < 2 &&
    !act.actions.some(a => a.type === 'seed')
  ) {
    const F = all()
      .filter(
        x =>
          x.side === u.side &&
          x.onTable &&
          !x.destroyed &&
          x.type !== 'marker' &&
          frFac(x) === 'Weaver Courts' &&
          (+x.seeds || 0) < 3 &&
          (x.id === u.id || polyDist(corners(u), corners(x)) <= 12)
      )
      .slice(0, 6);
    if (F.length) {
      out.push({ head: 'Seedbearer (an action): a Seed Marker to a friendly regiment within 12″' });
      F.forEach(x =>
        add(
          (x.id === u.id ? 'Itself' : x.short || x.name) +
            ' (' +
            (+x.seeds || 0) +
            ' → ' +
            ((+x.seeds || 0) + 1) +
            ')',
          async () => {
            const G = geom(u);
            act.actions.push({
              type: 'seed',
              from: { x: u.x, y: u.y, facing: u.facing || 0, files: G.files },
              to: { x: u.x, y: u.y, facing: u.facing || 0, files: G.files },
              target: x.id
            });
            await putState({
              units: state.units.map(y =>
                y.id === x.id ? Object.assign({}, y, { seeds: Math.min(3, (+y.seeds || 0) + 1) }) : y
              ),
              lastTitle: N(u.side) + ' · Seedbearer',
              lastText: (x.short || x.name) + ' gains a Seed Marker.'
            });
            render();
          }
        )
      );
    }
  }
  /* ---- Initiative (City States Mastery): from the Strategic Stack, a free Charge before Draw Events ---- */
  if (
    fresh &&
    !act.entering &&
    upgOf(u, /Initiative/) &&
    !act.initUsed &&
    (act.source === 'strategic' || (act.source === 'entourage' && ordersU(u))) &&
    !(u.effects || []).includes('Broken') &&
    !engaged(u).length
  )
    add('Initiative: a free Charge now (it does not count towards its actions)', () => {
      act.initUsed = true;
      startAction('charge');
      if (act.cur && act.cur.type === 'charge') act.cur.free = true;
    });
  /* ---- Old Dominion character upgrades that spend Dark Power tokens ---- */
  if (u.charName && frFac(u) === 'Old Dominion') {
    const tok = +frG(u.side, 'od').dark || 0;
    if (fresh && !act.entering && upgOf(u, /Unholy Sacrament/) && !fxHas(u, /^Unholy Sacrament/))
      add(
        'Unholy Sacrament: spend 1 Dark Power token for Priest (+3) on the ' +
          u.charName +
          '’s first spell this round',
        async () => {
          await putState({
            fr: frPatch(u.side, 'od', { dark: tok - 1 }),
            units: state.units.map(x =>
              x.id === u.id ? grantU(x, 'Unholy Sacrament (Priest +3, first spell)', []) : x
            ),
            lastTitle: N(u.side) + ' · Unholy Sacrament',
            lastText:
              'The ' + u.charName + ' spends 1 Dark Power token: Priest (+3) for its first spell this round.'
          });
        },
        tok < 1 ? 'No Dark Power tokens' : ''
      );
    if (
      upgOf(u, /Soul Reaper/) &&
      engaged(u).length &&
      !(u.temp || []).some(g => /^Soul Reaper/.test(g.src))
    ) {
      out.push({
        head:
          'Soul Reaper: spend Dark Power tokens for +1 Attack each on the ' +
          u.charName +
          ' (until the end of the round)'
      });
      [1, 2, 3]
        .filter(n => n <= tok)
        .forEach(n =>
          add(
            'Soul Reaper: +' +
              n +
              ' Attack' +
              (n > 1 ? 's' : '') +
              ' (' +
              n +
              ' token' +
              (n > 1 ? 's' : '') +
              ')',
            async () => {
              await putState({
                fr: frPatch(u.side, 'od', { dark: tok - n }),
                units: state.units.map(x =>
                  x.id === u.id ? grantU(x, 'Soul Reaper (+' + n + ' Attacks)', []) : x
                ),
                lastTitle: N(u.side) + ' · Soul Reaper',
                lastText:
                  'The ' +
                  u.charName +
                  ' spends ' +
                  n +
                  ' Dark Power token' +
                  (n > 1 ? 's' : '') +
                  ' for +' +
                  n +
                  ' Attacks this round.'
              });
            }
          )
        );
    }
  }
  /* ---- Hundred Kingdoms character upgrades ---- */
  if (u.charName) {
    if (
      fresh &&
      !act.entering &&
      upgOf(u, /Elysian Fragment/) &&
      !base(u.id).elysianUsed &&
      frRoles(u).includes('Theist')
    )
      add(
        'Elysian Fragment (once per game): the regiment gains Cleave (3) until the end of the round',
        async () => {
          await putState({
            units: state.units.map(x =>
              x.id === u.id
                ? Object.assign(grantU(x, 'Elysian Fragment (Cleave 3)', ['Cleave (3)']), {
                    elysianUsed: true
                  })
                : x
            ),
            lastTitle: N(u.side) + ' · Elysian Fragment',
            lastText: (u.short || u.name) + ' gains Cleave (3) until the end of the round.'
          });
        }
      );
    if (upgOf(u, /Lathander Sacrifice/) && !base(u.id).lathUsed && !act.lath && engaged(u).length)
      add(
        'Lathander Sacrifice (once per game): one extra Clash this activation; the regiment is destroyed when the activation ends',
        async () => {
          act.lath = true;
          await putState({
            units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { lathUsed: true }) : x)),
            lastTitle: N(u.side) + ' · Lathander Sacrifice',
            lastText:
              (u.short || u.name) + ' may Clash once more this activation, and is destroyed when it ends.'
          });
        }
      );
  }
  /* ---- character upgrades with Draw Events ---- */
  if (fresh && !act.entering && u.charName) {
    /* Inscription of Lighter Alloys (City States): Mobility */
    const LA = 'Mobility (Inscription of Lighter Alloys)';
    if (upgOf(u, /Lighter Alloys/) && /Infantry/.test(u.cls || '') && !hasGrant(base(u.id), LA))
      add(
        'Mobility (Inscription of Lighter Alloys): +3 March, −1 Defense, loses Phalanx and Shield until the end of the round',
        async () => {
          const x0 = base(u.id),
            dD = (+x0.stats.D || 0) > 1 ? -1 : 0;
          await putState({
            units: state.units.map(x =>
              x.id === u.id
                ? grantLoseU(x, LA, [], Object.assign({ M: 3 }, dD ? { D: dD } : {}), [
                    /^Phalanx\b/,
                    /^Shield\b/
                  ])
                : x
            ),
            lastTitle: N(u.side) + ' · ' + (u.short || u.name),
            lastText:
              'Mobility: +3 March and −1 Defense, without Phalanx and Shield until the end of the round.'
          });
        }
      );
    /* Aristia (City States banner): a friendly non-Monster regiment within 8″ Charges at March +5″ this round */
    if (upgOf(u, /Aristia/) && !act.aristia) {
      const T = all().filter(
        t =>
          t.side === u.side &&
          t.onTable &&
          !t.destroyed &&
          t.type !== 'monster' &&
          t.type !== 'marker' &&
          polyDist(corners(u), corners(t)) <= 8
      );
      if (T.length) {
        out.push({
          head: 'Aristia: a friendly non-Monster regiment within 8″ Charges at its March +5″ until the end of the round (ignores Phalanx)'
        });
        T.forEach(t =>
          add('Aristia on ' + (t.short || t.name) + (t.id === u.id ? ' (this regiment)' : ''), async () => {
            act.aristia = true;
            await grant(
              t.id,
              'Aristia (Charge distance = March +5″)',
              [],
              null,
              'Aristia: ' + (t.short || t.name) + ' Charges at March +5″ this round.'
            );
          })
        );
      }
    }
    /* Bloody Sacrifice (Beads of Death, Occultists Charm): 2 wounds, +1 March until the end of the first action */
    if ((upgOf(u, /Beads of Death/) || upgOf(u, /Occultists Charm/)) && !act.bloody)
      add(
        'Bloody Sacrifice: the regiment suffers 2 wounds (no Morale Test) for +1 March until the end of its first action',
        async () => {
          act.bloody = true;
          const units = state.units.map(x => {
            if (x.id !== u.id) return x;
            const AL = allocate(x, 2);
            return Object.assign(
              {},
              x,
              { wounds: AL.w, auxWounds: AL.aw },
              AL.dead
                ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
                : {}
            );
          });
          await putState({
            units,
            lastTitle: N(u.side) + ' · Bloody Sacrifice',
            lastText:
              (u.short || u.name) +
              ' suffers 2 wounds (no Morale Test) and adds +1 March until the end of its first action.'
          });
        }
      );
  }
  Object.entries(SKFORMS).forEach(([rule, ch]) => {
    if (!rh(u.rules, rule)) return;
    out.push({ head: rule + ' (choose one on activation)' });
    ch.forEach(([lab, rules, stats, flag]) =>
      add(
        lab,
        async () => {
          act.srForm = rule;
          if (flag === 'freeCast') act.freeCast = true;
          if (flag === 'range4') act.spellRange4 = true;
          const src =
            rule === 'Tidecaller'
              ? flag === 'aura'
                ? 'Tidecaller: Water Elementals within 8″ count as in Water'
                : 'Tidecaller: engaged enemies count as in Water'
              : rule + ': ' + lab;
          await grant(u.id, src, rules || [], stats || null, rule + ': ' + lab);
        },
        act.srForm === rule ? 'Already chosen' : !fresh ? 'Only before the first action' : ''
      )
    );
  });
  if (rh(u.rules, 'Wild Hunters') && !act.entering && act.frBloom && !act.srWild) {
    out.push({ head: 'Wild Hunters (with the Bloom)' });
    [['Deadly Blades'], ['Cleave (+1)'], ['Flurry']].forEach(([r]) =>
      add(r, async () => {
        act.srWild = true;
        await grant(
          u.id,
          'Wild Hunters: ' + r,
          [r],
          null,
          'Wild Hunters: ' + r + ' until the end of the round'
        );
      })
    );
  }
  if (rh(u.rules, 'Fires of the Descent') && !act.entering && hasGrant(u, 'Awakened') && !act.srFires) {
    const C = srFriends(u).filter(x => srNear(x, u, 8));
    if (C.length) {
      out.push({
        head: 'Fires of the Descent (Draw Event): a friendly regiment within 8″ gains Relentless Blows'
      });
      C.slice(0, 6).forEach(x =>
        add(
          x.short || x.name,
          async () => {
            act.srFires = true;
            await grant(
              x.id,
              'Fires of the Descent (Relentless Blows)',
              ['Relentless Blows'],
              null,
              'Fires of the Descent: ' + (x.short || x.name) + ' gains Relentless Blows this round'
            );
          },
          !fresh ? 'Only before the first action' : ''
        )
      );
    }
  }
  return out;
}
