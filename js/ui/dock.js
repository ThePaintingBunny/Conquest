/*
 * Command dock
 *
 * While a regiment is activating, its activation panel (Draw Events, the actions it may take, the action in
 * progress and the buttons that end it) moves out of the side column into a dock under the table, so the table and
 * the controls stay in view together. The side column keeps the regiment's profile and rules. The panel's own
 * elements move, so every button keeps its wiring. Number keys 1–9 start the action on that tile; Enter finishes
 * the current action, or ends the activation when none is running.
 *
 * In this file: dockOn(), renderDock(), dockKeys()
 */

/* is the dock showing (a regiment of ours is activating and is the one looked at)? */
function dockOn() {
  const u = act && byId(act.id);
  return (
    !!u &&
    selId === act.id &&
    !mapEdit &&
    !scenEdit &&
    !document.body.classList.contains('mm-on') &&
    !document.body.classList.contains('replaying')
  );
}

function renderDock() {
  const dock = $('dock'),
    main = $('dock-main'),
    who = $('dock-who'),
    sec = $('c-act-sec');
  if (!dock || !main || !sec) return;
  const on = dockOn(),
    foot = $('c-foot');
  if (on && sec.parentNode !== main) main.append(sec);
  /* End activation and Undo stand in their own column at the right of the dock */
  if (on && foot && foot.parentNode !== dock) dock.append(foot);
  if (!on && foot && foot.parentNode === dock) sec.append(foot);
  /* Finish action / Cancel action: into the dock's right column while an action runs */
  const cur = $('c-cur'),
    fin = $('done-act') && $('done-act').parentNode,
    running = on && !!act.cur && cur && !cur.hidden;
  const ctl = $('c-ctl'),
    chg = $('c-chg');
  if (fin && foot && cur) {
    fin.classList.add('dk-curbtns');
    if (running && fin.parentNode !== foot) foot.prepend(fin);
    if (!running && fin.parentNode === foot) cur.append(fin);
  }
  /* the wheel and formation buttons go under them, so the middle keeps its width for the action's own controls */
  if (ctl && foot && cur && chg) {
    if (running && ctl.parentNode !== foot) fin.after(ctl);
    if (!running && ctl.parentNode === foot) chg.after(ctl);
  }
  document.body.classList.toggle('dk-cur', !!running);
  if (!on && sec.parentNode === main) {
    const fx = $('c-fx-sec');
    if (fx) fx.after(sec);
    else $('card').append(sec);
  }
  /* in a game the dock keeps its place under the table, so the table does not change size between activations */
  const game =
    on ||
    (!!state &&
      tbInTop() &&
      (state.step || 'activations') === 'activations' &&
      !mapEdit &&
      !scenEdit &&
      !document.body.classList.contains('mm-on') &&
      !document.body.classList.contains('replaying'));
  const was = !dock.hidden;
  dock.hidden = !game;
  document.body.classList.toggle('has-dock', on);
  [...main.children].forEach(k => {
    if (k !== sec) k.remove();
  });
  if (game && !on) {
    who.innerHTML = '';
    const mine = state.turn === HU || SBX(),
      a = act && byId(act.id);
    who.append(
      bEl('div', { className: 'dk-k', textContent: 'Round ' + (state.round || 1) }),
      bEl('div', { className: 'dk-n', textContent: a ? 'Activating' : mine ? 'Your turn' : N(state.turn || AI) + "' turn" })
    );
    const idle = bEl('div', { className: 'dk-idle' });
    if (a) {
      idle.append(document.createTextNode((a.short || a.name) + ' is activating. '));
      const bk = bEl('button', { type: 'button', className: 'btn', textContent: 'Back to ' + (a.short || a.name) });
      bk.onclick = () => {
        selId = act.id;
        setTab('reg');
        render();
      };
      idle.append(bk);
    } else
      idle.textContent = mine
        ? 'Click the regiment whose card is up, on the table or in the Armies tab, to start its activation.'
        : 'Waiting for ' + N(state.turn || AI) + ' to act.';
    main.append(idle);
  }
  /* the last move, under the dock's heading (the status row under the table makes way for the dock) */
  if (game) {
    const lm = ($('last') && $('last').textContent) || '';
    if (lm && !/No moves yet/.test(lm)) who.append(bEl('div', { className: 'dk-last', textContent: lm, title: lm }));
  }
  if (on) {
    const u = byId(act.id),
      pips = $('c-pips'),
      h = $('c-act-h');
    who.innerHTML = '';
    who.append(
      bEl('div', { className: 'dk-k', textContent: (h && h.textContent) || 'Activating' }),
      bEl('div', {
        className: 'dk-n',
        textContent: (u.short || u.name) + (u.charName ? ' + ' + u.charName : '')
      })
    );
    if (pips && !pips.hidden) {
      const p = pips.cloneNode(true);
      p.removeAttribute('id');
      p.className = 'actp-pips dk-pips';
      who.append(p);
    }
    who.append(bEl('div', { className: 'dk-h', textContent: 'Keys 1–9 pick an action · Enter finishes' }));
    /* number the action tiles for the keys */
    [...$('c-actions').querySelectorAll('button.act')].forEach((b, i) => {
      if (i < 9) b.dataset.key = String(i + 1);
      else delete b.dataset.key;
    });
  }
  if (was !== on) requestAnimationFrame(fitBoard);
}

/* number keys pick the action on that tile; Enter finishes the action, or ends the activation */
function dockKeys(ev) {
  if (!dockOn() || ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const tg = ev.target;
  if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable) return;
  if (mmCurrent() || document.querySelector('dialog[open]') || $('roll-ask')) return;
  if (/^[1-9]$/.test(ev.key) && !act.cur) {
    const b = [...$('c-actions').querySelectorAll('button.act')][+ev.key - 1];
    if (b && !b.disabled && !$('c-actions').hidden) {
      ev.preventDefault();
      b.click();
    }
    return;
  }
  if (ev.key === 'Enter' && (!tg || tg === document.body || !/BUTTON|A/.test(tg.tagName))) {
    const fin = $('done-act'),
      end = $('end');
    const vis = b => b && !b.disabled && !b.closest('[hidden]') && b.offsetParent !== null;
    if (act.cur && vis(fin)) {
      ev.preventDefault();
      fin.click();
    } else if (!act.cur && !cb && vis(end)) {
      ev.preventDefault();
      end.click();
    }
  }
}
document.addEventListener('keydown', dockKeys);

/* the panel changes outside render() too (dice, steps): keep the dock's heading in step */
{
  const main = $('dock-main');
  let queued = false;
  if (main && typeof MutationObserver === 'function')
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        try {
          if (dockOn()) {
            const pips = $('c-pips'),
              old = document.querySelector('#dock-who .dk-pips');
            if (pips && old && old.innerHTML !== pips.innerHTML) old.innerHTML = pips.innerHTML;
            const k = document.querySelector('#dock-who .dk-k'),
              h = $('c-act-h');
            if (k && h && k.textContent !== h.textContent) k.textContent = h.textContent;
            [...$('c-actions').querySelectorAll('button.act')].forEach((b, i) => {
              const v = i < 9 ? String(i + 1) : '';
              if ((b.dataset.key || '') !== v) {
                if (v) b.dataset.key = v;
                else delete b.dataset.key;
              }
            });
          }
        } catch (e) {}
      });
    }).observe(main, { subtree: true, childList: true, characterData: true });
}
