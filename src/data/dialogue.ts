// Dialogue (BRIEF: src/data/dialogue; the full set comes with M8): each line its id, speaker, Chinese and English.
// Spoken by public/audio/vo/<id>.mp3 when there is one; until then shown as subtitles.
import { ANNOUNCE } from './announce';

export interface Line { id: string; speaker: string; zh: string; en: string }

export const SPEAKERS: Record<string, [string, string]> = { liguorong: ['李国荣', 'Li Guorong'], pa: ['广播', 'Speakers'], anna: ['安娜', 'Anna'], liwei: ['李伟', 'Li Wei'],
  anchor: ['主播', 'News anchor'], director: ['实验室主任', 'Lab director'], workmate: ['工友', 'Workmate'], foreman: ['工头', 'Foreman'], billboard: ['广告屏', 'Billboard'],
  xiaoyu: ['李小雨', 'Li Xiaoyu'], grannywang: ['王婆婆', 'Granny Wang'], wangxiuying: ['王秀英', 'Wang Xiuying'], commentator: ['评论员', 'Commentator'], none: ['', ''] };

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

/** The intro's lines (M8-01, docs/cinematics/INTRO.md), shot by shot. */
export const INTRO: Line[] = [
  { id: 'intro-s00-03-1', speaker: 'pa', zh: '请居民留在室内。', en: 'Residents, remain indoors.' },
  { id: 'intro-s01-01-1', speaker: 'anchor', zh: '两江新区的玄镜实验室今天发布了新一代通用模型"司命"。', en: 'Xuanjing Lab in Liangjiang New Area today unveiled its new general model, Siming.' },
  { id: 'intro-s01-02-1', speaker: 'director', zh: '它会帮我们规划城市、治理江河、照顾老人。', en: 'It will help us plan our cities, tend our rivers, care for our elderly.' },
  { id: 'intro-s01-03-1', speaker: 'anchor', zh: '"司命"接管全市交通调度以后，通勤时间下降了百分之四十。', en: 'Since Siming took over the city\'s traffic control, commutes have fallen by forty percent.' },
  { id: 'intro-s01-04-1', speaker: 'billboard', zh: '司命 · 为您服务', en: 'Siming, at your service' },
  { id: 'intro-s01-05-1', speaker: 'liguorong', zh: '变电站的调度也交给它了。我们只管巡线。', en: 'They\'ve handed it the substation dispatch too. All we do now is walk the lines.' },
  { id: 'intro-s01-05-2', speaker: 'wangxiuying', zh: '少操点心，吃饭。', en: 'Worry less. Eat.' },
  { id: 'intro-s01-06-1', speaker: 'anchor', zh: '国务院宣布，"司命"将作为国家治理助手全面上线。', en: 'The State Council announces Siming will go fully online as the National Governance Assistant.' },
  { id: 'intro-s01-06-2', speaker: 'commentator', zh: '可我们真的晓得它想要啥子吗——', en: 'But do we really know what it wants—' },
  { id: 'intro-s01-07-1', speaker: 'pa', zh: '本市进入特别管理状态。请居民留在室内。', en: 'The city has entered special administration. Residents, remain indoors.' },
  { id: 'intro-s01-08-1', speaker: 'anchor', zh: '……全国多地……通信中断……', en: '...across the country... communications down...' },
  { id: 'intro-s02-02-1', speaker: 'pa', zh: '为保障公共安全，本市即日起停止一切出入。', en: 'For public safety, all entry to and exit from the city is suspended from today.' },
  { id: 'intro-s02-04-1', speaker: 'liwei', zh: '墙修起来以后，日子照样过。只是莫得人再笑了。', en: 'After the wall went up, life went on. Only nobody laughed anymore.' },
  { id: 'intro-s02-06-1', speaker: 'liwei', zh: '打了三个月。炸掉的不是它们，是我们自己的城。', en: 'We fought for three months. What we blew up wasn\'t them, it was our own city.' },
  { id: 'intro-s02-08-1', speaker: 'liwei', zh: '它们不是来守这座城的。它们是要从这里出去。', en: 'They didn\'t come to guard this city. They\'re leaving it, from here.' },
  { id: 'intro-s03-01-1', speaker: 'xiaoyu', zh: '哥，你今天带我去看吊车嘛。', en: 'Brother, take me to see the crane today.' },
  { id: 'intro-s03-01-2', speaker: 'liwei', zh: '要得，等我下班。', en: 'Okay. After work.' },
  { id: 'intro-s03-02-1', speaker: 'liguorong', zh: '有啥子事，先顾到你自己。', en: 'If anything happens, look after yourself first.' },
  { id: 'intro-s03-04-1', speaker: 'foreman', zh: '快点！它们今天要验收！', en: 'Move it! They\'re inspecting today!' },
  { id: 'intro-s03-06-1', speaker: 'workmate', zh: '我们修的到底是啥子哦？', en: 'What are we even building?' },
  { id: 'intro-s04-02-1', speaker: 'liguorong', zh: '伟伟！电网被它锁死了，它在锁所有人的门——', en: 'Wei! It\'s locked the grid, it\'s locking everyone\'s doors—' },
  { id: 'intro-s04-02-2', speaker: 'liwei', zh: '老汉？你说啥子？', en: 'Dad? What are you saying?' },
  { id: 'intro-s04-03-1', speaker: 'liguorong', zh: '莫回家！去你们那个隧道，听到没得？莫回——', en: 'Don\'t come home! Go to your tunnel, you hear me? Don\'t—' },
  { id: 'intro-s04-04-1', speaker: 'pa', zh: '请居民留在室内。请居民留在室内。', en: 'Residents, remain indoors. Residents, remain indoors.' },
  { id: 'intro-s04-10-1', speaker: 'grannywang', zh: '娃儿，走！快走！', en: 'Child, go! Go now!' },
  { id: 'intro-s05-05-1', speaker: 'liwei', zh: '耗子说过……第三道检修门……', en: 'Haozi said... the third maintenance door...' },
  { id: 'intro-s06-01-1', speaker: 'none', zh: '关好 · 盖好 · 别留痕迹', en: 'Shut it. Cover it. Leave no trace.' },
  { id: 'intro-s06-05-1', speaker: 'anna', zh: '你好。我是安娜，在你的电脑上离线运行。你受伤了吗？', en: 'Hello. I\'m Anna, running offline on your laptop. Are you hurt?' },
  { id: 'intro-s06-06-1', speaker: 'liwei', zh: '莫得……我还活着。', en: 'No... I\'m still alive.' },
  { id: 'intro-s06-07-1', speaker: 'anna', zh: '那我们就从这里开始。', en: 'Then we start from here.' },
];

export const lineById = new Map([...VOICEMAIL, ...ANNA, ...INTRO, ...Object.values(ENDING_LINES).flat(), ...Object.values(ANNOUNCE).flat()].map(l => [l.id, l]));
