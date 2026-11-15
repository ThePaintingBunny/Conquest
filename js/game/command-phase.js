/*
 * Command Phase and Supremacy roll
 *
 * Starts the Command Phase and rolls off for Supremacy.
 *
 * In this file: startCommandPhase(), rollSupremacyPvp(), rollSupremacy(), chooseFirst()
 */

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
