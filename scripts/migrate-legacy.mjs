import { readdir, stat, cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function exists(p) { try { await stat(p); return true; } catch { return false; } }
async function readJson(p) { try { return JSON.parse(await readFile(p,'utf8')); } catch { return null; } }

const legacyContent = path.resolve('public/content');
const sourceRoot = path.resolve('content/projects');
await mkdir(sourceRoot, { recursive:true });

if (await exists(legacyContent)) {
  for (const entry of await readdir(legacyContent, { withFileTypes:true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const from = path.join(legacyContent, entry.name);
    const to = path.join(sourceRoot, entry.name);
    if (!(await exists(to))) {
      await cp(from, to, { recursive:true });
      console.log(`• migrated legacy property: ${entry.name}`);
    }
  }
  await rm(legacyContent, { recursive:true, force:true });
  console.log('• removed legacy public/content source');
}

const legacyConfig = path.resolve('public/site-config.json');
const configFile = path.resolve('config/site-config.json');
if (await exists(legacyConfig)) {
  const oldCfg = await readJson(legacyConfig);
  const newCfg = await readJson(configFile);
  const oldHasKey = Boolean(oldCfg?.map?.kakaoJavaScriptKey || oldCfg?.map?.naverNcpKeyId);
  const newHasKey = Boolean(newCfg?.map?.kakaoJavaScriptKey || newCfg?.map?.naverNcpKeyId);
  if (oldCfg && (oldHasKey || !newCfg || !newHasKey)) {
    await mkdir(path.dirname(configFile), { recursive:true });
    await writeFile(configFile, JSON.stringify(oldCfg,null,2)+'\n','utf8');
    console.log('• migrated legacy map settings');
  }
  await rm(legacyConfig, { force:true });
}

for (const rel of ['public/admin.html','public/lib/image.js','public/lib/zip.js']) {
  if (await exists(path.resolve(rel))) {
    await rm(path.resolve(rel), { force:true });
    console.log(`• removed public-only legacy file: ${rel}`);
  }
}
