/*
 * Picks after Supremacy
 *
 * The choices some scenarios ask for after the Supremacy roll, then the start of the activations.
 *
 * In this file: pickOptions(), aiPick(), afterSupremacy(), afterSupremacy0(), nextPick(), humanPick(),
 *   startActivations(), picksText()
 */

/* scenario picks after Supremacy */
function pickOptions(side) {
  const sc = scenOf(),
    id = scenId(),
    zs = zonesOf();
  const p = state.picks || {};
  if (sc.pick === 'deny') return zs.filter(z => z.name !== p[side === 'cs' ? 'nord' : 'cs']).map(z => z.name);
  if (sc.pick === 'secret') return zs.filter(z => z.name !== 'Centre').map(z => z.name);
  if (sc.pick === 'grind')
    return zs
      .filter(
        z =>
          z.size === 6 &&
          !all().some(
            u =>
              u.side === side &&
              !isMarker(u) &&
              u.onTable &&
              !u.destroyed &&
              standsOf(u).some(s => inZone(s.poly, z))
          )
      )
      .map(z => z.name);
  return [];
}

function aiPick() {
  const sc = scenOf(),
    opts = pickOptions(AI);
  if (!opts.length) return null;
  const zc = zoneControl();
  const score = n => {
    const z = zc.find(q => q.name === n);
    return z ? z : { tot: { cs: 0, nord: 0 } };
  };
  if (sc.pick === 'grind') {
    const mine = all().filter(u => u.side === AI && u.onTable && !isMarker(u));
    return opts
      .map(n => {
        const z = zonesOf().find(q => q.name === n);
        return { n, d: Math.min(99, ...mine.map(u => Math.hypot(u.x - z.x, u.y - z.y))) };
      })
      .sort((a, b) => a.d - b.d)[0].n;
  }
  const hu = all().filter(u => u.side === HU && u.onTable && !isMarker(u));
  return opts
    .map(n => {
      const z = zonesOf().find(q => q.name === n);
      return { n, d: Math.min(99, ...hu.map(u => Math.hypot(u.x - z.x, u.y - z.y))) - score(n).tot.cs * 2 };
    })
    .sort((a, b) => a.d - b.d)[0].n;
}

async function afterSupremacy(first) {
  if (await supStart(first)) return;
  await afterSupremacy0(first);
}

async function afterSupremacy0(first) {
  try {
    await skVizier();
  } catch (e) {}
  const sc = scenOf();
  if (!sc.pick) {
    await startActivations(first);
    return;
  }
  await putState({ step: 'picks', first, picks: {}, phase: 'Round ' + state.round + ' · Scenario choice' });
  await nextPick();
}

async function nextPick() {
  const p = state.picks || {},
    first = state.first,
    second = first === HU ? AI : HU,
    order = [first, second];
  const who = order.find(s => !p[s]);
  if (!who) {
    await startActivations(first);
    return;
  }
  if (PVP()) {
    if (!pickOptions(who).length) {
      await putState({ picks: Object.assign({}, p, { [who]: 'none' }) });
      return nextPick();
    }
    render();
    return;
  }
  if (who === AI) {
    const n = aiPick();
    await putState({ picks: Object.assign({}, p, { [AI]: n || 'none' }) });
    return nextPick();
  }
  if (!pickOptions(HU).length) {
    await putState({ picks: Object.assign({}, p, { [HU]: 'none' }) });
    return nextPick();
  }
  render();
}

async function humanPick(n) {
  await putState({ picks: Object.assign({}, state.picks || {}, { [HU]: n }) });
  await nextPick();
}

async function startActivations(first) {
  await putState({
    step: 'activations',
    turn: first,
    phase:
      'Round ' +
      state.round +
      ' · ' +
      (PVP() ? N(first) + ' go first' : first === AI ? N(AI) + ' go first' : 'Your turn')
  });
  if (first === AI && !PVP()) runAITurn();
}

function picksText() {
  const sc = scenOf(),
    p = state.picks || {};
  if (!sc.pick) return '';
  const show = s => (p[s] && p[s] !== 'none' ? p[s] : 'none');
  if (sc.pick === 'secret') return ` Your secret pick: ${show(HU)}.`;
  return ` Picks: you ${show(HU)}, ${N(AI)} ${show(AI)}.`;
}
