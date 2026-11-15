/*
 * Faction trackers panel
 *
 * The strip and panel that show each side's faction trackers. One long function, frBlock, draws the
 * block for every faction.
 *
 * In this file: frSummary(), renderFrStrip(), frOpen, frPanel(), frRow(), frStep(), frBlock()
 */

/* always-visible summary of faction tokens and trackers */
function frSummary(side, f) {
  const g = k => frG(side, k);
  if (f === 'Old Dominion') {
    const o = g('od');
    return [
      'Dark Power: ' + (+o.dark || 0) + ' tokens (Tier ' + ROMAN[odTier(side, 'dark')] + ')',
      'Fallen Pantheon: ' + (+o.pant || 0) + ' tokens (Tier ' + ROMAN[odTier(side, 'pant')] + ')'
    ];
  }
  if (f === 'Nords') {
    const o = g('no');
    return [
      'Tribal Tactic: ' +
        (o.round === (state.round || 1) ? o.tactic + ' (this round)' : o.used ? 'used' : 'available')
    ];
  }
  if (f === "W'adrhŭn") {
    const o = g('wa');
    return ['Chant: ' + ((o.seq || []).join(', ') || 'no markers') + ' (' + (o.seq || []).length + '/3)'];
  }
  if (f === 'Sorcerer Kings') {
    const o = g('sk');
    return [
      o.ritual ? 'Ritual: ' + o.ritual + ' ' + (+o.rm || 0) + '/' + (o.th || 7) : 'No Ritual being prepared'
    ];
  }
  if (f === 'Weaver Courts') {
    const o = g('wc'),
      seeds = (state.units || [])
        .filter(u => u.side === side && !u.destroyed)
        .reduce((a, u) => a + (+u.seeds || 0), 0);
    return [
      (o.season ? 'Season: ' + o.season : 'Season not chosen') +
        ' · ' +
        seeds +
        ' Seed Marker' +
        (seeds === 1 ? '' : 's')
    ];
  }
  if (f === 'Spires') return ['Sect: ' + (spSect(side) || 'not chosen')];
  if (f === 'Dweghom') {
    const o = g('dw');
    return [(dwCreed(side) || 'No Creed') + ' · Elemental Power ' + (+o.ep || 0) + '/10'];
  }
  if (f === 'City States' && stratU({ side, fac: 'City States' }))
    return [
      PS().strategicHeld && side === ME && !SBX() ? 'Strategic Stack: 1 card' : 'Strategic Stack: empty'
    ];
  return [];
}

function renderFrStrip() {
  const el = $('fr-strip');
  if (!el) return;
  el.innerHTML = '';
  const st = state.step || 'activations';
  if (!state || ['setup', 'review'].includes(st)) {
    el.hidden = true;
    return;
  }
  const sides = SBX() ? ['cs', 'nord'] : PVP() ? [ME, other(ME)] : [HU, AI];
  sides.forEach(side =>
    frFacs(side).forEach(f =>
      frSummary(side, f)
        .concat(f === frFacs(side)[0] && supChip(side) ? ['Supremacy: ' + supChip(side)] : [])
        .forEach(t => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = side;
          const who = SBX()
            ? side === 'cs'
              ? 'South'
              : 'North'
            : side === ME
              ? PN(side) || 'You'
              : PN(side) || N(side);
          b.innerHTML = '';
          const bb = document.createElement('b');
          bb.textContent = who + ': ';
          b.append(bb, document.createTextNode(t));
          b.title = 'Open the Faction rules panel';
          b.onclick = () => {
            frOpen = true;
            setTab('game');
            renderTurnbar();
            const d = document.querySelector('#gp-body .fr-panel, #turnbar .fr-panel');
            if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          };
          el.appendChild(b);
        })
    )
  );
  el.hidden = !el.children.length;
}

/* the Faction rules panel: trackers per side */
let frOpen = false;

function frPanel() {
  const d = bEl('details', { className: 'vc fr-panel' });
  d.open = frOpen;
  d.ontoggle = () => {
    frOpen = d.open;
  };
  d.append(bEl('summary', { textContent: 'Faction rules and Supremacy' }));
  let any = false;
  ['cs', 'nord'].forEach(side => {
    const facs = frFacs(side);
    if (!facs.length) return;
    const mine = side === ME || SBX();
    facs.forEach(f => {
      const blk = frBlock(side, f, mine);
      if (!blk) return;
      any = true;
      const h = bEl('div', {
        className: 'en-tag',
        textContent:
          (SBX() ? (side === 'cs' ? 'South' : 'North') : N(side)) + ' · ' + f + (side === ME ? ' (you)' : '')
      });
      h.style.marginTop = '8px';
      d.append(h, blk);
    });
  });
  ['cs', 'nord'].forEach(side =>
    ['', 'ally'].forEach(who => {
      const blk = supBlock(side, side === ME || SBX(), who || undefined);
      if (!blk) return;
      any = true;
      const h = bEl('div', {
        className: 'en-tag',
        textContent:
          (SBX() ? (side === 'cs' ? 'South' : 'North') : N(side)) +
          (who ? ' · Dynastic Ally’s Supremacy Ability' : ' · Supremacy Ability') +
          (side === ME ? ' (you)' : '')
      });
      h.style.marginTop = '8px';
      d.append(h, blk);
    })
  );
  if (!any) d.append(ptext('No faction trackers are needed for the armies on the table.'));
  return d;
}

function frRow(label, ...kids) {
  const r = bEl('div', { className: 'tf-row' });
  if (label) r.append(bEl('span', { className: 'tf-l', textContent: label }));
  kids.forEach(k => k && r.append(k));
  return r;
}

function frStep(side, k, key, val, min, max, label) {
  return abStepper(val, min, max, v => frSet(side, k, { [key]: v }), label);
}

function frBlock(side, f, mine) {
  const box = bEl('div', { className: 'fr-blk' }),
    R = state.round || 1,
    lock = el => {
      if (!mine) el.querySelectorAll('button,select,input').forEach(b => (b.disabled = true));
      return el;
    };
  if (f === 'City States') {
    const eid = (state.units || []).filter(
      u => u.side === side && srAlive(u) && /Eidolon/.test(u.charName || '')
    );
    eid.forEach(u => {
      const cur = cdirOf(u);
      box.append(
        frRow(
          'Combat Directive · ' + (u.short || u.name) + ':',
          ...cdirKeys(u).map(k => {
            const b = abBtn(k, () => cdirSet(u.id, k), 'ab-tog' + (cur === k ? ' on' : ''));
            b.disabled = !!cur;
            return b;
          })
        )
      );
    });
    if (!canStrat(side)) return eid.length ? lock(box) : null;
    box.append(
      ptext(
        'Strategic Stack and Direct Orders are applied automatically: hold a card face down once per round, and Entourage activations count as Strategic Stack activations (Inspired).'
      )
    );
    return box;
  }
  if (f === 'Old Dominion') {
    const g = frG(side, 'od'),
      tD = odTier(side, 'dark'),
      tP = odTier(side, 'pant'),
      s = Math.trunc((odPts(side) - 2000) / 250) * 2;
    {
      const gg = bEl('div', { className: 'od-trk' });
      const a = odGauge(side, 'dark'),
        b2 = odGauge(side, 'pant');
      a.onclick = b2.onclick = null;
      gg.append(a, b2);
      box.append(gg);
    }
    box.append(
      frRow(
        'Change Dark Power tokens:',
        frStep(side, 'od', 'dark', +g.dark || 0, 0, 40, 'Dark Power tokens')
      ),
      frRow(
        'Change Fallen Pantheon tokens:',
        frStep(side, 'od', 'pant', +g.pant || 0, 0, 40, 'Fallen Pantheon tokens')
      )
    );
    box.append(
      ptext(
        'Tiers at ' +
          odPts(side) +
          ' points: II from ' +
          (9 + s) +
          ', III from ' +
          (18 + s) +
          ', IV from ' +
          (23 + s) +
          ' (Dark Power IV only with Obdurate Bone and Stone or Glimmers of a Golden Age).'
      )
    );
    if (g.soma !== R)
      box.append(
        frRow(
          'Blasphemous Soma, round ' + R + ':',
          abBtn('+1 Dark Power', () => frSet(side, 'od', { dark: (+g.dark || 0) + 1, soma: R }), 'ab-tog'),
          abBtn(
            '+1 Fallen Pantheon',
            () => frSet(side, 'od', { pant: (+g.pant || 0) + 1, soma: R }),
            'ab-tog'
          )
        )
      );
    odPendingBox(side, box, g, mine);
    const fxl = [];
    if (tD >= 2) fxl.push('Dark II: regiments may use Memories of Old as a Draw Event');
    if (tD >= 3) fxl.push('Dark III: Animate Vessel regiments are Inspired (applied)');
    if (tD >= 4)
      fxl.push('Dark IV: enemies engaged with your Animate Vessels re-roll successful Morale tests');
    if (tP >= 2)
      fxl.push(
        'Pantheon ' +
          tP +
          ': the Fallen Divinity uses its Tier ' +
          (tP >= 3 ? 'III' : 'II') +
          ' profile (heal ' +
          (tP >= 3 ? 6 : 4) +
          ' on first reaching it)'
      );
    box.append(
      ptext(
        fxl.length
          ? fxl.join(' · ')
          : 'Tier I: no pool effects yet. Memories of Old is available as an action to regiments that have one.'
      )
    );
    return lock(box);
  }
  if (f === 'Nords') {
    const g = frG(side, 'no'),
      wl = (state.units || []).find(u => u.side === side && u.warlord),
      multi = wl && /Jarl|Konungyr/.test(wl.charName || '');
    const row = frRow('Tribal Tactic (once per game, after Supremacy):');
    Object.keys(TACTICS).forEach(t => {
      const b = abBtn(
        (g.tactic === t && g.round === R ? '✓ ' : '') + t,
        async () => {
          const units = state.units.map(u => {
            if (u.side !== side || u.type === 'marker' || frFac(u) !== 'Nords') return u;
            const r = frRoles(u);
            if (!(r.includes('Mortals') || r.includes('Exalted') || u.charName)) return u;
            return grantU(u, 'Tribal Tactic: ' + t, TACTICS[t]);
          });
          await putState({
            units,
            fr: frPatch(side, 'no', { tactic: t, round: R, used: (+g.used || 0) + 1 }),
            lastTitle: N(side) + ' · Tribal Tactics',
            lastText: t + ' for Mortals, Exalted and Characters until the end of the round.'
          });
        },
        'ab-tog' + (g.tactic === t && g.round === R ? ' on' : '')
      );
      b.disabled = g.round === R || (!!g.used && !multi && !SBX());
      row.append(b);
    });
    box.append(
      row,
      ptext(
        g.used
          ? 'Used ' +
              g.used +
              '× (last: ' +
              g.tactic +
              ', round ' +
              g.round +
              ').' +
              (multi ? ' Your Warlord may use Tactics again.' : '')
          : 'Direct Assault!: Relentless Blows · Draw Them In!: Tenacious +1 · Take the Flanks!: Opportunist on Volleys, Fury and a fixed 4 on Charges into flank or rear (apply the last two yourself).'
      )
    );
    box.append(ptext('Prophecy Unfulfilled (+2″ Charge against engaged enemies) is applied automatically.'));
    return lock(box);
  }
  if (f === "W'adrhŭn") {
    const g = frG(side, 'wa'),
      seq = g.seq || [];
    const r = frRow('Chant Sequence:');
    seq.forEach(c => r.append(abChip(c)));
    if (!seq.length) r.append(bEl('span', { className: 'tf-l', textContent: 'empty' }));
    if (seq.length) r.append(abBtn('Clear', () => frSet(side, 'wa', { seq: [] }), 'ab-ghost ab-small'));
    box.append(
      r,
      ptext(
        'Each activation adds a marker (choose it in the activation panel). With 3 markers a regiment may Chant before its first action: Famine Dread, War Cleave +1, Death Deadly Blades, Conquest +2 Evasion. Conquest markers can stand in for another cult.'
      )
    );
    return lock(box);
  }
  if (f === 'Sorcerer Kings') {
    const g = frG(side, 'sk');
    const sel = bEl('select', { className: 'tf-in' });
    sel.setAttribute('aria-label', 'Ritual being prepared');
    sel.append(bEl('option', { value: '', textContent: 'No Ritual being prepared' }));
    Object.entries(RITUALS).forEach(([c, L]) => {
      const og = bEl('optgroup');
      og.label = c;
      L.forEach(([n, t]) =>
        og.append(bEl('option', { value: n, textContent: n + ' (' + t + ')', selected: g.ritual === n }))
      );
      sel.append(og);
    });
    sel.onchange = () => {
      const n = sel.value,
        th = (Object.values(RITUALS)
          .flat()
          .find(x => x[0] === n) || [0, 7])[1],
        dis = n && g.dis !== R;
      frSet(
        side,
        'sk',
        { ritual: n, th, rm: dis ? Math.min(R, 5) : 0, dis: dis ? R : g.dis },
        {
          lastTitle: N(side) + ' · Ritual',
          lastText: n
            ? n +
              ' is Being Prepared' +
              (dis ? '; Elemental Discharge adds ' + Math.min(R, 5) + ' markers.' : '.')
            : 'No Ritual is being prepared.'
        }
      );
    };
    box.append(frRow('Ritual:', sel));
    if (g.ritual) {
      const done = (+g.rm || 0) >= (+g.th || 7);
      box.append(
        frRow(
          'Ritual Markers ' + (+g.rm || 0) + ' / ' + (g.th || 7),
          frStep(side, 'sk', 'rm', +g.rm || 0, 0, 20, 'Ritual Markers'),
          done
            ? abBtn(
                'Resolved: start again',
                () => frSet(side, 'sk', { rm: 0, ritual: '' }),
                'ab-ghost ab-small'
              )
            : null
        )
      );
      if (done)
        box.append(
          ptext(
            'Complete: its Command Card goes into your Command Stack at the start of your next Command Phase.',
            'warn'
          )
        );
    }
    if (
      (state.units || []).some(
        u => u.side === side && (rh(u.rules, 'Fury of the Tempest') || rh(u.rules, 'Eye of the Storm'))
      )
    )
      box.append(
        frRow(
          'Court of Air Ritual card activated in your last draw:',
          abBtn(
            g.airNow ? 'Yes' : 'No',
            () => frSet(side, 'sk', { airNow: !g.airNow }),
            'ab-tog' + (g.airNow ? ' on' : '')
          )
        )
      );
    box.append(
      ptext(
        'Each spell of the Ritual’s Court that is cast, even a failed one, adds 1 marker (applied automatically; Shu’laat adds one more once per activation). Elemental Conduit adds 1 from the activation panel: only for its own Court’s Ritual, unless a Maharajah Warlord gives Elemental Confluence. The first new Ritual each round starts with markers equal to the round (max 5). With Elemental Confluence, a completed Ritual may be followed at once by one of a different Court.'
      )
    );
    return lock(box);
  }
  if (f === 'Weaver Courts') {
    const g = frG(side, 'wc');
    const r = frRow(
      g.season
        ? 'Season: ' + g.season + ' (' + SEASONFX[g.season][0] + ')'
        : 'Start the Cycle of Seasons with:'
    );
    if (!g.season)
      SEASONS.forEach(s =>
        r.append(
          abBtn(
            s,
            () =>
              putState({
                fr: frPatch(side, 'wc', { season: s, round: R }),
                units: frSeasonUnits(state.units, side, s),
                lastTitle: N(side) + ' · Cycle of Seasons',
                lastText: 'The Cycle starts in ' + s + '.'
              }),
            'ab-tog'
          )
        )
      );
    else
      r.append(
        abBtn(
          'Change',
          () =>
            putState({
              fr: frPatch(side, 'wc', { season: null }),
              units: state.units.map(x => (x.side === side ? ungrantU(x, src => /^Season: /.test(src)) : x))
            }),
          'ab-ghost ab-small'
        )
      );
    box.append(r);
    const wlC = wcCourtOf(supWl(side));
    let cs;
    if (wlC) cs = bEl('span', { textContent: 'Court of ' + wlC + ' (from the Warlord)' });
    else {
      cs = bEl('select', { className: 'tf-in' });
      cs.setAttribute('aria-label', "Warlord's Seasonal Court");
      SEASONS.forEach(s =>
        cs.append(
          bEl('option', { value: s, textContent: 'Court of ' + s, selected: (g.court || 'Spring') === s })
        )
      );
      cs.onchange = () => frSet(side, 'wc', { court: cs.value });
    }
    box.append(
      frRow("Warlord's Seasonal Court:", cs),
      ptext(
        'The Season advances at the end of every round and its effect is applied to regiments of the matching Court. Regiments gain a Seed Marker after a Clash or Volley (max 3) and spend them on Bloom in the activation panel.'
      )
    );
    return lock(box);
  }
  if (f === 'Spires') {
    const g = frG(side, 'sp');
    (state.units || [])
      .filter(u => u.side === side && privOk(u))
      .forEach(u =>
        box.append(
          frRow(
            'Privileged Observer · ' + (u.short || u.name) + ':',
            abBtn(
              'Make it Medium (before the first Reinforcements)',
              () =>
                putState({
                  units: state.units.map(x =>
                    x.id === u.id ? Object.assign({}, x, { cls: x.cls.replace(/Light/, 'Medium') }) : x
                  ),
                  lastTitle: N(side) + ' · Privileged Observer',
                  lastText: (u.short || u.name) + ' becomes a Medium regiment.'
                }),
              'ab-tog'
            )
          )
        )
      );
    const sect = spSect(side),
      fromList = !!spSectList(side);
    const r = frRow('Sect:');
    if (fromList) r.append(bEl('strong', { textContent: sect + ' (from the army list)' }));
    else
      SECTS.forEach(s =>
        r.append(
          abBtn(
            (sect === s ? '✓ ' : '') + s,
            () => frSet(side, 'sp', { sect: s }),
            'ab-tog' + (sect === s ? ' on' : '')
          )
        )
      );
    box.append(r);
    box.append(
      ptext(
        sect === 'Underspire'
          ? 'Underspire: Drone and Clone regiments heal 2 at the start of each activation (applied); Drones may Heal while Broken and have Indomitable from their size.'
          : sect === 'Directorate'
            ? 'Directorate: once per round set the drawn card aside and draw the next; apply it with your Command Stack.'
            : sect === 'Sovereign Lineage'
              ? 'Sovereign Lineage: Husk regiments gain Inspired and Aimed Shot while attacking an enemy below starting strength.'
              : 'Pick the army’s Sect.'
      )
    );
    box.append(
      ptext(
        'Strain Expression is offered in the activation panel; Decay wounds are applied at the end of that activation.'
      )
    );
    return lock(box);
  }
  if (f === 'Dweghom') {
    const g = frG(side, 'dw'),
      cr = dwCreed(side);
    const r = frRow('Creed:');
    ['Ardent', 'Tempered', 'Clan', 'Ardent and Tempered'].forEach(c =>
      r.append(
        abBtn(
          (cr === c ? '✓ ' : '') + c,
          () => frSet(side, 'dw', { creed: c }),
          'ab-tog' + (cr === c ? ' on' : '')
        )
      )
    );
    box.append(
      r,
      frRow(
        'Elemental Power ' + (+g.ep || 0) + ' / 10',
        frStep(side, 'dw', 'ep', +g.ep || 0, 0, 10, 'Elemental Power')
      ),
      ptext(
        (/Ardent/.test(cr)
          ? 'Ardent: regiments are Awakened after a successful Charge (applied); all regiments have Pathfinders. '
          : '') +
          (/Tempered/.test(cr)
            ? 'Tempered: casting an Elemental spell adds a marker (applied automatically); casters may spend 2 per +1 Wizard (adjust the pool yourself). '
            : '') +
          (cr === 'Clan'
            ? 'Clan: Awakened Clan regiments gain Oblivious and Iron Discipline (applied). '
            : '') +
          'Forged regiments add 1 Elemental Power at the end of an activation without Forged by the Elements (applied). Awakened regiments cannot become Broken. Dweghom regiments cannot be Shattered.'
      )
    );
    return lock(box);
  }
  if (f === 'Yoroni') {
    box.append(
      ptext(
        'Ideal Cards: choose which card activated a regiment in the activation panel; a matching card grants its effect until the end of the round. Yoroni regiments cannot make Entourage activations.'
      )
    );
    return box;
  }
  if (f === 'Hundred Kingdoms') {
    box.append(
      ptext(
        'Relentless Drills: Veteran Infantry regiments with 5 or more stands count as Inspired (applied).'
      )
    );
    return box;
  }
  return null;
}
