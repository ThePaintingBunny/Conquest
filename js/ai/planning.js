/*
 * Planning
 *
 * The opponent's plans: each activation is played step by step by the built-in opponent (botRun), a character's
 * own activation and the round's Command Stack come from its planners.
 *
 * In this file: planActivation(), planCharacter(), planRound()
 */

async function planActivation() {
  return { plan: [], narration: '', bot: true };
}

async function planCharacter(u) {
  return botPlanCharacter(u);
}

async function planRound() {
  return botPlanRound();
}
