/*
 * Army builder: the draft
 *
 * The army being built, saved in the browser, and lookups into the encyclopedia.
 *
 * In this file: BLDKEY, bldLoad(), bld, bldWho, bldStash, armyMode, bldSave(), bldUse(), bldFac(),
 *   bldUnit(), bldBase(), bnorm(), isChariot()
 */

const BLDKEY = { main: 'conquest-army-builder2', test: 'conquest-test-field-draft' };

function bldLoad(k) {
  try {
    const v = JSON.parse(localStorage.getItem(BLDKEY[k]) || 'null');
    if (v && Array.isArray(v.wbs)) return v;
  } catch (e) {}
  return { fac: '', wbs: [], warlord: 0 };
}

let bld = bldLoad('main'),
  bldWho = 'main',
  bldStash = {},
  armyMode = 'build';

function bldSave() {
  try {
    localStorage.setItem(BLDKEY[bldWho], JSON.stringify(bld));
  } catch (e) {}
}

/* the test field keeps its own builder draft, so it never touches the player's army */
function bldUse(k) {
  if (k === bldWho) return;
  bldStash[bldWho] = bld;
  bld = bldStash[k] || bldLoad(k);
  bldWho = k;
  abPick = null;
}

function bldFac() {
  return ENCY.find(f => f.name === bld.fac) || null;
}

function bldUnit(name) {
  const f = bldFac();
  return f && f.units.find(u => u.name === name);
}

function bldBase(u) {
  if (!u) return 1;
  const m = String(u.stands || '').match(/(\d+)\s*(?:double\s+)?stands?/i);
  return u.kind === 'char' || /^1 stand/.test(u.stands) ? 1 : m ? +m[1] : 3;
}

function bnorm(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[-–]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s\b/g, '');
}

function isChariot(u) {
  return u && /chariot/i.test(u.type);
}
