/* Main menu pages, lobbies and starting a new game. */
function mmGo(p) {
  mmPage = p;
  render();
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {}
}
async function mmStart(kind) {
  mmOverlay = false;
  if (kind === 'test') {
    mmPage = null;
    await tfEnter();
    return;
  }
  const want = kind === 'multi' ? 'pvp' : 'ai';
  if (!mmSetupStep()) {
    await newGameNow();
  }
  if ((state.mode || 'ai') !== want) await putState({ mode: want });
  mmGo(kind);
}
async function newGameNow() {
  resetArm = true;
  await newGame();
}
function mmCard(t, sub, ico, fn, opt) {
  opt = opt || {};
  const b = bEl('button', {
    type: 'button',
    className: 'mm-card' + (opt.primary ? ' pri' : '') + (opt.small ? ' sm' : '')
  });
  b.disabled = !!opt.disabled;
  b.append(
    bEl('span', { className: 'mm-ico', textContent: ico }),
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
    const hero = bEl('div', { className: 'mm-hero' }, [
      bEl('h1', { textContent: 'Vale of Banners' }),
      bEl('p', { textContent: 'A battle table for Conquest: The Last Argument of Kings' })
    ]);
    inner.append(hero);
    const grid = bEl('div', { className: 'mm-grid' });
    if (mmGameOn())
      grid.append(
        mmCard(
          'Continue',
          (state.phase || 'Round ' + (state.round || 1)) +
            ' · ' +
            N('cs') +
            ' ' +
            (state.vp?.cs || 0) +
            ' – ' +
            (state.vp?.nord || 0) +
            ' ' +
            N('nord'),
          '▶',
          () => {
            mmOverlay = false;
            mmPage = null;
            render();
          },
          { primary: true }
        )
      );
    else if (mmSetupStep() && state.setup && (state.setup.cs || state.setup.nord))
      grid.append(
        mmCard(
          'Continue setting up',
          PVP() ? 'Multiplayer lobby' : 'Single player lobby',
          '▶',
          () => mmGo(PVP() ? 'multi' : 'single'),
          { primary: true }
        )
      );
    const busy = mmOverlay && (mmGameOn() || SBX()),
      bz = busy ? { disabled: true } : {},
      bs = t => (busy ? (SBX() ? 'Leave the test field first' : 'Leave this game first') : t);
    grid.append(
      mmCard(
        'Single player',
        bs('Play against Claude: build or paste your army, Claude designs its own'),
        '⚔',
        () => mmStart('single'),
        bz
      )
    );
    grid.append(
      mmCard(
        'Multiplayer',
        bs('Play a friend online: take a seat, bring your army, ready up'),
        '⚑',
        () => mmStart('multi'),
        bz
      )
    );
    grid.append(
      mmCard(
        'Test field',
        bs('Drop single regiments for either side and try out rules freely'),
        '⚗',
        () => mmStart('test'),
        bz
      )
    );
    grid.append(
      mmCard('Army builder', 'Build, check and save your armies', '✎', () => {
        mmGo('army');
      })
    );
    grid.append(
      mmCard(
        'Combat calculator',
        'Pit two regiments against each other: wounds per attack and who wins the fight',
        '⚖',
        () => {
          mmGo('calc');
        }
      )
    );
    grid.append(
      mmCard(
        'Encyclopedia',
        'Every faction, unit and special rule',
        '📖',
        () => {
          if (mmOverlay) {
            mmOverlay = false;
            mmPage = null;
            render();
          }
          $('en-open').click();
          setTimeout(() => {
            try {
              $('ency').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (e) {}
          }, 60);
        },
        { small: true }
      )
    );
    grid.append(
      mmCard(
        'Settings',
        'Dice speed, animations and display',
        '⚙',
        () => {
          $('set-open').click();
        },
        { small: true }
      )
    );
    const n = mmNet();
    if (n && n.openSettings)
      grid.append(
        mmCard('Claude settings', 'API key and models for playing Claude here', '✦', () => n.openSettings(), {
          small: true
        })
      );
    inner.append(grid);
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
      page === 'single' ? 'You against Claude.' : 'You against a friend, online.',
      {
        label: 'Main menu',
        fn: () => {
          mmPage = 'home';
          render();
        }
      }
    );
    inner.append(mmSteps(rev ? 'field' : 'armies'));
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
          db.doc('game/state')
            .update({ players: { [sd]: v }, updatedAt: Date.now() })
            .catch(() => {});
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
              (n.mode === 'host' ? 'You are hosting. ' : 'Connected. ') +
              'Send your opponent the invite link, then both of you take a seat.'
          })
        );
        if (n.invite)
          c.append(
            bEl('button', {
              type: 'button',
              className: 'btn ghost',
              textContent: 'Copy invite link',
              onclick: () => n.invite()
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

async function newGame() {
  if (!resetArm) {
    resetArm = true;
    render();
    setTimeout(() => {
      resetArm = false;
      render();
    }, 5000);
    return;
  }
  resetArm = false;
  act = null;
  cb = null;
  selId = null;
  charAct = null;
  await putState({
    step: 'setup',
    fr: null,
    sup: null,
    aiSupWant: null,
    units: [],
    round: 0,
    turn: null,
    vp: { cs: 0, nord: 0 },
    aiStack: [],
    huStack: [],
    huHeld: null,
    huLastCard: null,
    strategicHeld: false,
    moves: [],
    setup: null,
    phase: 'New game',
    ready: {},
    chooser: null,
    reinfTurn: 'cs',
    lastTitle: 'New game',
    lastText: 'Set up the armies to begin.'
  });
  $('ai-report').hidden = true;
}

const AUTO_ARMY =
  /Strategic Stack|Direct Orders|Hammer and Anvil|Prophecy Unfulfilled|Animate Vessel|Brittle/;
function armyRulesBox() {
  const d = document.createElement('details');
  d.className = 'vc';
  const sm = document.createElement('summary');
  sm.textContent = 'Army rules';
  d.appendChild(sm);
  ['cs', 'nord'].forEach(side => {
    const list = (state.army && state.army[side]) || [];
    if (!list.length) return;
    const fac = facOf(N(side));
    const h = document.createElement('div');
    h.className = 'en-tag';
    h.style.marginTop = '6px';
    h.textContent = N(side) + (side === HU ? ' (you)' : '');
    d.appendChild(h);
    const ch = document.createElement('div');
    ch.className = 'chips';
    list.forEach(r => {
      const auto = AUTO_ARMY.test(r),
        c = chip(r, auto ? 'fx' : '', fac);
      if (auto) c.textContent += ' · automatic';
      ch.appendChild(c);
    });
    d.appendChild(ch);
  });
  d.appendChild(
    ptext(
      'Rules marked automatic are applied by the map. Apply the others yourselves: hover a rule to read it.'
    )
  );
  return d;
}
