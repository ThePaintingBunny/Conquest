/*
 * Main menu: state
 *
 * Which menu page is open, whether a game is running, and moving between pages.
 *
 * In this file: mmPage, mmOverlay, mmLeaveArm, mmNet(), mmGameOn(), mmSetupStep(), mmCurrent(), mmGo(),
 *   mmStart()
 */

let mmPage = null,
  mmOverlay = false,
  mmLeaveArm = false;

function mmNet() {
  try {
    return window.__conquestNet || null;
  } catch (e) {
    return null;
  }
}

function mmGameOn() {
  return (
    !!state &&
    state.mode !== 'test' &&
    !['setup', 'review'].includes(state.step || 'activations') &&
    (state.units || []).length > 0
  );
}

function mmSetupStep() {
  return !!state && state.mode !== 'test' && ['setup', 'review'].includes(state.step || '');
}

/* which page shows: lobbies while armies are set up, the home menu otherwise (or as an overlay during a game) */
function mmCurrent() {
  if (!state) return null;
  if (mmOverlay) return mmPage && mmPage !== 'single' && mmPage !== 'multi' ? mmPage : 'home';
  if (mmSetupStep()) {
    if (mmPage) return mmPage;
    const n = mmNet();
    if (state.step === 'review') return PVP() ? 'multi' : 'single';
    if ((n && n.mode && n.mode !== 'local') || (PVP() && Object.values(state.seats || {}).some(Boolean)))
      return 'multi';
    return 'home';
  }
  return null;
}

function mmGo(p) {
  mmPage = p;
  render();
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {}
}

async function mmStart(kind) {
  mmOverlay = false;
  if (kind === 'test') {
    mmPage = null;
    await tfEnter();
    return;
  }
  const want = kind === 'multi' ? 'pvp' : 'ai';
  if (!mmSetupStep()) {
    await newGameNow();
  }
  if ((state.mode || 'ai') !== want) await putState({ mode: want });
  mmGo(kind);
}
