/*
 * Movement animation
 *
 * Timing helpers and the tweens that slide and wheel a regiment across the table.
 *
 * In this file: RM, sleep, drawUnitsFast(), ease(), animFrames(), tweenPose(), tweenWheel()
 */

const RM = (() => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
})();

const sleep = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 120) : ms));

function drawUnitsFast() {
  const ug = $('units');
  ug.innerHTML = '';
  all()
    .filter(u => u.onTable)
    .forEach(u => drawUnit(u, ug));
}

function ease(k) {
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

function animFrames(ms, fn) {
  if (RM || ms <= 0) {
    fn(1);
    return Promise.resolve();
  }
  const t0 = performance.now();
  return new Promise(res => {
    function st(now) {
      const k = Math.min(1, (now - t0) / ms);
      fn(ease(k));
      drawUnitsFast();
      if (k < 1) requestAnimationFrame(st);
      else res();
    }
    requestAnimationFrame(st);
  });
}

async function tweenPose(to, ms) {
  const fr = { x: act.pose.x, y: act.pose.y, facing: act.pose.facing || 0 },
    tf = to.facing ?? fr.facing,
    df = ((((tf - fr.facing) % 360) + 540) % 360) - 180;
  await animFrames(ms, e => {
    act.pose.x = fr.x + (to.x - fr.x) * e;
    act.pose.y = fr.y + (to.y - fr.y) * e;
    act.pose.facing = (((fr.facing + df * e) % 360) + 360) % 360;
  });
  Object.assign(act.pose, { x: to.x, y: to.y, facing: tf });
  render();
}

async function tweenWheel(S0, u, dir, deg, ms) {
  await animFrames(ms, e => {
    const p = wheelPose(S0, u, dir, deg * e);
    act.pose.x = p.x;
    act.pose.y = p.y;
    act.pose.facing = p.facing;
  });
}
