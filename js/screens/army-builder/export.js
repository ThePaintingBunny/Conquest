/*
 * Army builder: list to game
 *
 * Turns the finished list into the data the game uses to put regiments on the table.
 *
 * In this file: bldType(), bearerDefault(), cmdText(), unitJson(), upgAbilities(), charJson(),
 *   bldToList()
 */

function bldType(t) {
  t = String(t || '').toLowerCase();
  return t.includes('cav')
    ? 'cav'
    : t.includes('brute')
      ? 'brute'
      : t.includes('monster')
        ? 'monster'
        : t.includes('chariot')
          ? 'chariot'
          : 'inf';
}

function bearerDefault(u) {
  return !!(u && u.cmd && u.cmd.bearer);
}

function cmdText(u) {
  const c = u && u.cmd;
  if (!c) return '';
  return (
    [c.leader ? 'Leader' : '', c.bearer ? 'Standard Bearer' : ''].filter(Boolean).join(' · ') ||
    'No command models'
  );
}

function unitJson(u, extra, f) {
  const S = u.stats,
    n = v => (v === '-' ? null : v);
  return Object.assign(
    {
      name: u.name,
      short: u.name.slice(0, 20),
      points: u.pts || 0,
      cls: [u.cls || 'Medium', u.type].join(' ').trim(),
      type: bldType(u.type),
      stands: bldBase(u),
      M: n(S.M) || (bldType(u.type) === 'monster' ? 7 : 6),
      V: n(S.V) || 0,
      C: n(S.C) || 1,
      A: n(S.A) || 1,
      W: n(S.W) || 4,
      R: S.R === '-' ? '–' : S.R,
      D: n(S.D) || 0,
      E: n(S.E) || 0,
      rules: u.rules.slice(),
      abilities: u.draw.map(d => [d, ruleInfo(d, f.name) || 'Draw Event']),
      standardBearer: bearerDefault(u),
      leader: !!(u.cmd && u.cmd.leader),
      auxiliary: null,
      character: null
    },
    extra || {}
  );
}

function upgAbilities(w) {
  return (w.upg || [])
    .map(n => {
      const e = upgFind(n);
      return e ? [n, e[4] + ' (' + e[0] + ', ' + e[2] + ' pts)'] : [n, 'Upgrade'];
    })
    .concat((w.custom || []).map(x => [x.name, 'Upgrade, ' + x.pts + ' pts']));
}

function charJson(c, warlord, custom, w) {
  const n = v => (v === '-' ? null : v),
    S = Object.assign({}, c.stats);
  let rules = c.rules.concat((c.draw || []).filter(d => !c.rules.includes(d)));
  const order = prioryOf(c) && w && w.order;
  if (prioryOf(c)) {
    rules = rules.filter(r => !/^(Crimson Tower|Sealed Temple):/.test(r));
    if (order === 'Crimson Tower') rules.push('Brutal Impact (2)', 'Terrifying (1)');
    if (order === 'Sealed Temple') {
      S.A = (+S.A || 0) + 1;
      rules = rules.map(r => r.replace(/^Impact \((\d+)\)$/, (m, k) => 'Impact (' + (+k + 1) + ')'));
    }
  }
  return {
    order: order || undefined,
    court: (wcCourtChoices(c) && w && w.court) || undefined,
    name: c.name,
    warlord,
    ally: !warlord && allyIdx() >= 0 && bld.wbs[allyIdx()] === w,
    rider: !!rideOf(w),
    stats: {
      C: n(S.C) || 1,
      A: n(S.A) || 1,
      W: n(S.W) || 4,
      R: S.R === '-' ? 0 : S.R,
      D: n(S.D) || 0,
      E: n(S.E) || 0,
      V: n(S.V) || 0
    },
    rules,
    spells: [],
    upgrades: (w ? upgAbilities(w) : (custom || []).map(x => [x.name, x.pts + ' pts'])).map(a => a[0])
  };
}

function bldToList() {
  const f = bldFac();
  if (!f) return null;
  (bld.wbs || []).forEach(riderFix);
  const units = [],
    count = {};
  units.push = function (...a) {
    a.forEach(x => {
      if (this.wbCur && x) {
        x.wb = this.wbCur[0];
        x.wbChar = this.wbCur[1];
        if (this.wbCur[2]) x.cult = this.wbCur[2];
        if (this.wbCur[3]) x.wbCourt = this.wbCur[3];
      }
    });
    return Array.prototype.push.apply(this, a);
  };
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
  const nameOf = u => {
    count[u] = (count[u] || 0) + 1;
    return u;
  };
  bld.wbs.forEach((w, wi) => {
    const c = bldUnit(w.char);
    if (!c && !w.bare) return;
    const wl = bld.warlord === wi;
    units.wbCur = [wi, c ? c.name : null, wadWbCult(w), (wcCourtChoices(c) && w.court) || ''];
    if (c && c.type === 'Monster') {
      units.push(
        unitJson(
          c,
          {
            name: nameOf(c.name),
            points: wbPtsChar(w),
            abilities: c.draw.map(d => [d, ruleInfo(d, f.name) || 'Draw Event']).concat(upgAbilities(w)),
            warlordMonster: wl
          },
          f
        )
      );
    }
    w.regs.forEach((r, ri) => {
      if (r.modular) {
        const x = modJson(r.modular);
        x.points += (r.custom || []).reduce((a, c) => a + (+c.pts || 0), 0);
        (r.custom || []).forEach(q => x.abilities.push([q.name, 'Upgrade, ' + q.pts + ' pts']));
        nameOf(x.name);
        if (c && w.joins === ri && c.type !== 'Monster') x.character = charJson(c, wl, w.custom, w);
        if (c)
          x.abilities = (x.abilities || []).concat(
            upgAbilities(w).map(a => ['The ' + c.name + ': ' + a[0], a[1]])
          );
        units.push(x);
        return;
      }
      if (r.chariots) {
        r.chariots.filter(Boolean).forEach(nm => {
          const u = bldUnit(nm);
          if (u) units.push(unitJson(u, { name: nameOf(nm), stands: 1 }, f));
        });
        return;
      }
      const u = bldUnit(r.unit);
      if (!u) return;
      const o = regOptions(u).opts,
        ab = u.draw.map(d => [d, ruleInfo(d, f.name) || 'Draw Event']);
      let aux = null;
      const rules = u.rules.slice();
      (r.opts || []).forEach(nm => {
        const op = o.find(x => x.name === nm);
        if (!op) return;
        if (op.kind === 'aux') {
          const au = f.units.find(x =>
            bnorm(x.name).startsWith(bnorm(op.name).split(' ').slice(0, 2).join(' '))
          );
          aux = {
            name: op.name,
            stats: au ? { C: au.stats.C, A: au.stats.A, W: au.stats.W } : { C: 3, A: 4, W: 6 },
            rules: au ? au.rules.slice() : []
          };
          return;
        }
        /* Hundred Kingdoms Order Regiment Upgrades that change play */
        if (op.kind === 'order') {
          if (op.name === 'Banner of Wrath') rules.push('Fury');
          if (op.name === 'Disciplined Advance') rules.push('Charge +1″ (Disciplined Advance)');
        }
        if (op.kind === 'vet' && op.detail && ruleInfo(op.detail, f.name) && !/[+]/.test(op.detail)) {
          rules.push(op.detail);
          ab.push(['Veteran', op.detail]);
          return;
        }
        ab.push([
          op.name,
          (op.kind === 'off' ? 'Officer' : 'Option') +
            (op.detail ? ': ' + op.detail : '') +
            ', ' +
            op.cost +
            ' pts'
        ]);
      });
      (r.custom || []).forEach(x => ab.push([x.name, 'Upgrade, ' + x.pts + ' pts']));
      const x = unitJson(
        u,
        {
          name: nameOf(u.name),
          points: rowPts(r),
          stands: u.kind === 'char' ? 1 : r.stands || bldBase(u),
          rules,
          abilities: ab,
          standardBearer: bearerDefault(u),
          auxiliary: aux
        },
        f
      );
      if (w.pbReg === ri) x.vetRole = true;
      if (c && w.joins === ri && c.type !== 'Monster') {
        x.character = charJson(c, wl, w.custom, w);
        const rk = rideOf(w);
        if (rk === 'Bergont Raegh') {
          x.W = (+x.W || 0) + 2;
          x.rules = (x.rules || []).concat(['Flawless Strikes']);
          x.character.rules = x.character.rules.concat(['Flawless Strikes']);
        }
        if (rk === 'Favored of Hormus') {
          x.rules = (x.rules || []).filter(q => !/^Barrage\b/.test(q)).concat(['Terrifying (1)']);
        }
        if (rk === 'Draic Rider') x.rules = (x.rules || []).concat(['Flank']);
        if (rk) x.character.rules = x.character.rules.concat(['Rider']);
      }
      if (c)
        x.abilities = (x.abilities || []).concat(
          upgAbilities(w).map(a => ['The ' + c.name + ': ' + a[0], a[1]])
        );
      units.push(x);
    });
  });
  // number duplicate names
  const seen = {};
  units.forEach(u => {
    if (count[u.name] > 1) {
      seen[u.name] = (seen[u.name] || 0) + 1;
      u.name = u.name + ' ' + roman[seen[u.name]] || u.name;
    }
  });
  if (!units.some(u => (u.character && u.character.warlord) || u.warlordMonster)) {
    const fc = units.find(u => u.character && canWarlord(bldUnit(u.character.name)));
    if (fc) fc.character.warlord = true;
    else {
      const fm = units.find(u => u.warlordMonster === false);
      if (fm) fm.warlordMonster = true;
    }
  }
  /* Spires: the Sect travels with the list as an army rule */
  const ar = f.armyRules.slice();
  if (f.name === 'Spires' && bld.sect) ar.push('Sect: ' + bld.sect);
  return { faction: f.name, armyRules: ar, points: bldTotal(), units };
}
