/*
 * Supremacy: extra spells
 *
 * Extra casts from Divinity Grace, Omnipotence, Forgemaster and similar.
 *
 * In this file: lastSpellSucc, srExtraCast(), srCharCast(), srAiExtra()
 */

/* character extra spells: Divinity Grace, Omnipotence (4+ successes), Forgemaster (once per round), Crop Rotation, The Spirit Shines (activated), Blasphemous Mesa (1 token) */
let lastSpellSucc = 0;

function srExtraCast(u, res) {
  if (charAct && res && res.success && lastSpellSucc >= 4 && upgOf(u, /Unholy Mastery/) && !charAct.um)
    return 'Unholy Mastery';
  const S = supOf(u.side);
  if (!S || !charAct) return '';
  const wl = srIsWl(u),
    R = srRnd(),
    n = (charAct.cast || []).length;
  if (S.k === 'Divinity Grace' && wl && n === 1) return 'Divinity Grace';
  if (S.k === 'Crop Rotation' && wl && n === 1) return 'Crop Rotation';
  if (S.k === 'Forgemaster' && wl && n === 1 && supMem(u.side).fgR !== R) return 'Forgemaster';
  if (S.k === 'Omnipotence' && res && res.success && lastSpellSucc >= 4 && !charAct.omni)
    return 'Omnipotence';
  if (
    supAct(u.side, 'The Spirit Shines') &&
    (frRoles(u, true).includes('Theist') || /Theist|Priest/.test(u.charName || '')) &&
    supMem(u.side).ssR !== R &&
    n === 1
  )
    return 'The Spirit Shines';
  if (charAct.mesa && n === 1) return 'Blasphemous Mesa';
  return '';
}

async function srCharCast(res) {
  if (!charAct) return;
  const u = byId(charAct.id);
  charAct.cast = (charAct.cast || []).concat(res.spell ? [res.spell] : []);
  charAct.notes = (charAct.notes || []).concat([
    (res.success ? 'Cast ' : 'Tried to cast ') + res.spell + ': ' + res.line
  ]);
  const why = srExtraCast(u, res);
  if (why) {
    if (why === 'Forgemaster') await putState({ sup: supMemo(u.side, { fgR: srRnd() }) });
    if (why === 'The Spirit Shines') {
      await putState({ sup: supMemo(u.side, { ssR: srRnd() }) });
      charAct.autoWin = true;
    }
    if (why === 'Omnipotence') charAct.omni = true;
    if (why === 'Unholy Mastery') charAct.um = true;
    if (why === 'Blasphemous Mesa') charAct.mesa = false;
    Object.assign(charAct, { spell: 0, target: null, rolls: null, done: false });
    toast(why + ': the ' + u.charName + ' may cast one more spell (not the same one).');
    render();
    return;
  }
  await charCommit(charAct.id, {
    spell: res.spell,
    target: res.success ? res.target : null,
    success: res.success,
    note: charAct.notes.join('. ') + '.'
  });
}

async function srAiExtra(u, first) {
  const why = (() => {
    const S = supOf(u.side);
    if (!S) return '';
    const wl = srIsWl(u);
    if (S.k === 'Divinity Grace' && wl) return 'x';
    if (S.k === 'Crop Rotation' && wl) return 'x';
    if (S.k === 'Forgemaster' && wl && supMem(u.side).fgR !== srRnd()) return 'fg';
    if (S.k === 'Omnipotence' && lastSpellSucc >= 4) return 'x';
    return '';
  })();
  if (!why) return '';
  if (why === 'fg') await putState({ sup: supMemo(u.side, { fgR: srRnd() }) });
  const sp = spellsOf(u, true).find(s => s.name !== first && spellTargets(u, s).length);
  if (!sp) return '';
  const r = await aiCastSpell(byId(u.id), true, sp.name, null);
  return r ? '; then ' + r : '';
}
