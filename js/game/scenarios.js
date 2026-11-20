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
  const id = scenId();
  /* a scenario made in the Scenario builder travels with the game */
  if (typeof id === 'string' && id.startsWith('c:')) return scenCustom() || SCEN[7];
  return SCEN[id] || SCEN[7];
}

function markerUnits(id) {
  const sc = typeof id === 'string' ? scenCustom() || { markers: [] } : SCEN[id] || { markers: [] };
  return (sc.markers || []).map((m, i) => ({
    mvp: m.vp != null ? +m.vp : undefined,
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
  if (scenEdit) return sbZonesOf();
  return (state && state.zones) || scenOf().zones;
}
