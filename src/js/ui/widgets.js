/*
 * Small UI building blocks
 *
 * Buttons, text lines, info lines and other elements that many panels share.
 *
 * In this file: bEl(), cbtn(), ptext(), infoLine(), hookInfo()
 */

function bEl(tag, props, kids) {
  const e = document.createElement(tag);
  Object.assign(e, props || {});
  (kids || []).forEach(k => k != null && e.append(k));
  return e;
}

function cbtn(t, fn, who) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = t;
  b.onclick = fn;
  if (who) b.dataset.who = who;
  return b;
}

function ptext(t, cls) {
  const p = document.createElement('p');
  p.className = cls || 'hint';
  p.style.margin = '0';
  p.textContent = t;
  return p;
}

/* an info line under a row of options: shows the hovered/focused button, otherwise what is selected */
function infoLine(defTxt) {
  const d = bEl('div', { className: 'opt-info' });
  d.setAttribute('aria-live', 'polite');
  const show = t => {
    d.textContent = t || defTxt || 'Hover or tap and hold an option to see what it does.';
  };
  show();
  d._show = show;
  d._def = () => show();
  return d;
}

function hookInfo(bt, txt, box) {
  bt.title = txt;
  bt.addEventListener('mouseenter', () => box._show(txt));
  bt.addEventListener('focus', () => box._show(txt));
  bt.addEventListener('mouseleave', () => box._def());
  bt.addEventListener('blur', () => box._def());
  let tm = null;
  bt.addEventListener(
    'touchstart',
    () => {
      tm = setTimeout(() => box._show(txt), 350);
    },
    { passive: true }
  );
  bt.addEventListener('touchend', () => clearTimeout(tm));
}

