/* Command Cards and the Command Stack (including Yoroni Ideal Cards). */
/* cards */
function regCardLive(u) {
  return u.type !== 'marker' && !u.destroyed && (u.onTable || u.arriving) && !u.dyingFight;
}
function huStackOn() {
  const P = state && PS();
  return (
    !!P && Array.isArray(P.huStack) && P.huStack.length > 0 && (state.step || 'activations') === 'activations'
  );
}
function humanTop() {
  return huStackOn() ? validCards(PS().huStack)[0] || null : null;
}
function huHeldOk() {
  const P = state && PS();
  return !!(P && P.huHeld && cardOk(P.huHeld));
}
function cardName(c) {
  const u = base(c.slice(2));
  if (!u) return c;
  if (yCard(c)) {
    const k = cardIdeal(c);
    return (k || '?') + ' Ideal Card (from the ' + (c[0] === 'c' ? u.charName : u.short || u.name) + ')';
  }
  return c[0] === 'c' ? u.charName + ' (character with ' + (u.short || u.name) + ')' : u.name;
}
function sideCardsLeft(side) {
  return (state.units || [])
    .filter(u => u.side === side && regCardLive(u))
    .reduce((n, u) => n + (u.activated ? 0 : 1) + (u.charName && !u.charActivated ? 1 : 0), 0);
}
function humanCardsLeft() {
  if (huStackOn()) return validCards(PS().huStack).length + (huHeldOk() ? 1 : 0);
  return (state.units || [])
    .filter(u => u.side === HU && regCardLive(u))
    .reduce((n, u) => n + (u.activated ? 0 : 1) + (u.charName && !u.charActivated ? 1 : 0), 0);
}
function defaultHumanStack() {
  const mine = (state.units || []).filter(u => u.side === HU && regCardLive(u));
  const out = [];
  mine
    .sort((a, b) => (b.onTable ? 1 : 0) - (a.onTable ? 1 : 0))
    .forEach(u => {
      if (u.charName) out.push('c:' + u.id);
      out.push('u:' + u.id);
    });
  return out;
}
let huDraft = null;
async function popHuCard(card, extra) {
  if (!Array.isArray(PS().huStack)) return;
  const st = PS().huStack.filter(c => c !== card);
  if (PVP()) {
    await savePS({ huStack: st, huLastCard: card });
    await putState(extra || {});
    return;
  }
  await putState(Object.assign({ huStack: st, huLastCard: card }, extra || {}));
}
/* a regiment card can activate any regiment of the same type (not one whose card is in the Strategic Stack); a character card any character of the same name */
/* Command Cards are their own things: a card belongs to a regiment type (or character name), not to one regiment.
   It can activate any living regiment of that type that has not activated yet; a card whose own regiment died is used on another of the type. */
function cardOf(c) {
  return base(c.slice(2)) || null;
}
/* Yoroni: every card is an Ideal Card (the Ideal of the entry that brought it). ANY Ideal Card activates ANY Yoroni regiment or character that has not
   activated; the Ideal's effect is gained when it matches the regiment's (or its attached character's) Battlefield Role. */
const IDEALS = ['Ka', 'Chi', 'Fu', 'Sui', 'Mu'];
function yCard(c) {
  const o = c && cardOf(c);
  return !!o && frFac(o) === 'Yoroni';
}
function cardIdeal(c) {
  const o = c && cardOf(c);
  if (!o) return null;
  const asC = c[0] === 'c';
  if (asC && /Daimyo/.test(o.charName || o.charSlain || '')) return o.daimyoIdeal || 'Ka';
  const R = frRoles(o, asC);
  if (!asC && IDEALS.every(k => R.includes(k))) return supWlIdeal(o.side) || 'Ka';
  return IDEALS.find(k => R.includes(k)) || null;
}
function ySame(c, u, asChar) {
  if (
    !c ||
    !u ||
    !yCard(c) ||
    frFac(u) !== 'Yoroni' ||
    cardOf(c).side !== u.side ||
    !regCardLive(u) ||
    u.type === 'marker'
  )
    return false;
  return asChar ? !!u.charName && !u.charActivated : !u.activated;
}
function sameCard(c, u) {
  if (!c || !u) return false;
  const o = cardOf(c);
  if (!o || o.side !== u.side) return false;
  if (yCard(c)) return ySame(c, u, c[0] === 'c') || ySame(c, u, c[0] !== 'c');
  if (c[0] === 'u') return !u.activated && regCardLive(u) && u.type !== 'marker' && frBase(o) === frBase(u);
  return !!u.charName && !u.charActivated && regCardLive(u) && (o.charName || o.charSlain) === u.charName;
}
function cardAvail(c) {
  const o = cardOf(c);
  if (!o) return [];
  return (state.units || []).filter(u => sameCard(c, u));
}
function cardPick(c) {
  const A = cardAvail(c);
  const own = A.find(u => u.id === c.slice(2));
  return own || A[0] || null;
}
function cardKey(c) {
  const o = cardOf(c);
  if (!o) return c;
  if (yCard(c)) return 'y|' + o.side;
  return c[0] + '|' + o.side + '|' + (c[0] === 'u' ? frBase(o) : o.charName || o.charSlain);
}
function yCap(side) {
  return (state.units || [])
    .filter(u => u.side === side && frFac(u) === 'Yoroni' && regCardLive(u) && u.type !== 'marker')
    .reduce((n, u) => n + (u.activated ? 0 : 1) + (u.charName && !u.charActivated ? 1 : 0), 0);
}
function validCards(L) {
  const used = {};
  return (L || []).filter(c => {
    const k = cardKey(c),
      cap = yCard(c) ? yCap(cardOf(c).side) : cardAvail(c).length;
    used[k] = used[k] || 0;
    if (used[k] >= cap) return false;
    used[k]++;
    return true;
  });
}
function cardOk(c) {
  return cardAvail(c).length > 0;
}
function aiCardsLeft() {
  const st = validCards(state.aiStack || []);
  if (st.length) return st.length;
  return (state.units || [])
    .filter(u => u.side === AI && regCardLive(u))
    .reduce((n, u) => n + (u.activated ? 0 : 1) + (u.charName && !u.charActivated ? 1 : 0), 0);
}
function cardsTotal0(side) {
  return (state.units || [])
    .filter(u => u.side === side && regCardLive(u))
    .reduce((n, u) => n + 1 + (u.charName ? 1 : 0), 0);
}
/* Command Cards in each player's Command Stack this round (the Supremacy roll-off compares these) */
function cardsTotal(side) {
  if (!PVP()) {
    const P = PS() || {};
    const hs = Array.isArray(P.huStack) ? P.huStack.length + (P.huHeld ? 1 : 0) : null,
      as = Array.isArray(state.aiStack) ? state.aiStack.length : null;
    if (side === HU && hs) return hs;
    if (side === AI && as) return as;
  }
  return cardsTotal0(side);
}
function defaultStack() {
  const mine = (state.units || []).filter(u => u.side === AI && regCardLive(u)),
    enemies = all().filter(u => u.side === HU && u.onTable && !u.destroyed);
  const near = u => {
    if (!u.onTable) return 99;
    if (engaged(byId(u.id)).length) return -1;
    return Math.min(99, ...enemies.map(e => polyDist(corners(byId(u.id)), corners(e))));
  };
  const out = [];
  mine
    .slice()
    .sort((a, b) => near(a) - near(b))
    .forEach(u => {
      if (u.charName && !u.charActivated) out.push('c:' + u.id);
      if (!u.activated) out.push('u:' + u.id);
    });
  return out;
}
