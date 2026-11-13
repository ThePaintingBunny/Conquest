/* Scenarios: objectives, zones and scoring. */
/* ---------- scenarios ---------- */
const Z = (name, x, y, d, friendly) => ({ name, x, y, r: d / 2, size: d, friendly: friendly || null });
const MK = (name, x, y, side) => ({ name, x, y, side });
const SCEN = {
  1: {
    name: 'Divide and Conquer',
    zones: [
      Z('Blue Left', 60, 12, 6, 'nord'),
      Z('Blue Right', 12, 12, 6, 'nord'),
      Z('Centre Left', 48, 24, 6),
      Z('Centre Right', 24, 24, 6),
      Z('Red Left', 60, 36, 6, 'cs'),
      Z('Red Right', 12, 36, 6, 'cs')
    ],
    markers: [MK('B', 36, 12, 'nord'), MK('A', 36, 36, 'cs')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +2 if Seizing three or more zones; +1 if Seizing more zones than the opponent; 2 VP for slaying the enemy Warlord. Red zones are friendly to the bottom player and blue zones to the top player: you cannot Seize your own friendly zones.'
  },
  2: {
    name: 'Declined Flank',
    zones: [
      Z('Zone 1', 66, 18, 6),
      Z('Zone 2', 42, 18, 6),
      Z('Zone 3', 18, 18, 6),
      Z('Zone 4', 54, 30, 6),
      Z('Zone 5', 30, 30, 6),
      Z('Zone 6', 6, 30, 6)
    ],
    markers: [],
    pick: 'deny',
    vp: '2 VP per zone Seized; +2 if Seizing three or more; +1 if Seizing all six. After Supremacy the First Player, then the Second, each name a different zone: those two zones score nothing this round.'
  },
  3: {
    name: 'Breakout',
    zones: [Z('Left', 60, 24, 9), Z('Centre', 36, 24, 9), Z('Right', 12, 24, 9)],
    markers: [MK('A', 40.5, 24, 'cs'), MK('B', 31.5, 24, 'nord')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +1 if Seizing two or more; 2 VP for slaying the enemy Warlord. Rounds 1-4 and 9-10: +1 per side zone Seized. Rounds 5-8: +2 for the centre zone.'
  },
  4: {
    name: 'Echelon',
    zones: [Z('Far left', 48, 18, 9), Z('Near right', 24, 30, 9)],
    markers: [
      MK('A', 60, 42, 'cs'),
      MK('B', 12, 6, 'nord'),
      MK('C', 24, 18, 'neutral'),
      MK('D', 48, 30, 'neutral')
    ],
    vp: '3 VP per Objective Marker you destroy this round (enemy or neutral); +2 if you destroy two or more in the same round; 2 VP per zone Seized; +2 if Seizing both zones.'
  },
  5: {
    name: 'Forlorn Hope',
    zones: [
      Z('Far left 6″', 48, 18, 6),
      Z('Far right 9″', 24, 18, 9),
      Z('Near left 9″', 48, 30, 9),
      Z('Near right 6″', 24, 30, 6)
    ],
    markers: [MK('B', 36, 18, 'nord'), MK('A', 36, 30, 'cs')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +3 if Seizing three or more; 2 VP per enemy Character destroyed this round.'
  },
  6: {
    name: 'Off-Balance',
    zones: [Z('Left', 60, 24, 9), Z('Right', 24, 24, 9)],
    markers: [
      MK('B1', 42, 18, 'nord'),
      MK('A1', 42, 30, 'cs'),
      MK('B2', 12, 12, 'nord'),
      MK('A2', 12, 36, 'cs')
    ],
    vp: '4 VP per enemy Objective Marker destroyed this round; 2 VP per zone Seized; +1 if Seizing both; 2 VP for slaying the enemy Warlord.'
  },
  7: {
    name: 'Melee',
    zones: [
      Z('Kingsfield', 12, 24, 9),
      Z('Ashen Ford', 60, 24, 9),
      Z('Old Well', 30, 18, 6),
      Z('Shrine Stones', 42, 30, 6)
    ],
    markers: [],
    vp: '2 VP per 6″ zone and 3 VP per 9″ zone Seized; +2 if Seizing two or more; 2 VP per enemy Regiment and 2 per enemy Character destroyed this round; 2 VP for slaying the enemy Warlord.'
  },
  8: {
    name: 'Bulwark',
    zones: [Z('Left', 54, 24, 9), Z('Right', 18, 24, 9)],
    markers: [MK('A', 54, 24, 'cs'), MK('B', 18, 24, 'nord'), MK('C', 36, 24, 'neutral')],
    vp: '3 VP per enemy Objective Marker destroyed this round; 3 VP for destroying the centre marker; 2 VP per zone Seized; +1 if Seizing both; 2 VP for slaying the enemy Warlord. +2 for the Left zone (as the bottom player sees it) in rounds 3, 5, 7, 9 and for the Right zone in rounds 2, 4, 6, 8. A zone holding your own friendly marker is Contested: the enemy cannot Seize it.'
  },
  9: {
    name: 'Foresight',
    zones: [
      Z('Zone 1', 66, 30, 6),
      Z('Zone 2', 54, 18, 6),
      Z('Centre', 36, 24, 6),
      Z('Zone 3', 18, 30, 6),
      Z('Zone 4', 6, 18, 6)
    ],
    markers: [],
    pick: 'secret',
    vp: '2 VP per zone Seized; +2 if Seizing two zones other than the centre; +1 if Seizing the centre. After Supremacy each player secretly picks a non-central zone; picked zones score nothing this round, but a zone both players picked scores double.'
  },
  10: {
    name: 'Head-to-Head',
    zones: [Z('B', 54, 12, 6, 'nord'), Z('A', 54, 36, 6, 'cs'), Z('Big zone', 18, 24, 9)],
    markers: [],
    vp: "3 VP for Seizing the 9″ zone; 4 VP for Seizing the enemy's friendly 6″ zone (A is the bottom player's, B the top player's); 2 VP per enemy Regiment and 2 per enemy Character destroyed this round; 2 VP for slaying the enemy Warlord."
  },
  11: {
    name: 'Maelstrom',
    zones: [Z('Left', 60, 24, 9), Z('Centre', 36, 24, 6), Z('Right', 12, 24, 9)],
    markers: [],
    from: 1,
    vp: 'Zones score from round 1. Rounds 1-4 and 9-10: 2 VP for the 6″ zone and 1 VP per 9″ zone Seized. Rounds 5-8: 1 VP for the 6″ zone and 2 VP per 9″ zone.'
  },
  12: {
    name: 'Grind Them Down',
    zones: [
      Z('Far left', 54, 18, 6),
      Z('Far right', 18, 18, 6),
      Z('Near left', 54, 30, 6),
      Z('Near right', 18, 30, 6),
      Z('Centre', 36, 24, 9)
    ],
    markers: [],
    pick: 'grind',
    vp: '1 VP per zone Seized; +2 if Seizing two or more. After Supremacy each player picks a 6″ zone with none of their own regiments in range: +3 if they Seize it this round.'
  }
};
function scenId() {
  return (state && state.scenario) || 7;
}
function scenOf() {
  return SCEN[scenId()] || SCEN[7];
}
function markerUnits(id) {
  return (SCEN[id].markers || []).map((m, i) => ({
    id: 'm-' + (i + 1),
    side: m.side,
    name: 'Objective Marker ' + m.name,
    short: 'Marker ' + m.name,
    type: 'marker',
    cls: 'Objective',
    stands: 1,
    files: 1,
    sw: 2,
    sd: 2,
    m: 0,
    stats: { M: 0, V: 0, C: 0, A: 0, W: 3, R: '–', D: 3, E: 0 },
    rules: [],
    abilities: [],
    effects: [],
    dmg: { cs: 0, nord: 0 },
    wounds: 0,
    onTable: true,
    x: m.x,
    y: m.y,
    facing: 0,
    activated: true,
    charActivated: true
  }));
}
function isMarker(u) {
  return u && u.type === 'marker';
}
let zoneKey = '';
function drawZones() {
  const zs = zonesOf(),
    k = JSON.stringify(zs);
  if (k === zoneKey) return;
  zoneKey = k;
  const zg = $('zones'),
    sg = $('stones');
  zg.innerHTML = '';
  sg.innerHTML = '';
  zs.forEach(z => {
    const fill = z.friendly === 'cs' ? COL.cs.light : z.friendly === 'nord' ? COL.nord.light : '#D9B44A';
    const c = el(
      'circle',
      { cx: px(z.x), cy: py(z.y), r: z.r * S, fill, stroke: z.friendly ? fill : '#E8C65A' },
      zg
    );
    el('title', {}, c).textContent = z.name;
    stones(px(z.x), py(z.y), z.r >= 4 ? 5 : 3, z.r >= 4 ? 13 : 8, sg);
  });
}
function drawMarker(u, g) {
  const c = u.side === 'cs' ? COL.cs.fill : u.side === 'nord' ? COL.nord.fill : '#6B5638';
  const grp = el(
    'g',
    { transform: `translate(${px(u.x)} ${py(u.y)})`, 'data-id': u.id, style: 'cursor:pointer' },
    g
  );
  el(
    'rect',
    { x: -7, y: -7, width: 14, height: 14, rx: 2, fill: c, stroke: '#F3E6C4', 'stroke-width': 1.4 },
    grp
  );
  const t = el(
    'text',
    {
      x: 0,
      y: 0.5,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      fill: '#FFF3E0',
      'font-size': 9,
      'font-weight': 700,
      'font-family': 'Alegreya Sans, sans-serif'
    },
    grp
  );
  t.textContent = (u.short || '').replace('Marker ', '');
  const d = Math.max(u.dmg?.cs || 0, u.dmg?.nord || 0);
  if (d) {
    const wg = el('g', { transform: 'translate(7 -7)' }, grp);
    el('circle', { cx: 0, cy: 0, r: 5, fill: '#B3261E', stroke: '#FFF3E0', 'stroke-width': 1 }, wg);
    const wt = el(
      'text',
      {
        x: 0,
        y: 0.5,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: '#FFF3E0',
        'font-size': 8,
        'font-weight': 700
      },
      wg
    );
    wt.textContent = String(d);
  }
}
function zoneControl() {
  const R = state.round || 1;
  return zonesOf().map(z => {
    const tot = { cs: 0, nord: 0 },
      sz = { cs: 0, nord: 0 };
    const contested = { cs: false, nord: false };
    all()
      .filter(u => u.onTable && !u.destroyed)
      .forEach(u => {
        if (isMarker(u)) {
          if (u.side !== 'neutral' && Math.hypot(u.x - z.x, u.y - z.y) <= z.r + 1.4)
            contested[u.side === 'cs' ? 'nord' : 'cs'] = true;
          return;
        }
        const k = standsOf(u).filter(s => inZone(s.poly, z)).length;
        if (!k) return;
        tot[u.side] += k;
        sz[u.side] += srSeizeStands(u, z, k);
        if (rh(RU(u), 'Unyielding') && !(u.effects || []).includes('Broken'))
          contested[u.side === 'cs' ? 'nord' : 'cs'] = true;
      });
    /* Standard of Last Oration: a regiment carrying it destroyed this round within range of the zone */
    const oration = all().find(
      u =>
        u.destroyed &&
        u.destroyedRound === R &&
        upgOf(u, /Last Oration/) &&
        z.friendly !== u.side &&
        inZone(corners(u), z)
    );
    const holder = oration
      ? oration.side
      : ['cs', 'nord'].find(s => {
          const o = s === 'cs' ? 'nord' : 'cs';
          return z.friendly !== s && !contested[s] && tot[s] > tot[o] && sz[s] > sz[o];
        }) || null;
    return Object.assign({}, z, { tot, sz, holder, vp: z.size === 9 ? 3 : 2 });
  });
}
function scoreRound(R) {
  const sc = scenOf(),
    id = scenId(),
    zc = zoneControl(),
    from = sc.from || 2,
    add = { cs: 0, nord: 0 },
    lines = { cs: [], nord: [] };
  const P = (s, v, t) => {
    if (!v) return;
    add[s] += v;
    lines[s].push(t + ' ' + v);
  };
  const opp = s => (s === 'cs' ? 'nord' : 'cs'),
    held = s => (R >= from ? zc.filter(z => z.holder === s) : []);
  const dead = (state.units || []).filter(u => u.destroyed && u.destroyedRound === R);
  const regs = s => dead.filter(u => !isMarker(u) && u.side === opp(s)),
    chars = s => regs(s).filter(u => u.charName),
    wl = s => regs(s).some(u => u.charName && u.warlord);
  const mk = s => dead.filter(u => isMarker(u) && u.destroyedBy === s),
    enemyMk = s => mk(s).filter(u => u.side === opp(s));
  const picks = state.picks || {};
  ['cs', 'nord'].forEach(s => {
    const H = held(s),
      hn = H.map(z => z.name);
    if (id === 1) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 3) P(s, 2, 'three or more zones');
      if (H.length > held(opp(s)).length) P(s, 1, 'more zones than the enemy');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 2) {
      const denied = [picks.cs, picks.nord].filter(Boolean);
      const L = H.filter(z => !denied.includes(z.name));
      P(s, 2 * L.length, 'zones');
      if (L.length >= 3) P(s, 2, 'three or more zones');
      if (H.length === zc.length) P(s, 1, 'all zones');
    }
    if (id === 3) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 1, 'two or more zones');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
      if (R <= 4 || R >= 9) P(s, H.filter(z => z.name !== 'Centre').length, 'side zones');
      else if (hn.includes('Centre')) P(s, 2, 'centre zone');
    }
    if (id === 4) {
      const m = mk(s).filter(u => u.side !== s).length;
      P(s, 3 * m, 'markers destroyed');
      if (m >= 2) P(s, 2, 'two or more markers this round');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 2, 'both zones');
    }
    if (id === 5) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 3) P(s, 3, 'three or more zones');
      P(s, 2 * chars(s).length, 'enemy characters');
    }
    if (id === 6) {
      P(s, 4 * enemyMk(s).length, 'enemy markers');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 1, 'both zones');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 7) {
      H.forEach(z => P(s, z.size === 9 ? 3 : 2, z.name));
      if (H.length >= 2) P(s, 2, 'two or more zones');
      P(s, 2 * regs(s).length, 'enemy regiments');
      P(s, 2 * chars(s).length, 'enemy characters');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 8) {
      P(s, 3 * enemyMk(s).length, 'enemy markers');
      if (mk(s).some(u => u.side === 'neutral')) P(s, 3, 'centre marker');
      P(s, 2 * H.length, 'zones');
      if (H.length >= 2) P(s, 1, 'both zones');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
      if ([3, 5, 7, 9].includes(R) && hn.includes('Left')) P(s, 2, 'Left zone bonus');
      if ([2, 4, 6, 8].includes(R) && hn.includes('Right')) P(s, 2, 'Right zone bonus');
    }
    if (id === 9) {
      const pc = picks.cs,
        pn = picks.nord,
        same = pc && pc === pn;
      H.forEach(z => {
        if (same && z.name === pc) P(s, 4, z.name + ' (picked by both, double)');
        else if (z.name !== pc && z.name !== pn) P(s, 2, z.name);
      });
      if (H.filter(z => z.name !== 'Centre').length >= 2) P(s, 2, 'two zones besides the centre');
      if (hn.includes('Centre')) P(s, 1, 'centre zone');
    }
    if (id === 10) {
      if (H.some(z => z.size === 9)) P(s, 3, 'the 9″ zone');
      if (hn.includes(s === 'cs' ? 'B' : 'A')) P(s, 4, 'the enemy’s zone');
      P(s, 2 * regs(s).length, 'enemy regiments');
      P(s, 2 * chars(s).length, 'enemy characters');
      if (wl(s)) P(s, 2, 'enemy Warlord slain');
    }
    if (id === 11) {
      const early = R <= 4 || R >= 9;
      H.forEach(z => P(s, z.size === 6 ? (early ? 2 : 1) : early ? 1 : 2, z.name));
    }
    if (id === 12) {
      P(s, H.length, 'zones');
      if (H.length >= 2) P(s, 2, 'two or more zones');
      if (picks[s] && hn.includes(picks[s])) P(s, 3, 'picked zone ' + picks[s]);
    }
  });
  return { add, lines };
}
/* scenario picks after Supremacy */
function pickOptions(side) {
  const sc = scenOf(),
    id = scenId(),
    zs = zonesOf();
  const p = state.picks || {};
  if (sc.pick === 'deny') return zs.filter(z => z.name !== p[side === 'cs' ? 'nord' : 'cs']).map(z => z.name);
  if (sc.pick === 'secret') return zs.filter(z => z.name !== 'Centre').map(z => z.name);
  if (sc.pick === 'grind')
    return zs
      .filter(
        z =>
          z.size === 6 &&
          !all().some(
            u =>
              u.side === side &&
              !isMarker(u) &&
              u.onTable &&
              !u.destroyed &&
              standsOf(u).some(s => inZone(s.poly, z))
          )
      )
      .map(z => z.name);
  return [];
}
function aiPick() {
  const sc = scenOf(),
    opts = pickOptions(AI);
  if (!opts.length) return null;
  const zc = zoneControl();
  const score = n => {
    const z = zc.find(q => q.name === n);
    return z ? z : { tot: { cs: 0, nord: 0 } };
  };
  if (sc.pick === 'grind') {
    const mine = all().filter(u => u.side === AI && u.onTable && !isMarker(u));
    return opts
      .map(n => {
        const z = zonesOf().find(q => q.name === n);
        return { n, d: Math.min(99, ...mine.map(u => Math.hypot(u.x - z.x, u.y - z.y))) };
      })
      .sort((a, b) => a.d - b.d)[0].n;
  }
  const hu = all().filter(u => u.side === HU && u.onTable && !isMarker(u));
  return opts
    .map(n => {
      const z = zonesOf().find(q => q.name === n);
      return { n, d: Math.min(99, ...hu.map(u => Math.hypot(u.x - z.x, u.y - z.y))) - score(n).tot.cs * 2 };
    })
    .sort((a, b) => a.d - b.d)[0].n;
}
async function afterSupremacy(first) {
  if (await supStart(first)) return;
  await afterSupremacy0(first);
}
async function afterSupremacy0(first) {
  const sc = scenOf();
  if (!sc.pick) {
    await startActivations(first);
    return;
  }
  await putState({ step: 'picks', first, picks: {}, phase: 'Round ' + state.round + ' · Scenario choice' });
  await nextPick();
}
async function nextPick() {
  const p = state.picks || {},
    first = state.first,
    second = first === HU ? AI : HU,
    order = [first, second];
  const who = order.find(s => !p[s]);
  if (!who) {
    await startActivations(first);
    return;
  }
  if (PVP()) {
    if (!pickOptions(who).length) {
      await putState({ picks: Object.assign({}, p, { [who]: 'none' }) });
      return nextPick();
    }
    render();
    return;
  }
  if (who === AI) {
    const n = aiPick();
    await putState({ picks: Object.assign({}, p, { [AI]: n || 'none' }) });
    return nextPick();
  }
  if (!pickOptions(HU).length) {
    await putState({ picks: Object.assign({}, p, { [HU]: 'none' }) });
    return nextPick();
  }
  render();
}
async function humanPick(n) {
  await putState({ picks: Object.assign({}, state.picks || {}, { [HU]: n }) });
  await nextPick();
}
async function startActivations(first) {
  await putState({
    step: 'activations',
    turn: first,
    phase:
      'Round ' +
      state.round +
      ' · ' +
      (PVP() ? N(first) + ' go first' : first === AI ? N(AI) + ' go first' : 'Your turn')
  });
  if (first === AI && !PVP()) runAITurn();
}
function picksText() {
  const sc = scenOf(),
    p = state.picks || {};
  if (!sc.pick) return '';
  const show = s => (p[s] && p[s] !== 'none' ? p[s] : 'none');
  if (sc.pick === 'secret') return ` Your secret pick: ${show(HU)}.`;
  return ` Picks: you ${show(HU)}, ${N(AI)} ${show(AI)}.`;
}
function waitP(t) {
  const p = document.createElement('span');
  p.className = 'read';
  p.textContent = t;
  return p;
}
