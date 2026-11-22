/*
 * Claude reads army lists
 *
 * Converts a pasted army list (one not copied from the Para Bellum app) into regiments.
 *
 * In this file: UNIT_SCHEMA, convertList()
 */

const UNIT_SCHEMA = `{"faction":"<faction name>","armyRules":["<army-wide rules or abilities, short>"],"points":<total>,"units":[{
 "name":"<regiment name, add I/II to tell duplicates apart>","short":"<short name>","points":<n>,
 "cls":"<Light|Medium|Heavy> <Infantry|Cavalry|Brute|Monster|Chariot>","type":"inf|cav|brute|monster|chariot",
 "stands":<regiment stands including the command stand, NOT counting a character or auxiliary stand>,
 "M":n,"V":n,"C":n,"A":n,"W":n,"R":n,"D":n,"E":n,
 "rules":["Special rules exactly as named in the rules, with values: Shield, Impact (2), Cleave (1), Barrage (8) 14″, Armor Piercing (1), Flurry, Tenacious (1), Vanguard (3), Terrifying (1), Hardened (1), Support (2), Fearless, Automaton ..."],
 "abilities":[["<ability, option or Draw Event name>","<one-line effect>"]],
 "standardBearer":true|false,
 "auxiliary":null|{"name":"<e.g. a Minotaur stand>","stats":{"C":n,"A":n,"W":n},"rules":["..."]},
 "character":null|{"name":"<character name>","warlord":true|false,"stats":{"C":n,"A":n,"W":n,"R":n,"D":n,"E":n,"V":n},"rules":["Priest (6)" or "Wizard (5)" etc],
   "spells":[{"name":"<spell>","range":<inches>,"att":<attunement>,"targets":"friendly|enemy","scaling":false,"effect":"<short text added to the target for the round>","text":"<one line>"}]}
}]}`;

async function convertList(text, faction, pts) {
  /* a list copied from the Para Bellum app is read directly, no Claude needed */
  const direct = typeof pbToList === 'function' && pbToList(text);
  if (direct) return direct;
  const prompt = `Convert this Conquest: The Last Argument of Kings army list into JSON for a battle map. Use the official current rules and profiles for each regiment, character, upgrade and option as best you know them. Put options and upgrades into rules, abilities, auxiliary or character as appropriate; a character joins the regiment it leads (its Warband regiment of the same Type). Mark exactly one character as the warlord (the one the list names, or the first).\nFaction: ${faction || 'as stated in the list'}. Points: ${pts}.\nLIST:\n${text}\n\nReply with JSON only, in this shape:\n${UNIT_SCHEMA}`;
  const E = encyFor(text, faction);
  const ref = E.units.length
    ? `\nOfficial 2026 profiles for the units named in this list (use these numbers; a character's M comes from the regiment it joins):\n${E.units.map(encyBrief).join('\n')}\n`
    : '';
  return await sample.json(prompt.replace('\n\nReply with JSON only', ref + '\nReply with JSON only'), {
    modelTier: 'complex'
  });
}
