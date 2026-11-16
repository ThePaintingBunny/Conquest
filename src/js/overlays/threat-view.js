/*
 * Threat ranges on the board
 *
 * Draws threat ranges as two layers from the regiment's front edge, with the key and its tick boxes.
 *
 * T (or the Threat tool) cycles Charge threat, Volley threat, off. It shows the regiment under the
 * pointer, or the selected one; online, the opponent sees the same (including any boosts you have
 * ticked).
 *
 * Charge view: Charge from where it stands (guaranteed solid, Charge Roll of 6 dashed) and March then
 * Charge (outline). Volley view: Volley from where it stands (effective and full range) and March then
 * Volley (outline).
 *
 * In this file: threatMode, rThreat, thrSent, thrSendT, thrOn, thrSelSeen, thrActSeen, thrPins,
 *   thrFoes, THR_STYLE, drawThreat(), thrKeys(), thrToggle(), thrAllKeys(), thrAll(), threatIds(),
 *   drawThreatLayer(), thrPin(), redrawThreat(), threatKey(), thrKeyPlace(), threatShare(), onThreat(),
 *   THR_NEXT, cycleThreat()
 */

let threatMode = '' /* '' | 'charge' | 'volley' */,
  rThreat = null /* online: {id, mode, on} the opponent is looking at */,
  thrSent = '',
  thrSendT = 0,
  thrOn = {} /* unit id -> array of ticked boost keys */,
  thrSelSeen = null,
  thrActSeen = null,
  thrPins =
    [] /* regiments whose threat stays shown (Shift+click), so you can see them while moving your own */,
  thrFoes = false; /* every enemy regiment's threat at once */

/* ---------- the layers ---------- */
const THR_STYLE = {
  sure: { fill: '#FFF6D8', fo: 0.38, stroke: '#FFF6D8', w: 2 },
  roll: { fill: '#F29A3A', fo: 0.3, stroke: '#FFB45C', w: 2, dash: '6 4' },
  msure: { fill: 'none', fo: 0, stroke: '#FF6B5C', w: 2.2 },
  mroll: { fill: 'none', fo: 0, stroke: '#FF6B5C', w: 2, dash: '7 5' },
  eff: { fill: '#FFD66B', fo: 0.32, stroke: '#FFE39A', w: 2 },
  full: { fill: '#6FA8FF', fo: 0.2, stroke: '#9CC4FF', w: 2, dash: '6 4' },
  mfull: { fill: 'none', fo: 0, stroke: '#FF6B5C', w: 2, dash: '7 5' }
};

function drawThreat(u, mode, g, remote, onKeys) {
  if (!u || !u.onTable || u.destroyed || !mode) return null;
  const T = threatLayers(u, mode, onKeys),
    pts = q =>
      clipTable(q)
        .map(p => px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1))
        .join(' ');
  /* outermost first, so the inner layers sit on top */
  T.L.slice()
    .sort((a, b) => b.R - a.R)
    .forEach(l => {
      const S = THR_STYLE[l.k];
      /* An outline-only layer (March, then …) shares its side lines with the zones inside it: every layer runs out
         from the same front corners along the arc. Draw only the part beyond the next layer in, as an open line,
         so the dashes never sit on top of the inner zone's edge. */
      const inner = Math.max(0, ...T.L.filter(x => x.R < l.R - 1e-6).map(x => x.R));
      if (S.fill === 'none' && T.span < 180 && inner > 0) {
        const o = fanPoly(u, l.R, T.span, T.back),
          n = o.length,
          k = inner / l.R,
          lerp = (a, b) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k],
          line = [lerp(o[0], o[1])].concat(o.slice(1, n - 1), [lerp(o[n - 1], o[n - 2])]);
        el(
          'polyline',
          {
            points: line.map(p => px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1)).join(' '),
            fill: 'none',
            stroke: S.stroke,
            'stroke-width': S.w,
            'stroke-dasharray': S.dash || '',
            'clip-path': 'url(#thr-table)',
            class: 'thr-' + l.k + (remote ? ' thr-remote' : '')
          },
          g
        );
        return;
      }
      el(
        'polygon',
        {
          points: pts(fanPoly(u, l.R, T.span, T.back)),
          fill: S.fill,
          'fill-opacity': S.fo,
          stroke: S.stroke,
          'stroke-width': S.w,
          'stroke-dasharray': S.dash || '',
          class: 'thr-' + l.k + (remote ? ' thr-remote' : '')
        },
        g
      );
    });
  return T;
}

/* ---------- ticked boosts ---------- */
function thrKeys(id) {
  return thrOn[id] || [];
}

/* tick or untick one boost; a boost in a group replaces the other one in that group */
function thrToggle(id, key, val) {
  const u = byId(id);
  if (!u) return;
  const L = threatBoosts(u),
    b = L.find(x => x.key === key);
  let cur = thrKeys(id).slice();
  if (val) {
    if (b && b.grp) cur = cur.filter(k => !L.some(x => x.key === k && x.grp === b.grp));
    if (b && b.kind === 'cp') cur = cur.filter(k => !L.some(x => x.key === k && x.kind === 'cp'));
    cur.push(key);
  } else cur = cur.filter(k => k !== key);
  thrOn[id] = cur;
  redrawThreat();
}

/* every boost at once: all ungrouped ones, and the best of each group for this view */
function thrAllKeys(u, mode) {
  const L = threatBoosts(u).filter(b => thrRelevant(b, mode)),
    keys = L.filter(b => !b.grp && b.kind !== 'cp').map(b => b.key),
    groups = [...new Set(L.filter(b => b.grp).map(b => b.grp))];
  groups.forEach(g => {
    let best = null,
      bv = -1;
    L.filter(b => b.grp === g).forEach(b => {
      const v = threatLayers(u, mode, keys.concat(b.key)).head;
      if (v > bv) {
        bv = v;
        best = b;
      }
    });
    if (best) keys.push(best.key);
  });
  /* Clockwork Parade only if it beats the roll it replaces */
  const cp = L.find(b => b.kind === 'cp');
  if (cp) {
    const far = T => Math.max(0, ...T.L.map(l => l.R));
    if (far(threatLayers(u, mode, keys.concat(cp.key))) > far(threatLayers(u, mode, keys))) keys.push(cp.key);
  }
  return keys;
}

function thrAll(id, val) {
  const u = byId(id);
  if (!u) return;
  thrOn[id] = val ? thrAllKeys(u, threatMode) : [];
  redrawThreat();
}

/* ---------- which regiment, the layer and the key ---------- */
function threatIds() {
  if (!threatMode) return [];
  const ids = [];
  if (arcHover && byId(arcHover)) ids.push(arcHover);
  if (selId && byId(selId) && !ids.includes(selId)) ids.push(selId);
  return ids.slice(0, 1);
}

function drawThreatLayer(g) {
  /* the table, to clip open lines (polygons are clipped by clipTable) */
  const xs = [px(0), px(72)],
    ys = [py(0), py(48)];
  el(
    'rect',
    {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.abs(xs[1] - xs[0]),
      height: Math.abs(ys[1] - ys[0])
    },
    el('clipPath', { id: 'thr-table' }, g)
  );
  /* ticks reset when the selection or the activating regiment changes */
  const aid = act ? act.id : null;
  if (selId !== thrSelSeen || aid !== thrActSeen) {
    thrOn = {};
    thrSelSeen = selId;
    thrActSeen = aid;
  }
  let shown = null;
  const id = threatIds()[0];
  /* kept regiments (Shift+click) and, when ticked, every enemy regiment: drawn underneath, without a key */
  thrPins = thrPins.filter(x => byId(x) && byId(x).onTable && !byId(x).destroyed);
  if (threatMode) {
    const foes = thrFoes
      ? all()
          .filter(o => o.onTable && !o.destroyed && o.side !== HU && o.type !== 'marker')
          .map(o => o.id)
      : [];
    [...new Set(thrPins.concat(foes))]
      .filter(x => x !== id)
      .forEach(x =>
        drawThreat(byId(x), threatMode, el('g', { opacity: 0.7, 'data-kept': x }, g), false, thrKeys(x))
      );
  }
  if (id) {
    const k = thrKeys(id);
    shown = {
      u: byId(id),
      mode: threatMode,
      T: drawThreat(byId(id), threatMode, g, false, k),
      on: k,
      edit: id === selId
    };
  } else if (rThreat && rThreat.id && byId(rThreat.id))
    shown = {
      u: byId(rThreat.id),
      mode: rThreat.mode,
      T: drawThreat(byId(rThreat.id), rThreat.mode, g, true, rThreat.on || []),
      on: rThreat.on || [],
      remote: true
    };
  threatKey(shown);
  threatShare();
}

/* keep a regiment's threat shown, or let it go */
function thrPin(id) {
  if (!id || !byId(id)) return;
  thrPins = thrPins.includes(id) ? thrPins.filter(x => x !== id) : thrPins.concat(id);
  toast(
    thrPins.includes(id)
      ? (byId(id).short || byId(id).name) + ': threat kept on the map.'
      : (byId(id).short || byId(id).name) + ': no longer kept.'
  );
  redrawThreat();
}

function redrawThreat() {
  const g = $('thrg');
  if (!g) return render();
  g.innerHTML = '';
  drawThreatLayer(g);
}

function threatKey(s) {
  let k = $('threat-key');
  if (!k) {
    k = document.createElement('div');
    k.id = 'threat-key';
    k.className = 'threat-key';
    const mb = document.querySelector('.mapbox');
    if (!mb) return;
    mb.appendChild(k);
    k.addEventListener('click', ev => {
      const b = ev.target.closest && ev.target.closest('[data-pin]');
      if (b) thrPin(b.dataset.pin);
    });
    k.addEventListener('change', ev => {
      const t = ev.target;
      if (t && t.dataset.foes) {
        thrFoes = t.checked;
        redrawThreat();
        return;
      }
      if (!t || t.type !== 'checkbox' || !t.dataset.uid) return;
      if (t.dataset.all) thrAll(t.dataset.uid, t.checked);
      else thrToggle(t.dataset.uid, t.dataset.key, t.checked);
    });
  }
  if (!s && threatMode) {
    k.hidden = false;
    k.innerHTML =
      '<b>' +
      (threatMode === 'charge' ? 'Charge' : 'Volley') +
      ' threat</b><div class="tk-n">Point at a regiment, or select one to try its boosts. Shift+click a regiment to keep its threat shown while you move. T: next view.</div>' +
      '<label class="tk-row"><input type="checkbox" data-foes="1"' +
      (thrFoes ? ' checked' : '') +
      '> <span>Show every enemy regiment</span></label>';
    return;
  }
  if (!s || !s.T) {
    k.hidden = true;
    return;
  }
  const esc = t =>
      String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
    nm = s.u.short || s.u.name,
    ft = R => +R.toFixed(1) + '″';
  let h =
    '<b>' +
    esc(nm) +
    ': ' +
    (s.mode === 'charge' ? 'Charge' : 'Volley') +
    ' threat</b>' +
    (s.remote ? '<div class="tk-n">' + esc(PN(s.u.side) || N(s.u.side)) + ' is looking at this.</div>' : '');
  h += '<ul>';
  s.T.L.forEach(l => {
    const S = THR_STYLE[l.k];
    h +=
      '<li><i class="tk-sw" style="background:' +
      (S.fill === 'none' ? 'transparent' : S.fill) +
      ';border-color:' +
      S.stroke +
      (S.dash ? ';border-style:dashed' : '') +
      '"></i>' +
      esc(l.t) +
      ' <span class="tk-d">' +
      ft(l.R) +
      '</span></li>';
  });
  h += '</ul>';
  (s.T.notes || []).forEach(n => (h += '<div class="tk-n">' + esc(n) + '</div>'));
  const nb = (s.T.NB && s.T.NB.src) || [];
  if (nb.length) h += '<div class="tk-n">Already counted: ' + nb.map(esc).join('; ') + '.</div>';
  /* the boosts, each with how far it gets the regiment on its own */
  const L = (s.T.all || []).filter(b => thrRelevant(b, s.mode));
  if (L.length) {
    const base = threatLayers(s.u, s.mode, []).head,
      rows = L.map(b => ({ b, v: threatLayers(s.u, s.mode, [b.key]).head })).sort((x, y) => y.v - x.v);
    h += '<div class="tk-h">Could still get</div><div class="tk-list">';
    if (s.edit)
      h +=
        '<label class="tk-row tk-allrow"><input type="checkbox" data-all="1" data-uid="' +
        esc(s.u.id) +
        '"' +
        (s.on.length && thrAllKeys(s.u, s.mode).every(x => s.on.includes(x)) ? ' checked' : '') +
        '> <span>Every boost (the furthest it could get)</span></label>';
    rows.forEach(({ b, v }) => {
      const ck = s.on.includes(b.key) ? ' checked' : '',
        reach =
          v > base + 1e-6
            ? (s.mode === 'charge' ? 'Charge ' : 'range ') + ft(v)
            : b.kind === 'rangeM'
              ? 'after a March'
              : b.kind === 'cp'
                ? 'sure ' + ft(threatLayers(s.u, s.mode, [b.key]).L[0].R)
                : 'March then …';
      h += s.edit
        ? '<label class="tk-row"><input type="checkbox" data-uid="' +
          esc(s.u.id) +
          '" data-key="' +
          esc(b.key) +
          '"' +
          ck +
          '> <span>' +
          esc(b.src) +
          '</span><span class="tk-d">' +
          reach +
          '</span></label>'
        : '<div class="tk-row' +
          (ck ? ' tk-on' : '') +
          '"><span>' +
          (ck ? '✓ ' : '') +
          esc(b.src) +
          '</span><span class="tk-d">' +
          reach +
          '</span></div>';
    });
    h += '</div>';
    if (!s.edit && !s.remote) h += '<div class="tk-n">Select the regiment to tick boosts on.</div>';
  } else h += '<div class="tk-n">No boosts it could still get this round.</div>';
  if (!s.remote)
    h +=
      '<div class="tk-pin">' +
      '<button type="button" class="btn ghost tk-pb" data-pin="' +
      esc(s.u.id) +
      '">' +
      (thrPins.includes(s.u.id) ? 'Stop keeping it shown' : 'Keep it shown') +
      '</button>' +
      '<label class="tk-row"><input type="checkbox" data-foes="1"' +
      (thrFoes ? ' checked' : '') +
      '> <span>Show every enemy regiment</span></label></div>' +
      '<div class="tk-n">Kept regiments stay on the map while you move your own. Shift+click a regiment to keep it or let it go.</div>';
  h +=
    '<div class="tk-n">From the front edge, over the ' +
    (s.mode === 'charge' ? 'front' : 'firing') +
    ' arc. The March is taken straight ahead; wheeling turns the arc.</div>';
  /* keep the scroll position while ticking */
  const sc = k.querySelector('.tk-list') ? k.querySelector('.tk-list').scrollTop : 0;
  k.hidden = false;
  k.innerHTML = h;
  if (k.querySelector('.tk-list')) k.querySelector('.tk-list').scrollTop = sc;
  /* the regiments are drawn after this layer: place the key once they are on the board */
  requestAnimationFrame(() => thrKeyPlace(k, s.u));
}

/* keep the key out of the way: of the four corners of the map, the one that covers the least of the threat zones
   and of the regiments (the one it describes counts most), checked on a grid of points */
function thrKeyPlace(k, u) {
  let best = [false, false];
  try {
    const svg = $('board'),
      M = svg.getScreenCTM().inverse(),
      mb = k.parentNode.getBoundingClientRect(),
      kw = k.offsetWidth,
      kh = k.offsetHeight,
      zones = [...document.querySelectorAll('#thrg polygon')],
      regs = [...document.querySelectorAll('#units g[data-id]')].map(e => ({
        r: e.getBoundingClientRect(),
        w: u && e.dataset.id === u.id ? 8 : 3
      })),
      P = svg.createSVGPoint();
    let low = Infinity;
    [
      [false, false],
      [true, false],
      [false, true],
      [true, true]
    ].forEach(([l, b], i) => {
      const x0 = l ? mb.left + 8 : mb.right - 8 - kw,
        y0 = b ? mb.bottom - 8 - kh : mb.top + 8;
      let sc = i * 0.01; /* ties: top right first */
      for (let a = 0; a <= 8; a++)
        for (let c = 0; c <= 6; c++) {
          const X = x0 + (kw * a) / 8,
            Y = y0 + (kh * c) / 6;
          regs.forEach(g => {
            if (X >= g.r.left && X <= g.r.right && Y >= g.r.top && Y <= g.r.bottom) sc += g.w;
          });
          P.x = X;
          P.y = Y;
          const q = P.matrixTransform(M);
          zones.forEach(z => {
            if (z.isPointInFill(q)) sc += 1;
          });
        }
      if (sc < low) {
        low = sc;
        best = [l, b];
      }
    });
  } catch (e) {}
  k.classList.toggle('tk-left', best[0]);
  k.classList.toggle('tk-bottom', best[1]);
}

/* online: tell the opponent which regiment's threat you are looking at, and what is ticked */
function threatShare() {
  if (typeof PVP !== 'function' || !PVP() || !db || !seatSide()) return;
  const id = threatIds()[0] || '',
    on = id ? thrKeys(id) : [],
    k = id + '|' + threatMode + '|' + on.join(',');
  if (k === thrSent) return;
  thrSent = k;
  clearTimeout(thrSendT);
  thrSendT = setTimeout(() => {
    db.doc('game/threat')
      .set({ by: HU, id, mode: id ? threatMode : '', on, at: Date.now() })
      .catch(() => {});
  }, 150);
}

function onThreat(d) {
  if (!d || d.by === HU) return;
  const v = d.id && d.mode && byId(d.id) ? { id: d.id, mode: d.mode, on: d.on || [] } : null;
  if (JSON.stringify(v) === JSON.stringify(rThreat)) return;
  rThreat = v;
  redrawThreat();
}

const THR_NEXT = { '': 'charge', charge: 'volley', volley: '' };

function cycleThreat(to) {
  threatMode = to != null ? to : THR_NEXT[threatMode];
  const b = $('threat-btn');
  if (b) {
    b.setAttribute('aria-pressed', String(!!threatMode));
    /* the label keeps its width so the toolbar never re-wraps; the mode shows in the tooltip and the key */
    b.dataset.mode = threatMode;
    b.title =
      (threatMode ? 'Showing ' + threatMode + ' threat. ' : '') +
      'Threat ranges (T): Charge threat, then Volley threat, then off. Point at a regiment or select one.';
  }
  redrawThreat();
  toast(
    threatMode === 'charge'
      ? 'Charge threat: point at a regiment, or select one (T for Volley threat).'
      : threatMode === 'volley'
        ? 'Volley threat (T to turn off).'
        : 'Threat ranges off.'
  );
}

$('threat-btn').onclick = () => cycleThreat();

document.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const tg = ev.target;
  if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable) return;
  if (mmCurrent()) return;
  if (ev.key === 't' || ev.key === 'T') {
    ev.preventDefault();
    cycleThreat();
  }
});

/* Shift+click a regiment while threat ranges are on: keep its threat shown (works while your own regiment moves) */
$('board').addEventListener(
  'pointerdown',
  ev => {
    if (!threatMode || !ev.shiftKey) return;
    let u = null;
    try {
      const p = svgPt(ev),
        q = [ix(p.x), iy(p.y)];
      u = (state ? state.units : []).find(x => x.onTable && !x.destroyed && ptInPolyG(q, corners(x)));
    } catch (e) {}
    if (!u || (act && act.id === u.id)) return;
    ev.preventDefault();
    ev.stopPropagation();
    thrPin(u.id);
  },
  true
);

/* the regiment under the pointer (shared with the arcs viewer) */
$('board').addEventListener('pointermove', ev => {
  if (!threatMode || arcsOn) return; /* the arcs viewer already tracks it and redraws both */
  let id = null;
  try {
    const p = svgPt(ev),
      q = [ix(p.x), iy(p.y)];
    const u = (state ? state.units : []).find(u => u.onTable && !u.destroyed && ptInPolyG(q, corners(u)));
    id = u ? u.id : null;
  } catch (e) {}
  if (id !== arcHover) {
    arcHover = id;
    redrawThreat();
  }
});

$('board').addEventListener('pointerleave', () => {
  if (threatMode && arcHover) {
    arcHover = null;
    redrawThreat();
  }
});
