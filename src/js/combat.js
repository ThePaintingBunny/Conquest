/* Combat: the combat roller, Volleys stand by stand, re-rolls and Die Fighting. */
/* ---------- combat roller ---------- */
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
let cb = null,
  pick = null;
function tenVol(rules) {
  let v = 0;
  for (const r of rules || []) {
    const m = String(r).match(/Tenacious\s*\((\d+)\)\s*(?:against|vs\.?)\s*Volleys/i);
    if (m) v = Math.max(v, +m[1]);
  }
  return v;
}
function rx(rules, name) {
  const re = new RegExp('(?:^|, )' + name + '\\s*\\((\\+?)(\\d+)\\)');
  let base = 0,
    add = 0;
  for (const r of rules || []) {
    if (name === 'Tenacious' && /Volleys/i.test(String(r))) continue;
    const m = String(r).match(re);
    if (m) {
      const v = parseInt(m[2], 10);
      if (m[1]) add += v;
      else base = Math.max(base, v);
    }
  }
  const t = base + add;
  return name === 'Tenacious' ? Math.min(2, t) || 0 : t;
}
function rh(rules, name) {
  const re = new RegExp('(?:^|, )' + name + '(?![A-Za-z])');
  return (rules || []).some(r => re.test(String(r)));
}
function fxHas(u, re) {
  return fx(u).some(x => re.test(x));
}
function prof(u, kind, mod) {
  const s = u.stats || {};
  let p = {
    C: +s.C || 0,
    A: +s.A || 0,
    V: +s.V || 0,
    rules: (u.rules || []).slice(),
    name: u.short || u.name
  };
  if (kind === 'reg' && mod && u.modProfiles && u.modProfiles[mod]) {
    const m = u.modProfiles[mod];
    p = { C: +m.C || 0, A: +m.A || 0, V: +m.V || 0, rules: (m.rules || []).concat(u.rules || []), name: mod };
  }
  if (kind === 'aux' && u.auxStats) {
    p = Object.assign(p, u.auxStats);
    p.rules = (u.auxRules || []).slice();
    p.name = u.auxName || 'Auxiliary';
  }
  if (kind === 'char' && u.charStats) {
    p = Object.assign(p, chStatsX(u));
    p.rules = chRulesX(u);
    p.name = u.charName;
    if ((u.effects || []).some(x => /Greetings to a Fellow General/.test(x))) p.A += 5;
  }
  if (kind === 'reg') {
    const d = srStat(u, 'reg');
    p.C += d.C;
    p.A += d.A;
  }
  if (supOn(u.side, 'Army of Lions') && srIsWl(u) && p.C < 4) p.C += 1;
  return p;
}
function standsOf(u) {
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    n = live(u),
    out = [];
  layout(u).forEach(L => {
    const rr = Math.floor(L.pos / G.files),
      fi = L.pos % G.files,
      cmd = L.cmd,
      aux = L.kind === 'aux',
      ch = L.kind === 'char',
      mod = L.mod;
    const fo = G.d / 2 - (rr + 0.5) * G.sd,
      lo = -G.w / 2 + (fi + 0.5) * G.sw,
      cx = u.x + f[0] * fo + r[0] * lo,
      cy = u.y + f[1] * fo + r[1] * lo,
      hw = G.sw / 2,
      hd = G.sd / 2;
    out.push({
      rank: rr,
      pos: L.pos,
      cmd,
      mod,
      tok: L.tok,
      kind: aux ? 'aux' : ch ? 'char' : 'reg',
      poly: [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1]
      ].map(([i, j]) => [cx + f[0] * hd * i + r[0] * hw * j, cy + f[1] * hd * i + r[1] * hw * j])
    });
  });
  return out;
}
function supportLost(u) {
  if (rh(RU(u), 'Iron Discipline')) return false;
  return engaged(u).some(e => arcOf(u, [e.x, e.y]) !== 'front');
}
function hasImpact(u) {
  if (!u || rh(RU(u), 'Loose Formation')) return false;
  if (u.modProfiles && Object.values(u.modProfiles).some(m => rx(m.rules, 'Impact') > 0)) return true;
  return (
    rx(u.rules, 'Impact') > 0 ||
    (u.aux != null && rx(u.auxRules, 'Impact') > 0) ||
    (u.char != null && rx(u.charRules, 'Impact') > 0)
  );
}
function alwaysAim(u) {
  const R = RU(u);
  return rh(R, 'Deadshot') || rh(R, 'Deadshots') || rh(R, 'Aimed Shot');
}
function aimWhy(u) {
  const R = RU(u);
  return rh(R, 'Deadshot') || rh(R, 'Deadshots')
    ? 'Always aiming (Deadshot)'
    : rh(R, 'Aimed Shot')
      ? 'Already aiming (Aimed Shot)'
      : '';
}
function inspWhy(u) {
  if (act && act.id === u.id && act.actions.some(a => a.type === 'inspire')) return '';
  return fxHas(u, /^Inspired/) || rh(u.rules || [], 'Inspired') ? 'Already Inspired' : '';
}
function hitMods(A, p, type, T) {
  let base = type === 'volley' ? p.V : p.C,
    r6 = false;
  const inFront = T && cArcU(T, A) === 'front',
    pike = T && rh(RU(T), 'Pike Formation') && inFront && fxHas(A, /charged/);
  if (type === 'clash' && T && rh(RU(T), 'Disruptive') && inFront) base -= 1;
  if (type === 'clash' && (tWater(A) || srClashWater(A))) base = Math.max(1, base - 1);
  if (type === 'clash' && T && rh(RU(A), 'Endless Hunger') && uSize(T) < uSize(A)) base += 1;
  if (type === 'impact' && fxHas(A, /^Glorious Charge/)) base += 1;
  if (type === 'volley' && ((cb && cb.arcing) || (act && act.id === A.id && act.arcUsed))) base -= 1;
  if (type === 'clash' && fxHas(A, /Aggression Directive/) && base < 4) base += 1;
  if (
    (type === 'clash' || type === 'impact') &&
    !pike &&
    !fxHas(A, /^Phantom Onslaught/) &&
    rh((A.rules || []).concat(fx(A)), 'Shock') &&
    (type === 'impact' || fxHas(A, /charged/))
  )
    base += 1;
  const prey = !!(T && supPrey(A.side) && supPrey(A.side).id === T.id);
  if (type === 'clash' && cb && cb.wiNoInsp && cb.att === A.id) r6 = r6;
  else if (type === 'clash') {
    const dread = engaged(A).some(e => rh(RU(e), 'Dread') || (e.char != null && rh(e.charRules, 'Dread')));
    if (
      (fxHas(A, /Inspired/) || prey) &&
      !fxHas(A, /^Hindered/) &&
      !fxHas(A, /^Refused a Duel/) &&
      !fxHas(A, /^Dissonance \(no Inspiration/) &&
      !fxHas(A, /Siphon Strength|Bane of Deeds/) &&
      !pike &&
      !rh(A.rules, 'Automaton') &&
      !(A.effects || []).includes('Broken') &&
      !dread
    ) {
      if (base + 1 >= 5) r6 = true;
      else base += 1;
    }
  }
  if (type === 'volley') {
    const aim =
      (act && act.id === A.id && act.actions.some(a => a.type === 'aim')) ||
      rh(p.rules, 'Deadshot') ||
      rh(p.rules, 'Deadshots') ||
      alwaysAim(A) ||
      prey;
    if (aim) {
      if (base + 1 >= 5) r6 = true;
      else base += 1;
    }
  }
  if ((A.offR6 || []).includes(type) && offOn(A, 'r6')) r6 = true;
  return { hitOn: Math.max(1, Math.min(6, base)), reroll6: r6 };
}
/* ---------- Volley, stand by stand (core rules, Volley): each front-rank stand traces its own line from the centre of its front facing,
   as long as its Barrage range, to any point of the target. Out of reach → no shots; blocked by a regiment or Obstructing terrain of Size ≥ both → no shots.
   Effective range (half range, +1 shot) and the target arc it hits are worked out per stand. ---------- */
function segSegX(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a),
    d2 = o(c, d, b),
    d3 = o(a, b, c),
    d4 = o(a, b, d);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0 && Math.abs(d1) > 1e-9 && Math.abs(d2) > 1e-9;
}
function segPoly(a, b, P) {
  const Q = shrinkPoly(P, 0.05);
  for (let i = 0; i < Q.length; i++) if (segSegX(a, b, Q[i], Q[(i + 1) % Q.length])) return true;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return pip(m, Q);
}
function pip(p, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if (
      P[i][1] > p[1] !== P[j][1] > p[1] &&
      p[0] < ((P[j][0] - P[i][0]) * (p[1] - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]
    )
      c = !c;
  }
  return c;
}
function ptSeg(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = dx * dx + dy * dy;
  let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  const q = [a[0] + dx * t, a[1] + dy * t];
  return [Math.hypot(p[0] - q[0], p[1] - q[1]), q];
}
function ptPoly(p, P) {
  let best = [1e9, null];
  for (let i = 0; i < P.length; i++) {
    const r = ptSeg(p, P[i], P[(i + 1) % P.length]);
    if (r[0] < best[0]) best = r;
  }
  return best;
}
function volleyArcOk(A, p) {
  const R = RU(A);
  if (A.garrison || rh(R, 'Acute Senses') || rh(R, 'Fluid Formation')) return true;
  const a = arcOf(A, p);
  return a === 'front' || (rh(R, 'Weapon Platform') && a !== 'rear');
}
/* which stands shoot, and from which facing: the front rank from its front facing; Acute Senses: the front rank from whichever facing is nearest;
   Fluid Formation: the rank or file nearest the target counts as the front rank and shoots from that side */
function volleyShooters(A, T) {
  const R = RU(A),
    ST = standsOf(A),
    mid = P => [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2],
    cen = P => [P.reduce((a, p) => a + p[0], 0) / 4, P.reduce((a, p) => a + p[1], 0) / 4];
  const facings = P =>
    [
      [P[0], P[1]],
      [P[1], P[2]],
      [P[2], P[3]],
      [P[3], P[0]]
    ].map(mid);
  const TP = corners(T),
    Tc = [T.x, T.y];
  if (rh(R, 'Fluid Formation') && !A.garrison) {
    const arc = arcOf(A, Tc),
      a = ((A.facing || 0) * Math.PI) / 180,
      f = [Math.sin(a), Math.cos(a)],
      r = [Math.cos(a), -Math.sin(a)];
    const proj = (P, v) => {
      const c = cen(P);
      return (c[0] - A.x) * v[0] + (c[1] - A.y) * v[1];
    };
    if (arc === 'front')
      return ST.filter(s => s.rank === 0).map(s => ({ s, f0: mid([s.poly[0], s.poly[1]]) }));
    const v = arc === 'rear' ? [-f[0], -f[1]] : arc === 'right' ? r : [-r[0], -r[1]],
      mx = Math.max(...ST.map(s => proj(s.poly, v)));
    const edge = arc === 'rear' ? [2, 3] : arc === 'right' ? [3, 0] : [1, 2];
    return ST.filter(s => proj(s.poly, v) >= mx - 0.1).map(s => ({
      s,
      f0: mid([s.poly[edge[0]], s.poly[edge[1]]])
    }));
  }
  if (rh(R, 'Acute Senses') || A.garrison)
    return ST.filter(s => s.rank === 0).map(s => {
      const F = facings(s.poly);
      let b = F[0],
        bd = 1e9;
      F.forEach(q => {
        const d = ptPoly(q, TP)[0];
        if (d < bd) {
          bd = d;
          b = q;
        }
      });
      return { s, f0: b };
    });
  return ST.filter(s => s.rank === 0).map(s => ({ s, f0: mid([s.poly[0], s.poly[1]]) }));
}
function volleyStands(A, T) {
  const vr = volleyRange(A);
  if (!vr || !A || !T) return [];
  const R = vr.range,
    long = rh(RU(A).concat(fx(A)), 'Longshot'),
    sa = uSize(A),
    st = uSize(T),
    need = Math.max(sa, st);
  const TS = standsOf(T),
    others = all()
      .filter(
        o =>
          o.onTable &&
          !o.destroyed &&
          o.id !== A.id &&
          o.id !== T.id &&
          o.type !== 'marker' &&
          uSize(o) >= need
      )
      .map(o => ({ n: o.short || o.name, P: corners(o) }));
  const terr = terrainOf().filter(
    t => (tHas(t, 'Obstructing') || tHas(t, 'Garrison')) && tInfo(t).size >= need && !A.garrison
  );
  const samples = [];
  TS.forEach(s => {
    const P = s.poly;
    for (let i = 0; i < 4; i++) {
      const a = P[i],
        b = P[(i + 1) % 4];
      for (let k = 0; k < 4; k++)
        samples.push([a[0] + ((b[0] - a[0]) * k) / 4, a[1] + ((b[1] - a[1]) * k) / 4]);
    }
    samples.push([(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2]);
  });
  return volleyShooters(A, T).map(({ s, f0 }) => {
    const p = prof(A, s.kind, s.mod),
      pb = barrageOf(p.rules);
    if (!pb) return { s, tok: s.tok, none: true, inRange: false, clear: false };
    const R = rangeAdj(A, pb.range);
    let d = 1e9,
      q0 = null;
    TS.forEach(ts => {
      const r = ptPoly(f0, ts.poly);
      if (r[0] < d) {
        d = r[0];
        q0 = r[1];
      }
    });
    const pts = [q0]
      .concat(samples)
      .filter(q => q && Math.hypot(q[0] - f0[0], q[1] - f0[1]) <= R + 1e-6 && volleyArcOk(A, q));
    const inRange = pts.length > 0;
    let clear = false,
      blocker = '',
      best = null;
    for (const q of pts) {
      let b = '';
      for (const o of others)
        if (segPoly(f0, q, o.P)) {
          b = o.n;
          break;
        }
      if (!b)
        for (const t of terr) {
          if (inT(t, f0) || inT(t, q)) continue;
          if (segHits(t, f0, q)) {
            b = tInfo(t).name;
            break;
          }
        }
      if (!b) {
        clear = true;
        best = q;
        break;
      }
      if (!blocker) blocker = b;
    }
    const aim = best || q0;
    return {
      s,
      tok: s.tok,
      f0,
      to: aim,
      d,
      inRange,
      clear,
      blocker,
      arcing: rh(p.rules, 'Arcing Fire'),
      eff: inRange && (long || d <= R / 2 + 1e-6),
      arc: cArc(T, f0)
    };
  });
}

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
    sup = supportLost(A) ? 1 : rx(RU(A), 'Support') || 1;
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
      const eng =
          polyDist(s.poly, Tc) <= 0.35 ||
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
  const d = Math.max(
    offOn(T, 'shareR') && offNames(T).includes('Lochagos') ? 18 : 0,
    offOn(T, 'shareR') && offNames(T).includes('Captain') ? 12 : 0
  );
  if (!d) return 0;
  return Math.max(
    0,
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
function openCombat(o) {
  if (o && o.type === 'clashAfterNode') return clashAfterNode(o);
  if (o && Array.isArray(o.split) && splitStale(o)) return;
  setTimeout(() => {
    const c = $('combat');
    if (c && !c.hidden)
      try {
        revealIn(c);
      } catch (e) {}
  }, 120);
  if (o && o.type === 'volley' && o.tgt && o.att) {
    const T0 = byId(o.tgt),
      A0 = byId(o.att);
    if (T0 && A0 && fx(T0).some(x => /^Prowling/.test(x)) && polyDist(corners(A0), corners(T0)) >= 8) {
      toast('That regiment is Prowling: it cannot be seen from 8″ or more.');
      return;
    }
  }
  cb = Object.assign({ step: 'att', groups: null, cover: false, owner: HU }, o);
  if (cb.type === 'volley' && cb.tgt && rh((byId(cb.tgt) || {}).rules || [], 'Loose Formation'))
    cb.cover = true;
  if (cb.type === 'volley' && cb.tgt && cb.att) {
    const cv = tCover(byId(cb.att), byId(cb.tgt)),
      sure = (() => {
        const AA = byId(cb.att);
        return rh(RU(AA), 'Sureshot') || (AA.charName && rh(chRulesX(AA), 'Sureshot'));
      })();
    if (cv && !sure) {
      cb.cover = true;
      cb.coverWhy = cv;
    } else if (cv && sure) setTimeout(() => toast('Sureshot: no penalty for ' + cv + '.'), 30);
    cb.vst = volleyStands(byId(cb.att), byId(cb.tgt));
    const lo = cb.vst.some(v => v.inRange && v.clear)
      ? null
      : (cb.vst.find(v => v.inRange && v.blocker) || {}).blocker || 'terrain or a regiment';
    if (arcingOn(byId(cb.att)) || cb.arcing) {
      cb.arcing = true;
      act.arcUsed = true;
    } else if (lo) setTimeout(() => toast('Check Line of Sight: ' + lo + ' is in the way.'), 30);
  }
  if (cb.type === 'freform') {
    cb.hits = 0;
    cb.wounds = cb.preWounds;
    cb.step = cb.noMorale ? 'done' : 'mor';
    cb.extra = 0;
    cb.groups = [];
  } else if (cb.type === 'lethal') {
    cb.hits = cb.lethalHits;
    cb.step = 'def';
    cb.groups = [
      {
        label: cb.lethalLabel || 'Lethal Demise',
        n: cb.lethalHits,
        nUse: cb.lethalHits,
        hits: cb.lethalHits,
        ones: 0,
        red: cb.lethalRed || 0,
        rolls: null
      }
    ];
  } else if (cb.tgt) cb.groups = buildGroups(cb.type, byId(cb.att), byId(cb.tgt));
  renderCombat();
  renderCard();
  maybeAutoAI();
  try {
    revealIn($('combat'));
  } catch (e) {}
}
function maybeAutoAI() {
  if (PVP()) return;
  if (cb && !aiBusy && !autoRunning) {
    const A = base(cb.att);
    if (A && A.side === AI && cb.tgt) {
      setTimeout(async () => {
        if (autoRunning || aiBusy || !cb) return;
        autoRunning = true;
        try {
          await autoResolve();
        } finally {
          autoRunning = false;
        }
      }, 400);
    }
  }
}
let autoRunning = false;
function closeCombat() {
  if (PVP() && cb && cb.owner !== HU) return;
  if (cb && cb.inAct && act && act.cur && (act.cur.type === 'clash' || act.cur.type === 'volley'))
    act.cur = null;
  cb = null;
  renderCombat();
  render();
}

/* ---------- re-roll stacking (core rules + Para Bellum FAQ) ----------
   A die is re-rolled at most once. Opposing full re-rolls ("re-roll all fails" vs "re-roll all successes") cancel.
   Opposing partial re-rolls (e.g. re-roll 6s vs re-roll 1s) cancel. A full re-roll beats an opposing partial one. */
function rrPlan(src) {
  const fF = src.filter(x => x.k === 'fail' && !x.face),
    fP = src.filter(x => x.k === 'fail' && x.face),
    sF = src.filter(x => x.k === 'succ' && !x.face),
    sP = src.filter(x => x.k === 'succ' && x.face);
  const notes = [];
  let failAll = !!fF.length,
    succAll = !!sF.length,
    failF = fP.map(x => x.face),
    succF = sP.map(x => x.face);
  if (failAll && succAll) {
    notes.push(fF.map(x => x.src).join('/') + ' and ' + sF.map(x => x.src).join('/') + ' cancel out');
    failAll = succAll = false;
    failF = [];
    succF = [];
  } else {
    if (failAll && succF.length) {
      notes.push(fF[0].src + ' overrides ' + sP.map(x => x.src).join('/'));
      succF = [];
    }
    if (succAll && failF.length) {
      notes.push(sF[0].src + ' overrides ' + fP.map(x => x.src).join('/'));
      failF = [];
    }
    if (failF.length && succF.length) {
      notes.push(fP.map(x => x.src).join('/') + ' and ' + sP.map(x => x.src).join('/') + ' cancel out');
      failF = [];
      succF = [];
    }
  }
  return {
    failAll,
    succAll,
    failF,
    succF,
    notes,
    any: failAll || succAll || failF.length || succF.length,
    used: src
      .filter(
        x =>
          (x.k === 'fail' && (x.face ? failF.includes(x.face) : failAll)) ||
          (x.k === 'succ' && (x.face ? succF.includes(x.face) : succAll))
      )
      .map(x => x.src)
  };
}
function rrDie(v, ok, P) {
  const good = ok(v);
  return good ? P.succAll || P.succF.includes(v) : P.failAll || P.failF.includes(v);
}
function upgOf(u, re) {
  return (
    (u.abilities || []).some(a => re.test(String(a[0] || ''))) ||
    rh(u.charRules || [], re.source) ||
    (u.effects || []).some(e => re.test(e))
  );
}
function blessOk(u) {
  return (
    !!u &&
    u.blessedR !== (state.round || 1) &&
    (rh((u.rules || []).concat(fx(u)), 'Blessed') || rh(u.charRules || [], 'Blessed'))
  );
}
function noChargeReroll(u) {
  return fxHas(u, /Broken Ground|Snæstormur|no Charge re-roll/i);
}
function hitSources(g, parry) {
  const S = [];
  if (!parry) {
    if (g.flurry) S.push({ k: 'fail', src: 'Flurry' });
    if (g.fiend) S.push({ k: 'fail', src: 'Fiend Hunter' });
    if (g.opp) S.push({ k: 'fail', src: 'Opportunists' });
    if (g.blessed) S.push({ k: 'fail', src: 'Blessed' });
    if (g.eccentric) S.push({ k: 'fail', src: 'Eccentric Fighting Style' });
    if (g.reroll6) S.push({ k: 'fail', face: 6, src: 'Inspired/Aim (re-roll 6s)' });
    if (g.wrath) S.push({ k: 'fail', face: 6, src: 'Wrathful Momentum' });
    if (g.pt) S.push({ k: 'fail', face: 6, src: 'Professional Troops' });
    if (g.crop) S.push({ k: 'fail', face: 6, src: 'Crop Rotation' });
    if (g.marked) S.push({ k: 'fail', src: 'Designate Target (Marked)' });
  }
  return S;
}
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
  g.hits = hits + g.extra;
}
function rollDef(T) {
  const A = byId(cb.att) || base(cb.att);
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
        )
          dbl++;
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
  cb.anaN = Math.min(anaN, cb.wounds);
}
function moraleSources(T, mi) {
  const S = [],
    A = byId(cb.att) || base(cb.att) || {},
    iron = rh(RU(T), 'Iron Discipline');
  if (!iron && (mi.arc === 'left' || mi.arc === 'right')) S.push({ k: 'succ', src: 'flank attack' });
  if (!iron && (cb.groups || []).some(g => g.forceMor && g.hits))
    S.push({ k: 'succ', src: (A.charName || 'character') + ' (re-roll successful Morale)' });
  if (upgOf(T, /Glimmer of Faith/)) S.push({ k: 'fail', src: 'Glimmer of Faith' });
  if (fxHas(T, /^Echo in Eternity/)) S.push({ k: 'succ', src: 'Echo in Eternity (refused a Duel)' });
  if (fxHas(T, /^Refused a Duel/)) S.push({ k: 'succ', face: 1, src: 'Refused a Duel' });
  if (fxHas(T, /Pheromantic Drive/)) S.push({ k: 'fail', face: 6, src: 'Pheromantic Drive' });
  {
    const wl = supWl(T.side),
      S0 = supOf(T.side);
    if (
      S0 &&
      S0.k === 'Army of Lions' &&
      wl &&
      wl.onTable &&
      /Infantry/.test(T.cls || '') &&
      polyDist(corners(T), corners(wl)) <= 10
    )
      S.push({ k: 'fail', face: 6, src: 'Army of Lions' });
  }
  return S;
}
function rollMor(T) {
  const mi = moraleInfo(T, byId(cb.att));
  cb.mi = mi;
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
const DSHOWN = new Set();
function dieMini(v, cls, key) {
  const d = document.createElement('span');
  d.className = 'md';
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', 'Die showing ' + v);
  for (let i = 0; i < 9; i++) {
    const p = document.createElement('i');
    if (PIPS[v] && PIPS[v].includes(i)) p.className = 'on';
    d.appendChild(p);
  }
  const fresh = !key || !DSHOWN.has(key);
  if (key) DSHOWN.add(key);
  if (!(fresh && SET.diceAnim && animateDie(d, v, cls || '')))
    (cls || '')
      .split(' ')
      .filter(Boolean)
      .forEach(c => d.classList.add(c));
  return d;
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
function stepBox(t) {
  const s = document.createElement('div');
  s.className = 'cstep';
  const h = document.createElement('h3');
  h.textContent = t;
  s.appendChild(h);
  return s;
}
function cbtn(t, fn, who) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = t;
  b.onclick = fn;
  if (who) b.dataset.who = who;
  return b;
}
function ptext(t, cls) {
  const p = document.createElement('p');
  p.className = cls || 'hint';
  p.style.margin = '0';
  p.textContent = t;
  return p;
}
function renderCombat() {
  if (cb && !cb.uid) cb.uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  renderCombat0();
  /* when a new step appears (hits rolled, Defense rolled ...), scroll the side column to it */
  try {
    const steps = document.querySelectorAll('#combat .cstep'),
      k = (cb && cb.uid) + ':' + steps.length;
    if (cb && steps.length > 1 && renderCombat.stepKey !== k && renderCombat.stepUid === cb.uid)
      revealIn(steps[steps.length - 1]);
    renderCombat.stepKey = k;
    renderCombat.stepUid = cb && cb.uid;
  } catch (e) {}
  if (cb) cbGate();
  cbSync();
  if (act && !renderCombat.busy) {
    renderCombat.busy = true;
    try {
      renderCard();
    } catch (e) {
      console.error(e);
    }
    renderCombat.busy = false;
  }
}
function renderCombat0() {
  const box = $('combat');
  if (!cb) {
    box.hidden = true;
    if (cbQueue.length)
      setTimeout(() => {
        if (!cb && cbQueue.length) openCombat(cbQueue.shift());
      }, 150);
    return;
  }
  box.hidden = false;
  const body = $('cb-body');
  body.innerHTML = '';
  const A = byId(cb.att) || base(cb.att),
    T = cb.tgt ? byId(cb.tgt) : null,
    LBL = {
      clash: 'Clash',
      impact: 'Impact Attacks',
      volley: 'Volley',
      lethal: 'Lethal Demise',
      freform: 'Fighting Reform'
    };
  $('cb-title').textContent =
    (cb.dieFight ? 'Die Fighting! ' : '') +
    (cb.selfTitle || LBL[cb.type]) +
    ': ' +
    (A.short || A.name) +
    (T ? ' against ' + (T.short || T.name) : '') +
    (cb.pool && cb.pool[1] > 1 ? ' (pool ' + cb.pool[0] + ' of ' + cb.pool[1] + ')' : '');
  if (!T && cb.split === 'plan') {
    $('cb-title').textContent =
      'Clash: ' + (A.short || A.name) + ' against ' + cb.engIds.length + ' enemy regiments';
    renderSplit(body, A);
    return;
  }
  if (!T) {
    body.appendChild(
      ptext(
        cb.dieFight
          ? 'Die Fighting! Choose which enemy regiment in contact with its last stand it fights.'
          : 'Choose which engaged enemy regiment to attack.'
      )
    );
    const row = document.createElement('div');
    row.className = 'row';
    const nmC = e => e.short || e.name,
      dupe = n => (cb.choices || []).filter(i => byId(i) && nmC(byId(i)) === n).length > 1;
    (cb.choices || []).forEach(id => {
      const e = byId(id);
      if (!e) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost';
      b.dataset.who = cb.dieFight ? 'A' : 'O';
      let where = '';
      if (dupe(nmC(e))) {
        const D = (cb.choices || []).map(byId).filter(x => x && nmC(x) === nmC(e)),
          xs = D.map(x => px(x.x)),
          ys = D.map(x => py(x.y)),
          hor = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
        const k = hor ? px(e.x) : py(e.y),
          L = hor ? xs : ys,
          lo = Math.min(...L),
          hi = Math.max(...L);
        where =
          ' (' +
          (k <= lo + 0.5 ? (hor ? 'left' : 'top') : k >= hi - 0.5 ? (hor ? 'right' : 'bottom') : 'middle') +
          ' one on the map)';
      }
      b.textContent = nmC(e) + where;
      b.onmouseenter = () => {
        try {
          const g = document.querySelector('g[data-id="' + id + '"]');
          if (g) g.style.filter = 'drop-shadow(0 0 6px #FFE58A)';
        } catch (x) {}
      };
      b.onmouseleave = () => {
        try {
          const g = document.querySelector('g[data-id="' + id + '"]');
          if (g) g.style.filter = '';
        } catch (x) {}
      };
      b.onclick = () => {
        cb.tgt = id;
        if (cb.type !== 'lethal') cb.groups = buildGroups(cb.type, A, byId(id));
        renderCombat();
      };
      row.appendChild(b);
    });
    body.appendChild(row);
    return;
  }
  const sA = N(A.side),
    sT = N(T.side),
    arc = cb.type === 'volley' ? arcOf(T, [A.x, A.y]) : cArcU(T, A);
  if (cb.type === 'duel') {
    renderDuel(body);
    return;
  }
  if (cb.selfText) {
    body.appendChild(ptext(cb.selfText));
  } else if (cb.type === 'freform') {
    body.appendChild(
      ptext(
        `The Combat Reform test failed, so ${T.short || T.name} suffers ${cb.preWounds} wound${cb.preWounds > 1 ? 's' : ''}, one for each stand in contact with the enemy. Test Morale for them, record, then finish the reform.`
      )
    );
  } else if (cb.type === 'lethal') {
    body.appendChild(
      ptext(
        `${cb.lethalLost} ${A.short || A.name} stand${cb.lethalLost > 1 ? 's were' : ' was'} destroyed while in contact, so ${T.short || T.name} suffers ${cb.lethalHits} automatic Hits (Lethal Demise ${cb.lethalX} each). They hit the front arc, use no other special rules, and the wounds cause no Morale Tests.`
      )
    );
  } else {
    body.appendChild(
      ptext(
        `${A.short || A.name} strikes ${T.short || T.name} in the ${arc === 'left' || arc === 'right' ? 'flank' : arc}.` +
          (cb.type === 'volley' ? ' ' + volleySummary(cb.vst || [], cb.arcing) : '') +
          ' Dice counts are worked out from the stands in contact; change a count if the table says otherwise.'
      )
    );
  }
  if (cb.type !== 'lethal' && cb.type !== 'freform') {
    const s1 = stepBox('1 · ' + sA + ' rolls to hit');
    if (cb.type === 'volley') {
      const lab = document.createElement('label');
      lab.className = 'row hint';
      const x = document.createElement('input');
      x.type = 'checkbox';
      x.id = 'cb-cover';
      x.checked = cb.cover;
      x.disabled = cb.step !== 'att';
      x.dataset.who = 'A';
      x.onchange = () => {
        cb.cover = x.checked;
        renderCombat();
      };
      lab.append(
        x,
        document.createTextNode(
          'Target is in Cover or has Loose Formation (shots halved)' +
            (cb.coverWhy ? ' · Cover: ' + cb.coverWhy : '')
        )
      );
      s1.appendChild(lab);
    }
    cb.groups.forEach((g, gi) => {
      const row = document.createElement('div');
      row.className = 'grow';
      g.nUse = cb.type === 'volley' && cb.cover ? Math.ceil(g.n / 2) : g.n;
      const tags = ['hits on ' + g.hitOn + ' or less'];
      if (g.reroll6) tags.push('re-roll 6s');
      if (g.flurry) tags.push('Flurry');
      if (g.fiend) tags.push('Fiend Hunter');
      if (g.opp) tags.push('Opportunists');
      if (g.blessed) tags.push('Blessed');
      if (g.eccentric) tags.push('Eccentric Fighting Style');
      (g.rrNotes || []).forEach(t => tags.push(t));
      if (g.relentless) tags.push(cb.type === 'volley' ? 'Rapid Volley' : 'Relentless Blows');
      if (g.red)
        tags.push(
          (cb.type === 'impact' ? 'Brutal Impact' : cb.type === 'volley' ? 'Armor Piercing' : 'Cleave') +
            ' ' +
            g.red
        );
      if (g.smite) tags.push('Smite');
      if (g.flawless) tags.push(cb.type === 'volley' ? 'Precise Shot' : 'Flawless Strikes');
      if (g.deadly) tags.push(cb.type === 'volley' ? 'Deadly Shot' : 'Deadly Blades');
      if (g.linebreaker) tags.push('Linebreaker');
      const h = document.createElement('div');
      h.className = 'gl';
      const nm = document.createElement('b');
      nm.textContent = g.label + ' ';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.className = 'nin';
      inp.value = String(g.nUse);
      inp.disabled = cb.step !== 'att';
      inp.dataset.who = 'A';
      inp.setAttribute('aria-label', 'Dice for ' + g.label);
      inp.onchange = () => {
        const v = Math.max(0, parseInt(inp.value, 10) || 0);
        g.n = cb.type === 'volley' && cb.cover ? v * 2 : v;
        renderCombat();
      };
      h.append(nm, inp, document.createTextNode(' dice · ' + tags.join(' · ')));
      row.appendChild(h);
      if (g.rolls) {
        const dr = document.createElement('div');
        dr.className = 'drow';
        g.rolls.forEach((r, ri) =>
          dr.appendChild(
            dieMini(
              r.v,
              (r.hit ? 'hit' : 'miss') + (r.re ? ' re' : ''),
              cb.uid + 'h' + gi + '.' + ri + '.' + r.v + (r.re ? 'r' + r.first : '')
            )
          )
        );
        row.appendChild(dr);
        row.appendChild(
          ptext(
            g.hits +
              (g.hits === 1 ? ' hit' : ' hits') +
              (g.extra ? ` (${g.extra} extra from rolls of 1)` : '')
          )
        );
      }
      s1.appendChild(row);
    });
    if (cb.step === 'att' && cb.groups.some(g => g.blessable) && blessOk(base(cb.att)))
      s1.appendChild(blessAsk('A', sA));
    /* No Matter the Price (Spires Mutation), declared before rolling to hit */
    {
      const A0 = base(cb.att);
      if (
        cb.step === 'att' &&
        cb.type === 'clash' &&
        A0 &&
        A0.charName &&
        upgOf(A0, /No Matter the Price/) &&
        frRoles(A0).includes('Clone') &&
        !A0.nmtpUsed
      ) {
        const lab = document.createElement('label');
        lab.className = 'row hint bless-q';
        const x = document.createElement('input');
        x.type = 'checkbox';
        x.dataset.who = 'A';
        x.checked = !!cb.nmtp;
        x.onchange = () => {
          cb.nmtp = x.checked;
          renderCombat();
        };
        lab.append(
          x,
          document.createTextNode(
            `${sA}: No Matter the Price (once per game)? Every failed hit becomes a hit and costs this regiment 1 wound; no re-rolls.`
          )
        );
        s1.appendChild(lab);
      }
    }
    if (cb.step === 'att')
      s1.appendChild(
        cbtn(
          'Roll to hit (' + sA + ')',
          () => {
            const parry = hitParry(T);
            if (cb.blessA) {
              cb.groups.forEach(g => {
                if (g.blessable) g.blessed = true;
              });
              cb.blessUsedA = true;
            }
            if (cb.nmtp) cb.groups.forEach(g => (g.nmtp = true));
            cb.groups.forEach((g, gi) => rollHits(g, g.nUse, parry));
            if (cb.nmtp) {
              const A0 = base(cb.att),
                miss = cb.groups.reduce((a, g) => a + (g.nmtpMiss || 0), 0);
              state.units = state.units.map(x =>
                x.id === cb.att ? Object.assign({}, x, { nmtpUsed: true }) : x
              );
              if (miss)
                srQueue({
                  type: 'freform',
                  att: cb.att,
                  tgt: cb.att,
                  inAct: false,
                  resumeAct: false,
                  preWounds: miss,
                  selfTitle: 'No Matter the Price: ' + (A0.short || A0.name),
                  selfText: `${miss} failed hit${miss === 1 ? '' : 's'} became hits: ${A0.short || A0.name} suffers ${miss} wound${miss === 1 ? '' : 's'}. Morale Tests at the end of the action.`
                });
            }
            glimApply();
            cb.hits = cb.groups.reduce((a, g) => a + g.hits, 0);
            cb.wounds = 0;
            cb.extra = 0;
            cb.step = cb.hits ? 'def' : 'done';
            renderCombat();
          },
          'A'
        )
      );
    else s1.appendChild(ptext('Total: ' + cb.hits + (cb.hits === 1 ? ' hit' : ' hits'), 'tot'));
    body.appendChild(s1);
  }
  if (cb.step === 'att') return;
  if (cb.hits) {
    const s2 = stepBox('2 · ' + sT + ' rolls Defense');
    cb.groups
      .filter(g => g.hits)
      .forEach(g => {
        const gi = cb.groups.indexOf(g);
        const di = g.def || defInfo(T, A, g),
          row = document.createElement('div');
        row.className = 'grow';
        row.appendChild(
          ptext(
            `${g.hits} from ${g.label}: saves on Defense ${di.D} or Evasion ${di.E}, whichever is better` +
              (di.red ? ` (Defense lowered by ${di.red})` : '') +
              (di.front && rh(RU(T), 'Shield') && !g.linebreaker ? ' · Shield +1' : '') +
              (g.flawless ? ' · rolls of 1 to hit ignore Defense' : ''),
            'gl'
          )
        );
        if (g.drolls) {
          const dr = document.createElement('div');
          dr.className = 'drow';
          g.drolls.forEach((r, ri) =>
            dr.appendChild(
              dieMini(
                r.v,
                (r.save ? 'hit' : 'miss') + (r.re ? ' re' : ''),
                cb.uid + 'd' + gi + '.' + ri + '.' + r.v + (r.re ? 'r' + r.first : '')
              )
            )
          );
          row.appendChild(dr);
        }
        s2.appendChild(row);
      });
    const ten = rx((T.rules || []).concat(fx(T)), 'Tenacious') + (cb.type === 'volley' ? tenVol(RU(T)) : 0);
    if (ten)
      s2.appendChild(
        ptext(`Tenacious (${ten}): up to ${ten} failed save${ten > 1 ? 's count' : ' counts'} as a success.`)
      );
    cb.groups.forEach(g => (g.drrNotes || []).forEach(t => s2.appendChild(ptext(t))));
    if (cb.groups.some(g => g.forceDef && g.hits))
      s2.appendChild(
        ptext(
          (A.charName || 'The character') + ': ' + sT + ' must re-roll successful Defense against its hits.'
        )
      );
    if (cb.step === 'def' && (cb.type === 'clash' || cb.type === 'impact') && blessOk(base(cb.tgt)))
      s2.appendChild(blessAsk('T', sT));
    if (cb.step === 'def' && !cb.blessWait)
      s2.appendChild(
        cbtn(
          'Roll Defense (' + sT + ')',
          () => {
            if (cb.blessT) cb.blessUsedT = true;
            rollDef(T);
            cb.step = cb.type !== 'volley' && cb.type !== 'lethal' && cb.wounds ? 'mor' : 'done';
            renderCombat();
          },
          'T'
        )
      );
    else
      s2.appendChild(
        ptext(
          cb.wounds +
            (cb.wounds === 1 ? ' wound' : ' wounds') +
            (cb.tenacious ? `, after Tenacious saved ${cb.tenacious}` : '') +
            (cb.dbl ? ` (${cb.dbl} extra from Deadly)` : '') +
            (cb.brittle ? ` (${cb.brittle} save${cb.brittle > 1 ? 's' : ''} lost to Brittle)` : ''),
          'tot'
        )
      );
    body.appendChild(s2);
  }
  if (cb.step === 'def') return;
  if (cb.type !== 'volley' && cb.type !== 'lethal' && cb.wounds) {
    const mi = cb.mi || moraleInfo(T, A),
      s3 = stepBox('3 · ' + sT + ' tests Morale');
    if (mi.auto) {
      s3.appendChild(ptext('No Resolve: passes every Morale Test automatically.'));
      if (cb.step === 'mor') {
        cb.extra = 0;
        cb.step = 'done';
      }
    } else {
      s3.appendChild(
        ptext(
          `${cb.wounds} dice, pass on ${mi.R} or less (includes +${mi.bonus} for regiment size${mi.terr ? `, −${mi.terr} Terrifying` : ''})` +
            (mi.arc === 'rear' && !mi.iron ? '. Rear attack: every test fails.' : '.') +
            (() => {
              const P = rrPlan(moraleSources(T, mi));
              return (
                (P.used.length ? ' Re-rolls: ' + P.used.join(', ') + '.' : '') +
                (P.notes.length ? ' ' + P.notes.join('; ') + '.' : '')
              );
            })() +
            (mi.oblivious ? ' Oblivious: 1 wound per 2 failures.' : '') +
            (mi.indom ? ` Indomitable (${mi.indom}).` : '')
        )
      );
      if (cb.mrolls) {
        const dr = document.createElement('div');
        dr.className = 'drow';
        cb.mrolls.forEach((r, ri) =>
          dr.appendChild(
            dieMini(
              r.v,
              (r.pass ? 'hit' : 'miss') + (r.re ? ' re' : ''),
              cb.uid + 'm' + ri + '.' + r.v + (r.re ? 'r' + r.first : '')
            )
          )
        );
        s3.appendChild(dr);
      }
      if (cb.step === 'mor') {
        s3.appendChild(
          cbtn(
            'Roll Morale (' + sT + ')',
            () => {
              rollMor(T);
              cb.step = 'done';
              renderCombat();
            },
            'T'
          )
        );
        /* Oath Unbroken (Hundred Kingdoms Mastery): once per game, the Resolve test is passed automatically */
        if (upgOf(T, /Oath Unbroken/) && !base(T.id).oathUsed)
          s3.appendChild(
            cbtn(
              'Oath Unbroken: pass automatically (once per game)',
              async () => {
                cb.mrolls = [];
                cb.extra = 0;
                cb.mi = moraleInfo(T, byId(cb.att));
                cb.oath = true;
                cb.step = 'done';
                await putState({
                  units: state.units.map(x => (x.id === T.id ? Object.assign({}, x, { oathUsed: true }) : x))
                });
                renderCombat();
              },
              'T'
            )
          );
      } else
        s3.appendChild(
          ptext(
            cb.oath
              ? 'Oath Unbroken: the Resolve test is passed automatically.'
              : cb.extra + (cb.extra === 1 ? ' extra wound' : ' extra wounds') + ' from failed Morale',
            'tot'
          )
        );
    }
    body.appendChild(s3);
  }
  if (cb.step !== 'done') return;
  const tot = (cb.wounds || 0) + (cb.extra || 0);
  cb.total = tot;
  if (cb.type === 'freform' && cb.mi && cb.mi.auto) cb.extra = 0;
  const lost = woundState(T, (T.wounds || 0) + tot).lost - woundState(T).lost;
  const s4 = stepBox('Result');
  s4.appendChild(
    ptext(
      `${T.short || T.name} takes ${tot} wound${tot === 1 ? '' : 's'}` +
        (lost ? `, about ${lost} stand${lost > 1 ? 's' : ''} removed` : '') +
        '.',
      'tot'
    )
  );
  s4.appendChild(
    ptext(
      'Recording saves every roll and the wounds to the board. Claude checks casualty removal and Broken.'
    )
  );
  s4.appendChild(
    cbtn(
      cb.inAct || cb.fromCharge
        ? 'Finish the ' + ({ clash: 'Clash', impact: 'Charge', volley: 'Volley' }[cb.type] || 'action')
        : 'Record result',
      recordCombat,
      'O'
    )
  );
  body.appendChild(s4);
}
async function recordCombat() {
  if (!cb) return;
  if (cb.type === 'duel') return recordDuel();
  const S = {
    att: cb.att,
    tgt: cb.tgt,
    type: cb.type,
    groups: (cb.groups || []).map(g => ({ rolls: g.rolls })),
    mark: cb.mark,
    healFriend: cb.healFriend
  };
  const before = JSON.parse(JSON.stringify(base(cb.tgt) || {}));
  const c0 = cb;
  await recordCombat0();
  if (cb === c0) return;
  try {
    await srAfterCombat(S, before);
  } catch (e) {
    console.error(e);
  }
  try {
    await supAfterCombat(S, before);
  } catch (e) {
    console.error(e);
  }
}
async function recordCombat0() {
  if (!db || !state) {
    toast('The board is read-only in this view.');
    return;
  }
  if (PVP() && cb && cb.owner !== HU) return;
  if (cb.blessUsedA || cb.blessUsedT)
    state = Object.assign({}, state, {
      units: state.units.map(u =>
        (u.id === cb.att && cb.blessUsedA) || (u.id === cb.tgt && cb.blessUsedT)
          ? Object.assign({}, u, { blessedR: state.round || 1 })
          : u
      )
    });
  const A = base(cb.att),
    T = base(cb.tgt),
    tot = cb.total || 0,
    LBL = {
      clash: 'Clash',
      impact: 'Impact Attacks',
      volley: 'Volley',
      lethal: 'Lethal Demise',
      freform: 'Fighting Reform'
    };
  if (cb.type === 'lethal' && cb.lethalLabel) LBL.lethal = cb.lethalLabel;
  const sum = {
    type: cb.type,
    attacker: cb.att,
    target: cb.tgt,
    hits: cb.hits || 0,
    wounds: cb.wounds || 0,
    moraleExtra: cb.extra || 0,
    total: tot,
    tenacious: cb.tenacious || 0,
    moraleTarget: cb.mi ? cb.mi.R : null,
    groups: cb.groups.map(g => ({
      label: g.label,
      dice: g.nUse,
      hitOn: g.hitOn,
      rolls: (g.rolls || []).map(r => (r.re ? [r.first, r.v] : r.v)),
      hits: g.hits || 0,
      defense: (g.drolls || []).map(r => (r.re ? [r.first, r.v] : r.v)),
      saveD: g.def ? g.def.D : null,
      saveE: g.def ? g.def.E : null
    })),
    morale: (cb.mrolls || []).map(r => (r.re ? [r.first, r.v] : r.v))
  };
  if (T.type === 'marker') {
    const cap = cb.type === 'volley' ? 1 : /Heavy/.test(A.cls || '') ? 2 : 1,
      w = Math.min(tot, cap),
      dmg = Object.assign({ cs: 0, nord: 0 }, T.dmg || {});
    dmg[A.side] = (dmg[A.side] || 0) + w;
    const dd = dmg[A.side] >= 3;
    const unitsM = state.units.map(u =>
      u.id !== T.id
        ? u
        : Object.assign(
            {},
            u,
            { dmg, wounds: Math.max(dmg.cs, dmg.nord) },
            dd
              ? {
                  onTable: false,
                  destroyed: true,
                  destroyedRound: state.round,
                  destroyedBy: A.side,
                  status: 'Destroyed'
                }
              : {}
          )
    );
    const textM = `${LBL[cb.type]}, ${A.short || A.name} on ${T.name}: ${sum.hits} hits, ${sum.wounds} wounds, ${w} counted (a marker takes at most ${cap} per ${cb.type === 'volley' ? 'Volley' : 'attack'} from this regiment)${dd ? '. The marker is destroyed.' : '.'}`;
    try {
      const nextM = Object.assign({}, state, {
        units: unitsM,
        lastTitle: N(A.side) + ' · ' + LBL[cb.type],
        lastText: textM,
        updatedAt: Date.now()
      });
      await db.doc('game/state').set(sanitize(nextM));
      state = nextM;
      await db
        .collection('events')
        .doc('e' + Date.now())
        .set(Object.assign({ at: Date.now(), kind: 'combat', side: A.side }, sum));
      const inA = cb.inAct,
        resume = cb.resumeAct;
      cb = null;
      renderCombat();
      if (inA && act && act.cur) {
        act.cur.combat = sum;
        finishAction();
      } else if (resume && act && act.cur) finishAction();
      else render();
      toast('Result recorded.');
    } catch (e) {
      toast('The result could not be saved. Try again in a moment.');
    }
    return;
  }
  const AL = allocate(T, tot),
    newW = AL.w,
    dead = AL.dead;
  const lastStands = standsOf(T),
    foes = engaged(T).map(corners),
    touching = k =>
      lastStands.some(
        s =>
          (k === 'cmd' ? s.cmd && s.kind === 'reg' : s.kind === 'char') &&
          foes.some(c => polyDist(s.poly, c) <= 0.35)
      );
  const alwaysDF =
    !!T.charName && upgOf(T, /Bloody-Minded Focus|Strength and Honor|Convulsive/) && touching('char');
  const dieF =
    dead &&
    cb.type !== 'lethal' &&
    cb.type !== 'freform' &&
    ((!T.activated &&
      (((T.abilities || []).some(a => /Shield Biter/.test(a[0])) && touching('cmd')) ||
        (T.charName && !T.charActivated && touching('char')))) ||
      alwaysDF);
  /* Die Fighting: only against enemies touching the stand that fights (the character, or the Command Stand); the dying side picks if there are several */
  const dfKind = alwaysDF || (T.charName && !T.charActivated && touching('char')) ? 'char' : 'cmd',
    dfStand = lastStands.find(s => (dfKind === 'char' ? s.kind === 'char' : s.cmd && s.kind === 'reg'));
  const dfT =
    dieF && dfStand
      ? engaged(T)
          .filter(e => polyDist(dfStand.poly, corners(e)) <= 0.35)
          .map(e => e.id)
      : [];
  const dfOpen = o => {
    const tg = dfT.length ? dfT : [A.id];
    const pick = tg.length === 1 ? tg[0] : !PVP() && !SBX() && T.side === AI ? tg[0] : null;
    return Object.assign(
      { type: 'clash', att: T.id, tgt: pick, choices: tg, inAct: false, dieFight: true, forceContact: true },
      o || {}
    );
  };
  const dieLost =
    dead &&
    !dieF &&
    !T.activated &&
    ((T.abilities || []).some(a => /Shield Biter/.test(a[0])) || (T.charName && !T.charActivated));
  const chN = T.char != null ? 1 : 0,
    stBefore = live(T) - chN,
    stAfter = dead ? 0 : live(Object.assign({}, T, { wounds: newW, auxWounds: AL.aw })) - chN,
    stLost = Math.max(0, stBefore - stAfter);
  const ldX = Math.max(rx(RU(T), 'Lethal Demise'), T.aux != null ? rx(T.auxRules, 'Lethal Demise') : 0),
    ldHits0 = (cb.type === 'clash' || cb.type === 'impact') && !fxHas(A, /^Cure/) ? ldX * stLost : 0,
    caHits =
      cb.type === 'clash' && (rh(RU(T), 'Counter Attack') || rh(RU(T), 'Counter-Attack'))
        ? cb.groups.reduce((a, g) => a + (g.rolls || []).filter(r => r.v === 6).length, 0)
        : 0,
    ldHits = ldHits0 + caHits;
  /* a Catabolic Node also detonates when its regiment is destroyed (not when its own blast destroys it: it is already gone) */
  const nodeFoes =
    dead && offOn(T, 'node') && !(cb.lethalLabel === 'Catabolic Node' && cb.att === T.id)
      ? engaged(T).map(e => e.id)
      : [];
  let units = state.units.map(u =>
    u.id !== cb.tgt
      ? u.id === cb.att && cb.dieFight && A.dyingFight
        ? Object.assign({}, u, {
            onTable: false,
            destroyed: true,
            dyingFight: false,
            status: 'Destroyed',
            destroyedRound: state.round
          })
        : u
      : Object.assign(
          {},
          u,
          { wounds: newW, auxWounds: AL.aw },
          dead
            ? dieF
              ? { dyingFight: true, status: 'Destroyed · command stand may Die Fighting' }
              : { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
            : {}
        )
  );
  /* Abundant Harvest (Weaver Courts Gift): its Court of Autumn regiment destroys an enemy regiment, and every friendly
     regiment within 12″ gains a Seed Marker */
  let harvest = 0;
  if (
    dead &&
    !isMarker(T) &&
    A.charName &&
    upgOf(A, /Abundant Harvest/) &&
    frFac(A) === 'Weaver Courts' &&
    frRoles(A).includes('Court of Autumn')
  ) {
    const Ac = corners(A);
    units = units.map(x => {
      if (x.side !== A.side || !x.onTable || x.destroyed || x.type === 'marker') return x;
      if (x.id !== A.id && polyDist(Ac, corners(x)) > 12) return x;
      if ((+x.seeds || 0) >= 3) return x;
      harvest++;
      return Object.assign({}, x, { seeds: (+x.seeds || 0) + 1 });
    });
  }
  /* Blood (W'adrhŭn, Teaching of Death): the regiment heals 1 wound per enemy stand it destroys in a Clash, at most 5,
     once Morale Tests are done */
  let bloodN = 0;
  if (cb.type === 'clash' && stLost && A.charName && upgOf(A, /: Blood$/) && canHeal(A) && !A.destroyed) {
    bloodN = Math.min(5, stLost, +A.wounds || 0);
    if (bloodN)
      units = units.map(u =>
        u.id === A.id ? Object.assign({}, u, { wounds: (+u.wounds || 0) - bloodN }) : u
      );
  }
  const text =
    `${LBL[cb.type]}, ${A.short || A.name} on ${T.short || T.name}: ${sum.hits} hits, ${sum.wounds} wounds` +
    (sum.moraleExtra ? ` + ${sum.moraleExtra} from Morale` : '') +
    ` = ${tot}.` +
    (dead
      ? ` ${T.short || T.name} ${dieF ? 'is destroyed, but its last stand may Die Fighting first.' : 'is destroyed' + (dieLost ? '; no stand that could Die Fighting is touching an enemy, so none does.' : '.')}`
      : '') +
    (ldHits0
      ? ` Lethal Demise: ${stLost} stand${stLost > 1 ? 's' : ''} lost in contact, so ${A.short || A.name} suffers ${ldHits0} Hits.`
      : '') +
    (caHits
      ? ` Counter-Attack: ${caHits} attack roll${caHits > 1 ? 's' : ''} of 6 cause ${caHits} Hits on ${A.short || A.name}.`
      : '') +
    (cb.dieFight && A.dyingFight ? ` ${A.short || A.name} fought to the last and is removed.` : '') +
    (bloodN ? ` Blood: ${A.short || A.name} heals ${bloodN} wound${bloodN > 1 ? 's' : ''}.` : '') +
    (harvest
      ? ` Abundant Harvest: ${harvest} friendly regiment${harvest > 1 ? 's gain' : ' gains'} a Seed Marker.`
      : '');
  try {
    const nextS = Object.assign({}, state, {
      units,
      lastTitle: N(A.side) + ' · ' + LBL[cb.type] + (cb.dieFight ? ' (Die Fighting)' : ''),
      lastText: text,
      updatedAt: Date.now()
    });
    await db.doc('game/state').set(sanitize(nextS));
    state = nextS;
    await db
      .collection('events')
      .doc('e' + Date.now())
      .set(Object.assign({ at: Date.now(), kind: 'combat', side: A.side, dieFight: !!cb.dieFight }, sum));
    if (sum.type === 'freform' && act && act.cur && act.cur.type === 'withdraw') {
      cb = null;
      renderCombat();
      wdTurn();
      return;
    }
    if (sum.type === 'freform' && act && act.cur && act.cur.type === 'creform') {
      cb = null;
      act.cur.contact0 = crContact(act.cur);
      renderCombat();
      render();
      toast('Wounds recorded. Now reshape and press Done.');
      return;
    }
    const inA = cb.inAct,
      resume = cb.resumeAct,
      thenDie = cb.thenDie;
    cb = null;
    if (nodeFoes.length) nodeOnDeath(T, nodeFoes);
    if (ldHits) {
      if (inA && act && act.cur) act.cur.combat = sum;
      render();
      openCombat({
        type: 'lethal',
        att: T.id,
        tgt: A.id,
        inAct: false,
        resumeAct: inA || resume,
        lethalHits: ldHits,
        lethalX: ldX,
        lethalLost: stLost,
        selfTitle:
          ldHits0 && caHits
            ? 'Lethal Demise and Counter-Attack'
            : caHits
              ? 'Counter-Attack'
              : 'Lethal Demise',
        selfText:
          caHits && !ldHits0
            ? `${T.short || T.name} counter-attacks: ${A.short || A.name} suffers ${ldHits} automatic Hits to its front. No Morale Tests.`
            : undefined,
        thenDie: dead && dieF ? dfOpen() : null
      });
      toast(`Lethal Demise: ${A.short || A.name} suffers ${ldHits} Hits. Roll Defense for them.`);
      return;
    }
    if (thenDie) {
      render();
      openCombat(Object.assign({}, thenDie, { resumeAct: resume }));
      toast('Now the last stand Dies Fighting: roll that Clash.');
      return;
    }
    if (dead && dieF) {
      if (inA && act && act.cur) act.cur.combat = sum;
      render();
      openCombat(dfOpen({ resumeAct: inA }));
      toast(`${T.short || T.name} is destroyed. Its last stand Dies Fighting: roll that Clash now.`);
      return;
    }
    renderCombat();
    if (inA && act && act.cur) {
      act.cur.combat = sum;
      finishAction();
    } else if (resume && act && act.cur) {
      finishAction();
    } else render();
    toast('Result recorded.');
  } catch (e) {
    toast('The result could not be saved. Try again in a moment.');
  }
}
$('cb-close').onclick = closeCombat;
$('c-roll-go').onclick = () => {
  if (!selId) return;
  pick = { type: $('c-roll-type').value, att: selId };
  toast('Click the enemy regiment being attacked.');
};
function svgPt(ev) {
  const sv = $('board'),
    p = sv.createSVGPoint();
  p.x = ev.clientX;
  p.y = ev.clientY;
  return p.matrixTransform(sv.getScreenCTM().inverse());
}
$('board').addEventListener('pointerdown', ev => {
  if (aiBusy) return;
  const pt = svgPt(ev);
  if (state && ((state.step === 'review' && terrMode === 'manual') || (SBX() && tfTerr))) {
    terrainClick(pt, ev);
    return;
  }
  {
    const tg = ev.target.closest('g[data-tid]');
    if (tg && !ev.target.closest('g[data-id]') && !(act && act.cur) && !pick && !ruler) {
      const t = terrainOf()[+tg.getAttribute('data-tid')];
      if (t) {
        const I = tInfo(t);
        toast(
          I.name +
            ' · Size ' +
            I.size +
            ' · ' +
            I.kw.map(k => k + ' (' + TKWD[k].split(/[.;]/)[0].toLowerCase() + ')').join(' · ')
        );
      }
    }
  }
  if (ruler) {
    const gU = ev.target.closest && ev.target.closest('g[data-id]'),
      P = gU ? { id: gU.getAttribute('data-id') } : [ix(pt.x), iy(pt.y)];
    if (!rA || rB) {
      rA = P;
      rB = null;
      lastHover = null;
    } else rB = P;
    drawRuler();
    return;
  }
  const g = ev.target.closest('g[data-id]');
  if (!g) {
    return;
  }
  const id = g.getAttribute('data-id');
  if (
    act &&
    act.cur &&
    act.cur.type === 'charge' &&
    (act.cur.stage === 'target' || act.cur.stage === 'roll')
  ) {
    const t = byId(id);
    if (t && t.side !== ME) {
      selId = act.id;
      setChargeTarget(t);
      return;
    }
  }
  if (act && act.cur && act.cur.type === 'volley' && act.cur.stage === 'target') {
    const t = byId(id);
    if (t && t.side !== ME) {
      selId = act.id;
      act.cur.sel = t.id;
      render();
      const vw = volleyWhy(byId(act.id), t);
      if (vw) toast(vw);
      return;
    }
  }
  if (pick) {
    const t = byId(id),
      a = byId(pick.att);
    if (t && a && t.side !== a.side) {
      const p = pick;
      pick = null;
      openCombat({ type: p.type, att: p.att, tgt: t.id, inAct: false });
      return;
    }
  }
  selId = id;
  rightTab = 'reg';
  if (SBX() && !pick && !cb && !(act && act.id === id)) {
    const u = base(id);
    if (u && u.onTable && u.type !== 'marker') {
      tfDrag = { id, ox: ix(pt.x) - u.x, oy: iy(pt.y) - u.y, moved: false };
      $('board').setPointerCapture(ev.pointerId);
      return;
    }
  }
  if (
    act &&
    act.id === id &&
    ((act.entering && !act.placed) ||
      (act.cur &&
        (act.cur.moving || (act.cur.type === 'charge' && act.cur.stage === 'adjust' && !act.cur.animating))))
  ) {
    const u = byId(id);
    drag = { ox: ix(pt.x) - u.x, oy: iy(pt.y) - u.y };
    $('board').setPointerCapture(ev.pointerId);
  }
  render();
});
$('board').addEventListener('pointermove', ev => {
  const pt = svgPt(ev);
  if (ruler && rA && !rB) {
    drawRuler([ix(pt.x), iy(pt.y)]);
    return;
  }
  if (tfDrag) {
    const u = base(tfDrag.id);
    if (u) {
      u.x = Math.max(0, Math.min(72, Math.round((ix(pt.x) - tfDrag.ox) * 4) / 4));
      u.y = Math.max(0, Math.min(48, Math.round((iy(pt.y) - tfDrag.oy) * 4) / 4));
      tfDrag.moved = true;
      drawUnitsFast();
    }
    return;
  }
  if (!drag) return;
  setPose({ x: Math.round((ix(pt.x) - drag.ox) * 8) / 8, y: Math.round((iy(pt.y) - drag.oy) * 8) / 8 });
});
$('board').addEventListener('pointerup', () => {
  if (tfDrag) {
    const d = tfDrag;
    tfDrag = null;
    if (d.moved) putState({ units: state.units.slice() }).catch(() => {});
    else render();
    return;
  }
  drag = null;
  if (act && act.cur && (act.cur.type === 'march' || act.cur.withdraw) && act.cur.pending) {
    const c = act.cur;
    if (c.pending.amt > 0) c.segs.push(c.pending);
    c.pending = null;
    c.segStart = { x: act.pose.x, y: act.pose.y, facing: act.pose.facing, files: act.pose.files };
    render();
  }
});
$('rot-l').onclick = () => rot(-15);
$('rot-r').onclick = () => rot(15);
$('rot-180').onclick = () => rot(180);
$('f-less').onclick = () => form(-1);
$('f-more').onclick = () => form(1);
$('done-act').onclick = finishAction;
$('cancel-act').onclick = cancelAction;
$('abort').onclick = abort;
function toggleRuler(on) {
  ruler = on == null ? !ruler : !!on;
  $('ruler').setAttribute('aria-pressed', ruler);
  rA = rB = null;
  lastHover = null;
  drawRuler();
}
$('ruler').onclick = () => toggleRuler();
/* hotkey: R toggles the ruler, Escape turns it off (not while typing, not with Ctrl/Cmd/Alt, not under a menu page) */
document.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const tg = ev.target;
  if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable) return;
  if (mmCurrent()) return;
  if (ev.key === 'r' || ev.key === 'R') {
    ev.preventDefault();
    toggleRuler();
    toast(ruler ? 'Ruler on (R or Esc to turn off).' : 'Ruler off.');
  } else if (ev.key === 'Escape' && ruler) toggleRuler(false);
  else if (ev.key === '?') {
    ev.preventDefault();
    const dg = $('set-dlg');
    if (!(dg && dg.open)) openSettings('controls');
  }
});
$('set-open').onclick = () => openSettings();
$('mm-open').onclick = () => {
  if (mmCurrent() && !mmOverlay) {
    mmGo('home');
    return;
  }
  mmOverlay = !mmOverlay;
  mmPage = mmOverlay ? 'home' : null;
  render();
};
$('tab-reg').onclick = () => setTab('reg');
$('tab-army').onclick = () => setTab('army');
['tab-reg', 'tab-army'].forEach(id =>
  $(id).addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setTab(rightTab === 'reg' ? 'army' : 'reg');
      $(rightTab === 'reg' ? 'tab-reg' : 'tab-army').focus();
    }
  })
);
document.addEventListener('keydown', ev => {
  if (!act && SBX() && selId && !/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) {
    tfKey(ev);
    return;
  }
  if (!act || ev.target.tagName === 'INPUT') return;
  const u = byId(act.id);
  const k = ev.key;
  let dx = 0,
    dy = 0;
  if (k === 'ArrowLeft') dx = 0.5;
  if (k === 'ArrowRight') dx = -0.5;
  if (k === 'ArrowUp') dy = -0.5;
  if (k === 'ArrowDown') dy = 0.5;
  if (FLIP) {
    dx = -dx;
    dy = -dy;
  }
  if (dx || dy) {
    ev.preventDefault();
    setPose({ x: u.x + dx, y: u.y + dy });
  }
  if (k === 'q' || k === 'Q') rot(-15);
  if (k === 'e' || k === 'E') rot(15);
});
async function saveActivation() {
  const u = byId(act.id),
    G = geom(u),
    side = u.side;
  const units = (state.units || []).map(x =>
    x.id !== act.id
      ? x
      : Object.assign({}, x, u.order ? { order: u.order.slice() } : {}, {
          x: u.x,
          y: u.y,
          facing: u.facing,
          files: G.files,
          onTable: true,
          arriving: false,
          activated: true,
          arrivedRound: act.entering ? state.round : x.arrivedRound,
          effects: (x.effects || [])
            .filter(
              f =>
                !(
                  f === 'Broken' &&
                  act.actions.some(a => (a.type === 'rally' || a.type === 'crally') && !a.failed)
                )
            )
            .concat(
              act.extraFx.filter(f => !(x.effects || []).includes(f) && !/charged|Inspire action/.test(f))
            )
        })
  );
  (act.postFx || []).forEach(([id, src]) => {
    const i = units.findIndex(x => x.id === id);
    if (i >= 0 && !(units[i].effects || []).includes(src))
      units[i] = Object.assign({}, units[i], { effects: (units[i].effects || []).concat([src]) });
  });
  /* Lathander Sacrifice: the regiment is destroyed when the activation ends */
  if (act.lath) {
    const li = units.findIndex(x => x.id === act.id);
    if (li >= 0)
      units[li] = Object.assign({}, units[li], {
        onTable: false,
        destroyed: true,
        status: 'Destroyed (Lathander Sacrifice)',
        destroyedRound: state.round
      });
  }
  const FA = frAfterAct(act, units);
  {
    const gi = units.findIndex(x => x.id === act.id);
    if (gi >= 0) {
      const x = units[gi];
      if (act.occupyT) {
        const t = terrainOf().find(q => tId(q) === act.occupyT),
          d = t ? tInfo(t).def : 1;
        units[gi] = Object.assign({}, x, {
          garrison: act.occupyT,
          garrisonD: d,
          stats: Object.assign({}, x.stats, { D: (+x.stats.D || 0) + d })
        });
      }
      if (act.leaveT) {
        const d = +x.garrisonD || 0;
        units[gi] = Object.assign({}, x, {
          garrison: null,
          garrisonD: 0,
          stats: Object.assign({}, x.stats, { D: (+x.stats.D || 0) - d })
        });
      }
    }
  }
  const pts = act.actions.length
    ? [[act.actions[0].from.x, act.actions[0].from.y]].concat(act.actions.map(a => [a.to.x, a.to.y]))
    : [];
  const desc =
    act.actions
      .map(a =>
        a.type === 'charge'
          ? `Charge vs ${(base(a.target) || {}).short || a.target} at ${a.dist.toFixed(1)}″, rolled ${a.roll}${a.rerolled ? ' (re-rolled)' : ''}: ${a.result === 'failed' ? 'failed, moved ' + (a.moved || 0).toFixed(1) + '″' : 'contact on the ' + a.face}`
          : ACT[a.type].n + (a.dist != null ? ' ' + a.dist.toFixed(1) + '″' : '')
      )
      .join(', ') || 'no actions';
  const note = side === ME ? $('note').value.trim() : '';
  const pp =
    side === ME
      ? {
          strategicHeld: act.source === 'strategic' ? false : !!PS().strategicHeld,
          hammerUsed: !!PS().hammerUsed || act.actions.some(a => a.type === 'hammer')
        }
      : {};
  if (side === ME && Array.isArray(PS().huStack)) {
    if (yCard(act.card)) {
      const i = PS().huStack.indexOf(act.card);
      pp.huStack = PS().huStack.filter((c, j) => j !== i);
    } else {
      const own = 'u:' + act.id,
        used = act.card && act.card !== own && act.card[0] === 'u' ? act.card : own;
      pp.huStack = PS()
        .huStack.filter(c => c !== used)
        .map(c => (c === own ? used : c));
    }
    pp.huLastCard = 'u:' + act.id;
    if (act.source === 'strategic') pp.huHeld = null;
  }
  if (PVP() && side === ME) await savePS(pp);
  if (ovrMine()) myTurnStrat = true;
  const next = Object.assign(
    {},
    state,
    PVP() ? {} : pp,
    FA.fr ? { fr: FA.fr } : {},
    ovrMine() ? { ovr: Object.assign({}, state.ovr, { n: (+state.ovr.n || 1) - 1 }) } : {},
    {
      units,
      moves: pts.length > 1 ? [{ unit: act.id, path: pts }] : [],
      lastTitle:
        N(side) +
        ' · ' +
        u.name +
        (act.source === 'strategic'
          ? ' (Strategic Stack)'
          : act.source === 'entourage'
            ? ' (Entourage)'
            : ''),
      lastText: desc + (FA.notes.length ? '. ' + FA.notes.join('; ') : '') + (note ? '. Note: ' + note : ''),
      phase: 'Round ' + (state.round || 1) + ' · ' + (side === ME ? 'Your turn' : N(side) + ' acting'),
      updatedBy: side,
      updatedAt: Date.now()
    }
  );
  await db.doc('game/state').set(sanitize(next));
  state = next;
  await db
    .collection('events')
    .doc('e' + Date.now())
    .set({
      at: Date.now(),
      side,
      unit: act.id,
      source: act.source,
      entering: act.entering,
      actions: act.actions,
      note,
      final: { x: u.x, y: u.y, facing: u.facing, files: G.files }
    });
  act = null;
  render();
}
$('end').onclick = async () => {
  if (!act) return;
  if (cb && (cb.att === act.id || cb.tgt === act.id)) {
    toast('Resolve the dice in the combat panel first.');
    return;
  }
  if (act.cur) {
    toast('Finish or cancel the current action first.');
    return;
  }
  if (act.entering && !act.placed) {
    toast('Confirm the entry point first.');
    return;
  }
  if (!db) {
    toast('The board is read-only in this view, so nothing was saved.');
    return;
  }
  $('end').disabled = true;
  try {
    await saveActivation();
    $('note').value = '';
    toast('Activation saved. Activate an Entourage or other free play now, or press End turn.');
  } catch (e) {
    toast('The activation could not be saved. Try again in a moment.');
  } finally {
    $('end').disabled = false;
  }
};
$('air-close').onclick = () => {
  $('ai-report').hidden = true;
};
