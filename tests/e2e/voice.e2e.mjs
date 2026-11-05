// M8-02, M10-09 (U-104): one of Anna's story lines said (her recording, or the browser's Mandarin voice if none): its
// English subtitle alone, and nothing breaks (no console errors: the harness fails on any).
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=1', 'voice');
  const r = await page.evaluate(`(() => { const g = window.__cq.game; window.__cq.say('end-bridge-4'); window.__cq.runFrames(30);
    return { sub: document.querySelector('#hud .subs')?.textContent ?? '', voices: typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices().length : -1 }; })()`);
  if (!r.sub.includes("It's still there")) fail('voice', `Anna's line not shown: ${JSON.stringify(r)}`);
  await page.close();
}
