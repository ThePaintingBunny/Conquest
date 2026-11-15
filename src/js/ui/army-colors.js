/*
 * Army colours
 *
 * The colour palette, each side's chosen colour and the colour picker.
 *
 * In this file: PAL, COL, colId(), colName(), applyColors(), setColor(), colorPicker()
 */

const PAL = {
  red: { name: 'Red', fill: '#9A3328', light: '#C9655A', edge: '#8E2F2F', ui: '#D0675B' },
  blue: { name: 'Blue', fill: '#2C5A8E', light: '#5E8BC0', edge: '#2F578E', ui: '#6E9BD3' },
  green: { name: 'Green', fill: '#2F6B3A', light: '#6E9E72', edge: '#2A5F34', ui: '#6FB57A' },
  purple: { name: 'Purple', fill: '#5B3A8C', light: '#8C70B8', edge: '#523480', ui: '#A58BD6' },
  gold: { name: 'Gold', fill: '#946414', light: '#C79A4A', edge: '#87590F', ui: '#D9A74A' },
  teal: { name: 'Teal', fill: '#1F6E73', light: '#5C9EA2', edge: '#1B6368', ui: '#5DB5BA' },
  orange: { name: 'Orange', fill: '#B0501A', light: '#D98A5A', edge: '#A04716', ui: '#E38A5B' },
  black: { name: 'Black', fill: '#2E3438', light: '#687176', edge: '#25292C', ui: '#9AA3A8' }
};

const COL = { cs: Object.assign({}, PAL.red), nord: Object.assign({}, PAL.blue) };

function colId(side) {
  const c = (state && state.colors) || {};
  const id = c[side] || (side === 'cs' ? 'red' : 'blue');
  return PAL[id] ? id : side === 'cs' ? 'red' : 'blue';
}

function colName(side) {
  return PAL[colId(side)].name.toLowerCase();
}

function applyColors() {
  ['cs', 'nord'].forEach(sd => Object.assign(COL[sd], PAL[colId(sd)]));
  let st = document.getElementById('side-colors');
  if (!st) {
    st = document.createElement('style');
    st.id = 'side-colors';
    document.head.appendChild(st);
  }
  const D = `--cs:${COL.cs.ui};--nord:${COL.nord.ui};`,
    L = document.documentElement.dataset.ui === 'steel' ? D : `--cs:${COL.cs.fill};--nord:${COL.nord.fill};`;
  const css = `:root,:root[data-ui]{${L}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${D}}}:root[data-theme="dark"]{${D}}`;
  if (st.textContent !== css) st.textContent = css;
  const et = $('edge-top'),
    eb = $('edge-bot');
  if (et) et.setAttribute('fill', (FLIP ? COL.cs : COL.nord).edge);
  if (eb) eb.setAttribute('fill', (FLIP ? COL.nord : COL.cs).edge);
  const ly = $('leg-you'),
    lt2 = $('leg-them');
  if (ly) ly.setAttribute('fill', COL[HU].fill);
  if (lt2) lt2.setAttribute('fill', COL[AI].fill);
}

async function setColor(side, id) {
  const c = Object.assign({ cs: colId('cs'), nord: colId('nord') }, state.colors || {});
  const o = side === 'cs' ? 'nord' : 'cs';
  if (c[o] === id) {
    toast('The other side already uses ' + PAL[id].name.toLowerCase() + '. Pick another colour.');
    return;
  }
  c[side] = id;
  await putState({ colors: c });
}

function colorPicker(side, label, editable) {
  const r = bEl('div', { className: 'col-pick' });
  r.setAttribute('role', 'group');
  r.setAttribute('aria-label', label);
  r.append(bEl('span', { className: 'tf-l', textContent: label }));
  const o = side === 'cs' ? 'nord' : 'cs',
    mine = colId(side),
    theirs = colId(o);
  Object.entries(PAL).forEach(([id, P]) => {
    const b = bEl('button', { type: 'button', className: 'col-sw' + (id === mine ? ' on' : '') });
    b.style.background = P.fill;
    b.title = P.name + (id === theirs ? ' (taken by the other side)' : '');
    b.setAttribute('aria-label', P.name + (id === theirs ? ', taken' : ''));
    b.setAttribute('aria-pressed', String(id === mine));
    b.disabled = !editable || id === theirs;
    if (id === theirs) b.classList.add('taken');
    b.onclick = () => {
      if (id !== mine) setColor(side, id);
    };
    r.append(b);
  });
  return r;
}
