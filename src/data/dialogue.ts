// Dialogue (BRIEF: src/data/dialogue; the full set comes with M8): each line its id, speaker, Chinese and English.
// Spoken by public/audio/vo/<id>.mp3 when there is one; until then shown as subtitles.
import { ANNOUNCE } from './announce';

export interface Line { id: string; speaker: string; zh: string; en: string }

export const SPEAKERS: Record<string, [string, string]> = { liguorong: ['李国荣', 'Li Guorong'], pa: ['广播', 'Speakers'], anna: ['安娜', 'Anna'], none: ['', ''] };

/** The one voicemail on his father's phone, left the night of the attack (M3-19). */
export const VOICEMAIL: Line[] = [
  { id: 'vm-01', speaker: 'liguorong', zh: '伟伟，是爸爸。你那边咋样了？接电话嘛。', en: "Weiwei, it's Dad. What's happening where you are? Pick up." },
  { id: 'vm-02', speaker: 'liguorong', zh: '变电站这边全部乱完了，那些东西……它们在拉闸。', en: "It's chaos at the substation. Those things... they're pulling the breakers." },
  { id: 'vm-03', speaker: 'liguorong', zh: '莫回屋头，听到没得？莫回来。去你们那个隧道，躲起。', en: "Don't come home, you hear me? Don't come back. Go to that tunnel of yours and hide." },
  { id: 'vm-04', speaker: 'liguorong', zh: '照顾好你自己，先顾到你自己。你妈和小雨我来……', en: "Look after yourself. Yourself first. Your mum and Xiaoyu, I'll..." },
  { id: 'vm-05', speaker: 'none', zh: '（信号中断）', en: '(the line breaks up)' },
];

/** Anna's remarks (M5-32): on what she's scanned, his injuries, her battery, drones the SDR hears near, a tag on him. */
export const ANNA: Line[] = [
  { id: 'anna-scan-unit', speaker: 'anna', zh: '认出来了。我把它记下了，看扫描页。', en: "Got it. I've noted it: see the Scan page." },
  { id: 'anna-scan-item', speaker: 'anna', zh: '这个我认识。用途在扫描页上。', en: 'I know this one. What it does is on the Scan page.' },
  { id: 'anna-hurt', speaker: 'anna', zh: '你受伤了。找个地方处理一下。', en: "You're hurt. Find somewhere to see to it." },
  { id: 'anna-bleed', speaker: 'anna', zh: '你在流血。先止血，别的等会儿。', en: "You're bleeding. Stop it first, everything else can wait." },
  { id: 'anna-break', speaker: 'anna', zh: '骨头断了。要夹板，不然走不远。', en: "That's broken. You need a splint or you won't get far." },
  { id: 'anna-battery', speaker: 'anna', zh: '我快没电了。找个有电的地方。', en: "I'm nearly flat. Find somewhere with power." },
  { id: 'anna-drone', speaker: 'anna', zh: '附近有无人机的信号。很近。', en: "A drone's signal, close by. Very close." },
  { id: 'anna-tag', speaker: 'anna', zh: '你身上有追踪器在叫。用接收器把它弄下来。', en: "There's a tracker chirping on you. Use the dongle to get it off." },
  { id: 'anna-tag-off', speaker: 'anna', zh: '好了，追踪器没了。', en: "That's it, the tracker's gone." },
];

export const lineById = new Map([...VOICEMAIL, ...ANNA, ...Object.values(ANNOUNCE).flat()].map(l => [l.id, l]));
