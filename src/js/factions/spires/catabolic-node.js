/*
 * Spires: Catabolic Node
 *
 * Detonating a Catabolic Node (on declaring a Clash or when destroyed) and Chain Reaction, where one
 * detonation sets off the next.
 *
 * In this file: nodeClashOffer(), nodeThenClash(), clashAfterNode(), nodeOnDeath(), offNode(),
 *   chainOn(), nodeChainCands(), chainMine(), chainPendFor(), nodeChainAuto(), nodeChainBlast(),
 *   chainRoll, chainPick(), renderChain()
 */

/* Catabolic Node: "upon declaring a Clash Action you may choose for this Catabolic Node to Detonate".
   Pressing Clash asks first; a detonation is resolved in full before the Clash opens against whoever is still engaged. */
function nodeClashOffer(u) {
  return !!(u && offOn(u, 'node') && engaged(u).length && act && !act.nodeAsked);
}

function nodeThenClash(u) {
  act.nodeAsked = true;
  offNode(u);
  srQueue({ type: 'clashAfterNode', att: u.id });
}

/* opens the Clash that was declared before the detonation, once its Hits are resolved */
function clashAfterNode(o) {
  const A = byId(o.att);
  if (!act || act.id !== o.att || !act.cur || act.cur.type !== 'clash') return;
  if (!A || A.destroyed || !A.onTable || !live(A)) {
    act.cur = null;
    toast('The regiment was destroyed by its own Catabolic Node, so its Clash never happens.');
    render();
    return;
  }
  const eng = engaged(A);
  if (!eng.length) {
    toast(
      'No enemy is left in contact after the detonation: the Clash has no target and the action is spent.'
    );
    finishAction();
    return;
  }
  toast('Catabolic Node resolved. Now the Clash.');
  clashOpen(A, true);
  render();
}

/* "When this Regiment is destroyed ... you may choose for this Catabolic Node to Detonate": the regiment is gone, so the
   blast only hits the enemies that were engaged with it. Detonates automatically, as there is no cost left to weigh. */
function nodeOnDeath(T, foes) {
  const d = d6();
  const ids = foes.filter(id => {
    const e = byId(id);
    return e && e.onTable && !e.destroyed;
  });
  if (!ids.length) return;
  const pr = putState({
    chainPend: chainPendFor(T),
    units: state.units.map(x => (x.id === T.id ? Object.assign({}, x, { nodeGone: true }) : x)),
    lastTitle: N(T.side) + ' · Catabolic Node',
    lastText: `${T.short || T.name} is destroyed and its Catabolic Node detonates: rolled ${d}, every enemy that was engaged with it takes ${d + 4} Hits, no Morale.`
  }).catch(() => {});
  toast(
    `${T.short || T.name} is destroyed: its Catabolic Node detonates (rolled ${d}), ${d + 4} Hits on each enemy it was engaged with.`
  );
  ids.forEach(id => {
    const e = byId(id);
    srQueue({
      type: 'lethal',
      att: T.id,
      tgt: id,
      inAct: false,
      lethalHits: d + 4,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Catabolic Node',
      selfTitle: 'Catabolic Node',
      selfText: `${T.short || T.name} is destroyed and its Catabolic Node detonates (rolled ${d}): ${e.short || e.name} takes ${d + 4} Hits. No Morale Tests.`
    });
  });
  pr.then(() => nodeChainAuto(T)).catch(() => {});
}

/* Catabolic Node: Detonate */
function offNode(u) {
  const eng = engaged(u);
  if (!eng.length) return true;
  const d = d6();
  act.actions.push({
    type: 'node',
    free: true,
    from: { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files },
    to: { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files },
    roll: d
  });
  const pr = putState({
    chainPend: chainPendFor(u),
    units: state.units.map(x => (x.id === u.id ? Object.assign({}, x, { nodeGone: true }) : x)),
    lastTitle: N(u.side) + ' · Catabolic Node',
    lastText:
      (u.short || u.name) +
      ' detonates its Catabolic Node: rolled ' +
      d +
      '. Every engaged enemy takes ' +
      (d + 4) +
      ' Hits and the regiment ' +
      d +
      ' Hits, no Morale.'
  }).catch(() => {});
  eng.forEach(e =>
    srQueue({
      type: 'lethal',
      att: u.id,
      tgt: e.id,
      inAct: false,
      lethalHits: d + 4,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Catabolic Node',
      selfTitle: 'Catabolic Node',
      selfText: `${u.short || u.name} detonates its Catabolic Node (rolled ${d}): ${e.short || e.name} takes ${d + 4} Hits. No Morale Tests.`
    })
  );
  srQueue({
    type: 'lethal',
    att: u.id,
    tgt: u.id,
    inAct: false,
    lethalHits: d,
    lethalX: 0,
    lethalLost: 0,
    lethalLabel: 'Catabolic Node',
    selfTitle: 'Catabolic Node',
    selfText: `The blast also hits ${u.short || u.name}: ${d} Hits. No Morale Tests.`
  });
  pr.then(() => nodeChainAuto(u)).catch(() => {});
  render();
  return true;
}

/* Chain Reaction (Spires Eccentricity, Biomancer Warlord): when a friendly Catabolic Node detonates, its player may pick a
   second friendly Node within 18″ to detonate out of sequence, then a third within 18″ of that one. The second Node's
   Detonation also inflicts 2 Wounds on each enemy regiment it hits, the third 4. During the sequence an Observation
   Token (Field Studies) may be spent to roll 2D6 instead of 1D6 and pick one. The choice is offered to the Node's player
   (state.chainPend); the AI picks the nearest engaged Node itself. */
function chainOn(side) {
  const wl = supWl(side);
  return !!(wl && wl.charName && /Biomancer/.test(wl.charName) && upgOf(wl, /Chain Reaction/));
}

function nodeChainCands(from, seen) {
  const F = typeof from === 'string' ? base(from) : from;
  if (!F) return [];
  return all()
    .filter(
      x =>
        x.side === F.side &&
        x.onTable &&
        !x.destroyed &&
        !seen.includes(x.id) &&
        offOn(x, 'node') &&
        !x.nodeGone &&
        polyDist(corners(F), corners(x)) <= 18
    )
    .sort((a, b) => polyDist(corners(F), corners(a)) - polyDist(corners(F), corners(b)));
}

function chainMine(side) {
  return SBX() ? true : PVP() ? seatSide() === side : side === HU;
}

/* the pending choice for the Node's player, saved with the first Detonation (null for the AI) */
function chainPendFor(src) {
  if (!src || !chainOn(src.side) || !nodeChainCands(src, [src.id]).length) return null;
  if (!PVP() && !SBX() && src.side === AI) return null;
  return { side: src.side, from: src.id, step: 1, seen: [src.id] };
}

/* the AI chains the nearest engaged Nodes itself */
async function nodeChainAuto(src) {
  if (!src || PVP() || SBX() || src.side !== AI || !chainOn(src.side)) return;
  let from = src,
    seen = [src.id];
  for (let step = 1; step <= 2; step++) {
    const nx = nodeChainCands(from, seen).find(x => engaged(x).length);
    if (!nx) break;
    await nodeChainBlast(nx, step, d6());
    seen.push(nx.id);
    from = base(nx.id) || nx;
  }
}

/* one chained Detonation: 1D6+4 Hits on each engaged enemy plus 2 or 4 Wounds, 1D6 Hits on the Node's own regiment */
function nodeChainBlast(nx, step, d) {
  const plus = step === 1 ? 2 : 4,
    E = engaged(nx)
      .map(e => (typeof e === 'string' ? byId(e) : e))
      .filter(Boolean);
  let units = state.units.map(x => (x.id === nx.id ? Object.assign({}, x, { nodeGone: true }) : x));
  E.forEach(e => (units = hurt(units, e.id, plus)));
  const pr = putState({
    units,
    lastTitle: N(nx.side) + ' · Chain Reaction',
    lastText:
      `${nx.short || nx.name}’s Catabolic Node detonates (rolled ${d}): ` +
      (E.length
        ? E.map(e => `${e.short || e.name} takes ${plus} Wounds and ${d + 4} Hits`).join('; ')
        : 'no enemy is engaged with it') +
      `; ${nx.short || nx.name} takes ${d} Hits. No Morale Tests.`
  }).catch(() => {});
  toast(`Chain Reaction: ${nx.short || nx.name}’s Catabolic Node detonates (rolled ${d}, +${plus} Wounds).`);
  E.forEach(e =>
    srQueue({
      type: 'lethal',
      att: nx.id,
      tgt: e.id,
      inAct: false,
      lethalHits: d + 4,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Catabolic Node (Chain Reaction)',
      selfTitle: 'Chain Reaction',
      selfText: `${nx.short || nx.name}’s Catabolic Node detonates in the chain (rolled ${d}): ${e.short || e.name} takes ${plus} Wounds and ${d + 4} Hits. No Morale Tests.`
    })
  );
  srQueue({
    type: 'lethal',
    att: nx.id,
    tgt: nx.id,
    inAct: false,
    lethalHits: d,
    lethalX: 0,
    lethalLost: 0,
    lethalLabel: 'Catabolic Node (Chain Reaction)',
    selfTitle: 'Chain Reaction',
    selfText: `The blast also hits ${nx.short || nx.name}: ${d} Hits. No Morale Tests.`
  });
  return pr;
}

/* the player's choice: which Node detonates next (or stop), and an Observation Token for 2D6 */
let chainRoll = null;

async function chainPick(id, d) {
  const P = state.chainPend;
  if (!P) return;
  const nx = base(id);
  chainRoll = null;
  const next =
    P.step < 2 && nx && nodeChainCands(nx, P.seen.concat([id])).length
      ? { side: P.side, from: id, step: P.step + 1, seen: P.seen.concat([id]) }
      : null;
  await putState({ chainPend: next });
  if (nx) await nodeChainBlast(base(id), P.step, d);
  renderChain();
}

function renderChain() {
  const P = state && state.chainPend;
  let dg = $('chain-dlg');
  if (!P || !chainMine(P.side)) {
    if (dg && dg.open) dg.close();
    return;
  }
  if (!dg) {
    dg = document.createElement('dialog');
    dg.id = 'chain-dlg';
    dg.className = 'en-dlg';
    dg.setAttribute('aria-labelledby', 'chain-h');
    document.body.appendChild(dg);
  }
  const from = base(P.from),
    C = nodeChainCands(P.from, P.seen),
    tok = fsTok(P.side);
  if (!C.length) {
    putState({ chainPend: null }).catch(() => {});
    if (dg.open) dg.close();
    return;
  }
  dg.innerHTML = '';
  const h = bEl('h2', {
    id: 'chain-h',
    textContent: 'Chain Reaction: ' + (P.step === 1 ? 'second' : 'third') + ' Node'
  });
  dg.append(
    h,
    ptext(
      `Detonate another friendly Catabolic Node within 18″ of ${from ? from.short || from.name : 'the last one'}? ` +
        `It inflicts 1D6+4 Hits on each enemy engaged with it and ${P.step === 1 ? 2 : 4} additional Wounds, and 1D6 Hits on its own regiment.`
    )
  );
  if (chainRoll) {
    dg.append(
      ptext(
        `Observation Token spent: rolled ${chainRoll.a} and ${chainRoll.b}. Pick the result for ${(base(chainRoll.id) || {}).name}:`
      )
    );
    const r = bEl('div', { className: 'row' });
    [chainRoll.a, chainRoll.b].forEach(v =>
      r.append(abBtn('Use ' + v, () => chainPick(chainRoll.id, v), 'ab-tog'))
    );
    dg.append(r);
  } else {
    const box = bEl('div', { className: 'fr-opts' });
    C.forEach(x => {
      const n = engaged(x).length,
        lab = `${x.short || x.name} (${polyDist(corners(from || x), corners(x)).toFixed(1)}″, ${n ? 'engaged with ' + n + ' enem' + (n > 1 ? 'ies' : 'y') : 'not in combat'})`;
      box.append(abBtn('Detonate ' + lab, () => chainPick(x.id, d6()), 'ab-tog'));
      if (tok > 0)
        box.append(
          abBtn(
            'Spend an Observation Token (' + tok + ' left): 2D6 for ' + (x.short || x.name),
            async () => {
              await putState({ sup: supMemo(P.side, { fs: tok - 1 }) });
              chainRoll = { id: x.id, a: d6(), b: d6() };
              renderChain();
            },
            'ab-tog'
          )
        );
    });
    dg.append(box);
  }
  const stop = abBtn(
    'Stop the chain',
    async () => {
      chainRoll = null;
      await putState({ chainPend: null });
      renderChain();
    },
    'btn ghost'
  );
  dg.append(stop);
  if (!dg.open) dg.showModal();
}
