/* The test field: drop regiments, set conditions and activate freely. */
/* ---------- test field: drop regiments, set conditions, activate freely ---------- */
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
/* ---------- test field: one regiment at a time, and edit what is already on the table ---------- */
let qa = (() => {
  try {
    return JSON.parse(localStorage.getItem('tfQuick') || 'null') || {};
  } catch (e) {
    return {};
  }
})();
function qaSave() {
  try {
    localStorage.setItem('tfQuick', JSON.stringify(qa));
  } catch (e) {}
}
function withBld(tmp, fn) {
  const keep = bld;
  bld = tmp;
  try {
    return fn();
  } finally {
    bld = keep;
  }
}
function qaFacE(fac) {
  return ENCY.find(f => f.name === fac) || null;
}
function qaUnitE(fac, name) {
  const f = qaFacE(fac);
  return (f && f.units.find(x => x.name === name)) || null;
}
function qaUnits(fac) {
  const f = qaFacE(fac);
  return f ? f.units.filter(u => u.kind !== 'char' || u.type === 'Monster') : [];
}
/* characters that may lead (join) this regiment */
function qaRide(fac, ch, unit) {
  const U = (UPG[fac] || { list: [] }).list;
  const e = U.find(
    x =>
      RIDE[x[1]] &&
      RIDE[x[1]].test(unit) &&
      String(x[3])
        .split(/,\s*|\s*\(/)
        .map(t => t.trim())
        .includes(ch)
  );
  return e ? e[1] : null;
}
function qaChars(fac, unit) {
  const f = qaFacE(fac),
    u = qaUnitE(fac, unit);
  if (!f || !u || u.kind === 'char') return [];
  if (u.type === 'Monster')
    return f.units.filter(c => c.kind === 'char' && c.type !== 'Monster' && qaRide(fac, c.name, u.name));
  return withBld({ fac, wbs: [], warlord: 0 }, () =>
    f.units.filter(c => {
      if (c.kind !== 'char' || c.type === 'Monster') return false;
      try {
        return joinable({ char: c.name }, { unit: u.name });
      } catch (e) {
        return c.type === u.type;
      }
    })
  );
}
function qaLeader(spec) {
  const u = qaUnitE(spec.fac, spec.unit);
  return u && u.kind === 'char' ? u : qaUnitE(spec.fac, spec.char);
}
function qaClean(spec) {
  const s = Object.assign(
    { fac: '', unit: '', char: '', stands: null, opts: [], upg: [], warlord: false },
    spec || {}
  );
  const u = qaUnitE(s.fac, s.unit);
  if (!u) return s;
  if (u.kind === 'char') {
    s.char = '';
    s.stands = 1;
    s.opts = [];
  } else {
    const b = bldBase(u),
      single = /^1 stand/.test(u.stands || '');
    s.stands = single ? b : Math.max(b, Math.min(12, +s.stands || b));
    if (s.char && !qaChars(s.fac, s.unit).some(c => c.name === s.char)) s.char = '';
    const O = withBld({ fac: s.fac, wbs: [], warlord: 0 }, () => regOptions(u).opts.map(o => o.name));
    s.opts = (s.opts || []).filter(n => O.includes(n));
  }
  const L = qaLeader(s);
  if (!L) {
    s.upg = [];
    s.warlord = false;
  } else {
    const U = (UPG[s.fac] || { list: [] }).list;
    s.upg = (s.upg || []).filter(n => U.some(e => e[1] === n) && !RIDE[n]);
    if (!canWarlord(L)) s.warlord = false;
    const rk = u.kind !== 'char' && u.type === 'Monster' && s.char ? qaRide(s.fac, s.char, u.name) : null;
    if (rk) s.upg.push(rk);
  }
  return s;
}
function qaList(spec) {
  const s = qaClean(spec),
    f = qaFacE(s.fac),
    u = qaUnitE(s.fac, s.unit);
  if (!f || !u) return null;
  const w =
    u.kind === 'char'
      ? { char: u.name, regs: [], upg: s.upg.slice(), custom: [] }
      : {
          char: s.char || '',
          bare: !s.char,
          regs: [{ unit: u.name, stands: s.stands, opts: s.opts.slice(), custom: [] }],
          joins: s.char ? 0 : null,
          upg: s.char ? s.upg.slice() : [],
          custom: []
        };
  const L = withBld({ fac: f.name, wbs: [w], warlord: s.warlord ? 0 : -1 }, () => bldToList());
  if (!L) return null;
  L.units.forEach(x => {
    if (x.character) x.character.warlord = !!s.warlord;
    if (x.warlordMonster != null) x.warlordMonster = !!s.warlord;
  });
  return L;
}
/* the full cost of a quick-add regiment: regiment, options, character and its upgrades */
function qaPts(spec) {
  const s = qaClean(spec),
    f = qaFacE(s.fac),
    u = qaUnitE(s.fac, s.unit);
  if (!f || !u) return null;
  const w =
    u.kind === 'char'
      ? { char: u.name, regs: [], upg: s.upg.slice(), custom: [] }
      : {
          char: s.char || '',
          bare: !s.char,
          regs: [{ unit: u.name, stands: s.stands, opts: s.opts.slice(), custom: [] }],
          joins: s.char ? 0 : null,
          upg: s.char ? s.upg.slice() : [],
          custom: []
        };
  return withBld({ fac: f.name, wbs: [w], warlord: s.warlord ? 0 : -1 }, () => {
    const reg = w.regs.reduce((a, r) => a + rowPts(r), 0),
      ch = w.char ? wbPtsChar(w) : 0;
    return { total: reg + ch, reg, ch };
  });
}
/* best guess at the setup of a regiment that came from a full army */
function qaSpecOf(u) {
  if (u.tfSpec) return qaClean(u.tfSpec);
  const fac = u.fac || frFac(u),
    base = frBase(u),
    e = qaUnitE(fac, base);
  const monChar = !!(e && e.kind === 'char');
  const O =
    e && !monChar ? withBld({ fac, wbs: [], warlord: 0 }, () => regOptions(e).opts.map(o => o.name)) : [];
  const ab = (u.abilities || []).map(a => String(a[0]));
  return qaClean({
    fac,
    unit: base,
    char: u.charName || '',
    stands: monChar ? 1 : regTot(u),
    opts: O.filter(n => ab.includes(n) || (n === 'Veteran' && u.vetRole)),
    upg: itemsOf(u),
    warlord: !!(u.warlord || u.warlordMonster)
  });
}
function tfRebuild(u, spec) {
  const s = qaClean(spec),
    L = qaList(s);
  if (!L || !L.units.length) {
    toast('That setup could not be built.');
    return;
  }
  const n = buildUnits(u.side, L)[0];
  const keep = [
    'id',
    'x',
    'y',
    'facing',
    'side',
    'onTable',
    'arriving',
    'activated',
    'effects',
    'temp',
    'destroyed'
  ];
  const x = Object.assign({}, n, { tfSpec: s });
  keep.forEach(k => {
    if (u[k] !== undefined) x[k] = u[k];
  });
  if (frBase(u) === frBase(n)) ((x.name = u.name), (x.short = u.short || x.short));
  if (u.charName && u.charName === n.charName) {
    x.charActivated = u.charActivated;
    x.charWounds = u.charWounds;
  }
  x.wounds = Math.min(u.wounds || 0, Math.max(0, tfWmax(x) - 1));
  ['order', 'slotBase', 'slotFiles', 'charSlain'].forEach(k => delete x[k]);
  return tfUnits(y =>
    y.id === u.id
      ? x
      : s.warlord && y.side === u.side && (y.warlord || y.warlordMonster)
        ? Object.assign({}, y, { warlord: false, warlordMonster: false })
        : y
  );
}
/* the setup form: faction and regiment when adding, then leader, stands, options, upgrades, Warlord */
function qaForm(spec, onChange, adding) {
  const s = qaClean(spec),
    box = bEl('div', { className: 'qa' });
  const set = p => onChange(qaClean(Object.assign({}, s, p)));
  const row = (label, ...kids) => {
    const r = bEl('div', { className: 'tf-row qa-row' });
    r.append(bEl('span', { className: 'qa-l', textContent: label }), ...kids);
    box.append(r);
    return r;
  };
  const sel = (label, val, opts, fn) => {
    const e = bEl('select', { className: 'tf-in qa-sel' });
    e.setAttribute('aria-label', label);
    opts.forEach(([v, t, dis]) => {
      const o = bEl('option', { value: v, textContent: t });
      if (dis) o.disabled = true;
      e.append(o);
    });
    e.value = val;
    e.onchange = () => fn(e.value);
    return e;
  };
  if (adding) {
    row(
      'Faction',
      sel('Faction', s.fac, [['', 'Choose a faction…', true]].concat(ENCY.map(f => [f.name, f.name])), v =>
        set({ fac: v, unit: '', char: '', opts: [], upg: [] })
      )
    );
    if (s.fac) {
      /* listed alphabetically */
      const U = qaUnits(s.fac)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      row(
        'Regiment',
        sel(
          'Regiment',
          s.unit,
          [['', 'Choose a regiment…', true]].concat(
            U.map(u => [
              u.name,
              u.name +
                (u.kind === 'char' ? ' (Monster character)' : '') +
                ' · ' +
                (u.cls ? u.cls + ' ' : '') +
                u.type
            ])
          ),
          v => set({ unit: v, stands: null, opts: [] })
        )
      );
    }
  }
  const u = qaUnitE(s.fac, s.unit);
  if (!u) return box;
  if (u.kind !== 'char') {
    const C = qaChars(s.fac, s.unit)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    row(
      'Led by',
      sel('Character', s.char, [['', 'No character']].concat(C.map(c => [c.name, c.name])), v =>
        set({ char: v, upg: v === s.char ? s.upg : [] })
      )
    );
    if (!C.length)
      box.lastChild.append(
        bEl('span', { className: 'ab-note', textContent: 'No character in this faction can join it.' })
      );
    const b = bldBase(u);
    if (!/^1 stand/.test(u.stands || ''))
      row(
        'Stands',
        abStepper(s.stands, b, 12, v => set({ stands: v }), 'stands'),
        bEl('span', {
          className: 'ab-note',
          textContent: 'at least ' + b + (s.char ? ', plus the character' : '')
        })
      );
    const RO = withBld({ fac: s.fac, wbs: [], warlord: 0 }, () => regOptions(u)),
      O = RO.opts;
    if (O.length) {
      const r = row('Options');
      const nOff = s.opts.filter(n => (O.find(o => o.name === n) || {}).kind === 'off').length;
      const oi = infoLine(
        s.opts.length ? s.opts.map(n => optInfo(O.find(o => o.name === n))).join('\n') : null
      );
      O.forEach(o => {
        const on = s.opts.includes(o.name),
          full = !on && o.kind === 'off' && RO.max != null && nOff >= RO.max,
          auxTaken =
            !on && o.kind === 'aux' && s.opts.some(n => (O.find(q => q.name === n) || {}).kind === 'aux');
        const bt = abBtn(
          (on ? '✓ ' : '') + o.name,
          () => set({ opts: on ? s.opts.filter(n => n !== o.name) : s.opts.concat([o.name]) }),
          'ab-tog' + (on ? ' on' : '')
        );
        bt.title =
          (o.detail || '') +
          (o.cost ? ' · ' + o.cost + ' pts' : '') +
          (full
            ? ' · Officer limit reached (' + RO.max + ' for this regiment)'
            : auxTaken
              ? ' · one Auxiliary only'
              : '');
        bt.disabled = full || auxTaken;
        bt.setAttribute('aria-pressed', String(on));
        hookInfo(
          bt,
          optInfo(o) +
            (full
              ? ' · Officer limit reached (' + RO.max + ' for this regiment)'
              : auxTaken
                ? ' · one Auxiliary only'
                : ''),
          oi
        );
        r.append(bt);
      });
      r.after(oi);
    }
  }
  const L = qaLeader(s);
  if (L) {
    const U = (UPG[s.fac] || { list: [] }).list;
    if (U.length && !charNoUpg(L)) {
      const r = row('Upgrades · ' + L.name);
      const ui = infoLine(
        s.upg.length
          ? s.upg
              .map(n => {
                const e = U.find(x => x[1] === n);
                return e ? upgInfo(e) : n;
              })
              .join('\n')
          : null
      );
      r.after(ui);
      withBld(
        { fac: s.fac, wbs: [{ char: L.name, regs: [], upg: s.upg }], warlord: s.warlord ? 0 : -1 },
        () =>
          U.forEach(e => {
            const on = s.upg.includes(e[1]);
            let why = '';
            try {
              why = on ? '' : upgWhy(e, L, 0);
            } catch (x) {}
            if (/^Taken/.test(why || '')) why = '';
            const bt = abBtn(
              (on ? '✓ ' : '') + e[1],
              () => set({ upg: on ? s.upg.filter(n => n !== e[1]) : s.upg.concat([e[1]]) }),
              'ab-tog' + (on ? ' on' : '')
            );
            hookInfo(bt, upgInfo(e) + (why ? ' · ' + why : ''), ui);
            bt.disabled = !!why && !on;
            bt.setAttribute('aria-pressed', String(on));
            r.append(bt);
          })
      );
    }
    if (canWarlord(L)) {
      const bt = abBtn(
        (s.warlord ? '★ ' : '') + 'Warlord',
        () => set({ warlord: !s.warlord }),
        'ab-tog' + (s.warlord ? ' on' : '')
      );
      bt.setAttribute('aria-pressed', String(!!s.warlord));
      row('Warlord', bt);
    }
  }
  return box;
}

function renderTestField(tb, info, mk, add) {
  const nOn = s => (state.units || []).filter(u => u.side === s && u.type !== 'marker').length;
  info.textContent =
    'Test field: drop regiments for either side, set up the situation, then activate any of your regiments as often as you like. Nothing here is scored.';
  const top = bEl('div', { className: 'tf-row' });
  const ctl = bEl('div', { className: 'grp' });
  ctl.setAttribute('role', 'group');
  ctl.setAttribute('aria-label', 'You control');
  [
    ['cs', 'Control South (' + colName('cs') + ')'],
    ['nord', 'Control North (' + colName('nord') + ')']
  ].forEach(([sd, t]) => {
    const b = bEl('button', { type: 'button', textContent: t + ' · ' + nOn(sd) });
    b.setAttribute('aria-pressed', String(ME === sd));
    b.onclick = async () => {
      if (act) {
        toast('Finish or undo the current activation first.');
        return;
      }
      if (ME !== sd) {
        await putState({ sbSide: sd });
        applySeat();
        render();
      }
    };
    ctl.appendChild(b);
  });
  top.append(
    ctl,
    bEl('span', { className: 'tf-l', textContent: 'Round' }),
    abStepper(state.round || 1, 1, 10, v => putState({ round: v }), 'round'),
    mk(
      'Next round (ready everyone)',
      () => {
        if (act) {
          toast('Finish or undo the current activation first.');
          return;
        }
        const nr = Math.min(10, (state.round || 1) + 1),
          FRE = frRoundEnd(state.units || [], nr);
        putState({
          fr: FRE.fr,
          units: FRE.units.map(u =>
            Object.assign({}, u, {
              activated: false,
              charActivated: false,
              effects: (u.effects || []).filter(e => e === 'Broken' || /^Season: /.test(e))
            })
          ),
          round: nr,
          hammerUsed: false,
          strategicUsedRound: 0,
          moves: []
        });
      },
      true
    ),
    mk(
      'Ready everyone',
      () => tfUnits(u => Object.assign({}, u, { activated: false, charActivated: false })),
      true
    )
  );
  add(top);
  const t2 = bEl('div', { className: 'tf-row' });
  t2.append(
    mk(
      (state.terrain || []).length ? 'Shuffle terrain' : 'Add terrain',
      () => putState({ terrain: genTerrain() }),
      true
    )
  );
  {
    const b = mk(
      tfTerr ? 'Done editing terrain' : 'Place terrain',
      () => {
        tfTerr = !tfTerr;
        terrMode = 'manual';
        terrSel = null;
        terrKey = '';
        render();
      },
      true
    );
    b.setAttribute('aria-pressed', String(tfTerr));
    t2.append(b);
  }
  if ((state.terrain || []).length) t2.append(mk('Clear terrain', () => putState({ terrain: [] }), true));
  t2.append(
    mk(
      (state.zones || []).length ? 'Remove objective zones' : 'Add objective zones',
      () => putState({ zones: (state.zones || []).length ? [] : SCEN[7].zones }),
      true
    )
  );
  t2.append(
    mk(
      (state.units || []).length ? 'Clear the table' : 'Table is empty',
      () => {
        act = null;
        cb = null;
        selId = null;
        putState({ units: [], moves: [], fr: {}, sup: {}, army: { cs: [], nord: [] } });
      },
      true
    )
  );
  t2.append(mk('Leave the test field', tfLeave, true));
  t2.lastChild.classList.add('ng');
  t2.lastChild.previousSibling.disabled = !(state.units || []).length;
  {
    const cr = bEl('div', { className: 'tf-row col-row' });
    cr.append(colorPicker('cs', 'South colour', true), colorPicker('nord', 'North colour', true));
    add(cr);
  }
  add(t2);
  if (tfTerr) terrainPanel(add, mk);
  if (((state.army || {}).cs || []).length || ((state.army || {}).nord || []).length) add(armyRulesBox());
  if ((state.units || []).length) add(frPanel());
  // selected regiment: conditions
  const u = base(selId);
  if (u && u.type !== 'marker') {
    const box = bEl('div', { className: 'rev tf-sel' });
    box.append(bEl('h3', { textContent: 'Conditions · ' + u.name + (u.charName ? ' + ' + u.charName : '') }));
    if (!(act && act.id === u.id)) {
      const r0 = bEl('div', { className: 'tf-row' });
      const sg2 = bEl('div', { className: 'grp' });
      sg2.setAttribute('role', 'group');
      sg2.setAttribute('aria-label', 'Belongs to');
      [
        ['cs', 'South (' + colName('cs') + ')'],
        ['nord', 'North (' + colName('nord') + ')']
      ].forEach(([sd, t]) => {
        const b = bEl('button', { type: 'button', textContent: t });
        b.setAttribute('aria-pressed', String(u.side === sd));
        b.onclick = () => {
          if (u.side !== sd) tfSet(u.id, x => ({ side: sd, facing: ((x.facing || 0) + 180) % 360 }));
        };
        sg2.appendChild(b);
      });
      r0.append(bEl('span', { className: 'tf-l', textContent: 'Belongs to' }), sg2);
      box.append(r0);
    }
    if (act && act.id === u.id) {
      box.append(
        ptext(
          'Activating now: use the panel beside the map. Conditions unlock when the activation is saved or undone.'
        )
      );
      add(box);
    } else {
      {
        const sp = qaSpecOf(u);
        if (qaUnitE(sp.fac, sp.unit)) {
          const d = bEl('details', { className: 'qa-edit' });
          d.open = tfEditOpen;
          d.ontoggle = () => {
            tfEditOpen = d.open;
          };
          d.append(bEl('summary', { textContent: 'Setup: leader, stands, options, upgrades' }));
          d.append(qaForm(sp, ns => tfRebuild(u, ns), false));
          box.append(d);
        }
      }
      const r1 = bEl('div', { className: 'tf-row' });
      r1.append(
        bEl('span', { className: 'tf-l', textContent: 'Wounds taken' }),
        abStepper(u.wounds || 0, 0, tfWmax(u) - 1, v => tfSet(u.id, { wounds: v }), 'wounds')
      );
      r1.append(
        bEl('span', { className: 'tf-l', textContent: (u.stands || 1) + ' stands, ' + live(u) + ' left' })
      );
      if (u.auxStats)
        r1.append(
          bEl('span', { className: 'tf-l', textContent: (u.auxName || 'Auxiliary') + ' wounds' }),
          abStepper(
            u.auxWounds || 0,
            0,
            +u.auxStats.W || 6,
            v => tfSet(u.id, { auxWounds: v }),
            'auxiliary wounds'
          )
        );
      box.append(r1);
      const r2 = bEl('div', { className: 'tf-row' });
      r2.append(bEl('span', { className: 'tf-l', textContent: 'Effects' }));
      const E = u.effects || [];
      ['Broken', 'Inspired'].forEach(e => {
        const on = E.some(x => x === e || x.startsWith(e + ' ('));
        const b = abBtn(
          (on ? '✓ ' : '') + e,
          () =>
            tfSet(u.id, {
              effects: on ? E.filter(x => !(x === e || x.startsWith(e + ' ('))) : E.concat([e])
            }),
          'ab-tog' + (on ? ' on' : '')
        );
        b.setAttribute('aria-pressed', String(on));
        r2.append(b);
      });
      E.filter(e => !/^(Broken|Inspired)/.test(e)).forEach(e =>
        r2.append(
          abBtn('✕ ' + e, () => tfSet(u.id, { effects: E.filter(x => x !== e) }), 'ab-tog on', 'Remove ' + e)
        )
      );
      const inp = bEl('input', {
        type: 'text',
        value: tfFx,
        placeholder: 'Other effect, e.g. a spell',
        className: 'tf-in'
      });
      inp.setAttribute('aria-label', 'Add an effect');
      inp.oninput = () => {
        tfFx = inp.value;
      };
      const addFx = () => {
        const v = tfFx.trim();
        if (!v) return;
        tfFx = '';
        tfSet(u.id, { effects: E.concat([v]) });
      };
      inp.onkeydown = e => {
        if (e.key === 'Enter') addFx();
      };
      r2.append(inp, abBtn('Add', addFx, 'ab-ghost ab-small'));
      box.append(r2);
      const r3 = bEl('div', { className: 'tf-row' });
      if (u.activated || u.charActivated)
        r3.append(
          mk('Ready to activate again', () => tfSet(u.id, { activated: false, charActivated: false }))
        );
      if (u.onTable) {
        r3.append(
          mk('⟲ 15°', () => tfSet(u.id, { facing: ((u.facing || 0) - 15 + 360) % 360 }), true),
          mk('15° ⟳', () => tfSet(u.id, { facing: ((u.facing || 0) + 15) % 360 }), true),
          mk('Turn around', () => tfSet(u.id, { facing: ((u.facing || 0) + 180) % 360 }), true)
        );
        r3.append(
          mk(
            'Send to reserves',
            () => tfSet(u.id, { onTable: false, arriving: true, activated: false }),
            true
          )
        );
      } else
        r3.append(
          mk('Put it on the table', () => {
            const p = tfSpot(u.side, 0);
            tfSet(u.id, { onTable: true, arriving: false, x: p.x, y: Math.max(4, Math.min(44, p.y)) });
          })
        );
      r3.append(
        mk(
          'Remove from the field',
          () => {
            if (selId === u.id) selId = null;
            tfUnits(x => (x.id === u.id ? null : x));
          },
          true
        )
      );
      r3.lastChild.classList.add('ab-danger');
      box.append(r3);
      box.append(
        ptext(
          'Drag any regiment that is not activating to move it, whichever side it belongs to; Q and E turn the selected one. ' +
            (u.side === ME
              ? 'Activate it from the panel beside the map.'
              : 'It belongs to the side you are not controlling: switch control above to activate it, or charge it with one of yours.'),
          'hint'
        )
      );
      add(box);
    }
  } else
    add(
      ptext('Select a regiment on the map or in the rosters to set its wounds, effects and facing.', 'hint')
    );
  // adding regiments: the army builder with its own draft
  {
    const one = bEl('details', { className: 'rev tf-add' });
    one.open = tfOneOpen;
    one.ontoggle = () => {
      tfOneOpen = one.open;
    };
    one.append(bEl('summary', { textContent: 'Add one regiment' }));
    const r = bEl('div', { className: 'tf-row' });
    const g = bEl('div', { className: 'grp' });
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Drop for');
    [
      ['cs', 'For South (' + colName('cs') + ')'],
      ['nord', 'For North (' + colName('nord') + ')']
    ].forEach(([sd, t]) => {
      const b = bEl('button', { type: 'button', textContent: t });
      b.setAttribute('aria-pressed', String(tfSide === sd));
      b.onclick = () => {
        tfSide = sd;
        renderTurnbar();
      };
      g.appendChild(b);
    });
    const lab = bEl('label', { className: 'tf-chk' });
    const cbx = bEl('input', { type: 'checkbox', checked: tfReserve });
    cbx.onchange = () => {
      tfReserve = cbx.checked;
    };
    lab.append(cbx, document.createTextNode(' Arrive from reserves'));
    r.append(g, lab);
    one.append(r);
    one.append(
      qaForm(
        qa,
        ns => {
          qa = ns;
          qaSave();
          renderTurnbar();
        },
        true
      )
    );
    const s0 = qaClean(qa),
      ok = !!qaUnitE(s0.fac, s0.unit);
    const go = mk(
      ok
        ? 'Drop ' +
            s0.unit +
            (s0.char ? ' with the ' + s0.char : '') +
            (tfReserve ? ' in reserves' : ' on the table')
        : 'Choose a regiment first',
      () => {
        const L = qaList(qa);
        if (!L || !L.units.length) {
          toast('Choose a regiment first.');
          return;
        }
        tfDrop(L, qaClean(qa));
      }
    );
    go.disabled = !ok;
    one.append(bEl('div', { className: 'tf-row' }, [go]));
    one.append(
      ptext(
        'Only legal choices are offered: characters that may join this regiment, its stand range, its own options and the upgrades that character may take. Press again to drop another. Change a regiment that is already on the table under Setup when you select it.',
        'hint'
      )
    );
    add(one);
  }
  const det = bEl('details', { className: 'rev tf-add' });
  det.open = tfAddOpen || (!(state.units || []).length && !tfOneOpen);
  det.ontoggle = () => {
    tfAddOpen = det.open;
  };
  det.append(bEl('summary', { textContent: 'Add whole warbands (army builder)' }));
  const r4 = bEl('div', { className: 'tf-row' });
  const sg = bEl('div', { className: 'grp' });
  sg.setAttribute('role', 'group');
  sg.setAttribute('aria-label', 'Drop for');
  [
    ['cs', 'For South (' + colName('cs') + ')'],
    ['nord', 'For North (' + colName('nord') + ')']
  ].forEach(([sd, t]) => {
    const b = bEl('button', { type: 'button', textContent: t });
    b.setAttribute('aria-pressed', String(tfSide === sd));
    b.onclick = () => {
      tfSide = sd;
      renderTurnbar();
    };
    sg.appendChild(b);
  });
  const lab = bEl('label', { className: 'tf-chk' });
  const cbx = bEl('input', { type: 'checkbox', checked: tfReserve });
  cbx.onchange = () => {
    tfReserve = cbx.checked;
  };
  lab.append(cbx, document.createTextNode(' Arrive from reserves (to test entering the table)'));
  r4.append(sg, lab);
  det.append(r4);
  det.append(
    ptext(
      'Build one or more warbands below, with options and upgrades, then drop them. Characters join the regiment you choose; use "Remove the character" afterwards to test a regiment on its own.',
      'hint'
    )
  );
  armyBuilder(
    e => det.appendChild(e),
    mk,
    L => tfDrop(L),
    'Drop on the table'
  );
  add(det);
}
