/*
 * Icons
 *
 * A small set of line icons drawn in code, so they look the same on every device (text symbols such as ⚔ or
 * ⚙ are drawn differently by each system). They take the colour of the text around them.
 *
 * In this file: ICONS, ICON_FOR, icon(), iconButton()
 */

/* 24×24 outlines, drawn with a 1.8 px stroke */
const ICONS = {
  swords: 'M4 4l11 11 M13 18l5-5 M17 16l3 3 M20 4L9 15 M6 13l5 5 M7 17l-3 3',
  banner: 'M5 21V3 M5 4h12l-3 4 3 4H5',
  quill: 'M4 20l4-1L19 8l-3-3L5 16z M14 7l3 3',
  flask: 'M9 3h6 M10 3v6l-5 9.5A1.7 1.7 0 0 0 6.5 21h11a1.7 1.7 0 0 0 1.5-2.5L14 9V3 M7.5 15h9',
  scales: 'M12 4v16 M8 20h8 M5 7h14 M5 7l-3 6a3 3 0 0 0 6 0z M19 7l-3 6a3 3 0 0 0 6 0z',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M4 20.5V5.5 M8 7h8 M8 10.5h6',
  gear: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
  spark: 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z',
  play: 'M7 4l13 8-13 8z',
  ruler: 'M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2',
  arcs: 'M8 9h8v6H8z M8 9L3 4 M16 9l5-5 M8 15l-5 5 M16 15l5 5',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9z M12 11.5v1',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
  keys: 'M2.5 6.5h19v11h-19z M6.5 10.5h.01 M10 10.5h.01 M13.5 10.5h.01 M17 10.5h.01 M7 14h10',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  arrowR: 'M4 12h15 M13 6l6 6-6 6',
  back: 'M20 12H5 M11 6l-6 6 6 6',
  charge: 'M5 19L19 5 M13 5h6v6 M5 5l6 6',
  turn: 'M20 12a8 8 0 1 1-2.4-5.7 M20 4v5h-5',
  star: 'M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z',
  zoomIn: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z M15.5 15.5L20 20 M10.5 7.5v6 M7.5 10.5h6',
  zoomOut: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z M15.5 15.5L20 20 M7.5 10.5h6',
  /* main menu */
  person: 'M12 3.5a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4.5 21a7.5 7.5 0 0 1 15 0',
  people:
    'M9 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z M2.5 20.5a6.5 6.5 0 0 1 13 0 M16.5 5.5a3 3 0 1 1 0 6 M18 14a5.5 5.5 0 0 1 3.5 5.5',
  roster:
    'M9 3h6v3H9z M7 4.5H5v17h14v-17h-2 M8.5 11h.01 M11.5 11h4 M8.5 14.5h.01 M11.5 14.5h4 M8.5 18h.01 M11.5 18h4',
  field: 'M3 4h18v16H3z M3 12h2.5 M8.5 12h2.5 M13 12h2.5 M18.5 12H21 M7 6.5h6v3H7z M11 14.5h6v3h-6z',
  die: 'M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z M8.5 7.6a.9.9 0 1 0 0 1.8a.9.9 0 1 0 0-1.8z M15.5 7.6a.9.9 0 1 0 0 1.8a.9.9 0 1 0 0-1.8z M12 11.1a.9.9 0 1 0 0 1.8a.9.9 0 1 0 0-1.8z M8.5 14.6a.9.9 0 1 0 0 1.8a.9.9 0 1 0 0-1.8z M15.5 14.6a.9.9 0 1 0 0 1.8a.9.9 0 1 0 0-1.8z',
  openBook: 'M12 7C10 5.5 7 5 3 5.5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5v-13c-4-.5-7 0-9 1.5z M12 7v13'
};

/* the text symbols the game used before, and the icon that replaces each */
const ICON_FOR = {
  '⚔': 'person',
  '⚑': 'people',
  '✎': 'roster',
  '⚗': 'field',
  '⚖': 'die',
  '📖': 'openBook',
  '⚙': 'gear',
  '✦': 'spark',
  '▶': 'play'
};

function icon(name, size) {
  const d = ICONS[ICON_FOR[name] || name];
  if (!d) return null;
  const NSV = 'http://www.w3.org/2000/svg',
    s = document.createElementNS(NSV, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', String(size || 20));
  s.setAttribute('height', String(size || 20));
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'ico');
  /* inline size: page styles that stretch other SVGs to full width must not reach these */
  s.style.width = s.style.height = (size || 20) + 'px';
  s.style.minWidth = (size || 20) + 'px';
  const p = document.createElementNS(NSV, 'path');
  p.setAttribute('d', d);
  s.append(p);
  return s;
}

/* put an icon in front of a fixed button's label, replacing the text symbol it started with */
function iconButton(id, name) {
  const b = $(id);
  if (!b || b.querySelector('svg.ico')) return;
  const label = b.textContent.replace(/^[^A-Za-z0-9]+/, '').trim();
  b.textContent = '';
  const t = document.createElement('span');
  t.className = 'tl';
  t.textContent = label;
  b.append(icon(name, 18), t);
}

[
  ['ruler', 'ruler'],
  ['arcs-btn', 'arcs'],
  ['threat-btn', 'target'],
  ['leg-btn', 'map'],
  ['hk-btn', 'keys'],
  ['mm-open', 'menu'],
  ['set-open', 'gear']
].forEach(([id, n]) => iconButton(id, n));
