// A map's red signs (M10-32): E (interact) reads one, its text shown for as long as it takes to read.
import { onInteract } from './interact';

onInteract('sign', { now: (s, _w, it) => { s.events.push({ t: 'read', text: String(it.data?.text ?? '') }); } });
