/*
 * Running Claude's turn
 *
 * Plays one regiment, runs the whole turn and shows the report afterwards.
 *
 * In this file: aiRegiment(), aiSay(), aiStepText(), aiStep(), botRun(), runAITurn(), afterAITurn(),
 *   showReport()
 */

async function aiRegiment(id, source, report, card) {
  const u0 = base(id);
  startActivation(id, source, card);
  selId = id;
  const u = byId(id);
  aiStatus(`${N(AI)} are deciding what ${u.short || u.name} will do…`);
  render();
  await aiSay(
    N(AI) + ' activate ' + (u.short || u.name),
    source === 'entourage'
      ? 'As the Entourage of its character'
      : u.onTable
        ? 'Its turn to act'
        : 'Arriving this round',
    1400
  );
  /* a Draw Event can open a fight before it acts (Aura of Death hits it as it starts its activation): resolve that
     first, then plan from what is left */
  await sleep(120);
  for (let g = 0; g < 60 && (cb || cbQueue.length); g++) {
    if (!cb) {
      await sleep(200);
      continue;
    }
    await autoResolve();
  }
  if (!act || !byId(id) || byId(id).destroyed) {
    if (act) await saveActivation();
    report.push({ title: u0.name, lines: ['destroyed by Aura of Death before it could act'], narration: '' });
    return;
  }
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
  const trebDone = P.bot && isTreb(byId(id)) ? await aiTreb(lines) : false;
  if (P.bot && !trebDone) await botRun(lines);
  else
    for (const st of steps) {
      if (!act || act.chargeFailed) break;
      if (!st || !st.do) continue;
      aiLog = lines;
      const r = await aiStep(st);
      if (r) lines.splice(lines.length, 0, r);
      await sleep(300);
    }
  aiLog = null;
  bannerHide();
  if (act && act.entering && !act.placed) {
    await exEnter({ edge: 'own', at: 36 });
  }
  if (act && act.entering && !act.actions.some(a => a.type === 'march'))
    await exMarch({ mode: 'fwd', amount: 99 });
  /* never end over Impassable terrain or a regiment (Fly): the least movement that takes it clear */
  if (act && !act.chargeFailed && endPoseWhy(byId(act.id))) {
    const q = nearestEndPose(byId(act.id));
    if (q) Object.assign(act.pose, { x: q.x, y: q.y });
  }
  /* Trample: automatic Hits on the enemy touching its front, at the end of the activation */
  if (act && tramplePending(byId(act.id))) {
    const t = frontFoes(byId(act.id))[0];
    startAction('trample');
    for (let g = 0; g < 60 && (cb || cbQueue.length); g++) {
      if (!cb) {
        await sleep(200);
        continue;
      }
      await autoResolve();
    }
    lines.push('Trample: automatic Hits on ' + (t.short || t.name));
  }
  if (act) {
    await saveActivation();
  }
  const title = u0.name + (source === 'entourage' ? ' (Entourage)' : '');
  report.push({ title, lines, narration: P.narration });
}

/* the opponent says what it is about to do, on a banner over the map, and gives you time to see it */
async function aiSay(title, text, ms) {
  banner(title, [], text, 'say');
  await sleep(ms);
}

/* a plan step in words */
function aiStepText(st) {
  const nm = id => {
    const t = byId(String(id || ''));
    return t ? t.short || t.name : 'the enemy';
  };
  const where = P => {
    if (!P || typeof P !== 'object') return describeSpec(P);
    const z = zonesOf().find(z => Math.hypot(z.x - P.x, z.y - P.y) <= 3);
    if (z) return 'the ' + z.name;
    const t = all()
      .filter(o => o.onTable && !o.destroyed && Math.hypot(o.x - P.x, o.y - P.y) <= 6)
      .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
    return t ? (t.side === AI ? 'its own ' : '') + (t.short || t.name) : 'a new position';
  };
  switch (st.do) {
    case 'enter':
      return 'Comes on from its table edge';
    case 'march':
      return st.mode ? 'Marches straight on' : 'Marches toward ' + where(st.toward);
    case 'charge':
      return 'Charges ' + nm(st.target) + '!';
    case 'clash':
      return 'Clashes with ' + nm(st.target);
    case 'volley':
      return 'Looses a Volley at ' + nm(st.target);
    case 'inspire':
      return 'Inspires its warriors (+1 Clash)';
    case 'aim':
      return 'Takes aim';
    case 'reform':
      return 'Turns to face the enemy';
    case 'withdraw':
      return 'Withdraws from the fight';
    case 'combat_reform':
      return 'Turns to face its attacker';
    case 'rally':
    case 'combat_rally':
      return 'Rallies (no longer Broken)';
    case 'cast':
      return 'Casts ' + (st.spell || 'a spell');
    default:
      return '';
  }
}

/* carry out one step of a plan; returns the line for the report */
async function aiStep(st) {
  let r = '';
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
    console.error(e);
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
  return r;
}

/* the built-in opponent: plan a step, carry it out, plan again from the new situation */
async function botRun(lines) {
  const ban = new Set();
  for (let k = 0; k < 8 && act && !act.chargeFailed; k++) {
    botCacheReset();
    let st = null;
    try {
      st = botNextStep(ban);
    } catch (e) {
      console.error(e);
    }
    if (!st) break;
    if (k === 0 && st.do !== 'enter') {
      const job = botObjOf(byId(act.id));
      if (job)
        lines.push(
          'job this round: ' + (job.kind === 'zone' ? 'zone ' : job.kind === 'foe' ? 'fight ' : '') + job.name
        );
    }
    if (k === 0 && botLast && botLast.why && st.do !== 'enter') lines.push('plan: ' + botLast.why);
    const before = act.actions.length + (act.placed ? 1 : 0);
    const u = byId(act.id),
      say = aiStepText(st);
    if (say && u) await aiSay(N(AI) + ' · ' + (u.short || u.name), say, 1300);
    aiLog = lines;
    const r = await aiStep(st);
    if (r) lines.push(r);
    const after = act ? act.actions.length + (act.placed ? 1 : 0) : before + 1;
    /* nothing happened: do not try the same step again */
    if (after === before) ban.add(JSON.stringify(st));
    await sleep(800);
  }
  aiLog = null;
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
      await aiSay(
        N(AI) + ' · the ' + u.charName,
        d.char === 'cast'
          ? 'Casts ' +
              d.spell +
              (d.target && byId(d.target) ? ' on ' + (byId(d.target).short || byId(d.target).name) : '')
          : d.char === 'ability' || d.char === 'duel'
            ? /^duel$/i.test(String(d.ability || '')) || d.char === 'duel'
              ? 'Challenges to a Duel'
              : 'Uses ' + d.ability
            : d.char === 'rally'
              ? 'Rallies its Broken regiment'
              : 'Takes no action',
        1400
      );
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
      } else if (d.char === 'rally') {
        await charCommit(id, { note: 'Rallied its regiment: no longer Broken.', rally: true });
        line = `the ${u.charName} rallies its regiment: it is no longer Broken`;
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
