// Anna's remarks (M5-32, DESIGN section 12): a word, subtitled, when she's scanned something, when he's hurt (a bad
// hit, bleeding, a bone gone), when her battery's nearly flat, and when a tag's on him and
// when it's off. Each no more than once a minute. (No more word of every drone the SDR hears close: U-099.)
import type { SimState } from './types';
import { SCALE } from './clock';

/** Each trigger's line (data/dialogue.ts ANNA); the least seconds (real)
 *  between two of the same; what counts as a bad hit. */
export const REMARKS = {
  lines: { scanUnit: 'anna-scan-unit', scanItem: 'anna-scan-item', hurt: 'anna-hurt', bleed: 'anna-bleed', broken: 'anna-break', battery: 'anna-battery', tag: 'anna-tag', tagOff: 'anna-tag-off' },
  every: 60, hit: 15,
};
type Trigger = keyof typeof REMARKS.lines;

export function stepRemarks(s: SimState) {
  if (s.ended) return;
  const R = (s.remarks ??= { last: {}, hp: s.body.hp, bleed: false, leg: s.body.leg, tag: false, low: false });
  const say = (k: Trigger) => {
    if ((s.time - (R.last[k] ?? -Infinity)) / SCALE < REMARKS.every) return;
    R.last[k] = s.time;
    s.events.push({ t: 'say', id: REMARKS.lines[k] });
  };
  for (const e of s.events) if (e.t === 'scan') say(e.id.startsWith('unit:') ? 'scanUnit' : 'scanItem');
  const b = s.body, bleeding = b.heavyBleed || b.lightBleed >= 0;
  if (bleeding && !R.bleed) say('bleed');
  else if (b.leg === 'fracture' && R.leg !== 'fracture') say('broken');
  else if (R.hp - b.hp >= REMARKS.hit) say('hurt');
  R.bleed = bleeding; R.leg = b.leg; R.hp = b.hp;
  const low = !!s.laptop?.open && s.laptop.charge < 0.15;
  if (low && !R.low) say('battery');
  R.low = low;
  const sdr = s.inv.pack.items.some(i => i.id === 'sdr'), tag = !!s.player.tag;
  if (sdr && tag && !R.tag) say('tag');
  if (!tag && R.tag) say('tagOff');
  R.tag = tag;
}
