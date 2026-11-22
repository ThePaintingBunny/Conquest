/*
 * Army builder: the page
 *
 * Draws the whole army builder. One long function, armyBuilder.
 *
 * In this file: armyBuilder()
 */

function armyBuilder(add, mk, onUse, useLabel) {
  wlFix();
  bldSave();
  const box = bEl('div', { className: 'rev ab' });
  const f0 = bldFac();
  // header: faction and summary
  const top = bEl('div', { className: 'ab-top' });
  const fs = bEl('select', { className: 'ab-sel ab-fac' });
  fs.setAttribute('aria-label', 'Faction');
  fs.appendChild(bEl('option', { value: '', textContent: 'Choose a faction…' }));
  ENCY.forEach(f => fs.appendChild(bEl('option', { value: f.name, textContent: f.name })));
  fs.value = bld.fac;
  fs.onchange = () => {
    bld = { fac: fs.value, wbs: [], warlord: 0 };
    abPick = bld.fac ? { wb: 'new' } : null;
    abRe();
  };
  if (bld.wbs.length) fs.title = 'Changing faction clears this army';
  top.append(
    bEl('div', { className: 'ab-title' }, [
      bEl('h3', { textContent: 'Army builder' }),
      bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Faction' }), fs])
    ])
  );
  /* Spires: the army is dedicated to one Sect when the list is made */
  if (bld.fac === 'Spires') {
    const ss = bEl('select', { className: 'ab-sel ab-sect' });
    ss.setAttribute('aria-label', 'Sect');
    ss.appendChild(bEl('option', { value: '', textContent: 'Choose a Sect…' }));
    SECTS.forEach(n => ss.appendChild(bEl('option', { value: n, textContent: n })));
    ss.value = bld.sect || '';
    ss.onchange = () => {
      bld.sect = ss.value || undefined;
      abRe();
    };
    const SD = {
      Underspire:
        'Violent Delirium: Drone regiments can Heal while Broken and gain Indomitable equal to their Resolve bonus from Stands; Drone and Clone regiments gain Regeneration (+2). Abomination (Just Desserts): Regeneration (2).',
      Directorate:
        'Lobotomytic Override: once per round, on drawing a Command Card, set it aside face down and activate the next card first, then put the first on the top or bottom of the Command Stack. Abomination (Just Desserts): +2 March.',
      'Sovereign Lineage':
        'Magnanimity: Husk regiments gain Inspired and Aimed Shot while they Clash or Volley an enemy below starting strength. Abomination (Just Desserts): Hardened (1).'
    };
    top.lastChild.append(
      bEl('label', { className: 'ab-lab' }, [bEl('span', { textContent: 'Sect' }), ss]),
      bEl('p', {
        className: 'ab-sect-d',
        textContent: bld.sect
          ? SD[bld.sect]
          : 'Every Spires army is dedicated to one Sect; it gives the army its Sect ability.'
      })
    );
  }
  if (f0) {
    const probs = bldProblems(),
      nReg = bld.wbs.reduce((a, w) => a + w.regs.length, 0);
    const sum = bEl('div', { className: 'ab-sum' });
    sum.append(
      bEl('div', { className: 'ab-total' }, [
        bEl('strong', { textContent: String(bldTotal()) }),
        bEl('span', { textContent: ' pts' })
      ]),
      bEl('div', {
        className: 'ab-meta',
        textContent: `${bld.wbs.length} warband${bld.wbs.length === 1 ? '' : 's'} · ${nReg} regiment${nReg === 1 ? '' : 's'}`
      }),
      abChip(
        probs.length ? probs.length + ' issue' + (probs.length === 1 ? '' : 's') : '✓ Legal army',
        probs.length ? 'ab-bad' : 'ab-ok'
      )
    );
    top.append(sum);
  }
  box.append(top);
  {
    const AL = armyList();
    if (AL.length) {
      const r = bEl('div', { className: 'ab-row ab-load' });
      const sel = bEl('select', { className: 'ab-sel' });
      sel.setAttribute('aria-label', 'Saved army');
      AL.forEach((a, i) =>
        sel.appendChild(
          bEl('option', {
            value: String(i),
            textContent:
              a.name +
              ' · ' +
              (a.fac || '') +
              (a.bld && a.bld.wbs
                ? ' · ' + a.bld.wbs.length + ' warband' + (a.bld.wbs.length === 1 ? '' : 's')
                : '')
          })
        )
      );
      r.append(
        bEl('span', { className: 'ab-note', textContent: 'Load a saved army' }),
        sel,
        abBtn(
          'Load',
          () => {
            const a = armyList()[+sel.value];
            if (!a) return;
            bld = JSON.parse(JSON.stringify(a.bld));
            abPick = null;
            abRe();
            toast('Loaded “' + a.name + '”.');
          },
          'ab-ghost'
        )
      );
      box.append(r);
    }
  }
  const f = f0;
  if (!f) {
    box.append(
      bEl('p', {
        className: 'ab-intro',
        textContent:
          'Pick a faction to start. Every character leads a warband of up to 4 regiments: any number of Mainstay choices, at most 2 Restricted, and at least as many Mainstay as Restricted. The character joins one regiment of its own type.'
      })
    );
    add(box);
    try {
      abEnhance(box);
    } catch (e) {
      console.error(e);
    }
    return;
  }
  const chars = f.units.filter(u => u.kind === 'char' && u.pts != null);
  let mig = false;
  bld.wbs.forEach(w => {
    const c = bldUnit(w.char);
    if (!c || !wbChoices(c, w).some(q => q.modular)) return;
    w.regs = w.regs.map(r => {
      if (r.unit && MODULAR[r.unit]) {
        mig = true;
        return {
          modular: { cmd: r.unit, counts: { [r.unit]: Math.max(2, +r.stands || 2) } },
          custom: r.custom || []
        };
      }
      return r;
    });
  });
  if (mig) bldSave();
  bld.wbs.forEach((w, wi) => {
    const c = bldUnit(w.char);
    const card = bEl('section', { className: 'ab-wb' });
    card.setAttribute('aria-label', 'Warband ' + (wi + 1));
    if (!c) return;
    const R = wbRules(c, w),
      choices = wbChoices(c, w),
      isWL = bld.warlord === wi;
    const head = bEl('div', { className: 'ab-wbh' });
    const hl = bEl('div', { className: 'ab-wbt' });
    hl.append(
      bEl('span', { className: 'ab-kick', textContent: 'Warband ' + (wi + 1) }),
      bEl('h4', { textContent: c.name }),
      bEl('div', {
        className: 'ab-meta',
        textContent: [[c.cls, c.type].filter(Boolean).join(' ') + ' character', c.pts + ' pts'].join(' · ')
      })
    );
    const WR = wlRule(c),
      mustOther =
        !WR.must &&
        bld.wbs.some(x => {
          const y = bldUnit(x.char);
          return y && wlRule(y).must;
        });
    const wlb = abBtn(
      WR.no ? 'Can\u2019t be Warlord' : isWL ? '★ Warlord' : '☆ Make Warlord',
      () => {
        if (WR.no || mustOther) return;
        bld.warlord = wi;
        if (bld.ally === wi) bld.ally = null;
        abRe();
      },
      'ab-tog' + (isWL ? ' on' : '') + (WR.no ? ' ab-off' : '')
    );
    wlb.setAttribute('aria-pressed', String(isWL));
    if (WR.no || mustOther || WR.must) {
      wlb.disabled = true;
      wlb.title = WR.no
        ? WR.why
        : WR.must
          ? WR.why
          : 'Your ' + bldUnit(bld.wbs[bld.warlord].char).name + ' must be the Warlord.';
    }
    hl.append(wlb);
    /* Hundred Kingdoms: Dynastic Ally */
    if (bld.fac === 'Hundred Kingdoms' && !isWL) {
      const why = allyWhy(wi),
        isAl = allyIdx() === wi;
      const ab = abBtn(
        isAl ? '♛ Dynastic Ally' : '♔ Make Dynastic Ally',
        () => {
          if (why && !isAl) return;
          bld.ally = isAl ? null : wi;
          abRe();
        },
        'ab-tog' + (isAl ? ' on' : '') + (why && !isAl ? ' ab-off' : '')
      );
      ab.setAttribute('aria-pressed', String(isAl));
      ab.title = isAl
        ? 'Uses its Supremacy Ability as if it were the Warlord (one Activated Supremacy per phase). Click to remove.'
        : why || 'A second character that uses its own Supremacy Ability as if it were the Warlord';
      if (why && !isAl) ab.disabled = true;
      hl.append(ab);
    }
    /* Hundred Kingdoms: the Priory Commander's Order */
    if (prioryOf(c)) {
      const sel = bEl('select', { className: 'tf-in' });
      sel.setAttribute('aria-label', 'Order');
      sel.append(bEl('option', { value: '', textContent: 'choose…' }));
      PRIORY.forEach(k =>
        sel.append(bEl('option', { value: k, textContent: 'Order of the ' + k, selected: w.order === k }))
      );
      sel.onchange = () => {
        w.order = sel.value || null;
        abRe();
      };
      const lab = bEl('label', { className: 'ab-wlnote', textContent: 'Order: ' });
      lab.title =
        'Crimson Tower: Brutal Impact (2) and Terrifying (1); Mainstay Order of the Crimson Tower; Restricted Ashen Dawn, Sealed Temple, Sword, Penitents and Martyrs of St Lazarus, Trebuchet; Supremacy Tactical Superiority. Sealed Temple: +1 Attacks and Impact (+1); Mainstay Order of the Sealed Temple, Martyrs and Penitents of St Lazarus; Restricted Ashen Dawn, Crimson Tower; Supremacy Relentless Protectors.';
      lab.append(sel);
      hl.append(lab);
    }
    /* Weaver Courts: the Taosidhe's or Seanchas Sidhe's Court */
    if (wcCourtChoices(c)) {
      const sel = bEl('select', { className: 'tf-in' });
      sel.setAttribute('aria-label', 'Seasonal Court');
      sel.append(bEl('option', { value: '', textContent: 'choose…' }));
      wcCourtChoices(c).forEach(k =>
        sel.append(bEl('option', { value: k, textContent: 'Court of ' + k, selected: w.court === k }))
      );
      sel.onchange = () => {
        w.court = sel.value || null;
        abRe();
      };
      const lab = bEl('label', { className: 'ab-wlnote', textContent: 'Court: ' });
      lab.title =
        bld.fac === 'Sorcerer Kings'
          ? 'Sorcerous Patronage: the character gains its Court’s role, spells and Rituals; non-Monster Elementals of its Court become Mainstay, and the Mortals of its warband join its Court.'
          : c.name === 'Seanchas Sidhe'
            ? 'The Seanchas Sidhe belongs to the Court of Summer or of Winter and knows all of that Court’s spells. As Warlord, the army’s regiments follow its Court.'
            : 'The Taosidhe belongs to one Seasonal Court. As Warlord, the army’s regiments follow its Court.';
      lab.append(sel);
      hl.append(lab);
    }
    /* W'adrhŭn: the character's Cult */
    if (bld.fac === "W'adrhŭn") {
      const fixed = wadFixedCult(c);
      if (fixed) hl.append(bEl('div', { className: 'ab-wlnote', textContent: 'Cult of ' + fixed }));
      else {
        const sel = bEl('select', { className: 'tf-in' });
        sel.setAttribute('aria-label', 'Cult');
        sel.append(bEl('option', { value: '', textContent: 'choose…' }));
        WAD_CULTS.filter(k => k !== 'Conquest' || isWL || w.cult === 'Conquest').forEach(k =>
          sel.append(bEl('option', { value: k, textContent: 'Cult of ' + k, selected: w.cult === k }))
        );
        sel.onchange = () => {
          w.cult = sel.value || null;
          abRe();
        };
        const lab = bEl('label', { className: 'ab-wlnote', textContent: 'Follows: ' });
        lab.title =
          'Every W’adrhŭn character follows a Cult: its warband adds that Cult’s Chant Markers, it may take up to two Chosen of that Cult as a Restricted choice, and it and its regiment gain the Cult’s Battlefield Role. Only the Warlord may follow Conquest.';
        lab.append(sel);
        hl.append(lab);
      }
    }
    {
      const PB = (c.rules || []).some(r => /^Personal Bodyguard/.test(r))
        ? 'Personal Bodyguard'
        : (c.rules || []).some(r => /^Personal Entourage/.test(r))
          ? 'Personal Entourage'
          : '';
      if (PB) {
        const opts = w.regs
          .map((r, ri) => ({ r, ri }))
          .filter(
            ({ r }) =>
              r.unit &&
              (PB === 'Personal Bodyguard'
                ? /Infantry/.test((bldUnit(r.unit) || {}).type || '')
                : /Household Knights/.test(r.unit))
          );
        const sel = bEl('select', { className: 'tf-in' });
        sel.setAttribute('aria-label', PB);
        sel.append(bEl('option', { value: '', textContent: 'none' }));
        opts.forEach(({ r, ri }) =>
          sel.append(
            bEl('option', {
              value: String(ri),
              textContent: r.unit + ' (regiment ' + (ri + 1) + ')',
              selected: w.pbReg === ri
            })
          )
        );
        sel.onchange = () => {
          w.pbReg = sel.value === '' ? null : +sel.value;
          abRe();
        };
        const lab = bEl('label', { className: 'ab-wlnote', textContent: PB + ' (gains [Veteran]): ' });
        lab.append(sel);
        hl.append(lab);
      }
    }
    if (WR.must)
      hl.append(bEl('div', { className: 'ab-wlnote', textContent: 'Must be the Warlord · one per army' }));
    else if (WR.creeds)
      hl.append(
        bEl('div', {
          className: 'ab-wlnote',
          textContent: 'Warlord only in ' + WR.creeds.join(' or ') + ' Creed armies'
        })
      );
    const hr = bEl('div', { className: 'ab-rr' });
    hr.append(
      bEl('span', { className: 'ab-pts ab-pts-l', textContent: wbPts(w) + ' pts' }),
      abBtn('Details', () => enDetail(c, f.name), 'ab-ghost ab-small ab-keep'),
      abBtn(
        'Change character',
        () => {
          abPick = { wb: wi, chr: true };
          abDraw();
        },
        'ab-ghost ab-small'
      ),
      abBtn(
        abArm === 'wb' + wi ? 'Click again to remove' : 'Remove',
        () =>
          abArmed('wb' + wi, () => {
            bld.wbs.splice(wi, 1);
            if (bld.warlord > wi) bld.warlord--;
            else if (bld.warlord === wi) bld.warlord = -1;
            if (bld.ally != null) bld.ally = bld.ally > wi ? bld.ally - 1 : bld.ally === wi ? null : bld.ally;
            abRe();
          }),
        'ab-ghost ab-small ab-danger',
        'Remove warband ' + (wi + 1)
      )
    );
    head.append(hl, hr);
    card.append(head);
    if (abPick && abPick.wb === wi && abPick.chr) {
      card.append(
        abCharPicker(
          f,
          chars,
          x => {
            if (x.name !== w.char) {
              w.char = x.name;
              w.regs = [];
              w.joins = null;
              w.custom = [];
            }
            abPick = null;
            abRe();
          },
          'Choose a different character (this clears the warband)'
        )
      );
    }
    const info = bEl('div', { className: 'ab-row ab-lead' });
    if (c.type !== 'Monster' && !R.none) {
      const js = bEl('select', { className: 'ab-sel' });
      js.setAttribute('aria-label', 'Regiment the ' + c.name + ' joins');
      js.appendChild(
        bEl('option', {
          value: '',
          textContent: w.regs.some(r => joinable(w, r))
            ? 'Choose a regiment…'
            : 'Add a ' + c.type + ' regiment first'
        })
      );
      w.regs.forEach((r, ri) => {
        if (joinable(w, r))
          js.appendChild(
            bEl('option', {
              value: String(ri),
              textContent:
                (r.unit || (r.modular ? 'Modular Regiment (' + r.modular.cmd + ')' : '')) +
                ' (regiment ' +
                (ri + 1) +
                ')'
            })
          );
      });
      js.value = w.joins != null ? String(w.joins) : '';
      js.onchange = () => {
        w.joins = js.value === '' ? null : +js.value;
        abRe();
      };
      info.append(
        bEl('label', { className: 'ab-lab ab-inl' }, [
          bEl('span', { textContent: '★ The ' + c.name + ' leads' }),
          js
        ])
      );
    } else
      info.append(
        bEl('span', {
          className: 'ab-note',
          textContent:
            c.type === 'Monster'
              ? 'The ' + c.name + ' fights as its own regiment.'
              : 'No warband: ' + c.warband
        })
      );
    card.append(info);
    const cu = bEl('div', { className: 'ab-row' });
    cu.append(bEl('span', { className: 'ab-lab-t', textContent: 'Character upgrades' }));
    (w.upg || []).forEach(n => {
      const e = upgFind(n);
      const chp = abChip(n + (e ? ' · ' + e[2] + ' pts' : ''), 'ab-chip-u ab-led');
      if (e) chp.title = e[4];
      chp.append(
        abBtn(
          '×',
          () => {
            w.upg = w.upg.filter(x => x !== n);
            abRe();
          },
          'ab-x',
          'Remove ' + n
        )
      );
      cu.append(chp);
    });
    (w.custom || []).forEach((x, i) => {
      const chp = abChip(x.name + ' · ' + x.pts + ' pts', 'ab-chip-u');
      chp.append(
        abBtn(
          '×',
          () => {
            w.custom.splice(i, 1);
            abRe();
          },
          'ab-x',
          'Remove ' + x.name
        )
      );
      cu.append(chp);
    });
    if (charNoUpg(c))
      cu.append(
        bEl('span', { className: 'ab-note', textContent: 'The ' + c.name + ' cannot take upgrades.' })
      );
    else if (!(abPick && abPick.wb === wi && abPick.upg))
      cu.append(
        abBtn(
          (w.upg || []).length || (w.custom || []).length ? 'Change upgrades' : '+ Choose upgrades',
          () => {
            abPick = { wb: wi, upg: true };
            abDraw();
          },
          'ab-ghost ab-small'
        )
      );
    card.append(cu);
    if (abPick && abPick.wb === wi && abPick.upg) card.append(abUpgPicker(f, w, wi));
    const regs = bEl('div', { className: 'ab-regs' });
    w.regs.forEach((r, ri) => regs.append(abRegCard(f, w, wi, r, ri, choices)));
    card.append(regs);
    const full = w.regs.length >= R.allow || R.none;
    /* the wide page adds from the column on the right (abRail); this is how it makes the picker */
    (box._abAdd = box._abAdd || [])[wi] = full ? null : () => abPicker(f, w, wi, choices);
    const open = abPick && abPick.wb === wi && !abPick.chr && !abPick.upg && !full;
    if (open) card.append(abPicker(f, w, wi, choices));
    const row = bEl('div', { className: 'ab-row ab-addrow' });
    if (!open) {
      const b = abBtn(
        full ? (R.none ? 'No warband' : 'Warband full') : '+ Add regiment',
        () => {
          abPick = { wb: wi };
          abDraw();
        },
        'ab-ghost ab-addreg'
      );
      b.disabled = full;
      row.append(b);
    }
    row.append(bEl('span', { className: 'ab-note', textContent: `${w.regs.length} of ${R.allow} regiments` }));
    card.append(row);
    card.append(abIssues(wbProblems(w).concat(upgProblems(w, wi)), 'This warband is legal'));
    box.append(card);
  });
  if (abPick && abPick.wb === 'new')
    box.append(
      abCharPicker(
        f,
        chars,
        x => {
          bld.wbs.push({ char: x.name, regs: [], joins: null, custom: [] });
          if (bld.wbs.length === 1) bld.warlord = -1;
          abPick = { wb: bld.wbs.length - 1 };
          abRe();
        },
        'Choose a character to lead a new warband'
      )
    );
  else
    box.append(
      bEl('div', { className: 'ab-row' }, [
        abBtn(
          '+ Add a warband',
          () => {
            abPick = { wb: 'new' };
            abDraw();
          },
          'ab-ghost ab-wide'
        )
      ])
    );
  const probs = bldProblems();
  const foot = bEl('div', { className: 'ab-foot' });
  if (probs.length)
    foot.append(
      abIssues(probs.slice(0, 6).concat(probs.length > 6 ? ['…and ' + (probs.length - 6) + ' more'] : []), '')
    );
  /* the main menu's page has nothing to field the army into, so it has no Use button */
  if (bld.wbs.length && useLabel) {
    const sandbox = state && state.mode === 'test';
    const ub = mk(probs.length && sandbox ? useLabel + ' anyway' : useLabel, () => {
      if (probs.length && !sandbox) {
        toast('Fix the problems above first: an illegal army cannot be fielded.');
        return;
      }
      const L = bldToList();
      if (!L || !L.units.length) {
        toast('Add at least one regiment.');
        return;
      }
      onUse(L);
    });
    if (probs.length && !sandbox) {
      ub.disabled = true;
      ub.title = 'An illegal army cannot be fielded. Fix the problems above.';
    }
    foot.append(ub);
  }
  foot.append(armyStore());
  foot.append(
    bEl('p', {
      className: 'ab-note',
      textContent:
        'Officer and upgrade effects beyond stat changes are listed on the regiment for you to apply. Spellcasters know their spells automatically; casters that choose a school or court pick it when casting.'
    })
  );
  box.append(foot);
  add(box);
  try {
    abEnhance(box);
  } catch (e) {
    console.error(e);
  }
}
