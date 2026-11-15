/*
 * Combat calculator: the page
 *
 * Draws the calculator and its results.
 *
 * In this file: calcPage()
 */

function calcPage(inner, head) {
  head(
    'Combat calculator',
    'Two regiments, the game’s own combat rules, rolled thousands of times. Build each side as in the army builder.',
    { label: mmOverlay ? 'Menu' : 'Main menu', fn: () => mmGo(mmOverlay ? 'home' : null) }
  );
  const cols = bEl('div', { className: 'cc-cols' });
  inner.append(cols);
  ['A', 'B'].forEach(k => {
    const box = bEl('div', { className: 'cc-side ' + k.toLowerCase() });
    box.append(bEl('h3', { textContent: 'Regiment ' + k }));
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
    if (u) {
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
    }
    cols.append(box);
  });
  const set = bEl('div', { className: 'cc-box' });
  set.append(bEl('h3', { textContent: 'The fight' }));
  const sel = (label, val, opts, fn) => {
    const e = bEl('select', { className: 'tf-in qa-sel' });
    e.setAttribute('aria-label', label);
    opts.forEach(([v, t]) => e.append(bEl('option', { value: v, textContent: t })));
    e.value = val;
    e.onchange = () => fn(e.value);
    return e;
  };
  const row = (l, ...k) => {
    const r = bEl('div', { className: 'tf-row qa-row' });
    r.append(bEl('span', { className: 'qa-l', textContent: l }), ...k);
    set.append(r);
  };
  row(
    'Who charges',
    sel(
      'Who charges',
      calc.charge,
      [
        ['A', 'Regiment A charges (Impacts, strikes first)'],
        ['B', 'Regiment B charges'],
        ['none', 'No charge: both are already engaged']
      ],
      v => {
        calc.charge = v;
        calc.res = null;
        render();
      }
    )
  );
  row(
    'Contact on the',
    sel(
      'Arc',
      calc.arc,
      [
        ['front', 'front of the defender'],
        ['flank', 'flank of the defender'],
        ['rear', 'rear of the defender']
      ],
      v => {
        calc.arc = v;
        calc.res = null;
        render();
      }
    )
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
    i.style.width = '70px';
    i.onchange = () => {
      calc.range = Math.max(1, Math.min(36, +i.value || 12));
      calc.res = null;
      render();
    };
    row(
      'Volley range',
      i,
      bEl('span', { className: 'ab-note', textContent: 'inches, for the Volley numbers' })
    );
  }
  const go = bEl('button', {
    type: 'button',
    className: 'btn',
    textContent: calc.busy ? 'Calculating…' : 'Calculate'
  });
  go.disabled = calc.busy;
  go.onclick = calcRun;
  set.append(bEl('div', { className: 'row' }, [go]));
  if (calc.err) set.append(ptext(calc.err, 'hint'));
  inner.append(set);
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
  const R = calc.res;
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
