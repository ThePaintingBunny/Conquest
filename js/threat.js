/* Threat ranges: how far a regiment can reach, drawn as two layers from its front edge.
   T (or the Threat tool) cycles Charge threat → Volley threat → off. It shows the regiment under the pointer, or the
   selected one; online, the opponent sees the same (including any boosts you have ticked).
   Charge view: Charge from where it stands (guaranteed solid, Charge Roll of 6 dashed) and March then Charge (outline).
   Volley view: Volley from where it stands (effective and full range) and March then Volley (outline).
   Everything in force counts as normal (permanent rules, items, officers, characters, effects granted this round).
   Everything still to be cast, used, rolled or triggered is listed in the key with the distance it reaches; for the
   selected regiment each one has a tick box that draws the lines as if it were on. */

let threatMode = '' /* '' | 'charge' | 'volley' */,
  rThreat = null /* online: {id, mode, on} the opponent is looking at */,
  thrSent = '',
  thrSendT = 0,
  thrOn = {} /* unit id -> array of ticked boost keys */,
  thrSelSeen = null,
  thrActSeen = null;

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
/* Two kinds of bonus:
   - normal: anything already in force (permanent rules, items, officers, characters, effects granted this round, a
     drawn card). It is part of the regiment's March or Charge, so it sits in the ordinary layers;
   - extra: anything that still has to be activated, cast, rolled or triggered (an unused Supremacy, a spell, a
     Biomancy or Strain ability, a chant, a target condition). It is not guaranteed, so it gets its own layer. */
function threatNormal(u) {
  const F = fx(u),
    n = { march: 0, charge: 0, src: [] };
  /* Divine Purpose granted this round: +2″ to the first March or the Charge (one of them) */
  if (srHas(u, /^Divine Purpose/) && !(act && act.id === u.id && act.dpUsed)) {
    n.dp = 2;
    n.src.push('Divine Purpose (+2″ first March or Charge)');
  }
  /* W'adrhun Ideal Card Fu in play: +2″ to the first March */
  if (F.some(x => /^Ideal Card: Fu \(/.test(x)) || (act && act.id === u.id && act.frFu)) {
    n.march += 2;
    n.src.push('Ideal Card Fu (+2″ first March)');
  }
  return n;
}
/* Each boost: { key, n, src, kind, grp }
   kind: charge (Charge distance) · march (the March characteristic: both moves) · free (a free move first) ·
         dp (Divine Purpose: +2″ to the first March or the Charge) · cp (Clockwork Parade: Charge = March +5″, no roll) ·
         range (Barrage range) · rangeM (Barrage range after a March)
   grp: boosts in the same group cannot be combined (one Forged option, one free March). */
function threatBoosts(u) {
  const L = [],
    add = (kind, n, src, grp) => L.push({ key: src, n, src, kind, grp: grp || '' }),
    F = fx(u),
    has = re => F.some(x => re.test(x)),
    side = u.side,
    sup = typeof supK === 'function' ? supK(side) : '',
    roles = typeof supRoles === 'function' ? supRoles(u) : [],
    base = typeof frBase === 'function' ? frBase(u) : u.name,
    sp = friendSpells(u),
    fixed = chargeFixed(u),
    friends = all().filter(x => x.side === side && x.onTable && !x.destroyed),
    ST = typeof STRAIN !== 'undefined' ? STRAIN[base] : null;
  /* Charge distance */
  if (fixed == null) {
    if (rh(u.rules, 'Hubris')) add('charge', 3, 'Hubris (if the target is a monster)');
    if (rh(u.rules, 'Arrogance')) add('charge', 3, 'Arrogance (if the target is a monster or character)');
    if (armyHas(side, /Prophecy Unfulfilled/))
      add('charge', 2, 'Prophecy Unfulfilled (if the target is engaged)');
    if (rh(u.rules, 'Shattered Perfection') && !has(/Shattered Perfection/))
      add('charge', 2, 'Shattered Perfection (once below starting strength)');
    const chants = (u.rules || []).concat(typeof cR === 'function' ? cR(u) : []).map(String);
    if (chants.some(r => /Proven Warriors/.test(r)) && !has(/Proven Warriors/))
      add('charge', 2, 'Chant: Proven Warriors');
    if (sup === 'Lead by Example' && !has(/Lead by Example/)) add('charge', 2, 'Lead by Example (Supremacy)');
    if (sup === 'Obdurate Bone and Stone' && roles.includes('The Legion') && !has(/Obdurate Bone/))
      add('charge', odTier(side, 'dark') || 1, 'Obdurate Bone and Stone (Supremacy)');
    if (all().some(e => e.side !== side && fx(e).some(x => /^Marked \(Designate Target\)/.test(x))))
      add('charge', 2, 'Designate Target (if the target is the Marked regiment)');
    if (ST && /\+2″ Charge/.test(ST[2] || '') && !has(/Strain/))
      add('charge', 2, 'Strain Expression: ' + ST[0]);
    if (sp.has('Clockwork Parade')) add('cp', 5, 'Clockwork Parade (spell): Charge = March +5″, no roll');
  } else if (sp.has('Clockwork Parade') && fixed < 5)
    add('charge', 5 - fixed, 'Clockwork Parade (spell): Charge = March +5″');
  /* March */
  if (
    !srHas(u, /^Divine Purpose/) &&
    rh(RU(u), 'Divine Purpose') &&
    friends.some(x => /Theist Priest/.test(x.charName || ''))
  )
    add('dp', 2, 'Divine Purpose (Theist Priest spell): +2″ first March or Charge');
  if (sup === 'Ruthless Competence' && /Infantry/.test(u.cls || '') && !has(/Ruthless Competence/))
    add('march', 1, 'Ruthless Competence (after a Strain Expression)');
  if (ST && !has(/Strain/)) {
    if (typeof fodder6 === 'function' && fodder6(u)) add('march', 1, 'Strain Expression (Optimized Fodder)');
    else if (sup === 'Induced Aggression' && /Drone|Clone|Monstros/i.test(u.name + ' ' + (u.cls || '')))
      add('march', 1, 'Induced Aggression: Strain swapped for +1 March');
  }
  if (u.type !== 'monster' && friends.some(x => chAbil(x).some(a => a.n === 'Unstable Enhancement')))
    add('march', 1, 'Unstable Enhancement (Biomancy, on a 1–2)');
  if (
    sp.has('Translocation') &&
    spellsOf(u, false)
      .concat(spellsOf(u, true))
      .some(s => s.name === 'Translocation')
  )
    add('free', 8, 'Translocation (spell): free 8″ March first', 'free');
  if (sp.has('Air Step') && frRoles(u).includes('Court of Air'))
    add('free', 2, 'Air Step (spell): free 2″ March first', 'free');
  /* Dweghom: Forged by the Elements (one option per activation) */
  const FG = typeof FORGED !== 'undefined' && FORGED[base];
  if (FG && !(act && act.id === u.id && act.frForged))
    FG.forEach(([t, cost, rules, stats, note]) => {
      if (stats && stats.M) add('march', stats.M, 'Forged: ' + t, 'forged');
      if (/Charge/.test(note || '') && fixed == null) add('charge', 2, 'Forged: ' + t, 'forged');
      (rules || []).forEach(r => {
        const m = String(r).match(/^Barrage Range\s*\(\+(\d+)\)/);
        if (m) add('range', +m[1], 'Forged: ' + t, 'forged');
      });
    });
  if ((u.rules || []).some(r => /Momentum/.test(r)) && !(act && act.momentum))
    add('rangeM', 4, 'Chant: Momentum (after a forward March, up to +4″ range)');
  return L;
}
/* which boosts matter in a view */
function thrRelevant(b, mode) {
  return mode === 'charge'
    ? ['charge', 'march', 'free', 'dp', 'cp'].includes(b.kind)
    : ['range', 'rangeM', 'march', 'free', 'dp'].includes(b.kind);
}

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
  sure: { fill: '#FFF6D8', fo: 0.38, stroke: '#FFF6D8', w: 2 },
  roll: { fill: '#F29A3A', fo: 0.3, stroke: '#FFB45C', w: 2, dash: '6 4' },
  msure: { fill: 'none', fo: 0, stroke: '#FF6B5C', w: 2.2 },
  mroll: { fill: 'none', fo: 0, stroke: '#FF6B5C', w: 2, dash: '7 5' },
  eff: { fill: '#FFD66B', fo: 0.32, stroke: '#FFE39A', w: 2 },
  full: { fill: '#6FA8FF', fo: 0.2, stroke: '#9CC4FF', w: 2, dash: '6 4' },
  mfull: { fill: 'none', fo: 0, stroke: '#FF6B5C', w: 2, dash: '7 5' }
};
/* can it March and then act this round? */
function thrMarchFirst(u, why) {
  if (engaged(u).length) return why ? 'Engaged: it cannot March away first.' : false;
  if (act && act.id === u.id && act.actions.filter(a => !a.free).length >= 1)
    return why ? 'It has one action left this activation, so no March first.' : false;
  return why ? '' : true;
}
/* the distances with a set of ticked boosts */
function threatLayers(u, mode, onKeys) {
  const all0 = threatBoosts(u),
    NB = threatNormal(u),
    on = all0.filter(b => (onKeys || []).includes(b.key) && thrRelevant(b, mode)),
    S = k => on.filter(b => b.kind === k).reduce((a, b) => a + b.n, 0),
    M = (+u.m || 0) + srMarchMod(u),
    Ls = [],
    notes = [],
    broken = (u.effects || []).includes('Broken'),
    eng = engaged(u).length > 0,
    canMF = thrMarchFirst(u),
    mfWhy = thrMarchFirst(u, true);
  if (u.activated && !(act && act.id === u.id))
    notes.push('Already activated this round: this is its reach next round.');
  const mOn = S('march'),
    fOn = S('free'),
    dpOn = NB.dp || (S('dp') ? 2 : 0);
  if (mode === 'charge') {
    if (u.garrison) notes.push('Garrisoned: it Charges out of its building, measured from the building.');
    if (broken)
      return { L: [], all: all0, NB, notes: notes.concat('Broken: it cannot Charge until it Rallies.') };
    if (eng) return { L: [], all: all0, NB, notes: notes.concat('Engaged: it cannot Charge.') };
    const fixed = chargeFixed(u),
      selfDp = fixed == null && act && act.id === u.id && srHas(u, /^Divine Purpose/) && !act.dpUsed ? 2 : 0,
      base = chargeMax(u) - selfDp /* March + 6 + Charge bonuses in force, without Divine Purpose */,
      cp = S('cp') > 0;
    let sure, roll;
    if (fixed != null) {
      sure = base + mOn + S('charge') + fOn;
      roll = null;
    } else if (cp) {
      sure = M + mOn + 5 + fOn;
      roll = null;
    } else {
      sure = base - 6 + mOn + S('charge') + fOn + dpOn;
      roll = sure + 6;
    }
    /* Divine Purpose on a fixed Charge goes on the March instead */
    const dpMarch = (fixed != null || cp) && dpOn ? dpOn : 0,
      first = M + mOn + NB.march + dpMarch;
    Ls.push({
      k: 'sure',
      R: sure,
      t:
        fixed != null
          ? 'Charge (fixed distance)'
          : cp
            ? 'Charge (Clockwork Parade, no roll)'
            : 'Charge, guaranteed (no roll)'
    });
    if (roll != null) Ls.push({ k: 'roll', R: roll, t: 'Charge on a roll of 6' });
    if (canMF) {
      Ls.push({ k: 'msure', R: first + sure, t: 'March, then Charge' + (roll != null ? ' (no roll)' : '') });
      if (roll != null) Ls.push({ k: 'mroll', R: first + roll, t: 'March, then Charge on a 6' });
    } else notes.push(mfWhy);
    return { L: Ls, all: all0, NB, notes, span: 45, back: false, head: roll != null ? roll : sure };
  }
  const vr = volleyRange(u);
  if (!vr) return { L: [], all: all0, NB, notes: notes.concat('No Barrage: it cannot Volley.') };
  const R = vr.range + S('range'),
    long = rh(RU(u).concat(fx(u)), 'Longshot'),
    first = M + mOn + NB.march + dpOn;
  if (!long) Ls.push({ k: 'eff', R: R / 2 + fOn, t: 'Volley, effective range (half)' });
  Ls.push({ k: 'full', R: R + fOn, t: long ? 'Volley, full range (Longshot)' : 'Volley, full range' });
  if (canMF) Ls.push({ k: 'mfull', R: first + R + S('rangeM') + fOn, t: 'March, then Volley' });
  else notes.push(mfWhy);
  return {
    L: Ls,
    all: all0,
    NB,
    notes,
    span: volleyArcSpan(u),
    back: rh(RU(u), 'Fluid Formation') || !!u.garrison,
    head: R + fOn
  };
}
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
  /* ticks reset when the selection or the activating regiment changes */
  const aid = act ? act.id : null;
  if (selId !== thrSelSeen || aid !== thrActSeen) {
    thrOn = {};
    thrSelSeen = selId;
    thrActSeen = aid;
  }
  let shown = null;
  const id = threatIds()[0];
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
    k.addEventListener('change', ev => {
      const t = ev.target;
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
      ' threat</b><div class="tk-n">Point at a regiment, or select one to try its boosts. T: next view.</div>';
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
  h +=
    '<div class="tk-n">From the front edge, over the ' +
    (s.mode === 'charge' ? 'front' : 'firing') +
    ' arc. The March is taken straight ahead; wheeling turns the arc.</div>';
  /* keep the scroll position while ticking */
  const sc = k.querySelector('.tk-list') ? k.querySelector('.tk-list').scrollTop : 0;
  k.hidden = false;
  k.innerHTML = h;
  if (k.querySelector('.tk-list')) k.querySelector('.tk-list').scrollTop = sc;
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
