// Anna's laptop on screen (M5-01, M5-02, DESIGN section 12): over the view, the game going on behind it. A dim, dense,
// bilingual terminal: monospace, near-black, low amber and grey, box-drawn rules, no buttons. Its header (Anna, the
// battery, the hour), its pages along the top (Q E or ← → turn them, or a click when the pointer's free; a locked
// one is greyed and skipped, U-098), and the page.
import * as THREE from 'three';
import type { Game } from '../game';
import { clockText, daylight } from '../sim/clock';
import { night } from '../render/materials';
import { hideoutList } from '../sim/shelter';
import { SCAN } from '../sim/scan';
import { UNITS, ZONES, BREAKS, type UnitKind } from '../data/units';
import { UNIT_SCAN, USE, PARTS, BREAK_OF, BROKEN } from '../data/scan';
import { item } from '../data/items';
import { foodCheck } from '../sim/food';
import { compass } from '../sim/binoculars';
import { drawMap, mapKey, MAPV } from './lapmap';
import { Feed } from './feeds';
import { loopedTill } from '../sim/camtap';
import { FLIGHT } from '../sim/flight';
import { heightAt } from '../world/heightfield';
import { districtAt, DISTRICT_NAMES } from '../world/yuzhong/lots';

type Page = { id: string; zh: string; en: string; needs?: (g: Game) => [string, string] | null; draw: (g: Game) => string };
const has = (g: Game, id: string) => g.state.inv.pack.items.some(i => i.id === id);
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** What Anna says as he opens her, by how things stand. */
function remark(g: Game): [string, string] {
  const s = g.state, L = s.laptop!, hour = (s.time / 3600) % 24;
  if (L.charge < 0.15) return ['电量快没了。找个有电的地方。', "I'm nearly out of charge. Find somewhere with power."];
  if (daylight(s.time) < 0.5) return ['天黑了，屏幕会照亮你。别开太久。', "It's dark: the screen lights you up. Don't keep me open long."];
  if (hour < 9) return ['早。我在。', "Morning. I'm here."];
  return ['我在。需要什么？', "I'm here. What do you need?"];
}

/** A level as a bar of ten. */
const bar = (v: number) => '▮'.repeat(Math.round(Math.max(0, Math.min(1, v)) * 10)).padEnd(10, '▯');
/** His body (M5-03): health and wounds, and his needs, in both languages; each value on its row for the smoke test. */
function status(g: Game): string {
  const b = g.state.body, now = g.state.time;
  const row = (k: string, zh: string, en: string, v: string) => `<div class="lt-row" data-k="${k}"><span class="lt-k">${zh} ${en}</span><b>${v}</b></div>`;
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
  return now + (s.lastScan ? scanned(g, s.lastScan) : `<div>看着一样东西或一台机器两秒，我来认。<br><span>Look at a thing or a machine for two seconds and I'll tell you what it is.</span></div>`);
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
const camList = (g: Game) => { const p = g.state.player.pos, C = g.world.cameras; return [...(g.state.taps ?? [])].sort((a, b) => Math.hypot(C[a].x - p.x, C[a].z - p.z) - Math.hypot(C[b].x - p.x, C[b].z - p.z)); };
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

/** Her pages (DESIGN section 12): what's on each comes with the features that fill them. */
const PAGES: Page[] = [
  { id: 'status', zh: '状态', en: 'Status', draw: g => { const [zh, en] = remark(g); return `<div class="lt-anna">&gt; ${zh}<br><span>${en}</span></div>` + status(g); } },
  { id: 'scan', zh: '扫描', en: 'Scan', draw: g => scanPage(g) },
  { id: 'map', zh: '地图', en: 'Map', draw: g => `<div class="lt-map"></div>` + mapKey(g) },
  { id: 'logs', zh: '日志', en: 'Logs', needs: g => (has(g, 'binoculars') ? null : ['需要望远镜', 'needs binoculars']), draw: g => logsPage(g) },
  { id: 'cams', zh: '摄像头', en: 'Cams', needs: g => (has(g, 'cameratap') || g.state.taps?.length ? null : ['需要摄像头分接器', 'needs a camera tap']), draw: g => camsPage(g) },
  { id: 'drone', zh: '无人机', en: 'Drone', needs: g => (has(g, 'drone') ? null : ['需要一架缴获的无人机', 'needs a salvaged drone']), draw: g => dronePage(g) },
  { id: 'notes', zh: '笔记', en: 'Notes', draw: g => {
    const hs = hideoutList(g.state, g.world);
    return `<div class="lt-h">藏身处 Hideouts</div>` + (hs.length ? hs.map(h => `<div>${esc(h.zh)} ${esc(h.en)} · ${esc(h.place[0])} ${esc(h.place[1])} · ${Math.round(h.dist)} m</div>`).join('') : '<div><span>还没有。 None yet.</span></div>');
  } },
];

export class LaptopUI {
  readonly root: HTMLDivElement;
  private shown = '';
  page = 0;
  /** The screen's glow on what's round him, after dark. */
  private glow = new THREE.PointLight(0xffc98a, 0, 3, 2);
  /** The Map page's canvas, kept across redraws of the page. */
  private map = document.createElement('canvas');
  private frame = 0;
  /** The Cams page's feed, and which tapped camera it shows. */
  private feed = new Feed();
  cam = 0;

  constructor(private game: Game) {
    this.root = document.createElement('div');
    this.root.id = 'laptop';
    this.root.style.display = 'none';
    document.body.appendChild(this.root);
    this.flying.id = 'dronehud'; this.flying.style.display = 'none'; document.body.appendChild(this.flying);
    this.root.addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-page]'); if (t && !PAGES[Number(t.dataset.page)].needs?.(this.game)) { this.page = Number(t.dataset.page); this.shown = ''; } });
    this.map.width = MAPV.w; this.map.height = MAPV.h;
    this.glow.position.set(0, -0.25, -0.45);
    game.view.fp.cam.add(this.glow);
  }

  /** Her Scan page, when a scan's done. */
  showScan() { this.page = PAGES.findIndex(q => q.id === 'scan'); }

  /** ↑ ↓ and Enter on a page: on the Cams page the next tapped camera (+1) or the last (-1), and Enter (0) loops the
   *  one shown; on the Drone page Enter launches it (M5-11). */
  pageKey(by: number) {
    const id = PAGES[this.page].id, taps = camList(this.game);
    if (id === 'drone' && !by && !PAGES[this.page].needs?.(this.game)) { this.game.input.cmds.push({ c: 'act', name: 'launch' }); return; }
    if (id !== 'cams' || !taps.length) return;
    this.cam = Math.min(this.cam, taps.length - 1);
    if (by) this.cam = (this.cam + by + taps.length) % taps.length;
    else this.game.input.cmds.push({ c: 'act', name: 'loop', arg: taps[this.cam] });
  }

  /** The next page (+1) or the last (-1), round. */
  turn(by: number) {
    // (Past the pages it can't open yet: a greyed page isn't selectable, U-098.)
    for (let k = 1; k <= PAGES.length; k++) {
      const i = (((this.page + by * k) % PAGES.length) + PAGES.length) % PAGES.length;
      if (!PAGES[i].needs?.(this.game)) { this.page = i; return; }
    }
  }

  /** Flying the drone (M5-11): its battery, its height, whether it's being watched. */
  private flying = document.createElement('div');
  private flyShown = '';
  private flyHud() {
    const g = this.game, f = g.state.flight;
    const d = g.state.inv.pack.items.find(i => i.id === 'drone'), gy = f && g.world.ground ? heightAt(g.world.ground, f.x, f.z) : null;
    const html = f ? `无人机 DRONE · 电量 ${Math.round(d?.charge ?? 0)}% · 高 ${Math.round(f.y - (gy ?? g.state.player.pos.y))} m${f.seen > 0 ? ' · <b>被盯上 SPOTTED</b>' : ''} · L 返回 return` : '';
    if (html === this.flyShown) return;
    this.flyShown = html; this.flying.innerHTML = html; this.flying.style.display = f ? 'block' : 'none';
  }

  /** Every frame: shown while it's open, its header and page kept up to date. */
  update() {
    this.flyHud();
    const g = this.game, L = g.state.laptop, open = !!L?.open;
    this.glow.intensity = open ? 1.4 * night.k : 0;
    if (!open) { if (this.shown) { this.root.style.display = 'none'; this.shown = ''; } return; }
    const pct = Math.round(L!.charge * 100), P = PAGES[this.page], locked = P.needs?.(g);
    const tabs = PAGES.map((q, i) => { const n = q.needs?.(g); return `<span data-page="${i}" class="${i === this.page ? 'on' : ''}${n ? ' locked' : ''}"${n ? ` title="${n[0]} · ${n[1]}"` : ''}>${q.zh} ${q.en}</span>`; }).join('');
    const body = locked ? `<div class="lt-locked">锁定 · ${locked[0]}<br><span>Locked · ${locked[1]}</span></div>` : P.draw(g);
    const html = `<div class="lt-head"><span>安娜 ANNA</span><span>电量 ${bar(L!.charge)} ${pct}%</span><span>${clockText(g.state.time)}</span></div>` +
      `<div class="lt-tabs">${tabs}</div><div class="lt-body" data-on="${P.id}">${body}</div>` +
      `<div class="lt-foot">← → 翻页 pages · L 合上 close</div>`;
    const fresh = html !== this.shown;
    if (fresh) { this.root.innerHTML = html; this.root.style.display = 'block'; this.shown = html; }
    // The map, drawn into its place on the page a few times a second.
    if (P.id === 'map' && !locked) {
      const slot = this.root.querySelector('.lt-map');
      if (slot && this.map.parentElement !== slot) slot.appendChild(this.map);
      if (fresh || ++this.frame % 6 === 0) drawMap(this.map, g);
    }
    // The feed, a few times a second.
    if (P.id === 'cams' && !locked && g.state.taps?.length) {
      const slot = this.root.querySelector('.lt-feed'), taps = camList(g);
      if (slot && this.feed.canvas.parentElement !== slot) slot.appendChild(this.feed.canvas);
      if (fresh || ++this.frame % 12 === 0) this.feed.draw(g, taps[Math.min(this.cam, taps.length - 1)]);
    }
  }
}
