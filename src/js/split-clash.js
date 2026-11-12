/* Clashing against more than one engaged enemy regiment (core rules, "More Than One Target"):
   - a stand in contact with one enemy regiment attacks that regiment;
   - a stand in contact with two or more chooses one of them, and puts all its Attacks into it;
   - each unengaged (supporting) stand chooses one of the engaged enemy regiments for its Support Attacks;
   - each pool of Attacks is resolved separately, from rolling To Hit through Morale.
   The player assigns stands in the combat panel (coloured on the board); the pools then run one after another. */

const SPLIT_COL = ['#FFB74D', '#4FC3F7', '#E57373', '#81C784', '#BA68C8'];

function standKey(s) {
  return s.kind + ':' + s.pos;
}

/* the combat to open for a Clash: one target, or the assignment step when several enemies are engaged */
function clashSpec(A, inAct, extra) {
  const eng = engaged(A);
  if (eng.length <= 1)
    return Object.assign(
      { type: 'clash', att: A.id, tgt: eng.length ? eng[0].id : null, choices: eng.map(e => e.id), inAct },
      extra || {}
    );
  return Object.assign(
    {
      type: 'clash',
      att: A.id,
      tgt: null,
      split: 'plan',
      engIds: eng.map(e => e.id),
      assign: splitDefault(A, eng),
      inAct
    },
    extra || {}
  );
}
function clashOpen(A, inAct, extra) {
  openCombat(clashSpec(A, inAct, extra));
}

/* every stand of the attacker, with the enemy regiments it touches */
function splitInfo(A, engIds) {
  const E = engIds.map(byId).filter(e => e && e.onTable && !e.destroyed);
  return standsOf(A).map(s => ({
    s,
    key: standKey(s),
    touch: E.filter(e => polyDist(s.poly, corners(e)) <= 0.35).map(e => e.id)
  }));
}

/* Default assignment. Players: a stand touching several enemies starts on the first; supporting stands join the enemy
   most engaged stands attack. Claude (smart): the weakest target among the choices (lowest Defense, then fewest stands). */
function splitDefault(A, eng, smart) {
  const ids = eng.map(e => e.id),
    info = splitInfo(A, ids),
    as = {};
  const weak = list =>
    list.slice().sort((a, b) => {
      const x = byId(a),
        y = byId(b);
      return (+(x.stats || {}).D || 0) - (+(y.stats || {}).D || 0) || live(x) - live(y);
    })[0];
  info.forEach(x => {
    if (x.touch.length) as[x.key] = x.touch.length === 1 ? x.touch[0] : smart ? weak(x.touch) : x.touch[0];
  });
  const cnt = {};
  Object.values(as).forEach(id => (cnt[id] = (cnt[id] || 0) + 1));
  const major = smart ? weak(ids) : ids.slice().sort((a, b) => (cnt[b] || 0) - (cnt[a] || 0))[0];
  info.forEach(x => {
    if (!x.touch.length) as[x.key] = major;
  });
  return as;
}

function splitColor(id) {
  const i = (cb && cb.engIds ? cb.engIds : []).indexOf(id);
  return SPLIT_COL[(i < 0 ? 0 : i) % SPLIT_COL.length];
}
function standLabel(A, x) {
  const G = geom(A),
    rank = Math.floor(x.s.pos / G.files),
    file = (x.s.pos % G.files) + 1;
  const who =
    x.s.kind === 'char'
      ? A.charName || 'Character'
      : x.s.kind === 'aux'
        ? 'Auxiliary'
        : x.s.cmd
          ? 'Command stand'
          : 'Stand';
  return who + ', ' + (rank === 0 ? 'front rank' : 'rank ' + (rank + 1)) + ', file ' + file;
}

/* the assignment step in the combat panel */
function renderSplit(body, A) {
  const info = splitInfo(A, cb.engIds),
    nm = id => {
      const e = byId(id);
      return e ? e.short || e.name : id;
    };
  body.appendChild(
    ptext(
      'Engaged with ' +
        cb.engIds.length +
        ' enemy regiments. Each engaged stand attacks the regiment it touches; a stand touching more than one chooses one, and each supporting stand chooses one. No stand splits its Attacks. Each pool is then resolved on its own, To Hit through Morale. The stands are coloured on the board by their target.'
    )
  );
  /* summary chips */
  const sum = document.createElement('div');
  sum.className = 'split-sum';
  cb.engIds.forEach(id => {
    const mine = info.filter(x => cb.assign[x.key] === id),
      e = mine.filter(x => x.touch.includes(id)).length,
      s = mine.length - e;
    const chip = document.createElement('span');
    chip.className = 'split-chip';
    chip.style.borderColor = splitColor(id);
    chip.innerHTML = '';
    const dot = document.createElement('i');
    dot.style.background = splitColor(id);
    chip.append(dot, document.createTextNode(`${nm(id)}: ${e} engaged, ${s} supporting`));
    sum.appendChild(chip);
  });
  body.appendChild(sum);
  const pick = (x, id) => {
    cb.assign[x.key] = id;
    renderCombat();
    redrawSplit();
  };
  const optBtns = (x, ids) => {
    const r = document.createElement('div');
    r.className = 'split-opts';
    ids.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost split-btn';
      b.setAttribute('aria-pressed', String(cb.assign[x.key] === id));
      b.style.setProperty('--sc', splitColor(id));
      b.textContent = nm(id);
      b.onclick = () => pick(x, id);
      r.appendChild(b);
    });
    return r;
  };
  const locked = info.filter(x => x.touch.length === 1),
    choice = info.filter(x => x.touch.length > 1),
    support = info.filter(x => !x.touch.length);
  if (locked.length) {
    const by = {};
    locked.forEach(x => (by[x.touch[0]] = (by[x.touch[0]] || 0) + 1));
    body.appendChild(
      ptext(
        'Fixed: ' +
          Object.entries(by)
            .map(([id, n]) => `${n} stand${n > 1 ? 's' : ''} touching only ${nm(id)}`)
            .join('; ') +
          '.'
      )
    );
  }
  const list = document.createElement('div');
  list.className = 'split-list';
  choice.forEach(x => {
    const row = document.createElement('div');
    row.className = 'split-row';
    const l = document.createElement('span');
    l.textContent = standLabel(A, x) + ' (touches ' + x.touch.map(nm).join(' and ') + ')';
    hoverStand(row, x.key);
    row.append(l, optBtns(x, x.touch));
    list.appendChild(row);
  });
  if (support.length) {
    const row = document.createElement('div');
    row.className = 'split-row split-all';
    const l = document.createElement('span');
    l.textContent = `All ${support.length} supporting stand${support.length > 1 ? 's' : ''}:`;
    const r = document.createElement('div');
    r.className = 'split-opts';
    cb.engIds.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost split-btn';
      b.style.setProperty('--sc', splitColor(id));
      b.setAttribute('aria-pressed', String(support.every(x => cb.assign[x.key] === id)));
      b.textContent = nm(id);
      b.onclick = () => {
        support.forEach(x => (cb.assign[x.key] = id));
        renderCombat();
        redrawSplit();
      };
      r.appendChild(b);
    });
    row.append(l, r);
    list.appendChild(row);
    support.forEach(x => {
      const row2 = document.createElement('div');
      row2.className = 'split-row';
      const l2 = document.createElement('span');
      l2.textContent = standLabel(A, x) + ' (supporting)';
      hoverStand(row2, x.key);
      row2.append(l2, optBtns(x, cb.engIds));
      list.appendChild(row2);
    });
  }
  body.appendChild(list);
  const pools = cb.engIds.filter(id => info.some(x => cb.assign[x.key] === id));
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'btn';
  go.textContent =
    pools.length > 1
      ? `Resolve ${pools.length} Clashes, one at a time`
      : `Clash ${nm(pools[0])} with every stand`;
  go.onclick = splitGo;
  body.appendChild(go);
}

/* hovering a row outlines that stand on the board */
function hoverStand(row, key) {
  row.addEventListener('mouseenter', () => {
    if (!cb) return;
    cb.hoverKey = key;
    redrawSplit();
  });
  row.addEventListener('mouseleave', () => {
    if (!cb) return;
    cb.hoverKey = null;
    redrawSplit();
  });
}
/* turn the assignment into one Clash per enemy regiment; only the last one ends the action */
function splitGo() {
  const c = cb,
    A = byId(c.att);
  if (!c || !A) return;
  const info = splitInfo(A, c.engIds);
  const pools = c.engIds
    .map(id => ({ id, keys: info.filter(x => c.assign[x.key] === id).map(x => x.key) }))
    .filter(p => p.keys.length);
  const N = pools.length;
  const items = pools.map((p, k) =>
    Object.assign({}, c, {
      split: p.keys,
      tgt: p.id,
      choices: null,
      assign: null,
      pool: [k + 1, N],
      inAct: k === N - 1 ? c.inAct : false,
      groups: null
    })
  );
  cb = null;
  clearSplit();
  cbQueue.splice(0, 0, ...items.slice(1));
  openCombat(items[0]);
  render();
}

/* a queued pool whose attacker or target has gone in the meantime */
function splitStale(o) {
  const A = byId(o.att),
    T = byId(o.tgt);
  if (A && A.onTable && !A.destroyed && T && T.onTable && !T.destroyed) return false;
  toast(
    !A || A.destroyed || !A.onTable
      ? 'The attacking regiment is gone: its remaining Clash pools are lost.'
      : (T.short || T.name) + ' is gone: the stands assigned to it have no one left to attack.'
  );
  if (o.inAct && act && act.cur) finishAction();
  else setTimeout(() => renderCombat(), 0);
  return true;
}

/* the colours on the board while stands are being assigned */
function drawSplit(g) {
  if (!cb || cb.split !== 'plan') return;
  const A = byId(cb.att);
  if (!A) return;
  splitInfo(A, cb.engIds).forEach(x => {
    const col = splitColor(cb.assign[x.key]),
      hov = cb.hoverKey === x.key;
    el(
      'polygon',
      {
        points: x.s.poly.map(q => px(q[0]) + ',' + py(q[1])).join(' '),
        fill: col,
        'fill-opacity': x.touch.length ? 0.55 : 0.3,
        stroke: hov ? '#FFFFFF' : col,
        'stroke-width': hov ? 3.5 : 2,
        'stroke-dasharray': x.touch.length || hov ? '' : '3 2'
      },
      g
    );
  });
  cb.engIds.forEach(id => {
    const e = byId(id);
    if (!e) return;
    el(
      'polygon',
      {
        points: corners(e)
          .map(q => px(q[0]) + ',' + py(q[1]))
          .join(' '),
        fill: 'none',
        stroke: splitColor(id),
        'stroke-width': 3
      },
      g
    );
  });
}
function redrawSplit() {
  const g = $('splitg');
  if (!g) return render();
  g.innerHTML = '';
  drawSplit(g);
}
function clearSplit() {
  const g = $('splitg');
  if (g) g.innerHTML = '';
}
