/*
 * Main menu: pages
 *
 * Draws the main menu, its pages and the lobbies.
 *
 * In this file: mmCard(), mmSteps(), renderMenu()
 */

function mmCard(t, sub, ico, fn, opt) {
  opt = opt || {};
  const b = bEl('button', {
    type: 'button',
    className: 'mm-card' + (opt.primary ? ' pri' : '') + (opt.small ? ' sm' : '')
  });
  b.disabled = !!opt.disabled;
  b.append(
    bEl('span', { className: 'mm-ico' }, [icon(ico, 28) || ico]),
    bEl('span', { className: 'mm-tx' }, [
      bEl('strong', { textContent: t }),
      bEl('small', { textContent: sub })
    ])
  );
  b.onclick = fn;
  return b;
}

function mmSteps(cur) {
  const L = [
      ['armies', 'Armies'],
      ['field', 'Battlefield'],
      ['start', 'Start']
    ],
    ol = bEl('ol', { className: 'mm-steps' });
  const ix = L.findIndex(x => x[0] === cur);
  L.forEach(([k, t], i) => {
    const li = bEl('li', { textContent: t });
    li.className = i < ix ? 'ok' : i === ix ? 'now' : '';
    ol.append(li);
  });
  return ol;
}

function renderMenu() {
  const box = $('mm');
  if (!box || !state) return;
  try {
    battleRecord();
  } catch (e) {}
  const page = mmCurrent();
  document.body.classList.toggle('mm-on', !!page && !mmOverlay);
  document.body.classList.toggle('mm-lobby', page === 'single' || page === 'multi');
  document.body.classList.toggle('mm-ov', !!page && mmOverlay);
  box.hidden = !page;
  if (!page) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = '';
  const inner = bEl('div', { className: 'mm-in' });
  box.append(inner);
  const head = (title, sub, back) => {
    const h = bEl('div', { className: 'mm-head' });
    if (back)
      h.append(
        bEl('button', {
          type: 'button',
          className: 'btn ghost mm-back',
          textContent: '← ' + back.label,
          onclick: back.fn
        })
      );
    h.append(
      bEl('div', {}, [
        bEl('h2', { textContent: title }),
        sub ? bEl('p', { className: 'hint', textContent: sub }) : ''
      ])
    );
    inner.append(h);
    return h;
  };
  const home = () => {
    mmOverlay = false;
    mmGo(null);
  };
  if (page === 'home') {
    mmHome(inner);
    if (mmOverlay && SBX()) {
      const row = bEl('div', { className: 'mm-foot' });
      row.append(
        bEl('button', {
          type: 'button',
          className: 'btn',
          textContent: 'Back to the test field',
          onclick: () => {
            mmOverlay = false;
            render();
          }
        }),
        bEl('button', {
          type: 'button',
          className: 'btn ghost',
          textContent: 'Leave the test field',
          onclick: async () => {
            mmOverlay = false;
            mmPage = 'home';
            await tfLeave();
          }
        })
      );
      inner.append(row);
    }
    if (mmOverlay && mmGameOn()) {
      const row = bEl('div', { className: 'mm-foot' });
      const lv = bEl('button', {
        type: 'button',
        className: 'btn ghost mm-danger',
        textContent: mmLeaveArm ? 'Click again: end this game and return to the menu' : 'Leave this game'
      });
      lv.onclick = async () => {
        if (!mmLeaveArm) {
          mmLeaveArm = true;
          renderMenu();
          setTimeout(() => {
            mmLeaveArm = false;
            renderMenu();
          }, 5000);
          return;
        }
        mmLeaveArm = false;
        mmOverlay = false;
        mmPage = null;
        await newGameNow();
      };
      row.append(
        bEl('button', {
          type: 'button',
          className: 'btn',
          textContent: 'Back to the game',
          onclick: () => {
            mmOverlay = false;
            render();
          }
        }),
        lv
      );
      inner.append(row);
    }
    return;
  }
  if (page === 'calc') {
    try {
      calcPage(inner, head);
    } catch (e) {
      console.error(e);
      inner.append(ptext('The calculator could not be shown: ' + e.message, 'hint'));
    }
    return;
  }
  if (page === 'army') {
    head(
      'Army builder',
      'Build an army, check it is legal, and save it on this device. Saved armies can be loaded in any lobby.',
      { label: mmOverlay ? 'Menu' : 'Main menu', fn: () => mmGo(mmOverlay ? 'home' : null) }
    );
    const body = bEl('div', { className: 'mm-body' });
    inner.append(body);
    try {
      bldUse('main');
    } catch (e) {}
    const mk = (t, fn, ghost) => {
      const b = bEl('button', { type: 'button', className: 'btn' + (ghost ? ' ghost' : ''), textContent: t });
      b.onclick = fn;
      return b;
    };
    armyBuilder(
      e => body.append(e),
      mk,
      L => {
        toast('Army checked and ready. Open Single player or Multiplayer to field it.');
      },
      'Check this army'
    );
    return;
  }
  if (page === 'single' || page === 'multi') {
    const rev = state.step === 'review';
    if (state.step === 'setup' && (page === 'multi') !== PVP() && renderMenu.sw !== page) {
      renderMenu.sw = page;
      putState({ mode: page === 'multi' ? 'pvp' : 'ai' });
    }
    head(
      page === 'single' ? 'Single player' : 'Multiplayer',
      page === 'single' ? 'You against the built-in opponent.' : 'You against a friend, online.',
      {
        label: 'Main menu',
        fn: () => {
          mmPage = 'home';
          render();
        }
      }
    );
    /* the multiplayer lobby: both players side by side (the army builder opens under it) */
    if (page === 'multi' && !rev) {
      mpLobby(inner);
      return;
    }
    /* single player before the review: the lobby (in the panel below) has its own progress bar */
    if (page === 'single' && !rev) return;
    /* the review has its own progress bar too */
    if (!rev) inner.append(mmSteps('armies'));
    if (page === 'multi') {
      const nm = bEl('div', { className: 'mm-net mm-name' });
      const lab = bEl('label', { className: 'pn-in' });
      lab.append(bEl('span', { className: 'tf-l', textContent: 'Your name' }));
      const inp = bEl('input', {
        type: 'text',
        maxLength: 24,
        value: savedName(),
        placeholder: 'Type the name others will see',
        id: 'mm-name'
      });
      inp.setAttribute('autocomplete', 'nickname');
      const commit = () => {
        const v = inp.value.trim().slice(0, 24);
        try {
          localStorage.setItem('conquest-player-name', v);
        } catch (e) {}
        const sd = seatSide();
        if (sd && PVP() && v !== PN(sd))
          stateUpdate({ players: { [sd]: v }, updatedAt: Date.now() }).catch(() => {});
        presencePing(true);
        renderMenu();
        renderTurnbar();
      };
      inp.onchange = commit;
      inp.onkeydown = e => {
        if (e.key === 'Enter') inp.blur();
      };
      lab.append(inp);
      nm.append(lab);
      if (!savedName())
        nm.append(
          bEl('p', {
            className: 'hint',
            textContent:
              'Fill in your name first: the other players see it, and you need it to host, join or take a seat.'
          })
        );
      inner.append(nm);
    }
    if (page === 'multi' && !rev) {
      const n = mmNet(),
        noName = !savedName();
      if (n && n.mode === 'local') {
        const c = bEl('div', { className: 'mm-net' });
        c.append(
          bEl('h3', { textContent: 'Connect' }),
          bEl('p', {
            className: 'hint',
            textContent:
              'One player hosts and sends the invite link; the other joins with it or with the game code. Then each of you takes a seat below.'
          })
        );
        const r = bEl('div', { className: 'tf-row' });
        const hb = bEl('button', {
          type: 'button',
          className: 'btn',
          textContent: 'Host an online game',
          onclick: () => n.host()
        });
        hb.disabled = noName;
        r.append(hb);
        const inp = bEl('input', {
          type: 'text',
          className: 'tf-in',
          placeholder: 'Game code',
          maxLength: 12
        });
        inp.setAttribute('aria-label', 'Game code from the host');
        const jb = bEl('button', {
          type: 'button',
          className: 'btn ghost',
          textContent: 'Join',
          onclick: () => n.join(inp.value)
        });
        jb.disabled = noName;
        r.append(inp, jb);
        c.append(r);
        inner.append(c);
      } else if (n && n.mode && n.mode !== 'local') {
        const c = bEl('div', { className: 'mm-net' });
        c.append(
          bEl('p', {
            className: 'hint',
            textContent:
              n.mode === 'host'
                ? 'You are hosting. Send your opponent the invite link (Copy invite link, at the top of the page), then both of you take a seat.'
                : 'Connected to the host’s game. Take the open seat to play, or stay unseated to watch.'
          })
        );
        inner.append(c);
      }
    }
    if (page === 'multi') {
      const n = mmNet(),
        online = n ? n.mode && n.mode !== 'local' : lobbyPeople().some(p => !p.me && (p.online || p.seat));
      if (online) inner.append(lobbyBox());
    }
    return;
  }
}
