/* Rounds and the Reinforcement Phase. */
/* ---------- rounds ---------- */
function roundKills(side) {
  const R = state.round;
  let v = 0;
  const why = [];
  (state.units || [])
    .filter(u => u.side !== side && u.destroyed && u.destroyedRound === R)
    .forEach(u => {
      v += 2;
      why.push(u.name + ' destroyed 2');
      if (u.charName) {
        v += 2;
        why.push(u.charName + ' slain 2');
        if (u.warlord) {
          v += 2;
          why.push('enemy Warlord 2');
        }
      }
    });
  return { v, why };
}
/* Prince of the Setting Moon (Sorcerer Kings Warlord Mastery): at the start of the Victory Phase, while the character
   is on the table, friendly Mortal regiments within range of an Objective Zone heal 3 wounds */
async function skPrince() {
  let units = state.units;
  const notes = [];
  ['cs', 'nord'].forEach(side => {
    const wl = supWl(side);
    if (!wl || wl.destroyed || !wl.onTable || !upgOf(wl, /Prince of the Setting Moon/)) return;
    units = units.map(x => {
      if (x.side !== side || !x.onTable || x.destroyed || !(+x.wounds > 0)) return x;
      if (!supRoles(x).includes('Mortals') || !inObjZone(x) || !canHeal(x)) return x;
      const h = Math.min(3, +x.wounds);
      notes.push((x.short || x.name) + ' ' + h);
      return Object.assign({}, x, { wounds: x.wounds - h });
    });
  });
  if (notes.length)
    await putState({
      units,
      lastTitle: 'Prince of the Setting Moon',
      lastText: 'Heals: ' + notes.join(', ') + '.'
    });
}
async function endRound() {
  if (!state) return;
  try {
    await skPrince();
  } catch (e) {}
  const R = state.round || 1,
    vp = Object.assign({ cs: 0, nord: 0 }, state.vp || {}),
    SR = scoreRound(R),
    add = SR.add,
    lines = SR.lines;
  vp.cs += add.cs;
  vp.nord += add.nord;
  const rep = [
    {
      title: 'Round ' + R + ' scored',
      lines: [
        `${N('cs')} +${add.cs}: ${lines.cs.join(', ') || 'nothing'}`,
        `${N('nord')} +${add.nord}: ${lines.nord.join(', ') || 'nothing'}`,
        `Score: ${N('cs')} ${vp.cs}, ${N('nord')} ${vp.nord}`
      ],
      narration: ''
    }
  ];
  const last = state.maxRounds || 10;
  if (R >= last) {
    await putState({
      vp,
      step: 'over',
      turn: null,
      phase:
        'Game over · ' + (vp.cs === vp.nord ? 'a draw' : (vp.cs > vp.nord ? N('cs') : N('nord')) + ' win'),
      lastTitle: 'Final score',
      lastText: rep[0].lines.join(' · ')
    });
    showReport(rep);
    $('air-title').textContent = 'Victory Phase';
    return;
  }
  const FRE = frRoundEnd(state.units || [], R + 1);
  const units = FRE.units.map(u =>
    Object.assign({}, u, {
      activated: false,
      charActivated: false,
      effects: (u.effects || []).filter(e => e === 'Broken' || /^Season: /.test(e))
    })
  );
  const RLn = { cs: rlCompute('cs', units), nord: rlCompute('nord', units) };
  await putState({
    ovr: null,
    fr: FRE.fr,
    vp,
    units,
    rl: RLn,
    rlStart: RLn,
    round: R + 1,
    step: 'reinforce',
    turn: null,
    picks: {},
    ready: {},
    reinfTurn: 'cs',
    chooser: null,
    aiStack: [],
    huStack: [],
    huHeld: null,
    huLastCard: null,
    strategicHeld: false,
    hammerUsed: false,
    moves: [],
    phase: 'Round ' + (R + 1) + ' · Reinforcements',
    lastTitle: 'Round ' + R + ' scored',
    lastText: rep[0].lines.join(' · ')
  });
  showReport(rep);
  $('air-title').textContent = 'Victory Phase';
}
/* pick which regiments of a weight class arrive after rolling for the whole class */
function reinfChoose(g, succ, side) {
  return new Promise(res => {
    bannerHide();
    let dg = $('rf-dlg');
    if (!dg) {
      dg = document.createElement('dialog');
      dg.id = 'rf-dlg';
      dg.className = 'en-dlg set-dlg';
      dg.setAttribute('aria-labelledby', 'rf-h');
      document.body.appendChild(dg);
      dg.addEventListener('cancel', e => e.preventDefault());
    }
    dg.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'en-head';
    const h = document.createElement('h2');
    h.id = 'rf-h';
    h.textContent = 'Reinforcements: ' + g.cls;
    head.append(h);
    dg.appendChild(head);
    const body = document.createElement('div');
    body.className = 'set-body';
    const d = document.createElement('div');
    d.className = 'drow';
    g.dice.forEach(v => d.appendChild(dieMini(v, v <= g.need ? 'hit' : 'miss')));
    body.appendChild(d);
    const p = document.createElement('p');
    p.textContent = `You rolled ${succ} success${succ === 1 ? '' : 'es'} (${g.need} or less) for ${g.units.length} ${g.cls} regiments. Choose the ${succ} that arrive${succ === 1 ? 's' : ''}.`;
    body.appendChild(p);
    const sel = new Set();
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn';
    const upd = () => {
      go.disabled = sel.size !== succ;
      go.textContent = sel.size === succ ? 'These arrive' : 'Choose ' + (succ - sel.size) + ' more';
    };
    g.units.forEach(u => {
      const l = document.createElement('label');
      l.className = 'set-row';
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.onchange = () => {
        if (c.checked) {
          if (sel.size >= succ) {
            c.checked = false;
            return;
          }
          sel.add(u);
        } else sel.delete(u);
        upd();
      };
      const t = document.createElement('span');
      t.textContent =
        (u.short || u.name) +
        ' · ' +
        (u.cls || '') +
        (u.charName ? ' · with ' + u.charName : '') +
        (u.points ? ' · ' + u.points + ' pts' : '');
      l.append(c, t);
      body.appendChild(l);
    });
    go.onclick = () => {
      dg.close();
      res(g.units.filter(u => sel.has(u)));
    };
    upd();
    body.appendChild(go);
    dg.appendChild(body);
    dg.showModal();
  });
}
/* Reinforcement Phase: one panel per army with the dice, what they needed, who arrives and why; it waits for the player */
function reinfPanel(side, G, auto, noL, mine) {
  return new Promise(done => {
    bannerHide();
    let dg = $('rf-dlg');
    if (!dg) {
      dg = document.createElement('dialog');
      dg.id = 'rf-dlg';
      dg.className = 'en-dlg set-dlg';
      dg.setAttribute('aria-labelledby', 'rf-h');
      document.body.appendChild(dg);
      dg.addEventListener('cancel', e => e.preventDefault());
    }
    const R = state.round || 1;
    dg.innerHTML = '';
    const head = bEl('div', { className: 'en-head' });
    head.append(bEl('h2', { id: 'rf-h', textContent: 'Reinforcements · ' + N(side) + ' · Round ' + R }));
    dg.append(head);
    const body = bEl('div', { className: 'set-body' });
    dg.append(body);
    const picks = new Map(),
      need = [];
    body.append(
      ptext(
        'Regiments in reserve roll one die each, by weight class. A die succeeds on the number shown or less; each success lets one regiment of that class arrive.'
      )
    );
    if (auto.length) {
      const sec = bEl('div', { className: 'rf-sec' });
      sec.append(bEl('h3', { textContent: 'Arrive without a roll' }));
      const ul = bEl('ul', { className: 'rf-ul' });
      auto.forEach(t => ul.append(bEl('li', { textContent: t })));
      sec.append(ul);
      body.append(sec);
    }
    G.forEach((g, gi) => {
      const sec = bEl('div', { className: 'rf-sec' }),
        n = g.units.length,
        succ = g.dice.filter(v => v <= g.need).length;
      sec.append(bEl('h3', { textContent: g.cls + ' regiments (' + n + ')' }));
      sec.append(ptext('Round ' + R + ': each die succeeds on ' + g.need + ' or less.'));
      const dr = bEl('div', { className: 'drow' });
      g.dice.forEach((v, i) =>
        dr.append(dieMini(v, v <= g.need ? 'hit' : 'miss', 'rf' + R + side + gi + '-' + i + '-' + v))
      );
      sec.append(dr);
      g.notes.forEach(t => sec.append(ptext(t)));
      sec.append(
        bEl('p', {
          className: 'rf-res ' + (succ ? 'ok' : 'no'),
          textContent:
            succ +
            ' of ' +
            n +
            ' succeed' +
            (succ >= n ? ': all arrive.' : !succ ? ': none arrive this round.' : ': ' + succ + ' may arrive.')
        })
      );
      const ul = bEl('ul', { className: 'rf-ul' });
      if (succ >= n || !succ) {
        picks.set(g, succ ? g.units.slice() : []);
        g.units.forEach(u =>
          ul.append(
            bEl('li', { textContent: (u.short || u.name) + (succ ? ' arrives' : ' stays in reserve') })
          )
        );
        sec.append(ul);
      } else if (mine) {
        const sel = new Set();
        need.push(() => sel.size === succ);
        sec.append(ptext('Choose the ' + succ + ' that arrive' + (succ === 1 ? 's' : '') + ':'));
        g.units.forEach(u => {
          const l = bEl('label', { className: 'set-row' });
          const c = bEl('input', { type: 'checkbox' });
          c.onchange = () => {
            if (c.checked) {
              if (sel.size >= succ) {
                c.checked = false;
                return;
              }
              sel.add(u);
            } else sel.delete(u);
            picks.set(
              g,
              g.units.filter(x => sel.has(x))
            );
            upd();
          };
          l.append(
            c,
            bEl('span', {
              textContent:
                (u.short || u.name) +
                ' · ' +
                (u.cls || '') +
                (u.charName ? ' · with ' + u.charName : '') +
                (u.points ? ' · ' + u.points + ' pts' : '')
            })
          );
          sec.append(l);
        });
        picks.set(g, []);
      } else {
        const pk = g.units
          .slice()
          .sort((a, b) => (+b.points || 0) - (+a.points || 0))
          .slice(0, succ);
        picks.set(g, pk);
        g.units.forEach(u =>
          ul.append(
            bEl('li', {
              textContent: (u.short || u.name) + (pk.includes(u) ? ' arrives (chosen)' : ' stays in reserve')
            })
          )
        );
        sec.append(ul);
      }
      body.append(sec);
    });
    if (noL.length) {
      const sec = bEl('div', { className: 'rf-sec' });
      sec.append(bEl('h3', { textContent: 'Cannot arrive yet' }));
      const ul = bEl('ul', { className: 'rf-ul' });
      noL.forEach(u =>
        ul.append(
          bEl('li', {
            textContent:
              (u.short || u.name) +
              ' · ' +
              (/Heavy/.test(u.cls || '')
                ? 'Heavy regiments cannot roll before round 3'
                : 'Medium regiments cannot roll before round 2')
          })
        )
      );
      sec.append(ul);
      body.append(sec);
    }
    const go = bEl('button', { type: 'button', className: 'btn' });
    const upd = () => {
      const ok = need.every(f => f());
      go.disabled = !ok;
      go.textContent = ok ? 'Continue' : 'Choose which regiments arrive';
    };
    go.onclick = () => {
      dg.close();
      done(picks);
    };
    upd();
    body.append(bEl('div', { className: 'row' }, [go]));
    dg.showModal();
  });
}
function reinfRule(cls, R) {
  const c = /Light/.test(cls || '') ? 'L' : /Heavy/.test(cls || '') ? 'H' : 'M';
  if (c === 'L') return R >= 3 ? 'auto' : 'roll4';
  if (c === 'M') return R <= 1 ? 'no' : R === 2 ? 'roll2' : R === 3 ? 'roll4' : 'auto';
  return R <= 2 ? 'no' : R === 3 ? 'roll2' : R === 4 ? 'roll4' : 'auto';
}
function reserves(side) {
  return (state.units || []).filter(u => u.side === side && !u.onTable && !u.arriving && !u.destroyed);
}
async function doReinforcements(humanAuto) {
  const R = state.round,
    out = [];
  const units = (state.units || []).map(u => Object.assign({}, u));
  if (R === 1 && !PVP())
    units.forEach(u => {
      if (u.side === AI && privOk(u)) u.cls = u.cls.replace(/Light/, 'Medium');
    });
  const roll = async (side, autoId) => {
    const res = [],
      rollers = [],
      noL = [];
    const pool = units.filter(u => u.side === side && !u.onTable && !u.arriving && !u.destroyed);
    const M = state.mm && state.mm.r === R ? state.mm : null,
      xId = M && M.ans === 'accept' ? (M.pick || {})[side] : null;
    let rrL = M && M.ans === 'decline' && M.by === side && M.opt === 'reroll' ? 1 : 0;
    for (const u of pool) {
      const rule = reinfRule(u.cls, R);
      if (
        rule !== 'no' &&
        (hasRule(u, /^Flank/) ||
          (u.char != null &&
            (rh(chRulesX(u), 'Forward Force') || supForwardForce(u)) &&
            u.type !== 'monster'))
      ) {
        u.arriving = true;
        res.push(u.name + ' arrives (Flank: kept out of the roll)');
        continue;
      }
      if (u.arriving) continue;
      if (xId && u.id === xId && rule !== 'no') {
        u.arriving = true;
        Object.assign(u, grantU(u, 'Master Manipulator (Vanguard (3))', ['Vanguard (3)']));
        res.push(u.name + ' arrives (Master Manipulator, Vanguard (3))');
        continue;
      }
      if (u.id === autoId && rule !== 'no') {
        u.arriving = true;
        res.push(u.name + ' arrives (chosen)');
        {
          const t2 = supTactical(side, pool, autoId);
          if (t2) {
            t2.arriving = true;
            res.push(t2.name + ' arrives (Tactical Superiority)');
          }
        }
        if (rh(u.rules, 'Tidal Summons')) {
          const w = pool.find(
            x => x !== u && !x.arriving && rh(x.rules, 'Water Elemental') && reinfRule(x.cls, R) !== 'no'
          );
          if (w) {
            w.arriving = true;
            res.push(w.name + ' arrives (Tidal Summons)');
          }
        }
        continue;
      }
      if (rule === 'auto') {
        u.arriving = true;
        res.push(u.name + ' arrives automatically');
        continue;
      }
      if (rule === 'no') {
        noL.push(u);
        continue;
      }
      rollers.push(u);
    }
    /* each weight class rolls its dice together; the player then picks which regiments of that class arrive */
    const W = u => (/Light/.test(u.cls || '') ? 'Light' : /Heavy/.test(u.cls || '') ? 'Heavy' : 'Medium');
    const groups = {};
    rollers.forEach(u => {
      const need = supReinfNeed(u, reinfRule(u.cls, R) === 'roll4' ? 4 : 2),
        k = W(u) + '|' + need;
      (groups[k] = groups[k] || { cls: W(u), need, units: [], dice: [] }).units.push(u);
    });
    const G = Object.values(groups);
    for (const g of G) {
      g.dice = g.units.map(() => d6());
      g.first = g.dice.slice();
      g.notes = [];
    }
    if (rrL) {
      const g = G.find(g => g.dice.some(v => v > g.need));
      if (g) {
        const i = g.dice.findIndex(v => v > g.need),
          v1 = g.dice[i];
        g.dice[i] = d6();
        rrL = 0;
        g.notes.push('Master Manipulator re-rolled a ' + v1 + ': now ' + g.dice[i] + '.');
      }
    }
    if (supK(side) === 'Infantry Tactics' && !supMem(side).itUsed) {
      const fails = G.reduce((a, g) => a + g.dice.filter(v => v > g.need).length, 0);
      if (fails >= 2 || (fails && R >= 4)) {
        state.sup = supMemo(side, { itUsed: true });
        res.push('Infantry Tactics: every failed Reinforcement Roll is re-rolled (once per game)');
        for (const g of G) {
          const ix = g.dice.map((v, i) => (v > g.need ? i : -1)).filter(i => i >= 0);
          if (!ix.length) continue;
          const was = ix.map(i => g.dice[i]);
          ix.forEach(i => {
            g.dice[i] = d6();
          });
          g.notes.push(
            'Infantry Tactics re-rolled the failures (' +
              was.join(', ') +
              '): now ' +
              ix.map(i => g.dice[i]).join(', ') +
              '.'
          );
        }
      }
    }
    bannerHide();
    const mine = (PVP() && side === ME) || (!PVP() && side === HU) || SBX();
    const PK =
      G.length || noL.length || res.length ? await reinfPanel(side, G, res.slice(), noL, mine) : new Map();
    for (const g of G) {
      const succ = g.dice.filter(v => v <= g.need).length;
      let pick = PK.get(g);
      if (!pick) {
        if (succ >= g.units.length) pick = g.units.slice();
        else if (!succ) pick = [];
        else
          pick = g.units
            .slice()
            .sort((a, b) => (+b.points || 0) - (+a.points || 0))
            .slice(0, succ);
      }
      res.push(g.cls + ': rolled ' + g.dice.join(', ') + ' → ' + succ + ' of ' + g.units.length + ' arrive');
      g.units.forEach(u => {
        if (pick.includes(u)) {
          u.arriving = true;
          res.push(u.name + ' arrives');
        } else res.push(u.name + ' stays back');
      });
    }
    supAfterReinf(side, units, res);
    if (M && M.ans === 'decline' && M.by === side && M.opt === 'vanguard' && M.vg) {
      const t = units.find(x => x.id === M.vg && !x.onTable);
      if (t) {
        Object.assign(t, grantU(t, 'Master Manipulator (Vanguard (3))', ['Vanguard (3)']));
        res.push(t.name + ' gains Vanguard (3) (Master Manipulator)');
      }
    }
    return res;
  };
  const hl = await roll(HU, humanAuto);
  if (PVP()) {
    bannerHide();
    const nxt = HU === 'cs' ? { reinfTurn: 'nord' } : { reinfTurn: 'done' };
    await putState(Object.assign({ units }, nxt));
    out.push({ title: N(HU) + ' reinforcements', lines: hl.length ? hl : ['none'], narration: '' });
    return out;
  }
  const aiPool = units.filter(
    u =>
      u.side === AI &&
      !u.onTable &&
      !u.arriving &&
      !u.destroyed &&
      reinfRule(u.cls, R) !== 'no' &&
      reinfRule(u.cls, R) !== 'auto'
  );
  const rank = u => {
    const r = reinfRule(u.cls, R);
    return r === 'roll2' ? 0 : 1;
  };
  const aiAuto = aiPool.sort((a, b) => rank(a) - rank(b))[0];
  const al = await roll(AI, aiAuto && aiAuto.id);
  bannerHide();
  await putState({ units });
  out.push(
    { title: N(HU) + ' reinforcements', lines: hl.length ? hl : ['none'], narration: '' },
    { title: N(AI) + ' reinforcements', lines: al.length ? al : ['none'], narration: '' }
  );
  return out;
}
async function startCommandPhase(rep) {
  if (PVP()) {
    await putState({
      step: 'supremacy',
      ready: {},
      phase: 'Round ' + state.round + ' · Command Phase',
      lastTitle: 'Reinforcements done',
      lastText:
        (rep || []).map(r => r.title + ': ' + r.lines.join(', ')).join(' · ') || 'Both armies have rolled.'
    });
    return;
  }
  aiStatus(N(AI) + ' are arranging their Command Stack…');
  aiBusy = true;
  render();
  const P = await planRound();
  let FL = [];
  try {
    FL = await aiFactionRound(P.faction);
  } catch (e) {}
  aiBusy = false;
  aiStatus('');
  if (FL.length) rep.push({ title: N(AI) + ' faction rules', lines: FL, narration: '' });
  let units = state.units;
  if (P.effects.length) {
    units = (state.units || []).map(u => {
      const fxs = P.effects
        .filter(e => e && e.unit === u.id && u.side === AI && e.effect)
        .map(e => String(e.effect).slice(0, 80));
      return fxs.length ? Object.assign({}, u, { effects: (u.effects || []).concat(fxs) }) : u;
    });
  }
  await putState({
    units,
    aiStack: P.stack,
    aiFirst: P.first,
    aiSupWant: P.sup == null ? null : P.sup,
    step: 'supremacy',
    phase: 'Round ' + state.round + ' · Supremacy',
    lastTitle: N(AI) + ' have set their Command Stack',
    lastText: (P.intent ? '“' + P.intent + '” ' : '') + 'Roll off for Supremacy.'
  });
  if (P.effects.length)
    rep.push({
      title: N(AI) + ' round effects',
      lines: P.effects
        .filter(e => e && e.effect)
        .map(e => `${(base(e.unit) || {}).name || e.unit}: ${e.effect}`),
      narration: ''
    });
  if (P.intent) rep.push({ title: N(AI) + ' plan', lines: [], narration: P.intent });
  showReport(rep);
  $('air-title').textContent = 'Round ' + state.round;
}
async function rollSupremacyPvp() {
  const cc = cardsTotal('cs'),
    cn = cardsTotal('nord');
  let a,
    b,
    ma,
    mb,
    n = 0;
  do {
    a = d6();
    b = d6();
    ma = Math.max(0, a - (cc < cn ? 1 : 0));
    mb = Math.max(0, b - (cn < cc ? 1 : 0));
    banner(
      'Supremacy roll-off',
      [
        { v: a, cls: ma <= mb ? 'hit' : 'miss' },
        { v: b, cls: mb <= ma ? 'hit' : 'miss' }
      ],
      `${N('cs')} ${a}${cc < cn ? ' − 1' : ''} · ${N('nord')} ${b}${cn < cc ? ' − 1' : ''} (fewer Command Cards subtracts 1; lowest wins)`
    );
    await sleep(2400);
    n++;
  } while (ma === mb && n < 10);
  bannerHide();
  let win = ma < mb ? 'cs' : 'nord';
  totAdd({ cs: a, nord: b });
  await putState({
    step: 'choose',
    chooser: win,
    phase: 'Round ' + state.round + ' · ' + N(win) + ' won Supremacy',
    lastTitle: 'Supremacy',
    lastText: `${N('cs')} rolled ${a}${cc < cn ? ' (−1)' : ''}, ${N('nord')} rolled ${b}${cn < cc ? ' (−1)' : ''}. Lowest wins: ${N(win)} choose who goes first.`
  });
}
async function rollSupremacy() {
  if (PVP()) return rollSupremacyPvp();
  const ch = cardsTotal(HU),
    ca = cardsTotal(AI);
  let a,
    b,
    ma,
    mb,
    n = 0;
  do {
    a = d6();
    b = d6();
    ma = Math.max(0, a - (ch < ca ? 1 : 0));
    mb = Math.max(0, b - (ca < ch ? 1 : 0));
    banner(
      'Supremacy roll-off',
      [
        { v: a, cls: ma <= mb ? 'hit' : 'miss' },
        { v: b, cls: mb <= ma ? 'hit' : 'miss' }
      ],
      `${N(HU)} ${a}${ch < ca ? ' − 1' : ''} · ${N(AI)} ${b}${ca < ch ? ' − 1' : ''} (fewer Command Cards subtracts 1; lowest wins)`
    );
    await sleep(2400);
    n++;
  } while (ma === mb && n < 10);
  bannerHide();
  let huWins = ma < mb;
  totAdd({ [HU]: a, [AI]: b });
  {
    const h = aolTry(HU),
      q = aolTry(AI),
      hp = h && h.isP,
      ap = q && q.isP;
    if (hp && !ap) {
      huWins = true;
      state.sup = supMemo(HU, { aolUsed: true });
      toast('Army of Lions: your top card is a Polemarch, so you win the Supremacy roll-off.');
    } else if (ap && !hp) {
      huWins = false;
      state.sup = supMemo(AI, { aolUsed: true });
      toast('Army of Lions: ' + N(AI) + ' reveal a Polemarch and win the Supremacy roll-off.');
    }
  }
  if (huWins) {
    await putState({
      step: 'choose',
      phase: 'Round ' + state.round + ' · You won Supremacy',
      lastTitle: 'Supremacy',
      lastText: `${N(HU)} ${ma} against ${N(AI)} ${mb}: you choose who goes first.`
    });
    return;
  }
  const first = state.aiFirst !== false ? AI : HU;
  await putState({
    lastTitle: 'Supremacy',
    lastText: `${N(AI)} ${mb} against ${N(HU)} ${ma}: ${N(AI)} win and ${first === AI ? 'go first' : 'let you go first'}.`
  });
  await afterSupremacy(first);
}
async function chooseFirst(side) {
  await afterSupremacy(side);
}
