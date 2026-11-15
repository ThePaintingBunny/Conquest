/*
 * Map legend
 *
 * The legend opened with the Legend button on the board: objective zones, terrain types and what each
 * terrain rule does.
 *
 * In this file: L, lt(), sy, legOpen, legIcon(), legStand(), renderLegend()
 */

const L = $('legend');

function lt(x, y, cls, t) {
  const e = el('text', { x, y, class: cls, 'dominant-baseline': 'central' }, L);
  e.textContent = t;
  if (t === 'Claude’s army') e.id = 'leg-them-t';
}

[
  ['Large zone', '9 in, 3 VP'],
  ['Small zone', '6 in, 2 VP'],
  ['Forest', 'Hindering, cover'],
  ['Hill', 'Blocks sight'],
  ['Rocks', 'Impassable'],
  ['Your army', 'Bottom edge'],
  ['Claude’s army', 'Top edge'],
  ['Command stand', 'Leader, gold edge'],
  ['Minotaur', 'Auxiliary stand']
].forEach(([a, b], i) => {
  const y = 50 + i * 36;
  lt(48, y, 'lt', a);
  lt(48, y + 17, 'ls', b);
  const ic = el('g', {}, L),
    cy = y + 8;
  if (i == 0)
    el(
      'circle',
      {
        cx: 24,
        cy,
        r: 12,
        fill: '#D9B44A',
        'fill-opacity': 0.25,
        stroke: '#C9A63E',
        'stroke-width': 1.5,
        'stroke-dasharray': '4 3'
      },
      ic
    );
  if (i == 1)
    el(
      'circle',
      {
        cx: 24,
        cy,
        r: 8,
        fill: '#D9B44A',
        'fill-opacity': 0.25,
        stroke: '#C9A63E',
        'stroke-width': 1.5,
        'stroke-dasharray': '3 3'
      },
      ic
    );
  if (i == 2) forest(24, cy, 14, 10, ic);
  if (i == 3) hill(24, cy, 14, 9, ic);
  if (i == 4) rocks(24, cy, 11, 7, ic);
  if (i == 5)
    el(
      'rect',
      {
        id: 'leg-you',
        x: 12,
        y: cy - 7,
        width: 24,
        height: 14,
        rx: 2,
        fill: '#9A3328',
        stroke: '#F3E6C4',
        'stroke-width': 1
      },
      ic
    );
  if (i == 6)
    el(
      'rect',
      {
        id: 'leg-them',
        x: 12,
        y: cy - 7,
        width: 24,
        height: 14,
        rx: 2,
        fill: '#2C5A8E',
        stroke: '#F3E6C4',
        'stroke-width': 1
      },
      ic
    );
  if (i == 7) {
    el(
      'rect',
      {
        x: 16,
        y: cy - 7,
        width: 14,
        height: 14,
        rx: 1.5,
        fill: '#9A3328',
        stroke: '#E8C65A',
        'stroke-width': 2.2
      },
      ic
    );
    el(
      'path',
      {
        d: `M23 ${cy - 4.5} L27 ${cy} L23 ${cy + 4.5} L19 ${cy}Z`,
        fill: '#E8C65A',
        stroke: '#4A3418',
        'stroke-width': 0.6
      },
      ic
    );
  }
  if (i == 8) {
    el(
      'rect',
      {
        x: 16,
        y: cy - 7,
        width: 14,
        height: 14,
        rx: 1.5,
        fill: '#3B1A14',
        stroke: '#F3E6C4',
        'stroke-width': 0.8
      },
      ic
    );
    el(
      'path',
      {
        d: `M18.5 ${cy - 3.5} Q20 ${cy + 2} 23 ${cy + 2} Q26 ${cy + 2} 27.5 ${cy - 3.5}`,
        fill: 'none',
        stroke: '#F3E6C4',
        'stroke-width': 1.6,
        'stroke-linecap': 'round'
      },
      ic
    );
  }
});

const sy = 50 + 9 * 36 + 2;
el('rect', { x: 10, y: sy, width: 84, height: 5, fill: '#4A3418' }, L);
el('rect', { x: 10, y: sy, width: 42, height: 5, fill: '#C9B27A' }, L);
lt(102, sy + 3, 'ls', '12 in');

/* legend: a toggle panel over the map, listing what this game uses */
let legOpen = false;

try {
  legOpen = localStorage.getItem('conquest-legend') === '1';
} catch (e) {}

function legIcon(draw) {
  const sv = document.createElementNS(NS, 'svg');
  sv.setAttribute('viewBox', '0 0 40 26');
  sv.setAttribute('width', '40');
  sv.setAttribute('height', '26');
  sv.setAttribute('aria-hidden', 'true');
  draw(sv);
  return sv;
}

function legStand(g, fill, stroke, sw) {
  return el(
    'rect',
    {
      x: 13,
      y: 6,
      width: 14,
      height: 14,
      rx: 1.5,
      fill,
      stroke: stroke || '#F3E6C4',
      'stroke-width': sw || 0.8
    },
    g
  );
}

function renderLegend() {
  const pan = $('leg-panel'),
    btn = $('leg-btn');
  if (!pan || !btn) return;
  btn.setAttribute('aria-expanded', String(legOpen));
  btn.textContent = legOpen ? 'Hide legend' : 'Legend';
  pan.hidden = !legOpen;
  if (!legOpen || !state) return;
  pan.innerHTML = '';
  const sec = t => {
    const h = document.createElement('div');
    h.className = 'leg-h';
    h.textContent = t;
    pan.appendChild(h);
  };
  const item = (draw, a, b) => {
    const r = document.createElement('div');
    r.className = 'leg-i';
    const t = document.createElement('div');
    const s1 = document.createElement('strong');
    s1.textContent = a;
    t.appendChild(s1);
    if (b) {
      const s2 = document.createElement('span');
      s2.textContent = b;
      t.appendChild(s2);
    }
    r.append(legIcon(draw), t);
    pan.appendChild(r);
  };
  const zs = zonesOf(),
    T = terrainOf(),
    U = (state.units || []).filter(u => u.type !== 'marker');
  sec('Objectives');
  if (zs.some(z => z.size === 9))
    item(
      g =>
        el(
          'circle',
          {
            cx: 20,
            cy: 13,
            r: 11,
            fill: '#D9B44A',
            'fill-opacity': 0.25,
            stroke: '#C9A63E',
            'stroke-width': 1.5,
            'stroke-dasharray': '4 3'
          },
          g
        ),
      'Large zone',
      '9″, 3 VP'
    );
  if (zs.some(z => z.size !== 9))
    item(
      g =>
        el(
          'circle',
          {
            cx: 20,
            cy: 13,
            r: 7,
            fill: '#D9B44A',
            'fill-opacity': 0.25,
            stroke: '#C9A63E',
            'stroke-width': 1.5,
            'stroke-dasharray': '3 3'
          },
          g
        ),
      'Small zone',
      '6″, 2 VP'
    );
  if (zs.some(z => z.friendly))
    item(
      g => {
        el(
          'circle',
          { cx: 13, cy: 13, r: 8, fill: COL.cs.light, 'fill-opacity': 0.35, stroke: COL.cs.light },
          g
        );
        el(
          'circle',
          { cx: 28, cy: 13, r: 8, fill: COL.nord.light, 'fill-opacity': 0.35, stroke: COL.nord.light },
          g
        );
      },
      'Friendly zones',
      'Only the other side can seize them'
    );
  if ((state.units || []).some(u => u.type === 'marker'))
    item(
      g => {
        [
          [COL.cs.fill, 9],
          [COL.nord.fill, 20],
          ['#6B5638', 31]
        ].forEach(([c, x]) =>
          el('circle', { cx: x, cy: 13, r: 5, fill: c, stroke: '#F3E6C4', 'stroke-width': 1 }, g)
        );
      },
      'Objective Markers',
      PAL[colId('cs')].name + ' south, ' + colName('nord') + ' north, brown neutral; 3 wounds'
    );
  const types = [...new Set(T.map(t => t.type))];
  if (types.length) {
    sec('Terrain');
    types.forEach(ty => {
      const d = TTYPES[ty] || TTYPES.forest;
      item(
        g => (TDRAW[ty] || forest)(20, 13, ty === 'building' ? 9 : 14, ty === 'building' ? 7 : 9, g),
        d.name,
        'Size ' + d.size + ' · ' + d.kw.join(', ')
      );
    });
  }
  sec('Armies');
  ['cs', 'nord'].forEach(sd =>
    item(
      g => {
        el(
          'rect',
          {
            x: 8,
            y: 6,
            width: 24,
            height: 14,
            rx: 2,
            fill: COL[sd].fill,
            stroke: '#F3E6C4',
            'stroke-width': 1
          },
          g
        );
      },
      N(sd) + (sd === HU ? ' (you)' : ''),
      sd === HU ? 'Bottom edge' : 'Top edge'
    )
  );
  sec('Stands');
  item(
    g => {
      legStand(g, COL[HU].fill, '#E8C65A', 2.2);
      el(
        'path',
        { d: 'M20 8.5 L24 13 L20 17.5 L16 13Z', fill: '#E8C65A', stroke: '#4A3418', 'stroke-width': 0.6 },
        g
      );
    },
    'Command stand',
    'Gold edge and diamond; removed last'
  );
  item(
    g => {
      legStand(g, COL[HU].light);
    },
    'Rear rank',
    'Lighter colour'
  );
  if (U.some(u => u.char != null))
    item(
      g => {
        legStand(g, COL[HU].fill);
        el('circle', { cx: 20, cy: 13, r: 4, fill: '#F3E6C4', stroke: '#4A3418', 'stroke-width': 0.8 }, g);
      },
      'Character',
      'Always in the front rank'
    );
  const auxes = new Set(U.filter(u => u.aux != null && u.auxStats).map(u => auxStyle(u).key));
  if (auxes.has('mino'))
    item(
      g => {
        legStand(g, '#3B1A14');
        el(
          'path',
          {
            d: 'M15.5 9.5 Q17 15 20 15 Q23 15 24.5 9.5',
            fill: 'none',
            stroke: '#F3E6C4',
            'stroke-width': 1.6,
            'stroke-linecap': 'round'
          },
          g
        );
      },
      'Minotaur',
      'Auxiliary stand, own profile'
    );
  if (auxes.has('sb'))
    item(
      g => {
        legStand(g, '#2E3B55');
        el('circle', { cx: 20, cy: 13, r: 4.6, fill: '#B8862E', stroke: '#F3E6C4', 'stroke-width': 0.8 }, g);
        el(
          'path',
          { d: 'M17.7 15.2 L20 10.4 L22.3 15.2', fill: 'none', stroke: '#1C1410', 'stroke-width': 1.2 },
          g
        );
      },
      'Sacred Band Veteran',
      'Auxiliary stand, own profile'
    );
  const mods = [...new Set(U.flatMap(u => u.mods || []))];
  if (mods.length) {
    sec('Modular stands');
    mods.forEach(m => {
      const M = MODSTYLE[m];
      if (!M) return;
      const P = MODULAR[m] || {};
      item(
        g => {
          legStand(g, COL[HU].fill);
          el(
            'rect',
            { x: 14, y: 9, width: 12, height: 8, rx: 2, fill: M[1], stroke: '#1C1410', 'stroke-width': 0.5 },
            g
          );
          const t = el(
            'text',
            {
              x: 20,
              y: 13.3,
              'text-anchor': 'middle',
              'dominant-baseline': 'central',
              'font-size': 6,
              'font-weight': 700,
              fill: '#1C1410'
            },
            g
          );
          t.textContent = M[0];
        },
        m,
        P.role ? 'Ideal ' + P.role + ' · ' + (P.rules || []).join(', ') : ''
      );
    });
  }
  sec('Markers');
  item(
    g => {
      legStand(g, COL[HU].fill);
      el('circle', { cx: 26, cy: 9, r: 5.5, fill: '#B3261E', stroke: '#FFF3E0', 'stroke-width': 1.2 }, g);
      const t = el(
        'text',
        {
          x: 26,
          y: 9.5,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          'font-size': 7,
          'font-weight': 700,
          fill: '#FFF3E0'
        },
        g
      );
      t.textContent = '3';
    },
    'Wounds',
    'On the stand taking them'
  );
  item(
    g => {
      legStand(g, COL[HU].fill);
      el(
        'path',
        {
          d: 'M15 8 L19 11 L22 13 L19 16 L25 19',
          fill: 'none',
          stroke: '#1C1410',
          'stroke-width': 1.4,
          'stroke-linecap': 'round'
        },
        g
      );
    },
    'Broken',
    'Crack across the stands'
  );
  item(
    g => {
      el('rect', { x: 4, y: 10, width: 32, height: 5, fill: '#4A3418' }, g);
      el('rect', { x: 4, y: 10, width: 16, height: 5, fill: '#C9B27A' }, g);
    },
    'Scale',
    'Bar is 12″, each half 6″'
  );
}

$('leg-btn').onclick = () => {
  legOpen = !legOpen;
  try {
    localStorage.setItem('conquest-legend', legOpen ? '1' : '0');
  } catch (e) {}
  renderLegend();
};
