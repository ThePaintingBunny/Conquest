/*
 * Map builder
 *
 * A page of its own (Menu → Map builder): paint terrain onto an empty table with a brush, erase it, place
 * buildings, and save the map by name on this device. A saved map can be chosen in the terrain step when setting up
 * a game.
 *
 * Painting works on a fine grid (¼″ cells) per terrain type. When a stroke ends, every connected patch of a type
 * becomes one terrain piece whose outline follows the paint (smoothed), with that type's rules. Painting one type
 * over another replaces it. Nothing here touches the game in progress: the builder keeps its own map until it is
 * saved.
 *
 * In this file: mapEdit, MB_R, MB_W, MB_H, mbMaps(), mbSaveMaps(), mbOpen(), mbClose(), mbGrid(),
 *   mbRaster(), mbStamp(), mbTrace(), mbSmooth(), mbRebuild(), mbStroke, mbPointer(), mbDab(), mbArm,
 *   mbSure(), mbPanel()
 */

let mapEdit = null;
const MB_R = 0.25,
  MB_W = 72 / MB_R,
  MB_H = 48 / MB_R;

/* saved maps on this device: { name: [terrain pieces] } */
function mbMaps() {
  try {
    const m = JSON.parse(localStorage.getItem('vob-maps') || '{}');
    return m && typeof m === 'object' ? m : {};
  } catch (e) {
    return {};
  }
}

function mbSaveMaps(m) {
  try {
    localStorage.setItem('vob-maps', JSON.stringify(m));
    return true;
  } catch (e) {
    toast('The map could not be saved on this device.');
    return false;
  }
}

/* open the builder with a saved map (or an empty table) */
function mbOpen(name) {
  const T = (name && mbMaps()[name]) || [];
  mapEdit = {
    name: name || '',
    type: 'forest',
    tool: 'paint',
    size: 1.5,
    grids: {},
    placed: [],
    terrain: [],
    dirty: false
  };
  T.forEach(t => {
    if (t.pts) mbRaster(t);
    else mapEdit.placed.push(JSON.parse(JSON.stringify(t)));
  });
  mbRebuild();
  mmOverlay = false;
  mmPage = null;
  terrKey = '';
  render();
}

function mbClose() {
  mapEdit = null;
  terrKey = '';
  mmOverlay = true;
  mmPage = 'home';
  render();
}

function mbGrid(type) {
  return mapEdit.grids[type] || (mapEdit.grids[type] = new Uint8Array(MB_W * MB_H));
}

/* a painted piece back onto the grid (when a saved map is opened) */
function mbRaster(t) {
  const G = mbGrid(t.type),
    P = terrPoly(t),
    xs = P.map(p => p[0]),
    ys = P.map(p => p[1]);
  const i0 = Math.max(0, Math.floor(Math.min(...xs) / MB_R)),
    i1 = Math.min(MB_W - 1, Math.ceil(Math.max(...xs) / MB_R)),
    j0 = Math.max(0, Math.floor(Math.min(...ys) / MB_R)),
    j1 = Math.min(MB_H - 1, Math.ceil(Math.max(...ys) / MB_R));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++)
      if (ptInPolyG([(i + 0.5) * MB_R, (j + 0.5) * MB_R], P)) G[j * MB_W + i] = 1;
}

/* one dab of the brush at p (table inches) */
function mbStamp(p) {
  const r = mapEdit.size,
    erase = mapEdit.tool === 'erase',
    G = erase ? null : mbGrid(mapEdit.type),
    others = Object.entries(mapEdit.grids).filter(([k]) => k !== mapEdit.type || erase);
  const i0 = Math.max(0, Math.floor((p[0] - r) / MB_R)),
    i1 = Math.min(MB_W - 1, Math.ceil((p[0] + r) / MB_R)),
    j0 = Math.max(0, Math.floor((p[1] - r) / MB_R)),
    j1 = Math.min(MB_H - 1, Math.ceil((p[1] + r) / MB_R));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      if (Math.hypot((i + 0.5) * MB_R - p[0], (j + 0.5) * MB_R - p[1]) > r) continue;
      const k = j * MB_W + i;
      if (G) G[k] = 1;
      /* painting one type over another replaces it; the eraser clears every type */
      others.forEach(([, g]) => (g[k] = 0));
    }
  if (erase) mapEdit.placed = mapEdit.placed.filter(t => !inT(t, p, r));
  mapEdit.dirty = true;
}

/* the grid's connected patches as outlines (table inches), smoothed; tiny specks are dropped */
function mbTrace(G) {
  const seen = new Uint8Array(G.length),
    out = [];
  for (let s = 0; s < G.length; s++) {
    if (!G[s] || seen[s]) continue;
    /* the patch: 4-connected cells */
    const cells = [],
      stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const k = stack.pop(),
        i = k % MB_W,
        j = (k - i) / MB_W;
      cells.push(k);
      [
        [i - 1, j],
        [i + 1, j],
        [i, j - 1],
        [i, j + 1]
      ].forEach(([a, b]) => {
        if (a < 0 || b < 0 || a >= MB_W || b >= MB_H) return;
        const q = b * MB_W + a;
        if (G[q] && !seen[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      });
    }
    if (cells.length * MB_R * MB_R < 1) continue;
    /* its boundary: cell edges with an empty neighbour, chained into loops (clockwise around filled cells) */
    const inC = new Set(cells),
      next = new Map();
    const edge = (a, b) => {
      const k = a[0] + ',' + a[1];
      if (!next.has(k)) next.set(k, []);
      next.get(k).push(b);
    };
    cells.forEach(k => {
      const i = k % MB_W,
        j = (k - i) / MB_W,
        has = (a, b) => a >= 0 && b >= 0 && a < MB_W && b < MB_H && inC.has(b * MB_W + a);
      if (!has(i, j - 1)) edge([i, j], [i + 1, j]);
      if (!has(i + 1, j)) edge([i + 1, j], [i + 1, j + 1]);
      if (!has(i, j + 1)) edge([i + 1, j + 1], [i, j + 1]);
      if (!has(i - 1, j)) edge([i, j + 1], [i, j]);
    });
    const loops = [];
    while (next.size) {
      const k0 = next.keys().next().value;
      const loop = [];
      let k = k0;
      for (let guard = 0; guard < 100000; guard++) {
        const L = next.get(k);
        if (!L || !L.length) break;
        const b = L.pop();
        if (!L.length) next.delete(k);
        loop.push(k.split(',').map(Number));
        k = b[0] + ',' + b[1];
        if (k === k0) break;
      }
      if (loop.length > 2) loops.push(loop);
    }
    const area = L =>
      Math.abs(
        L.reduce((a, p, i) => a + p[0] * L[(i + 1) % L.length][1] - L[(i + 1) % L.length][0] * p[1], 0)
      ) / 2;
    const outer = loops.sort((a, b) => area(b) - area(a))[0];
    if (!outer) continue;
    out.push(mbSmooth(outer.map(([i, j]) => [i * MB_R, j * MB_R])));
  }
  return out;
}

/* fewer points (Douglas–Peucker), then rounded corners (Chaikin) */
function mbSmooth(P) {
  const rdp = (pts, eps) => {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    let m = 0,
      at = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = segDist(pts[i], a, b);
      if (d > m) {
        m = d;
        at = i;
      }
    }
    if (m <= eps) return [a, b];
    return rdp(pts.slice(0, at + 1), eps)
      .slice(0, -1)
      .concat(rdp(pts.slice(at), eps));
  };
  /* split the closed loop in two so the simplification keeps its far side */
  const h = Math.floor(P.length / 2);
  let Q = rdp(P.slice(0, h + 1), 0.18)
    .slice(0, -1)
    .concat(rdp(P.slice(h).concat([P[0]]), 0.18).slice(0, -1));
  if (Q.length < 4) Q = P;
  const C = [];
  Q.forEach((p, i) => {
    const q = Q[(i + 1) % Q.length];
    C.push(
      [p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25],
      [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]
    );
  });
  return C.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]);
}

/* the map from the grids and the placed pieces */
function mbRebuild() {
  const painted = [];
  Object.entries(mapEdit.grids).forEach(([type, G]) =>
    mbTrace(G).forEach(P => {
      const xs = P.map(p => p[0]),
        ys = P.map(p => p[1]),
        x0 = Math.min(...xs),
        x1 = Math.max(...xs),
        y0 = Math.min(...ys),
        y1 = Math.max(...ys),
        cx = +((x0 + x1) / 2).toFixed(2),
        cy = +((y0 + y1) / 2).toFixed(2);
      painted.push({
        type,
        x: cx,
        y: cy,
        rx: +((x1 - x0) / 2).toFixed(2),
        ry: +((y1 - y0) / 2).toFixed(2),
        seed: (Math.round(cx * 13 + cy * 7) % 997) + 1,
        pts: P.map(p => [+(p[0] - cx).toFixed(2), +(p[1] - cy).toFixed(2)])
      });
    })
  );
  mapEdit.terrain = painted.concat(mapEdit.placed);
  terrKey = '';
}

/* painting with the pointer: dabs along the stroke, the pieces rebuilt when it ends */
let mbStroke = null;
function mbPointer(ev, kind) {
  const p0 = svgPt(ev),
    p = [ix(p0.x), iy(p0.y)];
  if (kind === 'down') {
    if (mapEdit.tool === 'building') {
      if (p[0] < 0 || p[0] > 72 || p[1] < 0 || p[1] > 48) return;
      mapEdit.placed.push({
        type: 'building',
        x: +p[0].toFixed(2),
        y: +p[1].toFixed(2),
        rx: 2.5,
        ry: 1.8,
        seed: (Date.now() % 997) + 1
      });
      mapEdit.dirty = true;
      mbRebuild();
      drawBoard();
      return;
    }
    mbStroke = { last: p, g: el('g', { id: 'mbprev', 'pointer-events': 'none' }, $('rings')) };
    try {
      $('board').setPointerCapture(ev.pointerId);
    } catch (e) {}
    mbDab(p);
    return;
  }
  if (!mbStroke) return;
  if (kind === 'move') {
    const a = mbStroke.last,
      d = Math.hypot(p[0] - a[0], p[1] - a[1]),
      step = Math.max(0.2, mapEdit.size / 3);
    for (let s = step; s <= d; s += step)
      mbDab([a[0] + ((p[0] - a[0]) * s) / d, a[1] + ((p[1] - a[1]) * s) / d]);
    if (d >= step) mbStroke.last = p;
    return;
  }
  /* up: the pieces from the paint */
  mbStroke = null;
  mbRebuild();
  drawBoard();
  renderTurnbar();
}

function mbDab(p) {
  mbStamp(p);
  const erase = mapEdit.tool === 'erase';
  el(
    'circle',
    {
      cx: px(p[0]),
      cy: py(p[1]),
      r: mapEdit.size * S,
      fill: erase ? '#2B2620' : TBASE[mapEdit.type] || '#5E6B45',
      'fill-opacity': erase ? 0.45 : 0.6
    },
    mbStroke.g
  );
}

['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(t =>
  document.addEventListener(
    t,
    ev => {
      if (!mapEdit) return;
      if (t === 'pointerdown' && !(ev.target.closest && ev.target.closest('#board'))) return;
      if (t !== 'pointerdown' && !mbStroke) return;
      ev.stopPropagation();
      ev.preventDefault();
      mbPointer(ev, t === 'pointerdown' ? 'down' : t === 'pointermove' ? 'move' : 'up');
    },
    true
  )
);

/* a second click within a few seconds confirms (no browser dialogs) */
let mbArm = null;
function mbSure(k, msg) {
  if (mbArm && mbArm.k === k && Date.now() - mbArm.t < 5000) {
    mbArm = null;
    return true;
  }
  mbArm = { k, t: Date.now() };
  toast(msg);
  return false;
}

/* the builder's controls, in the bar above the table */
function mbPanel(tb, info, mk, add) {
  const M = mapEdit,
    n = M.terrain.length;
  info.textContent =
    'Map builder' +
    (M.name ? ' · ' + M.name : '') +
    ' · ' +
    n +
    ' piece' +
    (n === 1 ? '' : 's') +
    (M.dirty ? ' · not saved' : '') +
    '. Drag on the table to ' +
    (M.tool === 'erase'
      ? 'erase.'
      : M.tool === 'building'
        ? 'place a building where you click.'
        : 'paint ' + TTYPES[M.type].name.toLowerCase() + '.');
  const grp = (label, items, cur, fn) => {
    const g = bEl('div', { className: 'grp' });
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
      b.onclick = () => fn(v);
      g.append(b);
    });
    return g;
  };
  add(
    grp(
      'Tool',
      [
        ['paint', 'Paint'],
        ['erase', 'Erase'],
        ['building', 'Building']
      ],
      M.tool,
      v => {
        M.tool = v;
        renderTurnbar();
      }
    )
  );
  add(
    grp(
      'Terrain to paint',
      Object.entries(TTYPES)
        .filter(([k]) => k !== 'building')
        .map(([k, d]) => [k, d.name, TBASE[k]]),
      M.tool === 'paint' ? M.type : null,
      v => {
        M.type = v;
        M.tool = 'paint';
        renderTurnbar();
      }
    )
  );
  {
    const lab = bEl('label', { className: 'mb-size' });
    const r = bEl('input', { type: 'range', min: '0.5', max: '4', step: '0.25', value: String(M.size) });
    r.setAttribute('aria-label', 'Brush size');
    const v = bEl('span', { textContent: (M.size * 2).toFixed(1) + '″ brush' });
    r.oninput = () => {
      M.size = +r.value;
      v.textContent = (M.size * 2).toFixed(1) + '″ brush';
    };
    lab.append(r, v);
    add(lab);
  }
  {
    const row = bEl('div', { className: 'row mb-save' });
    const nm = bEl('input', { type: 'text', id: 'mb-name', value: M.name, placeholder: 'Map name' });
    nm.setAttribute('aria-label', 'Map name');
    nm.oninput = () => (M.name = nm.value);
    row.append(
      nm,
      mk('Save map', () => {
        const name = (M.name || '').trim();
        if (!name) return toast('Give the map a name first.');
        const all0 = mbMaps();
        all0[name] = M.terrain;
        if (mbSaveMaps(all0)) {
          M.dirty = false;
          toast('Map “' + name + '” saved on this device.');
          renderTurnbar();
        }
      })
    );
    const names = Object.keys(mbMaps()).sort();
    if (names.length) {
      const sel = bEl('select', { id: 'mb-load' });
      sel.setAttribute('aria-label', 'Saved maps');
      sel.append(bEl('option', { value: '', textContent: 'Open a saved map…' }));
      names.forEach(k => sel.append(bEl('option', { value: k, textContent: k })));
      sel.onchange = () => {
        if (!sel.value) return;
        const drop = M.dirty;
        mbOpen(sel.value);
        if (drop) toast('Opened “' + sel.value + '”; the unsaved changes were dropped.');
      };
      row.append(sel);
      if (M.name && names.includes(M.name))
        row.append(
          mk(
            'Delete',
            () => {
              if (!mbSure('del', 'Click Delete again to delete “' + M.name + '”.')) return;
              const all0 = mbMaps();
              delete all0[M.name];
              mbSaveMaps(all0);
              M.name = '';
              M.dirty = true;
              renderTurnbar();
            },
            true
          )
        );
    }
    add(row);
  }
  add(
    mk(
      'Clear the table',
      () => {
        if (M.terrain.length && !mbSure('clear', 'Click again to clear the whole table.')) return;
        M.grids = {};
        M.placed = [];
        M.dirty = true;
        mbRebuild();
        render();
      },
      true
    )
  );
  add(
    mk('Done', () => {
      if (M.dirty && !mbSure('done', 'This map is not saved. Click Done again to leave without saving.'))
        return;
      mbClose();
    })
  );
  add(
    ptext(
      'Each patch of paint becomes one terrain piece with that type’s rules. For a normal game keep terrain 4″ from the table edges. Saved maps are kept on this device; choose one in the terrain step when setting up a game.',
      'hint'
    )
  );
}
