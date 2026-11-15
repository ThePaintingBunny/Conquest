/*
 * Claude's faction choices
 *
 * The once-per-round faction options Claude can choose from, and Claude choosing them each round and on
 * activation.
 *
 * In this file: frRoundOptions(), frRoundOptions0(), applyRoundOption(), aiFactionRound(),
 *   aiLastPlanBy, aiFacOpts(), exFaction(), aiAutoFaction()
 */

function frRoundOptions(side) {
  const o = frRoundOptions0(side);
  (state.units || [])
    .filter(u => u.side === side && srAlive(u) && /Eidolon/.test(u.charName || '') && !cdirOf(u))
    .forEach(u =>
      Object.keys(CDIR).forEach(k =>
        o.push({
          id: 'cdir' + u.id + ':' + k,
          label: 'Combat Directive (Eidolon with ' + (u.short || u.name) + '): ' + k,
          def: k === 'Precision Armament'
        })
      )
    );
  return o;
}

function frRoundOptions0(side) {
  const out = [],
    R = state.round || 1,
    facs = frFacs(side);
  if (facs.includes('Old Dominion') && frG(side, 'od').soma !== R) {
    out.push({ id: 'soma:dark', label: 'Blasphemous Soma: +1 Dark Power', def: true });
    out.push({ id: 'soma:pant', label: 'Blasphemous Soma: +1 Fallen Pantheon' });
  }
  if (facs.includes('Nords')) {
    const g = frG(side, 'no'),
      raid = supK(side) === 'Raid Tactics!',
      ruler = supK(side) === 'Ruler of Manheim';
    if (g.round !== R && (!g.used || (raid && (+g.used || 0) < 3) || ruler))
      Object.keys(TACTICS)
        .filter(
          t => !(ruler && g.round === R - 1 && g.tactic === t) && !(raid && (g.usedL || []).includes(t))
        )
        .forEach(t =>
          out.push({
            id: 'tactic:' + t,
            label:
              'Tribal Tactic ' +
              t +
              ' (' +
              TACTICS[t].join(', ') +
              ' for Mortals, Exalted and character-led regiments this round; once per game)'
          })
        );
  }
  if (facs.includes('Sorcerer Kings') && !frG(side, 'sk').ritual)
    Object.entries(RITUALS).forEach(([c, L]) =>
      L.forEach(([n, t], i) =>
        out.push({
          id: 'ritual:' + n,
          label: 'Prepare Ritual ' + n + ' (' + c + ', needs ' + t + ' markers)',
          def: i === 0 && c === 'Court of Fire'
        })
      )
    );
  if (facs.includes('Weaver Courts') && !frG(side, 'wc').season)
    SEASONS.forEach(s =>
      out.push({
        id: 'season:' + s,
        label: 'Start the Cycle of Seasons in ' + s + ' (' + SEASONFX[s][0] + ')',
        def: s === 'Summer'
      })
    );
  if (facs.includes('Spires') && !spSect(side))
    SECTS.forEach(s => out.push({ id: 'sect:' + s, label: 'Sect: ' + s, def: s === 'Underspire' }));
  if (facs.includes('Dweghom') && !frG(side, 'dw').creed && !dwCreed(side))
    ['Ardent', 'Tempered', 'Clan'].forEach(c =>
      out.push({ id: 'creed:' + c, label: 'Creed: ' + c, def: c === 'Clan' })
    );
  return out;
}

async function applyRoundOption(side, id) {
  {
    const m = String(id).match(/^cdir(.+?):(.+)$/);
    if (m) {
      if (CDIR[m[2]] && cdirKeys(base(m[1])).includes(m[2])) return cdirSet(m[1], m[2]);
      return;
    }
  }
  const [k, v] = String(id).split(/:(.*)/s),
    R = state.round || 1;
  if (k === 'soma') {
    const g = frG(side, 'od');
    return frSet(
      side,
      'od',
      v === 'pant' ? { pant: (+g.pant || 0) + 1, soma: R } : { dark: (+g.dark || 0) + 1, soma: R }
    );
  }
  if (k === 'tactic' && TACTICS[v]) {
    const g = frG(side, 'no');
    const units = state.units.map(u => {
      if (u.side !== side || u.type === 'marker' || frFac(u) !== 'Nords') return u;
      const r = frRoles(u);
      if (!(r.includes('Mortals') || r.includes('Exalted') || u.charName)) return u;
      return grantU(u, 'Tribal Tactic: ' + v, TACTICS[v]);
    });
    return putState({
      units,
      fr: frPatch(side, 'no', {
        tactic: v,
        round: R,
        used: (+g.used || 0) + 1,
        usedL: (g.usedL || []).concat([v])
      })
    });
  }
  if (k === 'ritual') {
    const th = (Object.values(RITUALS)
        .flat()
        .find(x => x[0] === v) || [0, 7])[1],
      g = frG(side, 'sk'),
      dis = g.dis !== R;
    return frSet(side, 'sk', { ritual: v, th, rm: dis ? Math.min(R, 5) : 0, dis: dis ? R : g.dis });
  }
  if (k === 'season' && SEASONS.includes(v))
    return putState({
      fr: frPatch(side, 'wc', { season: v, round: R }),
      units: frSeasonUnits(state.units, side, v)
    });
  if (k === 'sect') return frSet(side, 'sp', { sect: v });
  if (k === 'creed') return frSet(side, 'dw', { creed: v });
}

async function aiFactionRound(chosen) {
  const side = AI,
    opts = frRoundOptions(side),
    lines = [];
  if (!opts.length) return lines;
  const groups = {};
  opts.forEach(o => {
    const g = o.id.split(':')[0];
    (groups[g] = groups[g] || []).push(o);
  });
  for (const [g, L] of Object.entries(groups)) {
    let pick = L.find(o => (chosen || []).includes(o.id));
    if (!pick && g !== 'tactic') pick = L.find(o => o.def) || L[0];
    if (!pick && g === 'tactic' && !(chosen || []).length && (state.round || 1) >= 2 && !aiLastPlanBy)
      pick = L[0];
    if (pick) {
      await applyRoundOption(side, pick.id);
      lines.push(pick.label);
    }
  }
  // tokens for destroyed Animate Vessels go to Dark Power
  if (frFacs(side).includes('Old Dominion')) {
    const g = frG(side, 'od'),
      pend = odLost(side) - (+g.seen || 0);
    if (pend > 0) {
      await frSet(side, 'od', { dark: (+g.dark || 0) + pend, seen: (+g.seen || 0) + pend });
      lines.push(pend + ' Dark Power token' + (pend > 1 ? 's' : '') + ' from destroyed Animate Vessels');
    }
  }
  return lines;
}

let aiLastPlanBy = '';

/* options offered to Claude at the start of a regiment activation */
function aiFacOpts(u) {
  let L = [],
    h = '',
    out = [];
  try {
    L = frOptions(u);
  } catch (e) {}
  L.forEach(it => {
    if (it.head) {
      h = it.head.replace(/\s*\(.*\)\s*$/, '').replace(/\?$/, '');
      return;
    }
    if (!it.why) out.push(h && !/:/.test(it.label) ? h + ': ' + it.label : it.label);
  });
  return out;
}

async function exFaction(st) {
  const u = byId(act.id);
  const want = String(st.option || '')
    .toLowerCase()
    .trim();
  if (!want) return '';
  let L = [];
  try {
    L = frOptions(u).filter(it => !it.head);
  } catch (e) {}
  const it =
    L.find(
      x =>
        x.label.toLowerCase() === want ||
        want.endsWith(': ' + x.label.toLowerCase()) ||
        want.split(': ').pop() === x.label.toLowerCase().split(' · ')[0]
    ) ||
    L.find(x => x.label.toLowerCase().startsWith(want.slice(0, 24))) ||
    L.find(x => want.includes(x.label.toLowerCase().slice(0, 18)));
  if (!it) return 'could not use ' + st.option;
  if (it.why) return 'could not use ' + it.label + ' (' + it.why + ')';
  await Promise.resolve(it.fn());
  render();
  await sleep(250);
  return 'uses ' + it.label;
}

async function aiAutoFaction(u, lines) {
  let L = [];
  try {
    L = frOptions(u);
  } catch (e) {
    return;
  }
  const f = frFac(u);
  if (f === "W'adrhŭn" && !act.frMarker) {
    const own = (frRoles(u).find(r => /^Cult of/.test(r)) || '').replace('Cult of ', '') || 'War';
    const it = L.find(x => !x.head && x.label === own);
    if (it) {
      await Promise.resolve(it.fn());
      lines.push('adds a ' + own + ' Chant Marker');
    }
  }
  if (f === 'Yoroni' && !act.frIdeal) {
    const it =
      L.find(x => !x.head && x.cls === 'pri' && !x.why) ||
      L.find(x => !x.head && /^(Ka|Chi|Fu|Sui|Mu)\b/.test(x.label));
    if (it) {
      await Promise.resolve(it.fn());
      lines.push('is activated by Ideal Card ' + it.label.split(' ')[0]);
    }
  }
}
