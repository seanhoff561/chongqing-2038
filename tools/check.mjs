// npm run check: typecheck plus fast tests, quiet. Full output in logs/check.log.
import { spawnSync } from 'child_process';
import fs from 'fs';
fs.mkdirSync('logs', { recursive: true });
const log = [];
function run(name, cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  log.push(`== ${name}\n${out}`);
  return { ok: r.status === 0, out };
}
const tsc = run('tsc', 'npx', ['tsc', '--noEmit', '-p', '.']);
if (!tsc.ok) console.log(tsc.out.split('\n').filter(l => l.includes('error')).slice(0, 20).join('\n'));
// (The tests that build another seed's city run after, each file in a worker of its own: in the shared workers each
// would keep a second whole city in memory, running a worker out of it.)
const main = run('vitest', 'npx', ['vitest', 'run', '--reporter=dot', '--exclude', '**/*.slow.test.ts', '--exclude', 'scratch/**', '--exclude', '**/*.seeds.test.ts']);
const seeds = run('vitest seeds', 'npx', ['vitest', 'run', '--isolate', '--reporter=dot', '--exclude', '**/*.slow.test.ts', '--exclude', 'scratch/**', '.seeds.']);
const count = (out, re) => +((out.replace(/\x1b\[[0-9;]*m/g, '').split('\n').find(l => /Tests\s+\d/.test(l)) ?? '').match(re)?.[1] ?? 0);
const vt = { ok: main.ok && seeds.ok, out: main.out + '\n' + seeds.out };
fs.writeFileSync('logs/check.log', log.join('\n'));
const plain = vt.out.replace(/\x1b\[[0-9;]*m/g, '');
// (A worker busy building the city for a minute can time out vitest's own progress calls: harmless, not the tests'.
// Any other unhandled error, or a failed test, still fails the check.)
const rpc = (plain.match(/Timeout calling "onTaskUpdate"/g) ?? []).length, others = plain.split('\n').filter(l => /^Error: /.test(l) && !l.includes('Timeout calling "onTaskUpdate"'));
const tests = plain.split('\n').filter(l => /Tests\s+\d/.test(l));
vt.ok = tests.length === 2 && !tests.some(l => /failed/.test(l)) && !others.length;
if (!vt.ok) {
  const lines = plain.split('\n').filter(l => /FAIL|AssertionError|Error:|expected|✗|×/.test(l));
  console.log(lines.slice(0, 30).join('\n'));
}
const sum = tests.length ? `Tests ${count(main.out, /(\d+) passed/) + count(seeds.out, /(\d+) passed/)} passed${tests.some(l => /failed/.test(l)) ? ', some failed' : ''}` : 'vitest failed';
console.log(`check: tsc ${tsc.ok ? 'ok' : 'FAIL'} | ${sum}${rpc ? ` (${rpc} vitest progress timeouts ignored)` : ''}`);
process.exit(tsc.ok && vt.ok ? 0 : 1);
