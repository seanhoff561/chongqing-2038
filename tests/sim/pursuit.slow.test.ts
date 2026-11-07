// M4-32: escapes from three pursuits in the first district. A drone tailing him at the top of the Eighteen Stairs, a
// quadruped coming for him in Jiaochangkou's alleys, a camera that has him at Jiaochangkou: each time he's had (the
// district Engaged), deals with what's on his heels (the drone shot down, the dog blinded with a shot to its head), runs for the nearest door he can get to, in and up its stairs, into a wardrobe in a room off them,
// and waits there; the machines lose him, search, and give up (the district Heightened, or calm again) without finding him.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport, eyeOf } from '../../src/sim/player';
import { startPursuit, type Pursuer } from '../../src/sim/pursuit';
import { navPath } from '../../src/sim/nav';
import { unitPose } from '../../src/sim/units';
import { districtOf } from '../../src/sim/district';
import { scenarioByName } from '../../src/data/scenarios';
import { run, secs, LMB, RMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { enterHide } from '../../src/sim/hide';
import { aimAt } from '../../src/sim/damage';
import { GRATE, bagsId } from '../../src/sim/grate';
import { doorSolid } from '../../src/sim/doors';
import { TAG } from '../../src/data/units';
import { escapeRoute } from './difficulty';

const w = getWorld('yuzhong');

describe('pursuit escapes (M4-32)', () => {
  for (const name of ['pursuit-drone', 'pursuit-dog', 'pursuit-camera']) {
    it(`gets away from ${name.slice(8)}`, () => {
      const sc = scenarioByName(name)!, s = createState(1, w), tp = w.teleports.find(t => t.name === sc.at)!;
      s.time = sc.hour! * 3600; s.flags.god = true; s.weather = { fog: 0, rain: 0 }; s.flags.clear = true;
      teleport(s.player, tp.x, tp.y, tp.z);
      const u = startPursuit(s, w, sc.pursuit as Pursuer);
      expect(u, 'a pursuer near').not.toBeNull();
      // Had: the district on him.
      const d = () => s.hive.districts[districtOf(s.player.pos.x, s.player.pos.z)]?.state ?? 'unaware';
      for (let i = 0; i < secs(30) && d() !== 'engaged'; i++) run(s, w, 1);
      expect(d(), 'had').toBe('engaged');
      // A drone over him is shot down first (a rotor): it would see where he goes.
      if (sc.pursuit === 'drone') {
        addItem(s, s.inv.pack, 'pistol', 1, { charge: 15 });
        s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'pistol')!.uid; s.inv.held = 1;
        let fired = 0, last = '';
        const hits: string[] = [], fly = sc.pursuit === 'drone', done = () => (fly ? !!u!.crash || !!u!.dead : !!u!.blind);
        // (Fired only with it in his sights, nothing in between: since M5-35 a dog and a hunter close in as he aims. His
        // sights held on its middle against the kick, as a player brings the climbing muzzle back down: a drone's 0.3 m
        // tall, and each round's kick alone puts the next over it from 20 m.)
        const sight = () => {
          const q = unitPose(w, u!, s.time), p = s.player.pos, dd = Math.hypot(q.x - p.x, q.z - p.z);
          return { pitch: Math.atan2(q.y - eyeOf(s.player).y, dd) - s.player.kick, yaw: Math.atan2(-(q.x - p.x), -(q.z - p.z)), dd };
        };
        for (let i = 0; i < secs(90) && sight().dd > 30; i++) run(s, w, 1);
        for (let i = 0; i < secs(60) && fired < 15 && !done(); i++) {
          const { pitch, yaw } = sight();
          run(s, w, 1, { pitch, yaw, buttons: RMB });
          if (aimAt(s, w, 60)?.u !== u || s.player.swing > 0) continue;
          run(s, w, 1, { pitch, yaw, pressed: LMB, buttons: LMB | RMB }, st => { for (const e of st.events) { if (e.t === 'fire') fired++; if (e.t === 'hit') hits.push(e.zone); } });
          last = `${sight().dd.toFixed(0)}m ${s.player.mode}`;
        }
        expect(done(), `the ${sc.pursuit} dealt with: ${fired} fired, hits ${hits.join(',')}, last ${last}`).toBe(true);
      }
      // A tag on him from a dog's launcher gives him away wherever he hides (U-104): picked off with the dongle he
      // carries, before he runs and again once he's out of sight if one stuck to him on the way (knocked down by
      // what's on him, he tries again once he's up).
      addItem(s, s.inv.pack, 'sdr', 1);
      const pickOff = () => {
        const said: string[] = [];
        for (let k = 0; k < 10 && s.player.tag; k++) {
          for (let i = 0; i < 300 && (s.player.mode !== 'ground' || s.task); i++) run(s, w, 1);
          run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'sdr')!.uid }] });
          run(s, w, secs(TAG.remove + 0.3), {}, st => { for (const e of st.events) if (e.t === 'msg') said.push(e.text); });
        }
        expect(s.player.tag, `the tag picked off: ${said.join(' / ')}`).toBe(false);
      };
      pickOff();
      // The run: along the way at a sprint (5.5 m/s): by the stairs, to the friends' hideout's grate in its alley (he
      // came out that way, so it's unbolted), down through it, and it shut and bolted behind him; from Jiaochangkou, in
      // at a door, up its stairs and into a wardrobe.
      const grate = w.inter.find(i => i.id === 'airraid-grate')!, home = Math.hypot(grate.x - s.player.pos.x, grate.z - s.player.pos.z) < 120;
      const { way, hide } = home ? { way: [s.player.pos, ...(navPath(w.nav!, s.player.pos, { x: grate.x + 1.6, y: grate.y, z: grate.z }, 'street')?.pts ?? []), { x: grate.x + 1.6, y: grate.y, z: grate.z }], hide: -1 } : escapeRoute(w, s.player.pos);
      expect(way.length).toBeGreaterThan(2);
      for (let k = 1; k < way.length; k++) {
        const a = way[k - 1], b = way[k], n = Math.max(1, Math.round((Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / 5.5) * 60));
        for (let j = 1; j <= n; j++) { teleport(s.player, a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n, a.z + ((b.z - a.z) * j) / n); run(s, w, 1); }
      }
      // In, and waiting there: lost, searched for, given up on, never found again.
      if (home) {
        const o = s.wstate.open, bed = w.inter.find(i => i.id === 'airraid-table')!;
        o[grate.id] = true; o[bagsId(grate)] = true; w.index.off[doorSolid(grate)] = 1;
        run(s, w, secs(GRATE.lift));
        teleport(s.player, bed.x + 1.2, bed.y - 0.2, bed.z);
        run(s, w, 10);
        pickOff();
        run(s, w, secs(3));
        o[grate.id] = false; o[bagsId(grate)] = false; w.index.off[doorSolid(grate)] = 0;
        run(s, w, secs(GRATE.shut));
      } else expect(enterHide(s, w, hide)).toBe(true);
      const states: string[] = [];
      let found = false, lost = false, who = '', lostAt = 0;
      for (let i = 0; i < secs(240); i++) {
        run(s, w, 1);
        const now = d();
        if (now !== states[states.length - 1]) states.push(now);
        if (now === 'searching') lost = true;
        if (now === 'searching' && !lost) lostAt = i;
        if (lost && now === 'engaged' && !found) { found = true; const p = s.player.pos; who = s.units.filter(q => q.state === 'engaged').map(q => { const o = unitPose(w, q, s.time); return `${q.kind}@${Math.round(Math.hypot(o.x - p.x, o.z - p.z))}m/${(o.y - p.y).toFixed(0)}`; }).join(',') + ` after ${((i - lostAt) / 60).toFixed(0)}s, he at ${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)} ${s.player.posture}`; }
        if (lost && (now === 'heightened' || now === 'unaware')) break;
      }
      expect(lost, `lost him: ${states.join(' > ')}`).toBe(true);
      expect(found, `found again (by ${who}): ${states.join(' > ')}`).toBe(false);
      expect(['heightened', 'unaware'], states.join(' > ')).toContain(d());
    }, 600000);
  }
});
