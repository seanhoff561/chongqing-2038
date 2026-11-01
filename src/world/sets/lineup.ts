// The machines' lineup (M4-26, ?scenario=units): every kind of the occupier's machines on a plaza, the walkers and
// drones each on a short beat toward him and back, the cameras and sensors on posts, a drone dock with its hunters, a
// name card in front of each; an edict board and a shop's LED ticker at the back, to show the alert (M4-27).
import { solid, type Solid } from '../geom';
import { makeWorld, type World, type Label, type Patrol, type Camera, type Prop } from '../world';
import { MAT } from '../mats';
import type { UnitKind } from '../../data/units';

export function buildLineup(): World {
  const solids: Solid[] = [solid(-60, -1, -60, 60, 0, 60, MAT.concrete)], labels: Label[] = [], patrols: Patrol[] = [], cameras: Camera[] = [];
  const card = (text: string, x: number, z: number) => labels.push({ text, x, y: 0.01, z, face: 'up' });
  // The walkers and the drones: out from the back row toward him and back.
  ([['heavy', -15, 0, '重型机甲 Heavy walker'], ['humanoid', -9, 0, '人形机器人 Humanoid'], ['humanoid', -6, 0, ''], ['quadruped', -3, 0, '四足机器人 Quadruped'], ['carrier', 2, 0, '运输机器人 Carrier'], ['delivery', 6.5, 0, '配送机器人 Delivery'],
    ['drone', 10, 4, '巡逻无人机 Patrol drone'], ['hunter', 13.5, 5, '猎杀无人机 Hunter drone']] as [UnitKind, number, number, string][]).forEach(([unit, x, y, name]) => {
    patrols.push({ kind: y ? 'drone' : 'street', unit, pts: [{ x, y, z: 2 }, { x, y, z: 12 }], dwell: [1.5, 1.5], hours: [0, 24] });
    if (name) card(name, x, 14.5);
  });
  // The giants (U-050), out to the sides where there's room for them.
  ([['spider', -40, '蜘蛛机甲 Spider walker'], ['colossus', 28, '巨型步行机 Colossus']] as [UnitKind, number, string][]).forEach(([unit, x, name]) => {
    patrols.push({ kind: 'street', unit, pts: [{ x, y: 0, z: -12 }, { x, y: 0, z: 12 }], dwell: [3, 3], hours: [0, 24] });
    card(name, x, 16);
  });
  // The fixed ones on posts along the back, facing him.
  const post = (x: number, h: number) => solids.push(solid(x - 0.08, 0, -4.3, x + 0.08, h, -4.1, MAT.metal));
  ([['camera', -12, 3, '摄像头 Camera'], ['sweeper', -8.5, 3.2, '旋转摄像头 Sweeper'], ['pir', 0.5, 2, '红外 PIR'], ['acoustic', 3, 2, '声学 Acoustic']] as [Camera['kind'], number, number, string][]).forEach(([kind, x, y, name]) => {
    post(x, kind === 'sweeper' ? y - 0.45 : y - 0.1);
    cameras.push({ kind, x, y, z: -4.05, yaw: 0 });
    card(name, x, -2.5);
  });
  solids.push(solid(-5.5, 0, -5, -3.5, 1.2, -3, MAT.concrete));
  cameras.push({ kind: 'turret', x: -4.5, y: 1.6, z: -4, yaw: 0 });
  card('炮塔 Turret', -4.5, -2.5);
  post(6, 0.5); post(10, 0.5);
  cameras.push({ kind: 'tripwire', x: 6, y: 0.4, z: -4.05, yaw: Math.PI / 2, to: { x: 10, y: 0.4, z: -4.05 } });
  card('激光绊线 Tripwire', 8, -2.5);
  solids.push(solid(10, 0, -8, 15, 4.2, -7.5, MAT.plaster));
  const props: Prop[] = [{ kind: 'dronedock', x: 17, y: 0, z: -4, yaw: 0 }, { kind: 'edict', x: -14, y: 0, z: -8, yaw: 0 }, { kind: 'ledboard', x: 12.5, y: 3.2, z: -7.45, yaw: 0, w: 4 }];
  card('无人机坞 Dock', 17, -1.5);
  return makeWorld({ name: 'lineup', solids, labels, patrols, cameras, props, docks: [{ x: 17, y: 2.6, z: -4 }], spawn: { x: 2, y: 0, z: 19, yaw: 0 } });
}
