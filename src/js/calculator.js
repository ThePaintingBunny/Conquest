/* Combat calculator: two regiments, the game's own combat rules, simulated many times. */
/* ---------- Combat calculator: two regiments, the game's own combat rules, simulated many times ---------- */
let calc = {
  A: { fac: '', unit: '', char: '', stands: null, opts: [], upg: [], warlord: false },
  B: { fac: '', unit: '', char: '', stands: null, opts: [], upg: [], warlord: false },
  charge: 'A',
  arc: 'front',
  range: 12,
  fx: { A: {}, B: {} },
  res: null,
  busy: false,
  err: ''
};
const CALC_FX = [
  ['Inspired', 'Inspired', 'Inspired'],
  ['Strat', 'Activated from the Strategic Stack', 'strat'],
  ['Broken', 'Broken (starts Broken)', 'Broken'],
  ['Sup', 'Supremacy Ability active (Warlord)', 'sup']
];
/* City States: activating from the Strategic Stack makes it Inspired and adds its strategic bonuses (Andromachos: Flurry, Dorilates: Relentless Blows, Hammer and Anvil: Shock) */
function calcStrat() {
  ['A', 'B'].forEach(k => {
    const F = calc.fx[k] || {};
    if (!F.strat) return;
    const id = 'c' + k;
    state.units = state.units.map(u => {
      if (u.id !== id || frFac(u) !== 'City States') return u;
      const add = (hasRule(u, /Automaton/) ? [] : ['Inspired (Strategic Stack)'])
        .concat(u.strategicFx || [])
        .concat(
          /Infantry|Cavalry/.test(u.cls || '') && supOn(u.side, 'Hammer and Anvil')
            ? ['Shock (Hammer and Anvil)']
            : []
        );
      return Object.assign({}, u, {
        effects: (u.effects || []).concat(add.filter(e => !(u.effects || []).includes(e)))
      });
    });
  });
}
function calcBuild(k, side) {
  const s = calc[k];
  if (!s.fac || !s.unit) return null;
  const L = qaList(s);
  if (!L || !L.units.length) return null;
  const u = buildUnits(side, L)[0];
  u.id = 'c' + k;
  u.onTable = true;
  u.effects = (u.effects || []).slice();
  const F = calc.fx[k] || {};
  if (F.Inspired) u.effects.push('Inspired (calculator)');
  if (F.Broken) u.effects.push('Broken');
  let v = u;
  if (F.ideal && IDEAL[F.ideal])
    v = grantU(v, 'Ideal Card: ' + F.ideal, IDEAL[F.ideal][1] || [], IDEAL[F.ideal][2] || null);
  return v;
}
function calcSandbox(units, fn) {
  const sS = state,
    sC = cb,
    sA = act,
    sq = quietBreak;
  state = Object.assign({}, sS, {
    units,
    sup: {},
    fr: {},
    round: 1,
    mode: 'test',
    turn: 'cs',
    step: 'activations'
  });
  cb = null;
  act = null;
  quietBreak = true;
  try {
    return fn();
  } finally {
    state = sS;
    cb = sC;
    act = sA;
    quietBreak = sq;
  }
}
/* place the attacker X against the defender Y on the arc chosen (front, flank or rear); for a volley, straight in front at the range */
function calcPlace(X, Y, arc, dist) {
  Object.assign(Y, { x: 36, y: 24 });
  Object.assign(X, { x: 36, facing: 0 });
  const GX = geom(X),
    GY = geom(Y);
  if (dist != null) {
    Y.facing = 180;
    X.y = 24 - GY.d / 2 - GX.d / 2 - dist;
    return;
  }
  if (arc === 'rear') {
    Y.facing = 0;
    X.y = 24 - GY.d / 2 - GX.d / 2;
  } else if (arc === 'flank') {
    Y.facing = 90;
    X.y = 24 - GY.w / 2 - GX.d / 2;
  } else {
    Y.facing = 180;
    X.y = 24 - GY.d / 2 - GX.d / 2;
  }
}
function calcSup(units) {
  ['cs', 'nord'].forEach((side, i) => {
    const k = i ? 'B' : 'A';
    if (!(calc.fx[k] || {}).sup) return;
    try {
      const S = supOf(side);
      if (S && S.d && S.d.g) {
        const r = supApply(state.units, side, S, null);
        if (Array.isArray(r)) state.units = r;
      }
    } catch (e) {}
  });
}
function calcAttack(type, Xid, Yid) {
  const X = base(Xid),
    Y = base(Yid);
  cb = { type, att: Xid, tgt: Yid, groups: null, step: 'att', forceContact: type !== 'volley', inAct: false };
  if (type === 'volley') {
    try {
      cb.vst = volleyStands(X, Y);
    } catch (e) {}
  }
  let G = buildGroups(type, X, Y);
  G = (Array.isArray(G) ? G : Object.values(G)).map(g => Object.assign({}, g)).filter(g => g.n > 0);
  cb.groups = G;
  if (!G.length) {
    cb = null;
    return { w: 0, mw: 0, hits: 0, att: 0 };
  }
  const parry = hitParry(Y);
  let att = 0;
  G.forEach(g => {
    att += g.n;
    rollHits(g, g.n, parry);
  });
  const hits = G.reduce((a, g) => a + (g.hits || 0), 0);
  rollDef(Y);
  const w = cb.wounds || 0;
  let mw = 0;
  const mi = moraleInfo(Y, X);
  if (w && !mi.auto) {
    rollMor(Y);
    mw = cb.extra || 0;
  }
  cb = null;
  return { w, mw, hits, att };
}
function calcApply(Yid, tot) {
  const Y = base(Yid);
  if (!Y || Y.destroyed || !tot) return;
  const old = { units: state.units, round: state.round };
  const AL = allocate(Y, tot);
  const st = {
    round: state.round,
    units: state.units.map(x =>
      x.id === Yid
        ? Object.assign(
            {},
            x,
            { wounds: AL.w, auxWounds: AL.aw },
            AL.dead ? { onTable: false, destroyed: true, status: 'Destroyed' } : {}
          )
        : x
    )
  };
  breakCheck(old, st);
  state.units = st.units;
}
/* core rules: a successful Charge makes the charger Inspired until the end of its activation (not for its Impacts) */
function calcInsp(id, on) {
  state.units = state.units.map(u =>
    u.id !== id
      ? u
      : Object.assign({}, u, {
          effects: on
            ? (u.effects || []).concat(
                (u.effects || []).includes('Inspired (charged)') ? [] : ['Inspired (charged)']
              )
            : (u.effects || []).filter(e => e !== 'Inspired (charged)')
        })
  );
}
function calcStats(arr) {
  const n = arr.length || 1,
    m = arr.reduce((a, b) => a + b, 0) / n;
  return { avg: m, min: Math.min(...arr), max: Math.max(...arr) };
}
/* one exchange, many times: hits, wounds after saves, extra wounds from failed Morale */
function calcExchange(type, attK, N) {
  const X0 = calcBuild(attK, attK === 'A' ? 'cs' : 'nord'),
    Y0 = calcBuild(attK === 'A' ? 'B' : 'A', attK === 'A' ? 'nord' : 'cs');
  if (!X0 || !Y0) return null;
  if (type === 'volley' && !hasBarrage(X0)) return { none: 'No Barrage' };
  /* the chosen arc is where the charger hits; the regiment that was charged strikes back from its front */
  calcPlace(X0, Y0, calc.charge === attK ? calc.arc : 'front', type === 'volley' ? +calc.range || 12 : null);
  if (type === 'volley') {
    Y0.facing = 180;
  }
  return calcSandbox([X0, Y0], () => {
    calcSup();
    calcStrat();
    const W = [],
      M = [],
      T = [],
      H = [],
      K = [];
    let att = 0;
    const st = Y0.stats || {},
      Wst = +st.W || 1;
    if (type === 'volley') {
      const vs = volleyStands(base(X0.id), base(Y0.id)) || [];
      if (!vs.some(v => v.inRange)) return { none: 'Out of range at ' + calc.range + '″' };
    }
    if (type === 'clash' && calc.charge === attK) calcInsp(X0.id, true);
    if (type === 'impact') {
      const G = buildGroups('impact', base(X0.id), base(Y0.id));
      if (!(Array.isArray(G) ? G : Object.values(G)).some(g => g.n > 0)) return { none: 'No Impact attacks' };
    }
    for (let i = 0; i < N; i++) {
      const r = calcAttack(type, X0.id, Y0.id);
      att = r.att;
      H.push(r.hits);
      W.push(r.w);
      M.push(r.mw);
      T.push(r.w + r.mw);
      K.push(Math.floor(r.w / Wst + r.mw / Wst));
    }
    const tot = calcStats(T),
      P = T.filter(x => x >= Wst).length / N;
    return {
      att,
      hits: calcStats(H).avg,
      w: calcStats(W).avg,
      mw: calcStats(M).avg,
      tot: tot.avg,
      max: tot.max,
      pStand: P,
      stands: calcStats(T.map(x => Math.floor(x / Wst))).avg
    };
  });
}
/* a whole fight: the charger hits first (Impacts, then its Clash), then both Clash each round in turn, with stands, Morale, Broken and Shattered applied */
function calcFight(N, maxR) {
  const chA = calc.charge !== 'B',
    Xk = chA ? 'A' : 'B',
    Yk = chA ? 'B' : 'A';
  const X0 = calcBuild(Xk, Xk === 'A' ? 'cs' : 'nord'),
    Y0 = calcBuild(Yk, Yk === 'A' ? 'cs' : 'nord');
  if (!X0 || !Y0) return null;
  calcPlace(X0, Y0, calc.arc, null);
  const res = { A: 0, B: 0, draw: 0, rounds: 0, leftA: 0, leftB: 0, n: N, maxR };
  calcSandbox([X0, Y0], () => {
    calcSup();
    calcStrat();
    const init = JSON.parse(JSON.stringify(state.units));
    for (let i = 0; i < N; i++) {
      state.units = JSON.parse(JSON.stringify(init));
      let r = 1,
        end = null;
      for (; r <= maxR && !end; r++) {
        state.round = r;
        state.units = state.units.map(u => u);
        {
          const st = { round: r, units: state.units };
          breakCheck({ units: state.units, round: r }, st);
          state.units = st.units;
        }
        const order =
          r === 1 || Math.random() < 0.5
            ? [
                [X0.id, Y0.id],
                [Y0.id, X0.id]
              ]
            : [
                [Y0.id, X0.id],
                [X0.id, Y0.id]
              ];
        if (r === 1 && calc.charge !== 'none') {
          const t = calcAttack('impact', X0.id, Y0.id);
          calcApply(Y0.id, t.w + t.mw);
        }
        for (const [a, d] of order) {
          const A = base(a),
            D = base(d);
          if (!A || A.destroyed || !D || D.destroyed) break;
          const ch = r === 1 && calc.charge !== 'none' && a === X0.id;
          if (ch) calcInsp(a, true);
          const t = calcAttack('clash', a, d);
          if (ch) calcInsp(a, false);
          calcApply(d, t.w + t.mw);
        }
        const xd = base(X0.id).destroyed,
          yd = base(Y0.id).destroyed;
        if (xd || yd) end = xd && yd ? 'draw' : xd ? Yk : Xk;
      }
      const frac = u => {
        const b = base(u.id);
        return b.destroyed ? 0 : live(b) / Math.max(1, live(u));
      };
      if (end === 'draw' || !end) res.draw++;
      else res[end]++;
      res.rounds += Math.min(r - 1, maxR);
      res['left' + Xk] += frac(X0);
      res['left' + Yk] += frac(Y0);
    }
  });
  res.rounds /= N;
  res.leftA /= N;
  res.leftB /= N;
  return res;
}
function calcRun() {
  if (calc.busy) return;
  calc.err = '';
  if (!calcBuild('A', 'cs') || !calcBuild('B', 'nord')) {
    calc.err = 'Choose a regiment for both sides first.';
    render();
    return;
  }
  calc.busy = true;
  calc.res = null;
  render();
  setTimeout(() => {
    try {
      const N = 1000;
      const R = {};
      R.clashA = calcExchange('clash', 'A', N);
      R.clashB = calcExchange('clash', 'B', N);
      R.impA = calc.charge === 'A' ? calcExchange('impact', 'A', N) : null;
      R.impB = calc.charge === 'B' ? calcExchange('impact', 'B', N) : null;
      R.volA = calcExchange('volley', 'A', N);
      R.volB = calcExchange('volley', 'B', N);
      R.fight = calcFight(300, 6);
      calc.res = R;
    } catch (e) {
      console.error(e);
      calc.err = 'The calculation hit a problem: ' + e.message;
    }
    calc.busy = false;
    render();
  }, 30);
}
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
