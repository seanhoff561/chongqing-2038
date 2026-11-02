// M8-01: the dialogue data. Every line has an id, a known speaker, Chinese and English; every line the game refers to
// (Anna's remarks, the voicemail, the endings, the intro, the speakers' announcements) is there; Li Wei talks like a
// Chongqing lad.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { lineById, SPEAKERS, VOICEMAIL, ANNA, INTRO, ENDING_LINES } from '../../src/data/dialogue';
import { REMARKS } from '../../src/sim/remarks';
import { ANNOUNCE } from '../../src/data/announce';

const files = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []));
const DIALECT = /啥子|老汉|莫|噻|屋头|外头|耗儿|记得到|嘛|哦|咯|要得|晓得|咋个|巴适|安逸/;

describe('the dialogue (M8-01)', () => {
  it('holds every line the game refers to, each whole', () => {
    const all = [...VOICEMAIL, ...ANNA, ...INTRO, ...Object.values(ENDING_LINES).flat(), ...Object.values(ANNOUNCE).flat()];
    expect(INTRO.length).toBeGreaterThanOrEqual(25);
    expect(Object.keys(ENDING_LINES).sort()).toEqual(['boat', 'bridge', 'cable', 'tunnel']);
    for (const l of all) {
      expect(SPEAKERS[l.speaker], `${l.id}: ${l.speaker}`).toBeDefined();
      expect(l.zh.length * l.en.length, l.id).toBeGreaterThan(0);
      expect(lineById.get(l.id), l.id).toBe(l);
    }
    expect(new Set(all.map(l => l.id)).size).toBe(all.length);
    for (const id of Object.values(REMARKS.lines)) expect(lineById.get(id), id).toBeDefined();
    // Every quoted line id in the code ('vm-', 'anna-', 'end-', 'intro-') is a line.
    const src = files('src').map(f => fs.readFileSync(f, 'utf8')).join('\n'), ids = [...src.matchAll(/'((?:vm|anna|end|intro)-[a-z0-9-]+)'/g)].map(m => m[1]);
    for (const id of ids) expect(lineById.get(id), id).toBeDefined();
    // Li Wei in Chongqing speech: most of his lines carry it.
    const his = all.filter(l => l.speaker === 'liwei');
    expect(his.filter(l => DIALECT.test(l.zh)).length / his.length).toBeGreaterThan(0.6);
  });
});
