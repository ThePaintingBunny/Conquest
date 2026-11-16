/*
 * Setup: roster and scenario
 *
 * The army overview, the scenario choice and the army rules box.
 *
 * In this file: setupDraft, resetArm, rosterOpts(), rosterUpg(), rosterTable(), scenarioPanel(),
 *   AUTO_ARMY, armyRulesBox()
 */

let setupDraft = { faction: '', pts: 2000, list: '', aiFaction: '', aiPlayer: 'bot', botLevel: 'normal' },
  resetArm = false;

/* a regiment's options, officers and its own upgrades, from its abilities (not Draw Events, not the character's upgrades) */
function rosterOpts(u) {
  return (u.abilities || []).filter(
    ([n, d]) =>
      !/^The [^:]+: /.test(n) &&
      (/^(Officer|Option)\b/.test(d) || /^Upgrade, \d+ pts/.test(d) || n === 'Veteran')
  );
}

/* the character's upgrades for a warband: listed on its regiments as "The <character>: <upgrade>", or on a monster
   character as "<description> (<type>, <n> pts)" */
function rosterUpg(L) {
  const out = [],
    seen = new Set();
  L.forEach(u =>
    (u.abilities || []).forEach(([n, d]) => {
      let m = n.match(/^The [^:]+: (.+)$/),
        name = m && m[1];
      if (!name && u.type === 'monster' && /\([^()]*,\s*\d+ pts\)$/.test(d)) name = n;
      if (!name && u.type === 'monster' && /^Upgrade, \d+ pts/.test(d)) name = n;
      if (name && !seen.has(name)) {
        seen.add(name);
        out.push([name, d]);
      }
    })
  );
  return out;
}

/* the army overview before the game: one card per regiment, grouped by warband, readable on a phone and a PC */
function rosterTable(units, onBanner) {
  const box = bEl('div', { className: 'rost' }),
    K = ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'],
    val = v => (v == null || v === '' ? '–' : String(v));
  const card = u => {
    const S0 = u.stats || {},
      c = bEl('article', { className: 'rc' + (u.charName ? ' rc-led' : '') });
    c.append(
      bEl('header', { className: 'rc-h' }, [
        bEl('b', { className: 'rc-n', textContent: u.name }),
        u.points ? bEl('span', { className: 'rc-pts', textContent: u.points + ' pts' }) : ''
      ]),
      bEl('div', {
        className: 'rc-sub',
        textContent:
          [u.cls, u.type === 'monster' ? '' : u.stands + ' stand' + (u.stands === 1 ? '' : 's')]
            .filter(Boolean)
            .join(' · ') + (u.auxName ? ' · with ' + u.auxName : '')
      })
    );
    const st = bEl('div', { className: 'rc-stats' });
    K.forEach(k =>
      st.append(
        bEl('div', {}, [bEl('span', { textContent: k }), bEl('b', { textContent: val(S0[k]) })])
      )
    );
    c.append(st);
    if ((u.rules || []).length)
      c.append(
        bEl(
          'div',
          { className: 'rc-rules' },
          u.rules.map(r => bEl('span', { className: 'chip', textContent: r }))
        )
      );
    const op = rosterOpts(u);
    if (op.length)
      c.append(
        bEl(
          'div',
          { className: 'rc-rules rc-opts' },
          op.map(([n, d]) => bEl('span', { className: 'chip rc-op', textContent: n, title: d }))
        )
      );
    if (u.charName)
      c.append(
        bEl('div', { className: 'rc-char' }, [
          bEl('span', { className: 'rc-cl', textContent: 'Led by' }),
          bEl('b', { textContent: u.charName }),
          u.warlord ? bEl('span', { className: 'rc-wl', textContent: 'Warlord' }) : '',
          (u.spells || []).length
            ? bEl('span', { className: 'rc-sp', textContent: u.spells.map(x => x.name).join(', ') })
            : ''
        ])
      );
    if (onBanner && u.type !== 'monster') {
      const x = bEl('input', { type: 'checkbox' });
      x.checked = !!u.bearer;
      x.onchange = () => onBanner(units.indexOf(u), x.checked);
      c.append(bEl('label', { className: 'rc-sb' }, [x, bEl('span', { textContent: 'Standard Bearer' })]));
    }
    return c;
  };
  /* warbands in list order; a list without warbands is one group */
  const groups = [];
  units.forEach(u => {
    const k = u.wb != null ? 'w' + u.wb : '-';
    let g = groups.find(x => x.k === k);
    if (!g) groups.push((g = { k, u: [], ch: u.wbChar || '' }));
    g.u.push(u);
  });
  groups.forEach(g => {
    const sec = bEl('section', { className: 'rost-wb' });
    if (g.k !== '-') {
      const lead = g.u.find(u => u.charName) || g.u.find(u => u.type === 'monster' && u.name === g.ch),
        wl = g.u.some(u => u.warlord),
        pts = g.u.reduce((a, u) => a + (+u.points || 0), 0);
      sec.append(
        bEl('h4', { className: 'rost-wh' }, [
          bEl('span', { textContent: (g.ch || (lead && lead.charName) || 'Warband') + '’s warband' }),
          wl ? bEl('span', { className: 'rc-wl', textContent: 'Warlord' }) : '',
          bEl('span', { className: 'rost-wp', textContent: pts + ' pts' })
        ])
      );
    }
    const up = rosterUpg(g.u);
    if (up.length)
      sec.append(
        bEl('div', { className: 'rc-rules rost-upg' }, [
          bEl('span', { className: 'rc-cl', textContent: 'Upgrades' }),
          ...up.map(([n, d]) => bEl('span', { className: 'chip rc-up', textContent: n, title: d }))
        ])
      );
    sec.append(bEl('div', { className: 'rost-grid' }, g.u.map(card)));
    box.append(sec);
  });
  return box;
}

function scenarioPanel(add, mk) {
  const box = document.createElement('div');
  box.className = 'rev';
  const h = document.createElement('h3');
  h.textContent = 'Scenario';
  box.appendChild(h);
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Scenario');
  Object.keys(SCEN).forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = k + '. ' + SCEN[k].name;
    sel.appendChild(o);
  });
  sel.value = String(scenId());
  sel.onchange = async () => {
    const id = +sel.value;
    const patch = { scenario: id, zones: SCEN[id].zones };
    await putState(patch);
    if (terrMode === 'random') await putState({ terrain: genTerrain() });
    else {
      const ok = terrainOf().filter(t => !terrWhy(t, terrainOf()));
      await putState({ terrain: ok });
    }
  };
  box.appendChild(sel);
  box.appendChild(ptext(scenOf().vp));
  if ((scenOf().markers || []).length)
    box.appendChild(
      ptext(
        'Objective Markers: ' +
          colName('cs') +
          ' belongs to the south army, ' +
          colName('nord') +
          ' to the north army, brown is neutral. Each has 3 wounds and Defense 3 and can be attacked from round 2.'
      )
    );
  add(box);
}

const AUTO_ARMY =
  /Strategic Stack|Direct Orders|Hammer and Anvil|Prophecy Unfulfilled|Animate Vessel|Brittle/;

function armyRulesBox() {
  const d = document.createElement('details');
  d.className = 'vc';
  const sm = document.createElement('summary');
  sm.textContent = 'Army rules';
  d.appendChild(sm);
  ['cs', 'nord'].forEach(side => {
    const list = (state.army && state.army[side]) || [];
    if (!list.length) return;
    const fac = facOf(N(side));
    const h = document.createElement('div');
    h.className = 'en-tag';
    h.style.marginTop = '6px';
    h.textContent = N(side) + (side === HU ? ' (you)' : '');
    d.appendChild(h);
    const ch = document.createElement('div');
    ch.className = 'chips';
    list.forEach(r => {
      const auto = AUTO_ARMY.test(r),
        c = chip(r, auto ? 'fx' : '', fac);
      if (auto) c.textContent += ' · automatic';
      ch.appendChild(c);
    });
    d.appendChild(ch);
  });
  d.appendChild(
    ptext(
      'Rules marked automatic are applied by the map. Apply the others yourselves: hover a rule to read it.'
    )
  );
  return d;
}
