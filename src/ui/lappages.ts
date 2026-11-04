// The laptop's pages (DESIGN section 11): what each shows. Standing he turns through Map, Status, Scan and Notes;
// sitting at it (M10-13) every tab is his.
import type { Game } from '../game';
import { clockText } from '../sim/clock';
import { SCAN } from '../sim/scan';
import { UNITS, ZONES, BREAKS, type UnitKind } from '../data/units';
import { UNIT_SCAN, USE, PARTS, BREAK_OF, BROKEN } from '../data/scan';
import { item } from '../data/items';
import { foodCheck } from '../sim/food';
import { compass } from '../sim/binoculars';
import { mapKey } from './lapmap';
import { loopedTill } from '../sim/camtap';
import { FLIGHT } from '../sim/flight';
import { districtAt, DISTRICT_NAMES } from '../world/yuzhong/lots';

export type Page = { id: string; zh: string; en: string; needs?: (g: Game) => [string, string] | null; draw: (g: Game) => string };
const has = (g: Game, id: string) => g.state.inv.pack.items.some(i => i.id === id);
export const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** A level as a bar of ten. */
export const bar = (v: number) => '▮'.repeat(Math.round(Math.max(0, Math.min(1, v)) * 10)).padEnd(10, '▯');
/** How long till a time (game seconds), in days or hours. */
const till = (t: number, now: number) => { const h = Math.max(0, (t - now) / 3600); return h >= 36 ? [`${Math.round(h / 24)} 天`, `${Math.round(h / 24)} days`] : [`${Math.ceil(h)} 小时`, `${Math.ceil(h)} h`]; };

/** What a wound is and how it's treated (M10-15), for hovering it sitting: Chinese, then English. */
function tip(g: Game, k: string): string {
  const b = g.state.body, now = g.state.time;
  const t = (zh: string, en: string) => `${zh}&#10;${en}`;
  if (k === 'bleed') {
    if (b.heavyBleed && b.tourniquet) return t('止血带勒住了出血。急救包能真正处理好。', 'The tourniquet is holding the bleeding. A first-aid kit treats it properly.');
    if (b.heavyBleed) return t('大出血：不到两分钟就会死。用止血带止住（之后用急救包）。', 'Bleeding heavily: it kills in under two minutes. A tourniquet stops it (a first-aid kit after).');
    return t('伤口在流血，一分半钟左右会自己止住。绷带或急救包能马上止住。', 'A cut, bleeding a little: it clots in about a minute and a half. A bandage or a first-aid kit stops it now.');
  }
  if (k === 'leg') {
    const [hz, he] = till(b.legHealAt, now);
    if (b.leg === 'sprain') return t(`扭伤：跛行，不能冲刺，跳不远。${hz}后好。止痛药能压住四小时。`, `A sprain: he limps, can't sprint and jumps short. Healed in ${he}. Painkillers hide it for four hours.`);
    if (b.legSplint) return t(`骨折，已固定：像扭伤一样跛行，不能跳。${hz}后好。`, `Broken and splinted: he limps as with a sprain and can't jump. Healed in ${he}.`);
    return t('腿骨折：几乎走不动，不能跳，爬不高。用夹板固定，七天后好。', "A broken leg: he can hardly walk, can't jump or climb high. A splint sets it; then it heals in seven days.");
  }
  if (k === 'arm') {
    const [hz, he] = till(b.armHealAt, now);
    if (b.armSplint) return t(`手臂骨折，已固定：爬得慢。${hz}后好。`, `A broken arm, splinted: he climbs slowly. Healed in ${he}.`);
    return t('手臂骨折：抓不住，爬不了。用夹板固定，七天后好。', "A broken arm: he can't hang or climb. A splint sets it; then it heals in seven days.");
  }
  if (k === 'sick') { const [hz, he] = till(b.sickUntil, now); return t(`吃坏了或喝了脏水：会吐，掉水分。${hz}后自己好，多喝水。`, `Sick from bad food or water: he throws up and loses water. It passes in ${he}; drink.`); }
  const [hz, he] = till(b.painkillerUntil, now);
  return t(`止痛药起效：疼痛压住了，伤还没好。还有${hz}。`, `Painkillers working: the pain is hidden, not healed. ${he} left.`);
}

/** His body (M5-03): health and wounds, and his needs, in both languages; each value on its row for the smoke test.
 *  A wound, hovered sitting, says what it is and how it's treated (M10-15). */
function status(g: Game): string {
  const b = g.state.body, now = g.state.time;
  const hurt = (k: string) => (k === 'bleed' ? b.lightBleed >= 0 || b.heavyBleed : k === 'leg' ? b.leg !== 'ok' : k === 'arm' ? b.arm !== 'ok' : k === 'sick' ? now < b.sickUntil : k === 'pain');
  const row = (k: string, zh: string, en: string, v: string) => `<div class="lt-row${hurt(k) ? ' hurt' : ''}" data-k="${k}"${hurt(k) && g.state.laptop?.sit ? ` data-tip="${tip(g, k)}"` : ''}><span class="lt-k">${zh} ${en}</span><b>${v}</b></div>`;
  const bleed = b.heavyBleed ? (b.tourniquet ? '止血带 tourniquet on' : '大出血 bleeding heavily') : b.lightBleed >= 0 ? '流血 bleeding' : '无 none';
  const leg = b.leg === 'ok' ? '好 fine' : b.leg === 'sprain' ? '扭伤 sprained' : b.legSplint ? '骨折，已固定 broken, splinted' : '骨折 broken';
  const arm = b.arm === 'ok' ? '好 fine' : b.armSplint ? '骨折，已固定 broken, splinted' : '骨折 broken';
  return `<div class="lt-grid">` +
    row('hp', '健康', 'Health', `${bar(b.hp / 100)} ${Math.round(b.hp)}`) + row('bleed', '出血', 'Bleeding', bleed) + row('leg', '腿', 'Leg', leg) + row('arm', '手臂', 'Arm', arm) +
    row('satiety', '饱腹', 'Fed', `${bar(b.satiety / 100)} ${Math.round(b.satiety)}`) + row('hydration', '水分', 'Water', `${bar(b.hydration / 100)} ${Math.round(b.hydration)}`) +
    row('energy', '精力', 'Rest', `${bar(b.energy / 100)} ${Math.round(b.energy)}`) + row('sick', '病', 'Sick', now < b.sickUntil ? '生病 sick' : '无 no') +
    (now < b.painkillerUntil ? row('pain', '止痛药', 'Painkillers', '起效 working') : '') + `</div>`;
}

/** What she says of what she's scanned (M5-04): a machine's name and what to know of it; an item's name, what it is
 *  and its uses; food, its shelf life (M5-05). */
function scanned(g: Game, id: string): string {
  const [kind, key] = id.split(':');
  if (kind === 'unit') { const U = UNITS[key as UnitKind], [zh, en] = UNIT_SCAN[key as UnitKind]; return `<div class="lt-h">${U.zh} ${U.en}</div><div>${zh}<br><span>${en}</span></div>` + (g.state.weak?.[key as UnitKind] ? weakPoints(key as UnitKind) : ''); }
  const it = item(key), uses = (it.uses ?? []).map(u => USE[u]).filter(Boolean), s = g.state;
  // The food's date (M5-05), while that packet's about.
  const st = it.food ? [...s.inv.pack.items, ...s.dropped.map(d => d.stack)].find(x => x.uid === s.lastFood && x.id === key) : undefined, fc = st && foodCheck(s, st);
  return `<div class="lt-h">${it.zh} ${it.en}</div><div><span>${esc(it.desc)}</span></div>` + (uses.length ? `<div>用途 Uses: ${uses.map(([zh, en]) => `${zh} <span>${en}</span>`).join(' · ')}</div>` : '') +
    (fc ? `<div data-k="shelf">保质期 Shelf life: ${fc[0]} <span>${fc[1]}</span></div>` : '');
}
/** A kind's weak points (M5-12): each part, what it takes of a hit, and the damage there that breaks it and what that
 *  does; drawn as a box-ruled table. */
function weakPoints(k: UnitKind): string {
  const Z = ZONES[k], B = BREAKS[k] ?? {}, parts = Object.entries(Z).sort((a, b) => b[1] - a[1]);
  const rows = parts.map(([z, m]) => {
    const [zh, en] = PARTS[z] ?? [z, z], b = BREAK_OF[z], at = b ? B[b] : undefined, [bz, be] = b && at ? BROKEN[b] : ['', ''];
    return `<tr><td>${zh} <span>${en}</span></td><td>×${m}</td><td>${at ? `${at} → ${bz} <span>${be}</span>` : '—'}</td></tr>`;
  }).join('');
  return `<div class="lt-h" data-k="weak">弱点 Weak points · ${UNITS[k].hp} hp</div><table class="lt-weak"><tr><th>部位 Part</th><th>伤害 Hit</th><th>打坏 Breaks at</th></tr>${rows}</table>`;
}

/** The Scan page: how far along a scan is, and the last one. */
function scanPage(g: Game): string {
  const s = g.state, now = s.scan?.target && !s.scan.done ? `<div>扫描中 Scanning ${bar(s.scan.t / SCAN.secs)}</div>` : '';
  // Sitting (M10-15): anything in the backpack, picked to scan.
  const pack = s.laptop?.sit ? `<div class="lt-pick">${[...new Map(s.inv.pack.items.map(i => [i.id, i])).values()].map(i => { const d = item(i.id); return `<button data-scan="${i.uid}"${s.lastScan === `item:${i.id}` ? ' class="on"' : ''}>${d.zh} <span>${d.en}</span></button>`; }).join('')}</div>` : '';
  return pack + now + (s.lastScan ? scanned(g, s.lastScan) : `<div>看着一样东西或一台机器两秒，我来认。<br><span>Look at a thing or a machine for two seconds and I'll tell you what it is.</span></div>`);
}

/** The Logs page (M5-07): the latest sightings first, each its time, the machine, where and which way it went. */
function logsPage(g: Game): string {
  const L = g.state.sightings ?? [];
  if (!L.length) return `<div>用望远镜盯住一台机器三秒，我就记下来。<br><span>Hold the binoculars on a machine for three seconds and I'll log it.</span></div>`;
  const n = new Set(L.map(x => x.u)).size;
  return `<div class="lt-h" data-k="sightings">${L.length} 条记录，${n} 台机器 <span>${L.length} sightings of ${n} machines</span></div>` + L.slice(-12).reverse().map(x => {
    const U = UNITS[x.kind], [pz, pe] = DISTRICT_NAMES[districtAt(x.x, x.z).district] ?? ['渝中', 'Yuzhong'], [hz, he] = compass(x.head);
    return `<div>${clockText(x.t)} · ${U.zh} <span>${U.en}</span> · ${pz} <span>${pe}</span> · 往${hz} <span>heading ${he}</span></div>`;
  }).join('');
}

/** The Cams page (M5-09): the feed of the tapped camera chosen (↑ ↓), and whether it's looped (Enter loops it). */
/** His tapped cameras, nearest first. */
export const camList = (g: Game) => { const p = g.state.player.pos, C = g.world.cameras; return [...(g.state.taps ?? [])].sort((a, b) => Math.hypot(C[a].x - p.x, C[a].z - p.z) - Math.hypot(C[b].x - p.x, C[b].z - p.z)); };
function camsPage(g: Game): string {
  const taps = camList(g);
  if (!taps.length) return `<div>把分接器接到摄像头的接线盒上，就能看它的画面。<br><span>Clip a tap into a camera's junction box and you'll see its feed.</span></div>`;
  const i = Math.min(g.laptop.cam, taps.length - 1), cam = taps[i], till = loopedTill(g.state, cam), C = g.world.cameras[cam], U = UNITS[C.kind], p = g.state.player.pos;
  return `<div class="lt-feed"></div><div data-k="feed">${i + 1}/${taps.length} · ${U.zh} <span>${U.en}</span> #${cam} · ${Math.round(Math.hypot(C.x - p.x, C.z - p.z))} m · ` +
    (till ? `循环中，到 ${clockText(till)} <span>looped till ${clockText(till)}</span>` : `直播 <span>live</span> · Enter 循环 <span>loop it</span>`) + ` · ↑ ↓ <span>cameras</span></div>`;
}

/** The Drone page (M5-11): its battery, and Enter to fly it (with the controller). */
function dronePage(g: Game): string {
  const d = g.state.inv.pack.items.find(i => i.id === 'drone'), pct = Math.round(d?.charge ?? 100);
  if (!has(g, 'dronectl')) return `<div>还需要遥控器。<br><span>We need its controller too.</span></div>`;
  return `<div data-k="drone">电量 ${bar(pct / 100)} ${pct}% <span>battery · ${Math.round((pct / 100) * FLIGHT.battery / 60)} min</span></div>` +
    `<div>Enter 起飞 <span>launch</span> · 飞的时候：WASD，空格上升，C 下降，L 返回 <span>flying: WASD, Space up, C down, L to bring it back</span></div><div><span>它飞过的地方会画在地图上。被看到会被盯上，被打下来。 Where it flies fills in on the map. Machines can see it, and shoot it down.</span></div>`;
}

/** Every tab (DESIGN section 11): standing he turns through the first four; sitting at it, the launcher opens any. */
export const PAGES: (Page & { standing?: boolean })[] = [
  { id: 'map', zh: '地图', en: 'Map', standing: true, draw: g => `<div class="lt-map"></div>` + mapKey(g) },
  { id: 'status', zh: '状态', en: 'Status', standing: true, draw: g => status(g) },
  { id: 'scan', zh: '扫描', en: 'Scan', standing: true, draw: g => scanPage(g) },
  // (His own notes: written sitting, in the page's writing box; read standing: U-104.)
  { id: 'notes', zh: '笔记', en: 'Notes', standing: true, draw: g => (g.state.laptop?.sit ? '<div class="lt-write"></div>' : `<div class="lt-notes">${esc(g.state.notes ?? '')}</div>`) },
  { id: 'drone', zh: '无人机', en: 'Drone', needs: g => (has(g, 'drone') ? null : ['需要一架缴获的无人机', 'needs a salvaged drone']), draw: g => dronePage(g) },
  { id: 'cams', zh: '摄像头', en: 'Cams', needs: g => (has(g, 'cameratap') || g.state.taps?.length ? null : ['需要摄像头分接器', 'needs a camera tap']), draw: g => camsPage(g) },
  { id: 'logs', zh: '日志', en: 'Logs', needs: g => (has(g, 'binoculars') ? null : ['需要望远镜', 'needs binoculars']), draw: g => logsPage(g) },
  { id: 'songs', zh: '歌曲', en: 'Songs', needs: () => ['需要歌曲', 'needs some songs'], draw: () => '' },
  { id: 'training', zh: '训练室', en: 'Training Room', needs: () => ['需要训练地图', 'needs a training map'], draw: () => '' },
];
