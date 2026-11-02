// Held items as small 3D models in the same lit style as the hands (U-006).
// Each model is built around the fist: the part he grips sits at the origin running along X (through the
// curled fingers). He holds things in a handshake grip, so -X is up in his view and -Z is forward.
import * as THREE from 'three';
import { item } from '../data/items';
import { surface } from './surfaces';
import { armsModels, fit } from './items3d-arms';
import { foodModels } from './items3d-food';
import { gearModels } from './items3d-gear';
import { rigModels } from './items3d-rig';
import { techModels } from './items3d-tech';
import { partsModels } from './items3d-parts';
import { keysModels } from './items3d-keys';

/** Every item's model, each as close to the real thing as can be (U-053): built in its own file by kind. */
const models: Record<string, () => THREE.Object3D> = { ...armsModels, ...foodModels, ...gearModels, ...rigModels, ...techModels, ...partsModels, ...keysModels };

// Where the left hand grips on two-handed items (model space); others get a fist stacked above the right one.
const SUPPORT: Record<string, [number, number, number]> = {
  crowbar: [-0.18, 0, 0], boltcutters: [-0.12, -0.045, 0], shotgun: [0.002, 0, -0.36], nailgun: [-0.07, 0, -0.15], pistol: [0.045, -0.072, 0.01], rpg: [0, 0, -0.21], mrifle: [-0.07, 0, -0.38],
  extinguisher: [0.1, -0.06, 0], oxygen: [0.12, -0.05, 0], grinder: [-0.18, 0.08, -0.01], ladder: [0, -0.16, 0], jerrycan: [0, -0.1, 0], carbattery: [0, -0.08, 0],
  binoculars: [0.065, 0, 0], water: [-0.09, 0, 0], riverwater: [-0.09, 0, 0], bottle: [-0.09, 0, 0],
  // (Things carried by a handle, a loop or an edge: both fists on it, or the left steadying it.)
  toolbox: [0, -0.07, 0], firstaid: [0, -0.06, 0], bedroll: [0.2, -0.1, 0], mattress: [0.02, -0.06, 0], hikingpack: [0.25, -0.15, 0], dronectl: [0.035, -0.145, -0.005],
  drone: [-0.13, -0.13, 0], solar: [0, -0.12, 0], zipkit: [0.11, -0.11, 0], sensorhead: [-0.1, -0.11, 0], armour: [-0.1, -0.12, 0],
};

/** Small things (keys, cards, pills, a phone, small devices) and the knife are held in one hand (U-007). */
export function oneHanded(id: string): boolean {
  const d = item(id);
  return id === 'knife' || d.cat === 'key' || (d.w * d.h === 1 && d.kg <= 0.4);
}

/** Where the left hand grips the held item, in model space; null for one-handed items. */
export function supportPoint(id: string): THREE.Vector3 | null {
  if (oneHanded(id)) return null;
  const at = SUPPORT[id];
  if (at) return new THREE.Vector3(...at);
  const d = item(id);
  return new THREE.Vector3(-Math.min(0.25, Math.max(0.09, Math.max(d.w, d.h) * 0.04)), 0, 0);
}

/** Each of a model's materials given its surface once (M4-99): printed, cardboard or woven if it's named so (a label,
 *  a box, a bag's nylon), else metal worn and scratched, rubber and polymer grips stippled, wood grained, the rest
 *  scuffed plastic. */
function dress(o: THREE.Object3D): THREE.Object3D {
  o.traverse(m => {
    const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!mat || !('roughness' in mat) || mat.map) return;
    const c = mat.color, warm = c.r > c.b * 1.3 && c.r > 0.25, own = mat.name as 'label' | 'cardboard' | 'fabric' | '';
    mat.map = surface(own || (mat.metalness >= 0.3 ? 'metal' : mat.roughness >= 0.85 && c.r < 0.2 ? 'stipple' : warm && mat.roughness >= 0.75 ? 'wood' : 'plastic'));
    mat.needsUpdate = true;
  });
  return o;
}

/** The model of a held or dropped item; a pistol with its attachments. */
export function itemModel(id: string, mods?: string[]): THREE.Object3D {
  const make = models[id];
  if (!make) throw new Error(`no model for ${id}`);
  return dress(id === 'pistol' && mods?.length ? fit(make(), mods) : make());
}

export const modelledItems = () => Object.keys(models);
