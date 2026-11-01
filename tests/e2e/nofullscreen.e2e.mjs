// U-059: clicking into the game captures the mouse but never makes the page fullscreen; leaving the page while playing
// asks first (Ctrl+W, crouching forward, would otherwise close the tab).
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'nofullscreen');
  await page.mouse.click(480, 270);
  await page.evaluate('window.__cq.runFrames(10)');
  const fs = await page.evaluate('!!document.fullscreenElement');
  if (fs) fail('nofullscreen', 'the page went fullscreen on its own');
  // The guard: a beforeunload while the mouse is captured is cancelled.
  const asked = await page.evaluate(`(() => { Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => document.body });
    const e = new Event('beforeunload', { cancelable: true }); dispatchEvent(e); delete document.pointerLockElement; return e.defaultPrevented; })()`);
  if (!asked) fail('nofullscreen', "leaving while playing doesn't ask");
  await page.close();
}
