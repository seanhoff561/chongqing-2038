// M8-01: the dialogue data. Every line has an id, a known speaker, Chinese and English; every line the game refers to
// (the voicemail, Anna on the map, the endings, the speakers' announcements) is there; Li Wei talks like a
// Chongqing lad.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { lineById, SPEAKERS, SPOKEN, ENDING_LINES } from '../../src/data/dialogue';
import { ANNOUNCE } from '../../src/data/announce';

const files = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []));
const DIALECT = /啥子|老汉|莫|噻|屋头|外头|耗儿|记得到|嘛|哦|咯|要得|晓得|咋个|巴适|安逸/;

describe('the dialogue (M8-01)', () => {
  it('holds every line the game refers to, each whole', () => {
    const all = [...SPOKEN, ...Object.values(ANNOUNCE).flat()];
    expect(Object.keys(ENDING_LINES).sort()).toEqual(['boat', 'bridge', 'cable', 'tunnel']);
    for (const l of all) {
      expect(SPEAKERS[l.speaker], `${l.id}: ${l.speaker}`).toBeDefined();
      expect(l.zh.length * l.en.length, l.id).toBeGreaterThan(0);
      expect(lineById.get(l.id), l.id).toBe(l);
    }
    expect(new Set(all.map(l => l.id)).size).toBe(all.length);
    // Every quoted line id in the code ('vm-', 'anna-', 'end-') is a line.
    const src = files('src').map(f => fs.readFileSync(f, 'utf8')).join('\n'), ids = [...src.matchAll(/'((?:vm|anna|end|map)-[a-z0-9-]+)'/g)].map(m => m[1]);
    for (const id of ids) expect(lineById.get(id), id).toBeDefined();
    // Li Wei in Chongqing speech: most of his lines carry it.
    const his = all.filter(l => l.speaker === 'liwei');
    expect(his.filter(l => DIALECT.test(l.zh)).length / his.length).toBeGreaterThan(0.6);
  });
});
