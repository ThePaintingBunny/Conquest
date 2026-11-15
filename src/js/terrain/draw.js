/*
 * Drawing terrain
 *
 * Draws every terrain piece on the board in the right layer.
 *
 * In this file: TDRAW, TBASE, TLAYER, terrKey, drawTerrain()
 */

const TDRAW = { forest, hill, rocks, swamp, water, ruins, field, rubble, thorns, building };

/* base colour under each terrain piece (the footprint the rules use) */
const TBASE = {
  forest: '#3F5F2C',
  hill: '#9AA65C',
  rocks: '#6F6C66',
  swamp: '#4E5B3A',
  water: '#3E6A86',
  ruins: '#857A66',
  field: '#B8A45A',
  rubble: '#7A6A52',
  thorns: '#4B5233',
  building: '#8C8571'
};

const TLAYER = {
  forest: 'forests',
  hill: 'hills',
  rocks: 'rocks',
  swamp: 'terr-low',
  water: 'terr-low',
  field: 'terr-low',
  rubble: 'terr-low',
  thorns: 'forests',
  ruins: 'rocks',
  building: 'rocks'
};

let terrKey = '';

function drawTerrain() {
  const T = terrainOf(),
    k = JSON.stringify(T) + '|' + (typeof terrSel === 'number' ? terrSel : '');
  if (k === terrKey) return;
  terrKey = k;
  /* the decorative road turns with the table for the player on the far side */
  const road = $('road');
  if (road) {
    if (FLIP) road.removeAttribute('transform');
    else road.setAttribute('transform', 'rotate(180 422 208)');
  }
  ['forests', 'hills', 'rocks', 'terr-low'].forEach(i => ($(i).innerHTML = ''));
  T.forEach((t, i) => {
    const g = el('g', { 'data-tid': String(i), class: 'tpiece' }, $(TLAYER[t.type] || 'rocks'));
    s = t.seed | 0 || i + 1;
    const I = tInfo(t);
    const tt = el('title', {}, g);
    tt.textContent =
      I.name +
      ' · Size ' +
      I.size +
      ' · ' +
      I.kw.join(', ') +
      (I.kw.includes('Garrison') ? ' · Capacity ' + I.cap + ', Defense +' + I.def : '');
    /* The piece's base: the ellipse drawn here is exactly the area the rules use. Decoration is clipped to it,
       and its outline is always visible (solid for terrain that blocks movement, dashed for terrain you can enter). */
    const cx = px(t.x),
      cy = py(t.y),
      rx = t.rx * S,
      ry = t.ry * S,
      cid = 'tclip' + i,
      blocks = I.kw.includes('Impassable') || I.kw.includes('Garrison');
    const outline = terrPoly(t)
      .map(q => px(q[0]).toFixed(1) + ',' + py(q[1]).toFixed(1))
      .join(' ');
    el('polygon', { points: outline }, el('clipPath', { id: cid }, g));
    el('polygon', { points: outline, fill: TBASE[t.type] || '#5E6B45', 'fill-opacity': 0.55 }, g);
    if (t.type === 'building')
      buildingRoof(
        terrPoly(t).map(q => [px(q[0]), py(q[1])]),
        g
      );
    else
      (TDRAW[t.type] || forest)(
        cx,
        cy,
        rx * 1.12,
        ry * 1.12,
        el('g', { 'clip-path': 'url(#' + cid + ')' }, g)
      );
    el(
      'polygon',
      {
        points: outline,
        fill: 'none',
        stroke: blocks ? '#2B2620' : '#F3E6C4',
        'stroke-opacity': blocks ? 0.85 : 0.7,
        'stroke-width': blocks ? 2 : 1.4,
        'stroke-dasharray': blocks ? '' : '5 3'
      },
      g
    );
    if (terrSel === i)
      el(
        'polygon',
        {
          points: terrPoly(t)
            .map(q => {
              const d = Math.hypot(q[0] - t.x, q[1] - t.y) || 1,
                k = (d + 0.15) / d;
              return px(t.x + (q[0] - t.x) * k) + ',' + py(t.y + (q[1] - t.y) * k);
            })
            .join(' '),
          fill: 'none',
          stroke: '#E8C65A',
          'stroke-width': 2,
          'stroke-dasharray': '5 3'
        },
        g
      );
  });
}
