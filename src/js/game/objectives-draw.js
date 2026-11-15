/*
 * Drawing objectives
 *
 * Draws objective zones and markers on the board.
 *
 * In this file: zoneKey, drawZones(), drawMarker()
 */

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
