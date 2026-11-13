/* Spellcasting: who knows what, targets, resolving spells and the casting panel. */
/* ---------- spells: data from the 2026 army lists ---------- */
/* fields: r range (0 = Self), a attunement (null = automatically cast, 'D' = target's Defense), s Scaling, t target (enemy/friend/self/any/zone/terrain),
   q requirement, h [hits per success, AP], hf [fixed hits, AP], nm no Morale, heal 's' per success or a number, g rules gained, st stat changes, cap stat caps,
   lbl label shown on the target, need successes needed, d effect text */
const SK_COURTS = {
  Fire: ['Burn to Cinders', 'Cauterize', 'Ignite', 'Searing Sandstorm', 'Molten Blades', 'Wreathed in Fire'],
  Air: ['Lifting Winds', 'Lightning Bolt', 'Homing Winds', 'Air Step', 'Cyclone', 'Wind Kissed Blades'],
  Earth: [
    'Sunder (the Land)',
    'Stabilize (the Pattern)',
    'Overwhelm (the Form)',
    'Reinforce (the Pattern)',
    'Hurl (the Earth)',
    'Reincarnate (the Self)'
  ],
  Water: [
    'Blood to Water',
    'Lammelar Flow',
    'Swirling Embrace',
    'Induced Hypoxia',
    'Flowing Stride',
    'Water to Blood'
  ]
};
const DW_SCHOOLS = {
  Fire: ['Coruscation', 'Fireball', 'Flamewall'],
  Magma: ['Magmatic Seep', 'Pyroclast', 'Eruption'],
  Earth: ['Broken Ground', 'Roots of Stone', 'Rock Shaping']
};
const HK_SCHOOLS = {
  Fire: ['Kindle Courage', 'Fire Dart'],
  Earth: ['Earth to Mud', 'Stone Spikes'],
  Water: ["Ninuah's Tears", 'Call Fog'],
  Air: ['Seeking Winds', 'Guide']
};
/* who knows what: fixed spells plus, for casters that choose, a school or court */
const CASTERS = {
  Shaman: { f: ['Blurred Vision', 'Mist Weave', 'Enrage', 'Reshape Destiny', 'Hoarfrost', 'Dominate'] },
  Volva: {
    f: [
      'Fruit of the Golden Tree',
      "Warbringer's Light",
      "Hela's Caress",
      'Glory of Valhalla',
      'Aspect of Fenrir'
    ]
  },
  'Ice Jotnar': { f: ['Encase', 'Rime Storm', 'Ice Armor'], reg: 1, free: 1 },
  Mechanist: { f: ['Aggression Directive', 'Clockwork Parade', 'Iron Stride', 'Torque'] },
  'Sacred Band': { f: ['Othismos', 'Molon Labe'], reg: 1, free: 1 },
  Promethean: { f: ['Temper Resolve', 'Quench Blades'], reg: 1, free: 1 },
  Hephaestian: { f: ['Trident Strike', "Crucible's Fire"], reg: 1, free: 1 },
  'Scion of Conquest': { f: ['Crescendo', 'Discordance', 'Dissonance', 'Resonance', 'Cacophony'] },
  Hierodeacon: {
    f: ['Dark Supplication', 'Blackflame Coruscation', 'Benediction of the Black Sun', 'Undying Devotion']
  },
  Archimandrite: { f: ["Hazlia's Touch", 'Dark Immolation', 'Blasphemous Power', 'Unholy Baptism'] },
  Theokrator: { f: ["Hazlia's Touch", 'Dark Immolation', 'Blasphemous Power', 'Unholy Baptism'] },
  Kheres: { f: ['Insanity', 'Drain Will'], reg: 1, free: 1, lvl: '2xstands' },
  Moroi: { f: ['Immolation', 'Translocation'], reg: 1, free: 1, lvl: '2xstands' },
  Maharajah: { sch: SK_COURTS, label: 'Court' },
  Sorcerer: { sch: SK_COURTS, label: 'Court' },
  Raj: { sch: SK_COURTS, label: 'Court' },
  'Trinavarta Chandavat': { f: ['Lifting Winds', 'Lightning Bolt'], reg: 1 },
  'Marid Sahar': { f: ['Blood to Water'], reg: 1, free: 1 },
  'Marid Apsara': { f: ['Blood to Water', 'Flowing Stride', 'Swirling Embrace'], reg: 1 },
  'Kitsune Onmyoji': {
    f: [
      'Iron Soul of Discipline',
      'Hesitation, Bane of Deeds',
      'Blossom in the Wind',
      'Misery of Failure Envisioned'
    ]
  },
  'Jorogumo Mahotsu': {
    f: ['Repose in Healing Spring', 'Honor, a Void of Self', 'Dancing Shadows', 'Witness of the Void'],
    reg: 1,
    extra: 1
  },
  'Seanchas Sidhe': {
    sch: {
      Summer: ['Disseminate', 'Dehydrate', 'Heat Haze', 'Propagate'],
      Winter: ['Dark of Winter', 'Armor of Rime', 'Mouldering Bloom', 'Heart of Winter']
    },
    label: 'Court'
  },
  'Chapter Mage': { f: ['Elemental Vortex', 'Elemental Missile'], sch: HK_SCHOOLS, label: 'School' },
  'Theist Priest': { f: ["Saint's Favour", 'Divine Sanction', 'Heavenly Blessing', 'Holy Fire', 'Fervour'] },
  'Ardent Kerawegh': { f: ['Fear', 'Dismay', 'Rancor', 'Resolve', 'Litanies of Battle'] },
  'Tempered Sorcerer': { sch: DW_SCHOOLS, label: 'School' },
  'Tempered Steelshaper': { f: ['Hone Blades', 'Temper Plate', 'Unmake Armor'] },
  'Lost Ancestor': { f: ['Litanies of Battle', 'Songs of the Descent'], sch: DW_SCHOOLS, label: 'School' }
};
function casterKey(u, asChar) {
  const n = asChar ? u.charName : frBase(u);
  return CASTERS[n] ? n : null;
}
function spellSchool(u, asChar) {
  if (asChar && supK(u.side) === 'Omnipotence') {
    const w = supWl(u.side);
    if (w && w.id !== u.id && w.charName) return spellSchool(w, true);
  }
  const k = casterKey(u, asChar),
    C = CASTERS[k];
  if (!C || !C.sch) return null;
  const key = asChar ? 'cschool' : 'school';
  const v = u[key];
  if (v && C.sch[v]) return v;
  if (asChar && k && SK_COURTS === C.sch) {
    const r = frRoles(u, true).find(x => /^Court of/.test(x));
    if (r && C.sch[r.replace('Court of ', '')]) return r.replace('Court of ', '');
  }
  return Object.keys(C.sch)[0];
}
function spellsOf(u, asChar) {
  if (asChar && (u.spells || []).length && !casterKey(u, true)) return u.spells;
  const k = casterKey(u, asChar);
  if (!k) return asChar ? u.spells || [] : [];
  const C = CASTERS[k],
    sc = spellSchool(u, asChar);
  const names = (C.f || []).concat(sc ? C.sch[sc] : []);
  return names
    .filter(n => SPELLDB[n])
    .map(n => {
      const S = SPELLDB[n];
      return {
        name: n,
        range: S.r,
        att: S.a,
        scaling: !!S.s,
        targets: S.t === 'enemy' ? 'enemy' : S.t === 'friend' ? 'friendly' : S.t,
        text: S.d,
        db: S
      };
    });
}
function magicLevel(u, asChar) {
  const k = casterKey(u, asChar);
  if (k && CASTERS[k].lvl === '2xstands') return Math.min(12, 2 * live(u));
  const R = asChar ? chRulesX(u) : RU(u);
  return rx(R || [], 'Priest') || rx(R || [], 'Wizard') || 0;
}
function regCaster(u) {
  const k = casterKey(u, false);
  return k && CASTERS[k].reg ? CASTERS[k] : null;
}
/* legal targets for a spell */
/* ===== Spell overlay on the board: the range around the caster's stand, legal targets outlined, enemies in range that
   the caster cannot see marked "no Line of Sight", and the chosen target highlighted. ===== */
let spellView = null;
function spellViewLive() {
  const v = spellView;
  if (!v) return null;
  const open = v.asChar
    ? charAct && charAct.id === v.uid
    : act && act.id === v.uid && act.cur && act.cur.type === 'cast';
  return open ? v : null;
}
function hull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
    lo = [],
    up = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.slice().reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/* the area within R inches of a (convex) outline */
function grownPoly(P, R) {
  const pts = [];
  P.forEach(v => {
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      pts.push([v[0] + Math.cos(a) * R, v[1] + Math.sin(a) * R]);
    }
  });
  return hull(pts);
}
function drawSpellZone(g) {
  const v = spellViewLive();
  if (!v || !g) return;
  const u = byId(v.uid),
    sp = v.sp;
  if (!u) return;
  const pts = q => q.map(p => px(p[0]) + ',' + py(p[1])).join(' '),
    cp = casterPoly(u);
  const S = sp.db || {},
    hits = (S.h || S.hf || /Hit/.test(sp.text || '')) && sp.targets === 'enemy',
    self = S.t === 'self' || sp.range === 0;
  if (!self) {
    const R = (sp.range || 12) + srRangeAdd(u) + itemSpellRange(u);
    el(
      'polygon',
      {
        points: pts(grownPoly(cp, R)),
        fill: '#B57CFF',
        'fill-opacity': 0.13,
        stroke: '#CDA6FF',
        'stroke-width': 2,
        'stroke-dasharray': '7 4'
      },
      g
    );
  }
  /* the caster's own stand */
  el('polygon', { points: pts(cp), fill: 'none', stroke: '#CDA6FF', 'stroke-width': 3 }, g);
  let legal = [];
  try {
    legal = spellTargets(u, sp);
  } catch (e) {}
  const ids = new Set(legal.map(t => t.id));
  legal.forEach(t =>
    el(
      'polygon',
      {
        points: pts(corners(t)),
        fill: 'none',
        stroke: t.id === v.ctx.target ? '#FFE07A' : '#8EE6A0',
        'stroke-width': t.id === v.ctx.target ? 4 : 2.5
      },
      g
    )
  );
  if (hits && !engaged(u).length) {
    const R = (sp.range || 12) + srRangeAdd(u) + itemSpellRange(u);
    all()
      .filter(
        t =>
          t.onTable &&
          !t.destroyed &&
          t.type !== 'marker' &&
          t.side !== u.side &&
          !ids.has(t.id) &&
          polyDist(cp, corners(t)) <= R + 1e-6
      )
      .forEach(t => {
        el(
          'polygon',
          {
            points: pts(corners(t)),
            fill: 'none',
            stroke: '#E57373',
            'stroke-width': 2.5,
            'stroke-dasharray': '4 3'
          },
          g
        );
        const tx = el(
          'text',
          {
            x: px(t.x),
            y: Math.max(...corners(t).map(q => py(q[1]))) + 14,
            'text-anchor': 'middle',
            fill: '#E57373',
            'font-size': 11,
            'font-weight': 700,
            stroke: '#1C2421',
            'stroke-width': 3,
            'paint-order': 'stroke'
          },
          g
        );
        tx.textContent = 'no Line of Sight';
      });
  }
}
function redrawSpellZone() {
  const g = $('spellg');
  if (!g) return;
  g.innerHTML = '';
  drawSpellZone(g);
}
/* Range, Line of Sight and Enemy Interference are measured from the spellcaster's own stand (core rules 2026):
   the character's stand when a character casts, the whole regiment when the regiment itself is the caster. */
function casterPoly(u) {
  if (u && u.charName && !regCaster(u)) {
    const s = standsOf(u).find(x => x.kind === 'char');
    if (s) return s.poly;
  }
  return corners(u);
}
/* Spells that cause Hits need Line of Sight: a line from the caster's stand to any point of the target that is not
   blocked by a regiment or Obstructing terrain of a Size equal to or larger than both the caster and the target. */
function spellLos(u, T) {
  const sa = uSize(u),
    st = uSize(T),
    P = casterPoly(u),
    from = P.concat([
      [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length]
    ]);
  const TC = corners(T),
    to = TC.concat(
      TC.map((p, i) => [(p[0] + TC[(i + 1) % 4][0]) / 2, (p[1] + TC[(i + 1) % 4][1]) / 2]),
      [[T.x, T.y]]
    );
  const walls = all()
    .filter(
      o =>
        o.onTable &&
        !o.destroyed &&
        o.id !== u.id &&
        o.id !== T.id &&
        o.type !== 'marker' &&
        uSize(o) >= Math.max(sa, st)
    )
    .map(o => ({ name: o.short || o.name, P: shrinkPoly(corners(o), 0.05) }));
  const terr = terrainOf().filter(x => {
    if (!tHas(x, 'Obstructing') && !tHas(x, 'Garrison')) return false;
    if (inT(x, [u.x, u.y]) || inT(x, [T.x, T.y])) return false;
    const I = tInfo(x);
    return I.size >= sa && I.size >= st;
  });
  let by = null;
  for (const a of from)
    for (const b of to) {
      const w = walls.find(W => segPolyHit(a, b, W.P));
      if (w) {
        by = by || w.name;
        continue;
      }
      const x = terr.find(X => segHits(X, a, b));
      if (x) {
        by = by || tInfo(x).name;
        continue;
      }
      return { ok: true };
    }
  return { ok: false, by };
}
function spellTargets(u, sp) {
  const S = sp.db || {},
    cp = casterPoly(u);
  if (S.t === 'self' || S.t === 'zone' || S.t === 'terrain' || sp.range === 0) return [u];
  const eng = engaged(u).map(byId).filter(Boolean),
    hits = S.h || S.hf || /Hit/.test(sp.text || '');
  let C = all().filter(
    t =>
      t.onTable &&
      !t.destroyed &&
      t.type !== 'marker' &&
      (S.t === 'any' ? true : sp.targets === 'enemy' ? t.side !== u.side : t.side === u.side) &&
      polyDist(cp, corners(t)) <= (sp.range || 12) + srRangeAdd(u) + itemSpellRange(u) + 1e-6
  );
  C = C.concat(srTether(u, sp, C));
  if (u.warlord && supAct(u.side, 'Divine Protection') && sp.targets !== 'enemy' && sp.range !== 0)
    C = all().filter(t => t.onTable && !t.destroyed && t.type !== 'marker' && t.side === u.side);
  /* hit spells need Line of Sight; an engaged caster may only target the enemy it fights, and counts as seeing it */
  if (hits && sp.targets === 'enemy') C = C.filter(t => spellLos(u, t).ok);
  if (eng.length && hits && sp.targets === 'enemy') C = eng;
  const q = S.q;
  if (q)
    C = C.filter(t =>
      q === 'nonmonster'
        ? t.type !== 'monster'
        : q === 'Infantry'
          ? /Infantry/.test(t.cls || '')
          : q === 'Brute'
            ? /Brute/.test(t.cls || '')
            : q === 'Automaton'
              ? rh(t.rules, 'Automaton')
              : q === 'modular'
                ? !!t.mods
                : q === 'inzone'
                  ? zonesOf().some(z => standsOf(t).some(st => inZone(st.poly, z)))
                  : q.startsWith('name:')
                    ? new RegExp(q.slice(5)).test(t.name)
                    : q.startsWith('fx:')
                      ? fx(t).some(e => e.startsWith(q.slice(3)))
                      : frRoles(t).includes(q) || (t.charName && frRoles(t, true).includes(q))
    );
  if (!hits) C = C.filter(t => !hasSpell(t, sp.name));
  if (sp.req === 'automaton') C = C.filter(t => rh(t.rules, 'Automaton'));
  if (sp.req === 'nonmonster') C = C.filter(t => t.type !== 'monster');
  return C;
}
function spellNeed(sp, T) {
  const S = sp.db || {};
  if (S.a === null) return 0;
  const n = live(T);
  return (
    (S.need || 2) +
    (sp.scaling ? (n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0) + (T.type === 'monster' ? 1 : 0) : 0)
  );
}
/* Hits from a spell: Defense rolls, then Morale */
function spellHitRes(T, hits, ap, noMorale) {
  if (rh(RU(T), 'Loose Formation')) hits = Math.ceil(hits / 2);
  const D = Math.max(0, (+T.stats.D || 0) - (ap || 0)),
    E = +T.stats.E || 0,
    sv = Math.max(D, E);
  const dr = [];
  let w = 0;
  for (let i = 0; i < hits; i++) {
    const d = d6();
    dr.push(d);
    if (!(d <= sv && d !== 6) || d === 6) w++;
  }
  let mw = 0;
  const mr = [];
  const MI = moraleInfo(T, T),
    R = MI.R,
    auto = noMorale || MI.auto || rh(RU(T), 'Fearless') || rh(RU(T), 'Oblivious');
  if (w && !auto && R > 0) {
    for (let i = 0; i < w; i++) {
      const d = d6();
      mr.push(d);
      if (d > R || d === 6) mw++;
    }
  }
  return {
    hits,
    w: w + mw,
    txt:
      `${hits} Hit${hits === 1 ? '' : 's'}${ap ? ' (AP ' + ap + ')' : ''}; Defense rolls ${dr.join(', ')} (saves on ${sv} or less) → ${w} wound${w === 1 ? '' : 's'}` +
      (mr.length
        ? `; Morale rolls ${mr.join(', ')} (passes on ${R} or less) → ${mw} more wound${mw === 1 ? '' : 's'}`
        : auto && w
          ? '; no Morale Test'
          : '') +
      ` = ${w + mw} wound${w + mw === 1 ? '' : 's'} in total`
  };
}
/* apply a successful spell */
async function resolveSpell(cid, sp, tid, succ, asChar) {
  lastSpellSucc = succ;
  const r = await resolveSpell0(cid, sp, tid, succ, asChar);
  try {
    const c0 = base(cid),
      t0 = base(tid);
    if (
      asChar &&
      c0 &&
      t0 &&
      t0.side === c0.side &&
      upgOf(c0, /Kabuki/) &&
      !hasGrant(t0, 'Kabuki (any Ideal Card)')
    )
      await putState({
        units: state.units.map(x => (x.id === t0.id ? grantU(x, 'Kabuki (any Ideal Card)', []) : x))
      });
  } catch (e) {}
  try {
    await srAfterSpell(cid, sp, tid, asChar);
  } catch (e) {}
  try {
    const u = base(cid),
      T = base(tid);
    if (
      asChar &&
      u &&
      T &&
      supAct(u.side, 'The Spirit Shines') &&
      (frRoles(u, true).includes('Theist') || /Theist|Priest/.test(u.charName || '')) &&
      T.side === u.side &&
      supRoles(T).includes('Theist')
    ) {
      for (const x of state.units.filter(
        x => x.side === u.side && x.id !== T.id && srAlive(x) && supRoles(x).includes('Theist')
      ))
        await resolveSpell0(cid, sp, x.id, succ, asChar);
    }
  } catch (e) {}
  return r;
}
async function resolveSpell0(cid, sp, tid, succ, asChar) {
  const u = byId(cid),
    T = byId(tid) || u,
    S = sp.db || {},
    nm = t => t.short || t.name,
    src = 'Spell: ' + sp.name;
  let units = state.units.slice(),
    parts = [],
    extra = {};
  const doHits = (t, n, ap, noM) => {
    if (n <= 0) return;
    const R = spellHitRes(byId(t.id) || t, n, ap, noM || S.nm);
    units = hurt(units, t.id, R.w);
    parts.push(nm(t) + ': ' + R.txt);
  };
  if (!sp.db) {
    units = units.map(x =>
      x.id === T.id
        ? grantU(
            x,
            src + (sp.effect && sp.effect !== sp.name ? ' (' + String(sp.effect).slice(0, 60) + ')' : ''),
            [],
            null
          )
        : x
    );
    parts.push('effect noted on ' + nm(T));
  }
  if (S.h && S.x !== 'blackflame') doHits(T, S.h[0] * succ, S.h[1]);
  if (S.hf) doHits(T, S.hf[0], S.hf[1]);
  if (S.heal) {
    const n = S.heal === 's' ? succ : S.heal;
    units = units.map(x =>
      x.id === T.id ? Object.assign({}, x, { wounds: Math.max(0, (+x.wounds || 0) - n) }) : x
    );
    parts.push(nm(T) + ' heals ' + n);
  }
  if ((S.g || S.st || S.lbl) && !S.h && !S.hf) {
    units = units.map(x =>
      x.id === T.id ? grantU(x, S.lbl ? src + ' · ' + S.lbl : src, S.g || [], S.st || null) : x
    );
    if (S.cap && S.st)
      units = units.map(x => {
        if (x.id !== T.id) return x;
        const st = Object.assign({}, x.stats);
        Object.entries(S.cap).forEach(([k, m]) => {
          if (+st[k] > m) {
            const d = +st[k] - m;
            st[k] = m;
            const g = (x.temp || []).find(gg => gg.src.startsWith(src));
            if (g && g.d) g.d[k] = (g.d[k] || 0) - d;
          }
        });
        return Object.assign({}, x, { stats: st });
      });
    parts.push(
      nm(T) +
        ': ' +
        (S.lbl ||
          (S.g || []).join(', ') ||
          Object.entries(S.st || {})
            .map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + k)
            .join(', '))
    );
  } else if (S.lbl && (S.h || S.hf))
    units = units.map(x => (x.id === T.id && !x.destroyed ? grantU(x, src + ' · ' + S.lbl, [], null) : x));
  switch (S.x) {
    case 'enrage': {
      const cp = corners(u);
      units = units.map(x =>
        x.side === u.side && x.onTable && polyDist(cp, corners(x)) <= 12
          ? Object.assign({}, x, { effects: (x.effects || []).filter(e => e !== 'Broken') })
          : x
      );
      parts.push('friendly regiments within 12″ Rally (Broken removed)');
      break;
    }
    case 'crescendo': {
      const g = frG(u.side, 'wa');
      extra.fr = frPatch(u.side, 'wa', { seq: (g.seq || []).concat(['Conquest']).slice(-3) });
      parts.push('adds a Conquest Chant Marker');
      break;
    }
    case 'supplication': {
      const g = frG(u.side, 'od');
      extra.fr = frPatch(u.side, 'od', { dark: (+g.dark || 0) + 1 });
      parts.push('+1 Dark Power');
      break;
    }
    case 'blackflame': {
      const tr = Math.max(odTier(u.side, 'dark'), odTier(u.side, 'pant'));
      parts.push(succ + ' success' + (succ === 1 ? '' : 'es') + ' + Empowerment Tier ' + tr);
      doHits(T, succ + tr, 0);
      break;
    }
    case 'hazlia': {
      const t = odTier(u.side, 'dark'),
        n = t + (/Legion|Creed/.test(frRoles(T).join()) ? 1 : 0);
      units = units.map(x =>
        x.id === T.id ? Object.assign({}, x, { wounds: Math.max(0, (+x.wounds || 0) - n) }) : x
      );
      parts.push(nm(T) + ' heals ' + n);
      break;
    }
    case 'bloodwater': {
      if (
        engaged(T)
          .map(byId)
          .some(e => e && frRoles(e).includes('Court of Water'))
      )
        doHits(T, +T.stats.R || 2, 0);
      break;
    }
    case 'lightning': {
      if (
        engaged(T)
          .map(byId)
          .some(e => e && frRoles(e).includes('Court of Air'))
      )
        doHits(T, +T.stats.D || 0, 0);
      break;
    }
    case 'liftwinds': {
      const cp = corners(u);
      units = units.map(x =>
        x.side === u.side &&
        x.onTable &&
        polyDist(cp, corners(x)) <= 12 &&
        frRoles(byId(x.id) || x).includes('Court of Air')
          ? grantU(x, src, ['Unstoppable'], null)
          : x
      );
      parts.push('Court of Air regiments within 12″ gain Unstoppable');
      break;
    }
    case 'ironsoul': {
      units = units.map(x =>
        x.id === T.id
          ? grantU(x, src, ['Untouchable'].concat(live(T) < (T.stands || 0) ? ['Tenacious (1)'] : []), null)
          : x
      );
      parts.push(nm(T) + ' gains Untouchable');
      break;
    }
    case 'propagate': {
      parts.push(
        'move the Seed Markers yourself (Seed −1 on ' + nm(T) + ', +1 on up to three friends within 8″)'
      );
      break;
    }
    case 'flamewall': {
      if (succ >= 4)
        units = units.map(x =>
          x.id === T.id && !x.destroyed ? grantU(x, src + ' · in Hindering terrain', [], null) : x
        );
      break;
    }
    case 'roots': {
      units = units.map(x =>
        x.id !== T.id
          ? x
          : T.side === u.side
            ? grantU(x, src, ['Counter-Attack', 'Parry'], null)
            : grantU(x, src, [], { M: -2 })
      );
      parts.push(T.side === u.side ? nm(T) + ' gains Counter-Attack and Parry' : nm(T) + ' −2 March');
      break;
    }
    case 'rockshape': {
      const g = frG(u.side, 'dw');
      extra.fr = frPatch(u.side, 'dw', { ep: Math.min(10, (+g.ep || 0) + 1) });
      parts.push('+1 Elemental Power');
      break;
    }
    case 'hone': {
      const tp = frRoles(T).includes('Tempered');
      units = units.map(x =>
        x.id === T.id
          ? grantU(x, src + (tp ? '' : ' · re-roll Clash hits of 6'), tp ? ['Deadly Blades'] : [], null)
          : x
      );
      parts.push(nm(T) + (tp ? ' gains Deadly Blades' : ' re-rolls Clash hits of 6'));
      break;
    }
    case 'resolve': {
      const n = Math.min(3, Math.floor(succ / 2));
      if (n) units = units.map(x => (x.id === T.id ? grantU(x, src, ['Indomitable (' + n + ')'], null) : x));
      parts.push(nm(T) + ' gains Indomitable (' + n + ')');
      break;
    }
    case 'songs': {
      const cp = corners(u),
        n = Math.min(
          6,
          all().filter(
            x => x.side === u.side && x.onTable && hasGrant(x, 'Awakened') && polyDist(cp, corners(x)) <= 12
          ).length
        );
      doHits(T, 1 + n, 0);
      break;
    }
  }
  if (S.t === 'zone' || S.t === 'terrain')
    parts.push(
      'apply it to the chosen ' +
        (S.t === 'zone' ? 'Objective Zone' : 'terrain piece') +
        ' yourself: ' +
        sp.text
    );
  if (!hasSpell(units.find(x => x.id === T.id) || {}, sp.name) && !(S.h || S.hf))
    units = units.map(x => (x.id === T.id ? grantU(x, src, [], null) : x));
  await putState(
    Object.assign({ units, lastTitle: N(u.side) + ' · ' + sp.name, lastText: parts.join('; ') + '.' }, extra)
  );
  return parts.join('; ');
}
/* the casting panel, shared by characters and spellcasting regiments */
function spellBox(box, u, asChar, ctx, onDone) {
  const sps = spellsOf(u, asChar),
    lvl = magicLevel(u, asChar);
  const ck = casterKey(u, asChar),
    C = CASTERS[ck] || {};
  if (C.sch) {
    const r = document.createElement('div');
    r.className = 'row';
    const lb = document.createElement('span');
    lb.className = 'tf-l';
    lb.textContent = (C.label || 'School') + ':';
    const s = document.createElement('select');
    s.setAttribute('aria-label', C.label || 'School');
    Object.keys(C.sch).forEach(k => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = k;
      s.appendChild(o);
    });
    s.value = spellSchool(u, asChar);
    s.onchange = () => {
      putState({
        units: state.units.map(x =>
          x.id === u.id ? Object.assign({}, x, { [asChar ? 'cschool' : 'school']: s.value }) : x
        )
      });
      ctx.spell = 0;
      ctx.rolls = null;
    };
    r.append(lb, s);
    box.appendChild(r);
  }
  if (!sps.length || !lvl) {
    box.appendChild(ptext('No spells to cast.'));
    return false;
  }
  const castSoFar = ctx.cast || [];
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Spell');
  sps.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    const S = s.db || {};
    o.textContent = `${s.name} (${s.range === 0 ? 'Self' : s.range + '″'}, ${S.a === null ? 'automatic' : 'Attunement ' + (S.a === 'D' ? '= Defense' : s.att)}${s.scaling ? ', Scaling' : ''})`;
    sel.appendChild(o);
  });
  sel.value = String(ctx.spell || 0);
  sel.onchange = () => {
    ctx.spell = +sel.value;
    ctx.target = null;
    ctx.rolls = null;
    render();
  };
  box.appendChild(sel);
  const sp = sps[ctx.spell || 0];
  if (!sp) return false;
  /* show this spell's range and targets on the board */
  spellView = { uid: u.id, sp, ctx, asChar };
  requestAnimationFrame(redrawSpellZone);
  box.appendChild(ptext(sp.text || ''));
  if (castSoFar.includes(sp.name)) {
    box.appendChild(ptext('Already cast this activation.', 'warn'));
    return false;
  }
  const cands = spellTargets(u, sp);
  if (!cands.length) {
    const S0 = sp.db || {},
      hitSp = (S0.h || S0.hf || /Hit/.test(sp.text || '')) && sp.targets === 'enemy';
    box.appendChild(
      ptext(
        hitSp
          ? 'No legal target: no enemy in range that the caster can see (spells that cause Hits need Line of Sight).'
          : 'No legal target in range.'
      )
    );
    return false;
  }
  if (!ctx.target || !cands.some(c => c.id === ctx.target)) ctx.target = cands[0].id;
  if (cands.length > 1 || cands[0].id !== u.id) {
    const ts = document.createElement('select');
    ts.setAttribute('aria-label', 'Spell target');
    const cp = corners(u);
    cands.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent =
        (c.short || c.name) +
        (c.side !== u.side ? ' (enemy)' : '') +
        ' · ' +
        polyDist(cp, corners(c)).toFixed(1) +
        '″';
      ts.appendChild(o);
    });
    ts.value = ctx.target;
    ts.onchange = () => {
      ctx.target = ts.value;
      ctx.rolls = null;
      render();
    };
    box.appendChild(ts);
  }
  const T = byId(ctx.target),
    S = sp.db || {};
  const caster = t =>
    rx(t.rules, 'Priest') ||
    rx(t.rules, 'Wizard') ||
    (t.charName && (rx(t.charRules, 'Priest') || rx(t.charRules, 'Wizard'))) ||
    (CASTERS[frBase(t)] && CASTERS[frBase(t)].reg);
  const cp = casterPoly(u),
    interf = all().some(
      t =>
        t.onTable &&
        t.side !== u.side &&
        caster(t) &&
        (polyDist(cp, casterPoly(t)) <= 10 || polyDist(corners(T), casterPoly(t)) <= 10)
    );
  const talos = all().filter(
    t =>
      t.onTable &&
      t.side === u.side &&
      (t.abilities || []).some(a => /Blood of the Forge God/.test(a[0])) &&
      polyDist(cp, corners(t)) <= 10
  ).length;
  const auto =
    S.a === null ||
    (rh(T.rules, 'Gifted Mortals') && T.side === u.side && asChar) ||
    (asChar && charAct && charAct.autoWin);
  const att = (S.a === 'D' ? +T.stats.D || 0 : sp.att) - (interf ? 1 : 0),
    dice = lvl + talos + srSpellDice(u, asChar),
    need = srNeed(u, asChar, spellNeed(sp, T));
  const devout = rh(T.rules, 'Devout') || (T.charName && rh(T.charRules || [], 'Devout')),
    vortex = T.side !== u.side && fx(T).some(e => /Elemental Vortex/.test(e));
  const go = succ => {
    ctx.done = true;
    resolveSpell(u.id, sp, T.id, succ, asChar).then(line =>
      onDone({ spell: sp.name, target: T.id, line, success: true })
    );
  };
  if (auto) {
    box.appendChild(
      ptext(
        rh(T.rules, 'Gifted Mortals')
          ? 'Gifted Mortals: the spell succeeds automatically.'
          : 'This spell is cast automatically.'
      )
    );
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Cast ' + sp.name;
    b.onclick = () => {
      b.disabled = true;
      go(Math.max(need, 2));
    };
    box.appendChild(b);
    return true;
  }
  box.appendChild(
    ptext(
      `${dice} dice (Magic Level ${lvl}${talos ? ' +' + talos + ' Blood of the Forge God' : ''}), success on ${att} or less${interf ? ' (−1: enemy spellcaster within 10″)' : ''}. Needs ${need} successes${devout && T.side === u.side ? '; Devout turns one failed die into a success' : ''}${vortex ? '; Elemental Vortex removes 2 successes' : ''}.`
    )
  );
  if (!ctx.rolls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Cast ' + sp.name;
    b.onclick = () => {
      ctx.rolls = Array.from({ length: dice }, d6);
      render();
    };
    box.appendChild(b);
    return true;
  }
  const dr = document.createElement('div');
  dr.className = 'drow';
  let succ = 0;
  ctx.rolls.forEach(v => {
    const s = v === 1 || (v <= att && v !== 6);
    if (s) succ++;
    dr.appendChild(dieMini(v, s ? 'hit' : 'miss'));
  });
  box.appendChild(dr);
  succ += srBrand(u, sp, T);
  if (devout && T.side === u.side && succ < dice) succ++;
  if (vortex) succ = Math.max(0, succ - 2);
  const won = succ >= need;
  box.appendChild(
    ptext(
      `${succ} success${succ === 1 ? '' : 'es'}: ${won ? 'the spell is cast.' : 'the spell fails.'}`,
      'tot'
    )
  );
  const ap = document.createElement('button');
  ap.type = 'button';
  ap.className = 'btn';
  ap.textContent = won ? 'Apply ' + sp.name : 'Spell failed: continue';
  ap.onclick = () => {
    ap.disabled = true;
    if (won) go(succ);
    else {
      nullMage(u);
      onDone({
        spell: sp.name,
        target: T.id,
        line: sp.name + ' failed (' + succ + '/' + need + ')',
        success: false
      });
    }
  };
  box.appendChild(ap);
  return true;
}
/* Claude casting: pick and resolve without the panel */
async function aiCastSpell(u, asChar, spellName, targetId) {
  const sps = spellsOf(u, asChar),
    lvl = magicLevel(u, asChar);
  const sp = sps.find(s => s.name.toLowerCase() === String(spellName || '').toLowerCase()) || null;
  if (!sp || !lvl) return null;
  const C = spellTargets(u, sp);
  const T = C.find(t => t.id === targetId) || C[0];
  if (!T) return sp.name + ': no target';
  const S = sp.db || {},
    need = srNeed(u, asChar, spellNeed(sp, T));
  const caster = t =>
    rx(t.rules, 'Priest') ||
    rx(t.rules, 'Wizard') ||
    (t.charName && (rx(t.charRules, 'Priest') || rx(t.charRules, 'Wizard'))) ||
    (CASTERS[frBase(t)] && CASTERS[frBase(t)].reg);
  const cp = casterPoly(u),
    interf = all().some(
      t =>
        t.onTable &&
        t.side !== u.side &&
        caster(t) &&
        (polyDist(cp, casterPoly(t)) <= 10 || polyDist(corners(T), casterPoly(t)) <= 10)
    );
  let succ;
  if (S.a === null || (rh(T.rules, 'Gifted Mortals') && T.side === u.side && asChar))
    succ = Math.max(need, 2);
  else {
    const att = (S.a === 'D' ? +T.stats.D || 0 : sp.att) - (interf ? 1 : 0),
      rolls = Array.from({ length: lvl + srSpellDice(u, asChar) }, d6);
    succ = rolls.filter(v => v === 1 || (v <= att && v !== 6)).length + srBrand(u, sp, T);
    if (
      T.side === u.side &&
      (rh(T.rules, 'Devout') || (T.charName && rh(T.charRules || [], 'Devout'))) &&
      succ < lvl
    )
      succ++;
    if (T.side !== u.side && fx(T).some(e => /Elemental Vortex/.test(e))) succ = Math.max(0, succ - 2);
    banner(
      `${asChar ? u.charName : u.short || u.name} casts ${sp.name} on ${T.short || T.name}`,
      rolls.map(v => ({ v, cls: v === 1 || (v <= att && v !== 6) ? 'hit' : 'miss' })),
      `${succ} successes, needs ${need}`
    );
    await sleep(1400);
    bannerHide();
  }
  if (succ < need) return `${sp.name} on ${T.short || T.name} fails (${succ}/${need})`;
  const line = await resolveSpell(u.id, sp, T.id, succ, asChar);
  return `casts ${sp.name}: ${line}`;
}
