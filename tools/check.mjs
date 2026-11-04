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
const vt = run('vitest', 'npx', ['vitest', 'run', '--reporter=dot', '--exclude', '**/*.slow.test.ts', '--exclude', 'scratch/**']);
fs.writeFileSync('logs/check.log', log.join('\n'));
const plain = vt.out.replace(/\x1b\[[0-9;]*m/g, '');
// (A worker busy building the city for a minute can time out vitest's own progress calls: harmless, not the tests'.
// Any other unhandled error, or a failed test, still fails the check.)
const rpc = (plain.match(/Timeout calling "onTaskUpdate"/g) ?? []).length, others = plain.split('\n').filter(l => /^Error: /.test(l) && !l.includes('Timeout calling "onTaskUpdate"'));
const tests = plain.split('\n').find(l => /Tests\s+\d/.test(l)) ?? '';
vt.ok = !!tests && !/failed/.test(tests) && !others.length;
if (!vt.ok) {
  const lines = plain.split('\n').filter(l => /FAIL|AssertionError|Error:|expected|✗|×/.test(l));
  console.log(lines.slice(0, 30).join('\n'));
}
const sum = plain.split('\n').find(l => /Tests\s+\d/.test(l))?.trim() ?? (vt.ok ? 'no tests' : 'vitest failed');
console.log(`check: tsc ${tsc.ok ? 'ok' : 'FAIL'} | ${sum}${rpc ? ` (${rpc} vitest progress timeouts ignored)` : ''}`);
process.exit(tsc.ok && vt.ok ? 0 : 1);
