/*
 * Reinforcement Lines
 *
 * Where each side's Reinforcement Line is (core rules), with Irregular and Pathfinders.
 *
 * In this file: rlCompute()
 */

/* ---- Reinforcement Lines (core rules), with Irregular and Pathfinders ---- */
function rlCompute(side, units, startV) {
  const ok = u => u.onTable && !u.destroyed && u.type !== 'marker' && !rh(u.rules || [], 'Irregular');
  const fr = units.filter(u => u.side === side && ok(u)),
    en = units.filter(u => u.side !== side && ok(u));
  const cs = side === 'cs';
  const rear = u => {
    const C = corners(u);
    return cs ? Math.max(...C.map(p => p[1])) : Math.min(...C.map(p => p[1]));
  };
  const L = fr.map(u => ({ u, v: rear(u) })).sort((a, b) => (cs ? a.v - b.v : b.v - a.v));
  let line = cs ? 48 : 0;
  for (const { u, v } of L) {
    const crossed =
      !rh(u.rules || [], 'Pathfinders') &&
      en.some(e => corners(e).some(p => (cs ? p[1] > v + 1e-6 : p[1] < v - 1e-6)));
    if (!crossed) {
      line = v;
      break;
    }
  }
  if (startV != null) line = cs ? Math.max(line, startV) : Math.min(line, startV);
  return +Math.max(0, Math.min(48, line)).toFixed(2);
}
