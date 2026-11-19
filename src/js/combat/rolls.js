/*
 * Combat rolls
 *
 * Rolling to Hit, Defense and Morale.
 *
 * In this file: rollHits(), rollDef(), rollMor(), hitParry(), blessAsk()
 */

function rollHits(g, n, parry) {
  const isHit0 = v => v === 1 || (v <= g.hitOn && v !== 6);
  const rolls = [];
  for (let i = 0; i < n; i++) rolls.push({ v: d6(), re: false });
  /* No Matter the Price: no re-rolls, and each failed hit becomes a hit that costs the regiment a wound */
  g.nmtpMiss = g.nmtp ? rolls.filter(r => !isHit0(r.v)).length : 0;
  const isHit = g.nmtp ? () => true : isHit0;
  const P = g.nmtp ? rrPlan([]) : rrPlan(hitSources(g, parry));
  g.rrNotes = P.notes.concat(
    parry && (g.flurry || g.fiend || g.opp || g.blessed || g.reroll6 || g.eccentric)
      ? ['Parry: no hit re-rolls']
      : []
  );
  rolls.forEach(r => {
    if (rrDie(r.v, isHit, P)) {
      r.first = r.v;
      r.v = d6();
      r.re = true;
    }
  });
  if (g.lambs)
    rolls.forEach(r => {
      if (r.v === 6) {
        r.six = true;
        r.v = 1;
      }
    });
  let hits = 0,
    ones = 0;
  rolls.forEach(r => {
    if (isHit(r.v)) {
      hits++;
      r.hit = true;
      if (r.v === 1) ones++;
    }
  });
  g.rolls = rolls;
  g.ones = ones;
  const twos = rolls.filter(r => r.hit && r.v === 2).length;
  g.flawN = ones + (g.blade ? twos : 0);
  g.extra = (g.relentless ? ones + (g.rel2 ? twos : 0) : 0) + (g.torrent ? Math.ceil(hits / 2) : 0);
  /* Vinda, the Dancer (Nords): one more Attack for every 2 Hits (rounded up); those Hits make no more Attacks */
  g.vindaN = 0;
  if (g.vinda && hits) {
    const k = Math.ceil(hits / 2);
    for (let i = 0; i < k; i++) {
      const v = d6();
      rolls.push({ v, re: false, vinda: true, hit: isHit(v) });
      if (isHit(v)) g.vindaN++;
    }
    g.extra += g.vindaN;
  }
  g.hits = hits + g.extra;
}

function rollDef(T) {
  const A = byId(cb.att) || base(cb.att);
  /* Boulder (Trebuchet): no Defense rolls; each Hit is as many wounds as the target's unmodified Size, no Morale */
  if (cb.type === 'volley' && isTreb(A) && trebAmmo(A) === 'Boulder') {
    const hits = cb.groups.reduce((a, g) => a + (g.hits || 0), 0),
      sz = baseSize(T).s;
    cb.groups.forEach(g => {
      g.def = defInfo(T, A, g);
      g.drolls = [];
    });
    Object.assign(cb, { boulder: sz, brittle: 0, tenacious: 0, dbl: 0, anaN: 0, wounds: hits * sz });
    return;
  }
  let fails = 0,
    dbl = 0,
    anaN = 0; /* wounds from an Anastegma character */
  cb.groups.forEach(g => {
    const di = defInfo(T, A, g);
    g.def = di;
    g.drolls = [];
    for (let i = 0; i < (g.hits || 0); i++) {
      const flaw = g.flawless && i < (g.flawN != null ? g.flawN : g.ones || 0),
        ok = x => x !== 6 && ((!flaw && x <= di.D) || x <= di.E);
      const SD = [];
      if (cb.blessT && (cb.type === 'clash' || cb.type === 'impact')) SD.push({ k: 'fail', src: 'Blessed' });
      if (fxHas(T, /^Last Oration/) && zonesOf().some(z => standsOf(T).some(st => inZone(st.poly, z))))
        SD.push({ k: 'fail', src: 'Standard of Last Oration' });
      if (
        rh((T.rules || []).concat(fx(T)), 'Untouchable') ||
        (cb.type === 'volley' && rh(RU(T), 'Unstable Alloys'))
      )
        SD.push({ k: 'fail', face: 6, src: 'Untouchable' });
      if (g.exploit) SD.push({ k: 'succ', face: 1, src: 'Exploit Flanks' });
      if (cb.type === 'clash' && fxHas(T, /^Professional Troops/))
        SD.push({ k: 'fail', face: 6, src: 'Professional Troops' });
      if (g.forceDef)
        SD.push({ k: 'succ', src: 're-roll successful Defense (' + (A.charName || 'character') + ')' });
      const PD = rrPlan(SD);
      g.drrNotes = PD.notes;
      let v = d6(),
        re = false,
        first = null;
      if (rrDie(v, ok, PD)) {
        first = v;
        v = d6();
        re = true;
      }
      const save = ok(v);
      g.drolls.push({ v, save, re, first });
      if (!save) {
        fails++;
        if (g.anastegma) anaN++;
        if (
          (g.deadly || (cb.type === 'impact' && act && act.resoundT === cb.tgt && act.id === cb.att)) &&
          v === 6
        ) {
          dbl++;
          /* Anastegma: the second wound of a Deadly Blades 6 also needs two Morale Tests */
          if (g.anastegma) anaN++;
        }
      }
    }
  });
  let brit = 0;
  if (
    (rh(RU(T), 'Brittle') || animate(T)) &&
    !fxHas(T, /^Loses Brittle/) &&
    !/Fallen Divinity/.test(frBase(T) + ' ' + (T.name || '')) &&
    !(upgOf(T, /Strength and Honor/) && fxHas(T, /Inspired/)) &&
    A &&
    (cb.type === 'clash' || cb.type === 'impact')
  ) {
    const ar = cArcU(T, A);
    const k = ar === 'rear' ? 4 : ar === 'left' || ar === 'right' ? 2 : 0;
    cb.groups.forEach(g =>
      (g.drolls || []).forEach(r => {
        if (brit < k && r.save) {
          r.save = false;
          r.brittle = true;
          brit++;
          fails++;
        }
      })
    );
  }
  cb.brittle = brit;
  const ten =
      rx((T.rules || []).concat(fx(T)), 'Tenacious') +
      (cb.type === 'volley' ? tenVol(RU(T)) : 0) +
      (cb.type === 'volley' && rh(RU(T), 'Visage') ? 1 : 0) +
      (cb.type === 'volley' && fxHas(T, /^Figurehead of the Naglfar/) ? 2 : 0),
    conv = Math.min(ten, fails);
  cb.tenacious = conv;
  cb.dbl = dbl;
  cb.wounds = fails - conv + dbl;
  /* Anastegma (Old Dominion): every wound from the character's failed Defense rolls needs two Morale Tests, so anaN
     extra tests (one per such wound) */
  cb.anaN = Math.min(anaN, cb.wounds);
}

function rollMor(T) {
  const mi = moraleInfo(T, byId(cb.att));
  cb.mi = mi;
  if (cb.boulder) {
    /* Boulder wounds do not cause Morale Tests */
    Object.assign(cb, { mrolls: [], mrrNotes: [], mrrUsed: [], indom: 0, extra: 0 });
    return;
  }
  cb.mrolls = [];
  let fails = 0;
  const ok = v => v === 1 || (v <= mi.R && v !== 6);
  const P = rrPlan(moraleSources(T, mi));
  cb.mrrNotes = P.notes;
  cb.mrrUsed = P.used;
  /* Anastegma: each wound from that character is tested twice */
  for (let i = 0; i < cb.wounds + (cb.anaN || 0); i++) {
    let v = d6(),
      re = false,
      first = null,
      auto = mi.arc === 'rear' && !mi.iron,
      pass = !auto && ok(v);
    if (!auto && rrDie(v, ok, P)) {
      first = v;
      v = d6();
      re = true;
      pass = ok(v);
    }
    cb.mrolls.push({ v, pass, re, first });
    if (!pass) fails++;
  }
  const ind = Math.min(mi.indom, fails);
  fails -= ind;
  cb.indom = ind;
  cb.extra = mi.oblivious ? Math.ceil(fails / 2) : fails;
}

function hitParry(T) {
  return (cb.type === 'clash' || cb.type === 'impact') && rh(RU(T), 'Parry');
}

function blessAsk(who, side) {
  if (who === 'T' && cb.blessWait) {
    const box = bEl('div', { className: 'row bless-q' });
    box.append(
      ptext(`${side}: use Blessed? Re-roll all failed Defense rolls against this attack (once per round).`)
    );
    const go = v => {
      cb.blessT = v;
      const r = cb.blessWait;
      cb.blessWait = null;
      if (r) r();
    };
    box.append(
      cbtn('Use Blessed', () => go(true)),
      cbtn('Not now', () => go(false))
    );
    return box;
  }
  if (who === 'T' && cb.blessT == null && !PVP() && base(cb.tgt) && base(cb.tgt).side === AI)
    cb.blessT = true;
  const lab = document.createElement('label');
  lab.className = 'row hint bless-q';
  const x = document.createElement('input');
  x.type = 'checkbox';
  x.dataset.who = who;
  const k = who === 'A' ? 'blessA' : 'blessT';
  x.checked = !!cb[k];
  x.onchange = () => {
    cb[k] = x.checked;
    renderCombat();
  };
  lab.append(
    x,
    document.createTextNode(
      who === 'A'
        ? `${side}: use Blessed? Re-roll all failed hit rolls in this roll (once per round, declared before rolling).`
        : `${side}: use Blessed? Re-roll all failed Defense rolls in this roll (once per round, declared before rolling).`
    )
  );
  return lab;
}
