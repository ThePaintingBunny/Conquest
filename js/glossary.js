/* Looking up special rules in the glossary. */
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
let tipEl = null,
  tipFor = null;
function tipShow(el) {
  const t = el.dataset.tip;
  if (!t) return;
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'rtip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.id = 'rtip';
    document.body.appendChild(tipEl);
  }
  tipEl.innerHTML = '';
  const h = document.createElement('b');
  h.textContent = el.textContent;
  tipEl.appendChild(h);
  t.split('\n').forEach(l => {
    const p = document.createElement('p');
    p.textContent = l;
    tipEl.appendChild(p);
  });
  tipEl.hidden = false;
  tipFor = el;
  el.setAttribute('aria-describedby', 'rtip');
  const r = el.getBoundingClientRect(),
    W = Math.min(320, innerWidth - 24);
  tipEl.style.maxWidth = W + 'px';
  const tw = tipEl.offsetWidth,
    th = tipEl.offsetHeight;
  let x = Math.max(12, Math.min(innerWidth - tw - 12, r.left + r.width / 2 - tw / 2)),
    y = r.top - th - 8;
  if (y < 8) y = r.bottom + 8;
  tipEl.style.left = x + 'px';
  tipEl.style.top = y + 'px';
}
function tipHide() {
  if (tipEl) tipEl.hidden = true;
  if (tipFor) tipFor.removeAttribute('aria-describedby');
  tipFor = null;
}
function tipChip(c, t, fac) {
  const d = ruleInfo(t, fac);
  if (!d) return c;
  c.dataset.tip = d;
  c.classList.add('has-tip');
  c.tabIndex = 0;
  return c;
}
document.addEventListener('mouseover', e => {
  const c = e.target.closest && e.target.closest('.has-tip');
  if (c && c !== tipFor) tipShow(c);
  else if (!c && tipFor) tipHide();
});
document.addEventListener('focusin', e => {
  const c = e.target.closest && e.target.closest('.has-tip');
  if (c) tipShow(c);
});
document.addEventListener('focusout', e => {
  if (e.target === tipFor) tipHide();
});
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('.has-tip');
  if (c) {
    if (tipFor === c) tipHide();
    else tipShow(c);
  } else if (tipFor) tipHide();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') tipHide();
});
addEventListener('scroll', tipHide, { passive: true });
