/*
 * Spires: Assassination Directive
 *
 * The Mimetic Assassin's Assassination Directive.
 *
 * In this file: assassinHolder(), assassinOk(), srAssassin(), exAssassin()
 */

/* ---- Assassination Directive (Mimetic Assassin) ---- */
function assassinHolder(side) {
  return (state.units || []).find(x => x.side === side && x.assassinHold && !x.assassinUsed);
}

function assassinOk(u) {
  return !!u && /Infantry/.test(u.cls || '') && !u.charName && engaged(u).length && !!assassinHolder(u.side);
}

function srAssassin(u) {
  const H = assassinHolder(u.side),
    A = H.assassinHold,
    W = +(u.stats && u.stats.W) || 4,
    eng = engaged(u);
  const st = { x: u.x, y: u.y, facing: u.facing || 0, files: geom(u).files };
  act.cur = { type: 'clash', assassin: true, start: st, budget: 0, moving: false, reshape: false };
  (async () => {
    const files = geom(u).files;
    await putState({
      units: state.units.map(x => {
        if (x.id === H.id && x.id !== u.id) x = Object.assign({}, x, { assassinUsed: true });
        if (x.id !== u.id) return x;
        return Object.assign({}, x, x.id === H.id ? { assassinUsed: true } : {}, {
          charName: A.name,
          charStats: A.stats,
          charRules: A.rules,
          char: files >= 3 ? Math.min(2, files - 1) : Math.min(files - 1, 1),
          stands: (x.stands || 1) + 1,
          wounds: (x.wounds || 0) + W,
          charActivated: true
        });
      }),
      lastTitle: N(u.side) + ' · Assassination Directive',
      lastText: `The ${A.name} replaces a front-rank stand of ${u.short || u.name} (removed as a casualty; it does not count towards Broken or Shattered), strikes, and may Duel.`
    });
    const ids = eng.map(e => e.id);
    openCombat({
      type: 'lethal',
      att: u.id,
      tgt: ids.length === 1 ? ids[0] : null,
      choices: ids,
      inAct: false,
      lethalHits: W,
      lethalX: 0,
      lethalLost: 0,
      lethalLabel: 'Assassination Directive',
      lethalRed: 2,
      selfTitle: 'Assassination Directive',
      selfText: `The ${A.name} strikes: ${W} Hits with Cleave (2) on one enemy regiment in contact. No Morale Tests.`
    });
    const ch = eng.filter(e => e.charName || isMChar(e));
    if (ch.length)
      srQueue({
        type: 'duel',
        att: u.id,
        tgt: ch[0].id,
        inAct: false,
        step: 'offer',
        selfTitle: 'Duel (Assassination Directive)'
      });
    srQueue({ type: 'clash', att: u.id, tgt: ids.length === 1 ? ids[0] : null, choices: ids, inAct: true });
    render();
  })();
  return true;
}

async function exAssassin() {
  startAction('assassin');
  for (let i = 0; i < 400; i++) {
    await sleep(400);
    if (!cb && !cbQueue.length && !(act && act.cur)) break;
  }
  return 'the Mimetic Assassin strikes from the ranks';
}
