/*
 * Army builder: upgrade rules
 *
 * Which upgrades a character may take, mounts, and why an upgrade is not allowed.
 *
 * In this file: UPG_MULTI, upgList(), RIDE, RIDE_MULTI, rideOf(), riderFix(), upgFind(), charNoUpg(),
 *   upgWhy(), upgProblems()
 */

const UPG_MULTI = /Mutation|Weapon Art|Modification|Heirloom|Experiment/;

function upgList() {
  return (UPG[bld.fac] || { list: [] }).list;
}

/* Rider masteries: the character has no stand of its own and rides this Monster of its warband */
const RIDE = {
  'Apex Master': /^Apex Predator$/,
  'Tontorr Rider': /^Tontorr$/,
  'Drum Beast Rider': /^Drum Beast$/,
  'Bergont Raegh': /^Ironclad Drake$/,
  'Hellbringer Sorcerer': /^Hellbringer Drake$/,
  'Ferric Throne': /^Stoneforged$/,
  'Favored of Hormus': /^Mahut$/,
  'Draic Rider': /^(Coill|Scoth) Draic$/
};

const RIDE_MULTI = /^(Apex Master|Tontorr Rider|Drum Beast Rider)$/;

function rideOf(w) {
  return ((w && w.upg) || []).find(n => RIDE[n]) || null;
}

function riderFix(w) {
  const k = rideOf(w);
  if (!k) return;
  const i = w.regs.findIndex(r => r.unit && RIDE[k].test(r.unit));
  if (i >= 0) w.joins = i;
}

function upgFind(n) {
  return upgList().find(x => x[1] === n);
}

function charNoUpg(c) {
  return (
    /no (trove-finds|upgrades|artefacts)|no character upgrades|cannot buy upgrades|no relics or masteries/i.test(
      c.options || ''
    ) || /Jorogumo/.test(c.name)
  );
}

function upgWhy(e, c, wi) {
  const who = e[3],
    f = bldFac();
  if (charNoUpg(c)) return 'The ' + c.name + ' cannot take upgrades';
  if (/Warlord only/i.test(who) && bld.warlord !== wi) return 'Warlord only';
  if (/except Jorogumo/i.test(who) && /Jorogumo/.test(c.name)) return 'Not for Jorogumo';
  {
    const cm = who.match(/Cult of (\w+)/);
    if (cm && bld.fac === "W'adrhŭn") {
      const cu = wadWbCult(bld.wbs[wi]);
      if (cu !== cm[1]) return 'Cult of ' + cm[1] + ' characters only' + (cu ? '' : ' (choose its Cult)');
    }
  }
  const names = f.units
    .filter(u => u.kind === 'char')
    .map(u => u.name)
    .filter(n =>
      who
        .split(/,\s*|\s+or\s+|\s*\(/)
        .map(x => x.trim())
        .includes(n)
    );
  if (names.length && !names.includes(c.name)) return 'Only ' + names.join(', ');
  if (/Infantry characters/i.test(who) && c.type !== 'Infantry') return 'Infantry characters only';
  if (RIDE[e[1]] && rideOf(bld.wbs[wi] || {}) && !(bld.wbs[wi].upg || []).includes(e[1]))
    return 'Already rides a monster';
  const taken = RIDE_MULTI.test(e[1])
    ? -1
    : bld.wbs.findIndex((w, i) => i !== wi && (w.upg || []).includes(e[1]));
  if (taken >= 0) return 'Taken by warband ' + (taken + 1);
  return '';
}

function upgProblems(w, wi) {
  const c = bldUnit(w.char),
    out = [];
  if (!c) return out;
  const cats = {};
  (w.upg || []).forEach(n => {
    const e = upgFind(n);
    if (!e) return;
    const why = upgWhy(e, c, wi);
    if (why && !/^Taken/.test(why)) out.push(n + ': ' + why + '.');
    if (
      !UPG_MULTI.test(e[0]) &&
      !(e[0] === 'Crusading Bull' && holyCrusadeWb(w)) &&
      !/^(Spires|W'adrhŭn)$/.test(bld.fac)
    ) {
      const k = e[0].replace(/^Discipline.*/, 'Discipline');
      cats[k] = (cats[k] || 0) + 1;
    }
  });
  Object.entries(cats).forEach(([k, v]) => {
    if (v > 1) out.push(`More than one ${k} upgrade on the ${c.name}.`);
  });
  /* W'adrhŭn: a single Artefact (Cult Artefact, Armor or Weapon) and a single Mastery (a Teaching or a Way of the
     Speakers); a character with a Way of the Speakers may take one more Mastery. Brood of Omgorah bars the Speakers. */
  if (bld.fac === "W'adrhŭn") {
    const U = (w.upg || []).map(upgFind).filter(Boolean),
      art = U.filter(e => /^(Cult Artefact|Armor|Weapon)$/.test(e[0])).length,
      spk = U.filter(e => e[0] === 'Mastery').length,
      mas = U.filter(e => /^(Teaching|Mastery)$/.test(e[0])).length;
    if (art > 1) out.push(`The ${c.name} may take a single Artefact (has ${art}).`);
    if (mas > (spk ? 2 : 1))
      out.push(
        spk
          ? `With a Way of the Speakers the ${c.name} may take one more Mastery, no more (has ${mas}).`
          : `The ${c.name} may take a single Mastery (has ${mas}).`
      );
    if (spk && U.some(e => e[1] === 'Brood of Omgorah'))
      out.push('Brood of Omgorah: the character cannot take a Mastery from the Ways of the Speakers.');
  }
  /* Spires 2026: how many Apparatuses, Mutations and Eccentricities each character may take */
  if (bld.fac === 'Spires') {
    const U = (w.upg || []).map(upgFind).filter(Boolean),
      ame = U.filter(e => /^(Apparatus|Mutation|Eccentricity)$/.test(e[0])),
      app = U.filter(e => e[0] === 'Apparatus').length,
      me = U.filter(e => /^(Mutation|Eccentricity)$/.test(e[0])).length;
    if (/^(Pheromancer|Biomancer)$/.test(c.name) && ame.length > 2)
      out.push(
        `The ${c.name} may take up to 2 Apparatuses, Mutations or Eccentricities (has ${ame.length}).`
      );
    if (/^(High Clone Executor|Lineage Highborne|Lineage Prideborne|Merchant Prince)$/.test(c.name)) {
      if (app) out.push(`The ${c.name} cannot take Apparatuses.`);
      if (me > 2) out.push(`The ${c.name} may take up to 2 Mutations or Eccentricities (has ${me}).`);
    }
    if (c.name === 'Mimetic Assassin') {
      if (app) out.push('The Mimetic Assassin cannot take Apparatuses.');
      if (me > 1) out.push('The Mimetic Assassin may take a single Mutation or Eccentricity.');
    }
    if (
      U.some(e => e[1] === 'Infiltration Optimization Strain') &&
      U.some(e => e[1] === 'Marksman Optimization Strain')
    )
      out.push('Infiltration and Marksman Optimization Strain cannot be taken together.');
  }
  /* City States 2026: Bestowed Relics (Banner, Armor, Weapon, Inscription) per character, Modifications, one Mastery.
     Long Lineage lets the character take one more Character Upgrade. */
  if (bld.fac === 'City States') {
    const U = (w.upg || []).map(upgFind).filter(Boolean),
      extra = U.some(e => e[1] === 'Long Lineage') ? 1 : 0,
      relics = U.filter(e => /^(Banner|Armor|Weapon|Inscription)$/.test(e[0])).length,
      mods = U.filter(e => e[0] === 'Modification').length,
      mast = U.filter(e => /^Mastery/.test(e[0])).length,
      RL = { Polemarch: 2, Aristarch: 1, Ipparchos: 1, Mechanist: 1, 'Promethean Oracle': 0 }[c.name];
    if (RL != null) {
      const used = c.name === 'Mechanist' ? relics + mods : relics;
      if (used > RL + extra)
        out.push(
          `The ${c.name} may take ${RL + extra} ${c.name === 'Mechanist' ? 'Bestowed Relic or Modification' : 'Bestowed Relic'}${RL + extra === 1 ? '' : 's'}${extra ? ' (with Long Lineage)' : ''}; it has ${used}.`
        );
    }
    if (c.name === 'Eidolon' && mods > 3 + extra)
      out.push(`The Eidolon may take up to ${3 + extra} Modifications.`);
    if (mast > 1) out.push(`The ${c.name} may take one Mastery.`);
  }
  return out;
}
