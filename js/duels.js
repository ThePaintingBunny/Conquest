/* Duels between characters. */
/* ================= Duels (core rules, Characters chapter) =================
   A [Character] (or a Monster [Character] / Arrogance regiment) challenges an enemy [Character] attached to a regiment in contact with its own.
   The defender may refuse (penalties unless Bodyguard(s)/Refined Beyond Nature; Broken regiments cannot refuse; one refusal per round).
   Accepted: both strike simultaneously (Quicksilver Strike first), To Hit on Clash, Defense/Evasion, then Resolve tests. Wounds only hit the characters. */
const DUEL_REFUSED =
  'Refused a Duel (cannot Seize, lowest Resolve, loses Inspiration, re-rolls Resolve tests of 1)';
function isMChar(u) {
  return (
    !!u && u.type === 'monster' && !u.charName && (!!u.warlordMonster || (frEncy(u) || {}).kind === 'char')
  );
}
function duelist(u) {
  if (!u || u.destroyed) return null;
  if (u.charName) {
    const s = chStatsX(u),
      R = chRulesX(u).concat(itemDuelRules(u));
    if (cdirOf(u) === 'Precision Armament') R.push('Cleave (+3)');
    return {
      uid: u.id,
      name: u.charName,
      C: +s.C || 0,
      A: (+s.A || 0) + (cdirOf(u) === 'Greetings to a Fellow General' ? 5 : 0),
      D: +s.D || 0,
      E: Math.max(0, (+s.E || 0) - (cdirOf(u) === 'Greetings to a Fellow General' ? 1 : 0)),
      R: s.R == null || s.R === '–' ? null : +s.R,
      W: +s.W || 4,
      wounds: +u.charWounds || 0,
      rules: R,
      mono: false,
      rider: rh(R, 'Rider') || upgOf(u, /Rider|Apex Master/),
      monster: false,
      up: u
    };
  }
  if (isMChar(u) || rh(u.rules || [], 'Arrogance')) {
    const s = u.stats || {};
    return {
      uid: u.id,
      name: u.short || u.name,
      C: +s.C || 0,
      A: +s.A || 0,
      D: +s.D || 0,
      E: +s.E || 0,
      R: s.R == null || s.R === '–' ? null : +s.R,
      W: +s.W || 4,
      wounds: +u.wounds || 0,
      rules: RU(u),
      mono: true,
      rider: false,
      monster: u.type === 'monster',
      up: u
    };
  }
  return null;
}
function canDuel(u) {
  return !!duelist(u) && (!!u.charName || isMChar(u) || rh(u.rules || [], 'Arrogance'));
}
function duelTargets(u) {
  if (!u || !u.onTable) return [];
  return engaged(u).filter(e => e.side !== u.side && !e.destroyed && (e.charName || isMChar(e)));
}
function duelRefuseWhy(T) {
  if (itemFlag(T, 'noRefuse')) return 'Its character cannot refuse Duels';
  if (cb && cb.type === 'duel' && itemFlag(base(cb.att), 'noDecline'))
    return 'Duels from this character cannot be refused';
  if ((T.effects || []).includes('Broken')) return 'Its regiment is Broken, so it cannot refuse';
  if (T.duelRefusedR === (state.round || 1)) return 'It already refused a Duel this round';
  return '';
}
function duelNoPenalty(T) {
  return rh(RU(T), 'Bodyguard') || rh(RU(T), 'Bodyguards') || rh(T.charRules || [], 'Refined Beyond Nature');
}
/* expected wounds X deals to Y, for Claude's choices */
function duelExp(X, Y) {
  const ph = Math.min(5, Math.max(1, X.C)) / 6,
    phR = rh(X.rules, 'Flurry') && !rh(Y.rules, 'Parry') ? ph + (1 - ph) * ph : ph;
  const red = Math.max(0, rx(X.rules, 'Cleave') - rx(Y.rules, 'Hardened'));
  const D = rh(X.rules, 'Smite')
      ? 0
      : Math.max(0, Y.D + (rh(Y.rules, 'Shield') && !rh(X.rules, 'Linebreaker') ? 1 : 0) - red),
    ps = Math.min(5, Math.max(D, Y.E)) / 6;
  return X.A * phR * (1 - ps);
}
function duelOdds(a, b) {
  const X = duelist(a),
    Y = duelist(b);
  if (!X || !Y) return 0;
  const dealt = duelExp(X, Y) / Math.max(1, Y.W - Y.wounds),
    took = duelExp(Y, X) / Math.max(1, X.W - X.wounds);
  return took ? dealt / took : dealt ? 9 : 1;
}
/* one side's strike */
function duelStrike(X, Y) {
  const res = { rolls: [], hits: 0, drolls: [], wounds: 0, mrolls: [], extra: 0, notes: [] };
  const slainBig = rh(Y.rules, 'Slain Bigger') && (X.monster || X.rider);
  const E = slainBig ? Math.max(Y.E, Math.min(3, Y.E + 3)) : Y.E;
  if (slainBig) res.notes.push('Slain Bigger: +3 Evasion and Fearless');
  const dis = Y.up && Y.up.charName && !X.mono && upgOf(Y.up, /Disorienting Strikes/) ? 1 : 0;
  if (dis) res.notes.push('Disorienting Strikes: -1 Clash');
  const hitOn = Math.min(6, Math.max(1, X.C - dis)),
    isHit = v => v === 1 || (v <= hitOn && v !== 6);
  const HS = [];
  if (!rh(Y.rules, 'Parry')) {
    if (rh(X.rules, 'Flurry')) HS.push({ k: 'fail', src: 'Flurry' });
    if (upgOf(X.up, /Eccentric Fighting Style/)) HS.push({ k: 'fail', src: 'Eccentric Fighting Style' });
  }
  const PH = rrPlan(HS);
  let ones = 0;
  for (let i = 0; i < X.A; i++) {
    let v = d6(),
      re = false,
      first = null;
    if (rrDie(v, isHit, PH)) {
      first = v;
      v = d6();
      re = true;
    }
    const h = isHit(v);
    if (h) {
      res.hits++;
      if (v === 1) ones++;
    }
    res.rolls.push({ v, hit: h, re, first });
  }
  if (rh(X.rules, 'Relentless Blows')) res.hits += ones;
  /* Vinda, the Dancer (Nords): one more Attack for every 2 Hits (rounded up) */
  if (X.up && upgOf(X.up, /Vinda, the Dancer/) && res.hits) {
    const k = Math.ceil(res.hits / 2);
    let vh = 0;
    for (let i = 0; i < k; i++) {
      const v = d6(),
        h = isHit(v);
      res.rolls.push({ v, hit: h, re: false, first: null });
      if (h) vh++;
    }
    res.hits += vh;
    res.notes.push('Vinda: ' + k + ' extra Attack' + (k > 1 ? 's' : '') + ', ' + vh + ' hit');
  }
  const red = Math.max(0, rx(X.rules, 'Cleave') - rx(Y.rules, 'Hardened'));
  let D = Math.max(0, Y.D + (rh(Y.rules, 'Shield') && !rh(X.rules, 'Linebreaker') ? 1 : 0) - red);
  if (rh(X.rules, 'Smite')) D = 0;
  const flawN = rh(X.rules, 'Flawless Strikes') ? ones : 0,
    deadly = rh(X.rules, 'Deadly Blades');
  const DS = [];
  if (rh(Y.rules, 'Untouchable')) DS.push({ k: 'fail', face: 6, src: 'Untouchable' });
  if (Y.up && itemFlag(Y.up, 'duelDefReroll')) DS.push({ k: 'fail', src: 'Living Breastplate' });
  if (upgOf(X.up, /Kiss of the Dilosaur|Caledburn|Eccentric Fighting Style/))
    DS.push({ k: 'succ', src: 're-roll successful Defense' });
  const PD = rrPlan(DS);
  let fails = 0,
    dbl = 0;
  for (let i = 0; i < res.hits; i++) {
    const flaw = i < flawN,
      ok = x => x !== 6 && ((!flaw && x <= D) || x <= E);
    let v = d6(),
      re = false,
      first = null;
    if (rrDie(v, ok, PD)) {
      first = v;
      v = d6();
      re = true;
    }
    const s = ok(v);
    res.drolls.push({ v, save: s, re, first });
    if (!s) {
      fails++;
      if (deadly && v === 6) dbl++;
    }
  }
  const ten = Math.min(rx(Y.rules, 'Tenacious'), fails);
  res.wounds = fails - ten + dbl;
  res.D = D;
  res.E = E;
  res.hitOn = hitOn;
  const noRes = Y.R == null || rh(Y.rules, 'Refined Beyond Nature') || rh(Y.rules, 'Automaton');
  if (res.wounds && !noRes) {
    const fearless = slainBig || rh(Y.rules, 'Fearless') || rh(Y.rules, 'Bravery');
    const R = Y.R - (fearless ? 0 : rx(X.rules, 'Terrifying'));
    const okR = v => v === 1 || (v <= R && v !== 6);
    const MS = [];
    if (upgOf(X.up, /Kiss of the Dilosaur|Chthonic Flame/))
      MS.push({ k: 'succ', src: 're-roll successful Resolve' });
    const PM = rrPlan(MS);
    let mf = 0;
    for (let i = 0; i < res.wounds; i++) {
      let v = d6(),
        re = false,
        first = null;
      if (rrDie(v, okR, PM)) {
        first = v;
        v = d6();
        re = true;
      }
      const p = okR(v);
      res.mrolls.push({ v, pass: p, re, first });
      if (!p) mf++;
    }
    mf = Math.max(0, mf - rx(Y.rules, 'Indomitable'));
    res.extra = rh(Y.rules, 'Oblivious') ? Math.ceil(mf / 2) : mf;
    res.R = R;
  }
  res.total = res.wounds + res.extra;
  return res;
}
function duelResolve() {
  const A = duelist(base(cb.att)),
    T = duelist(base(cb.tgt));
  const qa = rh(A.rules, 'Quicksilver Strike') || rh(A.rules, 'Quicksilver Strikes'),
    qt = rh(T.rules, 'Quicksilver Strike') || rh(T.rules, 'Quicksilver Strikes');
  let ra = null,
    rt = null;
  if (qa && !qt) {
    ra = duelStrike(A, T);
    if (T.wounds + ra.total < T.W) rt = duelStrike(T, A);
  } else if (qt && !qa) {
    rt = duelStrike(T, A);
    if (A.wounds + rt.total < A.W) ra = duelStrike(A, T);
  } else {
    ra = duelStrike(A, T);
    rt = duelStrike(T, A);
  }
  cb.duel = { a: ra, t: rt, qa, qt };
  cb.step = 'done';
}
function duelDecide(accept) {
  if (!cb || cb.type !== 'duel' || cb.step !== 'offer') return;
  if (accept) {
    cb.step = 'roll';
  } else {
    cb.refused = true;
    cb.step = 'done';
  }
  renderCombat();
}
function aiAcceptDuel(Tu, Au) {
  if (duelRefuseWhy(Tu)) return true;
  const o = duelOdds(Tu, Au);
  return o >= 0.8 || (duelNoPenalty(Tu) ? false : o >= 0.5);
}
function slayChar(u) {
  if (!u) return u;
  const FS0 = u.slotBase && u.slotFiles ? { files: u.slotFiles, slots: u.slotBase } : fullSlots(u);
  if (isMChar(u) || !u.charName)
    return Object.assign({}, u, {
      onTable: false,
      destroyed: true,
      status: 'Destroyed (Duel)',
      destroyedRound: state.round
    });
  const x = Object.assign(
    {},
    u,
    u.type === 'monster'
      ? {}
      : {
          stands: Math.max(1, (u.stands || 2) - 1),
          files: Math.min(u.files || 1, Math.max(1, (u.stands || 2) - 1))
        },
    { charSlain: u.charName, slotBase: FS0.slots.map(t => (t === 'c' ? null : t)), slotFiles: FS0.files }
  );
  if (u.order) x.order = (u.order || []).filter(t => t !== 'c');
  ['char', 'charName', 'charStats', 'charRules', 'warlord', 'spells', 'charActivated', 'charWounds'].forEach(
    k => delete x[k]
  );
  return x;
}
function duelWound(u, D, n) {
  if (!n) return u;
  if (D.mono) {
    const AL = allocate(u, n);
    return Object.assign(
      {},
      u,
      { wounds: AL.w, auxWounds: AL.aw },
      AL.dead
        ? { onTable: false, destroyed: true, status: 'Destroyed (Duel)', destroyedRound: state.round }
        : {}
    );
  }
  const w = (+u.charWounds || 0) + n;
  return w >= D.W
    ? slayChar(Object.assign({}, u, { charWounds: w }))
    : Object.assign({}, u, { charWounds: w });
}
async function recordDuel() {
  if (!cb || cb.type !== 'duel') return;
  const c0 = cb,
    A = base(cb.att),
    T = base(cb.tgt),
    DA = duelist(A),
    DT = duelist(T),
    R = state.round || 1;
  let units = state.units.slice(),
    text = '';
  const set = (id, f) => {
    units = units.map(x => (x.id === id ? f(x) : x));
  };
  if (cb.refused) {
    const pen = !duelNoPenalty(T);
    set(T.id, x => {
      let y = Object.assign({}, x, { duelRefusedR: R });
      if (pen) y = grantU(y, DUEL_REFUSED, []);
      return y;
    });
    if (rh(A.rules || [], 'Arrogance'))
      set(A.id, x => grantU(x, 'Arrogance: Flurry (Duel refused)', ['Flurry']));
    /* What we did in Life will Echo in Eternity: the refusing regiment also re-rolls successful Morale this round */
    if (upgOf(A, /What we did in Life/))
      set(T.id, x => grantU(x, 'Echo in Eternity (re-roll successful Morale)', []));
    text =
      `${DT.name} refuses the Duel with ${DA.name}` +
      (pen
        ? `: until the end of the round ${T.short || T.name} cannot Seize, uses its lowest Resolve, loses Inspiration and re-rolls Resolve tests of 1.`
        : ' (no penalty: ' +
          (rh(T.charRules || [], 'Refined Beyond Nature') ? 'Refined Beyond Nature' : 'Bodyguard') +
          ').') +
      (rh(A.rules || [], 'Arrogance') ? ` ${A.short || A.name} gains Flurry.` : '');
  } else {
    const d = cb.duel,
      wa = d.t ? d.t.total : 0,
      wt = d.a ? d.a.total : 0;
    set(A.id, x => duelWound(x, DA, wa));
    set(T.id, x => duelWound(x, DT, wt));
    /* Overkill (City States Mastery) */
    const over = (who, foe, n) => {
      if (!n || !upgOf(who, /Overkill/)) return '';
      const F = units.find(x => x.id === foe.id);
      if (!F || F.destroyed || !F.onTable) return '';
      const mi = moraleInfo(F, who),
        R = mi.R,
        rolls = [];
      let fails = 0;
      if (mi.auto) return '';
      for (let i = 0; i < n; i++) {
        const v = d6(),
          ok = v === 1 || (v <= R && v !== 6);
        rolls.push(v);
        if (!ok) fails++;
      }
      fails = Math.max(0, fails - rx(RU(F), 'Indomitable'));
      if (fails)
        set(foe.id, x => {
          const AL = allocate(x, fails);
          return Object.assign(
            {},
            x,
            { wounds: AL.w, auxWounds: AL.aw },
            AL.dead
              ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
              : {}
          );
        });
      return ` Overkill: ${foe.short || foe.name} tests Morale ${n}× on ${R} (${rolls.join(', ')}): ${fails} wound${fails === 1 ? '' : 's'}.`;
    };
    var overTxt = over(A, T, wt) + over(T, A, wa);
    /* Superiority (Dweghom Mastery): slaying an enemy character in a Duel gives its regiment -1 Resolve this round */
    {
      const supr = (who, foe, n, D) => {
        if (!n || D.wounds + n < D.W || !upgOf(who, /: Superiority$/)) return '';
        set(foe.id, x => (x.destroyed ? x : grantU(x, 'Superiority (−1 Resolve)', [], { R: -1 })));
        return ` Superiority: ${foe.short || foe.name} has −1 Resolve until the end of the round.`;
      };
      overTxt += supr(A, T, wt, DT) + supr(T, A, wa, DA);
    }
    const deadA = wa && DA.wounds + wa >= DA.W,
      deadT = wt && DT.wounds + wt >= DT.W;
    text =
      `Duel: ${DA.name} deals ${wt} wound${wt === 1 ? '' : 's'}, ${DT.name} deals ${wa}.` +
      (deadT
        ? ` ${DT.name} is slain` +
          (DT.mono ? '.' : `; ${T.short || T.name} makes a free Clean Combat Reform.`)
        : '') +
      (deadA
        ? ` ${DA.name} is slain` +
          (DA.mono ? '.' : `; ${A.short || A.name} makes a free Clean Combat Reform.`)
        : '') +
      overTxt;
  }
  await putState({ units, lastTitle: N(A.side) + ' · Duel', lastText: text });
  lastDuelLine = text;
  await db
    .collection('events')
    .doc('e' + Date.now())
    .set({
      at: Date.now(),
      kind: 'duel',
      side: A.side,
      attacker: A.id,
      target: T.id,
      refused: !!c0.refused,
      duel: c0.duel || null
    })
    .catch(() => {});
  const inA = c0.inAct,
    charDuel = c0.charDuel;
  cb = null;
  renderCombat();
  if (inA && act && act.cur) {
    act.cur.combat = { type: 'duel', text };
    finishAction();
  } else if (charDuel) {
    await charCommit(A.id, { note: text });
  } else render();
  toast('Duel recorded.');
}
let lastDuelLine = '';
function duelRows(box, r, who, X, Y) {
  const s = stepBox(who);
  if (!r) {
    s.appendChild(ptext(X.name + ' was slain before striking (Quicksilver Strike).'));
    box.appendChild(s);
    return;
  }
  s.appendChild(
    ptext(
      `${X.name}: ${X.A} attacks, hits on ${r.hitOn} or less → ${r.hits} hit${r.hits === 1 ? '' : 's'}`,
      'gl'
    )
  );
  const d1 = document.createElement('div');
  d1.className = 'drow';
  r.rolls.forEach((q, qi) =>
    d1.appendChild(
      dieMini(
        q.v,
        (q.hit ? 'hit' : 'miss') + (q.re ? ' re' : ''),
        ((cb && cb.uid) || '') +
          'D' +
          (r.who || Y.name) +
          (r.n || '') +
          'h' +
          qi +
          '.' +
          q.v +
          (q.re ? 'r' : '')
      )
    )
  );
  s.appendChild(d1);
  if (r.hits) {
    s.appendChild(
      ptext(
        `${Y.name} saves on Defense ${r.D} or Evasion ${r.E} → ${r.wounds} wound${r.wounds === 1 ? '' : 's'}`,
        'gl'
      )
    );
    const d2 = document.createElement('div');
    d2.className = 'drow';
    r.drolls.forEach((q, qi) =>
      d2.appendChild(
        dieMini(
          q.v,
          (q.save ? 'hit' : 'miss') + (q.re ? ' re' : ''),
          ((cb && cb.uid) || '') +
            'D' +
            (r.who || Y.name) +
            (r.n || '') +
            'd' +
            qi +
            '.' +
            q.v +
            (q.re ? 'r' : '')
        )
      )
    );
    s.appendChild(d2);
  }
  if (r.mrolls.length) {
    s.appendChild(ptext(`${Y.name} tests Resolve ${r.R} → ${r.extra} more`, 'gl'));
    const d3 = document.createElement('div');
    d3.className = 'drow';
    r.mrolls.forEach((q, qi) =>
      d3.appendChild(
        dieMini(
          q.v,
          (q.pass ? 'hit' : 'miss') + (q.re ? ' re' : ''),
          ((cb && cb.uid) || '') +
            'D' +
            (r.who || Y.name) +
            (r.n || '') +
            'm' +
            qi +
            '.' +
            q.v +
            (q.re ? 'r' : '')
        )
      )
    );
    s.appendChild(d3);
  }
  r.notes.forEach(n => s.appendChild(ptext(n)));
  s.appendChild(ptext(`${Y.name} suffers ${r.total} wound${r.total === 1 ? '' : 's'}`, 'tot'));
  box.appendChild(s);
}
function renderDuel(body) {
  const A = base(cb.att),
    T = base(cb.tgt),
    DA = duelist(A),
    DT = duelist(T);
  if (!DA || !DT) {
    body.appendChild(ptext('One of the characters is no longer there.'));
    body.appendChild(
      cbtn(
        'Close',
        () => {
          cb = null;
          renderCombat();
          render();
        },
        'O'
      )
    );
    return;
  }
  const sA = N(A.side),
    sT = N(T.side);
  body.appendChild(
    ptext(
      `${DA.name} (${sA}) challenges ${DT.name} (${sT}). Both strike at the same time${DA && (rh(DA.rules, 'Quicksilver Strike') || rh(DT.rules, 'Quicksilver Strike')) ? ' (Quicksilver Strike strikes first)' : ''}; wounds only hit the characters. ${DA.name}: ${DA.W - DA.wounds}/${DA.W} wounds left · ${DT.name}: ${DT.W - DT.wounds}/${DT.W}.`
    )
  );
  if (cb.step === 'offer') {
    const why = duelRefuseWhy(T),
      np = duelNoPenalty(T);
    const s = stepBox(sT + ' answers the challenge');
    if (why) {
      s.appendChild(ptext(why + '.'));
      s.appendChild(
        cbtn(
          'Accept the Duel',
          () => {
            duelDecide(true);
            maybeAutoAI();
          },
          'T'
        )
      );
    } else {
      s.appendChild(
        ptext(
          np
            ? 'Refusing costs nothing (' +
                (rh(T.charRules || [], 'Refined Beyond Nature') ? 'Refined Beyond Nature' : 'Bodyguard') +
                ').'
            : 'Refusing: until the end of the round its regiment cannot Seize, uses its lowest Resolve, loses Inspiration and re-rolls Resolve tests of 1.'
        )
      );
      const r = document.createElement('div');
      r.className = 'row';
      r.append(
        cbtn(
          'Accept the Duel',
          () => {
            duelDecide(true);
            maybeAutoAI();
          },
          'T'
        ),
        cbtn(
          'Refuse',
          () => {
            duelDecide(false);
            maybeAutoAI();
          },
          'T'
        )
      );
      s.appendChild(r);
    }
    body.appendChild(s);
    if (!PVP() && T.side === AI && A.side !== AI && !cb.aiAns) {
      cb.aiAns = true;
      setTimeout(() => {
        if (cb && cb.type === 'duel' && cb.step === 'offer') {
          const acc = aiAcceptDuel(T, A);
          toast(N(AI) + (acc ? ' accept the Duel.' : ' refuse the Duel.'));
          duelDecide(acc);
        }
      }, 700);
    }
    return;
  }
  if (cb.step === 'roll') {
    body.appendChild(
      cbtn(
        'Roll the Duel (' + sA + ')',
        () => {
          duelResolve();
          renderCombat();
        },
        'A'
      )
    );
    return;
  }
  if (cb.refused) {
    body.appendChild(ptext(DT.name + ' refuses the Duel.', 'tot'));
  } else {
    duelRows(body, cb.duel.a, '1 · ' + DA.name + ' strikes', DA, DT);
    duelRows(body, cb.duel.t, '2 · ' + DT.name + ' strikes', DT, DA);
  }
  body.appendChild(cbtn('Record result', recordDuel, 'O'));
}
/* the character activation panel */
function duelBox(u, box) {
  if (!charAct || !u || !u.onTable) return;
  const T = duelTargets(u);
  if (!T.length) return;
  const h = ptext(
    'Duel (uses the character’s action): challenge an enemy character in a regiment in contact with yours.'
  );
  box.appendChild(h);
  const r = document.createElement('div');
  r.className = 'row';
  T.forEach(t => {
    const D = duelist(t);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Duel ' + D.name + ' (' + (t.short || t.name) + ')';
    b.onclick = () =>
      openCombat({
        type: 'duel',
        att: u.id,
        tgt: t.id,
        inAct: false,
        charDuel: true,
        step: 'offer',
        selfTitle: 'Duel'
      });
    r.appendChild(b);
  });
  box.appendChild(r);
}
/* Claude */
async function aiDuel(id, tid) {
  const u = byId(id),
    C = duelTargets(u);
  const t = C.find(x => x.id === tid) || C.sort((a, b) => duelOdds(u, b) - duelOdds(u, a))[0];
  if (!t) {
    await charCommit(id, { note: 'No action.' });
    return `the ${u.charName} takes no action`;
  }
  lastDuelLine = '';
  openCombat({
    type: 'duel',
    att: id,
    tgt: t.id,
    inAct: false,
    charDuel: true,
    step: 'offer',
    selfTitle: 'Duel'
  });
  for (let i = 0; i < 240 && cb && cb.type === 'duel'; i++) await sleep(500);
  return lastDuelLine || `the ${u.charName} duels`;
}
