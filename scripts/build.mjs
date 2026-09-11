import { cp, rm, mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

execFileSync(process.execPath, ['scripts/migrate-legacy.mjs'], { stdio: 'inherit' });

const out = path.resolve('dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.resolve('public'), out, { recursive: true });
await rm(path.join(out, 'admin.html'), { force:true });
await rm(path.join(out, 'content'), { recursive:true, force:true });
await rm(path.join(out, 'site-config.json'), { force:true });
await rm(path.join(out, 'lib/image.js'), { force:true });
await rm(path.join(out, 'lib/zip.js'), { force:true });

const configFile = path.resolve('config/site-config.json');
try {
  await copyFile(configFile, path.join(out, 'site-config.json'));
} catch {
  await writeFile(path.join(out, 'site-config.json'), JSON.stringify({siteName:'SpaceTour',map:{provider:'kakao',kakaoJavaScriptKey:'',naverNcpKeyId:''}}, null, 2));
}

execFileSync(process.execPath, ['scripts/generate-content-index.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, SPACETOUR_CONTENT_SOURCE: 'content/projects', SPACETOUR_CONTENT_OUT: 'dist/content' }
});

console.log('✓ dist/ ready: public viewer only (Studio is excluded)');
