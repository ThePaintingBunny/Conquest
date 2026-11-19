/*
 * Regiment card
 *
 * The card of the selected regiment: profile, rules, wounds, status and the activation panel. One long
 * function, renderCard, draws all of it.
 *
 * In this file: regPane, regPaneSync(), regPaneCounts(), renderCard(), drawNudged, drawStepMark()
 */

let regPane = (() => {
  try {
    return localStorage.getItem('regPane') || 'prof';
  } catch (e) {
    return 'prof';
  }
})();

function regPaneSync(u) {
  const tabs = $('c-subtabs');
  if (!tabs) return;
  if (!tabs.dataset.wired) {
    tabs.dataset.wired = '1';
    tabs.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => {
        regPane = b.dataset.p;
        try {
          localStorage.setItem('regPane', regPane);
        } catch (e) {}
        regPaneSync(selId ? byId(selId) : null);
      })
    );
  }
  tabs
    .querySelectorAll('button')
    .forEach(b => b.setAttribute('aria-selected', String(b.dataset.p === regPane)));
  document.querySelectorAll('#card .rpane').forEach(p => (p.hidden = !u || p.dataset.p !== regPane));
}

function regPaneCounts(u, nR, nA) {
  const tabs = $('c-subtabs');
  tabs.querySelectorAll('button').forEach(b => {
    const base = { prof: 'Profile', rules: 'Rules', abil: 'Abilities' }[b.dataset.p];
    const n = b.dataset.p === 'rules' ? nR : b.dataset.p === 'abil' ? nA : 0;
    b.textContent = base;
    if (n) {
      const s2 = document.createElement('span');
      s2.className = 'n';
      s2.textContent = n;
      b.appendChild(s2);
    }
    if (b.dataset.p === 'abil') b.hidden = !nA;
  });
  if (regPane === 'abil' && !nA) {
    regPane = 'prof';
    regPaneSync(u);
  }
}

function renderCard() {
  const u = selId ? byId(selId) : null;
  chipFac = u ? facOf(N(u.side)) : null;
  $('card').classList.toggle('activating', !!(act && u && act.id === u.id));
  $('card').style.setProperty('--side', u && COL[u.side] ? COL[u.side].fill : 'var(--trim)');
  $('c-roll-sec').hidden = !(u && u.onTable) || !!cb || !!(act && act.id === (u && u.id));
  ['c-stats', 'c-fx-sec', 'c-rules-sec', 'c-abil-sec', 'c-act-sec', 'c-subtabs', 'c-badges'].forEach(
    i => ($(i).hidden = !u)
  );
  $('c-subs').innerHTML = '';
  regPaneSync(u);
  if (!u) {
    $('c-name').textContent = 'Choose a regiment';
    $('c-meta').textContent = 'Click a regiment on the table or in the rosters below.';
    return;
  }
  $('c-name').textContent = u.name + (u.charName ? ' + ' + u.charName : '');
  $('c-meta').textContent = [
    N(u.side),
    u.cls,
    u.type !== 'marker' ? 'Size ' + uSize(u) + (baseSize(u).why ? ' (' + baseSize(u).why + ')' : '') : '',
    u.stands + (u.stands === 1 ? ' stand' : ' stands')
  ]
    .filter(Boolean)
    .join(' · ');
  {
    const bx = $('c-badges');
    bx.innerHTML = '';
    const bd = (t, c, ti) => {
      const e = document.createElement('span');
      e.className = 'rbadge' + (c ? ' ' + c : '');
      e.textContent = t;
      if (ti) e.title = ti;
      bx.appendChild(e);
    };
    if (u.destroyed) bd('Destroyed', 'bad');
    else if (!u.onTable) bd(u.arriving ? 'Arriving this round' : 'In reinforcements', 'info');
    if ((u.effects || []).includes('Broken')) bd('Broken', 'bad');
    if (u.onTable && !u.destroyed && u.type !== 'marker') {
      if (act && act.id === u.id) bd('Activating now', 'warn');
      else if (u.activated) bd('Activated', '');
      else bd('Not yet activated', 'ok');
    }
    if (u.charName && u.onTable && !u.destroyed)
      bd(u.charName + (u.charActivated ? ' activated' : ' not yet activated'), u.charActivated ? '' : 'ok');
    if (u.wounds || lostOf(u))
      bd(
        u.wounds +
          ' wound' +
          (u.wounds === 1 ? '' : 's') +
          (lostOf(u) ? ' · ' + lostOf(u) + ' stand' + (lostOf(u) === 1 ? '' : 's') + ' lost' : ''),
        'warn'
      );
    {
      const eg = engaged(u);
      if (eg.length) bd('Engaged: ' + eg.map(e => e.short || e.name).join(', '), 'bad');
    }
    bx.hidden = !bx.children.length;
  }
  const st = $('c-stats');
  st.innerHTML = '';
  const S0 = u.stats || {};
  ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].forEach(k => {
    const k1 = document.createElement('div');
    k1.className = 'k';
    k1.textContent = k;
    st.appendChild(k1);
  });
  {
    const B = baseStats(u),
      E = u.type === 'marker' ? S0 : effStats(u);
    ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].forEach(k => {
      const v = document.createElement('div');
      v.className = 'v';
      const b = B[k],
        e = E[k];
      const num = x => typeof x === 'number' || (x != null && x !== '' && !isNaN(+x));
      v.textContent = e ?? '–';
      if (num(b) && num(e) && +e !== +b) {
        v.classList.add('mod');
        const up = +e > +b;
        const m = document.createElement('sup');
        m.textContent = up ? '▲' : '▼';
        m.className = up ? 'up' : 'down';
        v.appendChild(m);
        v.title = 'Base ' + b + ' · now ' + e + (E._why && E._why[k] ? ' (' + E._why[k] + ')' : '');
      } else if (E._why && E._why[k]) {
        v.title = E._why[k];
      }
      st.appendChild(v);
    });
  }
  const subRow = (role, name, wtxt, tags, S, rules, B, why) => {
    const blk = document.createElement('div');
    blk.className = 'rblk';
    const h = document.createElement('div');
    h.className = 'rblk-h';
    const r0 = document.createElement('span');
    r0.className = 'role';
    r0.textContent = role;
    const nm = document.createElement('b');
    nm.textContent = name;
    h.append(r0, nm);
    if (wtxt) {
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = wtxt;
      h.appendChild(w);
    }
    blk.appendChild(h);
    if (tags && tags.length) {
      const tg = document.createElement('div');
      tg.className = 'tags';
      tags.forEach(t => {
        const e = document.createElement('span');
        e.className = 'tag';
        e.textContent = t;
        tg.appendChild(e);
      });
      blk.appendChild(tg);
    }
    const g = document.createElement('div');
    g.className = 'stats';
    ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].forEach(k => {
      const k1 = document.createElement('div');
      k1.className = 'k';
      k1.textContent = k;
      g.appendChild(k1);
    });
    ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].forEach(k => {
      const v = document.createElement('div');
      v.className = 'v';
      const e = (S || {})[k],
        b = B ? B[k] : e;
      v.textContent = e ?? '–';
      if (B && e != null && b != null && String(e) !== String(b) && !isNaN(+e) && !isNaN(+b)) {
        v.classList.add('mod');
        const up = +e > +b;
        const sp = document.createElement('sup');
        sp.textContent = up ? '▲' : '▼';
        sp.className = up ? 'up' : 'down';
        v.appendChild(sp);
        v.title = 'Base ' + b + ' → now ' + e + (why && why[k] ? ' (' + why[k] + ')' : '');
      }
      g.appendChild(v);
    });
    blk.appendChild(g);
    if (rules && rules.length) {
      const r = document.createElement('div');
      r.className = 'chips';
      rules.forEach(x => r.appendChild(chip(x)));
      blk.appendChild(r);
    }
    $('c-subs').appendChild(blk);
  };
  if (u.charName) {
    const CX = chStatsX(u),
      why = {};
    itemSpec(u).forEach(([n, S]) => {
      const d = typeof S.cs === 'function' ? S.cs(u) : S.cs;
      if (d)
        Object.entries(d).forEach(([k, v]) => {
          if (v) why[k] = (why[k] ? why[k] + ', ' : '') + n + ' ' + (v > 0 ? '+' : '') + v;
        });
    });
    const CR = chRulesX(u).concat(itemDuelRules(u).map(x => x + ' (in Duels)'));
    subRow(
      'Character' + (u.warlord ? ' · ★ Warlord' : ''),
      u.charName,
      Math.max(0, (+CX.W || 0) - (+u.charWounds || 0)) +
        '/' +
        (CX.W ?? '?') +
        ' wounds left' +
        (u.charActivated ? ' · activated' : ''),
      itemsOf(u),
      CX,
      CR,
      u.charStats || {},
      why
    );
  }
  if (Array.isArray(u.mods) && u.modProfiles) {
    const liveT = u.mods.filter((t, i) => !removalSeq(u).slice(0, lostOf(u)).includes(i));
    [...new Set(u.mods)].forEach(t => {
      const m = u.modProfiles[t];
      if (!m) return;
      const n = liveT.filter(x => x === t).length,
        tot = u.mods.filter(x => x === t).length;
      subRow(
        t === (u.suiCmd || u.mods[0]) ? 'Stands · Command' : 'Stands',
        t,
        n + ' of ' + tot + ' stand' + (tot === 1 ? '' : 's') + ' left',
        [],
        Object.assign({}, u.stats, { V: m.V, C: m.C, A: m.A, W: m.W }),
        m.rules || []
      );
    });
  }
  if (u.aux != null && u.auxStats)
    subRow(
      'Auxiliary',
      u.auxName || 'Auxiliary',
      auxDead(u) ? 'destroyed' : u.auxWounds ? u.auxWounds + ' wounds taken' : '',
      [],
      u.auxStats,
      u.auxRules || []
    );
  const fxs = fx(u),
    eng = engaged(u);
  const fb = $('c-fx');
  fb.innerHTML = '';
  fxs.forEach(x => fb.appendChild(chip(x, 'fx')));
  $('c-fx-sec').hidden = !fb.children.length;
  const rb = $('c-rules');
  rb.innerHTML = '';
  const BR = baseRules(u);
  BR.forEach(x => rb.appendChild(chip(x)));
  effRules(u, BR).forEach(([t, base]) => {
    const c = chip(t, 'mod');
    c.title = base ? 'Base ' + base + ' · changed this round' : 'Gained this round';
    const m = document.createElement('sup');
    m.textContent = '▲';
    m.className = 'up';
    c.appendChild(m);
    rb.appendChild(c);
  });
  if (Array.isArray(u.mods) && u.modProfiles)
    [...new Set(u.mods)].forEach(t => {
      const m = u.modProfiles[t];
      if (!m || !(m.rules || []).length) return;
      const h = bEl('span', { className: 'hint', textContent: t + ' stands:' });
      h.style.cssText = 'flex-basis:100%;margin:6px 0 0';
      rb.appendChild(h);
      m.rules.forEach(x => rb.appendChild(chip(x)));
    });
  if (!rb.children.length) rb.appendChild(chip('None'));
  const ab = $('c-abil');
  ab.innerHTML = '';
  const G = { draw: [], abil: [], upg: [] };
  (u.abilities || []).forEach(([n, t]) => {
    const nm = String(n);
    if (u.charName && nm === u.charName) return;
    const base = nm
      .replace(/\s*\(.*$/, '')
      .replace(/^.*?:\s*/, '')
      .trim();
    const isUpg = isUpgAb(u, nm),
      isDraw = !isUpg && isDrawAb(u, nm, t);
    (isUpg ? G.upg : isDraw ? G.draw : G.abil).push([
      nm.replace(/^The .+?:\s*/, '').replace(/^Draw Event:\s*/i, ''),
      String(t).replace(/^Draw Event:\s*/i, '')
    ]);
  });
  [
    ['draw', 'Draw Events', 'Resolved at the start of its activation, before the first action.'],
    ['abil', 'Abilities', ''],
    ['upg', u.charName ? 'Character upgrades · ' + u.charName : 'Upgrades', '']
  ].forEach(([k, t, h]) => {
    if (!G[k].length) return;
    const g = document.createElement('div');
    g.className = 'rgrp ' + k;
    const h4 = document.createElement('h4');
    h4.textContent = t;
    g.appendChild(h4);
    if (h) {
      const hp = document.createElement('div');
      hp.className = 'hint';
      hp.textContent = h;
      g.appendChild(hp);
    }
    G[k].forEach(([n, tx]) => {
      const p = document.createElement('p');
      const b = document.createElement('b');
      b.textContent = n + ': ';
      p.append(b, document.createTextNode(tx));
      g.appendChild(p);
    });
    ab.appendChild(g);
  });
  const nAb = G.draw.length + G.abil.length + G.upg.length;
  $('c-abil-sec').hidden = !nAb;
  regPaneCounts(u, rb.querySelectorAll('.chip').length, nAb);
  const mine = u.side === ME && u.type !== 'marker' && (!PVP() || !!seatSide());
  $('c-act-sec').hidden = !mine || aiBusy;
  if (!mine || aiBusy) return;
  const startBox = $('c-start');
  startBox.innerHTML = '';
  $('c-actions').innerHTML = '';
  $('c-log').innerHTML = '';
  $('c-warn').hidden = true;
  const inAct = act && act.id === u.id;
  ['note', 'end', 'abort'].forEach(i => ($(i).hidden = !inAct));
  $('c-foot').hidden = !inAct;
  $('c-act-sec').classList.toggle('live', !!inAct);
  $('card').classList.toggle('activating', !!inAct);
  $('c-draw-step').hidden = $('c-act-step').hidden = !inAct;
  $('c-pips').hidden = !inAct;
  $('c-acts-done').hidden = true;
  if (act && !inAct) {
    $('c-act-h').textContent = 'Activation';
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Another regiment is activating. Finish or undo it first.';
    startBox.appendChild(p);
    $('c-cur').hidden = true;
    return;
  }
  if (!inAct) {
    $('c-act-h').textContent = 'Activation';
    $('c-cur').hidden = true;
    if (u.activated) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent =
        u.name +
        ' has already activated this round.' +
        (u.charName
          ? u.charActivated
            ? ' The ' + u.charName + ' has activated too.'
            : ' The ' + u.charName + ' still has their own card to play.'
          : '');
      startBox.appendChild(p);
      if (
        u.charName &&
        !u.charActivated &&
        ((SBX() && !huStackOn()) ||
          ((humanTop() === 'c:' + u.id ||
            vocOk('c:' + u.id) ||
            (yCard(humanTop())
              ? ySame(humanTop(), u, true)
              : humanTop() && humanTop()[0] === 'c' && sameCard(humanTop(), u))) &&
            state.turn === HU))
      ) {
        const b3 = document.createElement('button');
        b3.type = 'button';
        b3.className = 'btn';
        b3.textContent = 'Activate the ' + u.charName;
        b3.onclick = () => charActivate(u.id, humanTop());
        startBox.appendChild(b3);
      }
      return;
    }
    if (!u.onTable && !u.arriving) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Still in reinforcements this round.';
      startBox.appendChild(p);
      return;
    }
    if (ovrMine() && !u.activated && (u.onTable || u.arriving)) {
      const r = document.createElement('div');
      r.className = 'row';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = 'Activate (host override)';
      b.onclick = () => startActivation(u.id, 'command', null);
      r.appendChild(b);
      if (u.charName && !u.charActivated) {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'btn ghost';
        c.textContent = 'Activate the ' + u.charName + ' (host override)';
        c.onclick = () => charActivate(u.id, null);
        r.appendChild(c);
      }
      startBox.appendChild(r);
      startBox.appendChild(
        ptext(
          'The host has let you activate any one regiment or character, outside the Command Stack order.',
          'hint'
        )
      );
      return;
    }
    if (huStackOn()) {
      const top = vocOk('u:' + u.id) ? 'u:' + u.id : humanTop(),
        held = huHeldOk() && sameCard(PS().huHeld, u),
        myTurn = state.turn === HU;
      const row = document.createElement('div');
      row.className = 'row';
      const why = !myTurn ? 'It is not your turn.' : '';
      const yc = yCard(top),
        heldMe = false,
        okU = yc
          ? ySame(top, u, false)
          : (top === 'u:' + u.id && sameCard(top, u)) || (top && top[0] === 'u' && sameCard(top, u)),
        okC = yc ? ySame(top, u, true) : top === 'c:' + u.id || (top && top[0] === 'c' && sameCard(top, u));
      if (okU) {
        const ent = entOk(u),
          tail = yc
            ? ' with the ' +
              cardIdeal(top) +
              ' Ideal Card' +
              (yMatch(u, cardIdeal(top)) ? ' (matches: ' + IDEAL[cardIdeal(top)][0] + ')' : '')
            : top !== 'u:' + u.id
              ? ' (with the ' + cardName(top) + ' card)'
              : '';
        /* an Entourage activation is optional: offer it next to a normal activation */
        if (ent) {
          const be = document.createElement('button');
          be.type = 'button';
          be.className = 'btn';
          be.textContent = 'Activate as Entourage' + tail;
          be.title = 'Right after its character: counts as a Strategic Stack activation (Inspired)';
          be.disabled = !!why;
          be.onclick = () => startActivation(u.id, 'entourage', top);
          row.appendChild(be);
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = ent ? 'btn ghost' : 'btn';
        b.textContent = 'Activate' + tail;
        /* one card a turn: after it, only an Entourage (or the Strategic Stack card) may follow */
        const spent = myTurnCards != null && humanCardsLeft() < myTurnCards && !ovrMine();
        b.disabled = !!why || spent;
        if (spent) b.title = 'You already played a card this turn. Press End turn.';
        b.onclick = () => startActivation(u.id, 'command', top);
        row.appendChild(b);
      }
      if (okC) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = 'Activate the ' + u.charName;
        b.disabled = !!why;
        b.onclick = () => charActivate(u.id, top);
        row.appendChild(b);
      }
      if (held && stratU(u)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ghost';
        b.textContent = 'Activate from Strategic Stack';
        b.disabled = !!why || !!stratWhy();
        if (stratWhy()) b.title = stratWhy();
        b.onclick = () => startActivation(u.id, 'strategic');
        row.appendChild(b);
      }
      if (row.children.length) startBox.appendChild(row);
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent =
        why ||
        (yc && (okU || okC)
          ? 'Your top card is the ' +
            cardName(top) +
            '. Any Ideal Card can activate any of your regiments or characters; it adds its effect (' +
            IDEAL[cardIdeal(top)][0] +
            ') only when it matches the regiment’s Ideal' +
            (u.charName ? ' or its character’s' : '') +
            '. ' +
            (yMatch(u, cardIdeal(top))
              ? (u.short || u.name) + ' matches.'
              : (u.short || u.name) +
                ' does not match (' +
                (frRoles(u)
                  .filter(r => IDEALS.includes(r))
                  .join('/') || 'no Ideal') +
                ').')
          : okC
            ? 'Your top card is a ' + u.charName + ' card.'
            : okU
              ? 'Your top card is a ' +
                frBase(u) +
                ' card; it can activate any ' +
                frBase(u) +
                ' regiment that has not activated.'
              : held && stratU(u)
                ? 'A ' + frBase(u) + ' card is in your Strategic Stack; it can activate this regiment.'
                : 'Not your next card. Next in your Command Stack: ' +
                  (top ? cardName(top) : 'nothing') +
                  '.');
      startBox.appendChild(p);
      return;
    }
    /* outside the test field a regiment only activates from your Command Stack, in its order (or with the card held in the Strategic Stack) */
    if (!SBX()) {
      const held = huHeldOk() && sameCard(PS().huHeld, u),
        myTurn = state.turn === HU && (state.step || 'activations') === 'activations';
      if (held && stratU(u) && myTurn) {
        const r = document.createElement('div');
        r.className = 'row';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = 'Activate from Strategic Stack';
        b.disabled = !!stratWhy();
        if (stratWhy()) b.title = stratWhy();
        b.onclick = () => startActivation(u.id, 'strategic');
        r.appendChild(b);
        startBox.appendChild(r);
      }
      startBox.appendChild(
        ptext(
          (state.step || 'activations') !== 'activations'
            ? 'Regiments activate in the Activation Phase, in the order of your Command Stack.'
            : !myTurn
              ? 'It is not your turn.'
              : held && stratU(u)
                ? stratWhy() || 'The card in your Strategic Stack can activate this regiment.'
                : 'Your Command Stack has no card left for this regiment this round.',
          'hint'
        )
      );
      return;
    }
    const row = document.createElement('div');
    row.className = 'row';
    const b1 = document.createElement('button');
    b1.type = 'button';
    b1.className = 'btn';
    b1.textContent = 'Activate';
    b1.onclick = () => startActivation(u.id, 'command');
    const b2 = document.createElement('button');
    b2.type = 'button';
    b2.className = 'btn ghost';
    b2.textContent = 'Activate from Strategic Stack';
    b2.onclick = () => startActivation(u.id, 'strategic');
    b2.disabled = !PS().strategicHeld;
    b2.title = PS().strategicHeld ? '' : 'No card is held in the Strategic Stack';
    row.append(b1);
    if (stratU(u)) row.append(b2);
    if (u.charName && u.charActivated && !noEntourage(u)) {
      const be = document.createElement('button');
      be.type = 'button';
      be.className = 'btn';
      be.textContent = 'Activate as Entourage';
      be.onclick = () => startActivation(u.id, 'entourage');
      row.insertBefore(be, b1);
      b1.className = 'btn ghost';
    }
    if (u.charName && !u.charActivated) {
      const b3 = document.createElement('button');
      b3.type = 'button';
      b3.className = 'btn ghost';
      b3.textContent = 'Activate the ' + u.charName;
      b3.onclick = () => charActivate(u.id);
      row.appendChild(b3);
    }
    startBox.appendChild(row);
    if (u.charName && u.charActivated && !noEntourage(u)) {
      const p0 = document.createElement('p');
      p0.className = 'hint';
      p0.textContent =
        'The ' +
        u.charName +
        ' has activated. If you drew this regiment next, activate it as an Entourage; it counts as a Strategic Stack activation.';
      startBox.appendChild(p0);
    }
    if (stratU(u)) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent =
        'From the Strategic Stack the regiment gains Inspired' +
        ((u.strategicFx || []).length ? ' and ' + u.strategicFx.join(', ') : '') +
        '.';
      startBox.appendChild(p);
    }
    return;
  }
  $('c-act-h').textContent =
    'Activating · ' +
    (act.source === 'strategic'
      ? 'Strategic Stack'
      : act.source === 'entourage'
        ? ordersU(base(act.id))
          ? 'Entourage (Direct Orders)'
          : 'Entourage'
        : 'Command Stack');
  {
    const used = act.actions.filter(a => !a.free).length,
      left = Math.max(0, 2 - used),
      pp = $('c-pips');
    pp.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const d = document.createElement('i');
      if (i < used) d.className = 'on';
      pp.appendChild(d);
    }
    pp.appendChild(
      document.createTextNode(left ? left + ' action' + (left > 1 ? 's' : '') + ' left' : 'No actions left')
    );
    pp.setAttribute('aria-label', used + ' of 2 actions used');
    $('c-act-state').textContent = act.cur
      ? 'Doing: ' + ACT[act.cur.type].n
      : left
        ? 'Choose action ' + (used + 1)
        : 'Done';
    const fresh = !act.actions.length && !act.cur;
    $('c-draw-state').textContent = fresh ? 'Before your first action' : 'Done';
    $('c-draw-step').classList.toggle('done', !fresh);
    renderDrawStep(u, fresh);
    drawStepMark(fresh);
  }
  if (act.entering && !act.placed) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = `Choose an edge, then slide the regiment along it. Its front edge touches the table edge, and its first March is measured from there. Side edges are open between your edge and your Reinforcement Line${rlLine() < 48 ? ' (y ' + rlLine() + ')' : ''}.`;
    const er = document.createElement('div');
    er.className = 'grp';
    er.setAttribute('role', 'group');
    er.setAttribute('aria-label', 'Entry edge');
    [
      ['own', 'Your edge'],
      ['west', FLIP ? 'Left side' : 'Right side'],
      ['east', FLIP ? 'Right side' : 'Left side']
    ].forEach(([e, t]) => {
      const bb = document.createElement('button');
      bb.type = 'button';
      bb.textContent = t;
      bb.setAttribute('aria-pressed', String((act.edge || 'own') === e));
      const why = e === 'own' ? '' : sideBlocked(base(act.id));
      bb.disabled = !!why;
      bb.title = why;
      bb.onclick = () => setEdge(e);
      er.appendChild(bb);
    });
    startBox.appendChild(er);
    const fr = document.createElement('div');
    fr.className = 'row';
    const fl = document.createElement('span');
    fl.className = 'read';
    const G0 = geom(Object.assign({}, base(act.id), act.pose));
    fl.textContent = `Formation: ${G0.files} wide, ${G0.ranks} deep`;
    const grp = document.createElement('div');
    grp.className = 'grp';
    grp.setAttribute('role', 'group');
    grp.setAttribute('aria-label', 'Entry formation');
    [
      ['Deeper', -1],
      ['Wider', 1]
    ].forEach(([t, dl]) => {
      const bb = document.createElement('button');
      bb.type = 'button';
      bb.textContent = t;
      bb.onclick = () => {
        const uu = base(act.id);
        const f = Math.max(1, Math.min(uu.stands, geom(Object.assign({}, uu, act.pose)).files + dl));
        act.pose.files = f;
        setEdge(act.edge || 'own', true);
      };
      grp.appendChild(bb);
    });
    fr.append(fl, grp);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Confirm entry point';
    b.onclick = confirmEntry;
    /* use the card without coming on: the regiment stays off the table, still arriving, and comes on later */
    const hb = document.createElement('button');
    hb.type = 'button';
    hb.className = 'btn ghost';
    hb.textContent = 'Stay off the table (use the card, no actions)';
    hb.title =
      'The card is used and the regiment counts as activated, but it does not come on yet. It can arrive with a later card.';
    hb.onclick = () => {
      if (!act || !act.entering || act.placed) return;
      act.holdBack = true;
      saveActivation();
    };
    const br = document.createElement('div');
    br.className = 'row';
    br.append(b, hb);
    startBox.append(p, fr, br);
    $('c-cur').hidden = true;
  }
  const ICO = {
    march: '➜',
    dtmarch: '⇥',
    fadv: '⇡',
    charge: '⚔︎',
    reform: '↻',
    creform: '↻',
    fluid: '≈',
    hammer: '⚒︎',
    volley: '➶',
    aim: '◎',
    clash: '⚔︎',
    trample: '✦',
    rally: '⚑',
    crally: '⚑',
    inspire: '★',
    btl: '⛨',
    pres: '✚',
    seed: '❀',
    memory: '☠︎',
    withdraw: '↩'
  };
  availableActions(u).forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'act';
    b.dataset.ico = ICO[a.type] || '•';
    b.disabled = !!a.why;
    b.title = a.why || '';
    const m = ACT[a.type];
    let det = m.d;
    if (a.type === 'march') {
      const first = act.entering && !act.actions.some(x => x.type === 'march');
      det = `${(u.m || 0) + (first ? u.vanguard || 0 : 0)}″${first && u.vanguard ? ' with Vanguard (' + u.vanguard + ')' : ''}; sideways and back at half`;
    }
    if (a.type === 'charge') det = `D6 + ${u.m}″`;
    b.innerHTML = '';
    const t = document.createElement('span');
    t.textContent = m.n + (a.free && !/^Free/i.test(m.n) ? ' (free)' : '');
    const sm = document.createElement('small');
    sm.textContent = a.why || det;
    b.append(t, sm);
    b.onclick = () => startAction(a.type);
    $('c-actions').appendChild(b);
  });
  {
    const old = $('c-cbstep');
    if (old) old.remove();
  }
  if (cb && cb.type !== 'duel' && (cb.att === act.id || cb.tgt === act.id)) {
    const LB = {
        clash: 'Clash',
        impact: 'Impact Attacks',
        volley: 'Volley',
        lethal: 'Lethal Demise',
        freform: 'Fighting Reform'
      },
      T = cb.tgt && byId(cb.tgt),
      box = document.createElement('div');
    box.id = 'c-cbstep';
    box.className = 'cbstep';
    const h = document.createElement('p');
    h.className = 'cbs-h';
    h.textContent =
      'Resolving: ' +
      ((cb.type === 'lethal' && cb.lethalLabel) || cb.selfTitle || LB[cb.type] || 'combat') +
      (T ? ' against ' + (T.short || T.name) : '');
    box.appendChild(h);
    const steps = [
        ['att', 'Roll to hit'],
        ['def', 'Defense'],
        ...(cb.type === 'volley' || cb.noMorale ? [] : [['mor', 'Morale']]),
        ['done', cb.inAct || cb.fromCharge ? 'Finish the action' : 'Record']
      ],
      ord = ['att', 'def', 'mor', 'done'],
      cur = ord.indexOf(cb.step === 'roll' ? 'att' : cb.step);
    const ol = document.createElement('ol');
    ol.className = 'cbs-l';
    steps.forEach(([k, t]) => {
      const li = document.createElement('li');
      const i = ord.indexOf(k);
      li.textContent = t;
      li.className = i < cur ? 'ok' : i === cur ? 'now' : '';
      ol.appendChild(li);
    });
    box.appendChild(ol);
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn ghost';
    go.textContent = 'Go to the dice';
    go.onclick = () => {
      try {
        revealIn($('combat'), 'start');
      } catch (e) {}
    };
    box.appendChild(go);
    $('c-act-sec').querySelector('.actp-head').after(box);
  }
  const c = act.cur;
  $('c-cur').hidden = !c;
  $('c-actions').hidden = !!c;
  if (
    !c &&
    act.actions.filter(a => !a.free).length >= 2 &&
    ![...$('c-actions').querySelectorAll('button')].some(b => !b.disabled)
  ) {
    $('c-actions').hidden = true;
    const dn = $('c-acts-done');
    dn.hidden = false;
    dn.textContent = 'Both actions are used. Press End activation to finish.';
  }
  if (c) {
    const k = c.moving ? curCost(act.pose) : null;
    $('c-cur-read').textContent = c.moving
      ? `${ACT[c.type].n}: ${k.cost.toFixed(1)}″ of ${c.budget}″ used${c.roll != null ? ' (rolled ' + c.roll + ')' : ''} · forward ${k.fwd.toFixed(1)}″ · sideways ${k.side.toFixed(1)}″`
      : c.type === 'creform'
        ? `Combat Reform: rolled ${c.roll} against Resolve ${c.R ?? 'none'}, ${c.clean ? 'Clean' : 'Fighting'} Reform. Change formation with Deeper and Wider (front rank +2 at most); turn with the buttons or Face the enemy, and drag to place it. You must stay on the same side of the enemy. Stands in contact: ${crContact(c)} (must stay at least ${c.contact0}).`
        : `${ACT[c.type].n}: turn with the buttons${c.type === 'hammer' ? '' : ', change formation with Deeper and Wider'}.`;
    const pct = c.moving ? Math.min(100, (k.cost / c.budget) * 100) : 0;
    $('c-meter').hidden = !c.moving;
    $('c-meter').querySelector('i').style.width = pct + '%';
    $('c-meter').className = 'meter' + (pct >= 99.5 ? ' full' : '');
    $('f-less').disabled = $('f-more').disabled = !c.reshape || c.type === 'hammer';
  }
  const chg = $('c-chg');
  chg.innerHTML = '';
  const isChg = !!(c && c.type === 'charge');
  if (c && c.type === 'cast') {
    $('c-cur-read').textContent = 'Spellcasting: choose a spell and a target, then roll.';
    $('c-meter').hidden = true;
    spellBox(chg, byId(act.id), false, c, res => {
      c.res = res;
      toast(res.line);
      finishAction();
    });
  }
  if (c && (c.type === 'march' || c.withdraw) && c.segs) renderMarchUI(c, chg);
  if (c && c.type === 'withdraw' && c.stage === 'march') {
    const bb = document.createElement('button');
    bb.type = 'button';
    bb.className = 'btn ghost';
    bb.textContent = 'Withdraw fails (no legal March)';
    bb.title = 'Return the regiment to where it started; the wounds stay';
    bb.onclick = wdFail;
    chg.appendChild(bb);
  }
  if (c && c.type === 'creform' && !(cb && cb.type === 'freform') && crPrim(c)) {
    const e = crPrim(c),
      bb = document.createElement('button');
    bb.type = 'button';
    bb.className = 'btn ghost';
    bb.textContent = 'Face ' + (e.short || e.name);
    bb.title = 'Turn so the front rank sits flush against the side of the enemy you are touching';
    bb.onclick = crFace;
    chg.appendChild(bb);
  }
  if (false) {
    const row = document.createElement('div');
    row.className = 'row';
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.id = 'fwd-dist';
    inp.min = '0';
    inp.step = '0.5';
    inp.max = String(c.budget);
    inp.value = String(c.budget);
    inp.setAttribute('aria-label', 'Distance straight forward in inches');
    inp.style.cssText =
      'width:80px;font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 8px';
    const bf = document.createElement('button');
    bf.type = 'button';
    bf.className = 'btn ghost';
    bf.textContent = 'Move straight forward';
    bf.onclick = () => {
      let dd = parseFloat(inp.value);
      if (!(dd >= 0)) {
        toast('Enter a distance in inches.');
        return;
      }
      if (dd > c.budget) {
        dd = c.budget;
        toast('Limited to the full March of ' + c.budget + '″.');
      }
      const a = ((c.start.facing || 0) * Math.PI) / 180;
      act.pose.facing = c.start.facing;
      act.pose.x = c.start.x + Math.sin(a) * dd;
      act.pose.y = c.start.y + Math.cos(a) * dd;
      render();
    };
    const lab = document.createElement('span');
    lab.className = 'read';
    lab.textContent = '″ from where this March started';
    row.append(inp, lab, bf);
    chg.appendChild(row);
  }
  $('c-ctl').hidden = isChg;
  $('done-act').hidden = isChg && c.stage !== 'adjust';
  if (isChg) {
    $('c-meter').hidden = true;
    const t = c.target ? byId(c.target) : null,
      M = u.m || 0,
      jug = jugg(u);
    if (c.stage === 'target') {
      const fx0 = chargeFixed(u);
      $('c-cur-read').textContent =
        `Charge: click the enemy regiment you are declaring the Charge against. It must be in your front arc (blue cone) and within ${chargeMax(u)}″. ` +
        (fx0 != null
          ? `Cream: within its fixed ${chargeMax(u)}″ Charge. `
          : `Cream: within its March of ${M}″, so any roll reaches. Orange: reachable with a good enough roll, up to ${chargeMax(u)}″. `) +
        'Hover an enemy to see the distance and the roll it needs. Line of Sight and a legal Charge Move are checked before you roll.';
      const ill = c.illegal;
      if (ill) {
        const box = document.createElement('div');
        box.className = 'chg-illegal';
        const p = document.createElement('p');
        p.textContent = ill.los
          ? `No Line of Sight to ${ill.name}: ${ill.los} blocks every sight line from this regiment's front. No roll was made and the action is not used.`
          : `No legal Charge against ${ill.name}` +
            (ill.why ? `: the Charge Move is blocked by ${ill.why}` : '') +
            '. No roll was made and the action is not used.' +
            (ill.fail
              ? ` The planner's best try ${ill.fail.th ? 'wheels ' + Math.abs(ill.fail.th) + '° ' + ill.fail.dir + ', then ' : ''}moves straight in towards the ${ill.fail.face}.`
              : '');
        box.appendChild(p);
        if (ill.fail) {
          const bp = document.createElement('button');
          bp.type = 'button';
          bp.className = 'btn ghost';
          bp.textContent = 'Preview why it fails';
          bp.title = 'Play the attempted Charge Move as a see-through regiment, stopping where it is blocked';
          bp.onclick = previewChargeFail;
          box.appendChild(bp);
        }
        chg.appendChild(box);
      }
    }
    if (c.stage === 'roll') {
      const need = Math.max(1, Math.ceil(c.dist - M - 1e-6));
      $('c-cur-read').textContent = jug
        ? `Charge against ${t.short || t.name}, ${c.dist.toFixed(1)}″ away. Juggernaut: the Charge Distance is always ${M + 5}″.`
        : `Charge against ${t.short || t.name}, ${(c.straight != null ? c.straight : c.dist).toFixed(1)}″ away.` +
          (c.straight != null && c.dist > c.straight + 0.05
            ? ` The shortest legal Charge Move into it is ${c.dist.toFixed(1)}″ (the straight line is blocked or does not meet a facing).`
            : '') +
          ` A legal Charge Move exists. Charge Distance is ${M}″ plus the Charge Roll, so you need ${need} or more on the Charge Roll.`;
      chg.appendChild(
        jug
          ? (() => {
              const b = document.createElement('button');
              b.type = 'button';
              b.className = 'btn';
              b.textContent = 'Resolve charge';
              b.onclick = () => resolveCharge(0);
              return b;
            })()
          : chargeRollBtn('Roll the Charge', r => resolveCharge(r), need)
      );
      const ct = document.createElement('button');
      ct.type = 'button';
      ct.className = 'btn ghost';
      ct.textContent = 'Change target';
      ct.onclick = () => {
        c.stage = 'target';
        c.target = null;
        render();
        toast('Click another enemy regiment.');
      };
      chg.appendChild(ct);
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'You can also click a different enemy regiment to switch targets before rolling.';
      chg.appendChild(p);
    }
    if (c.stage === 'reroll') {
      $('c-cur-read').textContent =
        `Charge Roll ${c.roll} gives ${c.cd}″, short of ${c.dist.toFixed(1)}″. It may re-roll the Charge Roll once, or accept the failure.`;
      chg.appendChild(
        chargeRollBtn(
          'Re-roll the Charge',
          r => resolveCharge(r, true),
          Math.max(1, Math.ceil(c.dist - M - 1e-6))
        )
      );
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost';
      b.textContent = 'Accept the failed charge';
      b.onclick = () => {
        failCharge();
        render();
      };
      chg.appendChild(b);
    }
    if (c.stage === 'cautious') {
      const u0 = byId(act.id);
      chg.appendChild(
        ptext(
          `The charge failed. Cautious Strikes: move the Charge Roll (${c.roll}″) or its March (${u0.m || 0}″) straight forward; it still halts 1″ from enemies.`
        )
      );
      [
        ['Move the roll (' + c.roll + '″)', false],
        ['Move its March (' + (u0.m || 0) + '″)', true]
      ].forEach(([t, m]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = m ? 'btn' : 'btn ghost';
        b.textContent = t;
        b.onclick = () => {
          failCharge(m);
          render();
        };
        chg.appendChild(b);
      });
    }
    if (c.stage === 'adjust') {
      const pl = c.plan || {};
      const steps = [];
      if (pl.th) steps.push('wheels ' + Math.abs(pl.th) + '° ' + pl.dir);
      if (pl.s != null) steps.push('moves ' + pl.s.toFixed(1) + '″ straight in');
      if (pl.tgtPose) steps.push('cannot close the door, so ' + (t.short || t.name) + ' pivots to face it');
      else if (pl.dl) steps.push('closes the door ' + Math.abs(Math.round(pl.dl)) + '°');
      $('c-cur-read').textContent = c.animating
        ? 'Charging…'
        : pl.ok
          ? `Charge succeeds: ${c.roll ? c.roll + ' + ' : ''}${M}${jug ? ' + 5' : ''} = ${c.cd}″ against ${c.dist.toFixed(1)}″. It ${steps.join(', ')} into the target’s ${c.face}${pl.pairs ? ', with ' + pl.pairs + ' stand contact' + (pl.pairs === 1 ? '' : 's') : ''}. This is the legal Charge with the most contact. The Impact Attacks follow; the Charge is finished once they are resolved.`
          : `Charge succeeds. Placed by hand flush with the target’s ${c.face}: drag along the face if needed, then press Confirm position. The Impact Attacks follow.`;
      if (c.animating) $('done-act').hidden = true;
    }
    if (c.stage === 'place') {
      const n = c.alts.length;
      /* the description of the chosen end position; also refreshed while the slider is dragged */
      const placeRead = () => {
        const pl = c.alts[c.altI] || c.plan;
        const steps = [];
        if (pl.th) steps.push('wheels ' + Math.abs(pl.th) + '° ' + pl.dir);
        if (pl.s != null) steps.push('moves ' + pl.s.toFixed(1) + '″ straight in');
        if (pl.tgtPose) steps.push((t.short || t.name) + ' pivots to face it');
        else if (pl.dl) steps.push('closes the door ' + Math.abs(Math.round(pl.dl)) + '°');
        $('c-cur-read').textContent =
          `Charge succeeds: ${c.roll ? c.roll + ' + ' : ''}${M}${jug ? ' + 5' : ''} = ${c.cd}″ against ${c.dist.toFixed(1)}″. The see-through regiment shows where it will end: it ${steps.join(', ')} into the ${c.face}${pl.pairs ? ', ' + pl.pairs + ' stand contact' + (pl.pairs === 1 ? '' : 's') : ''}.` +
          (pl.push && pl.push.length
            ? ` ${pl.push.join(' and ')} ${pl.push.length > 1 ? 'are' : 'is'} in the way and will be pushed up to 1″ directly away.`
            : '') +
          ' Any other unengaged enemy left within 1″ is pushed up to 1″ away when the Charge ends.' +
          (n > 1 ? ` ${n} end positions give this most contact; choose one (the dots mark the others).` : '');
      };
      placeRead();
      $('done-act').hidden = true;
      if (n > 1) {
        const r = document.createElement('div');
        r.className = 'row';
        const lab = document.createElement('span');
        lab.className = 'hint';
        lab.textContent = 'End position ' + (c.altI + 1) + ' of ' + n;
        const pv = document.createElement('button');
        pv.type = 'button';
        pv.className = 'btn ghost';
        pv.textContent = '◀';
        pv.setAttribute('aria-label', 'Previous end position');
        pv.onclick = () => {
          c.altI = (c.altI - 1 + n) % n;
          render();
        };
        const nx = document.createElement('button');
        nx.type = 'button';
        nx.className = 'btn ghost';
        nx.textContent = '▶';
        nx.setAttribute('aria-label', 'Next end position');
        nx.onclick = () => {
          c.altI = (c.altI + 1) % n;
          render();
        };
        const sl = document.createElement('input');
        sl.type = 'range';
        sl.min = 0;
        sl.max = n - 1;
        sl.value = c.altI;
        sl.setAttribute('aria-label', 'End position along the enemy');
        /* dragging only redraws the see-through regiment and the text, so the slider keeps the pointer */
        sl.oninput = () => {
          c.altI = +sl.value;
          lab.textContent = 'End position ' + (c.altI + 1) + ' of ' + n;
          placeRead();
          redrawChargeGhost();
        };
        sl.onchange = () => render();
        r.append(pv, sl, nx, lab);
        chg.appendChild(r);
      }
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'btn';
      go.textContent = 'Charge!';
      go.onclick = chargeGo;
      chg.appendChild(go);
    }
    if (c.stage === 'blocked') {
      const pl = c.plan || {};
      $('c-cur-read').textContent =
        `The Charge Roll is enough (${c.cd}″ against ${c.dist.toFixed(1)}″), but there is no legal Charge Move into ${t.short || t.name}` +
        (pl.why ? ': it is blocked by ' + pl.why : '') +
        '. Under the rules the Charge fails: it moves straight forward the Charge Roll and halts 1″ from enemies.';
      $('done-act').hidden = true;
      const b1 = document.createElement('button');
      b1.type = 'button';
      b1.className = 'btn';
      b1.textContent = 'Charge fails';
      b1.onclick = () => {
        failCharge();
        render();
      };
      chg.appendChild(b1);
      const b2 = document.createElement('button');
      b2.type = 'button';
      b2.className = 'btn ghost';
      b2.textContent = 'Place it by hand instead';
      b2.onclick = () => {
        placeChargeFlush();
        c.stage = 'adjust';
        c.plan = null;
        render();
        toast('Placed flush with the target. Drag along the face if needed, then press Confirm position.');
      };
      chg.appendChild(b2);
    }
    $('cancel-act').hidden = c.stage === 'adjust' || c.stage === 'blocked' || c.stage === 'place';
  } else {
    $('cancel-act').hidden = false;
  }
  if (c && c.type === 'cast') {
    $('c-ctl').hidden = true;
    $('done-act').hidden = true;
  }
  if (
    c &&
    c.type === 'volley' &&
    c.stage === 'target' &&
    (rh(RU(u), 'Arcing Fire') || (u.charName && rh(chRulesX(u), 'Arcing Fire')))
  ) {
    const w = arcingWhy(u),
      b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (c.arcing ? '' : ' ghost');
    b.setAttribute('aria-pressed', String(!!c.arcing));
    b.textContent =
      (c.arcing ? '✓ Arcing Fire on' : 'Arcing Fire') + ' · −1 Volley, shoot over regiments and terrain';
    b.disabled = !!w && !c.arcing;
    b.title =
      w ||
      'Only its Arcing Fire stands shoot, as Clear Shots, at a target in its front arc and range that a friendly regiment can see. −1 Volley for the rest of this activation.';
    b.onclick = () => {
      c.arcing = !c.arcing;
      render();
    };
    chg.appendChild(b);
    if (w) {
      const h = document.createElement('p');
      h.className = 'hint';
      h.textContent = 'Arcing Fire: ' + w;
      chg.appendChild(h);
    }
  }
  if (c && c.type === 'volley' && c.stage === 'target') {
    const ts = c.sel && byId(c.sel);
    if (ts) {
      const vw = volleyWhy(u, ts),
        AF = arcingOn(u),
        box = document.createElement('div');
      box.className = 'vsel-box';
      const h = document.createElement('p');
      h.className = 'read';
      h.textContent =
        (ts.short || ts.name) +
        ': ' +
        (vw || (AF ? 'Arcing Fire: ' : '') + volleySummary(volleyStands(u, ts), AF));
      box.appendChild(h);
      const fb = document.createElement('button');
      fb.type = 'button';
      fb.className = 'btn';
      fb.textContent = 'Volley at ' + (ts.short || ts.name);
      fb.disabled = !!vw;
      fb.onclick = fireVolley;
      box.appendChild(fb);
      const hn = document.createElement('p');
      hn.className = 'hint';
      hn.textContent = 'Click another enemy to compare its lines instead.';
      box.appendChild(hn);
      chg.appendChild(box);
    }
  }
  if (c && (c.type === 'volley' || c.type === 'clash')) {
    $('c-ctl').hidden = true;
    $('done-act').hidden = true;
    $('c-meter').hidden = true;
    $('c-cur-read').textContent =
      c.type === 'volley' && c.stage === 'target'
        ? (() => {
            const vr = volleyRange(u),
              lg = rh(RU(u).concat(fx(u)), 'Longshot');
            return (
              'Volley: click an enemy regiment to see which stands can shoot it, then press Volley.' +
              (vr
                ? (lg
                    ? ` Gold: its whole ${vr.range}″ range is effective (Longshot), +1 shot per stand.`
                    : ` Gold: effective range, within ${vr.range / 2}″ of a stand, +1 shot per stand. Blue: full range, ${vr.range}″.`) +
                  ' Measured from each front-rank stand across its firing arc. Hover an enemy for its distance.'
                : '') +
              ' Claude checks Line of Sight.'
            );
          })()
        : c.type === 'clash' && c.stage === 'node'
          ? 'Clash declared. Catabolic Node: detonate it first? Every enemy engaged with this regiment takes 1D6+4 Hits (one D6 for all) and this regiment takes Hits equal to the D6. No Morale Tests. The Node is then removed, and the Clash follows against whoever is still in contact.'
          : ACT[c.type].n + ': roll it in the combat panel under the map.';
    if (c.type === 'clash' && c.stage === 'node') {
      const row = document.createElement('div');
      row.className = 'row';
      const y = document.createElement('button');
      y.type = 'button';
      y.className = 'btn';
      y.textContent = 'Detonate, then Clash';
      y.onclick = () => {
        c.stage = null;
        nodeThenClash(u);
        render();
      };
      const n = document.createElement('button');
      n.type = 'button';
      n.className = 'btn ghost';
      n.textContent = 'Clash without detonating';
      n.onclick = () => {
        c.stage = null;
        act.nodeAsked = true;
        clashOpen(u, true);
        render();
      };
      row.append(y, n);
      chg.appendChild(row);
    }
  }
  act.actions.forEach((a, i) => {
    const li = document.createElement('li');
    let t = '';
    if (a.dist != null) t += `${a.dist.toFixed(1)}″`;
    if (a.roll != null) t += (t ? ', ' : '') + `rolled ${a.roll}`;
    if (a.vanguard) t += (t ? ', ' : '') + `Vanguard ${a.vanguard}`;
    const ck = document.createElement('span');
    ck.className = 'ck';
    ck.textContent = '✓';
    const nm = document.createElement('b');
    nm.textContent = ACT[a.type].n + (a.free ? ' (free)' : '');
    li.append(ck, nm);
    if (t) {
      const sm = document.createElement('small');
      sm.textContent = t;
      li.append(sm);
    }
    $('c-log').appendChild(li);
  });
  const w = [];
  if (act.entering && act.placed) {
    const G = geom(Object.assign({}, base(act.id), act.pose));
    if (act.pose.y + G.d / 2 > 48.01) w.push('Not every stand is on the table yet; it needs another March.');
  }
  if (overlapsAny(byId(act.id)) && !(act.cur && act.cur.type === 'charge'))
    w.push('This regiment overlaps another one.');
  if (act.cur && MOVE1.includes(act.cur.type) && !act.cur.sweep && act.cur.start) {
    const e = near1(act.cur);
    if (e)
      w.push(
        'Within 1″ of ' +
          (e.short || e.name) +
          (e.terr
            ? ': a March must end at least 1″ from Garrison terrain.'
            : ': a March or Reform must stay at least 1″ from enemy regiments (only a Charge makes contact).')
      );
  }
  if (w.length) {
    $('c-warn').hidden = false;
    $('c-warn').textContent = w.join(' ');
  }
}

/* Draw Events stand out while they matter: a highlighted step, the number of choices in its label, and once per
   activation a nudge (scrolled into view, a toast) when there is a choice to make before the first action */
let drawNudged = '';
function drawStepMark(fresh) {
  const step = $('c-draw-step'),
    box = $('c-draw');
  if (!step || !box || !act) return;
  /* a choice is a group of buttons under one heading (pick one of four Chant Markers is one choice) */
  let choices = 0;
  box.querySelectorAll('.fr-opts').forEach(w => {
    let head = null,
      counted = false;
    [...w.children].forEach(k => {
      if (k.classList.contains('dn-h')) {
        head = k;
        counted = false;
      } else if (k.matches('.dn-btn:not(:disabled)') && (!head || !counted)) {
        choices++;
        counted = !!head;
      }
    });
  });
  const notes = box.querySelectorAll('.dn').length,
    live = fresh && !act.entering && choices + notes > 0;
  step.classList.toggle('live', live);
  step.classList.toggle('has-choice', live && choices > 0);
  if (live)
    $('c-draw-state').textContent = choices
      ? (choices > 1 ? choices + ' choices' : 'A choice') + ' to make before your first action'
      : 'Resolved at the start · check them';
  const key = act.id + '|' + (state.round || 0) + '|' + (act.source || '');
  if (live && choices && drawNudged !== key) {
    drawNudged = key;
    requestAnimationFrame(() => {
      try {
        step.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch (e) {}
    });
    toast(
      'Draw Events: ' + choices + ' choice' + (choices > 1 ? 's' : '') + ' to make before the first action.'
    );
  }
}
