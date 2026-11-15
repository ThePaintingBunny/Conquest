/*
 * Army builder: Yoroni Modular Regiments
 *
 * Totals, points, checks and the unit data of a regiment built stand by stand.
 *
 * In this file: modTotal(), modPts(), modProblems(), modJson()
 */

function modTotal(m) {
  return Object.values(m.counts || {}).reduce((a, n) => a + (+n || 0), 0);
}

function modPts(m) {
  return Object.entries(m.counts || {}).reduce(
    (a, [t, n]) => a + (+n || 0) * ((MODULAR[t] || {}).pts || 0),
    0
  );
}

function modProblems(m) {
  const p = [],
    tot = modTotal(m),
    c = +(m.counts || {})[m.cmd] || 0;
  if (tot < 2) p.push('A Modular Regiment needs at least 2 stands.');
  if (c < 1) p.push('Include at least one ' + m.cmd + ' stand for the Command Stand.');
  else {
    if (c * 2 < tot) p.push('At least half the stands must be ' + m.cmd + '.');
    if (tot - c >= c) p.push('Other stand types must be fewer than the ' + m.cmd + ' stands.');
  }
  return p;
}

function modJson(m) {
  const types = Object.entries(m.counts || {}).filter(([t, n]) => +n > 0),
    C = MODULAR[m.cmd],
    tot = modTotal(m);
  const mods = [m.cmd];
  for (let i = 1; i < (+m.counts[m.cmd] || 0); i++) mods.push(m.cmd);
  types.forEach(([t, n]) => {
    if (t !== m.cmd) for (let i = 0; i < +n; i++) mods.push(t);
  });
  const all = types.map(([t]) => t),
    only = re => all.every(t => re.test(t));
  const prof = {};
  const plusA = m.cmd === 'Oni Ayakashi' ? 1 : 0;
  all.forEach(t => {
    const x = MODULAR[t];
    prof[t] = { C: x.C, A: x.A + plusA, V: x.V, W: x.W, rules: x.rules.slice() };
  });
  const rules = [],
    ab = [
      ['Command Stand: ' + m.cmd, C.cmd],
      ['Ideal Card', C.role],
      ['Enlightened', 'The first time it would be Broken, it Rallies instead.']
    ];
  if (m.cmd === 'Oni Ayakashi') rules.push('Juggernaut');
  if (m.cmd === 'Kami Ayakashi') rules.push('Tenacious (1)');
  if (/Tengu/.test(m.cmd)) rules.push('Vanguard (3)');
  if (m.cmd === 'Tengu Bushi') {
    ab.push(['Pathfinding', 'Ignores Hindering terrain']);
    rules.push('Ignores Hindering terrain');
  }
  if (m.cmd === 'Tengu Ayakashi' || m.cmd === 'Origami Warriors') {
    ab.push(['Tenacious against Volleys', 'Tenacious (1) when targeted by a Volley']);
    rules.push('Tenacious (1) against Volleys');
  }
  if (m.cmd === 'Kappa Bushi') ab.push(['Any Ideal Card', 'Can be activated by any Ideal Card']);
  if (m.cmd === 'Origami Warriors') ab.push(['Paper Ranks', 'Destroyed stands do not count toward Broken']);
  if (only(/^Tengu/)) rules.push('Fly');
  if (only(/^Tengu Bushi$/)) ab.push(['Blade Masters', 'Flawless Strikes also trigger on hit rolls of 2']);
  if (only(/^Origami/)) {
    if (!rules.includes('Vanguard (3)')) rules.push('Vanguard (3)');
    ab.push(['In the Fold', 'Cannot be Broken']);
  }
  const M = Math.min(...all.map(t => MODULAR[t].M));
  return {
    name: 'Modular Regiment (' + m.cmd + ')',
    short: m.cmd.split(' ')[0] + ' Modular',
    points: modPts(m),
    cls: 'Medium Brute',
    type: 'brute',
    stands: tot,
    M,
    V: C.V,
    C: C.C,
    A: C.A + plusA,
    W: C.W,
    R: C.R,
    D: C.D,
    E: C.E + (m.cmd === 'Kami Ayakashi' ? 1 : 0),
    rules,
    abilities: ab,
    standardBearer: false,
    leader: true,
    auxiliary: null,
    character: null,
    mods,
    modProfiles: prof
  };
}
