/*
 * Asking for a roll
 *
 * Every roll a player makes is one they see and click: a card over the table says what is rolled and why, the
 * player presses Roll, the dice land on the card, then Continue carries on. The built-in opponent rolls its own dice
 * straight away (shown on the banner, as before). Online, the roll is also shown to the other player.
 *
 * In this file: rollAskWho(), askRoll()
 */

/* does a person roll these dice (not the built-in opponent, and not a test run)? */
function rollAskWho(side) {
  if (window.__autoRoll) return false;
  if (!PVP() && side === AI) return false;
  if (PVP() && side && side !== HU) return false;
  return true;
}

/* o: { title, text, n, side, ok(v) → the die succeeds, sum(rolls) → a line saying what the dice did }
   Resolves with the rolled values. */
function askRoll(o) {
  const n = Math.max(0, Math.floor(+o.n || 0));
  if (!n) return Promise.resolve([]);
  const roll = () => Array.from({ length: n }, d6);
  const dice = r => r.map(v => ({ v, cls: o.ok ? (o.ok(v) ? 'hit' : 'miss') : '' }));
  if (!rollAskWho(o.side)) {
    const r = roll();
    banner(o.title, dice(r), o.sum ? o.sum(r) : o.text || '');
    setTimeout(bannerHide, 1600);
    return Promise.resolve(r);
  }
  return new Promise(res => {
    const host = document.querySelector('.leftcol') || document.body;
    const old = document.getElementById('roll-ask');
    if (old) old.remove();
    const box = bEl('div', { id: 'roll-ask', className: 'roll-ask' });
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', o.title);
    const dr = bEl('div', { className: 'drow' }),
      line = bEl('div', { className: 'ra-sum' }),
      btn = bEl('button', {
        type: 'button',
        className: 'btn',
        textContent: 'Roll ' + n + (n === 1 ? ' die' : ' dice')
      });
    box.append(
      bEl('div', { className: 'ra-t', textContent: o.title }),
      bEl('div', { className: 'ra-x', textContent: o.text || '' }),
      dr,
      line,
      btn
    );
    host.append(box);
    try {
      btn.focus();
    } catch (e) {}
    let r = null;
    btn.onclick = () => {
      if (!r) {
        r = roll();
        lastRollAt = performance.now();
        dice(r).forEach(x => dr.appendChild(dieMini(x.v, x.cls, 'ra' + Date.now() + Math.random())));
        line.textContent = o.sum ? o.sum(r) : '';
        try {
          pubRoll(o.title, dice(r), line.textContent);
        } catch (e) {}
        btn.textContent = 'Continue';
        return;
      }
      box.remove();
      res(r);
    };
  });
}
