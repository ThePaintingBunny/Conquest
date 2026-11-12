/* Officers (Command Models bought for a regiment) and what each one does. */
const OFF = {
  Captain: {
    r: ['Vanguard (4)'],
    shareR: 12,
    t: 'Vanguard (4). The regiment may use the unmodified Resolve of a friendly character within 12″ (applied automatically). It may become Medium before the first Reinforcement Phase (set that yourself).'
  },
  'Shield Biter': { t: 'The Command Stand may Die Fighting! (applied automatically).' },
  Savage: { xclash: true, t: 'May make one additional Clash action each activation.' },
  Skald: { s: { R: 1 }, r: ['Bravery'], t: '+1 Resolve and Bravery.' },
  Thegn: { thegn: true, t: 'Always under one Tribal Tactic, chosen at its first activation.' },
  Andromachos: {
    cmdA: 2,
    strat: ['Flurry (Andromachos)'],
    t: 'Command Stand +2 Attacks. Activated from the Strategic Stack: Flurry for the whole regiment until the end of the round.'
  },
  Lochagos: {
    shareR: 18,
    t: 'May use the Resolve of a friendly character within 18″ (applied automatically). The Warlord’s Battlefield Orders/Tactics also reach it within 18″ (apply that yourself).'
  },
  Dorilates: {
    dori: true,
    strat: ['Relentless Blows (Dorilates)'],
    t: 'Charged successfully in its front: Inspired until the end of the round. Activated from the Strategic Stack: Relentless Blows until the end of the round.'
  },
  Aberration: { t: 'May add a second Chant Marker of its own cult.' },
  Hetairos: { r6: ['impact'], t: 'Re-rolls failed Hit rolls of 6 on Impact Attacks.' },
  'Profane Reliquary': { r: ['Aura of Death (1)'], t: 'Aura of Death (1).' },
  'Dark Cenotaph': { cenotaph: true, t: 'Using Memories of Old as a Draw Event adds 1 Dark Power token.' },
  Optio: { r: ['Vanguard (4)'], t: 'Vanguard (4).' },
  Armsmaster: { s: { C: 1 }, t: '+1 Clash.' },
  Drillmaster: { s: { A: 1 }, r: ['Vanguard (4)'], t: '+1 Attacks and Vanguard (4).' },
  Neophyte: { r: ['Devout', 'Regeneration (2)', 'Fearless'], t: 'Devout, Regeneration (2) and Fearless.' },
  'Null Mage': {
    r: ['Wizard (1)'],
    nullMage: true,
    t: 'Wizard (1). An enemy that fails a spell within 10″ takes 2 wounds on its regiment, no Morale (applied automatically).'
  },
  Servite: { s: { M: 1, R: 1 }, t: '+1 March and +1 Resolve.' },
  'Seasoned Veteran': { r: ['Hardened (1)'], t: 'Hardened (1).' },
  'Catabolic Node': {
    node: true,
    t: 'When this regiment declares a Clash (you are asked when you press Clash) or is destroyed, it may Detonate: every engaged enemy takes 1D6+4 Hits (one D6 for all) and this regiment takes Hits equal to the D6, no Morale Tests. The Node is then removed.'
  },
  'Ward Preceptor': {
    r: ['Tenacious (1)'],
    t: 'Tenacious (1). Once per round, after an enemy ends a move within 8″, a free 2″ March (move it yourself).'
  },
  'Assault Preceptor': {
    r6: ['clash', 'volley'],
    t: 'Re-rolls failed Hit rolls of 6 in Clashes and Volleys.'
  },
  'Herald of Fire': { r6: ['clash', 'volley', 'impact'], t: 'Re-rolls failed Hit rolls of 6.' },
  'Herald of Magma': { r: ['Linebreaker'], t: 'Linebreaker.' },
  'Herald of Stone': { r: ['Untouchable'], t: 'Untouchable.' },
  "Mnemancer's Apprentice": { r: ['Unyielding'], t: 'Unyielding.' },
  Flamecaster: {
    flame: true,
    t: 'Flamethrower: a Volley at a regiment touching its front; not in the same activation as a Clash.'
  }
};
