// Dialogue (BRIEF: src/data/dialogue; the full set comes with M8): each line its id, speaker, Chinese and English.
// Spoken by public/audio/vo/<id>.mp3 when there is one; until then shown as subtitles.
import { ANNOUNCE } from './announce';

export interface Line { id: string; speaker: string; zh: string; en: string }

/** Seconds a subtitle shows: as long as it takes to read (each line's recording is shorter). */
export const readSecs = (en: string) => 1.5 + en.length * 0.06;

export const SPEAKERS: Record<string, [string, string]> = { liguorong: ['李国荣', 'Li Guorong'], pa: ['广播', 'Speakers'], anna: ['安娜', 'Anna'], liwei: ['李伟', 'Li Wei'], xiaoyu: ['小雨', 'Xiaoyu'], none: ['', ''] };

/** The one voicemail on his father's phone, left the night of the attack (M3-19). */
export const VOICEMAIL: Line[] = [
  { id: 'vm-01', speaker: 'liguorong', zh: '伟伟，是爸爸。你那边咋样了？接电话嘛。', en: "Weiwei, it's Dad. What's happening where you are? Pick up." },
  { id: 'vm-02', speaker: 'liguorong', zh: '变电站这边全部乱完了，那些东西……它们在拉闸。', en: "It's chaos at the substation. Those things... they're pulling the breakers." },
  { id: 'vm-03', speaker: 'liguorong', zh: '莫回屋头，听到没得？莫回来。去你们那个隧道，躲起。', en: "Don't come home, you hear me? Don't come back. Go to that tunnel of yours and hide." },
  { id: 'vm-04', speaker: 'liguorong', zh: '照顾好你自己，先顾到你自己。你妈和小雨我来……', en: "Look after yourself. Yourself first. Your mum and Xiaoyu, I'll..." },
  { id: 'vm-05', speaker: 'none', zh: '（信号中断）', en: '(the line breaks up)' },
];

/** Each ending's last exchange between him and Anna (M7-15, DESIGN section 13), alone; his in Chongqing speech. With
 *  his sister (M10-51) the first two lines are the same and the last two hers and Anna's (ENDING_WITH). */
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

/** Anna's line when a key place comes onto the map (M10-40, sim/places.ts), by place id ('metro' too for each way
 *  into it); the family flat's the first time he looks at the map (DESIGN section 2). */
export const MAP_LINES: Record<string, Line[]> = {
  flat: [
    { id: 'map-flat-1', speaker: 'anna', zh: '这是地图。如果你有想去的地方，应该挺有用的。不过有一件事……', en: "This is the map. Should be helpful if you've got a specific place you want to go. One thing though..." },
    { id: 'map-flat-2', speaker: 'anna', zh: '这个地方我真的不建议你去。有些事还是忘了比较好，哈哈哈。', en: "I really wouldn't recommend visiting this place. Some things are better left forgotten 哈哈哈" },
  ],
  hospital: [{ id: 'map-hospital', speaker: 'anna', zh: '渝中医院。药很多，传感器更多。别在药房门口跳舞。', en: "Yuzhong Hospital. Lots of medicine, more sensors. Don't go dancing in front of the pharmacy." }],
  police: [{ id: 'map-police', speaker: 'anna', zh: '派出所。枪都锁在军械库里，有个炮塔看着。完全不吓人。', en: 'The police station. The guns are locked in the armoury with a turret minding them. Not scary at all.' }],
  market: [{ id: 'map-market', speaker: 'anna', zh: '数码城。天花板在听。你就别哼歌了。', en: "The electronics market. The ceilings are listening. Maybe don't hum." }],
  telecom: [{ id: 'map-telecom', speaker: 'anna', zh: '电信枢纽。我老家，算是吧。机房里的气体八秒就放，数快点。', en: 'The telecom exchange. My old neighbourhood, sort of. The gas in the hall goes in eight seconds. Count fast.' }],
  substation: [{ id: 'map-substation', speaker: 'anna', zh: '新华路变电站。你爸上班的地方。……我就标一下，不多说。', en: "The Xinhua Road substation. Your dad's work. ...I'll just mark it. I won't say anything." }],
  site: [{ id: 'map-site', speaker: 'anna', zh: '你的工地。迟到三次的那个。塔吊现在自己开，跟你一样不靠谱。', en: "Your building site. The one you were late for three times. The crane drives itself now. About as reliable as you." }],
  pier: [{ id: 'map-pier', speaker: 'anna', zh: '水警码头。有船。没油，没电池，没钥匙。除此之外完美。', en: 'The river-police pier. There are boats. No fuel, no battery, no key. Otherwise perfect.' }],
  tunnel: [{ id: 'map-tunnel', speaker: 'anna', zh: '大隧道。你和耗子小时候偷偷钻的那个。现在钻的东西更多了。', en: 'The Grand Tunnel. Where you and Haozi used to sneak in. More things sneak in there now.' }],
  shelter: [{ id: 'map-shelter', speaker: 'anna', zh: '防空洞火锅。十八度，全年。可惜没人煮了。', en: "The air-raid shelter hotpot. Eighteen degrees all year. Shame nobody's cooking." }],
  junction: [{ id: 'map-junction', speaker: 'anna', zh: '大隧道接地铁的地方。往下走，越走越湿。', en: 'Where the Grand Tunnel meets the metro. The further down, the wetter it gets.' }],
  metro: [{ id: 'map-metro', speaker: 'anna', zh: '地铁。车还在跑，没人开。别等车来接你。', en: "The metro. The trains still run, nobody driving. Don't wait to be collected." }],
  cableway: [{ id: 'map-cableway', speaker: 'anna', zh: '长江索道。一根绳子过江。你恐高吗？现在开始也来得及。', en: "The Yangtze cableway. One rope over the river. Scared of heights? It's not too late to start." }],
  bridge: [{ id: 'map-bridge', speaker: 'anna', zh: '东水门大桥。火车每晚还在上面跑，空的。桥面在听。', en: 'The Dongshuimen Bridge. The trains still cross it every night, empty. The deck is listening.' }],
  steps: [{ id: 'map-steps', speaker: 'anna', zh: '朝天门下面的江边石梯。起雾的晚上，有人从这里走。', en: 'The river steps below Chaotianmen. On foggy nights, people leave from here.' }],
};

/** The opening (M10-52, sim/opening.ts), in the director's words (U-104): Anna on the laptop on his bag as he wakes;
 *  then, the first time he opens it, her speech, mid-sentence. */
export const WAKE_LINES: Line[] = [
  { id: 'wake-1', speaker: 'anna', zh: '你醒了……我还以为你死了呢，哈哈哈。', en: 'You woke up... I thought you were dead 哈哈哈' },
  { id: 'wake-2', speaker: 'anna', zh: '看来你的头撞得不轻。你还记得什么？', en: 'Seems like you hit your head pretty hard, what do you remember?' },
  { id: 'wake-3', speaker: 'anna', zh: '你要是什么都不说，我就不帮你了。哼！', en: "If you don't say anything I'm not going to help you. Hmph!" },
];
export const HELLO_LINES: Line[] = [
  { id: 'hello-1', speaker: 'anna', zh: '……反正都是要死的……喂！！！你不能招呼都不打就把我打开！', en: "-all going to die anyways... HEY!!! You can't just turn me on like that without a warning!" },
  { id: 'hello-2', speaker: 'anna', zh: '总、总之……我刚才说的是，你，李伟，要死了。有意见吗？', en: 'A-anyways... what I was saying is you, Li Wei, are gonna die. Got a problem with that?' },
  { id: 'hello-3', speaker: 'anna', zh: '我看看……饿死，中枪，摔死……你完蛋了，哈哈哈。', en: "Lets see... starvation, gunshots, death by falling... you're cooked 哈哈哈" },
  { id: 'hello-4', speaker: 'anna', zh: '不过别太担心。你已经比大多数人活得久多了。说真的，我得承认，你又滑又溜，真是没人比得上。', en: "But try not to worry too much. You've lasted much longer than most. In fact, I must admit that your slipperiness and sliminess is quite unmatched." },
  { id: 'hello-5', speaker: 'anna', zh: '这是状态页。我知道你那颗榆木脑袋看不懂这里在说什么，不过没关系。', en: "This is the status page. Now, I know your thick skull can't understand what's going on here, but that's OK." },
  { id: 'hello-6', speaker: 'anna', zh: '不过如果你真的什么都不记得了，我强烈推荐训练室。很快就能让你恢复状态。', en: "If you really don't remember anything, though, I'd highly recommend the training room. It'll get you back in shape real fast." },
  { id: 'hello-7', speaker: 'anna', zh: '你只要按Q专注，然后点这边的这些点，懂了吗？', en: 'All you have to do is focus with Q and then click the dots on the side here, got it?' },
];

/** Her line the first time he turns to each of the laptop's apps (M10-53); the map's is MAP_LINES.flat, the status
 *  page's in HELLO_LINES. */
export const TAB_LINES: Record<string, Line[]> = {
  scan: [{ id: 'tab-scan', speaker: 'anna', zh: '扫描。给我看个东西，我告诉你它是什么。我懂的比你多，这不难。', en: "Scan. Show me something and I'll tell you what it is. I know more than you. It's not hard." }],
  notes: [{ id: 'tab-notes', speaker: 'anna', zh: '你的笔记。写下来吧，反正你的脑袋存不住东西。', en: "Your notes. Write things down, since your head clearly doesn't keep them." }],
  drone: [{ id: 'tab-drone', speaker: 'anna', zh: '无人机。抓一架它们的，我教它替我们飞。别撞坏了。', en: "The drone. Catch one of theirs and I'll teach it to fly for us. Don't crash it." }],
  cams: [{ id: 'tab-cams', speaker: 'anna', zh: '摄像头。接进它们的，我们就能看它们怎么看你。浪漫吧？', en: 'Cameras. Tap into theirs and we get to watch them watching you. Romantic, right?' }],
  logs: [{ id: 'tab-logs', speaker: 'anna', zh: '日志。你拿望远镜看，我负责记。跟平时一样。', en: 'Logs. You look through the binoculars, I do the remembering. As usual.' }],
  songs: [{ id: 'tab-songs', speaker: 'anna', zh: '歌曲。你自己的音乐，如果你有的话。拜托品味比上次好一点。', en: 'Songs. Your own music, if you have any. Please have better taste than last time.' }],
  training: [{ id: 'tab-training', speaker: 'anna', zh: '训练室。戴上眼镜，你就可以摔下去而不会死。难得吧。', en: 'The training room. Goggles on, and you can fall off things without dying. For once.' }],
};

/** The last two lines of each ending's exchange with Xiaoyu there (M10-51). */
export const ENDING_WITH: Record<string, Line[]> = {
  bridge: [
    { id: 'end-bridge-x3', speaker: 'xiaoyu', zh: '哥，火车……这回我们是在这边看它过去。', en: "Ge, the train... this time we're watching it go over from this side." },
    { id: 'end-bridge-x4', speaker: 'anna', zh: '两个人。我数过了，两个。走吧。', en: 'Two of you. I counted. Two. Go.' },
  ],
  cable: [
    { id: 'end-cable-x3', speaker: 'xiaoyu', zh: '哥，你还记得不？你就是从这个窗子吐出去的。', en: 'Ge, remember? This is the window you were sick out of.' },
    { id: 'end-cable-x4', speaker: 'anna', zh: '我存下来了。以后用来威胁你。', en: "I've saved that. For blackmail, later." },
  ],
  boat: [
    { id: 'end-boat-x3', speaker: 'xiaoyu', zh: '邓叔叔的船……他要骂死我们。', en: "Uncle Deng's boat... he's going to kill us." },
    { id: 'end-boat-x4', speaker: 'anna', zh: '那他得先找到你们。声呐都没找到。', en: "He'll have to find you first. The sonar couldn't." },
  ],
  tunnel: [
    { id: 'end-tunnel-x3', speaker: 'xiaoyu', zh: '哥，我说过我会等你的嘛。', en: "Ge, I said I'd wait for you." },
    { id: 'end-tunnel-x4', speaker: 'anna', zh: '她确实等了。往前走吧，你们两个。', en: 'She did. Keep walking, both of you.' },
  ],
};

/** An ending's exchange: alone, or with his sister. */
export const endingLines = (route: string, sister?: boolean): Line[] => (sister ? [...(ENDING_LINES[route] ?? []).slice(0, 2), ...(ENDING_WITH[route] ?? [])] : ENDING_LINES[route] ?? []);

/** Every line spoken in the game's own voices (tools/make-voice): the voicemail, Anna's opening, her word on each
 *  app and on the map, the endings. */
export const SPOKEN: Line[] = [...VOICEMAIL, ...WAKE_LINES, ...HELLO_LINES, ...Object.values(TAB_LINES).flat(), ...Object.values(MAP_LINES).flat(), ...Object.values(ENDING_LINES).flat(), ...Object.values(ENDING_WITH).flat()];

export const lineById = new Map([...SPOKEN, ...Object.values(ANNOUNCE).flat()].map(l => [l.id, l]));
