/*
 * Messages over the board
 *
 * Short messages that float over the board and fade.
 *
 * In this file: toastTimer, toast()
 */

/* messages float over the board and fade after a few seconds (longer messages stay longer); click to dismiss */
let toastTimer = null;

function toast(t) {
  const e = $('toast');
  if (!e) return;
  e.textContent = t || '';
  clearTimeout(toastTimer);
  e.classList.toggle('show', !!t);
  if (!e.onclick) e.onclick = () => e.classList.remove('show');
  if (t)
    toastTimer = setTimeout(() => e.classList.remove('show'), Math.min(14000, Math.max(4500, t.length * 60)));
}
