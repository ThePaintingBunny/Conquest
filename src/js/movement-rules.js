/* Movement rules: the 1″ rule near enemies, and the charge and volley overlays. */
/* March restriction (core rules): a regiment may not March to within 1″ of an enemy regiment; only a Charge brings it into contact */
const MOVE1 = ['march', 'reform', 'fluid', 'hammer', 'dtmarch', 'fadv'];
/* how close a regiment outline comes to a terrain piece (0 = touching or overlapping; up to 1″ is checked) */
function terrGap(P, t) {
  return Math.min(9, terrDist(P, t));
}
/* Core rules 2026: a March may not end within 1″ of an enemy regiment or Garrison terrain; a Reform may not bring
   stands within 1″ of an enemy regiment (unless it started closer; then it may not get closer). */
function near1(c, pose) {
  const u = Object.assign({}, base(act.id), pose || act.pose),
    uc = corners(u),
    st = corners(Object.assign({}, base(act.id), c.start));
  const marchy = ['march', 'dtmarch', 'fadv'].includes(c.type) || c.withdraw;
  const tr =
    u.garrison || !marchy
      ? null
      : terrainOf().find(t => {
          if (!tHas(t, 'Garrison')) return false;
          const g = terrGap(uc, t, 1);
          return g < 1 - 1e-3 && g < terrGap(st, t, 1) - 1e-3;
        });
  if (tr) return { short: tInfo(tr).name, name: tInfo(tr).name, terr: true, dist: terrGap(uc, tr, 1) };
  return (
    all().find(
      e =>
        e.onTable &&
        !e.destroyed &&
        e.type !== 'marker' &&
        e.side !== u.side &&
        e.id !== u.id &&
        (d => d < 1 - 1e-3 && d < polyDist(st, corners(e)) - 1e-3)(polyDist(uc, corners(e)))
    ) || null
  );
}
function pullBack(c) {
  const P = act.pose,
    S = c.start;
  for (let t = 1; t >= 0; t -= 0.02) {
    const q = { x: S.x + (P.x - S.x) * t, y: S.y + (P.y - S.y) * t, facing: t > 0.5 ? P.facing : S.facing };
    if (!near1(c, q) && !overlapsAny(Object.assign({}, base(act.id), act.pose, q))) {
      Object.assign(act.pose, q);
      return true;
    }
  }
  Object.assign(act.pose, { x: S.x, y: S.y, facing: S.facing });
  return false;
}
function finishAction() {
  if (act.cur && MOVE1.includes(act.cur.type) && !act.cur.sweep && act.cur.start) {
    const e = near1(act.cur);
    if (e) {
      if (aiBusy || (!PVP() && base(act.id).side === AI)) pullBack(act.cur);
      else {
        toast(
          e.terr
            ? 'A regiment may not March or Reform to within 1″ of ' +
                e.name +
                ' (a March must end at least 1″ from Garrison terrain; it is ' +
                e.dist.toFixed(1) +
                '″ away). Move it back, or Cancel.'
            : 'A regiment may not March or Reform to within 1″ of an enemy regiment (' +
                (e.short || e.name) +
                ' is ' +
                polyDist(corners(byId(act.id)), corners(e)).toFixed(1) +
                '″ away). Only a Charge brings it into contact. Move it back, or Cancel.'
        );
        return;
      }
    }
  }
  /* Reform: no stand may move further than the regiment's March (checked stand by stand, in formation order) */
  if (act.cur && act.cur.type === 'reform' && act.cur.start) {
    try {
      const u0 = base(act.id),
        A = standsOf(Object.assign({}, u0, act.cur.start)),
        B = standsOf(byId(act.id)),
        mid = s => [(s.poly[0][0] + s.poly[2][0]) / 2, (s.poly[0][1] + s.poly[2][1]) / 2],
        far = Math.max(
          0,
          ...B.map((s, i) => (A[i] ? Math.hypot(mid(s)[0] - mid(A[i])[0], mid(s)[1] - mid(A[i])[1]) : 0))
        ),
        M = +u0.m || 0;
      if (M && far > M + 0.25)
        toast(
          `Check this Reform: a stand moves about ${far.toFixed(1)}″, more than its March of ${M}″. No stand may move further than its March during a Reform.`
        );
    } catch (e) {
      console.error(e);
    }
  }
  if (act.cur && act.cur.type === 'creform') {
    const c0 = act.cur;
    if (cb && cb.type === 'freform') {
      toast('Record the Fighting Reform wounds first.');
      return;
    }
    const n = crContact(c0);
    if (n < c0.contact0) {
      toast(
        `That puts ${n} stand${n === 1 ? '' : 's'} in contact instead of ${c0.contact0}. A Combat Reform cannot reduce the stands in contact.`
      );
      return;
    }
    const uu = byId(act.id),
      uc = corners(uu),
      bad = (c0.foes || [])
        .map(byId)
        .filter(e => e && polyDist(uc, corners(e)) <= 0.35 && arcOf(e, [uu.x, uu.y]) !== c0.foeArc[e.id]);
    if (bad.length) {
      const e = bad[0],
        L = a => (a === 'left' || a === 'right' ? a + ' flank' : a);
      toast(
        `You were on the ${L(c0.foeArc[e.id])} of ${e.short || e.name}; a Combat Reform cannot move you to its ${L(arcOf(e, [uu.x, uu.y]))}.`
      );
      return;
    }
  }
  if (act.cur && act.cur.type === 'withdraw') {
    const c1 = act.cur;
    if (c1.stage !== 'march') {
      toast(
        cb && cb.type === 'freform' ? 'Record the withdrawal wounds first.' : 'Finish the withdrawal first.'
      );
      return;
    }
    if (!c1.failed) {
      const uu = byId(act.id),
        A = corners(uu);
      if (all().some(o => o.onTable && o.side !== uu.side && polyDist(A, corners(o)) < 1 - 1e-6)) {
        toast(
          'A Withdraw March cannot end within 1″ of an enemy. Move further, or press "Withdraw fails" to return to the start.'
        );
        return;
      }
    }
  }
  const u = byId(act.id),
    c = act.cur;
  const entry = {
    type: c.type,
    free: ['fluid', 'hammer'].includes(c.type) || !!c.free,
    fadv: !!c.fadv,
    from: c.start,
    to: { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files }
  };
  if (c.moving) entry.dist = +curCost(act.pose).cost.toFixed(2);
  if (c.type === 'charge' && act.tgtPose) {
    const tp = act.tgtPose;
    act.tgtPose = null;
    entry.targetPivot = tp.pose;
    putState({ units: state.units.map(x => (x.id === tp.id ? Object.assign({}, x, tp.pose) : x)) });
  }
  if (c.type === 'charge') {
    const pushes = chargePushes(byId(act.id), c.target);
    if (pushes.length) {
      putState({
        units: state.units.map(x => {
          const q = pushes.find(p => p.id === x.id);
          return q ? Object.assign({}, x, { x: q.x, y: q.y }) : x;
        })
      });
      entry.pushed = pushes.map(p => ({ id: p.id, moved: p.moved }));
      toast(
        pushes
          .map(p => `${p.name} is pushed ${p.moved.toFixed(1)}″ directly away from the charger`)
          .join('; ') + (pushes.some(p => p.gap < 1 - 1e-3) ? ' (as far as there is room).' : ', to 1″ away.')
      );
    }
    entry.target = c.target;
    entry.dist = +c.dist.toFixed(2);
    entry.result = 'success';
    entry.face = c.face;
    entry.chargeDistance = c.cd;
    if (c.rerolled) entry.rerolled = true;
    if (!act.extraFx.includes('Inspired (charged)')) act.extraFx.push('Inspired (charged)');
  }
  if (c.roll != null) entry.roll = c.roll;
  if (c.type === 'withdraw') {
    entry.clean = c.clean;
    entry.resolve = c.R;
    entry.woundDie = c.wd;
    entry.wounds = c.wounds;
    entry.result = c.failed ? 'failed' : 'withdrew';
    entry.from = c.origin || c.start;
  }
  if (c.type === 'creform') {
    entry.clean = c.clean;
    entry.resolve = c.R;
    entry.contact = crContact(c);
  }
  if (c.firstMarch && u.vanguard) entry.vanguard = u.vanguard;
  if (c.dt) entry.dt = true;
  if (c.combat) entry.combat = c.combat;
  if (c.type === 'cast' && c.res) {
    entry.spell = c.res.spell;
    entry.spellTarget = c.res.target;
    entry.success = c.res.success;
  }
  if (c.segs)
    entry.segs = c.segs.map(s => ({ mode: s.mode, amt: +s.amt.toFixed(2), cost: +s.cost.toFixed(2) }));
  if (c.type === 'inspire' && !act.extraFx.includes('Inspired (Inspire action)'))
    act.extraFx.push('Inspired (Inspire action)');
  if (c.type === 'occupy') {
    const t = tGarrisonNear(base(act.id))[0];
    if (t) {
      act.occupyT = tId(t);
      Object.assign(act.pose, { x: t.x, y: t.y });
      entry.to = { x: t.x, y: t.y, facing: u.facing || 0, files: geom(u).files };
      entry.building = tInfo(t).name;
      toast(
        'The regiment occupies the ' +
          tInfo(t).name.toLowerCase() +
          ': +' +
          tInfo(t).def +
          ' Defense and 360° sight. Its activation ends.'
      );
    }
  }
  if (c.type === 'leave') {
    const t = tGarrisonOf(base(act.id));
    if (t) {
      const G = geom(u),
        a = ((u.facing || 0) * Math.PI) / 180,
        f = [Math.sin(a), Math.cos(a)],
        R = terrR(t) + 1 + G.d / 2;
      act.leaveT = tId(t);
      Object.assign(act.pose, { x: +(t.x + f[0] * R).toFixed(2), y: +(t.y + f[1] * R).toFixed(2) });
      entry.to = { x: act.pose.x, y: act.pose.y, facing: u.facing || 0, files: G.files };
      toast(
        'The regiment leaves the building and forms up 1″ outside it. Its activation ends. Drag it if it needs a different spot.'
      );
    }
  }
  let TM = null;
  if (['march', 'charge', 'withdraw'].includes(c.type) && entry.from && entry.to) {
    TM = tAfterMove(base(act.id), entry);
    if (TM.notes.length || TM.hindered)
      entry.terrain = TM.notes.concat(TM.hindered ? ['Charged through ' + TM.hindered + ' (Hindering)'] : []);
  }
  srFinishAction(u, c, entry);
  act.actions.push(entry);
  if (entry.type === 'rally' || entry.type === 'crally')
    toast(
      (byId(act.id).short || byId(act.id).name) +
        ' Rallies: it is no longer Broken (from the end of this activation).'
    );
  act.cur = null;
  render();
  if (TM && TM.wounds) {
    const bu = base(act.id),
      AL = allocate(bu, TM.wounds);
    putState({
      units: state.units.map(x =>
        x.id === bu.id
          ? Object.assign(
              {},
              x,
              { wounds: AL.w, auxWounds: AL.aw },
              AL.dead
                ? { onTable: false, destroyed: true, status: 'Destroyed', destroyedRound: state.round }
                : {}
            )
          : x
      ),
      lastTitle: N(bu.side) + ' · ' + (bu.short || bu.name),
      lastText: TM.notes.join('; ') + '. No Morale Tests.'
    }).catch(() => {});
  }
  if (TM && TM.notes.length) toast(TM.notes.join(' · ') + '. No Morale Tests.');
  if (TM && TM.hindered) {
    const bu = byId(act.id),
      ice = frFac(bu) === 'Nords' && armyHas(bu.side, /Ice, Flesh/);
    if (/Medium|Heavy/.test(bu.cls || '') && !ice) {
      act.extraFx = act.extraFx.filter(x => !/Inspired/.test(x));
      act.extraFx.push('Hindered (no Impact, loses Inspiration this round)');
    }
    render();
    toast(
      'Charged through ' +
        TM.hindered +
        ' (Hindering): no Impact Attacks' +
        (/Medium|Heavy/.test(bu.cls || '') && !ice ? ', and it loses Inspired this round.' : '.')
    );
  }
  if (c.type === 'memory') {
    const m = memOf(byId(act.id));
    if (m) grant(act.id, 'Memories of Old', m.rules, null, 'Memories of Old: ' + m.text).then(() => render());
  }
  if (c.type === 'charge') {
    srOnCharge(byId(act.id), c);
    if (srHas(byId(act.id), /^Divine Purpose/) && !act.dpUsed) act.dpUsed = 'charge';
  }
  if (c.type === 'charge') frOnCharge(act.id);
  if (c.type === 'charge') cadOnCharge(act.id, c.target);
  if (
    c.type === 'charge' &&
    hasImpact(byId(act.id)) &&
    !(TM && TM.hindered) &&
    !(byId(c.target) || {}).garrison
  )
    openCombat({ type: 'impact', att: act.id, tgt: c.target, inAct: false, fromCharge: true });
}
function isDrawAb(u, n, t) {
  const nm = String(n || ''),
    base = nm
      .replace(/^.*?:\s*/, '')
      .replace(/\s*\(.*$/, '')
      .trim()
      .toLowerCase();
  if (/^Draw Event/i.test(nm) || /^Draw Event/i.test(String(t || ''))) return true;
  try {
    const L = [];
    const e = frEncy(u);
    if (e && e.draw) L.push(...e.draw);
    if (u.charName) {
      const c = frEncy(u, u.charName);
      if (c && c.draw) L.push(...c.draw);
    }
    return L.some(
      d =>
        String(d)
          .toLowerCase()
          .replace(/\s*\(.*$/, '')
          .trim() === base
    );
  } catch (e) {
    return false;
  }
}
function isUpgAb(u, n) {
  const nm = String(n || '');
  if (/^The .+?:/.test(nm)) return true;
  const base = nm.replace(/\s*\(.*$/, '').trim();
  if (ITEMS[base]) return true;
  try {
    const f = UPG[frFac(u)];
    return !!(f && (f.list || []).some(x => x[1] === base));
  } catch (e) {
    return false;
  }
}
function hasDraw(u, re) {
  return (u.abilities || []).some(a => re.test(a[0])) || fx(u).some(x => re.test(x));
}
function drawVal(u, re) {
  let v = 0;
  (u.abilities || []).concat(fx(u).map(x => [x])).forEach(a => {
    const m = String(a[0]).match(re);
    if (m) v = Math.max(v, +m[1] || 0);
  });
  return v;
}
function trampleX(u) {
  return Math.max(rx(RU(u), 'Trample'), u.char != null ? rx(u.charRules, 'Trample') : 0);
}
function frontFoes(u) {
  const uc = standsOf(u).filter(s => s.rank === 0);
  return engaged(u).filter(e => {
    const ec = corners(e);
    return (
      uc.some(s => polyDist(s.poly, ec) <= 0.35) &&
      corners(e)
        .concat([[e.x, e.y]])
        .some(p => arcOf(u, p) === 'front')
    );
  });
}
function animate(u) {
  return rh((u && u.rules) || [], 'Animate Vessel');
}
function phalanx(u) {
  return rh((u && u.rules) || [], 'Phalanx');
}
function chargeFixed(u) {
  return jugg(u) ? 5 : phalanx(u) ? 3 : null;
}
function armyHas(side, re) {
  return (state.army?.[side] || []).some(x => re.test(x));
}
function jugg(u) {
  return hasRule(u, /^Juggernaut/) || fx(u).some(x => /Clockwork Parade|^Aristia/.test(x));
}
function chargeMax(u) {
  const f = chargeFixed(u);
  return (
    (u.m || 0) +
    (f != null ? f : 6 + srChargeBonus(u, act && act.cur && act.cur.target ? byId(act.cur.target) : null)) +
    (act && act.cur && act.cur.pu ? 2 : 0)
  );
}
function arcOf(t, p) {
  const G = geom(t),
    a = ((t.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  const v = [p[0] - t.x, p[1] - t.y],
    fw = v[0] * f[0] + v[1] * f[1],
    rr = v[0] * r[0] + v[1] * r[1];
  if (fw >= G.d / 2 - 1e-6 && Math.abs(rr) <= G.w / 2 + (fw - G.d / 2)) return 'front';
  if (fw <= -G.d / 2 + 1e-6 && Math.abs(rr) <= G.w / 2 + (-fw - G.d / 2)) return 'rear';
  return rr > 0 ? 'right' : 'left';
}
/* charge overlay: the front arc it can see, the zone within its March, and the extra reach a Charge Roll can add */
function drawChargeZones(u, g) {
  if (!u) return;
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)];
  const P = (fw, rr) => [u.x + f[0] * fw + r[0] * rr, u.y + f[1] * fw + r[1] * rr],
    fe = G.d / 2,
    hw = G.w / 2,
    M = +(u.m || 0),
    fix = chargeFixed(u),
    max = chargeMax(u);
  const clip = Q => {
    let out = Q;
    [
      [0, 0, 1],
      [0, 72, -1],
      [1, 0, 1],
      [1, 48, -1]
    ].forEach(([ax, v, sg]) => {
      const inn = p => sg * (p[ax] - v) >= 0,
        cut = (a, b) => {
          const t = (v - a[ax]) / (b[ax] - a[ax]);
          return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        };
      const src = out;
      out = [];
      src.forEach((cur, i) => {
        const prev = src[(i + src.length - 1) % src.length];
        if (inn(cur)) {
          if (!inn(prev)) out.push(cut(prev, cur));
          out.push(cur);
        } else if (inn(prev)) out.push(cut(prev, cur));
      });
    });
    return out;
  };
  const pts = q =>
    clip(q)
      .map(p => px(p[0]) + ',' + py(p[1]))
      .join(' ');
  /* front arc limited to R: straight ahead of the front edge, plus a 45° sector at each front corner */
  const zone = R => {
    const o = [];
    const cL = [fe, -hw],
      cR = [fe, hw];
    o.push(P(cL[0], cL[1]));
    for (let k = 0; k <= 12; k++) {
      const an = -Math.PI / 4 + ((Math.PI / 4) * k) / 12;
      o.push(P(cL[0] + R * Math.cos(an), cL[1] + R * Math.sin(an)));
    }
    for (let k = 0; k <= 12; k++) {
      const an = ((Math.PI / 4) * k) / 12;
      o.push(P(cR[0] + R * Math.cos(an), cR[1] + R * Math.sin(an)));
    }
    o.push(P(cR[0], cR[1]));
    return o;
  };
  const far = 120;
  el(
    'polygon',
    {
      points: pts([P(fe, -hw), P(fe + far, -hw - far), P(fe + far, hw + far), P(fe, hw)]),
      fill: '#BFD8F2',
      'fill-opacity': 0.1,
      stroke: '#D6E6F7',
      'stroke-opacity': 0.8,
      'stroke-width': 1.4,
      'stroke-dasharray': '7 5',
      'pointer-events': 'none'
    },
    g
  );
  const certain = fix != null ? max : M;
  if (max > certain + 1e-6)
    el(
      'polygon',
      {
        points: pts(zone(max)),
        fill: '#F29A3A',
        'fill-opacity': 0.32,
        stroke: '#FFB45C',
        'stroke-opacity': 1,
        'stroke-width': 2,
        'stroke-dasharray': '6 4',
        'pointer-events': 'none'
      },
      g
    );
  el(
    'polygon',
    {
      points: pts(zone(certain)),
      fill: '#FFF6D8',
      'fill-opacity': 0.38,
      stroke: '#FFF6D8',
      'stroke-opacity': 1,
      'stroke-width': 2,
      'pointer-events': 'none'
    },
    g
  );
}
/* volley overlay: per front-rank stand, the effective range (half Barrage range, +1 shot) and the full range, over its firing arc */
function drawVolleyZones(u, g) {
  const vr = u && volleyRange(u);
  if (!vr) return;
  const span = volleyArcSpan(u),
    R = vr.range,
    long = rh(RU(u).concat(fx(u)), 'Longshot'),
    H = long ? R : R / 2;
  const pts = q => q.map(p => px(p[0]) + ',' + py(p[1])).join(' ');
  const fa = ((u.facing || 0) * Math.PI) / 180,
    G = geom(u),
    f = [Math.sin(fa), Math.cos(fa)],
    r = [Math.cos(fa), -Math.sin(fa)],
    fe = G.d / 2,
    hw = G.w / 2;
  const P = (fw, rr) => [u.x + f[0] * fw + r[0] * rr, u.y + f[1] * fw + r[1] * rr];
  /* union of the stands' fans: straight ahead of the front edge plus a sector at each front corner out to the arc's edge */
  const shape = Rad => {
    const sp = (span * Math.PI) / 180,
      o = [],
      n = Math.max(8, Math.round(span / 4));
    o.push(P(fe, -hw));
    for (let k = 0; k <= n; k++) {
      const an = -sp + (sp * k) / n;
      o.push(P(fe + Rad * Math.cos(an), -hw + Rad * Math.sin(an)));
    }
    for (let k = 0; k <= n; k++) {
      const an = (sp * k) / n;
      o.push(P(fe + Rad * Math.cos(an), hw + Rad * Math.sin(an)));
    }
    o.push(P(fe, hw));
    return o;
  };
  const front = standsOf(u).filter(s => s.rank === 0);
  if (span >= 180) {
    /* every direction: the shooting stands' outline grown by the range (a rounded rectangle). Acute Senses fires from the front rank only; Fluid Formation from whichever side faces the target, so the whole regiment */
    const back = rh(RU(u), 'Fluid Formation') || u.garrison ? -fe : fe - G.sd;
    const ring = Rad => {
      const o = [],
        C = [
          [fe, hw, 0],
          [back, hw, 1],
          [back, -hw, 2],
          [fe, -hw, 3]
        ];
      C.forEach(([a, b, q]) => {
        for (let k = 0; k <= 10; k++) {
          const an = ((q + k / 10) * Math.PI) / 2;
          o.push(P(a + Rad * Math.cos(an), b + Rad * Math.sin(an)));
        }
      });
      return o;
    };
    if (!long)
      el(
        'polygon',
        {
          points: pts(ring(R)),
          fill: '#6FA8FF',
          'fill-opacity': 0.2,
          stroke: '#9CC4FF',
          'stroke-width': 2,
          'stroke-dasharray': '6 4',
          'pointer-events': 'none'
        },
        g
      );
    el(
      'polygon',
      {
        points: pts(ring(H)),
        fill: '#FFD66B',
        'fill-opacity': 0.32,
        stroke: '#FFE39A',
        'stroke-width': 2,
        'pointer-events': 'none'
      },
      g
    );
    return;
  }
  if (!long)
    el(
      'polygon',
      {
        points: pts(shape(R)),
        fill: '#6FA8FF',
        'fill-opacity': 0.2,
        stroke: '#9CC4FF',
        'stroke-width': 2,
        'stroke-dasharray': '6 4',
        'pointer-events': 'none'
      },
      g
    );
  el(
    'polygon',
    {
      points: pts(shape(H)),
      fill: '#FFD66B',
      'fill-opacity': 0.32,
      stroke: '#FFE39A',
      'stroke-width': 2,
      'pointer-events': 'none'
    },
    g
  );
  front.forEach(s => {
    const c = [(s.poly[0][0] + s.poly[1][0]) / 2, (s.poly[0][1] + s.poly[1][1]) / 2];
    el('circle', { cx: px(c[0]), cy: py(c[1]), r: 2.5, fill: '#FFE39A', 'pointer-events': 'none' }, g);
  });
}
function fireVolley() {
  if (!act || !act.cur || act.cur.type !== 'volley') return;
  const t = byId(act.cur.sel);
  if (!t) return;
  const vw = volleyWhy(byId(act.id), t);
  if (vw) {
    toast(vw);
    return;
  }
  act.cur.stage = 'combat';
  act.cur.target = t.id;
  openCombat({ type: 'volley', att: act.id, tgt: t.id, inAct: true });
  render();
}
function drawVolleyLines(u, t, L, AF) {
  const VS = volleyStands(u, t);
  let vg = L.querySelector('#vlines');
  if (vg) vg.remove();
  vg = el('g', { id: 'vlines', 'pointer-events': 'none' }, L);
  VS.filter(v => !v.none && v.to && (!AF || v.arcing)).forEach(v => {
    const ok = v.inRange && (v.clear || AF),
      c = !v.inRange ? '#B9B9B9' : ok ? (v.eff ? '#FFE39A' : '#9CC4FF') : '#FF7A6B';
    el(
      'line',
      {
        x1: px(v.f0[0]),
        y1: py(v.f0[1]),
        x2: px(v.to[0]),
        y2: py(v.to[1]),
        stroke: c,
        'stroke-width': 2.4,
        'stroke-dasharray': ok ? (AF && !v.clear ? '2 3' : '') : '5 4'
      },
      vg
    );
    el('circle', { cx: px(v.f0[0]), cy: py(v.f0[1]), r: 3.5, fill: c }, vg);
  });
  return vg;
}
function drawVolleyNeeds(u, g) {
  const vr = u && volleyRange(u);
  if (!vr) return;
  const long = rh(RU(u).concat(fx(u)), 'Longshot');
  all()
    .filter(t => t.onTable && !t.destroyed && t.side !== u.side)
    .forEach(t => {
      const gu = g.querySelector('g[data-id="' + t.id + '"]');
      if (!gu) return;
      const why = volleyWhy(u, t);
      const d = Math.min(
        ...standsOf(u)
          .filter(s => s.rank === 0)
          .map(s => polyDist(s.poly, corners(t)))
      );
      const eff = !why && (long || d <= vr.range / 2 + 1e-6);
      const VS = volleyStands(u, t),
        AF = arcingOn(u);
      gu.querySelectorAll(':scope>title').forEach(x => x.remove());
      const ti = document.createElementNS(NS, 'title');
      ti.textContent =
        (t.short || t.name) +
        ': ' +
        d.toFixed(1) +
        '″ from its nearest front stand. ' +
        (why ? why : (AF ? 'Arcing Fire: ' : '') + volleySummary(VS, AF) + ' Click to volley.');
      gu.insertBefore(ti, gu.firstChild);
      gu.addEventListener('mouseenter', () => {
        const L = $('rings');
        if (!L) return;
        let vg = L.querySelector('#vlines');
        if (vg) vg.remove();
        vg = el('g', { id: 'vlines', 'pointer-events': 'none' }, L);
        VS.filter(v => !v.none && v.to && (!AF || v.arcing)).forEach(v => {
          const ok = v.inRange && (v.clear || AF),
            c = !v.inRange ? '#B9B9B9' : ok ? (v.eff ? '#FFE39A' : '#9CC4FF') : '#FF7A6B';
          el(
            'line',
            {
              x1: px(v.f0[0]),
              y1: py(v.f0[1]),
              x2: px(v.to[0]),
              y2: py(v.to[1]),
              stroke: c,
              'stroke-width': 2.2,
              'stroke-dasharray': ok ? (AF && !v.clear ? '2 3' : '') : '5 4'
            },
            vg
          );
          el('circle', { cx: px(v.f0[0]), cy: py(v.f0[1]), r: 3.5, fill: c }, vg);
        });
      });
      gu.addEventListener('mouseleave', () => {
        const vg = document.getElementById('vlines');
        if (vg) vg.remove();
        const ts = act && act.cur && act.cur.sel && byId(act.cur.sel);
        if (ts && $('rings')) drawVolleyLines(u, ts, $('rings'), arcingOn(u));
      });
    });
}
function drawChargeNeeds(u, g) {
  if (!u) return;
  const M = +(u.m || 0),
    fix = chargeFixed(u),
    max = chargeMax(u);
  all()
    .filter(t => t.onTable && !t.destroyed && t.side !== u.side)
    .forEach(t => {
      if (
        !corners(t)
          .concat([[t.x, t.y]])
          .some(p => arcOf(u, p) === 'front')
      )
        return;
      const d = polyDist(corners(u), corners(t));
      if (d > max + 1e-6) return;
      const need =
        fix != null
          ? 'in reach, no roll needed'
          : Math.max(1, Math.ceil(d - M - 1e-6)) <= 1
            ? 'any roll reaches it'
            : 'needs ' + Math.ceil(d - M - 1e-6) + '+ on the Charge Roll';
      const gu = g.querySelector('g[data-id="' + t.id + '"]');
      if (!gu) return;
      gu.querySelectorAll(':scope>title').forEach(x => x.remove());
      const ti = document.createElementNS(NS, 'title');
      ti.textContent = (t.short || t.name) + ': ' + d.toFixed(1) + '″ away, ' + need + '. Click to charge.';
      gu.insertBefore(ti, gu.firstChild);
    });
}
/* ===== Line of Sight for a Charge. Sight lines run from points along the charger's front edge to points of the target
   inside its front arc; the Charge needs at least one clear line. A line is blocked by another regiment (either side) or
   by Obstructing/Garrison terrain whose Size is at least the Size of both the charger and the target. ===== */
function segPolyHit(a, b, P) {
  const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const inside = q => {
    let s0 = 0;
    for (let i = 0; i < P.length; i++) {
      const c = cross(P[i], P[(i + 1) % P.length], q);
      if (Math.abs(c) < 1e-9) continue;
      if (!s0) s0 = Math.sign(c);
      else if (Math.sign(c) !== s0) return false;
    }
    return true;
  };
  if (inside(a) || inside(b)) return true;
  for (let i = 0; i < P.length; i++) {
    const c = P[i],
      d = P[(i + 1) % P.length];
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
  }
  return false;
}
function chargeLos(u, t) {
  const sa = uSize(u),
    st = uSize(t),
    G = geom(u),
    an = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(an), Math.cos(an)],
    r = [Math.cos(an), -Math.sin(an)];
  const from = [];
  for (let i = 0; i <= 6; i++) {
    const o = -G.w / 2 + (G.w * i) / 6;
    from.push([u.x + (f[0] * G.d) / 2 + r[0] * o, u.y + (f[1] * G.d) / 2 + r[1] * o]);
  }
  const T = corners(t),
    to = T.concat(
      T.map((p, i) => [(p[0] + T[(i + 1) % 4][0]) / 2, (p[1] + T[(i + 1) % 4][1]) / 2]),
      [[t.x, t.y]]
    ).filter(p => arcOf(u, p) === 'front');
  if (!to.length) return { ok: false, by: 'nothing (the target is not in the front arc)' };
  const walls = all()
    .filter(
      o =>
        o.onTable &&
        !o.destroyed &&
        o.id !== u.id &&
        o.id !== t.id &&
        o.type !== 'marker' &&
        uSize(o) >= sa &&
        uSize(o) >= st
    )
    .map(o => ({ name: o.short || o.name, P: shrinkPoly(corners(o), 0.05) }));
  const terr = terrainOf().filter(x => {
    if (!tHas(x, 'Obstructing') && !tHas(x, 'Garrison')) return false;
    if (inT(x, [u.x, u.y]) || inT(x, [t.x, t.y])) return false;
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
        by = by || tInfo(x).name + ' (Size ' + tInfo(x).size + ')';
        continue;
      }
      return { ok: true };
    }
  return { ok: false, by };
}
/* the furthest this regiment can charge against this target (some rules add to the Charge Roll against particular targets) */
function chargeMaxVs(u, t) {
  const c = act && act.cur,
    prev = c ? c.target : null;
  if (c) c.target = t.id;
  try {
    return chargeMax(u);
  } finally {
    if (c) c.target = prev;
  }
}
/* Is a Charge against t legal at all, and how long is the shortest legal Charge Move?
   Uses the Charge Move planner from where the regiment stands: { ok, why, req } with req in inches. */
function chargeCheck(u, t, dist, max) {
  const s = (act && act.cur && act.cur.start) || u,
    U = Object.assign({}, u, { x: s.x, y: s.y, facing: s.facing != null ? s.facing : u.facing || 0 });
  const plan = cd => {
    try {
      return planCharge(U, t, cd);
    } catch (e) {
      console.error(e);
      return { ok: false, why: '' };
    }
  };
  const best = plan(max);
  if (!best.ok) return { ok: false, why: best.why || '', fail: best.fail };
  if (chargeFixed(u) != null || plan(dist).ok) return { ok: true, req: dist };
  let lo = dist,
    hi = max;
  while (hi - lo > 0.05) {
    const mid = (lo + hi) / 2;
    if (plan(mid).ok) hi = mid;
    else lo = mid;
  }
  return { ok: true, req: Math.ceil(hi * 20) / 20 };
}
function setChargeTarget(t) {
  const u = byId(act.id);
  if (fx(t).some(x => /^Prowling/.test(x)) && polyDist(corners(u), corners(t)) >= 8) {
    toast('That regiment is Prowling: it cannot be seen from 8″ or more.');
    return;
  }
  if (t.type === 'marker' && (state.round || 1) < 2) {
    toast('Objective Markers cannot be attacked before round 2.');
    return;
  }
  const dist = polyDist(corners(u), corners(t));
  const arcOk = corners(t)
    .concat([[t.x, t.y]])
    .some(p => arcOf(u, p) === 'front');
  if (!arcOk) {
    toast((t.short || t.name) + ' is not in this regiment’s front arc.');
    return;
  }
  const pu = armyHas(u.side, /Prophecy Unfulfilled/) && engaged(t).length > 0;
  const max = chargeMaxVs(u, t) + (pu ? 2 : 0);
  if (dist > max + 1e-6) {
    toast(
      `Out of reach: ${t.short || t.name} is ${dist.toFixed(1)}″ away and the furthest this regiment can charge is ${max}″.`
    );
    return;
  }
  /* legality before the roll: Line of Sight, then is there any legal Charge Move into the target with the best possible roll? */
  const st0 = act.cur.start || u,
    los = chargeLos(
      Object.assign({}, u, { x: st0.x, y: st0.y, facing: st0.facing != null ? st0.facing : u.facing }),
      t
    );
  if (!los.ok) {
    act.cur.illegal = { target: t.id, name: t.short || t.name, why: '', los: los.by, fail: null };
    render();
    toast(
      `No Line of Sight to ${t.short || t.name}` +
        (los.by ? `: ${los.by} blocks every sight line` : '') +
        '. A Charge needs Line of Sight, so no roll is made. Choose another target or another action.'
    );
    return;
  }
  const chk = chargeCheck(u, t, dist, max);
  if (!chk.ok) {
    act.cur.illegal = { target: t.id, name: t.short || t.name, why: chk.why, fail: chk.fail || null };
    render();
    toast(
      `No legal Charge against ${t.short || t.name}` +
        (chk.why ? `: the Charge Move is blocked by ${chk.why}` : '') +
        '. Even the best Charge Roll could not reach it, so no roll is made. Choose another target or another action.'
    );
    return;
  }
  act.cur.illegal = null;
  clearChargeFail();
  Object.assign(act.cur, {
    stage: 'roll',
    target: t.id,
    straight: dist,
    dist: Math.max(dist, chk.req),
    pu
  });
  toast(t.garrison ? 'The target is in a building: no Impact Attacks against it.' : '');
  render();
}
