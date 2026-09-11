import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/generate-content-index.mjs'], { stdio: 'inherit' });
const root = path.resolve('public');
const port = Number(process.env.PORT || 5173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
http.createServer(async (req,res)=>{
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    let file = path.resolve(root, rel);
    if (!file.startsWith(root)) throw new Error('invalid path');
    const s = await stat(file).catch(()=>null);
    if (s?.isDirectory()) file = path.join(file,'index.html');
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
  } catch { const data = await readFile(path.join(root,'404.html'));res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(data); }
}).listen(port, ()=>console.log(`SpaceTour: http://localhost:${port}/`));
