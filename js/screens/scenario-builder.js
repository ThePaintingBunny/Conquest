/*
 * Scenario builder
 *
 * A page of its own (Menu → Scenario builder): place objective zones and objective markers on the table, give each
 * its Victory Points, say whose they are, and in which rounds they score (or score more). Scenario-wide scoring
 * (from which round zones count, how many rounds there are, the Warlord, destroyed regiments and characters, bonuses
 * for holding several zones) is set below. The rules text players read is written from the settings as you go.
 *
 * Saved on this device by name; a saved scenario is chosen in the Scenario box when setting up a game, and then
 * travels with the game (state.customScen), so an online opponent plays the same one.
 *
 * Every setting and input sits in the side column (the gameplay tabs step aside); the table shows the zones and
 * markers with their names and points.
 *
 * In this file: scenEdit, SB_ROUNDS, sbScens(), sbSaveScens(), sbBlank(), sbOpen(), sbClose(),
 *   sbZone(), sbZonesOf(), sbRanges(), sbSideName(), sbText(), sbFind(), sbPointer(), sbDraw(),
 *   sbStepper(), sbChips(), sbSeg(), sbPanel(), scenCustom(), scenCustomList()
 */

let scenEdit = null;
const SB_ROUNDS = 10;

/* saved scenarios on this device: { name: scenario } */
function sbScens() {
  try {
    const m = JSON.parse(localStorage.getItem('vob-scens') || '{}');
    return m && typeof m === 'object' ? m : {};
  } catch (e) {
    return {};
  }
}

function sbSaveScens(m) {
  try {
    localStorage.setItem('vob-scens', JSON.stringify(m));
    return true;
  } catch (e) {
    toast('The scenario could not be saved on this device.');
    return false;
  }
}

function sbBlank() {
  return {
    name: '',
    custom: true,
    rounds: 10,
    from: 2,
    map: '',
    zones: [],
    markers: [],
    extra: { warlord: 2, regs: 0, chars: 0, zonesN: 0, zonesVp: 0, more: 0 },
    notes: ''
  };
}

function sbOpen(name) {
  const S = name && sbScens()[name];
  scenEdit = {
    sc: Object.assign(sbBlank(), S ? JSON.parse(JSON.stringify(S)) : {}),
    tool: 'zone',
    sel: null /* {k: 'z'|'m', i} */,
    drag: null,
    dirty: false
  };
  scenEdit.sc.extra = Object.assign(sbBlank().extra, scenEdit.sc.extra || {});
  mmOverlay = false;
  mmPage = null;
  zoneKey = '';
  terrKey = '';
  render();
}

function sbClose() {
  scenEdit = null;
  zoneKey = '';
  terrKey = '';
  /* back to the main menu itself; only a game still running behind the builder keeps it as an overlay */
  mmOverlay = mmGameOn();
  mmPage = 'home';
  render();
}

/* a zone as the game uses it */
function sbZone(z) {
  return Object.assign({}, z, { r: (+z.size || 6) / 2, size: +z.size || 6, friendly: z.friendly || null });
}

function sbZonesOf() {
  return scenEdit.sc.zones.map(sbZone);
}

/* [1,2,3,5,7,8] → "1–3, 5, 7–8" */
function sbRanges(L) {
  const a = [...new Set(L || [])].sort((x, y) => x - y),
    out = [];
  for (let i = 0; i < a.length; i++) {
    let j = i;
    while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
    out.push(j > i ? a[i] + '–' + a[j] : String(a[i]));
    i = j;
  }
  return out.join(', ');
}

function sbSideName(s) {
  return s === 'cs' ? 'the South army' : s === 'nord' ? 'the North army' : 'neither army';
}

/* the rules text players read, written from the settings */
function sbText(sc) {
  const L = [],
    all10 = n => n >= (+sc.rounds || 10);
  (sc.zones || []).forEach(z => {
    const live = Array.isArray(z.rounds) && z.rounds.length && !all10(z.rounds.length) ? z.rounds : null;
    let t = `${z.name} (${z.size || 6}″${z.friendly ? ', friendly to ' + sbSideName(z.friendly) + ', who cannot Seize it' : ''}): ${+z.vp || 0} VP when Seized`;
    if (live) t += ', only in rounds ' + sbRanges(live);
    if (+z.bonusVp && (z.bonusRounds || []).length)
      t += `; +${z.bonusVp} more in rounds ${sbRanges(z.bonusRounds)}`;
    L.push(t + '.');
  });
  (sc.markers || []).forEach(m => {
    L.push(
      m.side === 'neutral'
        ? `Marker ${m.name} (neutral): ${+m.vp || 0} VP to whoever destroys it.`
        : `Marker ${m.name} (${sbSideName(m.side).replace('the ', '')}'s): ${+m.vp || 0} VP to the enemy for destroying it.`
    );
  });
  const X = sc.extra || {};
  if (+X.zonesN && +X.zonesVp) L.push(`Seizing ${X.zonesN} or more zones in a round: +${X.zonesVp} VP.`);
  if (+X.more) L.push(`Seizing more zones than the opponent in a round: +${X.more} VP.`);
  if (+X.regs) L.push(`Each enemy regiment destroyed: ${X.regs} VP.`);
  if (+X.chars) L.push(`Each enemy character slain: ${X.chars} VP.`);
  if (+X.warlord) L.push(`Slaying the enemy Warlord: ${X.warlord} VP.`);
  L.push(`Zones score from round ${sc.from || 2}; the game lasts ${sc.rounds || 10} rounds.`);
  if (sc.notes) L.push(String(sc.notes));
  return L.join(' ');
}

/* what is under the pointer: a marker first (they sit on zones), then the nearest zone */
function sbFind(p) {
  const sc = scenEdit.sc;
  let hit = null;
  sc.markers.forEach((m, i) => {
    if (Math.hypot(m.x - p[0], m.y - p[1]) <= 1.4) hit = { k: 'm', i };
  });
  if (hit) return hit;
  let best = 1e9;
  sc.zones.forEach((z, i) => {
    const d = Math.hypot(z.x - p[0], z.y - p[1]);
    if (d <= (+z.size || 6) / 2 && d < best) {
      best = d;
      hit = { k: 'z', i };
    }
  });
  return hit;
}

/* click to place or pick, drag to move (snapped to ½″, kept on the table) */
function sbPointer(ev, kind) {
  const E = scenEdit,
    sc = E.sc,
    p0 = svgPt(ev),
    snap = v => Math.round(v * 2) / 2,
    p = [Math.max(0, Math.min(72, snap(ix(p0.x)))), Math.max(0, Math.min(48, snap(iy(p0.y))))];
  if (kind === 'down') {
    const hit = sbFind(p);
    if (hit && E.tool === 'select') {
      E.sel = hit;
      const o = hit.k === 'z' ? sc.zones[hit.i] : sc.markers[hit.i];
      E.drag = { dx: o.x - p[0], dy: o.y - p[1], moved: false };
    } else if (E.tool === 'zone') {
      const n = sc.zones.length + 1;
      sc.zones.push({ name: 'Zone ' + n, x: p[0], y: p[1], size: 6, friendly: null, vp: 2 });
      E.sel = { k: 'z', i: sc.zones.length - 1 };
      E.dirty = true;
      E.tool = 'select';
    } else if (E.tool === 'marker') {
      const n = sc.markers.length;
      sc.markers.push({ name: String.fromCharCode(65 + (n % 26)), x: p[0], y: p[1], side: 'neutral', vp: 3 });
      E.sel = { k: 'm', i: sc.markers.length - 1 };
      E.dirty = true;
      E.tool = 'select';
    } else E.sel = hit;
    try {
      $('board').setPointerCapture(ev.pointerId);
    } catch (e) {}
    zoneKey = '';
    render();
    return;
  }
  if (kind === 'move' && E.drag && E.sel) {
    const o = E.sel.k === 'z' ? sc.zones[E.sel.i] : sc.markers[E.sel.i];
    if (!o) return;
    const nx = Math.max(0, Math.min(72, snap(p[0] + E.drag.dx))),
      ny = Math.max(0, Math.min(48, snap(p[1] + E.drag.dy)));
    if (nx === o.x && ny === o.y) return;
    o.x = nx;
    o.y = ny;
    E.drag.moved = true;
    E.dirty = true;
    zoneKey = '';
    drawBoard();
    return;
  }
  if (kind === 'up') {
    const moved = E.drag && E.drag.moved;
    E.drag = null;
    if (moved) render();
  }
}

['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(t =>
  document.addEventListener(
    t,
    ev => {
      if (!scenEdit) return;
      if (t === 'pointerdown' && !(ev.target.closest && ev.target.closest('#board'))) return;
      if (t !== 'pointerdown' && !scenEdit.drag) return;
      ev.stopPropagation();
      ev.preventDefault();
      sbPointer(ev, t === 'pointerdown' ? 'down' : t === 'pointermove' ? 'move' : 'up');
    },
    true
  )
);

/* the table while building: zones (drawn by drawZones), markers, names and points, the selection */
function sbDraw(ug) {
  const E = scenEdit,
    sc = E.sc,
    lab = (x, y, lines, g) => {
      const t = el(
        'text',
        {
          x,
          y,
          'text-anchor': 'middle',
          fill: '#FFF3E0',
          stroke: '#1F1A14',
          'stroke-width': 3,
          'paint-order': 'stroke',
          'font-size': 10,
          'font-weight': 700,
          'font-family': 'Alegreya Sans, sans-serif',
          'pointer-events': 'none'
        },
        g
      );
      lines.forEach((s, i) => {
        const sp = el('tspan', { x, dy: i ? 11 : 0 }, t);
        sp.textContent = s;
      });
    };
  sc.zones.forEach((z, i) => {
    const r = ((+z.size || 6) / 2) * S,
      on = E.sel && E.sel.k === 'z' && E.sel.i === i;
    if (on)
      el(
        'circle',
        {
          cx: px(z.x),
          cy: py(z.y),
          r: r + 4,
          fill: 'none',
          stroke: '#E8C65A',
          'stroke-width': 2.5,
          'stroke-dasharray': '6 4',
          'pointer-events': 'none'
        },
        ug
      );
    const extra =
      +z.bonusVp && (z.bonusRounds || []).length ? ` (+${z.bonusVp} in ${sbRanges(z.bonusRounds)})` : '';
    lab(px(z.x), py(z.y) - r - 14, [z.name, (+z.vp || 0) + ' VP' + extra], ug);
  });
  sc.markers.forEach((m, i) => {
    const u = {
      id: 'sbm' + i,
      side: m.side,
      x: m.x,
      y: m.y,
      short: 'Marker ' + m.name,
      dmg: { cs: 0, nord: 0 }
    };
    drawMarker(u, ug);
    if (E.sel && E.sel.k === 'm' && E.sel.i === i)
      el(
        'rect',
        {
          x: px(m.x) - 11,
          y: py(m.y) - 11,
          width: 22,
          height: 22,
          rx: 4,
          fill: 'none',
          stroke: '#E8C65A',
          'stroke-width': 2.5,
          'pointer-events': 'none'
        },
        ug
      );
    lab(px(m.x), py(m.y) + 20, [(+m.vp || 0) + ' VP'], ug);
  });
}

/* ---------- the side column ---------- */

/* a number with − and + buttons */
function sbStepper(label, val, min, max, set, unit) {
  const row = bEl('div', { className: 'sb-step' });
  const v = bEl('output', { className: 'sb-val', textContent: val + (unit || '') });
  const b = (t, d, aria) => {
    const x = bEl('button', { type: 'button', className: 'btn ghost sb-pm', textContent: t });
    x.setAttribute('aria-label', aria + ' ' + label);
    x.disabled = d < 0 ? val <= min : val >= max;
    x.onclick = () => set(Math.max(min, Math.min(max, val + d)));
    return x;
  };
  row.append(
    bEl('span', { className: 'sb-lab', textContent: label }),
    b('−', -1, 'Less'),
    v,
    b('+', 1, 'More')
  );
  return row;
}

/* rounds as toggle chips */
function sbChips(label, sel, n, set) {
  const box = bEl('div', { className: 'sb-chips-w' });
  box.append(bEl('span', { className: 'sb-lab', textContent: label }));
  const g = bEl('div', { className: 'sb-chips' });
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  for (let r = 1; r <= n; r++) {
    const on = sel.includes(r),
      c = bEl('button', { type: 'button', className: 'sb-chip', textContent: String(r) });
    c.setAttribute('aria-pressed', String(on));
    c.setAttribute('aria-label', 'Round ' + r);
    c.onclick = () => set(on ? sel.filter(x => x !== r) : sel.concat([r]).sort((a, b) => a - b));
    g.append(c);
  }
  box.append(g);
  return box;
}

/* a choice of a few, as one row of buttons */
function sbSeg(label, items, cur, set) {
  const box = bEl('div', { className: 'sb-seg-w' });
  box.append(bEl('span', { className: 'sb-lab', textContent: label }));
  const g = bEl('div', { className: 'grp sb-seg' });
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  items.forEach(([v, t, sw]) => {
    const b = bEl('button', { type: 'button' });
    if (sw) {
      const i = bEl('i', { className: 'mb-sw' });
      i.style.background = sw;
      b.append(i);
    }
    b.append(document.createTextNode(t));
    b.setAttribute('aria-pressed', String(cur === v));
    b.onclick = () => set(v);
    g.append(b);
  });
  box.append(g);
  return box;
}

function sbPanel(side, info, mk, add) {
  const E = scenEdit,
    sc = E.sc,
    redo = () => {
      E.dirty = true;
      zoneKey = '';
      render();
    },
    head = t => add(bEl('h3', { className: 'mb-h', textContent: t })),
    sideCol = s => (s === 'cs' ? COL.cs.fill : s === 'nord' ? COL.nord.fill : '#6B5638');
  info.textContent =
    (sc.name ? sc.name + ' · ' : '') +
    `${sc.zones.length} zone${sc.zones.length === 1 ? '' : 's'}, ${sc.markers.length} marker${sc.markers.length === 1 ? '' : 's'}` +
    (E.dirty ? ' · not saved' : '');

  /* 1. placing */
  head('1 · Place on the table');
  add(
    sbSeg(
      'Click the table to',
      [
        ['zone', 'Add a zone'],
        ['marker', 'Add a marker'],
        ['select', 'Pick and move']
      ],
      E.tool,
      v => {
        E.tool = v;
        renderTurnbar();
      }
    )
  );
  add(
    ptext(
      E.tool === 'zone'
        ? 'Click where the centre of the objective zone goes.'
        : E.tool === 'marker'
          ? 'Click where the objective marker goes.'
          : 'Click a zone or marker to change it below; drag it to move it.',
      'hint'
    )
  );

  /* 2. the selected zone or marker */
  const S = E.sel,
    o = S && (S.k === 'z' ? sc.zones[S.i] : sc.markers[S.i]);
  if (o) {
    head(S.k === 'z' ? '2 · This zone' : '2 · This marker');
    const nm = bEl('input', { type: 'text', className: 'sb-name', value: o.name, maxLength: 24 });
    nm.setAttribute('aria-label', 'Name');
    nm.oninput = () => {
      o.name = nm.value;
      E.dirty = true;
      zoneKey = '';
      drawBoard();
    };
    nm.onchange = () => renderTurnbar();
    const nl = bEl('label', { className: 'sb-field' }, [
      bEl('span', { className: 'sb-lab', textContent: 'Name' }),
      nm
    ]);
    add(nl);
    if (S.k === 'z') {
      add(
        sbSeg(
          'Size',
          [
            [6, '6″'],
            [9, '9″'],
            [12, '12″']
          ],
          +o.size || 6,
          v => {
            o.size = v;
            redo();
          }
        )
      );
      add(
        sbSeg(
          'Friendly to',
          [
            [null, 'No one'],
            ['cs', 'South army', sideCol('cs')],
            ['nord', 'North army', sideCol('nord')]
          ],
          o.friendly || null,
          v => {
            o.friendly = v;
            redo();
          }
        )
      );
      add(
        ptext(
          o.friendly
            ? `Only ${sbSideName(o.friendly === 'cs' ? 'nord' : 'cs')} can Seize it; ${sbSideName(o.friendly)} defends it.`
            : 'Either army can Seize it.',
          'hint'
        )
      );
      add(
        sbStepper('Victory Points when Seized', +o.vp || 0, 0, 12, v => {
          o.vp = v;
          redo();
        })
      );
      const rounds =
        Array.isArray(o.rounds) && o.rounds.length
          ? o.rounds
          : Array.from({ length: sc.rounds || 10 }, (_, i) => i + 1);
      add(
        sbChips('Scores in rounds (tap to switch off)', rounds, sc.rounds || 10, v => {
          o.rounds = v.length >= (sc.rounds || 10) ? null : v;
          redo();
        })
      );
      add(
        sbStepper('Extra VP in some rounds', +o.bonusVp || 0, 0, 12, v => {
          o.bonusVp = v;
          if (v && !(o.bonusRounds || []).length) o.bonusRounds = [];
          redo();
        })
      );
      if (+o.bonusVp)
        add(
          sbChips('…in these rounds', o.bonusRounds || [], sc.rounds || 10, v => {
            o.bonusRounds = v;
            redo();
          })
        );
    } else {
      add(
        sbSeg(
          'Belongs to',
          [
            ['neutral', 'Neutral', sideCol('neutral')],
            ['cs', 'South army', sideCol('cs')],
            ['nord', 'North army', sideCol('nord')]
          ],
          o.side,
          v => {
            o.side = v;
            redo();
          }
        )
      );
      add(
        sbStepper(
          o.side === 'neutral' ? 'VP for whoever destroys it' : 'VP to the enemy for destroying it',
          +o.vp || 0,
          0,
          12,
          v => {
            o.vp = v;
            redo();
          }
        )
      );
      add(ptext('A marker has 3 wounds and Defense 3 and can be attacked from round 2.', 'hint'));
    }
    const del = bEl('div', { className: 'row mb-end' });
    del.append(
      mk(
        S.k === 'z' ? 'Remove this zone' : 'Remove this marker',
        () => {
          (S.k === 'z' ? sc.zones : sc.markers).splice(S.i, 1);
          E.sel = null;
          redo();
        },
        true
      ),
      mk(
        'Done with it',
        () => {
          E.sel = null;
          render();
        },
        true
      )
    );
    add(del);
  } else
    add(
      ptext(
        sc.zones.length || sc.markers.length
          ? 'Pick a zone or marker on the table to set its points, owner and rounds.'
          : 'Nothing placed yet.',
        'hint'
      )
    );

  /* 3. scenario-wide scoring */
  head('3 · Scoring for the whole game');
  const X = sc.extra;
  add(
    sbStepper('Number of rounds', +sc.rounds || 10, 3, 10, v => {
      sc.rounds = v;
      redo();
    })
  );
  add(
    sbStepper('Zones score from round', +sc.from || 2, 1, Math.min(5, sc.rounds || 10), v => {
      sc.from = v;
      redo();
    })
  );
  add(
    sbStepper(
      'Slaying the enemy Warlord',
      +X.warlord || 0,
      0,
      10,
      v => {
        X.warlord = v;
        redo();
      },
      ' VP'
    )
  );
  add(
    sbStepper(
      'Each enemy regiment destroyed',
      +X.regs || 0,
      0,
      10,
      v => {
        X.regs = v;
        redo();
      },
      ' VP'
    )
  );
  add(
    sbStepper(
      'Each enemy character slain',
      +X.chars || 0,
      0,
      10,
      v => {
        X.chars = v;
        redo();
      },
      ' VP'
    )
  );
  add(
    sbStepper('Bonus for Seizing at least … zones', +X.zonesN || 0, 0, Math.max(1, sc.zones.length), v => {
      X.zonesN = v;
      redo();
    })
  );
  if (+X.zonesN)
    add(
      sbStepper(
        '…worth',
        +X.zonesVp || 0,
        0,
        10,
        v => {
          X.zonesVp = v;
          redo();
        },
        ' VP'
      )
    );
  add(
    sbStepper(
      'Seizing more zones than the opponent',
      +X.more || 0,
      0,
      10,
      v => {
        X.more = v;
        redo();
      },
      ' VP'
    )
  );
  {
    const ta = bEl('textarea', { className: 'sb-notes', rows: 2, value: sc.notes || '', maxLength: 400 });
    ta.placeholder = 'Anything else players should know (optional)';
    ta.setAttribute('aria-label', 'Extra notes');
    ta.oninput = () => {
      sc.notes = ta.value;
      E.dirty = true;
    };
    ta.onchange = () => renderTurnbar();
    add(
      bEl('label', { className: 'sb-field' }, [
        bEl('span', { className: 'sb-lab', textContent: 'Notes' }),
        ta
      ])
    );
  }

  /* 4. what players will read */
  head('4 · What players will read');
  add(bEl('p', { className: 'sb-sum', textContent: sbText(sc) }));

  /* 5. name, map, save */
  head('5 · Save');
  const nm = bEl('input', {
    type: 'text',
    className: 'sb-name',
    value: sc.name,
    placeholder: 'Scenario name',
    maxLength: 40
  });
  nm.setAttribute('aria-label', 'Scenario name');
  nm.oninput = () => (sc.name = nm.value);
  add(
    bEl('label', { className: 'sb-field' }, [
      bEl('span', { className: 'sb-lab', textContent: 'Scenario name' }),
      nm
    ])
  );
  {
    const maps = Object.keys(mbMaps()).sort();
    const sel = bEl('select', { className: 'sb-name' });
    sel.setAttribute('aria-label', 'Map to show underneath');
    sel.append(bEl('option', { value: '', textContent: 'Empty table' }));
    maps.forEach(k => sel.append(bEl('option', { value: k, textContent: k })));
    sel.value = sc.map || '';
    sel.onchange = () => {
      sc.map = sel.value;
      terrKey = '';
      render();
    };
    add(
      bEl('label', { className: 'sb-field' }, [
        bEl('span', {
          className: 'sb-lab',
          textContent: 'Show a saved map underneath (only while building)'
        }),
        sel
      ])
    );
  }
  const row = bEl('div', { className: 'row mb-end' });
  row.append(
    mk('Save scenario', () => {
      const name = (sc.name || '').trim();
      if (!name) return toast('Give the scenario a name first.');
      if (!sc.zones.length && !sc.markers.length) return toast('Place at least one zone or marker first.');
      sc.name = name;
      const all0 = sbScens();
      all0[name] = JSON.parse(JSON.stringify(sc));
      if (sbSaveScens(all0)) {
        E.dirty = false;
        toast('Scenario “' + name + '” saved. Choose it in the Scenario box when setting up a game.');
        renderTurnbar();
      }
    })
  );
  add(row);
  const names = Object.keys(sbScens()).sort();
  if (names.length) {
    const sel = bEl('select', { className: 'sb-name' });
    sel.setAttribute('aria-label', 'Open a saved scenario');
    sel.append(bEl('option', { value: '', textContent: 'Open a saved scenario…' }));
    names.forEach(k => sel.append(bEl('option', { value: k, textContent: k })));
    sel.onchange = () => {
      if (!sel.value) return;
      const drop = E.dirty;
      sbOpen(sel.value);
      if (drop) toast('Opened “' + sel.value + '”; the unsaved changes were dropped.');
    };
    add(sel);
    if (sc.name && names.includes(sc.name))
      add(
        mk(
          'Delete “' + sc.name + '”',
          () => {
            if (!mbSure('sbdel', 'Click again to delete “' + sc.name + '”.')) return;
            const all0 = sbScens();
            delete all0[sc.name];
            sbSaveScens(all0);
            E.dirty = true;
            renderTurnbar();
          },
          true
        )
      );
  }
  const end = bEl('div', { className: 'row mb-end' });
  end.append(
    mk(
      'Start over',
      () => {
        if ((sc.zones.length || sc.markers.length) && !mbSure('sbclr', 'Click again to clear everything.'))
          return;
        scenEdit.sc = sbBlank();
        E.sel = null;
        redo();
      },
      true
    ),
    mk('Done', () => {
      if (
        E.dirty &&
        !mbSure('sbdone', 'This scenario is not saved. Click Done again to leave without saving.')
      )
        return;
      sbClose();
    })
  );
  add(end);
}

/* ---------- in a game ---------- */

/* the custom scenario being played (state.customScen), with its rules text */
function scenCustom() {
  const c = state && state.customScen;
  if (!c) return null;
  return Object.assign({}, c, {
    custom: true,
    zones: (c.zones || []).map(sbZone),
    vp: sbText(c)
  });
}

function scenCustomList() {
  return Object.entries(sbScens()).sort(([a], [b]) => a.localeCompare(b));
}
