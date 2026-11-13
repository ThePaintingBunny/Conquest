/* Side panels: the regiment card, the activation panel, the Armies tab and the main render(). */
/* the regiment's printed stats (without this round's changes) and its stats right now */
function baseStats(u) {
  const b = Object.assign({}, u.stats || {});
  (u.temp || []).forEach(g =>
    Object.entries(g.d || {}).forEach(([k, v]) => {
      if (b[k] != null && !isNaN(+b[k])) b[k] = +b[k] - v;
    })
  );
  return b;
}
function baseRules(u) {
  const T = new Set();
  (u.temp || []).forEach(g => (g.rules || []).forEach(r => T.add(r)));
  const out = [];
  (u.rules || []).forEach(r => {
    if (T.has(r)) {
      T.delete(r);
      return;
    }
    out.push(r);
  });
  return out;
}
function effStats(u) {
  const S = u.stats || {},
    e = Object.assign({}, S),
    why = {};
  const p = prof(u, 'reg');
  e.M = (+u.m || +S.M || 0) + srMarchMod(u);
  if (e.M !== +baseStats(u).M) why.M = 'March changes this round';
  const hc = hitMods(u, p, 'clash', null);
  e.C = hc.hitOn;
  why.C = hc.reroll6 ? 're-rolls failed 6s (bonus above 5)' : fxHas(u, /Inspired/) ? 'Inspired' : '';
  if (hasBarrage(u)) {
    const hv = hitMods(u, p, 'volley', null);
    e.V = hv.hitOn;
  }
  e.A = p.A;
  const mi = moraleInfo(u, u);
  e.R = mi.auto ? '–' : mi.R;
  why.R = mi.auto ? 'never tests' : 'includes its size' + (u.charName ? ' and the character’s Resolve' : '');
  let D = +S.D || 0;
  const rr = RU(u);
  if (rh(rr, 'Shield') && !u.garrison) D += 1;
  if (phalanx(u)) D += 1;
  const bas = drawVal(u, /^Bastion\s*\((\d+)\)/);
  if (bas) D += bas;
  e.D = D;
  if (D !== (+S.D || 0)) why.D = 'from the front' + (bas ? ', with Bastion' : '');
  let Ev = supEvasion(u, +S.E || 0);
  if (fxHas(u, /^Coils of the Serpent/) && Ev < 2) Ev += 1;
  e.E = Ev;
  e._why = why;
  return e;
}
/* special rules that are new or have a different value right now */
function effRules(u, BR) {
  const all = RU(u),
    out = [],
    seen = new Set();
  const val = (L, n) => rx(L, n);
  all.forEach(r => {
    const m = String(r).match(/^([A-Z][A-Za-z'!\- ]+?)\s*\(\+?(\d+)\)$/);
    const plain = /^[A-Z][A-Za-z'!\- ]+$/.test(String(r)) && GLOSS[String(r).toLowerCase()];
    if (m) {
      const n = m[1].trim();
      if (seen.has(n)) return;
      seen.add(n);
      const now = val(all, n),
        was = val(BR, n);
      if (now !== was && now > 0) out.push([n + ' (' + now + ')', was ? n + ' (' + was + ')' : '']);
    } else if (plain && !rh(BR, String(r)) && !seen.has(r)) {
      seen.add(r);
      out.push([String(r), '']);
    }
  });
  return out;
}
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
        const ent = PS().huLastCard === 'c:' + u.id && !noEntourage(u),
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
        b.disabled = !!why;
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
        b.disabled = !!why;
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
                ? 'Your Command Stack is empty; the card in your Strategic Stack can activate this regiment.'
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
    startBox.append(p, fr, b);
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

/* Armies tab: both rosters next to the map */
let rightTab = 'reg';
function setTab(t) {
  rightTab = t;
  renderTabs();
}
function renderTabs() {
  const a = rightTab === 'army';
  $('tab-reg').setAttribute('aria-selected', String(!a));
  $('tab-army').setAttribute('aria-selected', String(a));
  $('card').hidden = a;
  $('armies').hidden = !a;
  const n = ((state && state.units) || []).filter(
    u => u.type !== 'marker' && !u.destroyed && u.onTable && !u.activated
  ).length;
  {
    const t = $('tab-army');
    t.textContent = 'Armies';
    if (state && (state.units || []).some(u => u.type !== 'marker')) {
      const b = document.createElement('span');
      b.className = 'tb-n';
      b.textContent = n;
      b.title = n + ' regiment' + (n === 1 ? '' : 's') + ' on the table still to activate';
      t.appendChild(b);
      t.setAttribute('aria-label', 'Armies, ' + n + ' still to activate');
    }
  }
  {
    const t = $('tab-reg');
    t.textContent = 'Regiment';
    if (act) {
      const b = document.createElement('span');
      b.className = 'tb-dot';
      b.title = 'A regiment is activating';
      t.appendChild(b);
    }
  }
}
function hiUnit(id, on) {
  const g = document.querySelector('#units g[data-id="' + id + '"]');
  if (g) g.classList.toggle('hi', on);
}
function renderArmies() {
  ['cs', 'nord'].forEach(sd => {
    const box = $('r-' + sd);
    box.innerHTML = '';
    const L = all().filter(u => u.side === sd);
    const regs = L.filter(u => u.type !== 'marker'),
      onT = regs.filter(u => u.onTable && !u.destroyed),
      done = onT.filter(u => u.activated).length,
      dead = regs.filter(u => u.destroyed).length,
      off = regs.length - onT.length - dead;
    $('sum-' + sd).textContent = regs.length
      ? `${done}/${onT.length} activated` +
        (off ? ` · ${off} off table` : '') +
        (dead ? ` · ${dead} destroyed` : '')
      : '';
    L.forEach(u => {
      const row = document.createElement('div');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.className =
        'u' +
        (u.onTable ? '' : ' off') +
        (u.destroyed ? ' dead' : '') +
        (u.activated && u.type !== 'marker' ? ' done' : '') +
        (u.id === selId ? ' sel' : '');
      const ic = document.createElement('span');
      ic.className = 'u-ic';
      ic.textContent =
        u.type === 'marker' ? '◆' : u.destroyed ? '✕' : u.activated ? '✓' : u.onTable ? '•' : '⧗';
      ic.title =
        u.type === 'marker'
          ? 'Objective Marker'
          : u.destroyed
            ? 'Destroyed'
            : u.activated
              ? 'Activated this round'
              : u.onTable
                ? 'Ready to activate'
                : 'Not on the table';
      const mid = document.createElement('span');
      mid.className = 'u-m';
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = u.name;
      mid.appendChild(n);
      if (u.charName) {
        const c = document.createElement('span');
        c.className = 'u-c';
        c.textContent =
          '+ ' +
          u.charName +
          (u.warlord ? ' ★' : '') +
          (u.charWounds ? ' · ' + u.charWounds + '/' + (chStatsX(u).W ?? '?') + ' wounds' : '') +
          (u.charActivated ? ' · activated' : '');
        mid.appendChild(c);
      }
      const tags = document.createElement('span');
      tags.className = 'u-t';
      (u.effects || []).forEach(e => {
        const t = document.createElement('span');
        t.className = 'tg' + (/^Broken/.test(e) ? ' bad' : /Inspired/.test(e) ? ' good' : '');
        t.textContent = e.replace(/\s*\(.*\)$/, '');
        tags.appendChild(t);
      });
      if (!u.onTable && !u.destroyed && u.type !== 'marker') {
        const t = document.createElement('span');
        t.className = 'tg';
        t.textContent = u.arriving ? 'Arriving' : 'Reserves';
        tags.appendChild(t);
      }
      if (tags.children.length) mid.appendChild(tags);
      const right = document.createElement('span');
      right.className = 's';
      if (u.type === 'marker')
        right.textContent = u.destroyed
          ? 'Destroyed'
          : 3 - Math.max(u.dmg?.cs || 0, u.dmg?.nord || 0) + '/3 wounds';
      else if (u.destroyed) right.textContent = 'Destroyed';
      else {
        const L2 = live(u),
          T = u.stands || 1;
        const t = document.createElement('span');
        t.textContent = L2 + '/' + T;
        right.appendChild(t);
        right.title = L2 + ' of ' + T + ' stands left' + (u.wounds ? ', ' + u.wounds + ' wounds taken' : '');
        const bar = document.createElement('i');
        bar.className = 'u-bar';
        const fill = document.createElement('b');
        fill.style.width = Math.round((L2 / T) * 100) + '%';
        if (L2 / T <= 0.34) fill.className = 'low';
        bar.appendChild(fill);
        right.appendChild(bar);
      }
      row.append(ic, mid, right);
      const pick = () => {
        selId = u.id;
        rightTab = 'reg';
        render();
      };
      row.onclick = pick;
      row.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      };
      row.onmouseenter = () => hiUnit(u.id, true);
      row.onmouseleave = () => hiUnit(u.id, false);
      row.onfocus = () => hiUnit(u.id, true);
      row.onblur = () => hiUnit(u.id, false);
      box.appendChild(row);
      if (u.charName && !u.destroyed) {
        const cr = document.createElement('div');
        cr.tabIndex = 0;
        cr.setAttribute('role', 'button');
        cr.className = 'u ch' + (u.charActivated ? ' done' : '') + (u.id === selId ? ' sel' : '');
        cr.style.paddingLeft = '22px';
        const ci = document.createElement('span');
        ci.className = 'u-ic';
        ci.textContent = u.charActivated ? '✓' : '♦';
        const cm = document.createElement('span');
        cm.className = 'u-m';
        const cn = document.createElement('span');
        cn.className = 'n';
        cn.textContent = u.charName + (u.warlord ? ' ★' : '');
        cm.appendChild(cn);
        const cs = document.createElement('span');
        cs.className = 'u-c';
        const S = chStatsX(u);
        cs.textContent =
          'C' +
          (S.C ?? '–') +
          ' A' +
          (S.A ?? '–') +
          ' D' +
          (S.D ?? '–') +
          ' E' +
          (S.E ?? '–') +
          ' R' +
          (S.R ?? '–') +
          ' · with ' +
          (u.short || u.name);
        cm.appendChild(cs);
        const cw = document.createElement('span');
        cw.className = 's';
        cw.textContent = Math.max(0, (+S.W || 0) - (+u.charWounds || 0)) + '/' + (S.W ?? '?');
        cw.title = 'Wounds left';
        cr.append(ci, cm, cw);
        const pk = () => {
          selId = u.id;
          rightTab = 'reg';
          render();
        };
        cr.onclick = pk;
        cr.onkeydown = e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pk();
          }
        };
        box.appendChild(cr);
      }
    });
    if (!L.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No regiments yet.';
      box.appendChild(p);
    }
  });
  renderTabs();
}
/* Fit the board to the screen: as tall as the space below the top bars allows (on wide screens only).
   When the bars above are very tall (tools opened), the board keeps a usable size and the page scrolls instead. */
function fitBoard() {
  const b = $('board');
  if (!b) return;
  if (innerWidth <= 900) {
    b.style.maxHeight = '';
    return;
  }
  const top = b.getBoundingClientRect().top + scrollY,
    vh = innerHeight;
  b.style.maxHeight = Math.max(320, vh - Math.min(top, vh * 0.4) - 18) + 'px';
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
$('strat-btn').onclick = async () => {
  if (!db || !state) return;
  if (PS().strategicHeld || PS().strategicUsedRound === state.round || act) return;
  if (PVP() && state.turn !== HU) {
    toast('It is not your turn.');
    return;
  }
  let held = {};
  if (huStackOn()) {
    const top = humanTop();
    if (!top || top[0] !== 'u') {
      toast('Only a regiment card can go into the Strategic Stack, and it must be your top card.');
      return;
    }
    held = { huStack: PS().huStack.filter(c => c !== top), huHeld: top, huLastCard: null };
  }
  myTurnStrat = true;
  const sp = Object.assign(held, { strategicHeld: true, strategicUsedRound: state.round });
  if (PVP()) await savePS(sp);
  const next = Object.assign(
    {},
    state,
    PVP() ? {} : sp,
    {
      moves: [],
      lastTitle: N(HU) + ' · Strategic Stack',
      lastText: 'A Command Card was placed face down in the Strategic Stack.',
      updatedBy: HU,
      updatedAt: Date.now()
    },
    srGodflesh(HU, held.huHeld)
  );
  try {
    await db.doc('game/state').set(sanitize(next));
    state = next;
    render();
    await db
      .collection('events')
      .doc('e' + Date.now())
      .set({ at: Date.now(), side: HU, kind: 'strategic-store' });
    toast('Card placed in the Strategic Stack. Press End turn to pass the turn.');
  } catch (e) {
    toast('That could not be saved. Try again in a moment.');
  }
};
