/*
 * Armies tab
 *
 * Both armies as lists: a filter on top (all, still to activate, engaged), a header per army with how many have
 * activated, and one row per regiment with its character inside it, its stands as blocks and its state as tags.
 * Destroyed regiments fold into one line per army.
 *
 * In this file: armFilter, armDeadOpen, armRow(), renderArmies()
 */

let armFilter = 'all',
  armDeadOpen = {};

/* one regiment as a row; clicking it selects it */
function armRow(u) {
  const row = document.createElement('div');
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  const eg = u.onTable && !u.destroyed && u.type !== 'marker' ? engaged(u) : [];
  row.className =
    'u' +
    (u.onTable ? '' : ' off') +
    (u.destroyed ? ' dead' : '') +
    (u.activated && u.type !== 'marker' ? ' done' : '') +
    (u.id === selId ? ' sel' : '') +
    (eg.length ? ' eng' : '');
  const ic = document.createElement('span');
  ic.className = 'u-ic';
  const k =
    u.type === 'marker' ? 'marker' : u.destroyed ? 'dead' : u.activated ? 'done' : u.onTable ? 'ready' : 'off';
  ic.append(
    k === 'done'
      ? icon('check', 13) || '✓'
      : k === 'off'
        ? bEl('span', { textContent: '⧗' })
        : k === 'dead'
          ? bEl('span', { textContent: '✕' })
          : k === 'marker'
            ? bEl('span', { textContent: '◆' })
            : bEl('i', { className: 'u-dot' })
  );
  ic.title = {
    marker: 'Objective Marker',
    dead: 'Destroyed',
    done: 'Activated this round',
    ready: 'Ready to activate',
    off: 'Not on the table'
  }[k];
  const mid = document.createElement('span');
  mid.className = 'u-m';
  mid.append(bEl('span', { className: 'n', textContent: u.name }));
  if (u.charName) {
    /* its character inside the row, in gold: name, wounds left, the stats that matter in a fight */
    const S = chStatsX(u),
      left = Math.max(0, (+S.W || 0) - (+u.charWounds || 0));
    mid.append(
      bEl('span', { className: 'u-c' }, [
        document.createTextNode((u.warlord ? '★ ' : '') + u.charName + ' '),
        bEl('em', {
          textContent:
            left +
            '/' +
            (S.W ?? '?') +
            ' · C' +
            (S.C ?? '–') +
            ' A' +
            (S.A ?? '–') +
            ' D' +
            (S.D ?? '–') +
            (u.charActivated ? ' · acted' : '')
        })
      ])
    );
  }
  const tags = document.createElement('span');
  tags.className = 'u-t';
  const tag = (t, c) => tags.append(bEl('span', { className: 'tg' + (c ? ' ' + c : ''), textContent: t }));
  if (eg.length) tag('Engaged · ' + eg.map(e => e.short || e.name).join(', '), 'bad');
  (u.effects || []).forEach(e => {
    if (/^Broken/.test(e)) tag('Broken', 'bad');
    else if (/Inspired/.test(e)) tag('Inspired', 'good');
  });
  if (!u.onTable && !u.destroyed && u.type !== 'marker') tag(u.arriving ? 'Arriving' : 'Reserves');
  if (tags.children.length) mid.appendChild(tags);
  const right = document.createElement('span');
  right.className = 's';
  if (u.type === 'marker')
    right.textContent = u.destroyed ? 'Destroyed' : 3 - Math.max(u.dmg?.cs || 0, u.dmg?.nord || 0) + '/3 wounds';
  else if (u.destroyed) right.textContent = 'Destroyed';
  else {
    const L2 = live(u),
      T = u.stands || 1;
    right.append(bEl('span', { textContent: L2 + '/' + T }));
    right.title = L2 + ' of ' + T + ' stands left' + (u.wounds ? ', ' + u.wounds + ' wounds taken' : '');
    if (T <= 12) {
      const bl = bEl('span', { className: 'u-blk' });
      for (let i = 0; i < T; i++) bl.append(bEl('i', { className: i < L2 ? (L2 / T <= 0.34 ? 'low' : '') : 'gone' }));
      right.append(bl);
    } else {
      const bar = bEl('i', { className: 'u-bar' }),
        fill = bEl('b');
      fill.style.width = Math.round((L2 / T) * 100) + '%';
      if (L2 / T <= 0.34) fill.className = 'low';
      bar.append(fill);
      right.append(bar);
    }
  }
  row.append(ic, mid, right);
  const pick = () => {
    selId = u.id;
    rightTab = 'reg';
    render();
  };
  row.onclick = pick;
  row.onkeydown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick();
    }
  };
  row.onmouseenter = () => hiUnit(u.id, true);
  row.onmouseleave = () => hiUnit(u.id, false);
  row.onfocus = () => hiUnit(u.id, true);
  row.onblur = () => hiUnit(u.id, false);
  return row;
}

function renderArmies() {
  const host = $('armies');
  const regsAll = all().filter(u => u.type !== 'marker'),
    todo = u => u.type !== 'marker' && u.onTable && !u.destroyed && (!u.activated || (u.charName && !u.charActivated)),
    eng = u => u.type !== 'marker' && u.onTable && !u.destroyed && engaged(u).length > 0;
  /* the filter */
  {
    let f = $('ar-filter');
    if (!f) {
      f = bEl('div', { id: 'ar-filter', className: 'ar-filter' });
      f.setAttribute('role', 'group');
      f.setAttribute('aria-label', 'Show');
      host.prepend(f);
    }
    f.innerHTML = '';
    const nT = regsAll.filter(todo).length,
      nE = regsAll.filter(eng).length;
    if (armFilter === 'eng' && !nE) armFilter = 'all';
    [
      ['all', 'All'],
      ['todo', 'To activate · ' + nT],
      ['eng', 'Engaged · ' + nE]
    ].forEach(([k, t]) => {
      const b = bEl('button', { type: 'button', textContent: t });
      b.setAttribute('aria-pressed', String(armFilter === k));
      b.disabled = k === 'eng' && !nE;
      b.onclick = () => {
        armFilter = k;
        renderArmies();
      };
      f.append(b);
    });
  }
  ['cs', 'nord'].forEach(sd => {
    const box = $('r-' + sd);
    box.innerHTML = '';
    const L = all().filter(u => u.side === sd);
    const regs = L.filter(u => u.type !== 'marker'),
      onT = regs.filter(u => u.onTable && !u.destroyed),
      done = onT.filter(u => u.activated).length,
      dead = regs.filter(u => u.destroyed),
      off = regs.length - onT.length - dead.length;
    const who = PVP() ? PN(sd) || SEATNAME[sd] : sd === HU ? 'You' : 'Opponent';
    $('sum-' + sd).textContent = regs.length
      ? who + ' · ' + `${done}/${onT.length} activated` + (off ? ` · ${off} off table` : '')
      : '';
    /* how far the army is through the round, in its colour */
    {
      const h = $('sum-' + sd).closest('.ar-h');
      let pg = h && h.nextElementSibling && h.nextElementSibling.classList.contains('ar-prog') ? h.nextElementSibling : null;
      if (h && !pg) {
        pg = bEl('div', { className: 'ar-prog' }, [bEl('i')]);
        h.after(pg);
      }
      if (pg) {
        pg.hidden = !onT.length;
        pg.firstChild.style.width = (onT.length ? Math.round((done / onT.length) * 100) : 0) + '%';
      }
    }
    const show = L.filter(u => !u.destroyed).filter(u => (armFilter === 'todo' ? todo(u) : armFilter === 'eng' ? eng(u) : true));
    show.forEach(u => box.appendChild(armRow(u)));
    if (dead.length && armFilter === 'all') {
      /* destroyed regiments: one line that opens the list */
      const d = document.createElement('details');
      d.className = 'ar-dead';
      d.open = !!armDeadOpen[sd];
      d.addEventListener('toggle', () => (armDeadOpen[sd] = d.open));
      const names = dead.map(u => u.name);
      d.append(
        bEl('summary', {
          textContent:
            dead.length +
            ' destroyed: ' +
            (names.length <= 2 ? names.join(', ') : names.slice(0, 1).join(', ') + ' and ' + (names.length - 1) + ' more')
        })
      );
      dead.forEach(u => d.append(armRow(u)));
      box.appendChild(d);
    }
    if (!show.length && !(dead.length && armFilter === 'all')) {
      box.append(
        bEl('p', {
          className: 'hint ar-none',
          textContent: !L.length ? 'No regiments yet.' : armFilter === 'todo' ? 'Nothing left to activate.' : 'None engaged.'
        })
      );
    }
  });
  renderTabs();
}
