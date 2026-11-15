/*
 * Hotkeys
 *
 * Keyboard shortcuts during play.
 */

/* hotkey: R toggles the ruler, Escape turns it off (not while typing, not with Ctrl/Cmd/Alt, not under a menu page) */
document.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const tg = ev.target;
  if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable) return;
  if (mmCurrent()) return;
  if (ev.key === 'r' || ev.key === 'R') {
    ev.preventDefault();
    toggleRuler();
    toast(ruler ? 'Ruler on (R or Esc to turn off).' : 'Ruler off.');
  } else if (ev.key === 'Escape' && ruler) toggleRuler(false);
  else if (ev.key === '?') {
    ev.preventDefault();
    const dg = $('set-dlg');
    if (!(dg && dg.open)) openSettings('controls');
  }
});

['tab-reg', 'tab-army'].forEach(id =>
  $(id).addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setTab(rightTab === 'reg' ? 'army' : 'reg');
      $(rightTab === 'reg' ? 'tab-reg' : 'tab-army').focus();
    }
  })
);

document.addEventListener('keydown', ev => {
  if (!act && SBX() && selId && !/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) {
    tfKey(ev);
    return;
  }
  if (!act || ev.target.tagName === 'INPUT') return;
  const u = byId(act.id);
  const k = ev.key;
  let dx = 0,
    dy = 0;
  if (k === 'ArrowLeft') dx = 0.5;
  if (k === 'ArrowRight') dx = -0.5;
  if (k === 'ArrowUp') dy = -0.5;
  if (k === 'ArrowDown') dy = 0.5;
  if (FLIP) {
    dx = -dx;
    dy = -dy;
  }
  if (dx || dy) {
    ev.preventDefault();
    setPose({ x: u.x + dx, y: u.y + dy });
  }
  if (k === 'q' || k === 'Q') rot(-15);
  if (k === 'e' || k === 'E') rot(15);
});
