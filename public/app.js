import { PanoramaViewer } from './lib/panorama.js';
import { mountMap, mountKakaoRoadview, externalMapUrl } from './lib/maps.js';

const app = document.querySelector('#app');
const pageBase = new URL('./', location.href.split('#')[0]);
const url = p => /^(https?:|blob:|data:)/i.test(p || '') ? p : new URL(String(p || '').replace(/^\.\//,''), pageBase).href;
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

function toast(msg, type='info') {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
  el.dataset.type = type;
  el.textContent = msg;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.remove(), 3200);
}
function brand(){return `<a class="brand" href="#/"><span class="brand-mark">ST</span><span>SpaceTour</span><small>PROPERTY TOUR</small></a>`}
function topbar(){return `<header class="topbar"><div class="container topbar-inner">${brand()}<nav class="topnav"><a class="nav-link" href="#/">매물 보기</a><button class="icon-btn theme-btn" title="테마 전환" aria-label="테마 전환">◐</button></nav></div></header>`}
function footer(){return `<footer class="footer"><div class="container footer-inner">${brand()}<p>도면 · 사진 · 360° · 지도를 한 링크로 공유</p></div></footer>`}
function bindTheme(){const b=$('.theme-btn');if(!b)return;const saved=localStorage.getItem('spacetour-theme');if(saved)document.documentElement.dataset.theme=saved;b.onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';localStorage.setItem('spacetour-theme',dark?'light':'dark')}}
function state(message,error=false){return `<div class="state">${error?'⚠️':'<span class="spinner"></span>'}<b>${esc(error?'불러오지 못했습니다':'잠시만 기다려주세요')}</b><span>${esc(message)}</span></div>`}

async function loadIndex(){const r=await fetch(url('content/index.json'),{cache:'no-store'});if(!r.ok)throw Error(`콘텐츠 인덱스 오류 (${r.status})`);return r.json()}
async function loadSiteConfig(){
  try { const r=await fetch(url('site-config.json'),{cache:'no-store'}); if(r.ok)return r.json(); } catch {}
  return {siteName:'SpaceTour',map:{provider:'kakao',kakaoJavaScriptKey:'',naverNcpKeyId:''}};
}
async function loadProject(slug){
  const idx=await loadIndex();
  const item=idx.items.find(x=>x.slug===slug);
  if(!item)throw Error('요청한 매물을 찾을 수 없습니다.');
  const r=await fetch(url(item.manifest),{cache:'no-store'});
  if(!r.ok)throw Error('매물 데이터를 불러오지 못했습니다.');
  const p=await r.json();
  const folder=item.manifest.replace(/\/project\.json$/,'');
  const resolve=x=>!x||/^(https?:|blob:|data:)/i.test(x)?x:url(`${folder}/${x}`);
  p.cover=resolve(p.cover);
  if(p.floorPlan)p.floorPlan.image=resolve(p.floorPlan.image);
  p.media=(p.media||[]).map(m=>({...m,src:resolve(m.src),thumbnail:resolve(m.thumbnail)}));
  p.__folder=folder;
  return p;
}

function renderHome(){
  document.title='SpaceTour — 부동산 인터랙티브 공간 뷰어';
  app.innerHTML=`${topbar()}<main>
    <section class="hero"><div class="container hero-grid"><div class="hero-copy">
      <span class="pill">FLOOR PLAN · 360° · MAP · GITHUB PAGES</span>
      <h1>매물 설명을<br><em>한 링크로 끝내세요.</em></h1>
      <p>사진 목록만 보는 대신 평면도, 360° 공간, 위치 지도를 한 화면에서 탐색할 수 있습니다. 관심 있는 공간을 직접 눌러 확인해보세요.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="#properties">공급 매물 보기 →</a><a class="btn btn-ghost" href="#how">이용 방법</a></div>
      <div class="hero-stats"><div><b>1 CLICK</b><span>게시</span></div><div><b>360°</b><span>공간 투어</span></div><div><b>MAP</b><span>위치 탐색</span></div></div>
    </div><div class="hero-visual"><div class="mock"><div class="mock-head"><i></i><i></i><i></i><b>SpaceTour / 매물 상세</b></div><div class="mock-body"><div class="fake-room"><span class="fake-table"></span></div><div class="mock-plan"><div>거실<i></i></div><div>주방<i></i></div><div>안방<i></i></div></div></div></div><div class="float-card float-a"><b>평면도에서 공간 선택</b><span>사진 · 360° 바로 연결</span></div><div class="float-card float-b"><b>위치까지 한 번에</b><span>지도 · 로드뷰 확인</span></div></div></div></section>
    <section class="section container" id="properties"><div class="heading split"><div><span class="eyebrow">PROPERTY TOUR</span><h2>등록된 매물</h2><p>고객에게 그대로 공유할 수 있는 공간 링크입니다.</p></div><label class="search">⌕ <input id="search" placeholder="매물명·지역 검색" aria-label="매물 검색"></label></div><div id="property-list">${state('등록된 매물을 읽는 중…')}</div></section>
    <section class="section soft" id="how"><div class="container flow"><div class="heading"><span class="eyebrow">HOW TO EXPLORE</span><h2>집을 보듯 자연스럽게 둘러보세요.</h2><p>공간의 위치와 사진이 연결되어 있어 현재 어디를 보고 있는지 쉽게 이해할 수 있습니다.</p></div><div class="flow-cards"><article><span>01</span><h3>평면도 선택</h3><p>거실, 주방, 침실 등 궁금한 위치를 눌러봅니다.</p></article><article><span>02</span><h3>사진·360° 확인</h3><p>해당 위치의 실제 이미지와 360° 공간을 확인합니다.</p></article><article><span>03</span><h3>위치 확인</h3><p>지도와 로드뷰로 단지 위치와 주변 환경까지 살펴봅니다.</p></article></div></div></section>
  </main>${footer()}`;
  bindTheme();
  loadIndex().then(index=>{
    const draw=q=>{const items=index.items.filter(i=>!q||[i.title,i.subtitle,i.address].some(v=>String(v||'').toLowerCase().includes(q)));$('#property-list').innerHTML=items.length?`<div class="property-grid">${items.map(propertyCard).join('')}</div>`:`<div class="state"><b>검색 결과가 없습니다.</b><span>다른 검색어를 입력해보세요.</span></div>`};
    draw(''); $('#search').oninput=e=>draw(e.target.value.trim().toLowerCase());
  }).catch(e=>$('#property-list').innerHTML=state(e.message,true));
}
function propertyCard(i){return `<article class="property-card"><a class="property-thumb" href="#/view/${encodeURIComponent(i.slug)}"><img src="${esc(url(i.cover))}" alt="${esc(i.title)} 대표 이미지" loading="lazy"><div class="badges">${i.status?`<span>${esc(i.status)}</span>`:''}${i.hasPanorama?'<span>360°</span>':''}</div></a><div class="property-body"><p class="card-kicker">${esc(i.subtitle||'INTERACTIVE TOUR')}</p><h3>${esc(i.title)}</h3>${i.address?`<p class="address">⌖ ${esc(i.address)}</p>`:''}<div class="meta-row">${i.priceLabel?`<b>${esc(i.priceLabel)}</b>`:'<b>상세 보기</b>'}${i.areaLabel?`<span>${esc(i.areaLabel)}</span>`:''}<span>미디어 ${i.mediaCount}</span></div></div></article>`}

let activePano=null;
async function renderViewer(slug){
  document.title='SpaceTour · 공간 불러오는 중';
  app.innerHTML=`<main class="viewer"><div style="padding:30px">${state('공간 투어를 준비하는 중…')}</div></main>`;
  try{
    const [p,siteConfig]=await Promise.all([loadProject(slug),loadSiteConfig()]);
    document.title=`${p.title} · SpaceTour`;
    let active=p.media?.[0]?.id||'';
    const hasLocation=Number.isFinite(Number(p.location?.lat))&&Number.isFinite(Number(p.location?.lng));
    const mapLink=hasLocation?externalMapUrl(siteConfig.map||{},p.location):'';
    const shell=()=>`<main class="viewer"><header class="viewer-head"><a class="icon-btn" href="#/" aria-label="목록">←</a><div class="viewer-title"><small>${esc(p.subtitle||'INTERACTIVE TOUR')}</small><b>${esc(p.title)}</b></div><button class="icon-btn share-btn" aria-label="공유">↗</button></header><div class="viewer-grid"><section class="media-zone"><div class="stage" id="stage"></div><div class="media-strip">${(p.media||[]).map(m=>`<button class="thumb ${m.id===active?'active':''}" data-media="${esc(m.id)}"><div class="thumb-img">${m.type==='external3d'?'<div class="fallback">3D</div>':`<img src="${esc(m.thumbnail||m.src)}" alt="">`}${m.type==='panorama'?'<span class="thumb-tag">360°</span>':m.type==='external3d'?'<span class="thumb-tag">3D</span>':''}</div><span>${esc(m.title)}</span></button>`).join('')}</div></section><aside class="side"><section class="side-section"><span class="eyebrow">PROPERTY</span><div class="summary-title"><h1>${esc(p.title)}</h1>${p.status?`<span class="status">${esc(p.status)}</span>`:''}</div>${p.address?`<p class="summary-address">⌖ ${esc(p.address)}</p>`:''}<div class="metrics">${p.priceLabel?`<div><span>거래 조건</span><b>${esc(p.priceLabel)}</b></div>`:''}${p.areaLabel?`<div><span>면적</span><b>${esc(p.areaLabel)}</b></div>`:''}${p.orientation?`<div><span>방향</span><b>${esc(p.orientation)}</b></div>`:''}</div>${p.description?`<p class="desc">${esc(p.description)}</p>`:''}</section>${p.floorPlan?floorPlanHtml(p.floorPlan,active):''}${hasLocation?`<section class="side-section"><div class="panel-title"><div><span class="eyebrow">LOCATION</span><h3>위치와 주변 환경</h3></div></div><div id="viewer-map" class="viewer-map"><div class="map-loading">지도 불러오는 중…</div></div><div class="map-actions">${mapLink?`<a class="btn btn-ghost btn-sm" href="${esc(mapLink)}" target="_blank" rel="noreferrer">지도 앱에서 보기 ↗</a>`:''}${(siteConfig.map?.provider||'kakao')==='kakao'?'<button class="btn btn-ghost btn-sm" id="roadview-btn">로드뷰 보기</button>':''}</div><div id="roadview-wrap" class="roadview-wrap" hidden></div></section>`:''}</aside></div>${p.contact?.phone||p.contact?.message?`<div class="contactbar"><div><small>이 공간이 궁금하신가요?</small><b>${esc(p.contact?.name||'담당 중개사')}에게 문의하세요.</b></div><div class="contact-actions">${p.contact?.phone?`<a class="btn btn-ghost" href="tel:${esc(String(p.contact.phone).replace(/[^\d+]/g,''))}">전화</a>`:''}${p.contact?.message?`<a class="btn btn-primary" href="${esc(p.contact.message)}" target="_blank" rel="noreferrer">문의</a>`:''}</div></div>`:''}</main>`;
    const paint=()=>{
      activePano?.destroy();activePano=null;
      const m=p.media.find(x=>x.id===active)||p.media[0]; const st=$('#stage');
      if(!m){st.innerHTML='<div class="state"><b>등록된 미디어가 없습니다.</b></div>';return}
      if(m.type==='panorama'){st.innerHTML=`<div class="pano-host"></div><div class="stage-caption"><b>${esc(m.title)}</b><small>${esc(m.description||'드래그하여 360° 공간을 둘러보세요.')}</small></div>`;activePano=new PanoramaViewer($('.pano-host'),m.src,m.title)}
      else if(m.type==='photo'){st.innerHTML=`<img src="${esc(m.src)}" alt="${esc(m.title)}"><div class="stage-caption"><b>${esc(m.title)}</b>${m.description?`<small>${esc(m.description)}</small>`:''}</div>`}
      else if(m.type==='video'){st.innerHTML=`<video src="${esc(m.src)}" controls playsinline></video><div class="stage-caption"><b>${esc(m.title)}</b></div>`}
      else{st.innerHTML=`<iframe src="${esc(m.src)}" title="${esc(m.title)}" allow="fullscreen; xr-spatial-tracking" allowfullscreen></iframe><div class="stage-caption"><b>${esc(m.title)}</b><small>외부 3D 공간 투어</small></div>`}
      $$('.thumb').forEach(b=>b.classList.toggle('active',b.dataset.media===active));
      $$('.legend button,.hotspot').forEach(b=>b.classList.toggle('active',b.dataset.target===active));
    };
    app.innerHTML=shell(); paint();
    $$('.thumb').forEach(b=>b.onclick=()=>{active=b.dataset.media;paint()});
    $$('[data-target]').forEach(b=>b.onclick=()=>{if(b.dataset.target){active=b.dataset.target;paint()}});
    $('.share-btn').onclick=async()=>{const data={title:p.title,text:`${p.title} 공간 투어`,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);toast('링크를 복사했습니다.')}}catch{}};
    if(hasLocation){
      const host=$('#viewer-map');
      try{await mountMap(host,siteConfig.map||{},p.location,{zoom:16,level:3})}catch(e){host.innerHTML=`<div class="map-error"><b>지도를 표시하지 못했습니다.</b><span>${esc(e.message)}</span></div>`}
      const roadBtn=$('#roadview-btn');
      if(roadBtn)roadBtn.onclick=async()=>{const wrap=$('#roadview-wrap');if(!wrap.hidden){wrap.hidden=true;roadBtn.textContent='로드뷰 보기';return}wrap.hidden=false;wrap.innerHTML='<div class="map-loading">로드뷰 불러오는 중…</div>';roadBtn.textContent='로드뷰 닫기';try{wrap.innerHTML='';await mountKakaoRoadview(wrap,siteConfig.map||{},p.location)}catch(e){wrap.innerHTML=`<div class="map-error">${esc(e.message)}</div>`}};
    }
  }catch(e){app.innerHTML=`${topbar()}<main class="section container">${state(e.message,true)}</main>${footer()}`;bindTheme()}
}
function floorPlanHtml(plan,active){return `<section class="side-section"><div class="panel-title"><div><span class="eyebrow">PLAN</span><h3>평면도 탐색</h3></div><small>점을 눌러 이동</small></div><div class="plan-stage"><img src="${esc(plan.image)}" alt="${esc(plan.alt||'평면도')}">${(plan.hotspots||[]).map((s,i)=>`<button class="hotspot ${s.targetMediaId===active?'active':''}" style="left:${s.x*100}%;top:${s.y*100}%" data-target="${esc(s.targetMediaId||'')}" title="${esc(s.label)}">${i+1}</button>`).join('')}</div><div class="legend">${(plan.hotspots||[]).map((s,i)=>`<button data-target="${esc(s.targetMediaId||'')}" class="${s.targetMediaId===active?'active':''}">${i+1}. ${esc(s.label)}</button>`).join('')}</div></section>`}

function render404(){document.title='페이지를 찾을 수 없습니다 · SpaceTour';app.innerHTML=`${topbar()}<main class="notfound"><div><strong>404</strong><h1>이 공간은 찾을 수 없습니다.</h1><p>주소가 변경되었거나 아직 공개되지 않은 매물일 수 있습니다.</p><div class="hero-actions" style="justify-content:center"><a class="btn btn-primary" href="#/">홈으로</a><button class="btn btn-ghost" onclick="history.back()">이전 페이지</button></div></div></main>${footer()}`;bindTheme()}
function route(){activePano?.destroy();activePano=null;const h=location.hash.replace(/^#/,'')||'/';if(h==='/')renderHome();else{const m=h.match(/^\/view\/([^/?#]+)/);if(m)renderViewer(decodeURIComponent(m[1]));else render404()}window.scrollTo(0,0)}
window.addEventListener('hashchange',route);route();
