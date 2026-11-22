/*
 * Settings and hotkeys
 *
 * The player's settings (saved in the browser), the list of every hotkey and the Settings window.
 *
 * In this file: SET, saveSet(), HOTKEYS, hotkeyList(), setSwitch(), SET_SECTIONS, openSettings()
 */

const SET = (() => {
  const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let v = {};
  try {
    v = JSON.parse(localStorage.getItem('conquest-settings') || '{}') || {};
  } catch (e) {}
  return Object.assign({ diceAnim: !rm, diceSpeed: 'normal', ownSaves: true }, v);
})();

function saveSet() {
  try {
    localStorage.setItem('conquest-settings', JSON.stringify(SET));
  } catch (e) {}
}

/* every hotkey in the game, shown on the Controls tab of Settings */
const HOTKEYS = [
  [
    'Table tools',
    'Any time on the table, unless you are typing in a field.',
    [
      ['R', 'Ruler on or off. Click two points, or two regiments for the closest distance.'],
      ['Esc', 'Turn the ruler off; close a tooltip.'],
      [
        'A',
        'Arcs on or off: point at a regiment to see its front, flank and rear arcs; select one to keep them shown.'
      ],
      [
        'T',
        'Threat ranges: Charge threat, then Volley threat, then off. Select the regiment to tick its boosts.'
      ],
      [
        'Shift + click',
        'With threat ranges on: keep that regiment’s threat shown (also while your own regiment moves).'
      ],
      ['P', 'Ping the spot under the pointer. Online, your opponent sees it.'],
      ['?', 'Open this list.']
    ]
  ],
  [
    'Moving a regiment',
    'While a March, Reform or other move of your activating regiment is open.',
    [
      ['← → ↑ ↓', 'Nudge it ½″ (directions follow your side of the table).'],
      ['Q', 'Wheel 15° to the left.'],
      ['E', 'Wheel 15° to the right.']
    ]
  ],
  [
    'Test field',
    'With a regiment selected and nothing activating.',
    [
      ['← → ↑ ↓', 'Move the selected regiment ½″.'],
      ['Q / E', 'Turn it 15° left or right.']
    ]
  ],
  [
    'Panels',
    'Keyboard navigation.',
    [
      ['← →', 'On the Regiment and Armies tabs: switch tab.'],
      ['Enter / Space', 'Open a focused regiment row or card.']
    ]
  ]
];

function hotkeyList() {
  const wrap = document.createElement('div');
  wrap.className = 'set-keys';
  HOTKEYS.forEach(([title, note, keys]) => {
    const sec = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = note;
    const dl = document.createElement('dl');
    keys.forEach(([k, t]) => {
      const dt = document.createElement('dt');
      k.split(' / ').forEach((part, i) => {
        if (i) dt.append(' / ');
        part.split(' ').forEach(q => {
          const kb = document.createElement('kbd');
          kb.textContent = q;
          dt.append(kb);
        });
      });
      const dd = document.createElement('dd');
      dd.textContent = t;
      dl.append(dt, dd);
    });
    sec.append(h, p, dl);
    wrap.appendChild(sec);
  });
  return wrap;
}

/* a switch for a setting: On / Off, saved at once */
function setSwitch(get, put) {
  const sw = bEl('button', { type: 'button', className: 'set-sw' });
  sw.setAttribute('role', 'switch');
  const upd = () => {
    sw.setAttribute('aria-checked', String(!!get()));
    sw.textContent = get() ? 'On' : 'Off';
  };
  upd();
  sw.onclick = () => {
    put(!get());
    saveSet();
    upd();
  };
  return sw;
}

/* the sections of the Settings window: [key, title, icon, heading] */
const SET_SECTIONS = [
  ['general', 'Dice', 'die', 'How rolls look and who rolls them'],
  ['controls', 'Controls', 'keys', 'Every keyboard shortcut'],
  ['table', 'Table and display', 'map', 'How the table moves and what it shows'],
  ['player', 'Player', 'person', 'How others see you'],
  ['claude', 'Claude', 'spark', 'Playing against Claude']
];

function openSettings(tab) {
  let dg = $('set-dlg');
  if (!dg) {
    dg = document.createElement('dialog');
    dg.id = 'set-dlg';
    dg.className = 'en-dlg set-dlg';
    dg.setAttribute('aria-labelledby', 'set-h');
    document.body.appendChild(dg);
    dg.addEventListener('click', e => {
      if (e.target === dg) dg.close();
    });
  }
  dg.innerHTML = '';
  /* left: the sections; right: the one that is open */
  const nav = bEl('nav', { className: 'set-nav' });
  nav.append(bEl('h2', { id: 'set-h', textContent: 'Settings' }));
  const tabs = bEl('div', { className: 'set-tabs' });
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-orientation', 'vertical');
  nav.append(tabs);
  const main = bEl('div', { className: 'set-main' });
  const head = bEl('div', { className: 'set-head' });
  const hk = bEl('div', { className: 'mh-k' }),
    ht = bEl('div', { className: 'set-ht' });
  const x = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Close' });
  x.onclick = () => dg.close();
  head.append(bEl('div', {}, [hk, ht]), x);
  main.append(head);
  const panes = {};
  const pane = k => {
    const b = bEl('div', { className: 'set-body', id: k === 'general' ? 'set-p-gen' : k === 'controls' ? 'set-p-keys' : 'set-p-' + k });
    b.setAttribute('role', 'tabpanel');
    panes[k] = b;
    main.append(b);
    return b;
  };
  const row = (body, label, hint, ctl) => {
    const r = bEl('div', { className: 'set-row' });
    r.append(bEl('div', {}, [bEl('b', { textContent: label }), bEl('p', { className: 'hint', textContent: hint })]), ctl);
    body.appendChild(r);
    return r;
  };
  const show = which => {
    SET_SECTIONS.forEach(([k, t, ic, h]) => {
      panes[k].hidden = k !== which;
      if (k === which) {
        hk.textContent = t;
        ht.textContent = h;
      }
    });
    tabs.querySelectorAll('[role=tab]').forEach(b => {
      const on = b.dataset.tab === which;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  };
  SET_SECTIONS.forEach(([k, t, ic], i) => {
    const b = bEl('button', { type: 'button', className: 'set-tab' });
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', k === 'general' ? 'set-p-gen' : k === 'controls' ? 'set-p-keys' : 'set-p-' + k);
    b.dataset.tab = k;
    b.append(icon(ic, 17) || '', bEl('span', { textContent: t }));
    b.onclick = () => show(k);
    b.onkeydown = e => {
      const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = SET_SECTIONS[(i + d + SET_SECTIONS.length) % SET_SECTIONS.length][0];
      show(n);
      tabs.querySelector('[data-tab=' + n + ']').focus();
    };
    tabs.appendChild(b);
  });
  /* Dice */
  {
    const body = pane('general');
    const sp = bEl('div', { className: 'grp' });
    sp.setAttribute('role', 'group');
    sp.setAttribute('aria-label', 'Animation speed');
    const sw = setSwitch(
      () => SET.diceAnim,
      v => {
        SET.diceAnim = v;
        sp.querySelectorAll('button').forEach(b => (b.disabled = !v));
      }
    );
    row(body, 'Dice roll animation', 'Dice tumble before showing their result. Off: results show at once.', sw);
    [
      ['fast', 'Fast'],
      ['normal', 'Normal'],
      ['slow', 'Slow']
    ].forEach(([k, t]) => {
      const b = bEl('button', { type: 'button', textContent: t });
      b.setAttribute('aria-pressed', String(SET.diceSpeed === k));
      b.disabled = !SET.diceAnim;
      b.onclick = () => {
        SET.diceSpeed = k;
        saveSet();
        sp.querySelectorAll('button').forEach(q => q.setAttribute('aria-pressed', String(q === b)));
      };
      sp.appendChild(b);
    });
    row(body, 'Animation speed', 'How long the dice tumble.', sp);
    row(
      body,
      'Roll your own saves',
      'When the opponent attacks you, you press Roll for your Defense and Morale yourself. Off: they are rolled for you.',
      setSwitch(
        () => SET.ownSaves !== false,
        v => (SET.ownSaves = v)
      )
    );
    row(
      body,
      'Show every die',
      'Show each die on roll cards and the roll banner. Off: they show only what the dice did, such as “3 hits”.',
      setSwitch(
        () => SET.diceEach !== false,
        v => (SET.diceEach = v)
      )
    );
    const tr = bEl('button', { type: 'button', className: 'btn ghost', textContent: 'Roll test dice' });
    const tbox = bEl('div', { className: 'drow set-test' });
    tr.onclick = () => {
      tbox.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const v = d6();
        tbox.appendChild(dieMini(v, v <= 3 ? 'hit' : 'miss'));
      }
    };
    const t = row(body, 'Try it', 'Roll four dice with these settings.', bEl('div', { className: 'row' }, [tr, tbox]));
    t.classList.add('set-try');
  }
  /* Controls */
  pane('controls').appendChild(hotkeyList());
  /* Table and display */
  {
    const body = pane('table');
    row(
      body,
      'Movement animation',
      'Regiments slide and wheel across the table as they move. Off: they jump to where they end.' +
        (RM ? ' This device asks for less motion, so movement is short either way.' : ''),
      setSwitch(
        () => SET.moveAnim !== false,
        v => (SET.moveAnim = v)
      )
    );
    const lg = setSwitch(
      () => legOpen,
      v => {
        legOpen = v;
        try {
          localStorage.setItem('conquest-legend', v ? '1' : '0');
        } catch (e) {}
        try {
          renderLegend();
        } catch (e) {}
      }
    );
    row(body, 'Legend on the table', 'Keep the legend of objective zones and terrain open beside the table.', lg);
  }
  /* Player */
  {
    const body = pane('player');
    const inp = bEl('input', { type: 'text', maxLength: 24, value: savedName(), placeholder: 'The name others see' });
    inp.setAttribute('aria-label', 'Your name');
    inp.setAttribute('autocomplete', 'nickname');
    inp.onchange = () => {
      const v = inp.value.trim().slice(0, 24);
      try {
        localStorage.setItem('conquest-player-name', v);
      } catch (e) {}
      try {
        const sd = seatSide();
        if (sd && PVP() && v !== PN(sd)) stateUpdate({ players: { [sd]: v }, updatedAt: Date.now() }).catch(() => {});
        presencePing(true);
      } catch (e) {}
      toast(v ? 'Your name is now ' + v + '.' : 'Your name was cleared.');
      render();
    };
    row(body, 'Your name', 'Your opponent sees it in the lobby and in the game. Kept on this device.', inp);
    row(
      body,
      'Saved on this device',
      armyList().length +
        ' saved arm' +
        (armyList().length === 1 ? 'y' : 'ies') +
        (typeof battleList === 'function' ? ' and ' + battleList().length + ' finished battle' + (battleList().length === 1 ? '' : 's') : '') +
        '. They stay in this browser only.',
      bEl('span')
    );
  }
  /* Claude */
  {
    const body = pane('claude');
    const n = mmNet();
    if (n && n.openSettings) {
      const b = bEl('button', { type: 'button', className: 'btn', textContent: 'Open Claude settings' });
      b.onclick = () => {
        dg.close();
        n.openSettings();
      };
      row(body, 'API key and models', 'Claude needs an API key on this site. Set it, and choose the models it plays with.', b);
    } else
      row(
        body,
        'Nothing to set up',
        sample
          ? 'Claude plays through your Claude account on this page. Pick Claude as the opponent in Single player.'
          : 'Claude is not available in this view. The built-in opponent is free and always available.',
        bEl('span')
      );
  }
  dg.append(nav, main);
  show(['controls', 'table', 'player', 'claude'].includes(tab) ? tab : 'general');
  dg.showModal();
}
