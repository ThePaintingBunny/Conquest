/*
 * Opponent status
 *
 * Whether the opponent is busy, its status line and its log.
 *
 * In this file: aiBusy, aiLog, logAI(), aiStatus()
 */

let aiBusy = false,
  aiLog = null;

function logAI(t) {
  if (aiLog && t) aiLog.push(t);
}

function aiStatus(t) {
  $('ai-status').textContent = t || '';
}
