/*
 * Random terrain
 *
 * Generates a random terrain layout, checks that a piece may be placed, and keeps the player's filter
 * for which types may appear.
 *
 * In this file: terrWhy(), TEDGE, TSIZE, terrPref, saveTerrPref(), terrFilterBox(), genTerrain()
 */

function terrWhy(p, list) {
  const R = terrR(p);
  if (p.x - p.rx < 0 || p.x + p.rx > 72 || p.y - p.ry < 0 || p.y + p.ry > 48)
    return 'That piece would hang off the table.';
  for (const q of list) {
    if (q === p) continue;
    if (Math.hypot(p.x - q.x, p.y - q.y) - R - terrR(q) < 7 - 1e-6)
      return 'Terrain must be at least 7″ from other terrain.';
  }
  if (
    (tHas(p, 'Impassable') || tHas(p, 'Garrison')) &&
    zonesOf().some(z => Math.hypot(p.x - z.x, p.y - z.y) < z.r + R)
  )
    return tHas(p, 'Garrison')
      ? 'Buildings cannot overlap an objective zone.'
      : 'Impassable terrain cannot sit on an objective zone.';
  if (tHas(p, 'Garrison')) {
    if (p.x - p.rx < 6 || p.x + p.rx > 66 || p.y - p.ry < 6 || p.y + p.ry > 42)
      return 'Buildings must be at least 6″ from the table edges.';
    if (list.filter(q => q !== p && tHas(q, 'Garrison')).length >= 2)
      return 'At most 2 buildings per battlefield.';
  }
  if (
    (scenOf().markers || []).some(
      m => ((m.x - p.x) / (p.rx + 1.5)) ** 2 + ((m.y - p.y) / (p.ry + 1.5)) ** 2 <= 1
    )
  )
    return 'Terrain cannot cover an Objective Marker.';
  return '';
}

/* random terrain keeps this gap from every table edge (two stands wide), so regiments can always come on and pass */
const TEDGE = 4;

const TSIZE = { small: [2.5, 1.8], medium: [4, 3], large: [5.5, 4] };

let terrPref = (() => {
  try {
    const v = JSON.parse(localStorage.getItem('conquest-terrain-filter') || 'null');
    if (v && Array.isArray(v.allow)) return { allow: v.allow.filter(t => TTYPES[t]), count: +v.count || 0 };
  } catch (e) {}
  return { allow: Object.keys(TTYPES), count: 0 };
})();

function saveTerrPref() {
  try {
    localStorage.setItem('conquest-terrain-filter', JSON.stringify(terrPref));
  } catch (e) {}
}

function terrFilterBox() {
  const box = document.createElement('div');
  box.className = 't-filter';
  const h = document.createElement('div');
  h.className = 'row';
  const lb = document.createElement('b');
  lb.textContent = 'Random terrain uses:';
  h.appendChild(lb);
  const allB = abBtn(
      'All',
      () => {
        terrPref.allow = Object.keys(TTYPES);
        saveTerrPref();
        renderTurnbar();
      },
      'ab-ghost ab-small'
    ),
    noneB = abBtn(
      'None',
      () => {
        terrPref.allow = [];
        saveTerrPref();
        renderTurnbar();
      },
      'ab-ghost ab-small'
    );
  h.append(allB, noneB);
  h.append(
    document.createTextNode(' Pieces:'),
    abStepper(
      terrPref.count || 0,
      0,
      12,
      v => {
        terrPref.count = v === 1 || v === 2 || v === 3 ? (terrPref.count === 0 ? 4 : 0) : v;
        saveTerrPref();
        renderTurnbar();
      },
      'number of terrain pieces'
    )
  );
  const cl = document.createElement('span');
  cl.className = 'hint';
  cl.textContent = terrPref.count ? terrPref.count + ' pieces' : '0 = automatic (6 to 8)';
  h.appendChild(cl);
  box.appendChild(h);
  const row = document.createElement('div');
  row.className = 'row';
  Object.entries(TTYPES).forEach(([k, d]) => {
    const on = terrPref.allow.includes(k);
    const b = abBtn(
      (on ? '✓ ' : '') + d.name,
      () => {
        terrPref.allow = on ? terrPref.allow.filter(x => x !== k) : terrPref.allow.concat([k]);
        saveTerrPref();
        renderTurnbar();
      },
      'ab-tog' + (on ? ' on' : '')
    );
    b.setAttribute('aria-pressed', String(on));
    b.title = d.kw.join(', ') + ' · Size ' + d.size;
    row.appendChild(b);
  });
  box.appendChild(row);
  if (!terrPref.allow.length)
    box.appendChild(ptext('Pick at least one terrain type for random maps.', 'warn'));
  else if (terrPref.allow.length === 1 && terrPref.allow[0] === 'building')
    box.appendChild(ptext('Only buildings: at most 2 can be placed.', 'hint'));
  return box;
}

function genTerrain() {
  if (!terrPref.allow.length) {
    toast('Pick at least one terrain type first.');
    return terrainOf();
  }
  let best = [];
  for (let a = 0; a < 30; a++) {
    const out = [],
      n = terrPref.count || 6 + Math.floor(Math.random() * 3);
    let tries = 0;
    const allT = terrPref.allow.length === Object.keys(TTYPES).length,
      types = terrPref.allow.flatMap(t => (allT && (t === 'forest' || t === 'hill') ? [t, t] : [t]));
    while (out.length < n && tries++ < 3000) {
      const type = types[Math.floor(Math.random() * types.length)],
        rx = +(2.5 + Math.random() * 4).toFixed(1),
        ry = +Math.max(1.8, rx * (0.55 + Math.random() * 0.4)).toFixed(1);
      const big = type === 'building',
        RX = big ? 2.6 : rx,
        RY = big ? 2.2 : ry,
        p = {
          type,
          x: +(TEDGE + RX + Math.random() * (72 - 2 * (RX + TEDGE))).toFixed(1),
          y: +(TEDGE + RY + Math.random() * (48 - 2 * (RY + TEDGE))).toFixed(1),
          rx: RX,
          ry: RY,
          seed: Math.floor(Math.random() * 1e9)
        };
      const P = terrPoly(p),
        inside = P.every(([x, y]) => x >= TEDGE && x <= 72 - TEDGE && y >= TEDGE && y <= 48 - TEDGE);
      if (inside && !terrWhy(p, out)) out.push(p);
    }
    if (out.length > best.length) best = out;
    if (best.length >= n) break;
  }
  return best;
}
