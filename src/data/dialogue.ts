// Dialogue (BRIEF: src/data/dialogue; the full set comes with M8): each line its id, speaker, Chinese and English.
// Spoken by public/audio/vo/<id>.mp3 when there is one; until then shown as subtitles.
import { ANNOUNCE } from './announce';

export interface Line { id: string; speaker: string; zh: string; en: string }

export const SPEAKERS: Record<string, [string, string]> = { liguorong: ['李国荣', 'Li Guorong'], pa: ['广播', 'Speakers'], anna: ['安娜', 'Anna'], liwei: ['李伟', 'Li Wei'], none: ['', ''] };

/** The one voicemail on his father's phone, left the night of the attack (M3-19). */
export const VOICEMAIL: Line[] = [
  { id: 'vm-01', speaker: 'liguorong', zh: '伟伟，是爸爸。你那边咋样了？接电话嘛。', en: "Weiwei, it's Dad. What's happening where you are? Pick up." },
  { id: 'vm-02', speaker: 'liguorong', zh: '变电站这边全部乱完了，那些东西……它们在拉闸。', en: "It's chaos at the substation. Those things... they're pulling the breakers." },
  { id: 'vm-03', speaker: 'liguorong', zh: '莫回屋头，听到没得？莫回来。去你们那个隧道，躲起。', en: "Don't come home, you hear me? Don't come back. Go to that tunnel of yours and hide." },
  { id: 'vm-04', speaker: 'liguorong', zh: '照顾好你自己，先顾到你自己。你妈和小雨我来……', en: "Look after yourself. Yourself first. Your mum and Xiaoyu, I'll..." },
  { id: 'vm-05', speaker: 'none', zh: '（信号中断）', en: '(the line breaks up)' },
];

/** Each ending's last exchange between him and Anna (M7-15, DESIGN section 13); his in Chongqing speech. */
export const ENDING_LINES: Record<string, Line[]> = {
  bridge: [
    { id: 'end-bridge-1', speaker: 'liwei', zh: '过来了……我们真的过来了哦。', en: "We're across... we're really across." },
    { id: 'end-bridge-2', speaker: 'anna', zh: '南岸。桥上的传感器还要两个小时才修好。走吧，别回头。', en: "The south bank. The bridge sensors won't be fixed for two hours. Go. Don't look back." },
    { id: 'end-bridge-3', speaker: 'liwei', zh: '雾太大了，看不到屋头了。', en: "The fog's too thick. I can't see home any more." },
    { id: 'end-bridge-4', speaker: 'anna', zh: '它还在那里。我们也还在。', en: "It's still there. And so are we." },
  ],
  cable: [
    { id: 'end-cable-1', speaker: 'anna', zh: '线路警报响了。它们知道了，但来不及了。', en: "The line alarm's going. They know, but it's too late." },
    { id: 'end-cable-2', speaker: 'liwei', zh: '上新街……我小时候跟我老汉坐过这个。', en: 'Shangxin Street. I rode this when I was little, with my dad.' },
    { id: 'end-cable-3', speaker: 'anna', zh: '他会为你骄傲的。', en: "He'd be proud of you." },
    { id: 'end-cable-4', speaker: 'liwei', zh: '莫说了。走嘛。', en: "Don't. Let's go." },
  ],
  boat: [
    { id: 'end-boat-1', speaker: 'anna', zh: '发动机别开。让江水带我们走。', en: 'Keep the engine off. Let the river take us.' },
    { id: 'end-boat-2', speaker: 'liwei', zh: '朝天门的灯……越来越小咯。', en: "Chaotianmen's lights... they're getting smaller." },
    { id: 'end-boat-3', speaker: 'anna', zh: '声呐没有听到我们。我们出来了，李伟。', en: "The sonar didn't hear us. We're out, Li Wei." },
    { id: 'end-boat-4', speaker: 'liwei', zh: '嗯。我们出来了噻。', en: "Yeah. We're out." },
  ],
  tunnel: [
    { id: 'end-tunnel-1', speaker: 'liwei', zh: '下雨了……外头在下雨。', en: "It's raining... it's raining outside." },
    { id: 'end-tunnel-2', speaker: 'anna', zh: '我们在墙外面。它们的网络到这里就断了。', en: "We're beyond the wall. Their network ends here." },
    { id: 'end-tunnel-3', speaker: 'liwei', zh: '耗子画的那个耗儿，我记得到。', en: "Haozi's chalk mouse. I'll remember it." },
    { id: 'end-tunnel-4', speaker: 'anna', zh: '我也会。往前走吧。', en: 'So will I. Keep walking.' },
  ],
};

export const lineById = new Map([...VOICEMAIL, ...Object.values(ENDING_LINES).flat(), ...Object.values(ANNOUNCE).flat()].map(l => [l.id, l]));
