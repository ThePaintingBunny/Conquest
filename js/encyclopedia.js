/* The encyclopedia panel. */
let enFac = 0,
  enKind = 'all',
  enQ = '';
function enNorm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
function enStats(u, big) {
  const st = document.createElement('div');
  st.className = 'stats' + (big ? ' en-big' : '');
  const K = ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'],
    L = {
      M: 'March',
      V: 'Volley',
      C: 'Clash',
      A: 'Attacks',
      W: 'Wounds',
      R: 'Resolve',
      D: 'Defense',
      E: 'Evasion'
    };
  K.forEach(k => {
    const d = document.createElement('div');
    d.className = 'k';
    d.textContent = k;
    d.title = L[k];
    st.appendChild(d);
  });
  K.forEach(k => {
    const d = document.createElement('div');
    d.className = 'v';
    const v = u.stats[k];
    d.textContent = v === '-' || v == null ? '–' : v;
    st.appendChild(d);
  });
  st.setAttribute(
    'aria-label',
    K.map(k => L[k] + ' ' + (u.stats[k] === '-' ? 'none' : u.stats[k])).join(', ')
  );
  return st;
}
function enCard(u, fac, ff) {
  const c = document.createElement('article');
  c.className = 'en-card';
  c.tabIndex = 0;
  c.setAttribute('role', 'button');
  c.setAttribute(
    'aria-label',
    u.name + ', ' + (u.pts != null ? u.pts + ' points' : 'preview') + '. Open details'
  );
  const top = document.createElement('div');
  top.className = 'en-top';
  const h = document.createElement('h3');
  h.textContent = u.name;
  const pt = document.createElement('span');
  pt.className = 'en-pts';
  pt.textContent = u.pts != null ? u.pts : '—';
  const pl = document.createElement('small');
  pl.textContent = u.pts != null ? 'pts' : 'preview';
  pt.appendChild(pl);
  top.append(h, pt);
  c.appendChild(top);
  const sub = document.createElement('div');
  sub.className = 'en-sub';
  const kd = document.createElement('span');
  kd.className = 'en-kind ' + (u.kind === 'char' ? 'is-char' : 'is-reg');
  kd.textContent = u.kind === 'char' ? 'Character' : 'Regiment';
  sub.append(
    kd,
    document.createTextNode([u.cls, u.type].filter(Boolean).join(' ') + (fac ? ' · ' + fac : ''))
  );
  c.appendChild(sub);
  c.appendChild(enStats(u));
  const ch = document.createElement('div');
  ch.className = 'chips en-rules';
  (u.rules.length ? u.rules : ['No special rules']).forEach(r =>
    ch.appendChild(
      u.rules.length
        ? chip(r, '', ff)
        : Object.assign(document.createElement('span'), { className: 'hint', textContent: r })
    )
  );
  c.appendChild(ch);
  const more = document.createElement('div');
  more.className = 'en-more';
  more.textContent = 'Details';
  c.appendChild(more);
  const open = () => enDetail(u, ff);
  c.onclick = e => {
    if (e.target.closest('.has-tip')) return;
    open();
  };
  c.onkeydown = e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === c) {
      e.preventDefault();
      open();
    }
  };
  return c;
}
function enSec(box, title) {
  const s = document.createElement('section');
  s.className = 'en-sec';
  const h = document.createElement('h4');
  h.textContent = title;
  s.appendChild(h);
  box.appendChild(s);
  return s;
}
function enRuleList(sec, list, ff) {
  const dl = document.createElement('dl');
  dl.className = 'en-dl';
  list.forEach(r => {
    const dt = document.createElement('dt');
    dt.textContent = r;
    const dd = document.createElement('dd');
    dd.textContent = ruleInfo(r, ff) || 'Described in the faction’s army list.';
    dl.append(dt, dd);
  });
  sec.appendChild(dl);
}
function enWarband(t) {
  const out = { main: [], res: [], notes: [] };
  String(t || '')
    .split(/(?<=\.)\s+|;\s*/)
    .forEach(seg => {
      seg = seg.trim().replace(/\.$/, '');
      if (!seg) return;
      const m = seg.match(/^(?:warband[^:]*:\s*)?(mainstay|restricted)\s*:?\s*(.*)$/i);
      if (m) {
        const arr = m[2]
          .split(/,\s*/)
          .map(x => x.trim())
          .filter(Boolean);
        (m[1].toLowerCase() === 'mainstay' ? out.main : out.res).push(...arr);
      } else out.notes.push(seg);
    });
  return out;
}
function enDetail(u, ff, nav) {
  tipHide();
  let dg = $('en-dlg');
  if (!dg) {
    dg = document.createElement('dialog');
    dg.id = 'en-dlg';
    dg.className = 'en-dlg';
    document.body.appendChild(dg);
    dg.addEventListener('click', e => {
      if (e.target === dg) dg.close();
    });
    dg.addEventListener('close', () => {
      tipHide();
      if (dg._from)
        try {
          dg._from.focus();
        } catch (x) {}
    });
  }
  if (!dg.open || !nav) {
    dg._from = document.activeElement;
    dg._hist = [];
  } else if (nav === 'push') dg._hist.push(dg._cur);
  dg._cur = [u, ff];
  dg.innerHTML = '';
  dg.setAttribute('aria-labelledby', 'en-dlg-t');
  const hd = document.createElement('div');
  hd.className = 'en-dhead';
  const tt = document.createElement('div');
  const h = document.createElement('h2');
  h.id = 'en-dlg-t';
  h.textContent = u.name;
  const sub = document.createElement('div');
  sub.className = 'en-sub';
  const kd = document.createElement('span');
  kd.className = 'en-kind ' + (u.kind === 'char' ? 'is-char' : 'is-reg');
  kd.textContent = u.kind === 'char' ? 'Character' : 'Regiment';
  sub.append(kd, document.createTextNode([u.cls, u.type].filter(Boolean).join(' ') + (ff ? ' · ' + ff : '')));
  tt.append(h, sub);
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'btn ghost';
  x.textContent = 'Close';
  x.onclick = () => dg.close();
  const acts = document.createElement('div');
  acts.className = 'en-dacts';
  if (dg._hist.length) {
    const prev = dg._hist[dg._hist.length - 1],
      bk = document.createElement('button');
    bk.type = 'button';
    bk.className = 'btn ghost en-back';
    bk.textContent = '‹ Back to ' + prev[0].name;
    bk.onclick = () => {
      const pv = dg._hist.pop();
      enDetail(pv[0], pv[1], 'back');
    };
    acts.appendChild(bk);
  }
  acts.appendChild(x);
  hd.append(tt, acts);
  dg.appendChild(hd);
  const body = document.createElement('div');
  body.className = 'en-dbody';
  dg.appendChild(body);
  const facts = document.createElement('div');
  facts.className = 'en-facts';
  [
    ['Points', u.pts != null ? u.pts : 'Preview, not yet costed'],
    ...(u.kind === 'reg' && u.type !== 'Monster' && u.type !== 'Chariot'
      ? [['Command models', cmdText(u)]]
      : []),
    [
      'Extra stands',
      u.extra != null
        ? '+' + u.extra + ' each'
        : u.kind === 'char' || /^1 stand/.test(u.stands)
          ? '—'
          : 'see list'
    ],
    ['Size', u.stands]
  ].forEach(([k, v]) => {
    const d = document.createElement('div');
    const a = document.createElement('span');
    a.textContent = k;
    const b = document.createElement('b');
    b.textContent = v;
    d.append(a, b);
    facts.appendChild(d);
  });
  body.appendChild(facts);
  body.appendChild(enStats(u, true));
  if (u.kind === 'char' && u.stats.M === '-')
    body.appendChild(ptext('A character has no March of its own: it moves with the regiment it joins.'));
  if (u.stats.R === '-' && u.kind === 'reg')
    body.appendChild(ptext('No Resolve: this regiment does not test it.'));
  if (u.rules.length) enRuleList(enSec(body, 'Special rules'), u.rules, ff);
  if (u.draw.length) enRuleList(enSec(body, 'Draw Events'), u.draw, ff);
  if (u.options) {
    const sc = enSec(body, u.kind === 'char' ? 'Upgrades and abilities' : 'Officers and options');
    const ul = document.createElement('ul');
    ul.className = 'en-ul';
    u.options.split(/;\s*/).forEach(o => {
      if (!o.trim()) return;
      const li = document.createElement('li');
      const mm = o.match(/^([^:]{2,40}):\s*(.*)$/);
      if (mm) {
        const b = document.createElement('b');
        b.textContent = mm[1] + ': ';
        li.append(b, document.createTextNode(mm[2]));
        const di = ruleInfo(mm[2].split(/[;,]/)[0], ff);
        if (/supremacy/i.test(mm[1]) && di) {
          const p = document.createElement('div');
          p.className = 'hint';
          p.textContent = di;
          li.appendChild(p);
        }
      } else li.textContent = o;
      ul.appendChild(li);
    });
    sc.appendChild(ul);
  }
  if (u.warband) {
    const W = enWarband(u.warband),
      sc = enSec(body, u.kind === 'char' ? 'Warband' : 'Battlefield role');
    const grp = (lab, arr) => {
      if (!arr.length) return;
      const d = document.createElement('div');
      d.className = 'en-wb';
      const b = document.createElement('span');
      b.className = 'en-tag';
      b.textContent = lab;
      const ch = document.createElement('div');
      ch.className = 'chips';
      arr.forEach(n => {
        const k = document.createElement('button');
        k.type = 'button';
        k.className = 'chip en-link';
        k.textContent = n;
        const base = n.replace(/\s*\(.*\)$/, '').toLowerCase();
        const f = ENCY.find(F => F.name === ff);
        const tgt =
          f &&
          f.units.find(
            z =>
              z.name.toLowerCase() === base ||
              z.name.toLowerCase().replace(/s$/, '') === base.replace(/s$/, '')
          );
        if (tgt) k.onclick = () => enDetail(tgt, ff, 'push');
        else {
          k.disabled = true;
        }
        ch.appendChild(k);
      });
      d.append(b, ch);
      sc.appendChild(d);
    };
    grp('Mainstay', W.main);
    grp('Restricted', W.res);
    W.notes.forEach(n =>
      sc.appendChild(ptext(ruleInfo(n, ff) && n.split(/\s/).length < 4 ? n + ' — ' + ruleInfo(n, ff) : n))
    );
  }
  const f = ENCY.find(F => F.name === ff);
  if (f) {
    const p = document.createElement('p');
    p.className = 'en-src';
    p.textContent = f.version + '. Summaries are paraphrased; ';
    const a = document.createElement('a');
    a.href = f.source;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'check the official army list';
    p.append(a, document.createTextNode(' for exact wording.'));
    body.appendChild(p);
  }
  if (!dg.open) dg.showModal();
  dg.scrollTop = 0;
  body.scrollTop = 0;
  (dg.querySelector('.en-back') || x).focus();
}
function renderEncy() {
  const fb = $('en-facs');
  if (!fb.children.length) {
    ENCY.forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = f.name;
      b.onclick = () => {
        enFac = i;
        enQ = '';
        $('en-q').value = '';
        renderEncy();
      };
      fb.appendChild(b);
    });
  }
  [...fb.children].forEach((b, i) => b.setAttribute('aria-pressed', String(!enQ && i === enFac)));
  document
    .querySelectorAll('#ency .grp button')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === enKind)));
  const info = $('en-info'),
    grid = $('en-grid');
  info.innerHTML = '';
  grid.innerHTML = '';
  const q = enNorm(enQ.trim());
  let list = [];
  if (q) {
    ENCY.forEach(f =>
      f.units.forEach(u => {
        const hay = enNorm(
          [u.name, u.type, u.cls, u.rules.join(' '), u.draw.join(' '), u.options, u.warband, f.name].join(' ')
        );
        if (q.split(/\s+/).every(w => hay.includes(w))) list.push([u, f.name, f.name]);
      })
    );
  } else {
    const f = ENCY[enFac];
    list = f.units.map(u => [u, '', f.name]);
    const p = document.createElement('p');
    p.className = 'en-src';
    p.textContent =
      f.name +
      ' · ' +
      f.version +
      ' · ' +
      f.units.filter(u => u.kind === 'char').length +
      ' characters, ' +
      f.units.filter(u => u.kind === 'reg').length +
      ' regiments. ';
    const a = document.createElement('a');
    a.href = f.source;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Official army list (PDF)';
    p.appendChild(a);
    info.appendChild(p);
    if (f.armyRules.length) {
      const ch = document.createElement('div');
      ch.className = 'chips';
      ch.style.marginTop = '6px';
      f.armyRules.forEach(r => ch.appendChild(chip(r, 'fx', f.name)));
      info.appendChild(ch);
    }
  }
  list = list.filter(([u]) => enKind === 'all' || u.kind === enKind);
  if (q) {
    const p = document.createElement('p');
    p.className = 'en-src';
    p.textContent = list.length + ' match' + (list.length === 1 ? '' : 'es') + ' across all factions.';
    info.appendChild(p);
  }
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Nothing matches that search.';
    grid.appendChild(p);
    return;
  }
  list.forEach(([u, fn, ff]) => grid.appendChild(enCard(u, fn, ff)));
}
$('en-open').onclick = () => {
  const e = $('ency');
  e.hidden = !e.hidden;
  $('en-open').setAttribute('aria-expanded', String(!e.hidden));
  if (!e.hidden) {
    const nm = enNorm(N(HU));
    const i = ENCY.findIndex(f => nm.includes(enNorm(f.name)) || enNorm(f.name).includes(nm));
    if (i >= 0 && !enQ) enFac = i;
    renderEncy();
    try {
      e.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (x) {}
  }
};
$('en-close').onclick = () => {
  $('ency').hidden = true;
  $('en-open').setAttribute('aria-expanded', 'false');
};
$('en-q').oninput = () => {
  enQ = $('en-q').value;
  renderEncy();
};
document.querySelectorAll('#ency .grp button').forEach(
  b =>
    (b.onclick = () => {
      enKind = b.dataset.k;
      renderEncy();
    })
);
function encyFor(text, faction) {
  const t = enNorm(text),
    out = [];
  ENCY.forEach(f =>
    f.units.forEach(u => {
      const n = enNorm(u.name);
      if (n.length > 3 && t.includes(n)) out.push(Object.assign({ faction: f.name }, u));
    })
  );
  const ff = ENCY.find(
    f => faction && (enNorm(faction).includes(enNorm(f.name)) || enNorm(f.name).includes(enNorm(faction)))
  );
  return { units: out, faction: ff || null };
}
function encyBrief(u) {
  return `${u.name} (${u.faction || ''} ${u.kind === 'char' ? 'character' : 'regiment'}, ${[u.cls, u.type].join(' ').trim()}, ${u.pts ?? '?'} pts${u.extra != null ? ', +' + u.extra + '/stand' : ''}, ${u.stands}): ${['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].map(k => k + u.stats[k]).join(' ')}; rules: ${u.rules.join(', ') || 'none'}${u.draw.length ? '; draw events: ' + u.draw.join(', ') : ''}${u.options ? '; options: ' + u.options : ''}${u.warband ? '; ' + (u.kind === 'char' ? 'warband: ' : '') + u.warband : ''}`;
}
