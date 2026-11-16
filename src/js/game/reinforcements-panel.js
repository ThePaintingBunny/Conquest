/*
 * Reinforcements panel
 *
 * The panel where the player picks which regiments arrive.
 *
 * In this file: rfName(), reinfChoose(), reinfPanel()
 */

/* a regiment's name, and the character who arrives with it */
function rfName(u) {
  return (
    (u.short || u.name) +
    (u.charName ? ' (with the ' + u.charName + (u.warlord ? ', Warlord' : '') + ')' : '')
  );
}

/* pick which regiments of a weight class arrive after rolling for the whole class */
function reinfChoose(g, succ, side) {
  return new Promise(res => {
    bannerHide();
    let dg = $('rf-dlg');
    if (!dg) {
      dg = document.createElement('dialog');
      dg.id = 'rf-dlg';
      dg.className = 'en-dlg set-dlg';
      dg.setAttribute('aria-labelledby', 'rf-h');
      document.body.appendChild(dg);
      dg.addEventListener('cancel', e => e.preventDefault());
    }
    dg.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'en-head';
    const h = document.createElement('h2');
    h.id = 'rf-h';
    h.textContent = 'Reinforcements: ' + g.cls;
    head.append(h);
    dg.appendChild(head);
    const body = document.createElement('div');
    body.className = 'set-body';
    const d = document.createElement('div');
    d.className = 'drow';
    g.dice.forEach(v => d.appendChild(dieMini(v, v <= g.need ? 'hit' : 'miss')));
    body.appendChild(d);
    const p = document.createElement('p');
    p.textContent = `You rolled ${succ} success${succ === 1 ? '' : 'es'} (${g.need} or less) for ${g.units.length} ${g.cls} regiments. Choose the ${succ} that arrive${succ === 1 ? 's' : ''}.`;
    body.appendChild(p);
    const sel = new Set();
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn';
    const upd = () => {
      go.disabled = sel.size !== succ;
      go.textContent = sel.size === succ ? 'These arrive' : 'Choose ' + (succ - sel.size) + ' more';
    };
    g.units.forEach(u => {
      const l = document.createElement('label');
      l.className = 'set-row';
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.onchange = () => {
        if (c.checked) {
          if (sel.size >= succ) {
            c.checked = false;
            return;
          }
          sel.add(u);
        } else sel.delete(u);
        upd();
      };
      const t = document.createElement('span');
      t.textContent = rfName(u) + ' · ' + (u.cls || '') + (u.points ? ' · ' + u.points + ' pts' : '');
      l.append(c, t);
      body.appendChild(l);
    });
    go.onclick = () => {
      dg.close();
      res(g.units.filter(u => sel.has(u)));
    };
    upd();
    body.appendChild(go);
    dg.appendChild(body);
    dg.showModal();
  });
}

/* Reinforcement Phase: one panel per army with the dice, what they needed, who arrives and why; it waits for the player */
function reinfPanel(side, G, auto, noL, mine) {
  return new Promise(done => {
    bannerHide();
    let dg = $('rf-dlg');
    if (!dg) {
      dg = document.createElement('dialog');
      dg.id = 'rf-dlg';
      dg.className = 'en-dlg set-dlg';
      dg.setAttribute('aria-labelledby', 'rf-h');
      document.body.appendChild(dg);
      dg.addEventListener('cancel', e => e.preventDefault());
    }
    const R = state.round || 1;
    dg.innerHTML = '';
    const head = bEl('div', { className: 'en-head' });
    head.append(bEl('h2', { id: 'rf-h', textContent: 'Reinforcements · ' + N(side) + ' · Round ' + R }));
    dg.append(head);
    const body = bEl('div', { className: 'set-body' });
    dg.append(body);
    const picks = new Map(),
      need = [];
    body.append(
      ptext(
        'Regiments in reserve roll one die each, by weight class. A die succeeds on the number shown or less; each success lets one regiment of that class arrive.'
      )
    );
    if (auto.length) {
      const sec = bEl('div', { className: 'rf-sec' });
      sec.append(bEl('h3', { textContent: 'Arrive without a roll' }));
      const ul = bEl('ul', { className: 'rf-ul' });
      auto.forEach(t => ul.append(bEl('li', { textContent: t })));
      sec.append(ul);
      body.append(sec);
    }
    G.forEach((g, gi) => {
      const sec = bEl('div', { className: 'rf-sec' }),
        n = g.units.length,
        succ = g.dice.filter(v => v <= g.need).length;
      sec.append(bEl('h3', { textContent: g.cls + ' regiments (' + n + ')' }));
      sec.append(ptext('Round ' + R + ': each die succeeds on ' + g.need + ' or less.'));
      const dr = bEl('div', { className: 'drow' });
      g.dice.forEach((v, i) =>
        dr.append(dieMini(v, v <= g.need ? 'hit' : 'miss', 'rf' + R + side + gi + '-' + i + '-' + v))
      );
      sec.append(dr);
      g.notes.forEach(t => sec.append(ptext(t)));
      sec.append(
        bEl('p', {
          className: 'rf-res ' + (succ ? 'ok' : 'no'),
          textContent:
            succ +
            ' of ' +
            n +
            ' succeed' +
            (succ >= n ? ': all arrive.' : !succ ? ': none arrive this round.' : ': ' + succ + ' may arrive.')
        })
      );
      const ul = bEl('ul', { className: 'rf-ul' });
      if (succ >= n || !succ) {
        picks.set(g, succ ? g.units.slice() : []);
        g.units.forEach(u =>
          ul.append(bEl('li', { textContent: rfName(u) + (succ ? ' arrives' : ' stays in reserve') }))
        );
        sec.append(ul);
      } else if (mine) {
        const sel = new Set();
        need.push(() => sel.size === succ);
        sec.append(ptext('Choose the ' + succ + ' that arrive' + (succ === 1 ? 's' : '') + ':'));
        g.units.forEach(u => {
          const l = bEl('label', { className: 'set-row' });
          const c = bEl('input', { type: 'checkbox' });
          c.onchange = () => {
            if (c.checked) {
              if (sel.size >= succ) {
                c.checked = false;
                return;
              }
              sel.add(u);
            } else sel.delete(u);
            picks.set(
              g,
              g.units.filter(x => sel.has(x))
            );
            upd();
          };
          l.append(
            c,
            bEl('span', {
              textContent: rfName(u) + ' · ' + (u.cls || '') + (u.points ? ' · ' + u.points + ' pts' : '')
            })
          );
          sec.append(l);
        });
        picks.set(g, []);
      } else {
        const pk = g.units
          .slice()
          .sort((a, b) => (+b.points || 0) - (+a.points || 0))
          .slice(0, succ);
        picks.set(g, pk);
        g.units.forEach(u =>
          ul.append(
            bEl('li', {
              textContent: rfName(u) + (pk.includes(u) ? ' arrives (chosen)' : ' stays in reserve')
            })
          )
        );
        sec.append(ul);
      }
      body.append(sec);
    });
    if (noL.length) {
      const sec = bEl('div', { className: 'rf-sec' });
      sec.append(bEl('h3', { textContent: 'Cannot arrive yet' }));
      const ul = bEl('ul', { className: 'rf-ul' });
      noL.forEach(u =>
        ul.append(
          bEl('li', {
            textContent:
              rfName(u) +
              ' · ' +
              (/Heavy/.test(u.cls || '')
                ? 'Heavy regiments cannot roll before round 3'
                : 'Medium regiments cannot roll before round 2')
          })
        )
      );
      sec.append(ul);
      body.append(sec);
    }
    const go = bEl('button', { type: 'button', className: 'btn' });
    const upd = () => {
      const ok = need.every(f => f());
      go.disabled = !ok;
      go.textContent = ok ? 'Continue' : 'Choose which regiments arrive';
    };
    go.onclick = () => {
      dg.close();
      done(picks);
    };
    upd();
    body.append(bEl('div', { className: 'row' }, [go]));
    dg.showModal();
  });
}
