/*
 * Test field: quick add
 *
 * Adding one regiment at a time and editing what is already on the table.
 *
 * In this file: qa, qaSave(), withBld(), qaFacE(), qaUnitE(), qaUnits(), qaRide(), qaChars(),
 *   qaLeader(), qaClean(), qaList(), qaPts(), qaSpecOf(), tfRebuild(), qaForm()
 */

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
