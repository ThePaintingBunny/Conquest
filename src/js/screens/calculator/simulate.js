/*
 * Combat calculator: simulation
 *
 * Builds two regiments in a sandbox and fights them many times with the game's own combat rules.
 *
 * In this file: calc, CALC_FX, calcStrat(), calcBuild(), calcSandbox(), calcPlace(), calcSup(),
 *   calcAttack(), calcApply(), calcInsp(), calcStats(), calcExchange(), calcFight(), calcRun()
 */

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
