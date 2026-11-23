/*
 * Army builder: saved armies
 *
 * Saving and deleting armies in the browser. Loading is at the top of the builder and on its start screen.
 *
 * In this file: ARMKEY, abClearArm, armyList(), armySaveAll(), armyStore()
 */

/* saved armies (on this device) and clearing the builder */
const ARMKEY = 'conquest-saved-armies';

let abClearArm = false;

function armyList() {
  try {
    return JSON.parse(localStorage.getItem(ARMKEY) || '[]') || [];
  } catch (e) {
    return [];
  }
}

function armySaveAll(L) {
  try {
    localStorage.setItem(ARMKEY, JSON.stringify(L));
    return true;
  } catch (e) {
    toast('This browser would not save it.');
    return false;
  }
}

function armyStore() {
  const box = bEl('div', { className: 'ab-store' });
  const row = bEl('div', { className: 'ab-row' });
  const nm = bEl('input', {
    className: 'tf-in',
    type: 'text',
    placeholder: 'Army name',
    value: bld.name || ''
  });
  nm.id = 'ab-army-name';
  nm.setAttribute('aria-label', 'Army name');
  nm.maxLength = 60;
  nm.oninput = () => {
    bld.name = nm.value;
    bldSave();
  };
  row.append(
    nm,
    abBtn(
      'Save army',
      () => {
        if (!bld.wbs.length) {
          toast('Nothing to save yet.');
          return;
        }
        const n = (nm.value || '').trim() || (bld.fac || 'Army') + ' ' + new Date().toLocaleDateString();
        const A = armyList().filter(a => a.name !== n);
        A.unshift({
          name: n,
          fac: bld.fac,
          at: Date.now(),
          bld: JSON.parse(JSON.stringify(Object.assign({}, bld, { name: n })))
        });
        if (armySaveAll(A)) {
          bld.name = n;
          bldSave();
          toast('Saved “' + n + '” on this device.');
          abDraw();
        }
      },
      'ab-ghost'
    ),
    abBtn(
      abClearArm ? 'Tap again to clear' : 'Clear army',
      () => {
        if (!abClearArm) {
          abClearArm = true;
          abDraw();
          setTimeout(() => {
            abClearArm = false;
            abDraw();
          }, 4000);
          return;
        }
        abClearArm = false;
        bld = { fac: bld.fac, wbs: [], warlord: -1 };
        abPick = null;
        abRe();
      },
      'ab-ghost'
    )
  );
  box.append(row);
  return box;
}
