/*
 * Opponent status
 *
 * Whether the opponent is busy, its status line and its log; and Claude (sample), used only to read pasted army
 * lists.
 *
 * In this file: sample, aiBusy, aiLog, logAI(), aiStatus()
 */

let sample = null,
  aiBusy = false,
  aiLog = null;

function logAI(t) {
  if (aiLog && t) aiLog.push(t);
}

function aiStatus(t) {
  $('ai-status').textContent = t || '';
}
