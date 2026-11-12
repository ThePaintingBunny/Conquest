/* Main menu state. */
/* ---------- main menu, lobbies and the in-game menu ---------- */
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
