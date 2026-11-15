/*
 * Army builder: list checks
 *
 * Everything that makes a list illegal: warband limits, the Warlord, allies and faction-specific
 * restrictions.
 *
 * In this file: wbProblems(), WL_CREED, wlRule(), canWarlord(), wlFix(), wlProblems(), hkRole(),
 *   hkRoles(), hkAllOrders(), allyWhy(), allyIdx(), holyCrusadeWb(), bldProblems()
 */

function wbProblems(w) {
  const c = bldUnit(w.char),
    p = [];
  if (!c) return ['Choose a character.'];
  const R = wbRules(c, w),
    ch = wbChoices(c, w);
  if (R.none) return w.regs.length ? [c.name + ' has no warband of its own.'] : [];
  w.regs.forEach(r => {
    if (r.modular) modProblems(r.modular).forEach(t => p.push(t));
    /* one Officer per regiment (an Auxiliary is not an Officer) */
    const ru = r.unit && bldUnit(r.unit);
    if (ru && (r.opts || []).length) {
      const O = regOptions(ru).opts,
        offs = r.opts.filter(n => (O.find(o => o.name === n) || {}).kind === 'off');
      const mx = regOptions(ru).max;
      if (mx != null && offs.length > mx)
        p.push(`${r.unit}: at most ${mx} Officer${mx === 1 ? '' : 's'} (has ${offs.join(' and ')}).`);
    }
  });
  const lab = labaronIdx(w);
  const n = w.regs.length,
    cat = (r, i) => {
      const k = r.modular ? 'modular' : r.chariots ? 'chariot' : r.unit;
      const x = ch.find(q => q.key === k);
      return x ? (i === lab && x.cat === 'res' ? 'main' : x.cat) : 'none';
    };
  const nm = w.regs.filter((r, i) => cat(r, i) === 'main').length,
    nr = w.regs.filter((r, i) => cat(r, i) === 'res').length;
  if (labaronOn(w) && lab < 0 && w.regs.some((r, i) => cat(r, i) === 'res'))
    p.push('Sanctified Labaron: mark the Restricted regiment that counts as Mainstay.');
  if (n > R.allow) p.push(`Too many regiments: ${n} of ${R.allow}.`);
  if (nr > 2) p.push(`At most 2 Restricted choices (you have ${nr}).`);
  if (nr > nm) p.push(`Each Restricted choice needs a Mainstay choice (${nm} Mainstay, ${nr} Restricted).`);
  if (w.regs.some(r => cat(r) === 'none')) p.push('A regiment is not in this character’s warband.');
  Object.entries(R.caps).forEach(([k, v]) => {
    const cnt = w.regs.filter(r => r.unit && bnorm(r.unit).startsWith(k)).length;
    if (cnt > v) p.push(`At most ${v} × ${k.replace(/\b\w/g, s => s.toUpperCase())}.`);
  });
  {
    const rk = rideOf(w);
    if (rk && !w.regs.some(r => joinable(w, r)))
      p.push(
        (m => `${rk}: the ${c.name} must ride ${/^[AEIOU]/.test(m) ? 'an' : 'a'} ${m} in its warband.`)(
          String(RIDE[rk].source)
            .replace(/[\^$()]/g, '')
            .replace('|', ' or ')
        )
      );
    else if (c.type !== 'Monster' && !w.regs.some(r => joinable(w, r)))
      p.push(`Needs a ${c.type} regiment for the ${c.name} to join.`);
  }
  if ((R.needOne || c.type === 'Monster') && !n && !R.none && c.type === 'Monster' && R.needOne)
    p.push('Must include at least one regiment.');
  /* a character that is not a Monster must be assigned to a regiment of its warband, or it never reaches the table */
  if (
    c.type !== 'Monster' &&
    w.regs.some(r => joinable(w, r)) &&
    !(w.joins != null && w.regs[w.joins] && joinable(w, w.regs[w.joins]))
  )
    p.push(`The ${c.name} is not assigned to a regiment: choose which regiment it joins.`);
  if (wcCourtChoices(c) && !w.court)
    p.push(
      `Choose the ${c.name}’s ${bld.fac === 'Sorcerer Kings' ? 'Court' : 'Seasonal Court'} (${wcCourtChoices(c).join(', ')}).`
    );
  if (prioryOf(c) && !w.order)
    p.push('Choose the Priory Commander’s Order (Crimson Tower or Sealed Temple).');
  if (bld.fac === "W'adrhŭn" && !wadFixedCult(c)) {
    if (!w.cult)
      p.push(`Choose the ${c.name}’s Cult (Famine, Death or War; the Warlord may follow Conquest).`);
    else if (w.cult === 'Conquest' && bld.wbs[bld.warlord] !== w)
      p.push(`Only the Warlord may follow the Cult of Conquest (the ${c.name} is not the Warlord).`);
  }
  return p;
}

const WL_CREED = {
  'Ardent Kerawegh': ['Ardent'],
  'Hold Raegh': ['Clan'],
  Exemplar: ['Ardent', 'Clan'],
  'Tempered Sorcerer': ['Tempered'],
  'Tempered Steelshaper': ['Tempered'],
  'Lost Ancestor': ['Ardent', 'Tempered']
};

function wlRule(c) {
  if (!c) return { no: true, why: 'Unknown character' };
  const t = (c.options || '') + ' ' + (c.warband || '');
  if (/cannot be (the )?(army's )?warlord/i.test(t))
    return { no: true, why: c.name + ' cannot be the Warlord (army list rule).' };
  if (/must be (your )?warlord/i.test(t))
    return { must: true, why: 'A ' + c.name + ' must be your Warlord.' };
  if (WL_CREED[c.name]) return { creeds: WL_CREED[c.name] };
  return {};
}

function canWarlord(c) {
  return !wlRule(c).no;
}

function wlFix() {
  const W = bld.wbs.map(w => bldUnit(w.char));
  const must = W.findIndex(c => c && wlRule(c).must);
  if (must >= 0) {
    bld.warlord = must;
    return;
  }
  if (!(bld.warlord >= 0 && W[bld.warlord] && canWarlord(W[bld.warlord])))
    bld.warlord = W.findIndex(c => c && canWarlord(c));
}

function wlProblems() {
  const out = [],
    W = bld.wbs.map(w => bldUnit(w.char)).filter(Boolean);
  if (!W.length) return out;
  const musts = W.filter(c => wlRule(c).must);
  if (musts.length > 1) out.push('Only one ' + musts[0].name + ' is allowed: it must be your Warlord.');
  if (!W.some(canWarlord)) out.push('No character here can be the Warlord. Add one who can.');
  return out;
}

/* a Hundred Kingdoms character's sub-faction role, from its warband line ("Theist.", "The Orders.") */
function hkRole(name) {
  const c = bldUnit(name);
  return c ? ((c.warband || '').match(/^(Imperial|Feudal|Theist|The Orders)\b/) || [])[1] || '' : '';
}

function hkRoles() {
  return bld.fac === 'Hundred Kingdoms' ? bld.wbs.map(w => hkRole(w.char)).filter(Boolean) : [];
}

/* Sacred Relics and Order Regiment Upgrades: only when every character is [The Orders] */
function hkAllOrders() {
  const R = hkRoles();
  return R.length > 0 && R.every(r => r === 'The Orders');
}

/* Hundred Kingdoms Dynastic Ally: why this warband's character cannot be the ally ('' if it can) */
function allyWhy(wi) {
  const w = bld.wbs[wi],
    wl = bld.wbs[bld.warlord];
  if (!w) return 'No warband';
  if (bld.warlord === wi) return 'It is the Warlord';
  if (/Chapter Mage/.test(w.char)) return 'A Chapter Mage cannot be a Dynastic Ally';
  const c = bldUnit(w.char);
  if (!c || c.kind !== 'char' || !/Supremacy/.test(c.options || '')) return 'It has no Supremacy Ability';
  if (wl && wl.char === w.char) return 'It must be a different character entry from the Warlord';
  if (wl && hkRole(wl.char) && hkRole(wl.char) === hkRole(w.char))
    return 'It cannot share the Warlord’s Sub-Faction (' + hkRole(w.char) + ')';
  return '';
}

function allyIdx() {
  return bld.fac === 'Hundred Kingdoms' && bld.ally != null && bld.wbs[bld.ally] ? bld.ally : -1;
}

/* Holy Crusade (Crusading Noble Lord as Warlord or Dynastic Ally): every Crusading Bull, and a free Crusaders regiment */
function holyCrusadeWb(w) {
  if (bld.fac !== 'Hundred Kingdoms' || !/Crusading Noble Lord/.test(w.char || '')) return false;
  const i = bld.wbs.indexOf(w);
  return i === bld.warlord || i === allyIdx();
}

function bldProblems() {
  const out = [];
  if (!bld.wbs.length) out.push('Add at least one warband.');
  if (bld.fac === 'Hundred Kingdoms') {
    const R = hkRoles(),
      wl = bld.wbs[bld.warlord];
    /* Memories of the Red Years: no Theist and Orders characters together (For All Mankind ignores it, from the
       Warlord or the Dynastic Ally) */
    const al = bld.wbs[allyIdx()],
      fam = [wl, al].some(x => x && /Errant of the Order of the Shield/.test(x.char));
    if (allyIdx() >= 0 && allyWhy(allyIdx())) out.push('Dynastic Ally: ' + allyWhy(allyIdx()) + '.');
    if (R.includes('Theist') && R.includes('The Orders') && !fam)
      out.push('Memories of the Red Years: an army cannot include both a Theist and an Orders character.');
    /* Servite needs at least one Orders character */
    if (!R.includes('The Orders') && bld.wbs.some(w => w.regs.some(r => (r.opts || []).includes('Servite'))))
      out.push('Servite: the army needs at least one Orders character.');
    if (
      !hkAllOrders() &&
      bld.wbs.some(w =>
        w.regs.some(r =>
          (r.opts || []).some(n =>
            /^(Laurel of Triumph|Banner of Wrath|Disciplined Advance|Oathsworn)$/.test(n)
          )
        )
      )
    )
      out.push('Order Regiment Upgrades are only for armies whose characters are all Orders characters.');
  }
  /* Dweghom: one Mnemancer's Apprentice per army */
  if (bld.fac === 'Dweghom') {
    const n = bld.wbs.reduce(
      (a, w) => a + (w.regs || []).filter(r => (r.opts || []).includes("Mnemancer's Apprentice")).length,
      0
    );
    if (n > 1) out.push(`Only one Mnemancer’s Apprentice per army (you have ${n}).`);
  }
  if (bld.fac === 'Spires' && !bld.sect)
    out.push(
      'Choose the army’s Sect (Underspire, Directorate or Sovereign Lineage): every Spires army must follow one.'
    );
  bld.wbs.forEach((w, i) =>
    wbProblems(w)
      .concat(upgProblems(w, i))
      .forEach(t => out.push(`Warband ${i + 1}: ${t}`))
  );
  wlProblems().forEach(t => out.push(t));
  return out;
}
