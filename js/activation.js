/* Activations: Draw Events, start-of-activation effects and Undo. */
/* Draw Events and start-of-activation effects */
function drawEvents(u) {
  const notes = [];
  if (act && act.id === u.id && act.entering) {
    act.drawNotes = [];
    return;
  }
  const bas = (u.abilities || [])
    .concat(fx(u).map(x => [x]))
    .map(a => String(a[0]).match(/^Bastion\s*\((\d+)\)/))
    .find(Boolean);
  if (bas) {
    act.extraFx.push('Bastion (' + bas[1] + ')');
    notes.push('Bastion: +' + bas[1] + ' Defense until the end of the round');
  }
  let heal = 0,
    cheal = 0;
  const chPre = u.charName ? 'The ' + u.charName + ':' : '\u0000';
  const reg = (u.abilities || [])
    .filter(a => !String(a[0]).startsWith(chPre))
    .concat(fx(u).map(x => [x]))
    .concat(
      fodder6(u) && (u.abilities || []).some(a => /^Regeneration/.test(a[0])) ? [['Regeneration (+4)']] : []
    )
    .map(a => String(a[0]).match(/^Regeneration\s*\(\+?(\d+)\)/))
    .filter(Boolean)
    .sort((a, b) => b[1] - a[1])[0];
  if (u.charName) {
    const cr = chRulesX(u)
      .concat(
        (u.abilities || [])
          .filter(a => String(a[0]).startsWith(chPre))
          .map(a => String(a[0]).slice(chPre.length).trim())
      )
      .map(x => String(x).match(/^Regeneration\s*\(\+?(\d+)\)/))
      .filter(Boolean)
      .sort((a, b) => b[1] - a[1])[0];
    if (cr) cheal = +cr[1];
  }
  if (reg) heal += +reg[1];
  const fh = frHeal(u);
  if (fh) {
    heal += fh;
    notes.push('Underspire Regeneration (+' + fh + ')');
  }
  if ((u.abilities || []).some(a => /^Biotic Renewal/.test(a[0]))) {
    const v = d6(),
      h = u.type === 'inf' ? v : Math.ceil(v / 2);
    heal += h;
    notes.push('Biotic Renewal rolled ' + v);
  }
  if (heal && !canHeal(u)) {
    notes.push('Primal Cacophony: it cannot Heal');
    heal = 0;
  }
  if (cheal && !canHeal(u)) cheal = 0;
  if ((heal && (u.wounds || 0) > 0) || (cheal && (+u.charWounds || 0) > 0)) {
    const h = Math.min(heal, u.wounds || 0),
      hc = Math.min(cheal, +u.charWounds || 0);
    const units = (state.units || []).map(x =>
      x.id !== u.id
        ? x
        : Object.assign({}, x, {
            wounds: (x.wounds || 0) - h,
            charWounds: Math.max(0, (+x.charWounds || 0) - hc)
          })
    );
    putState({
      units,
      lastTitle: N(u.side) + ' · ' + u.name,
      lastText: `Draw Event: heals ${h + hc} wound${h + hc > 1 ? 's' : ''}${hc ? ' (' + hc + ' on the ' + u.charName + ')' : ''}.`
    }).catch(() => {});
    notes.push(
      'heals ' +
        (h + hc) +
        ' wound' +
        (h + hc > 1 ? 's' : '') +
        (hc ? ' (' + hc + ' on the ' + u.charName + ')' : '')
    );
  }
  if (hasDraw(u, /^Double Time/)) notes.push('Double Time: after two Marches, take a free third March');
  if (act && act.id === u.id) act.drawNotes = notes.slice();
  if (notes.length) toast('Draw Events: ' + notes.join(' · ') + '.');
  // Aura of Death from engaged enemies
  const me = byId(u.id);
  if (!me || !me.onTable) return;
  const mc = corners(me);
  let first = null,
    tot = 0;
  if (fxHas(me, /^(Cure|Oathstone)/)) return;
  engaged(me).forEach(e => {
    const X = rx(RU(e), 'Aura of Death');
    if (!X) return;
    const k = standsOf(e).filter(st => polyDist(st.poly, mc) <= 0.35).length;
    const per = e.type === 'monster' ? X : Math.min(4, X);
    if (k) {
      tot += per * k;
      if (!first) first = e;
    }
  });
  if (tot && first && act && act.id === u.id)
    act.drawNotes = (act.drawNotes || []).concat([
      'Aura of Death from ' + (first.short || first.name) + ': ' + tot + ' Hits'
    ]);
  if (tot && first)
    setTimeout(
      () =>
        openCombat({
          type: 'lethal',
          att: first.id,
          tgt: u.id,
          inAct: false,
          lethalHits: tot,
          lethalX: 0,
          lethalLost: 0,
          selfTitle: 'Aura of Death',
          selfText: `${me.short || me.name} starts its activation in contact with an Aura of Death and suffers ${tot} Hits. No Morale Tests.`
        }),
      50
    );
}
async function charCommit(id, extra) {
  extra = extra || {};
  const cUsed = (charAct && charAct.card) || null;
  charAct = null;
  if (!db) {
    toast('The board is read-only in this view.');
    return;
  }
  const u = base(id);
  const note = window.prompt ? null : null;
  const units = (state.units || []).map(x => {
    let y = x;
    if (x.id === id) y = Object.assign({}, y, { charActivated: true });
    if (extra.target && x.id === extra.target && extra.effect)
      y = Object.assign({}, y, { effects: (y.effects || []).concat([extra.effect]) });
    return y;
  });
  const cnote = $('note') && $('note').value.trim();
  if (cUsed && yCard(cUsed)) {
    const k = cardIdeal(cUsed),
      cm =
        k && (/Daimyo/.test(u.charName || '') ? (u.daimyoIdeal || 'Ka') === k : frRoles(u, true).includes(k));
    const i = units.findIndex(x => x.id === id);
    /* a character activated by its own Ideal passes the effect to the regiment it is attached to */
    if (cm && i >= 0 && !hasGrant(units[i], 'Ideal Card: ' + k) && k !== 'Fu') {
      units[i] = grantU(units[i], 'Ideal Card: ' + k, IDEAL[k][1], IDEAL[k][2] || null);
      extra.note = (
        (extra.note || '') +
        ' Ideal Card ' +
        k +
        ': ' +
        IDEAL[k][0] +
        ' for ' +
        (u.short || u.name) +
        '.'
      ).trim();
    }
  }
  const stkP =
    u.side === ME && Array.isArray(PS().huStack)
      ? {
          huStack: (() => {
            if (cUsed && yCard(cUsed)) {
              const i = PS().huStack.indexOf(cUsed);
              return PS().huStack.filter((c, j) => j !== i);
            }
            const own = 'c:' + id,
              used = cUsed && cUsed !== own && cUsed[0] === 'c' ? cUsed : own;
            return PS()
              .huStack.filter(c => c !== used)
              .map(c => (c === own ? used : c));
          })(),
          huLastCard: 'c:' + id
        }
      : {};
  if (PVP() && stkP.huStack) await savePS(stkP);
  const next = Object.assign(
    {},
    state,
    ovrMine() ? { ovr: Object.assign({}, state.ovr, { n: (+state.ovr.n || 1) - 1 }) } : {},
    PVP() ? {} : stkP,
    {
      units,
      moves: [],
      lastTitle: N(u.side) + ' · ' + u.charName,
      lastText:
        'The ' +
        u.charName +
        ' activated (attached to ' +
        u.name +
        ').' +
        (extra.note ? ' ' + extra.note : '') +
        (cnote ? ' Note: ' + cnote : ''),
      phase: 'Round ' + (state.round || 1) + ' · ' + u.charName + ' activated',
      updatedBy: u.side,
      updatedAt: Date.now()
    }
  );
  try {
    await db.doc('game/state').set(sanitize(next));
    state = next;
    await db
      .collection('events')
      .doc('e' + Date.now())
      .set({
        at: Date.now(),
        side: u.side,
        character: u.charName,
        unit: id,
        kind: 'character',
        spell: extra.spell || null,
        target: extra.target || null,
        rolls: extra.rolls || null,
        success: extra.success ?? null
      });
    if (u.side === ME)
      toast(
        'The ' +
          u.charName +
          ' activated. If your next card is ' +
          u.name +
          ', activate it as an Entourage now.'
      );
    render();
  } catch (e) {
    toast('That could not be saved. Try again in a moment.');
  }
}
let charAct = null;
function charActivate(id, card) {
  if (PVP() && !myTurnPvp()) {
    toast('It is not your turn.');
    return;
  }
  charAct = { id, spell: 0, target: null, rolls: null, card: card || null };
  selId = id;
  render();
}
function renderCharPanel() {
  const box = $('c-char');
  if (!charAct || selId !== charAct.id) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = '';
  const u = byId(charAct.id),
    h = document.createElement('h3');
  h.textContent = u.charName + ' activation';
  box.appendChild(h);
  charAbilBox(u, box);
  duelBox(u, box);
  supCharBox(u, box);
  const row0 = document.createElement('div');
  row0.className = 'row';
  const pass = document.createElement('button');
  pass.type = 'button';
  pass.className = 'btn ghost';
  pass.textContent = 'Pass (no action)';
  pass.onclick = () => charCommit(charAct.id, { note: 'No action.' });
  const cl = document.createElement('button');
  cl.type = 'button';
  cl.className = 'btn ghost';
  cl.textContent = 'Cancel';
  cl.onclick = () => {
    charAct = null;
    render();
  };
  row0.append(pass, cl);
  const sps = spellsOf(u, true),
    lvl = magicLevel(u, true);
  if (sps.length && lvl) {
    if (!u.onTable) {
      box.appendChild(ptext('Not on the table yet, so no spells can be cast.'));
      box.appendChild(row0);
      return;
    }
    const sh = document.createElement('p');
    sh.className = 'hint';
    sh.textContent = 'Spellcasting (uses the character’s action):';
    box.appendChild(sh);
    charAct.cast = charAct.cast || [];
    spellBox(box, u, true, charAct, res => srCharCast(res));
  } else
    box.appendChild(
      ptext(
        chAbil(u).length
          ? 'No spells. Use an ability above, or pass.'
          : 'This Character has no spells to cast. Challenge a Duel above if an enemy character is in contact, or pass.'
      )
    );
  box.appendChild(row0);
}
function confirmEntry() {
  act.placed = true;
  act.entryPoint = { edge: act.edge || 'own', x: act.pose.x, y: act.pose.y };
  render();
}
function ownEntry(side, d) {
  return side === 'nord' ? { y: -d / 2, facing: 0 } : { y: 48 + d / 2, facing: 180 };
}
function rlLine(side) {
  side = side || (act ? base(act.id).side : HU);
  const v = state.rl && state.rl[side];
  return v != null ? v : side === 'nord' ? 0 : 48;
}
function sideBand(side, w) {
  const rl = rlLine(side);
  return side === 'nord' ? { lo: w / 2, hi: rl - w / 2 } : { lo: rl + w / 2, hi: 48 - w / 2 };
}
function sideBlocked(u) {
  if (state.round === 3 && /Heavy/.test(u.cls || ''))
    return 'Heavy regiments may only enter from your own edge in round 3';
  if (u.side === 'nord' ? rlLine(u.side) <= 0 : rlLine(u.side) >= 48)
    return 'No Reinforcement Line is set, so only your own edge is open';
  return '';
}
function setEdge(e, keep) {
  const u = base(act.id),
    G = geom(Object.assign({}, u, act.pose));
  if (e !== 'own') {
    const why = sideBlocked(u);
    if (why) {
      toast(why + '.');
      return;
    }
    const { lo, hi } = sideBand(u.side, G.w);
    if (hi < lo) {
      toast('There is not enough room between your edge and your Reinforcement Line for that formation.');
      return;
    }
    const y =
      keep && act.edge === e
        ? Math.max(lo, Math.min(hi, act.pose.y))
        : Math.max(lo, Math.min(hi, (lo + hi) / 2));
    Object.assign(
      act.pose,
      e === 'west' ? { x: -G.d / 2, y, facing: 90 } : { x: 72 + G.d / 2, y, facing: 270 }
    );
  } else {
    const x = keep && act.edge === 'own' ? Math.max(G.w / 2, Math.min(72 - G.w / 2, act.pose.x)) : 36;
    Object.assign(act.pose, Object.assign({ x }, ownEntry(u.side, G.d)));
  }
  act.edge = e;
  render();
}
/* Undo activation: everything the activation changed (Ideal Card, Chant, Draw Events, faction tokens...) goes back as it was */
function abort() {
  const sn = act && act.snap;
  act = null;
  cb = null;
  cbQueue = [];
  try {
    renderCombat();
  } catch (e) {}
  if (sn && (sn.units !== state.units || sn.fr !== (state.fr || null) || sn.sup !== (state.sup || null))) {
    putState({
      _undo: true,
      units: sn.units,
      fr: sn.fr,
      sup: sn.sup,
      lastTitle: 'Activation undone',
      lastText: 'The activation and the effects it gave were undone.'
    }).catch(() => {});
  } else render();
  toast('Activation undone.');
}
/* messages float over the board and fade after a few seconds (longer messages stay longer); click to dismiss */
let toastTimer = null;
function toast(t) {
  const e = $('toast');
  if (!e) return;
  e.textContent = t || '';
  clearTimeout(toastTimer);
  e.classList.toggle('show', !!t);
  if (!e.onclick) e.onclick = () => e.classList.remove('show');
  if (t)
    toastTimer = setTimeout(() => e.classList.remove('show'), Math.min(14000, Math.max(4500, t.length * 60)));
}
function setPose(p) {
  if (!act) return;
  if (act.entering && !act.placed) {
    const G = geom(Object.assign({}, base(act.id), act.pose));
    if ((act.edge || 'own') === 'own')
      act.pose.x = Math.max(G.w / 2, Math.min(72 - G.w / 2, p.x ?? act.pose.x));
    else {
      const { lo, hi } = sideBand(base(act.id).side, G.w);
      act.pose.y = Math.max(lo, Math.min(hi, p.y ?? act.pose.y));
    }
    render();
    return;
  }
  const c = act.cur;
  if (!c) return;
  if (c.type === 'charge') {
    if (c.stage !== 'adjust') return;
    const G = geom(byId(act.id));
    const vx = (p.x ?? act.pose.x) - c.e[0],
      vy = (p.y ?? act.pose.y) - c.e[1];
    const lim = Math.max(c.half, c.half + G.w / 2 - G.sw),
      off = Math.max(-lim, Math.min(lim, vx * c.along[0] + vy * c.along[1]));
    Object.assign(act.pose, {
      x: c.e[0] + (c.n[0] * G.d) / 2 + c.along[0] * off,
      y: c.e[1] + (c.n[1] * G.d) / 2 + c.along[1] * off
    });
    render();
    return;
  }
  if ((c.type === 'march' || c.withdraw) && c.segs) {
    marchDrag(p);
    return;
  }
  const cand = Object.assign({}, act.pose, p);
  if (c.moving) {
    let k = curCost(cand);
    if (k.cost > c.budget + 1e-6) {
      let lo = 0,
        hi = 1;
      for (let i = 0; i < 20; i++) {
        const m = (lo + hi) / 2,
          t = {
            x: c.start.x + (cand.x - c.start.x) * m,
            y: c.start.y + (cand.y - c.start.y) * m,
            facing: cand.facing
          };
        if (curCost(t).cost <= c.budget) lo = m;
        else hi = m;
      }
      cand.x = c.start.x + (cand.x - c.start.x) * lo;
      cand.y = c.start.y + (cand.y - c.start.y) * lo;
      if (curCost(cand).cost > c.budget + 1e-6) {
        toast('Not enough movement left for that.');
        return;
      }
    }
  } else if (c.type === 'creform') {
    Object.assign(act.pose, cand);
    render();
    return;
  } else if (c.reshape) {
    cand.x = c.start.x;
    cand.y = c.start.y;
  }
  Object.assign(act.pose, cand);
  render();
}
function rot(dg) {
  if (!act || !act.cur || !(act.cur.moving || act.cur.reshape)) return;
  if ((act.cur.type === 'march' || act.cur.withdraw) && act.cur.segs) {
    if (Math.abs(dg) >= 180) {
      toast('Turning around is a Reform, not a March.');
      return;
    }
    marchApply(dg > 0 ? 'wright' : 'wleft', Math.abs(dg));
    return;
  }
  if (act.cur.type === 'hammer') {
    toast('Hammer and Anvil cannot change ranks or files.');
  }
  const nf = ((((act.pose.facing || 0) + dg) % 360) + 360) % 360;
  if (act.cur.reshape) {
    const d = Math.abs(((((nf - act.cur.start.facing) % 360) + 540) % 360) - 180);
    if (d > 180) {
      toast('A Reform turns at most 180°.');
      return;
    }
  }
  setPose({ facing: nf });
}
function form(dl) {
  if (!act || !act.cur || !act.cur.reshape) return;
  if (act.cur.type === 'hammer') {
    toast('Hammer and Anvil cannot change ranks or files.');
    return;
  }
  const u = byId(act.id);
  let f = Math.max(1, Math.min(u.stands, geom(u).files + dl));
  if (act.cur.type === 'fluid' && f > 3) {
    toast('Fluid Formation keeps the front rank at 3 stands or fewer.');
    f = 3;
  }
  if (act.cur.type === 'creform') {
    const c = act.cur;
    if (f > c.start.files + 2) {
      toast('A Combat Reform can add at most 2 stands to the front rank.');
      f = c.start.files + 2;
    }
    const pos = crAnchor(c, f);
    act.pose.files = f;
    Object.assign(act.pose, pos);
    render();
    return;
  }
  act.pose.files = f;
  render();
}
