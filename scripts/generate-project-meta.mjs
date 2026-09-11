import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (rel, fallback = {}) => {
  try { return JSON.parse(await fs.readFile(path.join(root, rel), 'utf8')); }
  catch { return fallback; }
};

const meta = await readJson('config/project-meta.json');
const site = await readJson('config/site-config.json');
const propsDir = path.join(root, 'data/properties');
let propertyFiles = [];
try { propertyFiles = (await fs.readdir(propsDir)).filter(x => x.endsWith('.json')); } catch {}
const properties = [];
for (const file of propertyFiles) {
  try { properties.push(JSON.parse(await fs.readFile(path.join(propsDir, file), 'utf8'))); } catch {}
}

const productName = meta.productName || site.siteName || 'SpaceTour';
const description = meta.description || meta.taglineKo || 'Interactive real-estate property viewer.';
const topics = [...new Set((meta.topics || []).map(v => String(v).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
const features = (meta.features || []).filter(Boolean);
const active = properties.filter(p => p.status === 'active').length;
const linkOnly = properties.filter(p => p.listingMode === 'link').length;
const has360 = properties.filter(p => (p.scenes || []).some(s => (s.media || []).some(m => m.type === 'panorama'))).length;

const readme = `# ${productName}\n\n${meta.taglineKo || description}\n\n${meta.taglineEn ? `> ${meta.taglineEn}\n\n` : ''}## Overview\n\n${description}\n\n이 프로젝트는 고객용 공개 Viewer와 관리자용 로컬 Studio를 분리하고, 매물 데이터를 정적 파일로 관리하여 GitHub Pages에 배포합니다.\n\n## Current content\n\n- 등록 데이터: **${properties.length}개**\n- 활성 매물: **${active}개**\n- 링크 전용: **${linkOnly}개**\n- 360° 포함: **${has360}개**\n\n## Features\n\n${features.map(x => `- ${x}`).join('\n')}\n\n## Daily workflow\n\n1. \`SpaceTour-Publisher.cmd\` 실행\n2. 로컬 Studio에서 매물 등록/수정\n3. 공개할 정보(가격, 동/호수, 주소, 지도 등) 체크\n4. 저장하고 게시\n5. README / About / Topics / 콘텐츠 인덱스 / Build / Git push / Pages 배포 자동 처리\n\n## Data structure\n\n- \`config/site-config.json\` — 사이트/지도 설정\n- \`config/project-meta.json\` — README/About/Topics 자동 생성 원본\n- \`data/properties/\` — 매물 데이터\n- \`data/templates/\` — 반복 사용 템플릿\n- \`data/collections/\` — 고객별 선택 공유 데이터\n- \`content/projects/\` — 실제 이미지/매물 콘텐츠 폴더\n- \`studio/\` — 로컬 관리자 (공개 배포 제외)\n- \`public/\` — 고객용 Viewer\n\n## GitHub metadata\n\nGitHub Repository의 Description, Website, Topics는 \`config/project-meta.json\`을 기준으로 Publisher가 자동 동기화합니다.\n\n## Build\n\n\`\`\`bash\nnpm run build\n\`\`\`\n\n## Deployment\n\n\`main\` 브랜치 push 또는 GitHub Actions 수동 실행 시 GitHub Pages로 배포합니다. 예약 Workflow도 설정할 수 있습니다.\n\n## Security\n\n관리자 Studio는 localhost에서만 실행되며 GitHub Pages 배포물에 포함되지 않습니다. 링크 전용 공개는 검색/목록 비노출 기능이며 강한 인증 보안과는 구분됩니다.\n`;

const topicsMd = `# GitHub Repository Metadata\n\n## About / Description\n\n${description}\n\n## Website\n\nGitHub Pages URL을 자동 설정합니다.\n\n## Topics\n\n${topics.map(t => `- ${t}`).join('\n')}\n\n## 자동화 원본\n\n\`config/project-meta.json\`을 수정한 뒤 게시하면 README와 Repository metadata가 함께 갱신됩니다.\n`;

const auto = {
  productName,
  description,
  topics,
  generatedAt: new Date().toISOString(),
  stats: { totalProperties: properties.length, active, linkOnly, with360: has360 }
};

await fs.writeFile(path.join(root, 'README.md'), readme, 'utf8');
await fs.writeFile(path.join(root, 'GITHUB_TOPICS.md'), topicsMd, 'utf8');
await fs.mkdir(path.join(root, '.github'), { recursive: true });
await fs.writeFile(path.join(root, '.github/repository-metadata.json'), JSON.stringify(auto, null, 2) + '\n', 'utf8');
console.log(`✓ README/About/Topics metadata generated (${properties.length} property data files)`);
