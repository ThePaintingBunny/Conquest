/*
 * Who casts what
 *
 * A caster's spell school, known spells and magic level.
 *
 * In this file: casterKey(), spellSchool(), talentedSchool(), spellsOf(), magicLevel(), regCaster(),
 *   hasSpell()
 */

function casterKey(u, asChar) {
  const n = asChar ? u.charName : frBase(u);
  return CASTERS[n] ? n : null;
}

function spellSchool(u, asChar) {
  if (asChar && supK(u.side) === 'Omnipotence') {
    const w = supWl(u.side);
    if (w && w.id !== u.id && w.charName) return spellSchool(w, true);
  }
  const k = casterKey(u, asChar),
    C = CASTERS[k];
  if (!C || !C.sch) return null;
  const key = asChar ? 'cschool' : 'school';
  /* the Seanchas Sidhe knows the spells of the Court picked in the list */
  if (asChar && u.charCourt && C.sch[u.charCourt]) return u.charCourt;
  const v = u[key];
  if (v && C.sch[v]) return v;
  if (asChar && k && SK_COURTS === C.sch) {
    const r = frRoles(u, true).find(x => /^Court of/.test(x));
    if (r && C.sch[r.replace('Court of ', '')]) return r.replace('Court of ', '');
  }
  return Object.keys(C.sch)[0];
}

function talentedSchool(u, C, sc) {
  const ks = Object.keys(C.sch || {}).filter(k => k !== sc);
  return u.cschool2 && ks.includes(u.cschool2) ? u.cschool2 : ks[0] || null;
}

function spellsOf(u, asChar) {
  if (asChar && (u.spells || []).length && !casterKey(u, true)) return u.spells;
  const k = casterKey(u, asChar);
  if (!k) return asChar ? u.spells || [] : [];
  const C = CASTERS[k],
    sc = spellSchool(u, asChar);
  let names = (C.f || []).concat(sc ? C.sch[sc] : []);
  /* Talented (Hundred Kingdoms): a second School */
  const sc2 = asChar && upgOf(u, /Talented/) ? talentedSchool(u, C, sc) : null;
  if (sc2) names = names.concat(C.sch[sc2].filter(n => !names.includes(n)));
  return names
    .filter(n => SPELLDB[n])
    .map(n => {
      const S = SPELLDB[n];
      return {
        name: n,
        range: S.r,
        att: S.a,
        scaling: !!S.s,
        targets: S.t === 'enemy' ? 'enemy' : S.t === 'friend' ? 'friendly' : S.t,
        text: S.d,
        db: S
      };
    });
}

function magicLevel(u, asChar) {
  const k = casterKey(u, asChar);
  if (k && CASTERS[k].lvl === '2xstands') return Math.min(12, 2 * live(u));
  const R = asChar ? chRulesX(u) : RU(u);
  const L = rx(R || [], 'Priest') || rx(R || [], 'Wizard') || 0;
  /* Thaumaturge (Dweghom Mastery): Wizard (+1) per enemy regiment destroyed by its spells, at most +2 */
  return L && asChar ? L + Math.min(2, +u.thaum || 0) : L;
}

function regCaster(u) {
  const k = casterKey(u, false);
  if (!k || !CASTERS[k].reg) return null;
  /* Kheres and Moroi cast only while their Memory of Old is active */
  if (CASTERS[k].mem && !hasGrant(base(u.id) || u, 'Memories of Old')) return null;
  return CASTERS[k];
}

function hasSpell(t, name) {
  return (
    !!t && (t.temp || []).some(g => g.src === 'Spell: ' + name || g.src.startsWith('Spell: ' + name + ' ·'))
  );
}
