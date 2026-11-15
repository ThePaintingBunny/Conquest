/*
 * Settings and hotkeys
 *
 * The player's settings (saved in the browser), the list of every hotkey and the Settings window.
 *
 * In this file: SET, saveSet(), HOTKEYS, hotkeyList(), openSettings()
 */

const SET = (() => {
  const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let v = {};
  try {
    v = JSON.parse(localStorage.getItem('conquest-settings') || '{}') || {};
  } catch (e) {}
  return Object.assign({ diceAnim: !rm, diceSpeed: 'normal' }, v);
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
  const head = document.createElement('div');
  head.className = 'en-head';
  const h = document.createElement('h2');
  h.id = 'set-h';
  h.textContent = 'Settings';
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'btn ghost';
  x.textContent = 'Close';
  x.onclick = () => dg.close();
  head.append(h, x);
  dg.appendChild(head);
  /* tabs: General (dice) and Controls (hotkeys) */
  const tabs = document.createElement('div');
  tabs.className = 'set-tabs';
  tabs.setAttribute('role', 'tablist');
  const body = document.createElement('div');
  body.className = 'set-body';
  body.id = 'set-p-gen';
  body.setAttribute('role', 'tabpanel');
  const keysP = document.createElement('div');
  keysP.className = 'set-body';
  keysP.id = 'set-p-keys';
  keysP.setAttribute('role', 'tabpanel');
  keysP.appendChild(hotkeyList());
  const show = which => {
    body.hidden = which !== 'general';
    keysP.hidden = which !== 'controls';
    tabs.querySelectorAll('[role=tab]').forEach(b => {
      const on = b.dataset.tab === which;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  };
  [
    ['general', 'General', 'set-p-gen'],
    ['controls', 'Controls', 'set-p-keys']
  ].forEach(([k, t, pid]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'set-tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', pid);
    b.dataset.tab = k;
    b.textContent = t;
    b.onclick = () => show(k);
    b.onkeydown = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = k === 'general' ? 'controls' : 'general';
        show(n);
        tabs.querySelector('[data-tab=' + n + ']').focus();
      }
    };
    tabs.appendChild(b);
  });
  dg.appendChild(tabs);
  const row = (label, hint, ctl) => {
    const r = document.createElement('div');
    r.className = 'set-row';
    const t = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = label;
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = hint;
    t.append(b, p);
    r.append(t, ctl);
    body.appendChild(r);
  };
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'set-sw';
  sw.setAttribute('role', 'switch');
  const upd = () => {
    sw.setAttribute('aria-checked', String(!!SET.diceAnim));
    sw.textContent = SET.diceAnim ? 'On' : 'Off';
  };
  upd();
  sw.onclick = () => {
    SET.diceAnim = !SET.diceAnim;
    saveSet();
    upd();
    sp.querySelectorAll('button').forEach(b => (b.disabled = !SET.diceAnim));
  };
  row('Dice roll animation', 'Dice tumble before showing their result. Turn it off for instant results.', sw);
  const sp = document.createElement('div');
  sp.className = 'grp';
  sp.setAttribute('role', 'group');
  sp.setAttribute('aria-label', 'Animation speed');
  [
    ['fast', 'Fast'],
    ['normal', 'Normal'],
    ['slow', 'Slow']
  ].forEach(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-pressed', String(SET.diceSpeed === k));
    b.disabled = !SET.diceAnim;
    b.onclick = () => {
      SET.diceSpeed = k;
      saveSet();
      sp.querySelectorAll('button').forEach(q => q.setAttribute('aria-pressed', String(q === b)));
    };
    sp.appendChild(b);
  });
  row('Animation speed', 'How long the dice tumble.', sp);
  const tr = document.createElement('button');
  tr.type = 'button';
  tr.className = 'btn ghost';
  tr.textContent = 'Roll test dice';
  tr.onclick = () => {
    const box = dg.querySelector('.set-test');
    box.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const v = d6();
      box.appendChild(dieMini(v, v <= 3 ? 'hit' : 'miss'));
    }
  };
  const tb = document.createElement('div');
  tb.className = 'row';
  const tbox = document.createElement('div');
  tbox.className = 'drow set-test';
  tb.append(tr, tbox);
  row('Try it', 'Roll four dice with the current settings.', tb);
  dg.append(body, keysP);
  show(tab === 'controls' ? 'controls' : 'general');
  dg.showModal();
}
