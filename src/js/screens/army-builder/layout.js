/*
 * Army builder: layout
 *
 * Reshapes the finished army builder page so it is easier to read and use: a pinned summary bar (points
 * against a limit, a jump chip per warband, the list of problems, Check and Save), faction tiles and saved
 * armies on the start screen, regiments folded to one line until opened, and Undo after a Remove.
 * On a wide page the warbands sit on the left and a column on the right holds what you can add (the regiment or
 * character picker) and the rules check.
 * armyBuilder() builds the page; abEnhance() runs on it afterwards and changes no army data.
 *
 * In this file: abOpen, abSeen, abLimit(), abSetLimit(), abUndoTimer, abUndoOffer(), abEnhance(),
 *   abFacPick(), abRailWb, abRail()
 */

/* which regiments are unfolded ("warband:regiment"), and how many regiments each warband had last time */
const abOpen = new Set();
let abSeen = null;

/* the points limit shown in the summary bar: a display aid only, kept in the browser */
function abLimit() {
  try {
    return +localStorage.getItem('conquest-ab-limit') || 2000;
  } catch (e) {
    return 2000;
  }
}

function abSetLimit(v) {
  try {
    localStorage.setItem('conquest-ab-limit', String(v));
  } catch (e) {}
}

/* Undo after Remove: a small bar at the bottom of the screen for a few seconds */
let abUndoTimer = 0;
function abUndoOffer(text, snapshot) {
  let bar = $('ab-undo');
  if (!bar) {
    bar = bEl('div', { id: 'ab-undo', className: 'ab-undo' });
    bar.setAttribute('role', 'status');
    document.body.append(bar);
  }
  bar.innerHTML = '';
  bar.append(
    bEl('span', { textContent: text }),
    bEl('button', {
      type: 'button',
      className: 'btn',
      textContent: 'Undo',
      onclick: () => {
        bld = JSON.parse(snapshot);
        abPick = null;
        bar.hidden = true;
        abRe();
      }
    })
  );
  bar.hidden = false;
  clearTimeout(abUndoTimer);
  abUndoTimer = setTimeout(() => (bar.hidden = true), 9000);
}

function abEnhance(box) {
  if (!box) return;
  const f = bldFac();
  /* ---- Undo: note the army before any Remove button acts, compare after ---- */
  box.addEventListener(
    'click',
    e => {
      const b = e.target.closest && e.target.closest('.ab-danger');
      if (!b) return;
      const before = JSON.stringify(bld),
        what = b.getAttribute('aria-label') || 'Removed';
      setTimeout(() => {
        if (JSON.stringify(bld) !== before) abUndoOffer(what.replace(/^Remove/, 'Removed') + '.', before);
      }, 0);
    },
    true
  );
  /* ---- start screen: faction tiles and saved armies ---- */
  if (!f) {
    const fs = box.querySelector('.ab-fac');
    const start = bEl('div', { className: 'ab-start' });
    const tiles = bEl('div', { className: 'ab-facs' });
    ENCY.forEach(F => {
      const n = F.units.filter(u => u.kind !== 'char').length;
      const t = bEl(
        'button',
        { type: 'button', className: 'ab-factile', style: '--fac:' + facColor(F.name) },
        [bEl('strong', { textContent: F.name }), bEl('small', { textContent: n + ' regiments' })]
      );
      t.onclick = () => {
        fs.value = F.name;
        fs.onchange();
      };
      tiles.append(t);
    });
    start.append(bEl('div', {}, [bEl('h4', { className: 'ab-h', textContent: 'Start a new army' }), tiles]));
    const AL = armyList();
    const saved = bEl('div', {}, [
      bEl('h4', { className: 'ab-h', textContent: 'Bring a list' }),
      bEl('button', {
        type: 'button',
        className: 'ab-b pb-open',
        textContent: 'Import from the Para Bellum app',
        onclick: pbDialog
      }),
      bEl('h4', { className: 'ab-h', textContent: 'Your saved armies' })
    ]);
    if (!AL.length)
      saved.append(
        bEl('p', {
          className: 'ab-note',
          textContent: 'None yet. Build an army and press Save to keep it on this device.'
        })
      );
    AL.forEach(a => {
      const row = bEl('div', { className: 'ab-saved' });
      const del = bEl('button', {
        type: 'button',
        className: 'ab-b ab-ghost ab-small',
        textContent: 'Delete'
      });
      del.onclick = () => {
        if (del.textContent === 'Delete') {
          del.textContent = 'Click again to delete';
          setTimeout(() => (del.textContent = 'Delete'), 4000);
          return;
        }
        armySaveAll(armyList().filter(x => x.name !== a.name));
        abRe();
      };
      row.append(
        bEl('div', { className: 'ab-saved-t' }, [
          bEl('strong', { textContent: a.name }),
          bEl('small', {
            textContent:
              (a.fac || '') +
              (a.bld && a.bld.wbs
                ? ' · ' + a.bld.wbs.length + ' warband' + (a.bld.wbs.length === 1 ? '' : 's')
                : '')
          })
        ]),
        bEl('button', {
          type: 'button',
          className: 'ab-b',
          textContent: 'Load',
          onclick: () => {
            bld = JSON.parse(JSON.stringify(a.bld));
            abPick = null;
            abRe();
            toast('Loaded “' + a.name + '”.');
          }
        }),
        del
      );
      saved.append(row);
    });
    start.append(saved);
    box.classList.add('ab-is-start');
    const intro = box.querySelector('.ab-intro');
    box.insertBefore(start, intro || null);
    abSeen = null;
    return;
  }
  /* ---- regiments: one line until opened ---- */
  const wbs = bld.wbs.map((w, wi) => ({ w, wi })).filter(x => bldUnit(x.w.char));
  const cards = [...box.querySelectorAll('.ab-wb')];
  const seen = {};
  wbs.forEach(({ w, wi }, k) => {
    const card = cards[k];
    if (!card) return;
    card.dataset.wb = String(wi);
    seen[wi] = w.regs.length;
    /* a regiment that was just added starts open */
    if (abSeen && abSeen[wi] != null && w.regs.length > abSeen[wi])
      abOpen.add(wi + ':' + (w.regs.length - 1));
    [...card.querySelectorAll(':scope > .ab-regs > .ab-reg')].forEach((rc, ri) => {
      const r = w.regs[ri],
        key = wi + ':' + ri,
        open = abOpen.has(key),
        head = rc.querySelector('.ab-rh'),
        tl = rc.querySelector('.ab-rt');
      if (!r || !head || !tl) return;
      rc.classList.toggle('shut', !open);
      const u = r.unit ? bldUnit(r.unit) : null,
        bits = [];
      if (r.modular) bits.push(modTotal(r.modular) + ' stands');
      else if (r.chariots) bits.push(r.chariots.filter(Boolean).length + ' chariots');
      else if (u && u.kind !== 'char' && !/^1 stand/.test(u.stands))
        bits.push((r.stands || bldBase(u)) + ' stands');
      (r.opts || []).forEach(n => bits.push(n));
      (r.custom || []).forEach(c => bits.push(c.name));
      const tg = bEl('button', {
        type: 'button',
        className: 'ab-fold',
        textContent: open ? '▾' : '▸'
      });
      tg.setAttribute('aria-expanded', String(open));
      tg.setAttribute('aria-label', (open ? 'Fold ' : 'Open ') + (tl.querySelector('h5') || {}).textContent);
      const flip = () => {
        if (abOpen.has(key)) abOpen.delete(key);
        else abOpen.add(key);
        abRe();
      };
      tg.onclick = flip;
      tl.prepend(tg);
      const h5 = tl.querySelector('h5');
      if (h5) {
        h5.onclick = flip;
        h5.classList.add('ab-foldt');
      }
      if (!open && bits.length)
        tl.append(bEl('span', { className: 'ab-brief', textContent: bits.join(' · ') }));
    });
  });
  /* removing a regiment shifts the ones below it: drop what no longer exists */
  [...abOpen].forEach(k => {
    const [wi, ri] = k.split(':').map(Number);
    if (!bld.wbs[wi] || ri >= bld.wbs[wi].regs.length) abOpen.delete(k);
  });
  abSeen = seen;
  /* ---- pinned summary bar ---- */
  const probs = bldProblems(),
    total = bldTotal(),
    limit = abLimit();
  const bar = bEl('div', { className: 'ab-bar' });
  box.style.setProperty('--fac', facColor(bld.fac));
  const lim = bEl('input', {
    type: 'number',
    className: 'ab-lim',
    value: String(limit),
    min: '0',
    step: '50'
  });
  lim.setAttribute('aria-label', 'Points limit');
  lim.onchange = () => {
    abSetLimit(Math.max(0, +lim.value || 0));
    abRe();
  };
  {
    const meter = bEl('div', { className: 'ab-meter' }),
      fill = bEl('i');
    fill.style.width = (limit ? Math.min(100, (total / limit) * 100) : 0) + '%';
    meter.append(fill);
    bar.append(
      bEl('div', { className: 'ab-bar-pts' + (limit && total > limit ? ' over' : '') }, [
        bEl('div', { className: 'ab-ptsl' }, [
          bEl('strong', { textContent: total.toLocaleString('en') }),
          bEl('span', { className: 'ab-of', textContent: '/' }),
          lim,
          bEl('span', { className: 'ab-of', textContent: 'pts' }),
          bEl('em', {
            textContent: !limit ? '' : total > limit ? total - limit + ' over' : limit - total + ' left'
          })
        ]),
        meter
      ])
    );
  }
  /* the army's name sits in the banner (the name box moves up from the foot); the faction under it */
  const foot0 = box.querySelector('.ab-foot'),
    nameIn = foot0 && foot0.querySelector('#ab-army-name');
  if (nameIn) {
    nameIn.classList.remove('tf-in');
    nameIn.classList.add('ab-bar-name');
    nameIn.placeholder = 'Name this army';
    bar.append(bEl('div', { className: 'ab-bar-fac has-name' }, [nameIn, abFacPick(box)]));
  } else bar.append(bEl('div', { className: 'ab-bar-fac' }, [abFacPick(box)]));
  const jump = bEl('div', { className: 'ab-bar-wbs' });
  jump.setAttribute('aria-label', 'Warbands');
  wbs.forEach(({ w, wi }) => {
    const bad = wbProblems(w).concat(upgProblems(w, wi)).length > 0;
    const c = bEl('button', {
      type: 'button',
      className: 'ab-jump' + (bad ? ' bad' : '') + (bld.warlord === wi ? ' wl' : ''),
      textContent: (bld.warlord === wi ? '★ ' : '') + w.char,
      title: 'Go to warband ' + (wi + 1) + (bad ? ' (has a problem)' : '')
    });
    c.onclick = () => {
      const t = box.querySelector('[data-wb="' + wi + '"]');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    jump.append(c);
  });
  bar.append(jump);
  const acts = bEl('div', { className: 'ab-bar-acts' });
  const iss = bEl('button', {
    type: 'button',
    className: 'ab-b ab-issb ' + (probs.length ? 'bad' : 'ok'),
    textContent: probs.length
      ? probs.length + ' issue' + (probs.length === 1 ? '' : 's') + ' ▾'
      : '✓ Legal army'
  });
  const list = bEl('div', { className: 'ab-issl', hidden: true });
  probs.forEach(t => {
    const m = String(t).match(/^Warband (\d+)/);
    const li = bEl('button', { type: 'button', className: 'ab-issi', textContent: t });
    li.onclick = () => {
      const el2 = m ? box.querySelector('[data-wb="' + (+m[1] - 1) + '"]') : null;
      list.hidden = true;
      if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    list.append(li);
  });
  iss.setAttribute('aria-expanded', 'false');
  iss.onclick = () => {
    if (!probs.length) return;
    list.hidden = !list.hidden;
    iss.setAttribute('aria-expanded', String(!list.hidden));
  };
  acts.append(iss);
  /* the page's own Check / Use button and the Save button move up here, so each appears once */
  const foot = box.querySelector('.ab-foot'),
    use = foot && [...foot.children].find(x => x.tagName === 'BUTTON');
  if (use) acts.append(use);
  const save =
    foot && [...foot.querySelectorAll('.ab-store button')].find(b => b.textContent === 'Save army');
  if (save) {
    save.textContent = 'Save';
    save.title = 'Save this army on this device';
    acts.append(save);
  }
  acts.append(
    bEl('button', { type: 'button', className: 'ab-b ab-ghost', textContent: 'Import…', onclick: pbDialog })
  );
  bar.append(acts, list);
  box.classList.add('ab-has-bar');
  const top = box.querySelector('.ab-top');
  if (top) top.after(bar);
  else box.prepend(bar);
  /* the title row only stays for what is left in it (the Spires' Sect) */
  if (top && !top.querySelector('.ab-sect')) top.hidden = true;
  try {
    abRail(box, probs, total, limit);
  } catch (e) {
    console.error(e);
  }
  /* what the last import could not match, until the player dismisses it */
  if (abImportNote) {
    const n = bEl('div', { className: 'pb-note' + (abImportNote.notes.length ? ' warn' : '') }, [
      bEl('strong', { textContent: abImportNote.head }),
      abImportNote.notes.length
        ? bEl(
            'ul',
            {},
            abImportNote.notes.map(t => bEl('li', { textContent: t }))
          )
        : bEl('span', { textContent: ' Everything matched.' }),
      bEl('button', {
        type: 'button',
        className: 'ab-b ab-ghost ab-small',
        textContent: 'Dismiss',
        onclick: () => {
          abImportNote = null;
          abRe();
        }
      })
    ]);
    bar.after(n);
  }
}

/* the faction, chosen in the summary bar (the page's own faction picker, moved there) */
function abFacPick(box) {
  const fs = box.querySelector('.ab-top .ab-fac');
  if (!fs) return bEl('span', { className: 'ab-bar-sub', textContent: bld.fac });
  return bEl('label', { className: 'ab-bar-facsel' }, [bEl('span', { className: 'mh-k', textContent: 'Faction' }), fs]);
}

/* the warband the right column adds to, kept between redraws */
let abRailWb = null;

/* wide pages: the warbands on the left, a column on the right with the picker and the rules check */
function abRail(box, probs, total, limit) {
  if (box.getBoundingClientRect().width < 1000) return;
  const first = box.querySelector(':scope > .ab-wb');
  const foot = box.querySelector(':scope > .ab-foot');
  if (!first && !box.querySelector(':scope > .ab-pick')) return;
  const cols = bEl('div', { className: 'ab-cols' }),
    main = bEl('div', { className: 'ab-main' }),
    rail = bEl('aside', { className: 'ab-rail' });
  rail.setAttribute('aria-label', 'Add and check');
  box.insertBefore(cols, first || foot);
  [...box.children]
    .filter(k => k !== cols && (k.matches('.ab-wb, .ab-pick') || (k.matches('.ab-row') && k.querySelector('.ab-wide'))))
    .forEach(k => main.append(k));
  cols.append(main, rail);
  box.classList.add('ab-has-rail');
  /* adding happens here, always open: pick the warband, then the regiment */
  main.querySelectorAll('.ab-wb > .ab-regpick, .ab-addreg').forEach(k => k.remove());
  const adders = box._abAdd || [];
  const addBox = bEl('section', { className: 'ab-railbox ab-railpick' });
  const newPick = abPick && abPick.wb === 'new' ? main.querySelector(':scope > .ab-pick') : null;
  let target = null;
  if (!newPick) {
    if (abPick && typeof abPick.wb === 'number' && adders[abPick.wb]) target = abPick.wb;
    else if (abRailWb != null && adders[abRailWb]) target = abRailWb;
    else for (let i = adders.length - 1; i >= 0; i--) if (adders[i]) { target = i; break; }
  }
  addBox.append(bEl('h3', { className: 'mh-k', textContent: newPick ? 'New warband' : 'Add a regiment' }));
  /* which warband the regiment goes to */
  if (bld.wbs.length) {
    const chips = bEl('div', { className: 'ab-railwbs', role: 'group' });
    chips.setAttribute('aria-label', 'Add to warband');
    bld.wbs.forEach((w, i) => {
      const n = w.regs.length;
      const c = bEl('button', {
        type: 'button',
        className: 'ab-railwb' + (i === target ? ' on' : ''),
        disabled: !adders[i],
        title: adders[i] ? 'Add to this warband' : 'This warband is full'
      }, [bEl('span', { className: 'ab-railwb-n', textContent: String(i + 1) }), bEl('span', { textContent: w.char })]);
      c.setAttribute('aria-pressed', i === target ? 'true' : 'false');
      c.onclick = () => {
        abRailWb = i;
        abPick = null;
        abDraw();
      };
      chips.append(c);
    });
    const nw = bEl('button', { type: 'button', className: 'ab-railwb ab-railwb-new' + (newPick ? ' on' : ''), textContent: '+ New warband' });
    nw.onclick = () => {
      abPick = { wb: 'new' };
      abDraw();
    };
    chips.append(nw);
    addBox.append(chips);
  }
  if (newPick) addBox.append(newPick);
  else if (target != null) {
    const card = main.querySelector('.ab-wb[data-wb="' + target + '"]');
    if (card) card.classList.add('ab-picking');
    addBox.append(adders[target]());
  } else
    addBox.append(
      bEl('p', {
        className: 'hint',
        textContent: bld.wbs.length ? 'Every warband is full. Add a new warband to keep going.' : 'Add a warband to start.'
      })
    );
  rail.append(addBox);
  /* a click on a warband's free space also makes it the one to add to */
  main.querySelectorAll('.ab-wb[data-wb]').forEach(c => {
    const i = +c.dataset.wb;
    if (!adders[i] || i === target) return;
    c.classList.add('ab-pickable');
    c.addEventListener('click', e => {
      if (e.target.closest('button, select, input, textarea, a, label, details, summary')) return;
      abRailWb = i;
      abPick = null;
      abDraw();
    });
  });
  /* the rules check: what passes and what still needs fixing */
  const chk = bEl('section', { className: 'ab-railbox ab-check' });
  chk.append(bEl('h3', { className: 'mh-k', textContent: 'Rules check' }));
  const line = (ok, t, wi) => {
    const el = bEl(wi != null ? 'button' : 'div', { className: 'ab-ck ' + (ok ? 'ok' : 'no'), textContent: (ok ? '✓ ' : '○ ') + t });
    if (wi != null) {
      el.type = 'button';
      el.onclick = () => {
        const t2 = box.querySelector('[data-wb="' + wi + '"]');
        if (t2) t2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    }
    chk.append(el);
  };
  const wl = bld.wbs[bld.warlord];
  line(!!wl, wl ? 'Warlord: the ' + wl.char : 'Choose a Warlord');
  if (limit) line(total <= limit, total <= limit ? 'Within ' + limit.toLocaleString('en') + ' points' : total - limit + ' points over the limit');
  const other = probs;
  other.forEach(t => {
    const m = String(t).match(/^Warband (\d+)/);
    line(false, t, m ? +m[1] - 1 : null);
  });
  if (!other.length && bld.wbs.length) line(true, 'Every warband is legal');
  rail.append(chk);
}
