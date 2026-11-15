/*
 * Claude status
 *
 * Whether Claude is busy, its status line and its log.
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
