/*
 * Attack groups
 *
 * Splits an attack into groups of dice (per profile and target arc) and works out Defense and Morale
 * for the target.
 *
 * In this file: buildGroups(), defInfo(), offShareR(), moraleInfo()
 */

function buildGroups(type, A, T) {
  if (type === 'clash' && cb && cb.type === 'clash' && cb.att === A.id && cb.tgt === T.id && !cb.wiDone) {
    cb.wiDone = true;
    if (fxHas(T, /^Whispered Illusion: Veil of Doubt/)) {
      const mi = moraleInfo(A, A),
        v = d6(),
        pass = mi.auto || v <= mi.R;
      cb.wi = { v, R: mi.R, pass };
      if (!pass) cb.wiNoInsp = true;
      setTimeout(
        () =>
          toast(
            'Veil of Doubt: Resolve test ' +
              v +
              ' against ' +
              mi.R +
              (pass ? ' passed: −1 Attacks.' : ' failed: −1 Attacks and no Inspired.')
          ),
        40
      );
    }
  }
  const st = standsOf(A),
    Tc = corners(T),
    groups = {},
    sup = supportX(A);
  const VS =
      type === 'volley'
        ? cb && cb.vst && cb.att === A.id && cb.tgt === T.id
          ? cb.vst
          : volleyStands(A, T)
        : null,
    multiArc =
      !!VS &&
      new Set(VS.filter(v => v.inRange && (cb && cb.arcing ? v.arcing : v.clear)).map(v => v.arc)).size > 1;
  const tArc = cArcU(T, A),
    side = tArc === 'left' || tArc === 'right' || tArc === 'rear',
    big = T.type === 'monster' || T.type === 'brute';
  const add = (key, label, n, p, extra) => {
    if (n <= 0) return;
    if (!groups[key]) {
      const sd = extra && extra.arc ? extra.arc !== 'front' : side;
      const hm = hitMods(A, p, type, T),
        R = p.rules.concat(fx(A));
      groups[key] = Object.assign(
        {
          label,
          n: 0,
          hitOn: hm.hitOn,
          reroll6: hm.reroll6,
          flurry:
            type === 'clash' &&
            (rh(R, 'Flurry') ||
              (upgOf(A, /What we did in Life/) &&
                (T.effects || []).includes('Broken'))) /* Echo in Eternity */,
          anastegma: p.name === A.charName && upgOf(A, /Anastegma/),
          vinda: type === 'clash' && p.name === A.charName && upgOf(A, /Vinda, the Dancer/),
          blessable: (type === 'clash' || type === 'impact') && rh(R, 'Blessed'),
          eccentric: p.name === A.charName && upgOf(A, /Eccentric Fighting Style/),
          forceDef:
            p.name === A.charName &&
            (upgOf(A, /Caledburn|Eccentric Fighting Style/) ||
              (type !== 'impact' && upgOf(A, /Kiss of the Dilosaur/)))
              ? 1
              : 0,
          forceMor: p.name === A.charName && upgOf(A, /Kiss of the Dilosaur|Chthonic Flame/),
          relentless:
            type === 'volley'
              ? rh(R, 'Rapid Volley') || hm.hitOn >= 6
              : type === 'clash' && (rh(R, 'Relentless Blows') || hm.hitOn >= 6),
          red:
            (type === 'impact'
              ? rx(R, 'Brutal Impact')
              : type === 'volley'
                ? rx(R, 'Armor Piercing')
                : rx(R, 'Cleave')) +
            (type === 'volley' && sd && rh(R, 'Sowing Shot') ? 1 : 0) +
            (type === 'clash' && p.name === A.charName && fxHas(A, /^Precision Armament/) ? 3 : 0),
          smite: type === 'clash' && rh(R, 'Smite'),
          flawless:
            (type === 'clash' && rh(R, 'Flawless Strikes')) || (type === 'volley' && rh(R, 'Precise Shot')),
          deadly:
            (type === 'clash' && rh(R, 'Deadly Blades')) ||
            (type === 'volley' && rh(R, 'Deadly Shot')) ||
            ((type === 'clash' || type === 'volley') &&
              (fxHas(A, /^Reigning Season \(Deadly Blades and Deadly Shots\)$/) ||
                (fxHas(A, /^Reigning Season \(Deadly/) && !T.activated))),
          linebreaker: type !== 'volley' && rh(R, 'Linebreaker'),
          fiend: big && rh(R, 'Fiend Hunter'),
          opp:
            (type === 'clash' || type === 'volley') && sd && (rh(R, 'Opportunists') || rh(R, 'Opportunist'))
        },
        extra || {}
      );
      const gg = groups[key];
      gg.lambs = fxHas(A, /^Supremacy: Lambs to the Slaughter/);
      gg.pt = type === 'clash' && fxHas(A, /^Professional Troops/);
      gg.crop = (type === 'clash' || type === 'impact') && fxHas(A, /^Crop Rotation/);
      gg.blade = fxHas(A, /^Blade Masters/);
      gg.exploit =
        type === 'volley' &&
        sd &&
        rh(R, 'Exploit Flanks') &&
        (() => {
          const vr = volleyRange(A);
          return !vr || polyDist(corners(A), Tc) <= vr.range / 2 + 1e-6;
        })();
      gg.rel2 = type === 'clash' && rh(R, 'Fury of the Tempest') && srAirNow(A.side);
      gg.wrath = (type === 'clash' || type === 'impact') && rh(R, 'Wrathful Momentum');
      gg.marked = (type === 'clash' || type === 'impact') && fxHas(T, /^Marked \(Designate Target\)/);
      if (type === 'volley' && rh(R, 'Torrential Fire')) gg.torrentOk = true;
    }
    groups[key].n += n;
  };
  /* a Clash split between several enemies: this pool only uses the stands assigned to this target */
  const only =
    type === 'clash' && cb && cb.att === A.id && cb.tgt === T.id && Array.isArray(cb.split) ? cb.split : null;
  st.forEach(s => {
    if (only && !only.includes(standKey(s))) return;
    const p = prof(A, s.kind, s.mod),
      nm = s.mod || (s.kind === 'reg' ? A.short || A.name : p.name),
      K = s.kind + (s.mod ? ':' + s.mod : '');
    const ldr = s.cmd && s.kind === 'reg' && A.leader !== false;
    if (type === 'clash') {
      const vd = cb && cb.wi && cb.att === A.id ? 1 : 0;
      /* Garrison terrain: against an occupied building every stand of the first rank attacks as if in contact; an
         occupying regiment attacks with all of its stands */
      const eng =
          polyDist(s.poly, Tc) <= 0.35 ||
          (T.garrison && s.rank === 0) ||
          !!A.garrison ||
          !!(cb && cb.forceContact && s.rank === 0) ||
          !!(cb && cb.dieFight && cb.att === A.id),
        ie = vd + (eng && rh(RU(T), 'Inherited Excellence') && arcOf(T, [A.x, A.y]) === 'front' ? 1 : 0);
      const ca =
        (s.cmd && s.kind === 'reg' && offOn(A, 'cmdA') ? +A.cmdA || 0 : 0) +
        (s.cmd && s.kind === 'reg' && fxHas(A, /^Epigenetic Trigger/) ? 2 : 0);
      add(
        K + (eng ? 'e' : 's') + ((ldr || ca) && eng ? 'L' : ''),
        ((ldr || ca) && eng ? (ldr ? 'Leader' : 'Command Stand') : nm) +
          (eng ? ' (engaged)' : ' (supporting)') +
          (ldr && eng ? ', +1 Attack' : '') +
          (ca && eng ? ', Andromachos +' + ca : ''),
        eng
          ? Math.max(
              0,
              p.A +
                (ldr ? 1 : 0) +
                ca +
                (s.cmd && s.kind === 'reg' && fxHas(A, /^Visions of Death/) ? 3 : 0) -
                ie +
                (s.kind === 'reg' && rh(A.rules, 'Brute Force')
                  ? Math.max(
                      0,
                      (+A.stats.C || 0) -
                        Math.max(
                          +T.stats.C || 0,
                          +(T.charStats && T.charStats.C) || 0,
                          +(T.auxStats && T.auxStats.C) || 0
                        )
                    )
                  : 0)
            )
          : s.kind === 'char'
            ? 1
            : sup,
        p
      );
    }
    if (type === 'impact' && !rh(p.rules, 'Loose Formation'))
      add(
        K,
        nm + ' impacts',
        Math.max(
          0,
          rx(p.rules, 'Impact') -
            (fxHas(A, /^Phantom Onslaught/) ? 2 : 0) -
            (rh(RU(T), 'Pike Formation') && arcOf(T, [A.x, A.y]) === 'front' ? 3 : 0)
        ),
        p
      );
    if (type === 'volley' && (VS ? VS.some(v => v.tok === s.tok) : s.rank === 0)) {
      const bx0 = rx(p.rules, 'Barrage'),
        bx = bx0 ? bx0 + fxBarrage(A) : 0;
      if (bx) {
        const vi = VS && VS.find(v => v.tok === s.tok);
        if (VS && (!vi || !vi.inRange || (cb && cb.arcing ? !vi.arcing : !vi.clear))) return;
        const rng = +(p.rules.join(', ').match(/Barrage\s*\(\d+\)\s*\(?\s*(\d+)/) || [])[1] || 0;
        const eff = vi
          ? vi.eff
          : rh(p.rules.concat(fx(A)), 'Longshot') || (rng && polyDist(s.poly, Tc) <= rng / 2);
        const arc = vi ? vi.arc : null,
          KK = K + (multiArc && arc ? ':' + arc : ''),
          an = arc === 'front' ? 'front' : arc === 'rear' ? 'rear' : 'flank';
        add(
          KK,
          nm + ' shots' + (multiArc && arc ? ' into the ' + an : ''),
          bx + (eff ? 1 : 0) + (ldr ? 1 : 0),
          p,
          arc ? { arc } : undefined
        );
        if (eff && groups[KK] && groups[KK].torrentOk) groups[KK].torrent = true;
      }
    }
  });
  return Object.values(groups).map(g => Object.assign(g, { rolls: null }));
}

function defInfo(T, A, g) {
  const s = T.stats || {},
    front = cb && cb.type === 'lethal' ? !cb.flank : g && g.arc ? g.arc === 'front' : cArcU(T, A) === 'front';
  let D = +s.D || 0;
  if (front && rh(RU(T), 'Shield') && !g.linebreaker && !T.garrison) D += 1;
  if (front && phalanx(T)) D += 1;
  const bas = drawVal(T, /^Bastion\s*\((\d+)\)/);
  if (bas && !g.linebreaker) D += bas;
  const red = Math.max(0, g.red - rx((T.rules || []).concat(fx(T)), 'Hardened'));
  D = Math.max(0, D - red);
  if (fxHas(T, /^Armor of Dominion/)) {
    D = Math.max(D, +s.D || 0) + (D > (+s.D || 0) ? 0 : 0);
  }
  if (g.smite && !fxHas(T, /^Armor of Dominion/)) D = 0;
  let E = supEvasion(T, +s.E || 0);
  if (fxHas(T, /^Coils of the Serpent/) && E < 2) E += 1;
  if (fxHas(T, /^World Breakers/)) {
    D = Math.max(D, Math.min(3, +s.D || 0));
    E = Math.max(E, Math.min(3, +s.E || 0));
  }
  if (cb && cb.type === 'volley' && rh(RU(A), 'Hypercatalytic Discharge')) E = 0;
  if (cb && cb.type === 'clash' && rh(RU(A), 'Trial of Will')) {
    const mi = moraleInfo(T, A);
    if (mi.auto) D = Math.max(0, D - 1);
    else if (mi.R < Math.max(D, E)) return { D: mi.R, E: 0, front, red: 0, trial: true };
  }
  return { D, E, front, red };
}

function offShareR(T) {
  if (!T || !T.onTable) return 0;
  /* Niyantran (Sorcerer Kings): friendly regiments within 12″ may use the character's Resolve while its own regiment
     is not Broken */
  const niy = Math.max(
    0,
    ...(state.units || [])
      .filter(
        x =>
          x.side === T.side &&
          x.id !== T.id &&
          x.charName &&
          srAlive(x) &&
          upgOf(x, /Niyantran/) &&
          !(x.effects || []).includes('Broken') &&
          srNear(x, T, 12)
      )
      .map(x => +(x.charStats || {}).R || 0)
  );
  const d = Math.max(
    offOn(T, 'shareR') && offNames(T).includes('Lochagos') ? 18 : 0,
    offOn(T, 'shareR') && offNames(T).includes('Captain') ? 12 : 0
  );
  if (!d) return niy;
  return Math.max(
    niy,
    ...(state.units || [])
      .filter(x => x.side === T.side && x.id !== T.id && x.charName && srAlive(x) && srNear(x, T, d))
      .map(x => +(x.charStats || {}).R || 0)
  );
}

function moraleInfo(T, A) {
  const s = T.stats || {},
    R0 = s.R,
    broken = (T.effects || []).includes('Broken');
  const auto = R0 === '–' || R0 == null || rh(T.rules, 'Automaton') || rh(T.rules, 'Animate Vessel');
  let R = +R0 || 0;
  const cR = Math.max(T.charName ? +chStatsX(T).R || 0 : 0, offShareR(T));
  if (!broken && !rh(T.charRules || [], 'Refined Beyond Nature') && !fxHas(T, /^Refused a Duel/))
    R = Math.max(R, cR);
  if (fxHas(T, /^Refused a Duel/) && cR) R = Math.min(R, cR);
  const n = live(T),
    bonus = broken ? 0 : n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0;
  R += bonus + (fxHas(T, /^Cheerful/) ? 1 : 0) + (fxHas(T, /^Conviction/) && R < 4 ? 1 : 0);
  const self = A && A.id === T.id;
  const terr =
    self || rh(RU(T), 'Fearless') || rh(RU(T), 'Bravery')
      ? 0
      : Math.max(
          rx((A.rules || []).concat(fx(A)), 'Terrifying'),
          animate(A) ? 1 : 0,
          rh(RU(A), 'Wrathful Momentum') && uSize(T) === 1 ? 1 : 0,
          cb && cb.type === 'clash' && rh(RU(A), 'Endless Hunger') && uSize(T) < uSize(A) ? 2 : 0,
          cb && cb.type === 'impact' && fxHas(A, /^Glorious Charge/) ? 1 : 0
        );
  R -= terr;
  const arc0 = self ? 'front' : cArcU(T, A);
  if (phalanx(T) && arc0 === 'front') R += 1;
  return {
    auto,
    R,
    bonus,
    terr,
    iron: rh(RU(T), 'Iron Discipline'),
    arc: arc0,
    oblivious: rh(RU(T), 'Oblivious'),
    indom: rx((T.rules || []).concat(fx(T)), 'Indomitable')
  };
}
