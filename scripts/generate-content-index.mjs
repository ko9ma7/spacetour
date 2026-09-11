import { readdir, readFile, writeFile, stat, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve(process.env.SPACETOUR_CONTENT_SOURCE || 'content/projects');
const outRoot = path.resolve(process.env.SPACETOUR_CONTENT_OUT || 'dist/content');
const imageExt = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);
const videoExt = new Set(['.mp4', '.webm']);
const safeAssetExt = new Set([...imageExt, ...videoExt]);

function humanize(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
function mediaTitle(file) {
  return path.basename(file, path.extname(file)).replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
async function exists(file) { try { await stat(file); return true; } catch { return false; } }
async function readJson(file, fallback = {}) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; } }

async function inferProject(folder, slug) {
  const names = (await readdir(folder)).filter((name) => !name.startsWith('.'));
  const info = await readJson(path.join(folder, 'info.json'), {});
  const images = names.filter((name) => imageExt.has(path.extname(name).toLowerCase()));
  const videos = names.filter((name) => videoExt.has(path.extname(name).toLowerCase()));
  const floor = images.find((name) => /^(floor[-_ ]?plan|floorplan|plan)\b/i.test(name));
  const coverCandidate = images.find((name) => /^(cover|hero|main)\b/i.test(name));
  const mediaFiles = [...images.filter((name) => name !== floor && name !== coverCandidate), ...videos].sort();
  const media = mediaFiles.map((name, index) => {
    const lower = name.toLowerCase();
    const ext = path.extname(lower);
    const type = videoExt.has(ext) ? 'video' : /^(pano|panorama|360)[-_ ]/i.test(lower) ? 'panorama' : 'photo';
    return { id: `media-${String(index + 1).padStart(2, '0')}`, type, title: mediaTitle(name), src: name };
  });
  const cover = coverCandidate || media.find((m) => m.type === 'photo')?.src || media.find((m) => m.type === 'panorama')?.src || images[0] || '';
  return {
    version: 2,
    id: slug,
    slug,
    title: info.title || humanize(slug),
    subtitle: info.subtitle || 'INTERACTIVE PROPERTY TOUR',
    status: info.status || '공급중',
    address: info.address || '',
    location: info.location || undefined,
    priceLabel: info.priceLabel || '',
    areaLabel: info.areaLabel || '',
    orientation: info.orientation || '',
    description: info.description || '',
    cover,
    floorPlan: floor ? { image: floor, alt: `${info.title || humanize(slug)} 평면도`, hotspots: info.hotspots || [] } : undefined,
    media,
    contact: info.contact || undefined,
    updatedAt: info.updatedAt || new Date().toISOString(),
    generated: true,
  };
}

function referencedAssets(project) {
  const set = new Set();
  const add = (v) => {
    if (!v || /^(https?:|data:)/i.test(v)) return;
    const name = path.basename(String(v));
    if (safeAssetExt.has(path.extname(name).toLowerCase())) set.add(name);
  };
  add(project.cover);
  add(project.floorPlan?.image);
  for (const media of project.media || []) add(media.src);
  return set;
}

async function copyProject(folder, outFolder, project) {
  await mkdir(outFolder, { recursive: true });
  for (const name of referencedAssets(project)) {
    const src = path.join(folder, name);
    if (await exists(src)) await copyFile(src, path.join(outFolder, name));
  }
  await writeFile(path.join(outFolder, 'project.json'), JSON.stringify(project, null, 2) + '\n', 'utf8');
}

async function main() {
  await mkdir(sourceRoot, { recursive: true });
  await mkdir(outRoot, { recursive: true });
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name).sort();
  const items = [];

  for (const slug of folders) {
    const folder = path.join(sourceRoot, slug);
    const manifest = path.join(folder, 'project.json');
    const project = await exists(manifest) ? await readJson(manifest, null) : await inferProject(folder, slug);
    if (!project || !project.title) {
      console.warn(`! skipped invalid content folder: ${slug}`);
      continue;
    }
    project.slug = project.slug || slug;
    project.id = project.id || project.slug;
    if (!Array.isArray(project.media)) project.media = [];
    await copyProject(folder, path.join(outRoot, project.slug), project);
    const cover = /^(https?:|data:)/.test(project.cover || '') ? project.cover : `content/${project.slug}/${project.cover || ''}`;
    items.push({
      slug: project.slug,
      title: project.title,
      subtitle: project.subtitle,
      status: project.status,
      cover,
      address: project.address || project.location?.address || '',
      priceLabel: project.priceLabel,
      areaLabel: project.areaLabel,
      updatedAt: project.updatedAt,
      manifest: `content/${project.slug}/project.json`,
      mediaCount: project.media.length,
      hasPanorama: project.media.some((m) => m.type === 'panorama'),
      hasFloorPlan: Boolean(project.floorPlan?.image),
    });
  }

  items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  await writeFile(path.join(outRoot, 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2) + '\n', 'utf8');
  console.log(`✓ dist/content/index.json generated (${items.length} project${items.length === 1 ? '' : 's'})`);
}

main().catch((error) => { console.error(error); process.exit(1); });
