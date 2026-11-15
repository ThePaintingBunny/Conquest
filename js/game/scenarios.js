/*
 * Current scenario
 *
 * The scenario being played, its zones and its objective markers.
 *
 * In this file: scenId(), scenOf(), markerUnits(), isMarker(), zonesOf()
 */

function scenId() {
  return (state && state.scenario) || 7;
}

function scenOf() {
  return SCEN[scenId()] || SCEN[7];
}

function markerUnits(id) {
  return (SCEN[id].markers || []).map((m, i) => ({
    id: 'm-' + (i + 1),
    side: m.side,
    name: 'Objective Marker ' + m.name,
    short: 'Marker ' + m.name,
    type: 'marker',
    cls: 'Objective',
    stands: 1,
    files: 1,
    sw: 2,
    sd: 2,
    m: 0,
    stats: { M: 0, V: 0, C: 0, A: 0, W: 3, R: '–', D: 3, E: 0 },
    rules: [],
    abilities: [],
    effects: [],
    dmg: { cs: 0, nord: 0 },
    wounds: 0,
    onTable: true,
    x: m.x,
    y: m.y,
    facing: 0,
    activated: true,
    charActivated: true
  }));
}

function isMarker(u) {
  return u && u.type === 'marker';
}

function zonesOf() {
  return (state && state.zones) || scenOf().zones;
}
