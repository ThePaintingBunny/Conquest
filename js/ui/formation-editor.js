/*
 * Formation editor
 *
 * Rearranging the stands within a regiment's formation.
 *
 * In this file: formSel, formEditable(), tokLabel(), renderFormation()
 */

/* formation editor: arrange stands when arriving or reforming */
let formSel = null;

function formEditable() {
  if (!act) return false;
  if (act.entering && !act.placed) return true;
  const c = act.cur;
  return !!(c && (c.reshape || c.type === 'reform'));
}

function tokLabel(u, t) {
  if (t === 'c') return { name: u.charName || 'Character', sub: 'Character', cls: 'ch' };
  if (t === 'a') return { name: u.auxName || 'Auxiliary', sub: 'Auxiliary', cls: 'aux ' + auxStyle(u).key };
  const i = +t.slice(1),
    m = u.mods ? u.mods[i] : null;
  return {
    name: m || u.short || u.name,
    sub: t === 'r0' ? 'Command Stand' : 'Stand',
    cls: (t === 'r0' ? 'cmd ' : '') + (m ? 'mod' : ''),
    mod: m
  };
}

function renderFormation() {
  const box = $('c-form');
  if (!box) return;
  const u = act ? byId(act.id) : null;
  if (!u || selId !== u.id || !formEditable() || live(u) < 2) {
    box.hidden = true;
    box.innerHTML = '';
    formSel = null;
    return;
  }
  box.hidden = false;
  box.innerHTML = '';
  const G = geom(u),
    L = layout(u),
    seq = L.map(x => x.tok);
  box.append(Object.assign(document.createElement('h3'), { textContent: 'Formation' }));
  box.append(
    ptext(
      'Front rank at the top. Drag a stand onto another to swap them, or tap one then the other. Command, character and auxiliary stands stay in the front rank.'
    )
  );
  const grid = document.createElement('div');
  grid.className = 'fm-grid';
  grid.style.gridTemplateColumns = `repeat(${G.files},minmax(0,1fr))`;
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Stand positions, front rank first');
  const swap = (a, b) => {
    if (a === b) return;
    const s2 = seq.slice(),
      ia = s2.indexOf(a),
      ib = s2.indexOf(b);
    [s2[ia], s2[ib]] = [s2[ib], s2[ia]];
    const bad = s2.findIndex((t, k) => (t === 'r0' || t === 'c' || t === 'a') && k >= G.files);
    if (bad >= 0) {
      toast('The ' + tokLabel(u, s2[bad]).sub.toLowerCase() + ' must stay in the front rank.');
      formSel = null;
      renderFormation();
      return;
    }
    act.pose.order = s2.concat((u.order || []).filter(t => !s2.includes(t)));
    formSel = null;
    render();
  };
  L.forEach(x => {
    const lab = tokLabel(u, x.tok),
      b = document.createElement('button');
    b.type = 'button';
    b.className = 'fm-st ' + lab.cls + (formSel === x.tok ? ' sel' : '');
    b.draggable = true;
    const rr = Math.floor(x.pos / G.files);
    b.setAttribute(
      'aria-label',
      `${lab.name}, ${lab.sub}, rank ${rr + 1}, file ${(x.pos % G.files) + 1}` +
        (formSel === x.tok ? ', selected' : '')
    );
    if (lab.mod && MODSTYLE[lab.mod]) {
      const tag = document.createElement('span');
      tag.className = 'fm-tag';
      tag.textContent = MODSTYLE[lab.mod][0];
      tag.style.background = MODSTYLE[lab.mod][1];
      b.append(tag);
    }
    b.append(
      Object.assign(document.createElement('strong'), { textContent: lab.name }),
      Object.assign(document.createElement('span'), { textContent: lab.sub })
    );
    b.onclick = () => {
      if (formSel && formSel !== x.tok) swap(formSel, x.tok);
      else {
        formSel = formSel === x.tok ? null : x.tok;
        renderFormation();
      }
    };
    b.ondragstart = e => {
      e.dataTransfer.setData('text/plain', x.tok);
      e.dataTransfer.effectAllowed = 'move';
    };
    b.ondragover = e => {
      e.preventDefault();
      b.classList.add('over');
    };
    b.ondragleave = () => b.classList.remove('over');
    b.ondrop = e => {
      e.preventDefault();
      b.classList.remove('over');
      const t = e.dataTransfer.getData('text/plain');
      if (t) swap(t, x.tok);
    };
    grid.append(b);
  });
  box.append(grid);
  if (u.mods) {
    const leg = document.createElement('div');
    leg.className = 'fm-leg';
    [...new Set(u.mods)].forEach(m => {
      const s2 = MODSTYLE[m];
      if (!s2) return;
      const c = document.createElement('span');
      const t = document.createElement('span');
      t.className = 'fm-tag';
      t.textContent = s2[0];
      t.style.background = s2[1];
      c.append(t, document.createTextNode(' ' + m));
      leg.append(c);
    });
    box.append(leg);
  }
  if (act.pose.order)
    box.append(
      (() => {
        const r = document.createElement('button');
        r.type = 'button';
        r.className = 'btn ghost';
        r.textContent = 'Reset formation';
        r.onclick = () => {
          delete act.pose.order;
          render();
        };
        return r;
      })()
    );
}
