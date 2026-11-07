// M9-10: the README matches the game: every scenario by its ?scenario= name, and every rebindable control by the
// label and default key the Settings panel shows.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { scenarios } from '../../src/data/scenarios';
import { ACTIONS, keyName } from '../../src/input/input';

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const rows = readme.split('\n').filter(l => l.startsWith('|'));
const cells = (row: string) => row.split('|').slice(1, -1).map(c => c.trim());

describe('README', () => {
  it('lists every scenario by name', () => {
    const named = new Set(rows.map(r => cells(r)[0]));
    expect(scenarios.map(s => s.name).filter(n => !named.has(n))).toEqual([]);
  });

  it('lists every control with its label and key as the game shows them', () => {
    const missing = ACTIONS.filter(a => {
      const keys = [...new Set(a.keys.map(keyName))].join(' / ');
      return !rows.some(r => { const [label, key] = cells(r); return label.startsWith(a.label) && key === keys; });
    }).map(a => a.label);
    expect(missing).toEqual([]);
  });
});
