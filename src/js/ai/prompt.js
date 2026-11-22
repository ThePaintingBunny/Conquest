/*
 * Unit references for reading army lists
 *
 * The official profiles of the units a pasted list names, given to Claude when it reads a list that did not come
 * from the Para Bellum app.
 *
 * In this file: encyFor(), encyBrief()
 */

function encyFor(text, faction) {
  const t = enNorm(text),
    out = [];
  ENCY.forEach(f =>
    f.units.forEach(u => {
      const n = enNorm(u.name);
      if (n.length > 3 && t.includes(n)) out.push(Object.assign({ faction: f.name }, u));
    })
  );
  const ff = ENCY.find(
    f => faction && (enNorm(faction).includes(enNorm(f.name)) || enNorm(f.name).includes(enNorm(faction)))
  );
  return { units: out, faction: ff || null };
}

function encyBrief(u) {
  return `${u.name} (${u.faction || ''} ${u.kind === 'char' ? 'character' : 'regiment'}, ${[u.cls, u.type].join(' ').trim()}, ${u.pts ?? '?'} pts${u.extra != null ? ', +' + u.extra + '/stand' : ''}, ${u.stands}): ${['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].map(k => k + u.stats[k]).join(' ')}; rules: ${u.rules.join(', ') || 'none'}${u.draw.length ? '; draw events: ' + u.draw.join(', ') : ''}${u.options ? '; options: ' + u.options : ''}${u.warband ? '; ' + (u.kind === 'char' ? 'warband: ' : '') + u.warband : ''}`;
}
