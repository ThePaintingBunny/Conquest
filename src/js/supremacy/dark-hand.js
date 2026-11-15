/*
 * Supremacy: Dark Hand of the Scholae
 *
 * The Eidolon marks an enemy regiment as Hunted.
 *
 * In this file: huntedOf(), setHunted(), darkHandBox(), darkHandAI(), supCharBox()
 */

/* Eidolon: Dark Hand of the Scholae (start of its activation): an enemy regiment is Hunted until destroyed */
function huntedOf(side) {
  const id = (state.hunted || {})[side],
    t = id && base(id);
  return t && !t.destroyed ? t : null;
}

function setHunted(side, id) {
  const t = base(id);
  return putState({
    hunted: Object.assign({}, state.hunted || {}, { [side]: id }),
    lastTitle: N(side) + ' · Dark Hand of the Scholae',
    lastText:
      (t ? t.short || t.name : id) +
      ' is Hunted: friendly Inquisitors in contact with it gain Terrifying (2).'
  });
}

function darkHandBox(u, box) {
  if (!/Eidolon/.test(u.charName || '')) return;
  const h = huntedOf(u.side);
  if (h) {
    box.appendChild(ptext('Dark Hand of the Scholae: ' + (h.short || h.name) + ' is Hunted.'));
    return;
  }
  const E = (state.units || []).filter(x => x.side !== u.side && srAlive(x));
  if (!E.length) return;
  const r = document.createElement('div');
  r.className = 'row';
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Hunted regiment');
  E.forEach(e => {
    const o = document.createElement('option');
    o.value = e.id;
    o.textContent = e.short || e.name;
    sel.appendChild(o);
  });
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = 'Mark as Hunted';
  b.onclick = () => setHunted(u.side, sel.value);
  r.append(sel, b);
  box.appendChild(
    ptext(
      'Dark Hand of the Scholae (start of activation, before Draw Events): choose an enemy regiment to be Hunted until it is destroyed.'
    )
  );
  box.appendChild(r);
}

async function darkHandAI(u) {
  if (!u || !/Eidolon/.test(u.charName || '') || huntedOf(u.side)) return;
  const E = (state.units || [])
    .filter(x => x.side !== u.side && srAlive(x))
    .sort((a, b) => (+b.points || 0) - (+a.points || 0));
  if (E[0]) await setHunted(u.side, E[0].id);
}

function supCharBox(u, box) {
  if (!charAct || !u) return;
  darkHandBox(u, box);
  const S = supOf(u.side);
  if (!S) return;
  if (S.k === 'Blasphemous Mesa' && srIsWl(u) && !charAct.mesaUsed) {
    const g = frG(u.side, 'od');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost';
    b.textContent = 'Blasphemous Mesa (Draw Event): spend 1 Dark Power for an extra spell';
    b.disabled = (+g.dark || 0) < 1;
    b.onclick = async () => {
      charAct.mesaUsed = true;
      charAct.mesa = true;
      await frSet(u.side, 'od', { dark: (+g.dark || 0) - 1 });
      toast('Blasphemous Mesa: one extra spell this activation (not the same one).');
      render();
    };
    box.appendChild(b);
  }
}
