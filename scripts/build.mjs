import { cp, rm, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
execFileSync(process.execPath, ['scripts/generate-content-index.mjs'], { stdio: 'inherit' });
const out = path.resolve('dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.resolve('public'), out, { recursive: true });
console.log('✓ dist/ ready for GitHub Pages');
