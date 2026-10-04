import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures: string[] = [];
const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString('utf8').split('\0').filter(Boolean);
const forbiddenPath = /(?:^|\/)(?:runtime|runtime_local|runtime_snapshots|private|captures?|uploads?)(?:\/|$)|\.(?:db|sqlite3?|p12|pfx|pem|key|bin)$/i;

for (const path of tracked) {
  if (path !== '.env.example' && (forbiddenPath.test(path) || /(?:^|\/)\.env(?:\.|$)/.test(path))) {
    failures.push(`${path}: forbidden tracked path`);
  }
}

function filesUnder(directory: string): string[] {
  const result: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) result.push(...filesUnder(path)); else result.push(path);
  }
  return result;
}

const dist = resolve(root, 'dist');
let builtFiles: string[] = [];
try { builtFiles = filesUnder(dist); } catch { failures.push('dist: production bundle is missing'); }
const contentRules: Array<[RegExp, string]> = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key material'],
  [/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i, 'temporary tunnel origin'],
  [/http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, 'local origin'],
  [/#bind=[A-Za-z0-9_-]{43}/, 'literal one-time binding key'],
  [/[A-Za-z]:\\Users\\[^\\\s]+\\/i, 'local absolute Windows path'],
];

for (const file of builtFiles) {
  if (statSync(file).size > 5_000_000) continue;
  const content = readFileSync(file, 'utf8');
  for (const [pattern, label] of contentRules) if (pattern.test(content)) failures.push(`${relative(root, file)}: ${label}`);
}

const builtIndex = builtFiles.find(path => /(?:^|[\\/])index\.html$/.test(path));
if (builtIndex && !readFileSync(builtIndex, 'utf8').includes('ShizukuBot')) failures.push('dist/index.html: ShizukuBot brand missing');

let historyNotice = 0;
try {
  const historical = execFileSync('git', ['log', '--all', '--format=', '--name-only', '-S', 'trycloudflare.com'], { cwd: root }).toString('utf8').split(/\r?\n/).filter(Boolean);
  historyNotice = new Set(historical).size;
} catch { failures.push('git history: unable to complete temporary-origin path scan'); }

if (failures.length) {
  console.error('Public readiness check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Public readiness check passed (${tracked.length} tracked paths, ${builtFiles.length} built files).`);
  if (historyNotice) console.log(`History notice: ${historyNotice} path(s) previously mentioned a temporary tunnel; no value was printed. Treat it as rotated public infrastructure, not a credential.`);
}
