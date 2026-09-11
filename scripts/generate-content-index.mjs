import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/content');
const imageExt = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);
const videoExt = new Set(['.mp4', '.webm']);

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
  const project = {
    version: 1,
    id: slug,
    slug,
    title: info.title || humanize(slug),
    subtitle: info.subtitle || 'INTERACTIVE PROPERTY TOUR',
    status: info.status || '공급중',
    address: info.address || '',
    priceLabel: info.priceLabel || '',
    areaLabel: info.areaLabel || '',
    orientation: info.orientation || '',
    description: info.description || '',
    cover,
    floorPlan: floor ? { image: floor, alt: `${info.title || humanize(slug)} 평면도`, hotspots: [] } : undefined,
    media,
    mapUrl: info.mapUrl || undefined,
    roadviewUrl: info.roadviewUrl || undefined,
    contact: info.contact || undefined,
    updatedAt: info.updatedAt || new Date().toISOString(),
    generated: true,
  };
  await writeFile(path.join(folder, 'project.json'), JSON.stringify(project, null, 2));
  console.log(`• inferred project.json: ${slug}`);
  return project;
}

async function main() {
  const entries = await readdir(root, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const items = [];

  for (const slug of folders) {
    const folder = path.join(root, slug);
    const manifest = path.join(folder, 'project.json');
    const project = await exists(manifest) ? await readJson(manifest, null) : await inferProject(folder, slug);
    if (!project || !project.title || !project.slug) {
      console.warn(`! skipped invalid content folder: ${slug}`);
      continue;
    }
    if (!Array.isArray(project.media)) project.media = [];
    const cover = /^(https?:|data:)/.test(project.cover || '') ? project.cover : `content/${slug}/${project.cover || ''}`;
    items.push({
      slug: project.slug,
      title: project.title,
      subtitle: project.subtitle,
      status: project.status,
      cover,
      address: project.address,
      priceLabel: project.priceLabel,
      areaLabel: project.areaLabel,
      updatedAt: project.updatedAt,
      manifest: `content/${slug}/project.json`,
      mediaCount: project.media.length,
      hasPanorama: project.media.some((m) => m.type === 'panorama'),
      hasFloorPlan: Boolean(project.floorPlan?.image),
    });
  }

  items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  await writeFile(path.join(root, 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2));
  console.log(`✓ content/index.json generated (${items.length} project${items.length === 1 ? '' : 's'})`);
}

main().catch((error) => { console.error(error); process.exit(1); });
