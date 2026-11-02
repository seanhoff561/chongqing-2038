// M8-02: a line said with no recording and no Mandarin voice in the browser: its subtitle alone, nothing breaks (no
// console errors: the harness fails on any).
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'voice');
  const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.body.lightBleed = 0; window.__cq.runFrames(5); window.__cq.runFrames(30);
    return { sub: document.querySelector('#hud .subs')?.textContent ?? '', voices: typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices().length : -1 }; })()`);
  if (!r.sub.includes('流血')) fail('voice', `Anna's line not shown: ${JSON.stringify(r)}`);
  await page.close();
}
