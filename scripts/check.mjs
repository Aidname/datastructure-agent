import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
let jsCount = 0;
let jsonCount = 0;
async function visit(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (['.git', '.vs', '.vscode', '.idea', 'node_modules', 'data', 'artifacts'].includes(entry.name)) continue;
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) await visit(path);
    else if (['.js', '.mjs'].includes(extname(path))) {
      execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
      jsCount++;
    } else if (extname(path) === '.json') {
      JSON.parse(await readFile(path, 'utf8'));
      jsonCount++;
    }
  }
}
await visit(root);
console.log(`Static check passed: ${jsCount} JS files, ${jsonCount} JSON files. This is not a business-function or schema-validation test.`);
