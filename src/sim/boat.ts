// The river police's patrol boat (M6-20; Route C, M7-08, sets it going): moored at their pier, its ignition locked.
// What it still needs is said when he tries it.
import { onInteract, START_SOUND } from './interact';
import { has } from './inventory';

START_SOUND.boat = () => 'latch';
onInteract('boat', {
  can: s => (has(s.inv.pack, 'boatkey') ? 'the patrol boat: no fuel in it and a dead battery' : 'the patrol boat: its ignition needs its key'),
});
