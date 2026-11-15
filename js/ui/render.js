/*
 * The main render
 *
 * render() redraws the board and every panel from the current state. It is called after every change.
 *
 * In this file: fitBoard(), revealIn(), render(), render0()
 */

/* Fit the board to the screen: as tall as the space below the top bars allows (on wide screens only).
   When the bars above are very tall (tools opened), the board keeps a usable size and the page scrolls instead. */
/* on wide screens the game fits the window: the map is as large as the height allows, and when that makes it
   narrower than its column the whole page narrows with it, so the map, the side panel, the top row and the tools
   stay together instead of leaving gaps */
function fitBoard() {
  const b = $('board'),
    box = b && b.closest('.mapbox'),
    wrap = document.querySelector('.wrap');
  if (!b || !box || !wrap) return;
  b.style.maxHeight = '';
  b.style.width = '';
  box.style.width = '';
  wrap.style.maxWidth = '';
  const tools = $('tools');
  if (tools) tools.style.width = '';
  if (innerWidth <= 900 || box.offsetParent === null || !document.body.classList.contains('tb-top')) return;
  const vb = b.viewBox && b.viewBox.baseVal,
    ar = vb && vb.height ? vb.width / vb.height : 1.49;
  const below = tools && tools.offsetParent !== null ? tools.offsetHeight + 12 : 0,
    top = box.getBoundingClientRect().top + scrollY,
    H = Math.max(300, Math.floor(innerHeight - top - below - 20)),
    W = box.getBoundingClientRect().width;
  b.style.maxHeight = H + 'px';
  const extra = Math.floor(W - H * ar);
  if (extra > 2) wrap.style.maxWidth = Math.floor(wrap.getBoundingClientRect().width - extra) + 'px';
}

addEventListener('resize', () => requestAnimationFrame(fitBoard));

/* Bring something into view. Inside the side column (wide screens) only the column scrolls, never the page. */
function revealIn(el, block) {
  if (!el) return;
  const rc = el.closest && el.closest('.rcol');
  if (rc && innerWidth > 900) {
    const top = el.getBoundingClientRect().top - rc.getBoundingClientRect().top + rc.scrollTop - 6;
    rc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  } else el.scrollIntoView({ behavior: 'smooth', block: block || 'nearest' });
}

/* Keep the board where it is on screen: when a redraw changes what sits above it (the test field's Conditions panel
   for the selected regiment, a banner, the turn bar), scroll by the same amount so the map does not jump away. */
function render() {
  const b = $('board'),
    r0 = b && b.getBoundingClientRect(),
    seen = r0 && r0.bottom > 0 && r0.top < innerHeight;
  render0();
  try {
    renderChain();
  } catch (e) {}
  try {
    renderActionBar();
  } catch (e) {}
  if (!seen) return;
  const d = b.getBoundingClientRect().top - r0.top;
  if (Math.abs(d) > 1) scrollBy({ top: d, behavior: 'instant' });
}

function render0() {
  requestAnimationFrame(fitBoard);
  if (!state) return;
  applyColors();
  bldUse(SBX() ? 'test' : 'main');
  if (SBX()) {
    state.strategicHeld = true;
  }
  {
    const su = state.step === 'setup';
    ['.main', '.roster', '#view-hint', '#last', '.score'].forEach(q => {
      const e = document.querySelector(q);
      if (e) e.hidden = su;
    });
  }
  drawTerrain();
  drawZones();
  $('phase').textContent = state.phase || '';
  {
    const r = $('vp-round');
    if (r)
      r.textContent = SBX()
        ? 'Test field'
        : state.round
          ? 'Round ' + state.round + (state.maxRounds ? ' of ' + state.maxRounds : '')
          : '';
  }
  $('vp-cs').textContent = (PN('cs') ? PN('cs') + ' · ' : '') + N('cs') + ' ' + (state.vp?.cs ?? 0);
  $('vp-nord').textContent = (PN('nord') ? PN('nord') + ' · ' : '') + N('nord') + ' ' + (state.vp?.nord ?? 0);
  $('h-cs').textContent = WHO('cs');
  $('h-nord').textContent = WHO('nord');
  $('combat').classList.toggle('busy', aiBusy);
  const ug = $('units'),
    mg = $('moves'),
    rg = $('rings');
  ug.innerHTML = '';
  mg.innerHTML = '';
  rg.innerHTML = '';
  (state.moves || []).forEach(m => {
    const p = m.path || [];
    if (p.length < 2) return;
    el(
      'polyline',
      {
        points: p.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
        fill: 'none',
        stroke: '#F3E6C4',
        'stroke-width': 2,
        'stroke-dasharray': '5 4',
        'marker-end': 'url(#ah)',
        opacity: 0.75
      },
      mg
    );
  });
  if (act && act.cur && act.cur.moving) {
    const c = act.cur;
    el(
      'circle',
      {
        cx: px(c.start.x),
        cy: py(c.start.y),
        r: c.budget * S,
        fill: '#F3E6C4',
        'fill-opacity': 0.08,
        stroke: '#F3E6C4',
        'stroke-width': 1,
        'stroke-dasharray': '3 4'
      },
      rg
    );
    el(
      'line',
      {
        x1: px(c.start.x),
        y1: py(c.start.y),
        x2: px(act.pose.x),
        y2: py(act.pose.y),
        stroke: '#E8C65A',
        'stroke-width': 1.6,
        'stroke-dasharray': '4 3'
      },
      rg
    );
  }
  try {
    drawThreatLayer(el('g', { id: 'thrg', 'pointer-events': 'none' }, rg));
    drawArcsLayer(el('g', { id: 'arcg', 'pointer-events': 'none' }, rg));
    drawSpellZone(el('g', { id: 'spellg', 'pointer-events': 'none' }, rg));
    const lg = el('g', { id: 'liveg', 'pointer-events': 'none' }, rg);
    drawRemoteOverlay(lg);
    drawActiveRing(lg);
  } catch (e) {
    console.error(e);
  }
  if (act && act.cur && act.cur.type === 'volley' && act.cur.stage === 'target') {
    try {
      drawVolleyZones(byId(act.id), rg);
    } catch (e) {
      console.error(e);
    }
  }
  if (
    act &&
    act.cur &&
    act.cur.type === 'charge' &&
    (act.cur.stage === 'target' || act.cur.stage === 'roll')
  ) {
    try {
      drawChargeZones(byId(act.id), rg);
    } catch (e) {
      console.error(e);
    }
  }
  if (act && act.actions.length) {
    const pts = [[act.actions[0].from.x, act.actions[0].from.y]].concat(
      act.actions.map(a => [a.to.x, a.to.y])
    );
    el(
      'polyline',
      {
        points: pts.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
        fill: 'none',
        stroke: '#E8C65A',
        'stroke-width': 1.6,
        'stroke-dasharray': '4 3'
      },
      rg
    );
  }
  all()
    .filter(u => u.onTable)
    .forEach(u => drawUnit(u, ug));
  try {
    drawActivationMarkers(ug);
  } catch (e) {
    console.error(e);
  }
  setTimeout(() => {
    try {
      marchGhost();
    } catch (e) {}
  }, 0);
  if (act && act.cur && act.cur.type === 'charge' && act.cur.stage === 'target') {
    try {
      drawChargeNeeds(byId(act.id), ug);
    } catch (e) {
      console.error(e);
    }
  }
  if (cb && cb.split === 'plan') {
    try {
      drawSplit(el('g', { id: 'splitg', 'pointer-events': 'none' }, ug));
    } catch (e) {
      console.error(e);
    }
  }
  if (act && act.cur && act.cur.type === 'charge' && act.cur.stage === 'place') {
    try {
      drawChargeGhost(el('g', { id: 'cghost' }, ug));
    } catch (e) {
      console.error(e);
    }
  }
  /* moving a regiment closer than 1″ to an enemy: red outline */
  if (act && act.cur && act.cur.start && MOVE1.includes(act.cur.type)) {
    try {
      const e = near1(act.cur);
      if (e) {
        const gg = el('g', { 'pointer-events': 'none' }, rg);
        standsOf(byId(act.id)).forEach(s2 =>
          el(
            'polygon',
            {
              points: s2.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
              fill: 'none',
              stroke: '#E57373',
              'stroke-width': 2
            },
            gg
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (act && act.cur && act.cur.type === 'volley' && act.cur.stage === 'target') {
    try {
      drawVolleyNeeds(byId(act.id), ug);
      const ts = act.cur.sel && byId(act.cur.sel);
      if (ts) {
        drawVolleyLines(byId(act.id), ts, rg, arcingOn(byId(act.id)));
        const gs = ug.querySelector('g[data-id="' + ts.id + '"]');
        if (gs) gs.classList.add('vsel');
      }
    } catch (e) {
      console.error(e);
    }
  }
  $('last').innerHTML = '';
  const b = document.createElement('b');
  b.textContent = (state.lastTitle || 'Last move') + ': ';
  $('last').append(b, document.createTextNode(state.lastText || 'No moves yet.'));
  /* one line above the board; a click shows the whole message */
  if (!$('last').onclick) $('last').onclick = () => $('last').classList.toggle('open');
  renderArmies();
  renderCard();
  try {
    cardStrength();
    cbStepper();
  } catch (e) {}
  try {
    renderFacBox();
    renderFrStrip();
    renderOdTrk();
  } catch (err) {
    console.error(err);
  }
  try {
    renderMenu();
    renderPresence();
    presencePing();
  } catch (err) {
    console.error(err);
  }
  renderFormation();
  renderCharPanel();
  drawRuler();
  renderTurnbar();
  renderLegend();
  pushLive();
  const held = !!PS().strategicHeld,
    used = PS().strategicUsedRound === state.round,
    notMine = PVP() && (state.turn !== HU || !seatSide());
  {
    const ss = $('strat-btn').closest('.sec');
    if (ss) ss.hidden = SBX() || !canStrat(ME);
  }
  $('strat-read').textContent = held ? '1 card held, face down' : 'Empty';
  $('strat-btn').disabled = held || used || !!act || notMine;
  $('strat-btn').title = held
    ? 'A card is already held'
    : used
      ? 'Already used this round'
      : act
        ? 'Finish the current activation first'
        : '';
}
