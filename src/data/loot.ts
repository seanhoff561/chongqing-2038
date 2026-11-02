// Loot tables: weighted entries rolled per container from the run seed (DESIGN section 8 and 10).
export interface LootEntry { id: string; w: number; n?: [number, number] }
export interface LootTable { rolls: [number, number]; empty: number; items: LootEntry[] }

export const loot: Record<string, LootTable> = {
  // Ordinary homes and shops (tier 1).
  kitchen: { rolls: [1, 3], empty: 0.15, items: [
    { id: 'noodles', w: 6, n: [1, 3] }, { id: 'zhacai', w: 4 }, { id: 'luncheon', w: 2 }, { id: 'crackers', w: 3 },
    { id: 'water', w: 5 }, { id: 'bottle', w: 3 }, { id: 'buns', w: 2 }, { id: 'teaeggs', w: 2 }, { id: 'pork', w: 1 },
    { id: 'peaches', w: 2 }, { id: 'bread', w: 2 }, { id: 'sausage', w: 2 }, { id: 'knife', w: 1 }, { id: 'alcohol', w: 1 }, { id: 'tape', w: 1 },
  ] },
  bedroom: { rolls: [1, 2], empty: 0.2, items: [
    { id: 'bedroll', w: 2 },
    { id: 'hairpins', w: 4 }, { id: 'cloth', w: 4 }, { id: 'painkillers', w: 2 }, { id: 'bandage', w: 2 }, { id: 'phone', w: 1 },
    { id: 'chocolate', w: 2 }, { id: 'energy', w: 2 }, { id: 'headlamp', w: 1 }, { id: 'mylar', w: 1 },
  ] },
  shop: { rolls: [1, 3], empty: 0.15, items: [
    { id: 'foldcrate', w: 1 }, { id: 'bedroll', w: 1 }, { id: 'mattress', w: 1 },
    { id: 'noodles', w: 5, n: [1, 4] }, { id: 'water', w: 5, n: [1, 2] }, { id: 'energy', w: 3 }, { id: 'chocolate', w: 3 },
    { id: 'crackers', w: 3 }, { id: 'zhacai', w: 3 }, { id: 'firecrackers', w: 1 }, { id: 'tape', w: 2 }, { id: 'tablets', w: 1, n: [2, 5] },
  ] },
  workshop: { rolls: [1, 2], empty: 0.3, items: [
    { id: 'toolbox', w: 3 }, { id: 'foldcrate', w: 2 },
    { id: 'tape', w: 4 }, { id: 'rods', w: 3 }, { id: 'crowbar', w: 1 }, { id: 'clips', w: 2 }, { id: 'cable', w: 2 },
    { id: 'scootercells', w: 2 }, { id: 'stone', w: 2, n: [1, 3] }, { id: 'chalk', w: 1 }, { id: 'chalkblock', w: 1 }, { id: 'suppressor', w: 1 }, { id: 'reddot', w: 1 }, { id: 'rope', w: 1 }, { id: 'carabiner', w: 2, n: [1, 2] }, { id: 'zipkit', w: 1 },
  ] },
  car: { rolls: [0, 2], empty: 0.35, items: [
    { id: 'water', w: 4 }, { id: 'crackers', w: 2 }, { id: 'firstaid', w: 1 }, { id: 'tape', w: 2 }, { id: 'cable', w: 2 },
    { id: 'extinguisher', w: 1 }, { id: 'energy', w: 2 }, { id: 'cloth', w: 2 }, { id: 'carbattery', w: 3 }, { id: 'mag9x', w: 1 }, { id: 'scope4x', w: 1 }, { id: 'rocket', w: 1 }, { id: 'rpg', w: 1 },
  ] },
  // The rarer buildings (M5-35, U-091): the rarer, the better. An office's electronics and odds and ends; a military
  // post's barracks (ammunition, rations, first aid) and its armoury (guns, their attachments, grenades, the
  // machines' own kit).
  office: { rolls: [1, 3], empty: 0.15, items: [
    { id: 'phone', w: 3 }, { id: 'cable', w: 4, n: [1, 2] }, { id: 'board', w: 3 }, { id: 'clips', w: 2 }, { id: 'battpack', w: 2 }, { id: 'rfid', w: 2 },
    { id: 'tape', w: 2 }, { id: 'painkillers', w: 2 }, { id: 'energy', w: 3 }, { id: 'chocolate', w: 2 }, { id: 'headlamp', w: 1 },
    { id: 'sdr', w: 1 }, { id: 'cloner', w: 1 }, { id: 'cameratap', w: 1 }, { id: 'canif', w: 1 },
  ] },
  barracks: { rolls: [1, 3], empty: 0.1, items: [
    { id: 'mag9', w: 4 }, { id: 'bandage', w: 3, n: [1, 2] }, { id: 'firstaid', w: 1 }, { id: 'tourniquet', w: 2 }, { id: 'painkillers', w: 2 },
    { id: 'crackers', w: 3 }, { id: 'water', w: 3 }, { id: 'energy', w: 2 }, { id: 'headlamp', w: 1 }, { id: 'knife', w: 1 }, { id: 'mylar', w: 1 }, { id: 'binoculars', w: 1 },
  ] },
  armory: { rolls: [1, 3], empty: 0.05, items: [
    { id: 'pistol', w: 3 }, { id: 'mag9', w: 6, n: [1, 3] }, { id: 'mag9x', w: 2 }, { id: 'suppressor', w: 2 }, { id: 'reddot', w: 2 }, { id: 'scope4x', w: 1 },
    { id: 'grenade', w: 2 }, { id: 'emp', w: 1 }, { id: 'jammer', w: 1 }, { id: 'thermalmod', w: 1 }, { id: 'dronectl', w: 1 }, { id: 'rocket', w: 1 }, { id: 'rpg', w: 1 },
  ] },
  medicine: { rolls: [1, 2], empty: 0.2, items: [
    { id: 'bandage', w: 5, n: [1, 3] }, { id: 'painkillers', w: 4, n: [1, 3] }, { id: 'alcohol', w: 3 }, { id: 'tablets', w: 2, n: [2, 6] },
    { id: 'tourniquet', w: 1 }, { id: 'mylar', w: 1 },
  ] },
  // The high-security sites' containers by their tier (M5-31, DESIGN section 10); a site's own one-off finds (keys,
  // fuses, the boat's key) are placed by hand with the site, never rolled. Tier 1: what any home has.
  tier1: { rolls: [1, 3], empty: 0.15, items: [
    { id: 'noodles', w: 4, n: [1, 2] }, { id: 'water', w: 4 }, { id: 'crackers', w: 3 }, { id: 'bottle', w: 2 }, { id: 'tape', w: 3 }, { id: 'cloth', w: 2 },
    { id: 'bandage', w: 2 }, { id: 'painkillers', w: 2 }, { id: 'alcohol', w: 1 }, { id: 'hairpins', w: 1 }, { id: 'knife', w: 1 }, { id: 'stone', w: 1 },
  ] },
  // Tier 2: tools, medicine or electronics, as a construction site, a hospital or the electronics market has them.
  tier2: { rolls: [1, 3], empty: 0.1, items: [
    { id: 'boltcutters', w: 2 }, { id: 'rope', w: 2 }, { id: 'carabiner', w: 2, n: [1, 2] }, { id: 'harness', w: 1 }, { id: 'hook', w: 2 }, { id: 'nailgun', w: 1 }, { id: 'nails', w: 2 },
    { id: 'grinder', w: 1 }, { id: 'pulley', w: 1 }, { id: 'zipkit', w: 1 }, { id: 'crowbar', w: 2 }, { id: 'firstaid', w: 2 }, { id: 'tourniquet', w: 2 }, { id: 'splint', w: 2 }, { id: 'mylar', w: 1 },
    { id: 'oxygen', w: 1 }, { id: 'capbank', w: 1 }, { id: 'sdr', w: 1 }, { id: 'rfid', w: 1 }, { id: 'board', w: 3 }, { id: 'clips', w: 2 }, { id: 'cable', w: 2 }, { id: 'battpack', w: 2 },
  ] },
  // Tier 3: weapons and the network's kit, as a police station, the exchange, the metro control room or a checkpoint has.
  tier3: { rolls: [1, 3], empty: 0.05, items: [
    { id: 'pistol', w: 2 }, { id: 'mag9', w: 4, n: [1, 2] }, { id: 'shotgun', w: 1 }, { id: 'shells', w: 3, n: [1, 2] }, { id: 'grenade', w: 2 }, { id: 'extinguisher', w: 1 },
    { id: 'breach', w: 1 }, { id: 'rfamp', w: 2 }, { id: 'fibretap', w: 1 }, { id: 'cameratap', w: 2 }, { id: 'coil', w: 1 }, { id: 'trigger', w: 1 }, { id: 'cloner', w: 1 },
  ] },
  // The sites' own (M6-11 to M6-13): the hospital's medicine (tier 2), the police station's weapons and keys (tier 3), the
  // electronics market's parts (tiers 2-3).
  hospital: { rolls: [1, 3], empty: 0.1, items: [
    { id: 'firstaid', w: 3 }, { id: 'tourniquet', w: 3 }, { id: 'splint', w: 3 }, { id: 'painkillers', w: 4, n: [1, 3] }, { id: 'bandage', w: 4, n: [1, 3] },
    { id: 'tablets', w: 2, n: [2, 6] }, { id: 'mylar', w: 2 }, { id: 'oxygen', w: 1 }, { id: 'capbank', w: 1 }, { id: 'alcohol', w: 2 }, { id: 'hospcard', w: 1 },
  ] },
  police: { rolls: [1, 3], empty: 0.05, items: [
    { id: 'pistol', w: 2 }, { id: 'mag9', w: 5, n: [1, 2] }, { id: 'shotgun', w: 1 }, { id: 'shells', w: 3, n: [1, 2] }, { id: 'grenade', w: 2 }, { id: 'extinguisher', w: 1 },
    { id: 'policecard', w: 2 }, { id: 'boatkey', w: 1 }, { id: 'cloner', w: 1 }, { id: 'binoculars', w: 1 },
  ] },
  electronics: { rolls: [1, 3], empty: 0.1, items: [
    { id: 'sdr', w: 2 }, { id: 'rfid', w: 2 }, { id: 'board', w: 4, n: [1, 2] }, { id: 'clips', w: 3 }, { id: 'cable', w: 3 }, { id: 'canif', w: 1 }, { id: 'battpack', w: 3 },
    { id: 'cameratap', w: 1 }, { id: 'rfamp', w: 1 }, { id: 'tape', w: 2 },
  ] },
  telecom: { rolls: [1, 3], empty: 0.05, items: [
    { id: 'rfamp', w: 3 }, { id: 'netcreds', w: 2 }, { id: 'fibretap', w: 2 }, { id: 'cable', w: 3 }, { id: 'board', w: 2 }, { id: 'cameratap', w: 2 }, { id: 'telcard', w: 1 }, { id: 'battpack', w: 1 },
  ] },
  substation: { rolls: [1, 3], empty: 0.1, items: [
    { id: 'insgloves', w: 2 }, { id: 'coil', w: 3 }, { id: 'cable', w: 3 }, { id: 'tape', w: 3 }, { id: 'clips', w: 2 }, { id: 'carbattery', w: 1 }, { id: 'boltcutters', w: 1 },
  ] },
  // Tier 4: the drone hub's: what a drone controller is made of, big battery packs, the thermal module.
  tier4: { rolls: [2, 4], empty: 0, items: [
    { id: 'radiomod', w: 3 }, { id: 'board', w: 3 }, { id: 'battpack', w: 3, n: [1, 2] }, { id: 'powercell', w: 2 }, { id: 'thermalmod', w: 2 }, { id: 'rotor', w: 3, n: [2, 4] },
    { id: 'cammod', w: 2 }, { id: 'dronectl', w: 1 },
  ] },
};

/** The rest of a home's containers, not the one chosen for it (U-085: homes were too bare): now and then one thing
 *  left behind in each, from the table its kind would hold. */
export const LEFTOVER = { chance: 0.3, of: { cabinet: 'kitchen', fridge: 'kitchen', drawer: 'bedroom', locker: 'bedroom', wardrobe: 'bedroom', crate: 'shop' } as Record<string, string>,
  /** (By its room, in the rarer buildings, M5-35: an armoury's leftovers the barracks', its best kept for the chosen one.) */
  rooms: { office: 'office', command: 'office', ward: 'medicine', clinic: 'medicine', barracks: 'barracks', armory: 'barracks' } as Record<string, string> };

/** Things lying loose on rooms' floors (U-085): how many of the spots hold something, and how near him (m) they're
 *  rolled for the run. */
export const LOOSE = { chance: 0.5, near: 30 };
