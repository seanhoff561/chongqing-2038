// M10-32: a map from the editor built into a world with the city's builders: every piece builds, turned pieces
// collide, he starts at its spawn, a container holds what was chosen for it and nothing else, a red sign reads.
// M10-33: the built-in tutorial is whole, its signs name the game's own keys, and its pipe climbs to the tower's top.
import { describe, it, expect } from 'vitest';
import { buildMap, emptyMap, type Piece } from '../../src/world/sets/usermap';
import { PIECES } from '../../src/world/sets/pieces';
import { createState } from '../../src/sim/sim';
import { CONTAINER } from '../../src/sim/containers';
import { run, secs, aim, LMB, RMB } from './helpers';
import { tutorialMap } from '../../src/ui/mapfiles';
import tutorial from '../../src/data/tutorial.json';
import { binds, keyName } from '../../src/input/input';
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

  it('the built-in tutorial: whole, its keys the game\'s, its pipe climbed to the top', () => {
    const doc = tutorialMap(), w = buildMap(doc);
    expect(doc.pieces).toEqual(tutorial.pieces);
    const signs = doc.pieces.filter(p => p.kind.startsWith('red'));
    expect(w.inter.filter(i => i.kind === 'sign').length).toBe(signs.length);
    const text = signs.map(p => p.text).join('\n');
    for (const a of ['sprint', 'crouch', 'crawl', 'interact', 'chimney']) expect(text).toMatch(new RegExp(`\\b${keyName(binds[a][0])}\\b`));
    expect(text).toContain('Space');
    const s = createState(1, w), p = s.player;
    run(s, w, 3);
    expect(p.onGround).toBe(true);
    // Up the pipe hand over hand (left, right in turn, W), over the top onto the tower.
    p.pos.x = -1.2; p.pos.z = -33.85;
    run(s, w, 3);
    const bits: number[] = [LMB, RMB];
    let hand = 0;
    for (let k = 0; k < 20 && (p.mode !== 'ground' || k === 0); k++) {
      const held = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
      aim(s, -1.2, Math.min(4.95, p.pos.y + 2.2), -34.42);
      run(s, w, 2, { buttons: held | bits[hand] });
      run(s, w, secs(1), { buttons: bits[hand], my: 1 });
      hand = 1 - hand;
      if (p.mode === 'action') run(s, w, secs(1));
    }
    expect(p.pos.y).toBeCloseTo(5, 1);
  });
});
