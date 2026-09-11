import http from 'node:http';
import { readFile, stat, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const cwd = process.cwd();
execFileSync(process.execPath, ['scripts/generate-content-index.mjs'], { stdio: 'inherit', cwd });
const root = path.resolve('public');
const contentRoot = path.join(root, 'content');
const port = Number(process.env.PORT || 5173);
const types = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm',
  '.webmanifest':'application/manifest+json'
};

function run(command, args, { allowFail = false, capture = true } = {}) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', shell: false });
  if (r.error && !allowFail) throw r.error;
  if (r.status !== 0 && !allowFail) {
    const msg = String(r.stderr || r.stdout || `${command} failed`).trim();
    throw new Error(msg || `${command} exited with code ${r.status}`);
  }
  return r;
}

function git(args, opts = {}) { return run('git', args, opts); }
function hasGitRepo() { return git(['rev-parse','--is-inside-work-tree'], { allowFail:true }).status === 0; }
function getOrigin() {
  const r = git(['remote','get-url','origin'], { allowFail:true });
  return r.status === 0 ? String(r.stdout || '').trim() : '';
}
function parseRemote(origin) {
  const m = origin.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return m ? { owner:m[1], repo:m[2] } : null;
}
function getSiteUrl() {
  const p = parseRemote(getOrigin());
  if (!p) return '';
  return `https://${p.owner}.github.io/${p.repo}/`;
}
function stagedChanges() { return git(['diff','--cached','--quiet'], { allowFail:true }).status === 1; }

async function readJsonBody(req, max = 350 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error('업로드 용량이 너무 큽니다. 한 번에 350MB 이하로 게시해주세요.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function sendJson(res, code, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':body.length});
  res.end(body);
}
function safeSlug(value) {
  const slug = String(value || '').trim();
  if (!slug || slug === '.' || slug === '..' || /[\\/]/.test(slug)) throw new Error('올바른 매물 폴더명이 아닙니다.');
  return slug.replace(/[^a-zA-Z0-9가-힣._-]+/g,'-').replace(/^-+|-+$/g,'');
}
function safeFileName(value) {
  const name = path.basename(String(value || ''));
  if (!name || name === '.' || name === '..') throw new Error('올바르지 않은 파일명입니다.');
  return name;
}

function gitPublish(message) {
  if (!hasGitRepo()) throw new Error('Git 저장소가 연결되지 않았습니다. FIRST-SETUP 또는 REPAIR-NOW를 한 번 실행해주세요.');
  const origin = getOrigin();
  if (!origin) throw new Error('GitHub origin이 연결되지 않았습니다. REPAIR-NOW를 한 번 실행해주세요.');
  git(['add','-A'], { capture:true });
  let committed = false;
  if (stagedChanges()) {
    const userName = git(['config','user.name'], { allowFail:true }).stdout?.trim();
    const userEmail = git(['config','user.email'], { allowFail:true }).stdout?.trim();
    if (!userName) git(['config','user.name','SpaceTour Publisher']);
    if (!userEmail) git(['config','user.email','spacetour-publisher@users.noreply.github.com']);
    git(['commit','-m',message], { capture:true });
    committed = true;
  }
  const push = git(['push','origin','HEAD:main'], { allowFail:true });
  if (push.status !== 0) {
    const text = `${push.stderr || ''}\n${push.stdout || ''}`;
    if (/fetch first|non-fast-forward|rejected/i.test(text)) {
      throw new Error('GitHub에 PC보다 새로운 변경이 있습니다. REPAIR-NOW.cmd를 한 번 실행한 뒤 다시 게시해주세요.');
    }
    throw new Error(text.trim() || 'GitHub push에 실패했습니다.');
  }
  return { committed, origin, siteUrl:getSiteUrl() };
}

async function saveSiteConfig(body) {
  const map = body?.map || {};
  const cfg = {
    siteName: String(body?.siteName || 'SpaceTour').slice(0,80),
    map: {
      provider: map.provider === 'naver' ? 'naver' : 'kakao',
      kakaoJavaScriptKey: String(map.kakaoJavaScriptKey || '').trim(),
      naverNcpKeyId: String(map.naverNcpKeyId || '').trim()
    }
  };
  await writeFile(path.join(root,'site-config.json'), JSON.stringify(cfg,null,2) + '\n', 'utf8');
  execFileSync(process.execPath, ['scripts/build.mjs'], { stdio:'pipe', cwd });
  return { config:cfg, ...gitPublish('Update SpaceTour map settings') };
}

async function publishProject(body) {
  const slug = safeSlug(body.slug);
  if (!Array.isArray(body.files) || !body.files.length) throw new Error('게시할 파일이 없습니다.');
  const dir = path.join(contentRoot, slug);
  await rm(dir, { recursive:true, force:true });
  await mkdir(dir, { recursive:true });
  for (const item of body.files) {
    const name = safeFileName(item.name);
    const raw = String(item.base64 || '');
    if (!raw) throw new Error(`${name} 파일 데이터가 비어 있습니다.`);
    await writeFile(path.join(dir, name), Buffer.from(raw, 'base64'));
  }
  execFileSync(process.execPath, ['scripts/build.mjs'], { stdio:'pipe', cwd });
  return { slug, ...gitPublish(`Publish property: ${slug}`) };
}

async function apiHandler(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/publisher-status') {
    const origin = getOrigin();
    return sendJson(res, 200, {
      ok:true, localPublisher:true, git:hasGitRepo(), origin, siteUrl:getSiteUrl(),
      branch: git(['branch','--show-current'], { allowFail:true }).stdout?.trim() || ''
    });
  }
  if (req.method === 'POST' && url.pathname === '/api/settings') {
    try { return sendJson(res, 200, { ok:true, ...(await saveSiteConfig(await readJsonBody(req, 2 * 1024 * 1024))) }); }
    catch (e) { return sendJson(res, 500, { ok:false, error:e.message || String(e) }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/publish') {
    try { return sendJson(res, 200, { ok:true, ...(await publishProject(await readJsonBody(req))) }); }
    catch (e) { return sendJson(res, 500, { ok:false, error:e.message || String(e) }); }
  }
  return false;
}

http.createServer(async (req,res)=>{
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host}`);
    if (requestUrl.pathname.startsWith('/api/')) {
      const handled = await apiHandler(req,res,requestUrl);
      if (handled !== false) return;
      return sendJson(res,404,{ok:false,error:'API not found'});
    }
    let rel = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
    let file = path.resolve(root, rel);
    if (!file.startsWith(root)) throw new Error('invalid path');
    const s = await stat(file).catch(()=>null);
    if (s?.isDirectory()) file = path.join(file,'index.html');
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(data);
  } catch {
    const data = await readFile(path.join(root,'404.html'));
    res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(data);
  }
}).listen(port, ()=>console.log(`SpaceTour Publisher: http://localhost:${port}/admin.html`));
