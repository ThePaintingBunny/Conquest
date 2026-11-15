/*
 * Draw step panel
 *
 * Shows the Draw Event and faction choices at the start of an activation.
 *
 * In this file: renderDrawStep(), renderFacBox()
 */

/* the Draw Events step of the activation panel */
function renderDrawStep(u, fresh) {
  const box = $('c-draw');
  box.innerHTML = '';
  if (act && act.entering) {
    box.appendChild(
      ptext(
        'Arriving from Reinforcements this round: its Draw Events are not resolved (core rules, Resolve Draw Events).' +
          (frFac(u) === "W'adrhŭn" ? ' It adds no Chant Marker and cannot Chant the Battlecry.' : ''),
        'hint'
      )
    );
    let it0 = [];
    try {
      it0 = frOptions(u).filter(it => it.kind !== 'any');
    } catch (e) {}
    it0 = it0.filter((it, i) => !it.head || (it0[i + 1] && !it0[i + 1].head));
    if (it0.length) {
      const wrap = document.createElement('div');
      wrap.className = 'fr-opts';
      it0.forEach(it => {
        if (it.head) {
          const h = document.createElement('div');
          h.className = 'dn-h';
          h.textContent = it.head;
          wrap.appendChild(h);
          return;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dn-btn' + (it.cls === 'pri' ? ' pri' : '');
        b.textContent = it.label;
        if (it.why) {
          b.disabled = true;
          b.title = it.why;
        }
        b.onclick = () => {
          if (b.disabled) return;
          Promise.resolve(it.fn())
            .then(() => render())
            .catch(() => toast('That could not be saved. Try again.'));
        };
        wrap.appendChild(b);
      });
      box.appendChild(wrap);
    }
    return;
  }
  (act.drawNotes || []).forEach(t => {
    const d = document.createElement('div');
    d.className = 'dn auto';
    const i = document.createElement('span');
    i.className = 'dn-i';
    i.textContent = '✓';
    const s = document.createElement('span');
    s.textContent = t;
    d.append(i, s);
    box.appendChild(d);
  });
  if (fresh) {
    const notes = (act.drawNotes || []).join(' ').toLowerCase();
    (u.abilities || []).forEach(([n, t]) => {
      const nm = String(n),
        base = nm.replace(/\s*\(.*$/, '').trim();
      if (!isDrawAb(u, nm, t) && !fx(u).some(x => new RegExp('^' + base.replace(/[^A-Za-z ]/g, '.')).test(x)))
        return;
      if (
        /^(Bloom|Elemental Conduit|Forged by the Elements|Strain Expression|Memories of Old)/i.test(base) ||
        notes.includes(base.toLowerCase().split(' ')[0])
      )
        return;
      const d = document.createElement('div');
      d.className = 'dn ref';
      const i = document.createElement('span');
      i.className = 'dn-i';
      i.textContent = '•';
      const s2 = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = nm.replace(/^Draw Event:\s*/i, '') + ': ';
      const auto = /^(Regeneration|Biotic Renewal|Bastion|Double Time)/i.test(base);
      s2.append(
        b,
        document.createTextNode(
          auto && /Regeneration|Biotic/i.test(base) && !(u.wounds > 0)
            ? 'nothing to heal right now.'
            : auto
              ? String(t).replace(/^Draw Event:\s*/i, '')
              : 'resolve it yourself. ' + String(t).replace(/^Draw Event:\s*/i, '')
        )
      );
      d.append(i, s2);
      box.appendChild(d);
    });
  }
  let items = [];
  try {
    items = frOptions(u).filter(it => it.kind !== 'any');
  } catch (e) {}
  if (!fresh) items = items.filter(it => it.head || it.why !== 'Only before the first action');
  // drop headers that have no buttons after them
  items = items.filter((it, i) => !it.head || (items[i + 1] && !items[i + 1].head));
  if (items.length) {
    const wrap = document.createElement('div');
    wrap.className = 'fr-opts';
    items.forEach(it => {
      if (it.head) {
        const h = document.createElement('div');
        h.className = 'dn-h';
        h.textContent = it.head;
        wrap.appendChild(h);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dn-btn' + (it.cls === 'pri' ? ' pri' : '');
      b.textContent = it.label;
      if (it.why) {
        b.disabled = true;
        b.title = it.why;
        const sm = document.createElement('small');
        sm.textContent = it.why;
        b.appendChild(sm);
      }
      b.onclick = () => {
        if (b.disabled) return;
        Promise.resolve(it.fn())
          .then(() => render())
          .catch(() => toast('That could not be saved. Try again.'));
      };
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
  }
  if (!box.children.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = fresh
      ? 'No Draw Events to resolve. Choose the first action below.'
      : 'No Draw Events were resolved.';
    box.appendChild(p);
  }
}

function renderFacBox() {
  const box = $('c-fac');
  if (!box) return;
  box.innerHTML = '';
  const u = byId(selId);
  if (!u || u.type === 'marker' || !(u.side === ME || SBX()) || aiBusy) {
    box.hidden = true;
    return;
  }
  const f = frFac(u),
    items = frOptions(u).filter(it => it.kind === 'any');
  const info = [];
  if (f === 'Weaver Courts')
    info.push([
      'Seed Markers',
      (+u.seeds || 0) + ' / 3',
      u.side === ME || SBX()
        ? [
            ['−', () => tfSeeds(u, -1), (+u.seeds || 0) <= 0],
            ['+', () => tfSeeds(u, 1), (+u.seeds || 0) >= 3]
          ]
        : []
    ]);
  if (f === 'Old Dominion') {
    const m = memOf(u);
    if (m) info.push(['Memory of Old', m.text + (hasGrant(u, 'Memories of Old') ? ' · active' : '')]);
  }
  if (f === 'Spires' && STRAIN[frBase(u)]) info.push(['Strain', STRAIN[frBase(u)][0]]);
  const R = frRoles(u);
  if (R.length) info.push(['Battlefield Role', R.filter(r => r !== 'Character').join(', ')]);
  const SB = u.warlord ? supBlock(u.side, true) : u.dynAlly ? supBlock(u.side, true, 'ally') : null;
  if (!items.length && !info.length && !SB) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.append(bEl('h3', { textContent: 'Faction rules · ' + f }));
  if (SB) {
    box.append(bEl('div', { className: 'tf-l', textContent: 'Warlord · Supremacy Ability' }), SB);
  }
  info.forEach(([a, b, btns]) => {
    const r = bEl('div', { className: 'tf-row' });
    r.append(bEl('span', { className: 'tf-l', textContent: a + ':' }), bEl('span', { textContent: b }));
    (btns || []).forEach(([t, fn, dis]) => {
      const x = abBtn(t, fn, 'ab-sq');
      x.disabled = !!dis;
      x.setAttribute('aria-label', (t === '+' ? 'More ' : 'Fewer ') + a);
      r.append(x);
    });
    box.append(r);
  });
  const wrap = bEl('div', { className: 'fr-opts' });
  items.forEach(it => {
    if (it.head) {
      wrap.append(bEl('div', { className: 'tf-l', textContent: it.head }));
      return;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (it.cls === 'pri' ? '' : ' ghost');
    b.textContent = it.label;
    if (it.why) {
      b.disabled = true;
      b.title = it.why;
    }
    b.onclick = () => {
      if (b.disabled) return;
      Promise.resolve(it.fn())
        .then(() => render())
        .catch(() => toast('That could not be saved. Try again.'));
    };
    wrap.append(b);
  });
  if (items.length) box.append(wrap);
}
