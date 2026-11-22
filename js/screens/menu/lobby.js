/*
 * Multiplayer lobby
 *
 * One page with both players side by side: you on the left, your opponent on the right, and between them the
 * connection, the battlefield (the host decides) and the lobby activity with quick messages. A bar across the top
 * shows how far the two of you are: opponent joined, seated, your army, their army, review. Building an army opens
 * under the lobby.
 *
 * In this file: mpEdit, MP_SAY, mpLog(), mpSay(), mpArmyLines(), mpCard(), mpLobby(), spSeg(),
 *   spArmyReady(), spLobby()
 */

let mpEdit = false; /* your army builder is open, though you already have an army */

const MP_SAY = ['👋 Hi!', '⏳ One moment', '✓ Ready when you are', '👍 Good luck'];

/* an entry in the lobby activity, seen by everyone in the lobby (old entries drop off) */
function mpLog(text, chat) {
  if (!state || !PVP()) return Promise.resolve();
  const L = state.lobbyLog || {},
    keys = Object.keys(L).sort(),
    k = Date.now().toString(36) + '-' + String(myId || 'x').slice(0, 6),
    patch = { [k]: { t: Date.now(), x: String(text).slice(0, 120), n: chat ? savedName() || 'Someone' : '' } };
  keys.slice(0, Math.max(0, keys.length - 39)).forEach(o => (patch[o] = null));
  return stateUpdate({ lobbyLog: patch, updatedAt: Date.now() }).catch(() => {});
}

function mpSay(text) {
  return mpLog(text, true);
}

/* an army as short lines: the regiments with their characters */
function mpArmyLines(L) {
  return (L.units || [])
    .filter(u => u && u.name)
    .map(u => {
      const c = u.character && (u.character.name || u.character.charName);
      return { a: c || u.name, b: c ? u.name : '' };
    });
}

/* a player's card; side: their seat (or null for an empty one), mine: it is you */
function mpCard(side, mine) {
  const S0 = state.setup || {},
    seats = state.seats || {},
    who = side && seats[side],
    L = side && S0[side],
    card = bEl('section', { className: 'mp3-p' + (mine ? ' me' : ' opp') });
  if (side) card.style.setProperty('--pc', 'var(--' + side + ')');
  const ppl = lobbyPeople(),
    p = who ? ppl.find(x => x.id === who) : null,
    name = (side && PN(side)) || (mine ? savedName() : '') || (who ? 'Unnamed player' : ''),
    online = mine || !!(p && p.online);
  /* heading: avatar, name, seat, status */
  const av = bEl('span', { className: 'mp3-av', textContent: (name || '?').slice(0, 1).toUpperCase() });
  const status = !who
    ? ['open', mine ? 'Not seated' : 'Seat open']
    : L
      ? ['ok', 'Army ready ✓']
      : ['wait', 'Building army…'];
  card.append(
    bEl('div', { className: 'mp3-ph' }, [
      av,
      bEl('div', { className: 'mp3-pn' }, [
        bEl('strong', { textContent: name || (mine ? 'You' : 'Waiting for an opponent') }),
        bEl('span', {
          textContent:
            (mine ? 'You' : 'Opponent') +
            (side ? ' · ' + SEATNAME[side] : '') +
            (!mine && who ? (online ? ' · connected' : p && p.left ? ' · left' : ' · not connected') : '')
        })
      ]),
      bEl('span', { className: 'mp3-chip ' + status[0], textContent: status[1] })
    ])
  );
  /* not seated yet: your name and a choice of edge */
  if (mine && !who) {
    const nm = bEl('label', { className: 'pn-in' });
    nm.append(bEl('span', { className: 'tf-l', textContent: 'Your name' }));
    const inp = bEl('input', {
      type: 'text',
      maxLength: 24,
      value: savedName(),
      placeholder: 'The name your opponent sees',
      id: 'mm-name'
    });
    inp.setAttribute('autocomplete', 'nickname');
    inp.onchange = () => {
      try {
        localStorage.setItem('conquest-player-name', inp.value.trim().slice(0, 24));
      } catch (e) {}
      presencePing(true);
      renderMenu();
    };
    inp.onkeydown = e => {
      if (e.key === 'Enter') inp.blur();
    };
    nm.append(inp);
    card.append(nm);
    const sits = bEl('div', { className: 'mp3-sits' });
    ['cs', 'nord'].forEach(s => {
      const taken = !!seats[s],
        b = bEl('button', {
          type: 'button',
          className: 'btn' + (taken ? ' ghost' : ''),
          textContent: taken ? SEATNAME[s] + ': taken' : 'Sit at the ' + SEATNAME[s]
        });
      b.style.setProperty('--pc', 'var(--' + s + ')');
      b.disabled = taken || !myId || !savedName();
      b.title = !savedName() ? 'Fill in your name first' : '';
      b.onclick = async () => {
        if (!savedName()) {
          toast('Fill in your name first.');
          return;
        }
        try {
          await stateUpdate({ seats: { [s]: myId }, players: { [s]: savedName() }, updatedAt: Date.now() });
          mpLog(savedName() + ' took the ' + SEATNAME[s]);
        } catch (e) {
          toast('That seat could not be taken. Try again.');
        }
      };
      sits.append(b);
    });
    card.append(sits);
    if (!myId)
      card.append(
        bEl('p', {
          className: 'warn',
          textContent: 'Your identity is not available in this view, so you cannot take a seat here.'
        })
      );
    return card;
  }
  if (!who) {
    card.append(
      bEl('p', {
        className: 'hint',
        textContent:
          'Nobody sits here yet. ' +
          (mmNet() && mmNet().mode === 'host'
            ? 'Send your opponent the invite link or the game code.'
            : mmNet() && mmNet().mode && mmNet().mode !== 'local'
              ? 'Your opponent takes this seat when they arrive.'
              : 'Share this page with your opponent; they take this seat.')
      })
    );
    return card;
  }
  /* the army: yours in full, theirs as a faction and size until the review */
  const ab = bEl('div', { className: 'mp3-army' });
  if (L) {
    ab.append(
      bEl('div', { className: 'mp3-fac' }, [
        bEl('strong', { textContent: L.faction || 'Army' }),
        bEl('span', {
          textContent:
            ' · ' +
            (L.points ? L.points.toLocaleString('en') + ' pts · ' : '') +
            (L.units || []).length +
            ((L.units || []).length === 1 ? ' entry' : ' entries')
        })
      ])
    );
    if (mine) {
      const ul = bEl('div', { className: 'mp3-list' });
      mpArmyLines(L)
        .slice(0, 14)
        .forEach(r => ul.append(bEl('div', {}, [bEl('b', { textContent: r.a }), bEl('span', { textContent: r.b })])));
      ab.append(ul);
    } else ab.append(bEl('p', { className: 'hint', textContent: 'Their full list shows in the review.' }));
  } else
    ab.append(
      bEl('p', {
        className: 'hint',
        textContent: mine ? 'Build your army below, or paste a list.' : 'Still building their army.'
      })
    );
  card.append(ab);
  const foot = bEl('div', { className: 'mp3-pf' });
  if (mine) {
    foot.append(colorPicker(side, 'Colour', true));
    const row = bEl('div', { className: 'row' });
    if (L) {
      const eb = bEl('button', {
        type: 'button',
        className: 'btn ghost',
        textContent: mpEdit ? 'Close the builder' : 'Change army'
      });
      eb.onclick = () => {
        mpEdit = !mpEdit;
        render();
      };
      row.append(eb);
    }
    const lv = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Leave seat' });
    lv.onclick = async () => {
      await stateUpdate({ seats: { [side]: null }, updatedAt: Date.now() }).catch(() => {});
      mpLog((PN(side) || 'A player') + ' left the ' + SEATNAME[side]);
    };
    row.append(lv);
    foot.append(row);
  } else if (mmNet() && mmNet().mode === 'host') {
    /* the host can free a seat, for a player who comes back on another device */
    const fr = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Free this seat' });
    fr.onclick = () => stateUpdate({ seats: { [side]: null }, updatedAt: Date.now() }).catch(() => {});
    foot.append(fr);
  }
  card.append(foot);
  return card;
}

/* the lobby page (before the review) */
function mpLobby(inner) {
  const S0 = state.setup || {},
    seats = state.seats || {},
    me = seatSide(),
    opp = me ? other(me) : seats.cs && seats.cs !== myId ? 'cs' : seats.nord && seats.nord !== myId ? 'nord' : null,
    n = mmNet(),
    host = typeof ovrHost === 'function' && ovrHost();
  const oppIn = !!(opp && seats[opp]) || lobbyPeople().some(p => !p.me && p.online);
  /* how far the two of you are */
  const st = [
    ['Opponent joined', oppIn],
    ['You are seated', !!me],
    ['Your army', !!(me && S0[me])],
    [opp && PN(opp) ? PN(opp) + '’s army' : 'Their army', !!(opp && S0[opp])],
    ['Review', false]
  ];
  const cur = st.findIndex(x => !x[1]);
  const prog = bEl('div', { className: 'mp3-prog' });
  st.forEach(([t, ok], i) =>
    prog.append(
      bEl('div', { className: 'mp3-st' + (ok ? ' ok' : i === cur ? ' now' : '') }, [
        bEl('i'),
        bEl('span', { textContent: (ok ? '✓ ' : '') + t })
      ])
    )
  );
  inner.append(prog);
  const cols = bEl('div', { className: 'mp3-cols' });
  /* the middle: connection, battlefield, activity, the next step */
  const mid = bEl('div', { className: 'mp3-mid' });
  if (n && n.mode === 'local') {
    const c = bEl('section', { className: 'mp3-box' });
    c.append(
      bEl('h3', { textContent: 'Connect' }),
      bEl('p', {
        className: 'hint',
        textContent: 'One of you hosts and sends the invite link; the other joins with it or with the game code.'
      })
    );
    const r = bEl('div', { className: 'tf-row' });
    const hb = bEl('button', { type: 'button', className: 'btn', textContent: 'Host an online game' });
    hb.onclick = () => n.host();
    const gi = bEl('input', { type: 'text', className: 'tf-in', placeholder: 'Game code', maxLength: 12 });
    gi.setAttribute('aria-label', 'Game code from the host');
    const jb = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Join' });
    jb.onclick = () => n.join(gi.value);
    hb.disabled = jb.disabled = !savedName();
    if (!savedName()) c.append(bEl('p', { className: 'warn', textContent: 'Fill in your name first (on the left).' }));
    r.append(hb, gi, jb);
    c.append(r);
    mid.append(c);
  } else if (n && n.mode === 'host' && n.room) {
    const c = bEl('section', { className: 'mp3-box mp3-code' });
    const ib = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Copy invite link' });
    ib.onclick = () => n.invite();
    c.append(
      bEl('div', {}, [
        bEl('span', { className: 'mp3-k', textContent: 'Game code' }),
        bEl('strong', { className: 'mp3-cd', textContent: String(n.room).toUpperCase() })
      ]),
      ib
    );
    mid.append(c);
  }
  if (!n && !(opp && seats[opp]))
    mid.append(
      bEl('section', { className: 'mp3-box' }, [
        bEl('h3', { textContent: 'Invite your opponent' }),
        bEl('p', {
          className: 'hint',
          textContent: 'Share this page from the Share menu, with permission to interact. Your opponent opens it and takes the other seat.'
        })
      ])
    );
  {
    const c = bEl('section', { className: 'mp3-box' });
    c.append(bEl('h3', { textContent: 'Battlefield · the host decides' }));
    c.append(
      bEl('p', {
        className: 'hint',
        textContent:
          'Once both armies are ready, the host opens the review and picks the scenario and the table; you both see it there before the battle starts.'
      })
    );
    mid.append(c);
  }
  {
    const c = bEl('section', { className: 'mp3-box mp3-feed' });
    c.append(bEl('h3', { textContent: 'Lobby activity' }));
    const L = state.lobbyLog || {},
      keys = Object.keys(L)
        .filter(k => L[k])
        .sort()
        .slice(-12);
    const ul = bEl('div', { className: 'mp3-log' });
    if (!keys.length) ul.append(bEl('p', { className: 'hint', textContent: 'Nothing has happened yet.' }));
    keys.forEach(k => {
      const e = L[k],
        t = new Date(+e.t || 0);
      ul.append(
        bEl('div', { className: e.n ? 'say' : '' }, [
          bEl('time', { textContent: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') }),
          e.n ? bEl('b', { textContent: e.n + ': ' }) : '',
          document.createTextNode(e.x || '')
        ])
      );
    });
    c.append(ul);
    const q = bEl('div', { className: 'mp3-say' });
    MP_SAY.forEach(t => {
      const b = bEl('button', { type: 'button', className: 'btn ghost', textContent: t });
      b.disabled = !savedName();
      b.onclick = () => mpSay(t);
      q.append(b);
    });
    c.append(q);
    mid.append(c);
    requestAnimationFrame(() => (ul.scrollTop = ul.scrollHeight));
  }
  {
    const both = !!(S0.cs && S0.nord),
      go = bEl('button', { type: 'button', className: 'btn mp3-go', textContent: 'Review both armies' });
    go.disabled = !(both && me && host);
    go.onclick = async () => {
      mpLog('The host opened the review');
      await putState({ scenario: scenId(), zones: scenOf().zones });
      await putState({ step: 'review', terrain: genTerrain(), phase: 'New game · Check both armies' });
    };
    const why = !me
      ? 'Take a seat to play'
      : !both
        ? !S0[me]
          ? 'Get your army ready'
          : 'Waiting for ' + ((opp && PN(opp)) || 'your opponent') + "'s army"
        : host
          ? 'Both armies are ready'
          : 'Waiting for the host to open the review';
    mid.append(bEl('p', { className: 'mp3-why', textContent: why }), go);
  }
  cols.append(mpCard(me, true), mid, mpCard(opp, false));
  inner.append(cols);
}

/* ---------- the single player lobby: the same layout, with the built-in opponent on the right ---------- */

/* a row of choices (Difficulty) */
function spSeg(label, opts, cur, pick) {
  const g = bEl('div', { className: 'grp opp-grp' });
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  opts.forEach(([v, t, dis]) => {
    const b = bEl('button', { type: 'button', textContent: t });
    b.setAttribute('aria-pressed', String(cur === v));
    if (dis) {
      b.disabled = true;
      b.title = dis;
    }
    b.onclick = () => {
      pick(v);
      renderTurnbar();
    };
    g.append(b);
  });
  return bEl('div', { className: 'opp-row' }, [bEl('span', { className: 'tf-l', textContent: label }), g]);
}

/* is your army ready to go to the review? */
function spArmyReady() {
  if (armyMode === 'paste') return !!String(setupDraft.list || '').trim();
  return !!(bld.fac && bld.wbs.length && !bldProblems().length);
}

function spLobby(aif, mk) {
  const wrap = bEl('div', { className: 'sp-lobby-in' }),
    ready = spArmyReady();
  /* how far you are */
  const st = [
    ['Your army', ready],
    ['Opponent', ready],
    ['Review', false],
    ['Battle', false]
  ];
  const cur = st.findIndex(x => !x[1]);
  const prog = bEl('div', { className: 'mp3-prog' });
  st.forEach(([t, ok], i) =>
    prog.append(
      bEl('div', { className: 'mp3-st' + (ok ? ' ok' : i === cur ? ' now' : '') }, [
        bEl('i'),
        bEl('span', { textContent: (ok ? '✓ ' : '') + t })
      ])
    )
  );
  wrap.append(prog);
  const cols = bEl('div', { className: 'mp3-cols' });
  const head = (name, sub, chip, cls) => {
    const av = bEl('span', { className: 'mp3-av', textContent: (name || '?').slice(0, 1).toUpperCase() });
    return bEl('div', { className: 'mp3-ph' }, [
      av,
      bEl('div', { className: 'mp3-pn' }, [bEl('strong', { textContent: name }), bEl('span', { textContent: sub })]),
      bEl('span', { className: 'mp3-chip ' + cls, textContent: chip })
    ]);
  };
  /* you */
  const you = bEl('section', { className: 'mp3-p me' });
  you.style.setProperty('--pc', 'var(--cs)');
  you.append(
    head(
      PN('cs') || savedName() || 'You',
      'You · ' + SEATNAME.cs,
      ready ? 'Army ready ✓' : 'Building army…',
      ready ? 'ok' : 'wait'
    ),
    nameInput('cs', 'Your name', true)
  );
  {
    const ab = bEl('div', { className: 'mp3-army' });
    if (armyMode === 'paste')
      ab.append(
        bEl('p', {
          className: 'hint',
          textContent: setupDraft.list.trim()
            ? 'A pasted list (' + setupDraft.list.trim().split('\n').length + ' lines). It is read when you go to the review.'
            : 'Paste your list below.'
        })
      );
    else if (bld.fac && bld.wbs.length) {
      ab.append(
        bEl('div', { className: 'mp3-fac' }, [
          bEl('strong', { textContent: bld.fac }),
          bEl('span', {
            textContent:
              ' · ' +
              bldTotal().toLocaleString('en') +
              ' pts · ' +
              bld.wbs.length +
              (bld.wbs.length === 1 ? ' warband' : ' warbands')
          })
        ])
      );
      const ul = bEl('div', { className: 'mp3-list' });
      bld.wbs.forEach(w => {
        if (w.char) ul.append(bEl('div', {}, [bEl('b', { textContent: w.char }), bEl('span', { textContent: 'Character' })]));
        (w.regs || []).forEach(r =>
          ul.append(
            bEl('div', {}, [
              bEl('b', { textContent: r.unit || 'Regiment' }),
              bEl('span', { textContent: r.stands ? r.stands + ' stands' : '' })
            ])
          )
        );
      });
      ab.append(ul);
      const pr = bldProblems();
      if (pr.length) ab.append(bEl('p', { className: 'warn', textContent: pr[0] }));
    } else
      ab.append(bEl('p', { className: 'hint', textContent: 'Build your army below, or paste a list.' }));
    you.append(ab);
  }
  you.append(bEl('div', { className: 'mp3-pf' }, [colorPicker('cs', 'Colour', true)]));
  /* the opponent */
  const opp = bEl('section', { className: 'mp3-p opp' });
  opp.style.setProperty('--pc', 'var(--nord)');
  opp.append(
    head(
      'Built-in opponent',
      'Opponent · ' + SEATNAME.nord + ' · plays automatically',
      'Ready ✓',
      'ok'
    )
  );
  opp.append(
      spSeg(
        'Difficulty',
        [
          ['easy', 'Easy'],
          ['normal', 'Normal'],
          ['hard', 'Hard']
        ],
        setupDraft.botLevel || 'normal',
        v => (setupDraft.botLevel = v)
      )
    );
  {
    /* the faction picker's own label, moved here */
    const l = aif.parentNode && aif.parentNode.tagName === 'LABEL' ? aif.parentNode : bEl('label', { className: 'sf' }, [aif]);
    const ls = l.querySelector('span');
    if (ls) ls.textContent = 'Its army';
    opp.append(
      l,
      bEl('p', {
        className: 'hint',
        textContent: 'It builds an army of the same size as yours.'
      })
    );
  }
  opp.append(bEl('div', { className: 'mp3-pf' }, [colorPicker('nord', 'Colour', true)]));
  /* the middle */
  const mid = bEl('div', { className: 'mp3-mid' });
  mid.append(
    bEl('section', { className: 'mp3-box' }, [
      bEl('h3', { textContent: 'Battlefield' }),
      bEl('p', {
        className: 'hint',
        textContent:
          'You pick the scenario and the terrain in the review, with both armies in front of you, before the battle starts.'
      })
    ])
  );
  {
    const c = bEl('section', { className: 'mp3-box sp-check' });
    c.append(bEl('h3', { textContent: 'Ready to play' }));
    [
      [ready, ready ? 'Your army' + (bld.fac && armyMode !== 'paste' ? ' (' + bld.fac + ')' : '') : 'Your army is not ready yet'],
      [true, 'Opponent: built-in, ' + (setupDraft.botLevel || 'normal')]
    ].forEach(([ok, t]) => c.append(bEl('div', { className: ok ? 'ok' : 'no', textContent: (ok ? '✓ ' : '○ ') + t })));
    mid.append(c);
  }
  mid.append(
    bEl('p', {
      className: 'mp3-why',
      textContent: ready ? 'Both armies are built when you go on' : armyMode === 'paste' ? 'Paste your list first' : 'Finish your army first'
    }),
    bEl('span', { id: 'sp-go' })
  );
  cols.append(you, mid, opp);
  wrap.append(cols);
  return wrap;
}
