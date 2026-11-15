/*
 * Armies tab
 *
 * Both armies as lists, with each regiment's state.
 *
 * In this file: renderArmies()
 */

function renderArmies() {
  ['cs', 'nord'].forEach(sd => {
    const box = $('r-' + sd);
    box.innerHTML = '';
    const L = all().filter(u => u.side === sd);
    const regs = L.filter(u => u.type !== 'marker'),
      onT = regs.filter(u => u.onTable && !u.destroyed),
      done = onT.filter(u => u.activated).length,
      dead = regs.filter(u => u.destroyed).length,
      off = regs.length - onT.length - dead;
    $('sum-' + sd).textContent = regs.length
      ? `${done}/${onT.length} activated` +
        (off ? ` · ${off} off table` : '') +
        (dead ? ` · ${dead} destroyed` : '')
      : '';
    L.forEach(u => {
      const row = document.createElement('div');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.className =
        'u' +
        (u.onTable ? '' : ' off') +
        (u.destroyed ? ' dead' : '') +
        (u.activated && u.type !== 'marker' ? ' done' : '') +
        (u.id === selId ? ' sel' : '');
      const ic = document.createElement('span');
      ic.className = 'u-ic';
      ic.textContent =
        u.type === 'marker' ? '◆' : u.destroyed ? '✕' : u.activated ? '✓' : u.onTable ? '•' : '⧗';
      ic.title =
        u.type === 'marker'
          ? 'Objective Marker'
          : u.destroyed
            ? 'Destroyed'
            : u.activated
              ? 'Activated this round'
              : u.onTable
                ? 'Ready to activate'
                : 'Not on the table';
      const mid = document.createElement('span');
      mid.className = 'u-m';
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = u.name;
      mid.appendChild(n);
      if (u.charName) {
        const c = document.createElement('span');
        c.className = 'u-c';
        c.textContent =
          '+ ' +
          u.charName +
          (u.warlord ? ' ★' : '') +
          (u.charWounds ? ' · ' + u.charWounds + '/' + (chStatsX(u).W ?? '?') + ' wounds' : '') +
          (u.charActivated ? ' · activated' : '');
        mid.appendChild(c);
      }
      const tags = document.createElement('span');
      tags.className = 'u-t';
      (u.effects || []).forEach(e => {
        const t = document.createElement('span');
        t.className = 'tg' + (/^Broken/.test(e) ? ' bad' : /Inspired/.test(e) ? ' good' : '');
        t.textContent = e.replace(/\s*\(.*\)$/, '');
        tags.appendChild(t);
      });
      if (!u.onTable && !u.destroyed && u.type !== 'marker') {
        const t = document.createElement('span');
        t.className = 'tg';
        t.textContent = u.arriving ? 'Arriving' : 'Reserves';
        tags.appendChild(t);
      }
      if (tags.children.length) mid.appendChild(tags);
      const right = document.createElement('span');
      right.className = 's';
      if (u.type === 'marker')
        right.textContent = u.destroyed
          ? 'Destroyed'
          : 3 - Math.max(u.dmg?.cs || 0, u.dmg?.nord || 0) + '/3 wounds';
      else if (u.destroyed) right.textContent = 'Destroyed';
      else {
        const L2 = live(u),
          T = u.stands || 1;
        const t = document.createElement('span');
        t.textContent = L2 + '/' + T;
        right.appendChild(t);
        right.title = L2 + ' of ' + T + ' stands left' + (u.wounds ? ', ' + u.wounds + ' wounds taken' : '');
        const bar = document.createElement('i');
        bar.className = 'u-bar';
        const fill = document.createElement('b');
        fill.style.width = Math.round((L2 / T) * 100) + '%';
        if (L2 / T <= 0.34) fill.className = 'low';
        bar.appendChild(fill);
        right.appendChild(bar);
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
      box.appendChild(row);
      if (u.charName && !u.destroyed) {
        const cr = document.createElement('div');
        cr.tabIndex = 0;
        cr.setAttribute('role', 'button');
        cr.className = 'u ch' + (u.charActivated ? ' done' : '') + (u.id === selId ? ' sel' : '');
        cr.style.paddingLeft = '22px';
        const ci = document.createElement('span');
        ci.className = 'u-ic';
        ci.textContent = u.charActivated ? '✓' : '♦';
        const cm = document.createElement('span');
        cm.className = 'u-m';
        const cn = document.createElement('span');
        cn.className = 'n';
        cn.textContent = u.charName + (u.warlord ? ' ★' : '');
        cm.appendChild(cn);
        const cs = document.createElement('span');
        cs.className = 'u-c';
        const S = chStatsX(u);
        cs.textContent =
          'C' +
          (S.C ?? '–') +
          ' A' +
          (S.A ?? '–') +
          ' D' +
          (S.D ?? '–') +
          ' E' +
          (S.E ?? '–') +
          ' R' +
          (S.R ?? '–') +
          ' · with ' +
          (u.short || u.name);
        cm.appendChild(cs);
        const cw = document.createElement('span');
        cw.className = 's';
        cw.textContent = Math.max(0, (+S.W || 0) - (+u.charWounds || 0)) + '/' + (S.W ?? '?');
        cw.title = 'Wounds left';
        cr.append(ci, cm, cw);
        const pk = () => {
          selId = u.id;
          rightTab = 'reg';
          render();
        };
        cr.onclick = pk;
        cr.onkeydown = e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pk();
          }
        };
        box.appendChild(cr);
      }
    });
    if (!L.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No regiments yet.';
      box.appendChild(p);
    }
  });
  renderTabs();
}
