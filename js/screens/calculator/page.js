/*
 * Combat calculator: the page
 *
 * Draws the calculator and its results: the two regiments as cards with the fight between them, then the verdict,
 * the wounds each side deals per step, what decides the fight, and the full numbers folded away.
 *
 * In this file: calcSeg(), calcCard(), calcVerdict(), calcR1(), calcPage()
 */

/* a row of choices (who charges, contact, rounds) */
function calcSeg(label, cur, opts, fn) {
  const g = bEl('div', { className: 'grp cc-seg' });
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  opts.forEach(([v, t]) => {
    const b = bEl('button', { type: 'button', textContent: t });
    b.setAttribute('aria-pressed', String(String(cur) === String(v)));
    b.onclick = () => {
      fn(v);
      calc.res = null;
      render();
    };
    g.append(b);
  });
  return g;
}

/* one regiment: its form, its effects, and its profile */
function calcCard(k) {
  const box = bEl('section', { className: 'cc-side cc-card ' + k.toLowerCase() });
  box.append(bEl('h3', { className: 'mh-k', textContent: 'Regiment ' + k }));
  box.append(
    qaForm(
      calc[k],
      sp => {
        calc[k] = sp;
        calc.res = null;
        render();
      },
      true
    )
  );
  const u = calc[k].unit ? calcBuild(k, k === 'A' ? 'cs' : 'nord') : null;
  if (!u) {
    box.append(bEl('p', { className: 'hint', textContent: 'Choose a faction and a regiment.' }));
    return box;
  }
  box.append(enStats(u, true));
  {
    const rl = (u.rules || []).concat(u.charName ? (u.charRules || []).map(r => r + ' (character)') : []);
    if (rl.length) {
      const ch = bEl('div', { className: 'chips' });
      rl.forEach(r => ch.append(chip(r, '', frFac(u))));
      box.append(ch);
    }
  }
  const F = (calc.fx[k] = calc.fx[k] || {});
  const r = bEl('div', { className: 'tf-row qa-row' });
  r.append(bEl('span', { className: 'qa-l', textContent: 'Effects' }));
  CALC_FX.forEach(([key, label, fk]) => {
    if (key === 'Sup' && !calc[k].warlord) return;
    if (key === 'Strat' && frFac(u) !== 'City States') {
      F.strat = false;
      return;
    }
    const on = !!F[fk];
    const b = abBtn(
      (on ? '✓ ' : '') + label,
      () => {
        F[fk] = !on;
        calc.res = null;
        render();
      },
      'ab-tog' + (on ? ' on' : '')
    );
    b.setAttribute('aria-pressed', String(on));
    if (key === 'Strat')
      b.title =
        'Inspired for the activation, plus Strategic Stack bonuses such as the Andromachos’ Flurry or the Dorilates’ Relentless Blows';
    r.append(b);
  });
  if (frFac(u) === 'Yoroni') {
    const sl = bEl('select', { className: 'tf-in qa-sel' });
    sl.setAttribute('aria-label', 'Ideal Card');
    [['', 'No Ideal Card effect']]
      .concat(Object.keys(IDEAL).map(i => [i, i + ' Ideal Card · ' + IDEAL[i][0]]))
      .forEach(([v, t]) => sl.append(bEl('option', { value: v, textContent: t })));
    sl.value = F.ideal || '';
    sl.onchange = () => {
      F.ideal = sl.value;
      calc.res = null;
      render();
    };
    r.append(sl);
  }
  box.append(r);
  return box;
}

/* the result: who wins, the wounds each side deals per step, and what decides it */
function calcVerdict(inner, R) {
  const F = R.fight,
    uA = calcBuild('A', 'cs'),
    uB = calcBuild('B', 'nord');
  const nm = u => (u.charName ? u.charName + ' + ' : '') + (u.short || u.name);
  const pa = (F.A / F.n) * 100,
    pb = (F.B / F.n) * 100,
    pd = (F.draw / F.n) * 100;
  const box = bEl('section', { className: 'cc-res' });
  /* the verdict */
  {
    const v = bEl('div', { className: 'cc-verdict' });
    const lead = pa >= pb ? 'A' : 'B',
      p = Math.round(Math.max(pa, pb)),
      u = lead === 'A' ? uA : uB,
      o = lead === 'A' ? uB : uA;
    const close = Math.abs(pa - pb) < 10;
    v.append(
      bEl('h3', { className: 'mh-k', textContent: 'Result' }),
      bEl('div', {
        className: 'cc-big ' + lead.toLowerCase(),
        textContent: close && pd < 50 ? 'Too close to call' : pd >= 50 ? 'Most fights go on' : nm(u) + ' win ' + p + '%'
      }),
      bEl('p', {
        className: 'hint',
        textContent:
          (pd >= 50
            ? 'More than half the fights are still going after ' + F.maxR + ' round' + (F.maxR === 1 ? '' : 's') + '. '
            : 'In ' + p + ' of 100 fights ' + nm(o) + ' end destroyed or Shattered. ') +
          'A fight lasts ' +
          F.rounds.toFixed(1) +
          ' rounds on average; ' +
          nm(uA) +
          ' keep ' +
          Math.round(F.leftA * 100) +
          '% of their stands, ' +
          nm(uB) +
          ' ' +
          Math.round(F.leftB * 100) +
          '%.'
      })
    );
    const bar = bEl('div', { className: 'cc-bar' });
    [
      ['a', pa],
      ['d', pd],
      ['b', pb]
    ].forEach(([c, w]) => {
      if (w <= 0) return;
      const sp = bEl('span', { className: c });
      sp.style.width = w + '%';
      bar.append(sp);
    });
    v.append(
      bar,
      bEl('div', { className: 'cc-legend' }, [
        bEl('span', { textContent: 'A wins ' + Math.round(pa) + '%' }),
        bEl('span', { textContent: 'still fighting ' + Math.round(pd) + '%' }),
        bEl('span', { textContent: 'B wins ' + Math.round(pb) + '%' })
      ])
    );
    box.append(v);
  }
  /* wounds per step: each side's average from one attack of each kind */
  {
    const w = bEl('div', { className: 'cc-steps' });
    w.append(bEl('h3', { className: 'mh-k', textContent: 'Wounds per attack (average, Morale included)' }));
    const rows = [
      ['Impacts', R.impA, R.impB],
      ['Clash', R.clashA, R.clashB],
      ['Volley at ' + calc.range + '″', R.volA, R.volB]
    ].filter(([, a, b]) => (a && !a.none) || (b && !b.none));
    const val = r => (r && !r.none ? r.tot : 0);
    const max = Math.max(1, ...rows.map(([, a, b]) => Math.max(val(a), val(b))));
    rows.forEach(([l, a, b]) => {
      const bar = (r, c) => {
        const x = bEl('i', { className: c });
        x.style.width = (val(r) / max) * 100 + '%';
        return x;
      };
      w.append(
        bEl('div', { className: 'cc-step' }, [
          bEl('span', { className: 'cc-sl', textContent: l }),
          bEl('div', { className: 'cc-sa' }, [bEl('b', { textContent: calcR1(val(a)) }), bar(a, 'a')]),
          bEl('div', { className: 'cc-sb' }, [bar(b, 'b'), bEl('b', { textContent: calcR1(val(b)) })])
        ])
      );
    });
    w.append(bEl('p', { className: 'hint', textContent: 'Red: what ' + nm(uA) + ' deal · Blue: what ' + nm(uB) + ' deal' }));
    box.append(w);
  }
  /* what decides it, worked out from the numbers above */
  {
    const n = bEl('div', { className: 'cc-why' });
    n.append(bEl('h3', { className: 'mh-k', textContent: 'What decides it' }));
    const ul = bEl('ul');
    const say = t => ul.append(bEl('li', { textContent: t }));
    const cA = R.clashA && !R.clashA.none ? R.clashA : null,
      cB = R.clashB && !R.clashB.none ? R.clashB : null;
    const imp = calc.charge === 'A' ? R.impA : calc.charge === 'B' ? R.impB : null;
    if (imp && !imp.none && imp.tot > 0.05)
      say(
        'The charge: ' +
          nm(calc.charge === 'A' ? uA : uB) +
          '’ Impacts add ' +
          calcR1(imp.tot) +
          ' wounds before anyone Clashes.'
      );
    if (cA && cB) {
      const big = cA.tot >= cB.tot ? [uA, cA, uB, cB] : [uB, cB, uA, cA];
      say(nm(big[0]) + ' deal more in a Clash: ' + calcR1(big[1].tot) + ' wounds against ' + calcR1(big[3].tot) + '.');
      const mA = cA.tot ? cA.mw / cA.tot : 0,
        mB = cB.tot ? cB.mw / cB.tot : 0;
      const mm = mA >= mB ? [uA, mA] : [uB, mB];
      if (mm[1] >= 0.25)
        say('Morale matters: ' + Math.round(mm[1] * 100) + '% of what ' + nm(mm[0]) + ' deal in a Clash comes from failed Morale tests.');
    }
    const tw = u => (+u.stats.W || 0) * regTot(u) + (u.aux != null && u.auxStats ? +u.auxStats.W || 0 : 0);
    const tA = tw(uA),
      tB = tw(uB);
    if (tA !== tB) say((tA > tB ? nm(uA) : nm(uB)) + ' can take more: ' + Math.max(tA, tB) + ' wounds in total against ' + Math.min(tA, tB) + '.');
    {
      const pA = (qaPts(calc.A) || {}).total || 0,
        pB = (qaPts(calc.B) || {}).total || 0;
      if (pA && pB)
        say(
          pA === pB
            ? 'Both cost ' + pA + ' points.'
            : (pA > pB ? nm(uA) : nm(uB)) + ' cost ' + Math.abs(pA - pB) + ' points more (' + pA + ' against ' + pB + ').'
        );
    }
    n.append(ul);
    const sw = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Swap sides' });
    sw.onclick = () => {
      [calc.A, calc.B] = [calc.B, calc.A];
      [calc.fx.A, calc.fx.B] = [calc.fx.B || {}, calc.fx.A || {}];
      if (calc.charge !== 'none') calc.charge = calc.charge === 'A' ? 'B' : 'A';
      calc.res = null;
      render();
    };
    n.append(sw);
    box.append(n);
  }
  inner.append(box);
}

function calcR1(v) {
  return (Math.round(v * 10) / 10).toFixed(1);
}

function calcPage(inner, head) {
  head(
    'Combat calculator',
    'Two regiments, the game’s own combat rules, rolled thousands of times. Build each side as in the army builder.',
    { label: mmOverlay ? 'Menu' : 'Main menu', fn: () => mmGo(mmOverlay ? 'home' : null) }
  );
  const cols = bEl('div', { className: 'cc-cols cc-three' });
  inner.append(cols);
  /* the fight, between the two cards */
  const set = bEl('section', { className: 'cc-box cc-fight' });
  set.append(bEl('h3', { className: 'mh-k', textContent: 'The fight' }));
  const lab = t => bEl('div', { className: 'cc-l', textContent: t });
  set.append(
    lab('Who charges'),
    calcSeg('Who charges', calc.charge, [['A', 'A charges'], ['B', 'B charges'], ['none', 'No charge']], v => (calc.charge = v)),
    lab('Contact on the defender'),
    calcSeg('Contact on the defender', calc.arc, [['front', 'Front'], ['flank', 'Flank'], ['rear', 'Rear']], v => (calc.arc = v)),
    lab('Rounds of combat'),
    calcSeg('Rounds of combat', calc.rounds || 6, [[1, '1'], [2, '2'], [3, '3'], [6, 'To the end']], v => (calc.rounds = +v))
  );
  {
    const i = bEl('input', {
      type: 'number',
      className: 'tf-in',
      min: '1',
      max: '36',
      step: '1',
      value: String(calc.range)
    });
    i.setAttribute('aria-label', 'Volley range in inches');
    i.onchange = () => {
      calc.range = Math.max(1, Math.min(36, +i.value || 12));
      calc.res = null;
      render();
    };
    set.append(lab('Volley range'), bEl('div', { className: 'row cc-range' }, [i, bEl('span', { className: 'hint', textContent: 'inches' })]));
  }
  const go = bEl('button', {
    type: 'button',
    className: 'btn gold cc-go',
    textContent: calc.busy ? 'Calculating…' : 'Calculate'
  });
  go.disabled = calc.busy;
  go.onclick = calcRun;
  set.append(go);
  if (calc.err) set.append(ptext(calc.err, 'hint'));
  cols.append(calcCard('A'), set, calcCard('B'));
  const R = calc.res;
  if (R && R.fight) calcVerdict(inner, R);
  const full = bEl('details', { className: 'cc-full' });
  full.open = !!calcPage.full;
  full.addEventListener('toggle', () => (calcPage.full = full.open));
  full.append(bEl('summary', { textContent: R ? 'The full numbers' : 'Profiles side by side' }));
  inner.append(full);
  inner = full;
  const uA = calc.A.unit ? calcBuild('A', 'cs') : null,
    uB = calc.B.unit ? calcBuild('B', 'nord') : null;
  if (uA && uB) {
    const box = bEl('div', { className: 'cc-box' });
    box.append(bEl('h3', { textContent: 'Profiles side by side' }));
    const t = bEl('table', { className: 'cc-tbl' });
    const tr = (c, cls) => {
      const r = bEl('tr');
      c.forEach((x, i) =>
        r.append(bEl(i === 0 ? 'th' : 'td', { textContent: String(x), className: (cls && cls[i]) || '' }))
      );
      t.append(r);
    };
    const nm = u => (u.charName ? u.charName + ' + ' : '') + (u.short || u.name);
    tr(['', nm(uA), nm(uB)]);
    const hi = (a, b, low) => {
      a = +a;
      b = +b;
      if (isNaN(a) || isNaN(b) || a === b) return ['', '', ''];
      return low
        ? ['', a < b ? 'win' : '', b < a ? 'win' : '']
        : ['', a > b ? 'win' : '', b > a ? 'win' : ''];
    };
    [
      ['March', 'M'],
      ['Volley', 'V'],
      ['Clash', 'C'],
      ['Attacks', 'A'],
      ['Wounds', 'W'],
      ['Resolve', 'R'],
      ['Defense', 'D'],
      ['Evasion', 'E']
    ].forEach(([l, k]) => {
      const a = uA.stats[k],
        b = uB.stats[k];
      tr([l, a == null ? '–' : a, b == null ? '–' : b], hi(a, b));
    });
    const tw = u => (+u.stats.W || 0) * regTot(u) + (u.aux != null && u.auxStats ? +u.auxStats.W || 0 : 0);
    tr(['Stands', live(uA), live(uB)], hi(live(uA), live(uB)));
    tr(['Wounds in total', tw(uA), tw(uB)], hi(tw(uA), tw(uB)));
    const pA = qaPts(calc.A),
      pB = qaPts(calc.B),
      ps = P =>
        P ? P.total + ' pts' + (P.ch ? ' (' + P.reg + ' regiment + ' + P.ch + ' character)' : '') : '–';
    tr(['Points', ps(pA), ps(pB)], pA && pB ? hi(pA.total, pB.total, true) : ['', '', '']);
    if (pA && pB && pA.total && pB.total)
      tr(
        [
          'Wounds per 100 pts',
          ((tw(uA) / pA.total) * 100).toFixed(1),
          ((tw(uB) / pB.total) * 100).toFixed(1)
        ],
        hi(tw(uA) / pA.total, tw(uB) / pB.total)
      );
    const sr = u =>
      (u.rules || []).concat(u.charName ? (u.charRules || []).map(r => r + ' (character)') : []).join(', ') ||
      '–';
    tr(['Special rules', sr(uA), sr(uB)]);
    box.append(t);
    inner.append(box);
  }
  if (!R) return;
  {
    const box = bEl('div', { className: 'cc-box' });
    box.append(bEl('h3', { textContent: 'Wound calculator · average per attack' }));
    box.append(
      ptext(
        'Each line is one attack rolled 1,000 times with the game’s own rules: hits, Defense saves, then Morale tests (failed Morale tests add wounds).',
        'hint'
      )
    );
    const PT = { A: (qaPts(calc.A) || {}).total || 0, B: (qaPts(calc.B) || {}).total || 0 };
    const t = bEl('table', { className: 'cc-tbl' });
    const hr = bEl('tr');
    [
      'Attack',
      'Attacks',
      'Hits',
      'Wounds',
      '+ Morale',
      'Total',
      'Max seen',
      'Kills a stand',
      'Total per 100 pts'
    ].forEach(h => hr.append(bEl('th', { textContent: h })));
    t.append(hr);
    const line = (lab, r) => {
      const tr = bEl('tr');
      tr.append(bEl('td', { textContent: lab }));
      const pts = PT[lab[0]] || 0;
      if (!r) {
        tr.append(bEl('td', { colSpan: 8, textContent: '–' }));
      } else if (r.none) {
        tr.append(bEl('td', { colSpan: 8, textContent: r.none }));
      } else
        [
          r.att,
          r.hits.toFixed(1),
          r.w.toFixed(2),
          r.mw.toFixed(2),
          r.tot.toFixed(2),
          r.max,
          Math.round(r.pStand * 100) + '%',
          pts ? ((r.tot / pts) * 100).toFixed(2) : '–'
        ].forEach(v => tr.append(bEl('td', { textContent: String(v) })));
      t.append(tr);
    };
    if (R.impA) line('A Impacts into B', R.impA);
    line(
      'A Clashes B' +
        (calc.charge === 'A'
          ? ' after charging' + (calc.arc !== 'front' ? ' (' + calc.arc + ')' : '') + ' · Inspired'
          : ''),
      R.clashA
    );
    line('A Volleys B (' + calc.range + '″)', R.volA);
    if (R.impB) line('B Impacts into A', R.impB);
    line(
      'B Clashes A' +
        (calc.charge === 'B'
          ? ' after charging' + (calc.arc !== 'front' ? ' (' + calc.arc + ')' : '') + ' · Inspired'
          : ''),
      R.clashB
    );
    line('B Volleys A (' + calc.range + '″)', R.volB);
    box.append(t);
    inner.append(box);
  }
  if (R.fight) {
    const F = R.fight,
      box = bEl('div', { className: 'cc-box' });
    box.append(bEl('h3', { textContent: 'Combat potential · who wins the fight' }));
    const pa = (F.A / F.n) * 100,
      pb = (F.B / F.n) * 100,
      pd = (F.draw / F.n) * 100;
    const bar = bEl('div', { className: 'cc-bar' });
    [
      ['a', pa, 'A '],
      ['d', pd, ''],
      ['b', pb, 'B ']
    ].forEach(([c, v, l]) => {
      if (v <= 0) return;
      const sp = bEl('span', { className: c, textContent: v >= 8 ? l + Math.round(v) + '%' : '' });
      sp.style.width = v + '%';
      bar.append(sp);
    });
    box.append(bar);
    {
      const pA = (qaPts(calc.A) || {}).total || 0,
        pB = (qaPts(calc.B) || {}).total || 0;
      if (pA && pB)
        box.append(
          ptext(
            `Cost: A ${pA} pts against B ${pB} pts` +
              (pA !== pB
                ? ` (${pA > pB ? 'A' : 'B'} costs ${Math.abs(pA - pB)} pts more, ${Math.round((Math.abs(pA - pB) / Math.min(pA, pB)) * 100)}% more)`
                : ' (the same)') +
              '.'
          )
        );
    }
    box.append(
      ptext(
        `Out of ${F.n} fights of up to ${F.maxR} rounds (${calc.charge === 'none' ? 'already engaged' : (calc.charge === 'A' ? 'A' : 'B') + ' charges'}, contact on the ${calc.arc}): Regiment A wins ${Math.round(pa)}%, Regiment B wins ${Math.round(pb)}%, and ${Math.round(pd)}% are still fighting after ${F.maxR} rounds. A fight lasts ${F.rounds.toFixed(1)} rounds on average; A keeps ${Math.round(F.leftA * 100)}% of its stands and B ${Math.round(F.leftB * 100)}%.`
      )
    );
    box.append(
      ptext(
        'Winning means the other regiment is destroyed or Shattered. The charger is Inspired for its first Clash (a successful Charge, core rules; not for Impacts). Each round both regiments Clash once (the order after the first round is random), with stands lost, Morale, Broken and Shattered applied. Movement, other regiments, spells and choices during the game are not included.',
        'hint'
      )
    );
    inner.append(box);
  }
}
