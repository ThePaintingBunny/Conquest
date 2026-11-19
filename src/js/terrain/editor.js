/*
 * Terrain editor
 *
 * Placing, moving and removing terrain by hand during setup and on the test field.
 *
 * In this file: terrMode, terrType, terrSize, terrSel, tfTerr, terrainPanel(), terrEditor(),
 *   terrainClick()
 */

let terrMode = 'random',
  terrType = 'forest',
  terrSize = 'medium',
  terrSel = null,
  tfTerr = false;

function terrainPanel(add, mk) {
  const box = document.createElement('div');
  box.className = 'rev';
  const h = document.createElement('h3');
  h.textContent = 'Terrain';
  box.appendChild(h);
  const g = document.createElement('div');
  g.className = 'grp';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'Terrain mode');
  [
    ['random', 'Random'],
    ['manual', 'Place it yourself']
  ]
    .concat(Object.keys(mbMaps()).length ? [['saved', 'Saved map']] : [])
    .forEach(([m, t]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.setAttribute('aria-pressed', String(terrMode === m));
      b.onclick = () => {
        terrMode = m;
        renderTurnbar();
      };
      g.appendChild(b);
    });
  const row = document.createElement('div');
  row.className = 'row';
  row.appendChild(g);
  if (terrMode === 'saved') {
    const maps = mbMaps(),
      sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Saved map');
    Object.keys(maps)
      .sort()
      .forEach(k => {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = k + ' (' + maps[k].length + ' pieces)';
        sel.appendChild(o);
      });
    row.appendChild(sel);
    row.appendChild(
      mk('Use this map', () => {
        const T = maps[sel.value];
        if (T) putState({ terrain: JSON.parse(JSON.stringify(T)) });
      })
    );
    box.appendChild(row);
    box.appendChild(ptext('Maps you made in the Map builder (Menu → Map builder), kept on this device.'));
    add(box);
    return;
  }
  if (terrMode === 'random') {
    row.appendChild(mk('Shuffle terrain', () => putState({ terrain: genTerrain() }), true));
    box.appendChild(row);
    box.appendChild(terrFilterBox());
    box.appendChild(
      ptext(
        'Pieces are placed at random, at least 7″ apart, using only the terrain types ticked below. Impassable rocks and buildings never sit on objective zones; at most 2 buildings. Hover a piece on the map to see its rules.'
      )
    );
  } else {
    const mkSel = (lab, opts, val, fn) => {
      const sl = document.createElement('select');
      sl.setAttribute('aria-label', lab);
      opts.forEach(([v, t]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = t;
        sl.appendChild(o);
      });
      sl.value = val;
      sl.onchange = () => fn(sl.value);
      return sl;
    };
    row.appendChild(
      mkSel(
        'Terrain type',
        Object.entries(TTYPES).map(([k, d]) => [k, d.name + ' (' + d.kw.join(', ') + ')']),
        terrType,
        v => (terrType = v)
      )
    );
    row.appendChild(
      mkSel(
        'Terrain size',
        [
          ['small', 'Small'],
          ['medium', 'Medium'],
          ['large', 'Large']
        ],
        terrSize,
        v => (terrSize = v)
      )
    );
    row.appendChild(mk('Clear the table', () => putState({ terrain: [] }), true));
    box.appendChild(row);
    box.appendChild(
      ptext(
        'Click the map to place a piece; click a piece to select it, change its rules or remove it. Pieces must be at least 7″ apart; impassable terrain and buildings cannot go on an objective zone.'
      )
    );
    const ed = terrEditor();
    if (ed) box.appendChild(ed);
  }
  add(box);
}

function terrEditor() {
  const T = terrainOf(),
    t = T[terrSel];
  if (terrSel == null || !t) return null;
  const I = tInfo(t),
    box = document.createElement('div');
  box.className = 't-ed';
  const upd = p => {
    const L = T.slice();
    L[terrSel] = Object.assign({}, t, p);
    putState({ terrain: L });
  };
  const h = document.createElement('div');
  h.className = 'row';
  const nm = document.createElement('b');
  nm.textContent = 'Selected: ' + I.name;
  h.append(
    nm,
    abStepper(I.size, 0, 4, v => upd({ size: v }), 'terrain Size'),
    document.createTextNode(' Size')
  );
  const rm = document.createElement('button');
  rm.type = 'button';
  rm.className = 'btn ghost';
  rm.textContent = 'Remove piece';
  rm.onclick = () => {
    const L = T.slice();
    L.splice(terrSel, 1);
    terrSel = null;
    putState({ terrain: L });
  };
  const dn = document.createElement('button');
  dn.type = 'button';
  dn.className = 'btn ghost';
  dn.textContent = 'Done';
  dn.onclick = () => {
    terrSel = null;
    terrKey = '';
    render();
  };
  h.append(rm, dn);
  box.appendChild(h);
  const kw = document.createElement('div');
  kw.className = 'row';
  TKW.forEach(k => {
    const on = I.kw.includes(k);
    const b = abBtn(
      (on ? '✓ ' : '') + k,
      () => upd({ kw: on ? I.kw.filter(x => x !== k) : I.kw.concat([k]) }),
      'ab-tog' + (on ? ' on' : '')
    );
    b.title = TKWD[k];
    b.setAttribute('aria-pressed', String(on));
    kw.appendChild(b);
  });
  box.appendChild(kw);
  if (I.kw.includes('Garrison')) {
    const g = document.createElement('div');
    g.className = 'row';
    g.append(
      document.createTextNode('Capacity'),
      abStepper(I.cap, 1, 8, v => upd({ cap: v }), 'Capacity'),
      document.createTextNode('Defense +'),
      abStepper(I.def, 0, 3, v => upd({ def: v }), 'Defense')
    );
    box.appendChild(g);
  }
  box.appendChild(ptext(I.kw.map(k => k + ': ' + TKWD[k]).join(' ')));
  return box;
}

function terrainClick(pt, ev) {
  const g = ev.target.closest('g[data-tid]');
  const T = terrainOf().slice();
  if (g) {
    const i = +g.getAttribute('data-tid');
    terrSel = terrSel === i ? null : i;
    terrKey = '';
    render();
    return;
  }
  if (terrSel != null) {
    terrSel = null;
    terrKey = '';
    render();
    return;
  }
  const [rx, ry] = TSIZE[terrSize],
    p = {
      type: terrType,
      x: +ix(pt.x).toFixed(1),
      y: +iy(pt.y).toFixed(1),
      rx,
      ry,
      seed: Math.floor(Math.random() * 1e9)
    };
  const why = terrWhy(p, T);
  if (why) {
    toast(why);
    return;
  }
  T.push(p);
  putState({ terrain: T });
}
