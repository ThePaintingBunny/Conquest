/*
 * Test field: the table
 *
 * Entering and leaving the test field, dropping regiments and setting conditions on them.
 *
 * In this file: tfDrag, tfSide, tfReserve, tfAddOpen, tfFx, tfEditOpen, tfOneOpen, tfEnter(),
 *   tfLeave(), tfUnits(), tfSet(), tfSpot(), tfDrop(), tfWmax(), tfKey(), tfDropChar(), tfSeeds()
 */

let tfDrag = null,
  tfSide = 'cs',
  tfReserve = false,
  tfAddOpen = false,
  tfFx = '',
  tfEditOpen = true,
  tfOneOpen = true;

async function tfEnter() {
  act = null;
  cb = null;
  selId = null;
  charAct = null;
  await putState({
    mode: 'test',
    sbSide: 'cs',
    step: 'activations',
    units: [],
    fr: {},
    sup: {},
    army: { cs: [], nord: [] },
    round: 1,
    turn: 'cs',
    zones: [],
    terrain: [],
    sbN: 0,
    vp: { cs: 0, nord: 0 },
    names: { cs: 'South', nord: 'North' },
    aiStack: [],
    huStack: [],
    huHeld: null,
    huLastCard: null,
    strategicHeld: true,
    strategicUsedRound: 0,
    hammerUsed: false,
    moves: [],
    picks: {},
    ready: {},
    phase: 'Test field',
    lastTitle: 'Test field',
    lastText: 'Drop regiments on the table, then activate them as often as you like.'
  });
  applySeat();
  render();
}

async function tfLeave() {
  act = null;
  cb = null;
  selId = null;
  charAct = null;
  await putState({
    mode: 'ai',
    sbSide: null,
    step: 'setup',
    units: [],
    army: null,
    fr: null,
    sup: null,
    aiSupWant: null,
    round: 0,
    turn: null,
    zones: null,
    terrain: null,
    vp: { cs: 0, nord: 0 },
    names: null,
    aiStack: [],
    huStack: [],
    huHeld: null,
    huLastCard: null,
    strategicHeld: false,
    moves: [],
    setup: null,
    phase: 'New game',
    ready: {},
    chooser: null,
    reinfTurn: 'cs',
    lastTitle: 'New game',
    lastText: 'Set up the armies to begin.'
  });
  applySeat();
  render();
}

function tfUnits(fn) {
  return putState({
    units: (state.units || [])
      .map(u => {
        const r = fn(u);
        return r === undefined ? u : r;
      })
      .filter(Boolean)
  });
}

function tfSet(id, patch) {
  return tfUnits(u =>
    u.id === id ? Object.assign({}, u, typeof patch === 'function' ? patch(u) : patch) : u
  );
}

function tfSpot(side, k) {
  const n = (state.units || []).filter(u => u.side === side && u.onTable).length + k;
  return { x: 12 + (n % 5) * 12, y: side === 'cs' ? 30 + Math.floor(n / 5) * 6 : 18 - Math.floor(n / 5) * 6 };
}

async function tfDrop(L, spec) {
  const side = tfSide;
  let n = state.sbN || 0;
  const units = buildUnits(side, L).map((u, i) => {
    n++;
    const p = tfSpot(side, i);
    return Object.assign(
      u,
      {
        id: 't' + (side === 'cs' ? 's' : 'n') + '-' + n,
        x: p.x,
        y: Math.max(4, Math.min(44, p.y)),
        onTable: !tfReserve,
        arriving: tfReserve
      },
      spec ? { tfSpec: spec } : {}
    );
  });
  const A = Object.assign({ cs: [], nord: [] }, state.army || {});
  A[side] = [...new Set((A[side] || []).concat(L.armyRules || []))];
  await putState({
    army: A,
    units: (state.units || []).concat(units),
    sbN: n,
    lastTitle: 'Test field',
    lastText:
      units.length +
      ' regiment' +
      (units.length === 1 ? '' : 's') +
      ' dropped for ' +
      (side === 'cs' ? 'South' : 'North') +
      (tfReserve ? ' (arriving from reserves)' : '') +
      '.'
  });
  if (units[0]) selId = units[0].id;
  if (!spec) tfAddOpen = false;
  toast(
    tfReserve
      ? 'Dropped in reserves: activate it to bring it on from an edge.'
      : 'Dropped on the table. Drag to move; Q and E turn the selected regiment.'
  );
  render();
}

function tfWmax(u) {
  const W = +(u.stats && u.stats.W) || 4;
  return Math.max(1, (u.stands || 1) * W + (u.auxStats ? +u.auxStats.W || 0 : 0));
}

function tfKey(ev) {
  const u = base(selId);
  if (!u || !u.onTable) return;
  const k = ev.key;
  let p = null;
  if (k === 'q' || k === 'Q') p = { facing: ((u.facing || 0) - 15 + 360) % 360 };
  if (k === 'e' || k === 'E') p = { facing: ((u.facing || 0) + 15) % 360 };
  const d0 = { ArrowLeft: [0.5, 0], ArrowRight: [-0.5, 0], ArrowUp: [0, -0.5], ArrowDown: [0, 0.5] }[k],
    d = d0 && (FLIP ? [-d0[0], -d0[1]] : d0);
  if (d) p = { x: u.x + d[0], y: u.y + d[1] };
  if (p) {
    ev.preventDefault();
    tfSet(u.id, p);
  }
}

function tfDropChar(u) {
  const o = (u.order || []).filter(t => t !== 'c');
  const st = Math.max(1, (u.stands || 2) - 1);
  const x = Object.assign({}, u, { stands: st, files: Math.min(u.files || 1, st) });
  ['char', 'charName', 'charStats', 'charRules', 'warlord', 'spells', 'charActivated'].forEach(
    k => delete x[k]
  );
  if (u.order) x.order = o;
  return x;
}

function tfSeeds(u, d) {
  return putState({
    units: state.units.map(x =>
      x.id === u.id ? Object.assign({}, x, { seeds: Math.max(0, Math.min(3, (+x.seeds || 0) + d)) }) : x
    )
  });
}
