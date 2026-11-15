/*
 * Rule tooltips
 *
 * Hover, focus or tap a rule name to read what it does.
 *
 * In this file: tipEl, tipFor, tipShow(), tipHide(), tipChip()
 */

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
