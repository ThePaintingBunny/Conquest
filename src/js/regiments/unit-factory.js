/*
 * Building regiments from an army list
 *
 * Turns army list entries into regiments on the table, using the encyclopedia profiles and veteran
 * upgrades.
 *
 * In this file: encyLookup(), vetBonus(), buildUnits()
 */

function encyLookup(fac, name) {
  const n = String(name || '')
    .replace(/\s+(I|II|III|IV|V|VI)$/, '')
    .toLowerCase()
    .replace(/[-\s]+/g, ' ')
    .replace(/s$/, '');
  const fs = ENCY.filter(f => !fac || facOf(fac) === f.name);
  for (const f of fs.length ? fs : ENCY) {
    const u = f.units.find(
      z =>
        z.name
          .toLowerCase()
          .replace(/[-\s]+/g, ' ')
          .replace(/s$/, '') === n
    );
    if (u) return u;
  }
  return null;
}

/* Veteran upgrades bought in the builder: their text is the bonus */
function vetBonus(d) {
  d = String(d || '').trim();
  let m;
  if ((m = d.match(/^([A-Z][A-Za-z ]+?)\s*\+(\d)$/))) return { r: [m[1] + ' (+' + m[2] + ')'] };
  if ((m = d.match(/^\+(\d)\s+(Clash|Attacks|Resolve|March)$/i)))
    return { s: { [{ clash: 'C', attacks: 'A', resolve: 'R', march: 'M' }[m[2].toLowerCase()]]: +m[1] } };
  if ((m = d.match(/^(.+?)\s+vs\.?\s+Volleys$/i))) return { r: [m[1] + ' against Volleys'] };
  return null;
}

function buildUnits(side, list) {
  const pre = side === 'cs' ? 'h' : 'a';
  const out = [];
  (list.units || []).forEach((x, i) => {
    const typ = ['inf', 'cav', 'brute', 'monster', 'chariot'].includes(x.type) ? x.type : 'inf';
    const stands = Math.max(1, Math.round(+x.stands || 1)),
      hasAux = !!(x.auxiliary && x.auxiliary.stats),
      ch0 = x.character && x.character.name ? x.character : null,
      hold = !!(ch0 && /Mimetic Assassin/.test(ch0.name)),
      ch = hold ? null : ch0,
      tot = stands + (hasAux ? 1 : 0) + (ch ? 1 : 0);
    /* a regiment on double Stands (Yoroni Oni Kishin: "2 double Stands with 1 Model on each"): each model is one
       Stand, two stands deep (2″ wide, 4″ deep), and counts as one Stand for every rule */
    const dbl =
      typ !== 'monster' && /\bdouble stands?\b/i.test((encyLookup(list.faction, x.name) || {}).stands || '');
    const sw = typ === 'monster' ? 4 : 2,
      sd = typ === 'monster' ? 4 : typ === 'chariot' || dbl ? 4 : 2,
      files = typ === 'monster' || typ === 'chariot' ? 1 : Math.min(tot, tot >= 4 ? (tot >= 8 ? 4 : 3) : tot);
    const rules = (x.rules || []).map(String);
    const vg = +((rules.join(', ').match(/Vanguard\s*\((\d+)\)/) || [])[1] || 0);
    const ref = encyLookup(list.faction, x.name);
    const u = {
      id: pre + '-' + (i + 1),
      side,
      name: String(x.name || 'Regiment ' + (i + 1)),
      short: String(x.short || x.name || '').slice(0, 24),
      cls: String(x.cls || 'Medium Infantry'),
      type: typ,
      m: +x.M || 5,
      vanguard: vg,
      sw,
      sd,
      dbl: dbl || undefined,
      stands: tot,
      files,
      cmd: files >= 3 ? 1 : 0,
      stats: {
        M: +x.M || 5,
        V: +x.V || 0,
        C: +x.C || 1,
        A: +x.A || 1,
        W: +x.W || 4,
        R: x.R == null || x.R === '–' ? '–' : +x.R,
        D: +x.D || 0,
        E: +x.E || 0
      },
      rules,
      abilities: (x.abilities || [])
        .filter(a => Array.isArray(a))
        .map(a => [String(a[0]), String(a[1] || '')]),
      fac: facOf(list.faction) || '',
      points: +x.points || 0,
      bearer: ref && ref.cmd ? !!ref.cmd.bearer : !!x.standardBearer,
      leader: ref && ref.cmd ? !!ref.cmd.leader : x.leader !== false,
      effects: [],
      wounds: 0,
      auxWounds: 0,
      activated: false,
      charActivated: false,
      onTable: false,
      arriving: false,
      x: 36,
      y: 24,
      facing: side === 'cs' ? 180 : 0
    };
    if (x.mods && x.modProfiles) {
      u.mods = x.mods.map(String);
      u.modProfiles = x.modProfiles;
    }
    /* the Trebuchet starts as its crew: one Infantry stand, March 8, without the engine's special rules */
    if (isTreb(u))
      Object.assign(u, {
        trebStage: 'crew',
        trebRules: u.rules,
        rules: [],
        sw: 2,
        sd: 2,
        files: 1,
        stands: 1,
        m: 8,
        stats: Object.assign({}, u.stats, { M: 8 })
      });
    if (x.wb != null) {
      u.wb = +x.wb;
      u.wbChar = String(x.wbChar || '');
    }
    if (x.vetRole) u.vetRole = true;
    if (x.cult) u.cult = String(x.cult);
    if (x.wbCourt) u.wbCourt = String(x.wbCourt);
    if (x.warlordMonster) u.warlordMonster = true;
    if (hold)
      u.assassinHold = {
        name: String(ch0.name),
        stats: ch0.stats || {},
        rules: (ch0.rules || []).map(String)
      };
    if (hasAux) {
      u.aux = 0;
      u.auxName = String(x.auxiliary.name || 'Auxiliary');
      u.auxStats = x.auxiliary.stats;
      u.auxRules = (x.auxiliary.rules || []).map(String);
      /* a pasted list may give the regiment's profile for its Auxiliary: use the army list's Auxiliary profile */
      {
        const AX = (ENCY.find(e => e.name === u.fac) || {}).auxiliaries || {},
          k = Object.keys(AX).find(n => u.auxName.toLowerCase().includes(n.toLowerCase().replace(/s$/, '')));
        if (k) {
          u.auxStats = Object.assign({}, AX[k].stats);
          u.auxRules = AX[k].rules.slice();
        }
      }
    }
    if (ch) {
      u.char = files >= 3 ? 2 : Math.min(files - 1, 1);
      u.charName = String(ch.name);
      u.charStats = ch.stats || {};
      u.charRules = (ch.rules || []).map(String);
      u.warlord = !!ch.warlord;
      if (ch.ally) u.dynAlly = true;
      if (ch.order) u.charOrder = String(ch.order);
      if (ch.court) u.charCourt = String(ch.court);
      u.spells = (ch.spells || [])
        .filter(s => s && s.name)
        .map(s => ({
          name: String(s.name),
          range: +s.range || 12,
          att: +s.att || 3,
          targets: s.targets === 'enemy' ? 'enemy' : 'friendly',
          scaling: !!s.scaling,
          effect: String(s.effect || s.name),
          text: String(s.text || '')
        }));
      if (
        typ === 'monster' &&
        (ch.rider || (ch.rules || []).includes('Rider') || (ch.upgrades || []).some(n => RIDE[n]))
      )
        u.rider = true;
    }
    applyOfficers(u);
    out.push(u);
  });
  return out;
}
