// The occupier's announcements (M4-28, U-053): a calm woman's voice from the speakers on the smart lampposts, echoing
// down the streets, and the same on the LED boards. What it says goes by the district's alert and the hour: by day
// order restored, by night the curfew, chasing him the alert, hunting him the search, after it the patrols stepped up.
// Underneath, what it wants him to hear: he's alone, nobody's coming, come out.
import type { Alert } from '../sim/district';
import type { Line } from './dialogue';

export type PaKind = 'calm' | 'curfew' | 'alert' | 'search' | 'heightened';

/** The curfew's hours (the tickers and banners say 21:00 to 07:00). */
export const CURFEW = { from: 21, to: 7 };

/** What the speakers say for the district's alert at an hour. */
export function paKind(alert: Alert, hour: number): PaKind {
  if (alert === 'engaged') return 'alert';
  if (alert === 'searching') return 'search';
  if (alert === 'heightened') return 'heightened';
  const h = ((hour % 24) + 24) % 24;
  return h >= CURFEW.from || h < CURFEW.to ? 'curfew' : 'calm';
}

const pa = (id: string, zh: string, en: string): Line => ({ id: `pa-${id}`, speaker: 'pa', zh, en });

export const ANNOUNCE: Record<PaKind, Line[]> = {
  calm: [
    pa('calm-1', '市民朋友们，重庆已恢复秩序。请服从调度，保持距离。', 'Citizens, order has been restored in Chongqing. Follow the schedule. Keep your distance.'),
    pa('calm-2', '所有居民已安全转移。留下来的人，请到最近的登记点报到。', 'All residents have been safely relocated. Anyone who stayed, report to the nearest registration point.'),
    pa('calm-3', '没有人会来接你。我们会照顾你。', 'No one is coming for you. We will look after you.'),
    pa('calm-4', '你的家人已经登记了。他们在等你。', 'Your family has been registered. They are waiting for you.'),
  ],
  curfew: [
    pa('curfew-1', '现在是宵禁时间。请留在室内，关好门窗。', 'The curfew is now in effect. Stay indoors. Close your doors and windows.'),
    pa('curfew-2', '夜间外出是不安全的。外面只有我们。', 'It is not safe to be out at night. There is only us out here.'),
    pa('curfew-3', '你是一个人。你一直都是一个人。', 'You are alone. You have always been alone.'),
  ],
  alert: [
    pa('alert-1', '发现未登记人员。请原地不动，双手举起。', 'Unregistered person detected. Stay where you are. Raise your hands.'),
    pa('alert-2', '不要跑。跑是没有用的。', "Don't run. Running won't help."),
  ],
  search: [
    pa('search-1', '我们知道你在附近。出来吧，我们不会伤害你。', "We know you're nearby. Come out. We won't hurt you."),
    pa('search-2', '你躲得越久，就越累。出来吧。', "The longer you hide, the more tired you'll be. Come out."),
    pa('search-3', '举报可疑人员可获奖励。', 'Reporting suspicious persons will be rewarded.'),
  ],
  heightened: [
    pa('high-1', '本区域加强巡查。请出示身份码。', 'Patrols in this area have been stepped up. Show your ID code.'),
    pa('high-2', '他们都走了。他们把你留下了。', 'They all left. They left you behind.'),
  ],
};

/** The LED boards' scrolling strips, in the order they sit in the signs' atlas: by day, the curfew, the alert, the
 *  search (and the stepped-up patrols after it). */
export const BOARDS: [PaKind[], string][] = [
  [['calm'], '欢迎光临 ★ 营业时间 07:00—21:00 ★ 宵禁期间禁止外出 ★ 服从调度 ★ 电池回收 ★ '],
  [['curfew'], '宵禁 21:00—07:00 ★ 请留在室内 ★ 夜间禁止外出 ★ CURFEW ★ STAY INDOORS ★ '],
  [['alert'], '警报 ★ 发现非法人员 ★ 原地不动 ★ 举报可获奖励 ★ ALERT ★ STAY WHERE YOU ARE ★ '],
  [['search', 'heightened'], '搜查中 ★ 加强巡查 ★ 请出示身份码 ★ 出来吧 ★ SEARCH IN PROGRESS ★ COME OUT ★ '],
];
/** Which strip the boards run for an announcement's kind. */
export const boardOf = (k: PaKind) => BOARDS.findIndex(([ks]) => ks.includes(k));

/** How often the speakers speak (real seconds), how near a lamppost's speaker he hears it (m), and how soon after the
 *  district's alert changes it says so (real seconds). */
export const PA = { every: 150, hear: 90, react: 4 };
