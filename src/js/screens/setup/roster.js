/*
 * Setup: roster and scenario
 *
 * The roster table, the scenario choice and the army rules box.
 *
 * In this file: setupDraft, resetArm, rosterTable(), scenarioPanel(), AUTO_ARMY, armyRulesBox()
 */

let setupDraft = { faction: '', pts: 2000, list: '', aiFaction: '' },
  resetArm = false;

function rosterTable(units, onBanner) {
  const t = document.createElement('table');
  t.className = 'rost';
  const h = t.insertRow();
  ['Regiment', 'Class', 'Stands', 'M V C A W R D E', 'Rules', 'Character']
    .concat(onBanner ? ['Standard Bearer'] : [])
    .forEach(x => {
      const th = document.createElement('th');
      th.textContent = x;
      h.appendChild(th);
    });
  units.forEach(u => {
    const r = t.insertRow();
    const S0 = u.stats;
    [
      u.name + (u.points ? ' (' + u.points + ')' : ''),
      u.cls,
      String(u.stands),
      ['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].map(k => S0[k]).join(' '),
      (u.rules || []).join(', ') + (u.auxName ? ' · with ' + u.auxName : ''),
      u.charName
        ? u.charName +
          (u.warlord ? ' (Warlord)' : '') +
          ((u.spells || []).length ? ' · ' + u.spells.map(s => s.name).join(', ') : '')
        : ''
    ].forEach(v => {
      const c = r.insertCell();
      c.textContent = v;
    });
    if (onBanner) {
      const c = r.insertCell();
      if (u.type !== 'monster') {
        const x = document.createElement('input');
        x.type = 'checkbox';
        x.checked = !!u.bearer;
        x.setAttribute('aria-label', 'Standard Bearer for ' + u.name);
        x.onchange = () => onBanner(units.indexOf(u), x.checked);
        c.appendChild(x);
      }
    }
  });
  return t;
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
