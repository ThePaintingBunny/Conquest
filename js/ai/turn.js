/*
 * Running Claude's turn
 *
 * Plays one regiment, runs the whole turn and shows the report afterwards.
 *
 * In this file: aiRegiment(), runAITurn(), afterAITurn(), showReport()
 */

async function aiRegiment(id, source, report, card) {
  const u0 = base(id);
  startActivation(id, source, card);
  selId = id;
  const u = byId(id);
  aiStatus(`${N(AI)} are deciding what ${u.short || u.name} will do…`);
  const P = await planActivation(u, source);
  aiStatus(`${N(AI)}: ${u.short || u.name} is acting.`);
  const lines = [];
  let steps = P.plan.slice(0, 8);
  if (act.entering && !steps.some(s => s && s.do === 'enter'))
    steps.unshift({ do: 'enter', edge: 'own', at: 36 });
  if (
    !steps.some(
      s =>
        s &&
        s.do === 'faction' &&
        /^(Famine|War|Death|Conquest|Ka|Chi|Fu|Sui|Mu)\b|Chant Marker|Ideal Card activated/i.test(
          String(s.option || '')
        )
    )
  )
    await aiAutoFaction(byId(id), lines);
  for (const st of steps) {
    if (!act || act.chargeFailed) break;
    if (!st || !st.do) continue;
    let r = '';
    aiLog = lines;
    try {
      switch (st.do) {
        case 'enter':
          if (act.entering && !act.placed) r = await exEnter(st);
          break;
        case 'march':
          r = await exMarch(st);
          break;
        case 'reform':
          r = await exReform(st);
          break;
        case 'charge':
          r = await exCharge(st);
          break;
        case 'clash':
          r = await exClash(st);
          break;
        case 'volley':
          r = await exVolley(st);
          break;
        case 'inspire':
          r = await exSimple('inspire', 'inspires its warriors');
          break;
        case 'aim':
          r = await exSimple('aim', 'takes aim');
          break;
        case 'rally':
          r = await exSimple('rally', 'rallies');
          break;
        case 'combat_rally':
          r = await exSimple('crally', 'rallies in combat');
          break;
        case 'combat_reform':
          r = await exCReform();
          break;
        case 'withdraw':
          r = await exWithdraw();
          break;
        case 'faction':
          r = await exFaction(st);
          break;
        case 'cast':
          r = await exRegCast(st);
          break;
        case 'memory':
          r = await exSimple('memory', 'recalls its Memory of Old');
          break;
        case 'occupy':
          r = await exSimple('occupy', 'occupies the building');
          break;
        case 'leave':
          r = await exSimple('leave', 'leaves the building');
          break;
        default:
          r = '';
      }
    } catch (e) {
      r = 'could not ' + st.do;
      if (act && act.cur) {
        try {
          cancelAction();
        } catch (_) {
          act.cur = null;
        }
      }
      cb = null;
      renderCombat();
    }
    if (r) lines.splice(lines.length, 0, r);
    await sleep(300);
  }
  aiLog = null;
  if (act && act.entering && !act.placed) {
    await exEnter({ edge: 'own', at: 36 });
  }
  if (act && act.entering && !act.actions.some(a => a.type === 'march'))
    await exMarch({ mode: 'fwd', amount: 99 });
  if (act) {
    await saveActivation();
  }
  const title = u0.name + (source === 'entourage' ? ' (Entourage)' : '');
  report.push({ title, lines, narration: P.narration });
}

async function runAITurn() {
  if (PVP()) return;
  if (aiBusy || !state || !db) return;
  if (act) {
    toast('Finish or undo your activation first.');
    return;
  }
  aiBusy = true;
  aiNotes = [];
  render();
  const report = [];
  try {
    let st = validCards(state.aiStack || []);
    if (!st.length) st = defaultStack();
    let card = st.shift();
    if (!card) {
      aiBusy = false;
      await afterAITurn([]);
      return;
    }
    await putState({ aiStack: st, turn: AI, phase: 'Round ' + state.round + ' · ' + N(AI) + ' are acting' });
    let id = (cardPick(card) || {}).id || card.slice(2),
      yIdeal = null;
    if (yCard(card)) {
      /* an Ideal Card: its own entry first, otherwise any Yoroni regiment or character still to act */ yIdeal =
        card;
      const own = base(card.slice(2)),
        asC = card[0] === 'c',
        U = (state.units || []).filter(u => u.side === AI);
      const pick =
        (own && ySame(card, own, asC) && [own, asC]) ||
        (x => x && [x, asC])(U.find(u => ySame(card, u, asC))) ||
        (x => x && [x, !asC])(U.find(u => ySame(card, u, !asC)));
      if (pick) {
        id = pick[0].id;
        card = (pick[1] ? 'c:' : 'u:') + id;
      }
    }
    if (card[0] === 'c') {
      await darkHandAI(byId(id));
      const u = byId(id);
      aiStatus(`${N(AI)}: the ${u.charName} is deciding…`);
      const d = await planCharacter(u);
      const cl = [];
      for (const x of (Array.isArray(d.draws) ? d.draws : []).slice(0, 3)) {
        const a = chAbil(byId(id)).find(
          q => q.kind === 'draw' && q.n.toLowerCase() === String(x.ability || '').toLowerCase()
        );
        if (a) {
          const r = await useAbil(id, a.n, x.target);
          if (r) cl.push(r);
        }
      }
      let line;
      if (d.char === 'cast') {
        const r = await aiCastSpell(byId(id), true, d.spell, d.target);
        if (r) {
          const r2 = await srAiExtra(byId(id), d.spell);
          line = `the ${u.charName} ${r}` + r2;
          await charCommit(id, { spell: d.spell, note: r + r2 + '.' });
        } else line = await aiCast(id, d.spell, d.target);
      } else if (d.char === 'duel' || (d.char === 'ability' && /^duel$/i.test(String(d.ability || '')))) {
        line = `the ${u.charName}: ` + (await aiDuel(id, d.target));
      } else if (d.char === 'ability') {
        const a = chAbil(byId(id)).find(
          q => q.kind === 'action' && q.n.toLowerCase() === String(d.ability || '').toLowerCase()
        );
        if (a) {
          const r = await useAbil(id, a.n, d.target);
          await charCommit(id, { note: 'Used ' + a.n + '.' });
          line = r;
        } else {
          await charCommit(id, { note: 'No action.' });
          line = `the ${u.charName} takes no action`;
        }
      } else {
        await charCommit(id, { note: 'No action.' });
        line = `the ${u.charName} takes no action`;
      }
      report.push({ title: u.charName, lines: cl.concat([line]), narration: String(d.narration || '') });
      const nx = validCards(state.aiStack || [])[0];
      if (nx && nx[0] === 'u' && sameCard(nx, byId(id)) && !noEntourage(byId(id))) {
        await putState({ aiStack: validCards(state.aiStack || []).slice(1) });
        await aiRegiment(id, 'entourage', report);
      }
    } else await aiRegiment(id, 'command', report, yIdeal);
  } catch (e) {
    report.push({
      title: 'Problem',
      lines: ['The ' + N(AI) + ' turn stopped early: ' + ((e && e.message) || e)],
      narration: ''
    });
    act = null;
    cb = null;
  }
  aiBusy = false;
  bannerHide();
  aiStatus('');
  showReport(report);
  await afterAITurn(report);
}

async function afterAITurn(report) {
  const hu = humanCardsLeft(),
    ai = aiCardsLeft();
  if (hu > 0) setTimeout(() => turnNotice(N(AI) + ' finished their turn · your turn'), 400);
  if (mwExtra(AI) && ai > 0) {
    await putState({ sup: supMemo(AI, { mwR: srRnd() }) });
    await sleep(800);
    return runAITurn();
  }
  if (hu > 0) {
    await putState({ turn: HU, phase: 'Round ' + state.round + ' · Your turn' });
    return;
  }
  if (ai > 0) {
    await sleep(1500);
    return runAITurn();
  }
  await endRound();
}

function showReport(report) {
  const box = $('ai-report');
  if (!report.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const body = $('air-body');
  body.innerHTML = '';
  $('air-title').textContent = N(AI) + "' turn";
  report.forEach(r => {
    const h = document.createElement('p');
    h.className = 'air-h';
    h.textContent = r.title;
    body.appendChild(h);
    if (r.narration) {
      const q = document.createElement('p');
      q.className = 'air-n';
      q.textContent = '“' + r.narration + '”';
      body.appendChild(q);
    }
    const ul = document.createElement('ul');
    ul.className = 'log';
    r.lines.forEach(l => {
      const li = document.createElement('li');
      li.textContent = l;
      ul.appendChild(li);
    });
    body.appendChild(ul);
  });
  aiNotes.forEach(n => body.appendChild(ptext(n, 'warn')));
  try {
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {}
}
