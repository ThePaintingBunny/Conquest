/*
 * Planning
 *
 * Asks Claude for a plan for an activation, a character or the round, with a simple fallback plan.
 *
 * In this file: heuristicPlan(), planActivation(), planCharacter(), aiNotes, aiNote(), planRound()
 */

function heuristicPlan(u) {
  const plan = [];
  if (!u.onTable) {
    plan.push({ do: 'enter', edge: 'own', at: 36 });
    const z = zoneControl().find(z => z.holder !== AI) || zonesOf()[0];
    plan.push({ do: 'march', toward: 'zone:' + z.name });
    plan.push({ do: 'march', toward: 'zone:' + z.name });
    return plan;
  }
  const eng = engaged(u);
  if (eng.length) {
    if (!inspWhy(u)) plan.push({ do: 'inspire' });
    plan.push({ do: 'clash', target: eng[0].id });
    return plan;
  }
  const o = optionsFor(u),
    ch = (o.enemies || [])
      .filter(e => e.chargeNeedsRoll != null && e.chargeNeedsRoll <= 4)
      .sort((a, b) => a.chargeNeedsRoll - b.chargeNeedsRoll)[0];
  if (ch && !(u.arrivedRound === state.round)) {
    plan.push({ do: 'charge', target: ch.id });
    return plan;
  }
  const near = (o.enemies || []).sort((a, b) => a.distance - b.distance)[0];
  if (near && near.distance <= (u.m || 0) * 2 + 6) {
    plan.push({ do: 'march', toward: 'unit:' + near.id });
    const c2 = near.distance - (u.m || 0);
    if (c2 <= (u.m || 0) + 3) plan.push({ do: 'charge', target: near.id });
    else plan.push({ do: 'march', toward: 'unit:' + near.id });
    return plan;
  }
  const z = zoneControl()
    .filter(z => z.holder !== AI)
    .sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];
  if (z) plan.push({ do: 'march', toward: 'zone:' + z.name }, { do: 'march', toward: 'zone:' + z.name });
  return plan;
}

async function planActivation(u, source) {
  if (botOn()) return { plan: [], narration: '', by: 'bot', bot: true };
  const brief = {
    activeRegiment: u.id,
    source,
    prey: supPrey(AI)
      ? {
          id: supPrey(AI).id,
          note: 'The Big Game Hunt: your Clashes and Volleys against this regiment count as Inspired and Taking Aim'
        }
      : undefined,
    spells: regCaster(u)
      ? spellsOf(u, false).map(s => ({
          name: s.name,
          range: s.range || 'Self',
          attunement: s.att,
          scaling: s.scaling,
          free: !!regCaster(u).free,
          targets: spellTargets(u, s).map(t => t.id),
          text: s.text
        }))
      : undefined,
    magicLevel: regCaster(u) ? magicLevel(u, false) : undefined,
    factionOptions: aiFacOpts(u),
    factionState: frFacs(AI).flatMap(f => frSummary(AI, f)),
    options: optionsFor(u),
    availableNow: u.onTable
      ? availableActions(u)
          .filter(a => !a.why)
          .map(a => a.type)
      : ['enter, then march'],
    arrivedThisRound: !u.onTable || u.arrivedRound === state.round
  };
  const prompt = `You are Claude, commanding the ${N(AI)} army against a human player's ${N(HU)} in a tabletop wargame. Choose this activation's actions.\n\n${RULES}\n\n${PLAN_SCHEMA}\n\nBOARD (JSON):\n${JSON.stringify(boardFor(u.id))}\n\nTHIS ACTIVATION (JSON):\n${JSON.stringify(brief)}\n\nThink like a strong player: concentrate force, hit flanks and rears, use charges whose needed roll is small, take or contest zones, and do not walk into enemy front arcs needlessly. Reply with the JSON object only.`;
  try {
    const r = await askJSON(prompt, 'default');
    if (r && Array.isArray(r.plan))
      return { plan: r.plan, narration: String(r.narration || ''), by: 'claude' };
  } catch (e) {
    if (e && e.code === 'not_granted')
      aiNote('Claude was not allowed to play, so the map used simple tactics.');
  }
  return { plan: [], narration: '', by: 'bot', bot: true };
}

async function planCharacter(u) {
  if (botOn()) return botPlanCharacter(u);
  const sp = spellsOf(u, true).filter(s => magicLevel(u, true) > 0 && spellTargets(u, s).length),
    AB = chAbil(u)
      .filter(a => !chWhy(u, a))
      .map(a => ({
        name: a.n,
        kind: a.kind === 'draw' ? 'draw event (free, before acting)' : 'action (uses the character action)',
        effect: a.d,
        targets: chTargets(u, a).map(t => t.id)
      }));
  {
    const DT = duelTargets(u);
    if (DT.length)
      AB.push({
        name: 'Duel',
        kind: 'action (uses the character action)',
        effect:
          'Challenge an enemy character in contact: both strike at once and wounds only hit the characters. The enemy may refuse (its regiment then cannot Seize, loses Inspiration and uses its lowest Resolve this round). Your odds per target (above 1 favours you): ' +
          DT.map(t => t.id + ' ' + duelOdds(u, t).toFixed(2)).join(', '),
        targets: DT.map(t => t.id)
      });
  }
  if ((!sp.length && !AB.length) || !u.onTable) return { char: 'pass' };
  if (AB.length) {
    const prompt = `You are Claude, commanding the ${N(AI)} army in Conquest: The Last Argument of Kings. Your character ${u.charName} (with ${u.name}) is activating. It may first use any of its Draw Events, then take ONE action: cast a spell, use an ability, or pass.\nSpells (Magic Level ${magicLevel(u, true)}; each success is a die at or under Attunement; 2 successes needed, more for Scaling spells on big regiments): ${JSON.stringify(sp.map(s => ({ name: s.name, range: s.range || 'Self', attunement: s.att, scaling: s.scaling, targets: spellTargets(u, s).map(t => t.id), text: s.text })))}\nAbilities: ${JSON.stringify(AB)}\nBOARD: ${JSON.stringify(boardFor(u.id))}\nReply with JSON only: {"draws":[{"ability":"<draw event name>","target":"<unit id>"}],"char":"pass"|"cast"|"ability","spell":"<name if cast>","ability":"<name if ability>","target":"<unit id>","narration":"one sentence"}.`;
    try {
      const r = await askJSON(prompt, 'default');
      if (r && r.char) return r;
    } catch (e) {}
    const dr = AB.filter(a => /draw/.test(a.kind)).map(a => ({ ability: a.name, target: a.targets[0] }));
    const bD = duelTargets(u).sort((a, b) => duelOdds(u, b) - duelOdds(u, a))[0];
    return bD && duelOdds(u, bD) >= 1.2
      ? { draws: dr, char: 'ability', ability: 'Duel', target: bD.id }
      : { draws: dr, char: 'pass' };
  }
  const prompt = `You are Claude, commanding the ${N(AI)} army in Conquest: The Last Argument of Kings. Your character ${u.charName} (with ${u.name}) is activating and may cast one spell or pass.\nSpells (Magic Level ${magicLevel(u, true)}; each success is a die at or under Attunement; 2 successes needed, more for Scaling spells on big regiments): ${JSON.stringify(sp.map(s => ({ name: s.name, range: s.range || 'Self', attunement: s.att, scaling: s.scaling, targets: spellTargets(u, s).map(t => t.id), text: s.text })))}\nBOARD: ${JSON.stringify(boardFor(u.id))}\nReply with JSON only: {"char":"pass"} or {"char":"cast","spell":"<name>","target":"<unit id>","narration":"one sentence"}.`;
  try {
    const r = await askJSON(prompt, 'default');
    if (r && r.char) return r;
  } catch (e) {}
  return { char: 'pass' };
}

let aiNotes = [];

function aiNote(t) {
  if (!aiNotes.includes(t)) aiNotes.push(t);
}

async function planRound() {
  if (botOn()) return botPlanRound();
  const cards = defaultStack();
  const prompt = `You are Claude, commanding the ${N(AI)} army in Conquest: The Last Argument of Kings, round ${state.round}. Arrange your Command Stack for this round: every card exactly once, top first. Cards are "u:<id>" for a regiment and "c:<id>" for the character attached to that regiment. A character card played right before its own regiment lets that regiment act straight after as its Entourage (it counts as a Strategic Stack activation and gains Inspired).\nYour cards: ${JSON.stringify(cards)}\n\n${RULES}\n\nBOARD: ${JSON.stringify(boardFor(null))}\n${frRoundOptions(AI).length ? 'Faction choices available now (pick by id; one per group such as soma/tactic/ritual/season/sect/creed; a Tribal Tactic is once per game, so save it for a decisive round): ' + JSON.stringify(frRoundOptions(AI).map(o => ({ id: o.id, choice: o.label }))) + '\n' : ''}${(() => {
    const S = supOf(AI);
    return S && S.can && !S.d.unknown
      ? `Your Warlord's Supremacy Ability ${S.k} can be activated this round (${S.d.every ? 'every round' : S.d.uses ? S.d.uses - S.used + ' uses left' : 'once per battle'}; the Warlord must be on the table): ${S.d.a} Set "supremacy" true to activate it this round, false to save it for a decisive moment.\n`
      : '';
  })()}Reply with JSON only: {"supremacy":true|false,"faction":["<choice id>",...],"stack":[...],"go_first_if_won":true|false,"effects":[{"unit":"<your unit id>","effect":"<a round-long effect your army rules grant, e.g. a chosen tactic; omit if none>"}],"intent":"one sentence on your plan for the round"}.`;
  try {
    const r = await askJSON(prompt, 'default');
    if (r && Array.isArray(r.stack)) {
      const st = r.stack.map(String).filter(c => cards.includes(c));
      cards.forEach(c => {
        if (!st.includes(c)) st.push(c);
      });
      aiLastPlanBy = 'claude';
      return {
        stack: st,
        first: r.go_first_if_won !== false,
        effects: Array.isArray(r.effects) ? r.effects : [],
        intent: String(r.intent || ''),
        faction: Array.isArray(r.faction) ? r.faction.map(String) : [],
        sup: typeof r.supremacy === 'boolean' ? r.supremacy : null
      };
    }
  } catch (e) {
    if (e && e.code === 'not_granted')
      aiNote('Claude was not allowed to play, so the map used simple tactics.');
  }
  aiLastPlanBy = '';
  return { stack: cards, first: true, effects: [], intent: '', faction: [] };
}
