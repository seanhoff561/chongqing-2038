// M10-32: a map from the editor built into a world with the city's builders: every piece builds, turned pieces
// collide, he starts at its spawn, a container holds what was chosen for it and nothing else, a red sign reads.
import { describe, it, expect } from 'vitest';
import { buildMap, emptyMap, type Piece } from '../../src/world/sets/usermap';
import { PIECES } from '../../src/world/sets/pieces';
import { createState } from '../../src/sim/sim';
import { CONTAINER } from '../../src/sim/containers';
import { run, secs } from './helpers';
import { B } from '../../src/sim/types';
import { raycast } from '../../src/world/geom';

const piece = (kind: string, x: number, z: number, o: Partial<Piece> = {}): Piece => ({ kind, x, y: 0, z, yaw: 0, w: PIECES[kind].w, h: PIECES[kind].h, d: PIECES[kind].d, ...o });

describe('editor maps', () => {
  it('every piece builds, turned or not', () => {
    const pieces = Object.keys(PIECES).map((k, i) => piece(k, (i % 10) * 16 - 80, Math.floor(i / 10) * 16 - 60, { yaw: i % 3 ? 0.5 : 0, text: 'hi' }));
    const w = buildMap({ v: 1, name: 'all', pieces });
    expect(w.solids.length).toBeGreaterThan(Object.keys(PIECES).length);
    for (const k of ['pipe', 'ladder', 'post', 'rope', 'vine', 'tree']) expect(w.climbables.some(c => c.kind === k)).toBe(true);
    expect(w.lines.length).toBe(1);
    expect(w.water.length).toBe(1);
    expect(w.hides.length).toBeGreaterThanOrEqual(3);
    expect(w.inter.filter(i => i.kind === 'container').length).toBe(6);
    expect(w.inter.some(i => i.kind === 'sign' && i.data?.text === 'hi')).toBe(true);
  });

  it('he starts at its spawn, standing on a turned platform', () => {
    const doc = emptyMap();
    doc.pieces[0] = piece('spawn', 3, 4, { y: 1, yaw: 1 });
    doc.pieces.push(piece('platform', 3, 4, { yaw: 0.7 }));
    const w = buildMap(doc), s = createState(1, w);
    run(s, w, secs(1));
    expect(s.player.onGround).toBe(true);
    expect(s.player.pos.y).toBeCloseTo(1, 1);
    expect(Math.hypot(s.player.pos.x - 3, s.player.pos.z - 4)).toBeLessThan(0.1);
    // (The pool's ground cut away under its water.)
    const pool = buildMap({ v: 1, name: 'p', pieces: [piece('pool', 20, 0)] });
    expect(raycast(pool.index, 20, 5, 0, 0, -1, 0, 20)!.t).toBeGreaterThan(6);
  });

  it('a container holds what was chosen for it, and a sign is read', () => {
    const w = buildMap({ v: 1, name: 'c', pieces: [piece('spawn', 0, 0), piece('cabinet', 0, -1.6, { items: [['bandage', 2], ['water', 1]] }), piece('redsign', 2, -1, { yaw: 0, text: 'climb the pipe' })] });
    const s = createState(1, w);
    run(s, w, 2, { pitch: -0.3 });
    expect(s.target).toBe('map-1');
    run(s, w, 1, { pitch: -0.3, buttons: B.INTERACT, pressed: B.INTERACT });
    run(s, w, secs(CONTAINER.cabinet.time + 0.1), { pitch: -0.3, buttons: B.INTERACT });
    expect(s.containers['map-1'].items.map(i => `${i.id}:${i.n}`).sort()).toEqual(['bandage:2', 'water:1']);
    // (The sign: face it, interact.)
    s.openContainer = null; s.player.pos.x = 2; s.player.pos.z = 0.5; s.player.yaw = 0;
    run(s, w, 2, { yaw: 0, pitch: -0.7 });
    expect(s.target).toBe('map-2');
    const read: string[] = [];
    run(s, w, 1, { yaw: 0, pitch: -0.7, buttons: B.INTERACT, pressed: B.INTERACT }, st => { for (const e of st.events) if (e.t === 'read') read.push(e.text); });
    expect(read).toEqual(['climb the pipe']);
  });
});
