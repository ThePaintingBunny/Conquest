/*
 * Faction colours
 *
 * One colour per faction, used for banner headers, edges and the pennants on the main menu. This is separate
 * from the army colour a player picks for their regiments on the board.
 *
 * In this file: FACTION_COLOR, facColor()
 */

/* dark enough for white text on top; the order is the order of the pennants on the main menu */
const FACTION_COLOR = {
  'Hundred Kingdoms': '#4b5f8a',
  Spires: '#7a6b30',
  Dweghom: '#8a4034',
  Nords: '#5c6d77',
  "W'adrhŭn": '#5f6b2f',
  'Old Dominion': '#5d4a78',
  'City States': '#2f6f73',
  'Sorcerer Kings': '#96591f',
  Yoroni: '#8c3f5e',
  'Weaver Courts': '#2f7d5c'
};

function facColor(name) {
  return FACTION_COLOR[name] || FACTION_COLOR[facOf(name)] || '#4a535c';
}
