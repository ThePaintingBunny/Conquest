/* Threat ranges: how far a regiment can reach this round, in layers.
   T (or the Threat tool) cycles Charge threat → Volley threat → off. Like the arcs, it shows the regiment under the
   pointer and the selected regiment; online, the opponent sees it too. Distances are measured from the front edge
   over the front arc (the Volley arc for Volleys); "March, then …" assumes a straight March forward.
   Layers (Charge): no roll needed · with a Charge Roll of 6 · + faction boosts that could still be used ·
   March then Charge · March then Charge with every boost.
   Layers (Volley): effective range · full range · + boosts · March then Volley · with every boost. */

let threatMode = '' /* '' | 'charge' | 'volley' */,
  rThreat = null /* online: {id, mode} the opponent is looking at */,
  thrSent = '',
  thrSendT = 0;

/* ---------- boosts the regiment does not have yet but its army could give it ---------- */
function friendSpells(u) {
  const out = new Set();
  all()
    .filter(x => x.side === u.side && x.onTable && !x.destroyed)
    .forEach(x => {
      [false, true].forEach(ch => {
        try {
          (spellsOf(x, ch) || []).forEach(s => out.add(s.name));
        } catch (e) {}
      });
    });
  return out;
}
function threatBoosts(u) {
  const B = { charge: [], march: [], range: [] },
    add = (k, n, src) => n > 0 && B[k].push({ n, src }),
    F = fx(u),
    has = re => F.some(x => re.test(x)),
    side = u.side,
    sup = typeof supK === 'function' ? supK(side) : '',
    roles = typeof supRoles === 'function' ? supRoles(u) : [],
    base = typeof frBase === 'function' ? frBase(u) : u.name,
    sp = friendSpells(u),
    fixed = chargeFixed(u) != null;
  /* Charge distance */
  if (!fixed) {
    if (rh(u.rules, 'Hubris')) add('charge', 3, 'Hubris (against monsters)');
    if (rh(u.rules, 'Arrogance')) add('charge', 3, 'Arrogance (against monsters and characters)');
    if (armyHas(side, /Prophecy Unfulfilled/))
      add('charge', 2, 'Prophecy Unfulfilled (against an engaged enemy)');
    if (rh(u.rules, 'Shattered Perfection') && !has(/Shattered Perfection/))
      add('charge', 2, 'Shattered Perfection (once below starting strength)');
    const chants = (u.rules || []).concat(typeof cR === 'function' ? cR(u) : []).map(String);
    if (chants.some(r => /Proven Warriors/.test(r)) && !has(/Proven Warriors/))
      add('charge', 2, 'Chant: Proven Warriors');
    if (sup === 'Lead by Example' && !has(/Lead by Example/)) add('charge', 2, 'Lead by Example (Supremacy)');
    if (sup === 'Obdurate Bone and Stone' && roles.includes('The Legion') && !has(/Obdurate Bone/))
      add('charge', odTier(side, 'dark') || 1, 'Obdurate Bone and Stone (Supremacy)');
    if (all().some(e => e.side !== side && fx(e).some(x => /^Marked \(Designate Target\)/.test(x))))
      add('charge', 2, 'Designate Target (against the Marked regiment)');
  } else if (sp.has('Clockwork Parade') && chargeFixed(u) < 5)
    add('charge', 5 - chargeFixed(u), 'Clockwork Parade (spell)');
  /* March distance */
  if (srHas(u, /^Divine Purpose/) && !(act && act.id === u.id && act.dpUsed))
    add('march', 2, 'Divine Purpose (first March or Charge)');
  if (sup === 'Ruthless Competence' && /Infantry/.test(u.cls || '') && !has(/Ruthless Competence/))
    add('march', 1, 'Ruthless Competence (after a Strain Expression)');
  if (
    sp.has('Translocation') &&
    spellsOf(u, false)
      .concat(spellsOf(u, true))
      .some(s => s.name === 'Translocation')
  )
    add('march', 8, 'Translocation (free 8″ March, spell)');
  if (sp.has('Air Step') && frRoles(u).includes('Court of Air'))
    add('march', 2, 'Air Step (free 2″ March, spell)');
  /* Dweghom: Forged by the Elements */
  const FG = typeof FORGED !== 'undefined' && FORGED[base];
  if (FG && !(act && act.id === u.id && act.frForged))
    FG.forEach(([t, cost, rules, stats, note]) => {
      if (stats && stats.M) add('march', stats.M, 'Forged: ' + t);
      if (/Charge/.test(note || '') && !fixed) add('charge', 2, 'Forged: ' + t);
      (rules || []).forEach(r => {
        const m = String(r).match(/^Barrage Range\s*\(\+(\d+)\)/);
        if (m) add('range', +m[1], 'Forged: ' + t);
      });
    });
  /* Momentum: up to +4″ Barrage range after a straight March */
  if ((u.rules || []).some(r => /Momentum/.test(r)) && !(act && act.momentum))
    add('range', 4, 'Chant: Momentum (after a forward March, up to +4″)');
  /* Divine Purpose works on one March or one Charge, so it is counted once in the "every boost" layer */
  return B;
}
const sumB = L => L.reduce((a, b) => a + b.n, 0);

/* ---------- shapes ---------- */
/* the front arc (or a wider firing arc) cut off R inches from the front edge; 180°+ becomes a rounded outline */
function fanPoly(u, R, spanDeg, fromBack) {
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    fe = G.d / 2,
    hw = G.w / 2,
    P = (fw, rr) => [u.x + f[0] * fw + r[0] * rr, u.y + f[1] * fw + r[1] * rr],
    o = [];
  if (spanDeg >= 180) {
    const back = fromBack ? -fe : fe - (G.sd || 0);
    [
      [fe, hw, 0],
      [back, hw, 1],
      [back, -hw, 2],
      [fe, -hw, 3]
    ].forEach(([x, y, q]) => {
      for (let k = 0; k <= 10; k++) {
        const an = ((q + k / 10) * Math.PI) / 2;
        o.push(P(x + R * Math.cos(an), y + R * Math.sin(an)));
      }
    });
    return o;
  }
  const sp = (spanDeg * Math.PI) / 180,
    n = Math.max(8, Math.round(spanDeg / 4));
  o.push(P(fe, -hw));
  for (let k = 0; k <= n; k++) {
    const an = -sp + (sp * k) / n;
    o.push(P(fe + R * Math.cos(an), -hw + R * Math.sin(an)));
  }
  for (let k = 0; k <= n; k++) {
    const an = (sp * k) / n;
    o.push(P(fe + R * Math.cos(an), hw + R * Math.sin(an)));
  }
  o.push(P(fe, hw));
  return o;
}

/* ---------- the layers ---------- */
const THR_STYLE = {
  sure: { fill: '#FFF6D8', fo: 0.36, stroke: '#FFF6D8', w: 2 },
  roll: { fill: '#F29A3A', fo: 0.3, stroke: '#FFB45C', w: 2, dash: '6 4' },
  eff: { fill: '#FFD66B', fo: 0.32, stroke: '#FFE39A', w: 2 },
  full: { fill: '#6FA8FF', fo: 0.2, stroke: '#9CC4FF', w: 2, dash: '6 4' },
  boost: { fill: '#B37BFF', fo: 0.14, stroke: '#C9A2FF', w: 2, dash: '3 3' },
  march: { fill: 'none', fo: 0, stroke: '#FF6B5C', w: 2, dash: '8 5' },
  all: { fill: 'none', fo: 0, stroke: '#C9A2FF', w: 1.6, dash: '2 4' }
};
function threatLayers(u, mode) {
  const B = threatBoosts(u),
    M = (+u.m || 0) + srMarchMod(u),
    Ls = [];
  const dp = B.march.find(b => /Divine Purpose/.test(b.src));
  if (mode === 'charge') {
    if (u.garrison)
      return {
        L: [],
        B,
        note: 'A garrisoned regiment Charges out of its building; its threat is measured from the building.'
      };
    const fix = chargeFixed(u),
      max = chargeMax(u),
      sure = fix != null ? max : +u.m || 0,
      cb = sumB(B.charge),
      mb = sumB(B.march.filter(b => b !== dp)) + (dp ? 2 : 0);
    Ls.push({
      k: 'sure',
      R: sure,
      t: fix != null ? 'Charge (fixed distance)' : 'Charge without a roll (March)'
    });
    if (max > sure + 1e-6) Ls.push({ k: 'roll', R: max, t: 'Charge on a roll of 6' });
    if (cb) Ls.push({ k: 'boost', R: max + cb, t: 'Charge with faction boosts' });
    Ls.push({ k: 'march', R: M + max, t: 'March, then Charge on a 6' });
    if (cb + mb) Ls.push({ k: 'all', R: M + mb + max + cb, t: 'March, then Charge, every boost' });
    return { L: Ls, B, span: 45, back: false };
  }
  const vr = volleyRange(u);
  if (!vr) return { L: [], B, note: 'This regiment has no Barrage, so it cannot Volley.' };
  const R = vr.range,
    long = rh(RU(u).concat(fx(u)), 'Longshot'),
    rb = sumB(B.range),
    mb = sumB(B.march);
  Ls.push({
    k: 'eff',
    R: long ? R : R / 2,
    t: long ? 'Volley, full range (Longshot: no long-range penalty)' : 'Volley, effective range (half)'
  });
  if (!long) Ls.push({ k: 'full', R, t: 'Volley, full Barrage range' });
  if (rb) Ls.push({ k: 'boost', R: R + rb, t: 'Volley with faction boosts' });
  Ls.push({ k: 'march', R: M + R, t: 'March, then Volley' });
  if (rb + mb) Ls.push({ k: 'all', R: M + mb + R + rb, t: 'March, then Volley, every boost' });
  return {
    L: Ls,
    B,
    span: volleyArcSpan(u),
    back: rh(RU(u), 'Fluid Formation') || !!u.garrison
  };
}
function drawThreat(u, mode, g, remote) {
  if (!u || !u.onTable || u.destroyed || !mode) return null;
  const T = threatLayers(u, mode),
    pts = q =>
      clipTable(q)
        .map(p => px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1))
        .join(' ');
  /* outermost first, so the inner layers sit on top */
  T.L.slice()
    .sort((a, b) => b.R - a.R)
    .forEach(l => {
      const S = THR_STYLE[l.k];
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

/* ---------- which regiment, the layer and the key ---------- */
function threatIds() {
  if (!threatMode) return [];
  const ids = [];
  if (arcHover && byId(arcHover)) ids.push(arcHover);
  if (selId && byId(selId) && !ids.includes(selId)) ids.push(selId);
  return ids.slice(0, 1);
}
function drawThreatLayer(g) {
  let shown = null;
  const id = threatIds()[0];
  if (id) shown = { u: byId(id), mode: threatMode, T: drawThreat(byId(id), threatMode, g, false) };
  else if (rThreat && rThreat.id && byId(rThreat.id))
    shown = {
      u: byId(rThreat.id),
      mode: rThreat.mode,
      T: drawThreat(byId(rThreat.id), rThreat.mode, g, true),
      remote: true
    };
  threatKey(shown);
  threatShare();
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
    k.setAttribute('aria-live', 'polite');
    const mb = document.querySelector('.mapbox');
    if (!mb) return;
    mb.appendChild(k);
  }
  if (!s && threatMode) {
    k.hidden = false;
    k.innerHTML =
      '<b>' +
      (threatMode === 'charge' ? 'Charge' : 'Volley') +
      ' threat</b><div class="tk-n">Point at a regiment, or select one. T: next view.</div>';
    return;
  }
  if (!s || !s.T) {
    k.hidden = true;
    return;
  }
  const nm = s.u.short || s.u.name,
    esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  let h =
    '<b>' +
    esc(nm) +
    ': ' +
    (s.mode === 'charge' ? 'Charge' : 'Volley') +
    ' threat</b>' +
    (s.remote ? '<div class="tk-n">' + esc(PN(s.u.side) || N(s.u.side)) + ' is looking at this.</div>' : '');
  if (s.T.note) h += '<div class="tk-n">' + esc(s.T.note) + '</div>';
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
      +l.R.toFixed(1) +
      '″</span></li>';
  });
  h += '</ul>';
  const B = s.T.B,
    list = (s.mode === 'charge' ? B.charge.concat(B.march) : B.range.concat(B.march)).map(
      b => '+' + b.n + '″ ' + esc(b.src)
    );
  if (list.length) h += '<div class="tk-b">Boosts counted: ' + list.join('; ') + '.</div>';
  else h += '<div class="tk-n">No faction boosts this regiment could still get.</div>';
  h +=
    '<div class="tk-n">From the front edge, over the ' +
    (s.mode === 'charge' ? 'front arc' : 'firing arc') +
    '; the March is taken straight ahead.</div>';
  k.hidden = false;
  k.innerHTML = h;
}

/* online: tell the opponent which regiment's threat you are looking at */
function threatShare() {
  if (typeof PVP !== 'function' || !PVP() || !db || !seatSide()) return;
  const id = threatIds()[0] || '',
    k = id + '|' + threatMode;
  if (k === thrSent) return;
  thrSent = k;
  clearTimeout(thrSendT);
  thrSendT = setTimeout(() => {
    db.doc('game/threat')
      .set({ by: HU, id, mode: id ? threatMode : '', at: Date.now() })
      .catch(() => {});
  }, 150);
}
function onThreat(d) {
  if (!d || d.by === HU) return;
  const v = d.id && d.mode && byId(d.id) ? { id: d.id, mode: d.mode } : null;
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
