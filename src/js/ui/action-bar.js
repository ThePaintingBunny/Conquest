/*
 * Activation bar
 *
 * A bar that stays in view while a regiment is activating: which regiment it is, how many actions are left,
 * and the buttons that finish things (Finish action, Cancel action, End activation, Undo activation). The
 * buttons press the matching buttons of the regiment card, so there is one place where each of them is wired.
 *
 * In this file: renderActionBar(), fitSide()
 */

function renderActionBar() {
  const bar = $('actbar');
  if (!bar) return;
  try {
    renderDock();
  } catch (e) {
    console.error(e);
  }
  const u = act && byId(act.id);
  /* the command dock under the table carries these buttons while it shows */
  const on = !!u && !document.body.classList.contains('mm-on') && !dockOn();
  bar.hidden = !on;
  fitSide();
  document.body.classList.toggle('has-actbar', on);
  if (!on) return;
  $('actbar-name').textContent = (u.short || u.name) + (u.charName ? ' + ' + u.charName : '');
  const sub = $('actbar-sub'),
    btns = $('actbar-btns'),
    here = selId === act.id,
    pips = $('c-pips');
  sub.textContent =
    here && pips && !pips.hidden ? pips.textContent.replace(/^[^A-Za-z0-9]+/, '') : 'Activating';
  btns.innerHTML = '';
  const mirror = (id, ghost) => {
    const src = $(id);
    if (!src || src.hidden || src.closest('[hidden]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (ghost ? ' ghost' : '');
    b.textContent = src.textContent;
    b.disabled = src.disabled;
    b.title = src.title || '';
    b.onclick = () => src.click();
    btns.appendChild(b);
  };
  if (!here) {
    /* another regiment is being looked at: one tap back to the active one */
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Back to ' + (u.short || u.name);
    b.onclick = () => {
      selId = act.id;
      setTab('reg');
      render();
    };
    btns.appendChild(b);
    return;
  }
  const cur = $('c-cur');
  if (act.cur && cur && !cur.hidden) {
    mirror('done-act', false);
    mirror('cancel-act', true);
  } else {
    mirror('end', false);
    mirror('abort', true);
  }
}

/* on wide screens the side column ends at the bottom of the window, so the bar at its foot is always in view */
function fitSide() {
  const rc = document.querySelector('.rcol');
  if (!rc) return;
  if (innerWidth <= 900) {
    rc.style.maxHeight = '';
    return;
  }
  rc.style.maxHeight = Math.max(260, innerHeight - Math.max(10, rc.getBoundingClientRect().top) - 10) + 'px';
}
addEventListener('scroll', fitSide, { passive: true });
addEventListener('resize', fitSide);

/* the card changes outside render() too (dice, steps), so keep the bar in step with it */
{
  let queued = false;
  const card = $('card');
  if (card && typeof MutationObserver === 'function')
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        try {
          renderActionBar();
        } catch (e) {}
      });
    }).observe(card, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['hidden', 'disabled']
    });
}
