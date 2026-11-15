/*
 * Prompt data for Claude
 *
 * What Claude is told: each regiment in brief, its options, the rules summary, the board and the plan
 * format.
 *
 * In this file: unitBrief(), optionsFor(), RULES, PLAN_SCHEMA, askJSON(), boardFor(), encyFor(),
 *   encyBrief()
 */

function unitBrief(u, me) {
  const G = geom(u),
    S0 = u.stats || {},
    W = +S0.W || 4;
  return {
    id: u.id,
    side: u.side === AI ? 'yours' : 'enemy',
    name: u.name + (u.charName ? ' with ' + u.charName : ''),
    class: u.cls,
    type: u.type,
    M: u.m,
    stats: { C: S0.C, A: S0.A, V: S0.V, W: S0.W, R: S0.R, D: S0.D, E: S0.E },
    rules: u.rules || [],
    abilities: (u.abilities || []).map(a => a[0]),
    character: u.charName
      ? {
          name: u.charName,
          rules: u.charRules || [],
          activated: !!u.charActivated,
          spells: (u.spells || []).map(s => s.name)
        }
      : undefined,
    onTable: !!u.onTable,
    arrivingThisRound: !!(u.arriving && !u.onTable),
    activated: !!u.activated,
    stands: live(u),
    woundsOnNextStand: (u.wounds || 0) % W,
    broken: (u.effects || []).includes('Broken'),
    effects: u.effects || [],
    x: u.onTable ? +u.x.toFixed(1) : undefined,
    y: u.onTable ? +u.y.toFixed(1) : undefined,
    facing: u.onTable ? Math.round(u.facing || 0) : undefined,
    width: G.w,
    depth: G.d,
    files: G.files,
    engagedWith: u.onTable ? engaged(u).map(e => e.id) : []
  };
}

function optionsFor(u) {
  if (!u.onTable)
    return { note: 'Arriving: the first action must be a March onto the table from an entry edge.' };
  const en = all().filter(t => t.onTable && !t.destroyed && t.side !== u.side),
    A = corners(u),
    vr = volleyRange(u);
  return {
    enemies: en.map(t => {
      const d = polyDist(A, corners(t)),
        arc = frontArcHas(u, t),
        need = Math.max(1, Math.ceil(d - (u.m || 0) - 1e-6));
      return {
        id: t.id,
        distance: +d.toFixed(1),
        inFrontArc: arc,
        chargeNeedsRoll:
          arc && d <= chargeMax(u) ? (jugg(u) ? (d <= (u.m || 0) + 5 ? 0 : null) : need) : null,
        wouldHitTheir: arcOf(t, [u.x, u.y]),
        volleyInRange: !!(vr && arc && d <= vr.range)
      };
    }),
    zones: zonesOf().map(z => ({
      name: z.name,
      distance: +Math.max(0, Math.hypot(z.x - u.x, z.y - u.y)).toFixed(1),
      bearing: (() => {
        const df = angDiff(heading(u, z), u.facing || 0);
        return Math.abs(df) <= 45 ? 'ahead' : Math.abs(df) >= 135 ? 'behind' : df > 0 ? 'right' : 'left';
      })()
    }))
  };
}

const RULES = `Conquest: The Last Argument of Kings, quick reference.
- Table 72 x 48 inches. x runs west to east (0-72), y runs from YOUR edge (y=0) to the enemy edge (y=48). Facing is degrees clockwise from y+ (0 = toward the enemy edge, 90 = east, 180 = toward your own edge, 270 = west).
- Faction rules: use your army's faction options (listed per activation in factionOptions and per round in faction choices) and your characters' Draw Events and abilities (Pheromancy, Biomancy and similar) whenever they help.
- Terrain: Hindering terrain on a charge path removes Impact attacks; Dangerous/Perilous terrain wounds stands moving through; Water gives -1 Clash; Cover halves Volleys; Impassable and buildings block movement; Infantry can occupy buildings.
- Supremacy: your Warlord's Supremacy Ability may grant rules this round (shown as 'Supremacy: …' effects on your units).
- An activation has 2 actions (plus free ones). March and Reform may repeat; other actions may not. A failed Charge ends the activation.
- Unengaged actions: march (up to M inches; sideways/backward cost double; wheels allowed), reform (turn on the spot up to 180 degrees, change files), charge (target must be in the front arc and within M+6 inches; roll D6+M, needs at least the distance; not in the round a regiment arrives), volley (needs Barrage, target in front arc and range), aim, rally (if Broken).
- Engaged actions (in contact with an enemy): clash, combat_reform (turn to face an enemy that hit a flank), inspire (+1 Clash this activation), withdraw (Light/Medium only, costly), combat_rally (if Broken).
- A successful charge gives Inspired (+1 Clash) and triggers Impact attacks. Flank attacks make the defender re-roll passed Morale; rear attacks make every Morale test fail. Hitting an enemy's flank or rear is very valuable.
- Arriving regiments enter from your table edge (own: front edge on y=0, choose x) or a side edge (west x=0 / east x=72, choose y between 0 and your reinforcement line). Their first action must be a March.
- Seizing a zone: more stands in the zone AND more seizing value (Light 0, Medium/Heavy 1, Monster 3 per stand; Broken counts 0). Objective markers are attackable models (3 wounds, Defense 3) from round 2; you cannot attack your own. Victory points depend on the scenario in BOARD.`;

const PLAN_SCHEMA = `Reply with JSON only: {"plan":[steps],"narration":"1-2 short sentences, in the voice of a commander, saying what this regiment does and why"}.
Steps (in order, at most 2 non-free actions; an arriving regiment's FIRST step is "enter" and then a march):
{"do":"enter","edge":"own"|"west"|"east","at":<x for own edge, y for side edges>,"files":<stands in the front rank>}
{"do":"march","toward":"unit:<id>"|"zone:<name>"|{"x":n,"y":n}}  // wheels to face the point and moves forward as far as it legally can (stops 1 inch short of enemies)
{"do":"march","mode":"fwd"|"back"|"sleft"|"sright","amount":<inches>}
{"do":"reform","face":"unit:<id>"|"zone:<name>"|<degrees>,"files":<optional>}
{"do":"charge","target":"<enemy id>"}   // the page rolls the die, moves, and resolves Impacts
{"do":"clash","target":"<enemy id in contact, optional>"}
{"do":"volley","target":"<enemy id>"}
{"do":"inspire"} {"do":"aim"} {"do":"rally"} {"do":"combat_rally"} {"do":"combat_reform"} {"do":"withdraw"}
{"do":"cast","spell":"<spell name>","target":"<unit id>"}  // Spellcasting regiments only (see spells in THIS ACTIVATION); some casters cast for free
{"do":"memory"}  // Old Dominion Memories of Old as an action (if listed in availableNow)
{"do":"occupy"} {"do":"leave"}  // move into / out of a building (Garrison terrain); each ends the activation
{"do":"faction","option":"<exact text from factionOptions>"}  // faction rules and Draw Events (Chant, Ideal Card, Bloom, Strain Expression, Forged by the Elements, Memories of Old as a Draw Event, Elemental Conduit, Awaken...). Draw Events must come BEFORE the first action. Use them whenever they help; most are free.
Typical good play: march then charge when the charge roll needed is small; clash twice is not allowed, so engaged regiments usually inspire then clash; keep or take objective zones; protect your flanks.`;

async function askJSON(prompt, tier) {
  if (!sample) throw { code: 'unavailable' };
  return await sample.json(prompt, { modelTier: tier || 'default' });
}

function boardFor(activeId) {
  return {
    round: state.round,
    scenario: {
      name: scenOf().name,
      victoryConditions: scenOf()
        .vp.replace(/bottom player/g, 'enemy (bottom) player')
        .replace(/top player/g, 'your (top) side'),
      yourPick: (state.picks || {})[AI] || null
    },
    victoryPoints: { you: state.vp?.[AI] || 0, enemy: state.vp?.[HU] || 0 },
    yourArmy: N(AI),
    enemyArmy: N(HU),
    armyRules: { you: state.army?.[AI] || [], enemy: state.army?.[HU] || [] },
    reinforcementLine: state.rl?.[AI] ?? null,
    zones: zoneControl().map(z => ({
      name: z.name,
      x: z.x,
      y: z.y,
      diameter: z.size,
      friendlyTo: z.friendly ? (z.friendly === AI ? 'you' : 'enemy') : null,
      heldBy: z.holder ? (z.holder === AI ? 'you' : 'enemy') : 'nobody',
      stands: { you: z.tot[AI], enemy: z.tot[HU] }
    })),
    terrain: terrainOf().map(t => {
      const I = tInfo(t);
      return {
        type: I.name,
        size: I.size,
        rules: I.kw,
        x: t.x,
        y: t.y,
        halfWidth: t.rx,
        halfDepth: t.ry,
        occupiedBy: (all().find(o => o.garrison === tId(t)) || {}).id || undefined
      };
    }),
    units: (state.units || [])
      .filter(u => !u.destroyed && (u.onTable || u.arriving || u.id === activeId))
      .map(u => unitBrief(byId(u.id) || u))
  };
}

function encyFor(text, faction) {
  const t = enNorm(text),
    out = [];
  ENCY.forEach(f =>
    f.units.forEach(u => {
      const n = enNorm(u.name);
      if (n.length > 3 && t.includes(n)) out.push(Object.assign({ faction: f.name }, u));
    })
  );
  const ff = ENCY.find(
    f => faction && (enNorm(faction).includes(enNorm(f.name)) || enNorm(f.name).includes(enNorm(faction)))
  );
  return { units: out, faction: ff || null };
}

function encyBrief(u) {
  return `${u.name} (${u.faction || ''} ${u.kind === 'char' ? 'character' : 'regiment'}, ${[u.cls, u.type].join(' ').trim()}, ${u.pts ?? '?'} pts${u.extra != null ? ', +' + u.extra + '/stand' : ''}, ${u.stands}): ${['M', 'V', 'C', 'A', 'W', 'R', 'D', 'E'].map(k => k + u.stats[k]).join(' ')}; rules: ${u.rules.join(', ') || 'none'}${u.draw.length ? '; draw events: ' + u.draw.join(', ') : ''}${u.options ? '; options: ' + u.options : ''}${u.warband ? '; ' + (u.kind === 'char' ? 'warband: ' : '') + u.warband : ''}`;
}
