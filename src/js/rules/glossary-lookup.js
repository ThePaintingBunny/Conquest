/*
 * Rule text lookup
 *
 * Finds the text of a special rule in the core glossary or a faction's rule text.
 *
 * In this file: ruleKey(), facOf(), glossLook(), ruleInfo()
 */

function ruleKey(t) {
  let s = String(t || '')
    .toLowerCase()
    .replace(/^(chant|strain|command stand|command|awakened|memory of old|memories of old)\s*:\s*/, '')
    .replace(/[“”"]/g, '');
  s = s
    .replace(/\(.*$/, '')
    .replace(/[+−-]?\d.*$/, '')
    .trim();
  return s.replace(/\s+/g, ' ');
}

function facOf(name) {
  const n = String(name || '').toLowerCase();
  return (
    Object.keys(FGLOSS).find(f => {
      const g = f.toLowerCase();
      return n && (n.includes(g) || g.includes(n));
    }) || null
  );
}

function glossLook(k, fac) {
  if (fac && FGLOSS[fac] && FGLOSS[fac][k]) return FGLOSS[fac][k][1];
  if (GLOSS[k]) return GLOSS[k];
  for (const f in FGLOSS) if (FGLOSS[f][k]) return FGLOSS[f][k][1];
  return null;
}

function ruleInfo(t, fac) {
  const raw = String(t || '');
  const k = ruleKey(raw);
  let d = glossLook(k, fac);
  if (!d) {
    const k2 = Object.keys(GLOSS).find(x => k.startsWith(x + ' ') || k === x + '!');
    if (k2) d = GLOSS[k2];
  }
  if (!d) {
    const parts = raw
        .replace(/^[^:(]*:\s*/, m => (/supremacy/i.test(m) ? '' : m))
        .split(/[(),;]|:\s/)
        .map(x => x.trim())
        .filter(Boolean),
      lines = [];
    parts.forEach(pt => {
      const dd = glossLook(ruleKey(pt), fac);
      if (dd && !lines.some(l => l.startsWith(pt + ':'))) lines.push(pt + ': ' + dd);
    });
    return lines.length ? lines.join('\n') : null;
  }
  const m = raw.match(/\(\s*\+?(\d+)\s*\)/);
  if (m) d = d.replace(/\bX\b/g, m[1]);
  const extra = [];
  const inner = raw.match(/\)\s*\(([^)]*)\)/);
  if (inner)
    inner[1].split(',').forEach(p => {
      const kk = ruleKey(p);
      if (GLOSS[kk] && !/barrage/.test(kk)) {
        const mm = p.match(/\((\d+)\)/);
        extra.push(p.trim() + ': ' + (mm ? GLOSS[kk].replace(/\bX\b/g, mm[1]) : GLOSS[kk]));
      }
    });
  return d + (extra.length ? '\n' + extra.join('\n') : '');
}
