import { PanoramaViewer } from './lib/panorama.js';
import { makeZip } from './lib/zip.js';
import { imageDimensions, toWebp } from './lib/image.js';
import { mountMap, mountKakaoRoadview, searchLocations, externalMapUrl } from './lib/maps.js';

const app = document.querySelector('#app');
const pageBase = new URL('./', location.href.split('#')[0]);
const url = p => /^(https?:|blob:|data:)/i.test(p || '') ? p : new URL(String(p || '').replace(/^\.\//,''), pageBase).href;
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slugify = v => String(v || '').trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'');
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
function brand(){return `<a class="brand" href="#/"><span class="brand-mark">ST</span><span>SpaceTour</span><small>PUBLISHER</small></a>`}
function topbar(){return `<header class="topbar"><div class="container topbar-inner">${brand()}<nav class="topnav"><a class="nav-link" href="#/">매물</a><a class="nav-link" href="./admin.html">Admin</a><button class="icon-btn theme-btn" title="테마 전환" aria-label="테마 전환">◐</button></nav></div></header>`}
function footer(){return `<footer class="footer"><div class="container footer-inner">${brand()}<p>도면 · 사진 · 360° · 지도를 한 링크로 공유</p></div></footer>`}
function bindTheme(){const b=$('.theme-btn');if(!b)return;const saved=localStorage.getItem('spacetour-theme');if(saved)document.documentElement.dataset.theme=saved;b.onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';localStorage.setItem('spacetour-theme',dark?'light':'dark')}}
function state(message,error=false){return `<div class="state">${error?'⚠️':'<span class="spinner"></span>'}<b>${esc(error?'불러오지 못했습니다':'잠시만 기다려주세요')}</b><span>${esc(message)}</span></div>`}

async function loadIndex(){const r=await fetch(url('content/index.json'),{cache:'no-store'});if(!r.ok)throw Error(`콘텐츠 인덱스 오류 (${r.status})`);return r.json()}
async function loadSiteConfig(){
  try { const r=await fetch(url('site-config.json'),{cache:'no-store'}); if(r.ok)return r.json(); } catch {}
  return {siteName:'SpaceTour',map:{provider:'kakao',kakaoJavaScriptKey:'',naverNcpKeyId:''}};
}
async function detectPublisher(){
  try { const r=await fetch('/api/publisher-status',{cache:'no-store'}); if(!r.ok)return null; const j=await r.json(); return j.localPublisher?j:null; } catch { return null; }
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
      <p>사진을 순서대로 보내는 대신, 고객이 평면도와 지도에서 직접 공간을 탐색하게 합니다. 관리자에서는 매물 정보와 사진만 넣고 <b>게시하기</b>를 누르면 됩니다.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="./admin.html">매물 등록하기 →</a><a class="btn btn-ghost" href="#properties">등록 매물 보기</a></div>
      <div class="hero-stats"><div><b>1 CLICK</b><span>게시</span></div><div><b>360°</b><span>공간 투어</span></div><div><b>MAP</b><span>위치 탐색</span></div></div>
    </div><div class="hero-visual"><div class="mock"><div class="mock-head"><i></i><i></i><i></i><b>SpaceTour / 매물 상세</b></div><div class="mock-body"><div class="fake-room"><span class="fake-table"></span></div><div class="mock-plan"><div>거실<i></i></div><div>주방<i></i></div><div>안방<i></i></div></div></div></div><div class="float-card float-a"><b>지도에서 위치 선택</b><span>주소 · 좌표 자동 저장</span></div><div class="float-card float-b"><b>게시하기</b><span>저장 · build · push 자동</span></div></div></div></section>
    <section class="section container" id="properties"><div class="heading split"><div><span class="eyebrow">PROPERTY TOUR</span><h2>등록된 매물</h2><p>고객에게 그대로 공유할 수 있는 공간 링크입니다.</p></div><label class="search">⌕ <input id="search" placeholder="매물명·지역 검색" aria-label="매물 검색"></label></div><div id="property-list">${state('등록된 매물을 읽는 중…')}</div></section>
    <section class="section soft"><div class="container flow"><div class="heading"><span class="eyebrow">SIMPLE WORKFLOW</span><h2>운영은 세 단계면 충분합니다.</h2><p>평소에는 Git, CMD, JSON을 직접 다룰 필요가 없습니다.</p></div><div class="flow-cards"><article><span>01</span><h3>Admin 열기</h3><p><code>SpaceTour-Publisher.cmd</code>를 더블클릭합니다.</p></article><article><span>02</span><h3>내용 등록</h3><p>주소는 지도에서 찾고, 사진과 평면도는 드래그해 올립니다.</p></article><article><span>03</span><h3>게시하기</h3><p>버튼 하나가 파일 저장, 빌드, GitHub push를 처리합니다.</p></article></div></div></section>
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

function blobToBase64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error||new Error('파일 변환 실패'));r.readAsDataURL(blob)})}

class Studio {
  constructor(){
    this.meta={title:'',slug:'',subtitle:'APARTMENT · INTERACTIVE TOUR',status:'공급중',address:'',placeName:'',lat:'',lng:'',priceLabel:'',areaLabel:'',orientation:'',description:'',contactName:'',contactPhone:'',contactMessage:'',...this.readDraft()};
    this.media=[]; this.coverId=''; this.planFile=null; this.planPreview=''; this.hotspots=[]; this.tab='info'; this.busy=false; this.publisher=null; this.siteConfig={siteName:'SpaceTour',map:{provider:'kakao',kakaoJavaScriptKey:'',naverNcpKeyId:''}}; this.projects=[]; this.mapController=null;
  }
  async init(){
    const [cfg,pub,index]=await Promise.all([loadSiteConfig(),detectPublisher(),loadIndex().catch(()=>({items:[]}))]);
    this.siteConfig=cfg||this.siteConfig; this.publisher=pub; this.projects=index.items||[]; this.render();
  }
  readDraft(){try{return JSON.parse(localStorage.getItem('spacetour-admin-draft')||'{}')}catch{return {}}}
  saveDraft(){localStorage.setItem('spacetour-admin-draft',JSON.stringify(this.meta))}
  nav(k,n,t,s){return `<button class="${this.tab===k?'active':''}" data-tab="${k}"><span class="nav-num">${n}</span><div><b>${t}</b><small>${s}</small></div></button>`}
  head(n,t,d){return `<header class="panel-head"><span class="panel-step">${n}</span><div><h1>${t}</h1><p>${d}</p></div></header>`}
  foot(next,label){return `<footer class="panel-foot"><small>입력 내용은 브라우저에 자동 임시저장됩니다.</small><button class="btn btn-primary" data-next="${next}">${label} →</button></footer>`}
  field(k,label,ph='',full=false,type='input'){const v=esc(this.meta[k]||'');return `<label class="field ${full?'full':''}"><span>${label}</span>${type==='textarea'?`<textarea data-meta="${k}" rows="4" placeholder="${esc(ph)}">${v}</textarea>`:`<input data-meta="${k}" value="${v}" placeholder="${esc(ph)}">`}</label>`}
  render(){
    document.title='SpaceTour Publisher'; activePano?.destroy(); this.mapController=null;
    const publishLabel=this.publisher?'저장하고 게시':'내보내기';
    app.innerHTML=`<main class="studio"><header class="studio-head"><div class="studio-left"><a class="icon-btn" href="#/">←</a>${brand()}<span class="studio-tag">ADMIN</span></div><div class="studio-actions"><span class="publisher-state ${this.publisher?'online':'offline'}">${this.publisher?'● 로컬 Publisher 연결됨':'○ 정적 모드'}</span><select id="existing-project" class="project-select"><option value="">기존 매물 불러오기</option>${this.projects.map(x=>`<option value="${esc(x.slug)}">${esc(x.title)}</option>`).join('')}</select><button class="btn btn-primary btn-sm" id="quick-publish">${this.busy?'처리 중…':publishLabel}</button></div></header><div class="studio-body"><aside class="studio-nav">${this.nav('info','1','매물 정보','이름·가격·문의')}${this.nav('location','2','위치 / 지도','검색해서 선택')}${this.nav('media','3','사진 / 360°',`${this.media.length}개 콘텐츠`)}${this.nav('plan','4','평면도',`${this.hotspots.length}개 포인트`)}${this.nav('publish','5','미리보기 / 게시','버튼 한 번')}<button class="settings ${this.tab==='settings'?'active':''}" data-tab="settings"><span class="nav-num">⚙</span><div><b>지도 설정</b><small>API 키 · 지도사</small></div></button><button class="reset" data-action="reset"><span class="nav-num">＋</span><div><b>새 매물</b><small>현재 편집 비우기</small></div></button></aside><section class="workspace">${this.panel()}</section></div></main>`;
    this.bindCommon(); this.bindPanel();
  }
  panel(){if(this.tab==='location')return this.locationPanel();if(this.tab==='media')return this.mediaPanel();if(this.tab==='plan')return this.planPanel();if(this.tab==='publish')return this.publishPanel();if(this.tab==='settings')return this.settingsPanel();return this.infoPanel()}
  infoPanel(){return `<div class="panel">${this.head('01','매물 정보','고객 화면에 필요한 정보만 입력합니다. 폴더명이나 JSON은 자동으로 처리합니다.')}<div class="form-grid">${this.field('title','매물명 *','예: 성수 리버뷰 84A')}${this.field('status','상태','공급중')}${this.field('priceLabel','거래 조건','매매 18억 5,000')}${this.field('areaLabel','면적','전용 84.9㎡')}${this.field('orientation','방향','남동향')}${this.field('subtitle','짧은 분류','APARTMENT · 84A')}${this.field('description','매물 소개','조망, 리모델링, 옵션, 입주 가능일 등을 적어주세요.',true,'textarea')}</div><div class="divider"></div><div class="section-label"><b>문의 정보</b><span>고객 화면 하단의 상담 버튼에 사용됩니다.</span></div><div class="form-grid">${this.field('contactName','담당자','김중개 실장')}${this.field('contactPhone','전화','010-0000-0000')}${this.field('contactMessage','카카오톡/문의 링크','https://open.kakao.com/...',true)}</div>${this.foot('location','위치 선택')}</div>`}
  locationPanel(){
    const configured=this.mapReady(); const provider=(this.siteConfig.map?.provider||'kakao')==='naver'?'네이버':'카카오';
    return `<div class="panel">${this.head('02','지도에서 위치 선택','주소를 직접 정확하게 입력할 필요가 없습니다. 아파트명이나 건물명을 검색하거나 지도에서 위치를 클릭하세요.')}<div class="map-config-strip"><div><span>사용 지도</span><b>${provider} 지도</b><small>${configured?'API 설정 완료':'API 키 설정이 필요합니다.'}</small></div><button class="btn btn-ghost btn-sm" data-tab="settings">⚙ 지도 API 설정</button></div>${configured?`<div class="location-search"><input id="place-query" placeholder="아파트명, 건물명 또는 주소 검색" value="${esc(this.meta.placeName||this.meta.address||'')}"><button class="btn btn-primary" id="place-search">검색</button></div><div id="location-results" class="location-results"></div><div id="admin-map" class="admin-map"><div class="map-loading">지도 준비 중…</div></div>`:`<div class="setup-empty"><span>🗺️</span><h3>지도 API를 한 번만 설정해주세요.</h3><p>카카오 JavaScript 키 또는 네이버 Key ID를 입력하면 이후 매물에서는 검색과 클릭만으로 주소와 좌표가 저장됩니다.</p><button class="btn btn-primary" data-tab="settings">지도 설정 열기</button></div>`}<div class="location-summary"><div><span>선택된 장소</span><b id="selected-place">${esc(this.meta.placeName||'아직 선택되지 않음')}</b></div><div><span>주소</span><b id="selected-address">${esc(this.meta.address||'-')}</b></div><div><span>좌표</span><b id="selected-coords">${this.meta.lat&&this.meta.lng?`${esc(this.meta.lat)}, ${esc(this.meta.lng)}`:'-'}</b></div></div><details class="advanced"><summary>주소를 직접 수정해야 하는 경우</summary><div class="form-grid">${this.field('address','표시 주소','서울 성동구 …',true)}${this.field('lat','위도','37.5665')}${this.field('lng','경도','126.9780')}</div></details>${this.foot('media','사진 등록')}</div>`
  }
  mediaPanel(){return `<div class="panel">${this.head('03','사진과 360° 등록','여러 파일을 한 번에 선택하세요. 2:1 이미지는 360° 후보로 자동 분류하고 게시할 때 WebP로 줄입니다.')}<div class="upload-row"><label class="upload-box primary-upload"><b>＋ 사진 / 360° / 동영상 한꺼번에 추가<span>JPG · PNG · WEBP · MP4 · 여러 파일 선택 가능</span></b><input id="media-input" type="file" accept="image/*,video/mp4,video/webm" multiple></label><button class="action-box" id="add-3d"><b>▣ 3D 투어 연결<span>Matterport 등 HTTPS Embed URL</span></b></button></div>${this.media.length?`<div class="media-grid">${this.media.map(m=>`<article class="media-edit"><div class="media-edit-img">${m.preview?`<img src="${esc(m.preview)}" alt="">`:'<div class="fallback">3D</div>'}<span class="chip">${m.type==='panorama'?'360°':m.type==='external3d'?'3D':m.type.toUpperCase()}</span>${this.coverId===m.id?'<span class="chip cover">대표</span>':''}</div><div class="media-edit-body"><input class="mini-input" data-title="${m.id}" value="${esc(m.title)}"><div class="media-controls">${m.type!=='external3d'?`<select data-type="${m.id}"><option value="photo" ${m.type==='photo'?'selected':''}>일반 사진</option><option value="panorama" ${m.type==='panorama'?'selected':''}>360°</option><option value="video" ${m.type==='video'?'selected':''}>동영상</option></select>`:'<span style="flex:1"></span>'}<button class="text-btn" data-cover="${m.id}">대표 지정</button><button class="del" data-del="${m.id}" title="삭제">×</button></div></div></article>`).join('')}</div>`:'<div class="empty-editor"><b>사진을 여기에 추가해주세요.</b><span>거실 · 주방 · 안방 · 욕실 순으로 올리면 고객이 보기 편합니다.</span></div>'}<div class="info-box"><b>자동 용량 절감</b><br>일반 사진은 최대 2200px, 360°는 최대 4096px WebP로 변환합니다. 원본 파일은 변경하지 않습니다.</div>${this.foot('plan','평면도 연결')}</div>`}
  planPanel(){return `<div class="panel">${this.head('04','평면도 연결','도면을 올리고 방 위치를 클릭한 뒤 연결할 사진이나 360°를 선택하세요.')}${!this.planPreview?`<label class="plan-upload"><b>＋ 평면도 이미지 선택</b><span>JPG · PNG · WEBP</span><input id="plan-input" type="file" accept="image/*"></label>`:`<div class="plan-layout"><div><div class="plan-tip">① 도면 클릭 → ② 오른쪽에서 이름 입력 → ③ 사진/360° 선택</div><div class="plan-edit-stage" id="plan-stage"><img src="${esc(this.planPreview)}" alt="편집 중인 평면도">${this.hotspots.map((h,i)=>`<button class="hotspot" style="left:${h.x*100}%;top:${h.y*100}%">${i+1}</button>`).join('')}</div><label class="replace-plan">평면도 교체<input id="plan-input" type="file" accept="image/*"></label></div><div class="hotspot-list"><h3>공간 연결 ${this.hotspots.length}</h3>${this.hotspots.length?this.hotspots.map((h,i)=>`<div class="hot-row"><span class="hot-num">${i+1}</span><div class="hot-fields"><input class="mini-input" data-hot-label="${h.id}" value="${esc(h.label)}" placeholder="예: 거실"><select data-hot-target="${h.id}"><option value="">사진/360° 선택</option>${this.media.map(m=>`<option value="${m.id}" ${m.id===h.targetMediaId?'selected':''}>${esc(m.title)} · ${m.type==='panorama'?'360°':m.type}</option>`).join('')}</select></div><button class="del" data-hot-del="${h.id}">×</button></div>`).join(''):'<div class="empty-editor" style="min-height:120px"><span>도면의 거실이나 방 위치를 클릭하세요.</span></div>'}</div></div>`}${this.foot('publish','미리보기 / 게시')}</div>`}
  publishPanel(){
    const s={photo:this.media.filter(m=>m.type==='photo').length,pano:this.media.filter(m=>m.type==='panorama').length,d3:this.media.filter(m=>m.type==='external3d').length};
    const ready=!!this.publisher;
    return `<div class="panel">${this.head('05','확인하고 게시하기','로컬 Publisher로 열었으면 Git 명령이나 폴더 선택 없이 이 화면에서 바로 GitHub에 반영됩니다.')}<div class="publish-card"><span class="ready">✓</span><div><small>PROPERTY READY</small><h2>${esc(this.meta.title||'매물명을 입력해주세요')}</h2><p>${esc(this.meta.address||'위치를 아직 지정하지 않았습니다.')}</p></div></div><div class="publish-stats"><div><b>${s.photo}</b><span>사진</span></div><div><b>${s.pano}</b><span>360°</span></div><div><b>${s.d3}</b><span>3D</span></div><div><b>${this.hotspots.length}</b><span>도면 연결</span></div></div>${ready?`<div class="one-click-publish"><div><span class="publish-badge">LOCAL PUBLISHER</span><h3>GitHub에 바로 게시</h3><p>이미지 최적화 → 매물 폴더 저장 → index 생성 → build 검사 → commit → push를 자동 처리합니다.</p>${this.publisher.origin?`<small>${esc(this.publisher.origin)}</small>`:''}</div><button class="btn btn-primary publish-main" id="publish-now">${this.busy?'게시 처리 중…':'저장하고 게시하기'}</button></div>`:`<div class="setup-empty compact"><span>⚠️</span><h3>지금 페이지는 정적 Admin입니다.</h3><p>PC의 <b>SpaceTour-Publisher.cmd</b>를 실행하면 이 버튼이 “GitHub에 바로 게시”로 바뀝니다.</p></div>`}<details class="advanced"><summary>백업 / 고급 방식</summary><div class="publish-options"><article><h3>매물 폴더로 저장</h3><p>브라우저에서 폴더를 직접 선택해 파일만 저장합니다.</p><button class="btn btn-ghost" id="save-folder">폴더에 저장</button></article><article><h3>ZIP 백업</h3><p>매물 파일을 ZIP으로 내려받아 별도 보관할 수 있습니다.</p><button class="btn btn-ghost" id="save-zip">ZIP 만들기</button></article></div></details></div>`
  }
  settingsPanel(){
    const m=this.siteConfig.map||{}; const pub=!!this.publisher;
    const current=location.origin; const pages=this.publisher?.siteUrl||'https://USERNAME.github.io/REPOSITORY/'; let pagesDomain='https://USERNAME.github.io'; try{pagesDomain=new URL(pages).origin}catch{}
    return `<div class="panel">${this.head('⚙','지도 API 설정','한 번 설정하면 모든 매물에서 같은 지도를 사용합니다. Client Secret이나 비밀번호는 입력하지 않습니다.')}<div class="settings-grid"><label class="provider-card ${m.provider!=='naver'?'selected':''}"><input type="radio" name="provider" value="kakao" ${m.provider!=='naver'?'checked':''}><div><b>카카오 지도</b><span>장소명 검색이 편하고 로드뷰까지 연결</span></div></label><label class="provider-card ${m.provider==='naver'?'selected':''}"><input type="radio" name="provider" value="naver" ${m.provider==='naver'?'checked':''}><div><b>네이버 지도</b><span>Dynamic Map + 주소/좌표 검색</span></div></label></div><div class="api-fields"><label class="field"><span>카카오 JavaScript Key</span><input id="kakao-key" value="${esc(m.kakaoJavaScriptKey||'')}" placeholder="JavaScript Key만 입력"><small>REST API Key가 아니라 JavaScript Key입니다.</small></label><label class="field"><span>네이버 ncpKeyId</span><input id="naver-key" value="${esc(m.naverNcpKeyId||'')}" placeholder="Maps Client ID / ncpKeyId"><small>Client Secret은 입력하지 마세요.</small></label></div><div class="domain-guide"><h3>지도 서비스에 등록할 웹 주소</h3><p>지도사 콘솔에서 아래 주소를 “웹 서비스 URL / JavaScript SDK 도메인”으로 등록해야 합니다.</p><div class="copy-row"><code>http://localhost:5173</code><button class="text-btn copy" data-copy="http://localhost:5173">복사</button></div><div class="copy-row"><code>${esc(pagesDomain)}</code><button class="text-btn copy" data-copy="${esc(pagesDomain)}">복사</button></div></div>${pub?`<button class="btn btn-primary settings-save" id="save-settings">지도 설정 저장 + GitHub 반영</button>`:`<div class="info-box"><b>로컬 Publisher에서 설정해주세요.</b><br>이 페이지를 ${esc(current)}에서 보고 있다면 SpaceTour-Publisher.cmd를 실행해 다시 열어주세요.</div>`}</div>`
  }
  mapReady(){const m=this.siteConfig.map||{};return m.provider==='naver'?!!m.naverNcpKeyId:!!m.kakaoJavaScriptKey}
  bindCommon(){
    $$('[data-tab]').forEach(b=>b.onclick=()=>{this.tab=b.dataset.tab;this.render()});
    $('[data-action=reset]')?.addEventListener('click',()=>this.reset());
    $('#quick-publish')?.addEventListener('click',()=>this.publisher?this.publishNow():this.exportZip());
    $('#existing-project')?.addEventListener('change',e=>{if(e.target.value)this.loadExisting(e.target.value)});
  }
  bindPanel(){
    $$('[data-next]').forEach(b=>b.onclick=()=>{this.tab=b.dataset.next;this.render()});
    $$('[data-meta]').forEach(i=>i.oninput=e=>{const k=e.target.dataset.meta;let v=e.target.value;if(k==='slug')v=slugify(v);this.meta[k]=v;if(k==='title'&&!this.meta.slug)this.meta.slug=slugify(v);this.saveDraft()});
    if(this.tab==='location')this.bindLocation();
    if(this.tab==='media')this.bindMedia();
    if(this.tab==='plan')this.bindPlan();
    if(this.tab==='publish'){ $('#publish-now')?.addEventListener('click',()=>this.publishNow()); $('#save-folder')?.addEventListener('click',()=>this.saveFolder()); $('#save-zip')?.addEventListener('click',()=>this.exportZip()); }
    if(this.tab==='settings')this.bindSettings();
  }
  async bindLocation(){
    if(!this.mapReady())return;
    const host=$('#admin-map');
    try{
      this.mapController=await mountMap(host,this.siteConfig.map||{},this.meta,{onChange:p=>this.selectLocation({...p,name:''})});
    }catch(e){host.innerHTML=`<div class="map-error"><b>지도를 표시하지 못했습니다.</b><span>${esc(e.message)}</span></div>`}
    const runSearch=async()=>{
      const q=$('#place-query').value.trim(); if(!q)return toast('아파트명이나 주소를 입력해주세요.');
      const results=$('#location-results'); results.innerHTML='<div class="searching">검색 중…</div>';
      try{const items=await searchLocations(this.siteConfig.map||{},q);results.innerHTML=items.length?items.map((x,i)=>`<button data-result="${i}"><b>${esc(x.name)}</b><span>${esc(x.address)}</span></button>`).join(''):'<div class="searching">검색 결과가 없습니다. 주소를 조금 더 정확히 입력해보세요.</div>';$$('[data-result]',results).forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.result)];this.selectLocation(x);this.mapController?.setPosition(x.lat,x.lng);results.innerHTML='';});}catch(e){results.innerHTML=`<div class="searching error">${esc(e.message)}</div>`}
    };
    $('#place-search').onclick=runSearch; $('#place-query').onkeydown=e=>{if(e.key==='Enter')runSearch()};
  }
  selectLocation(x){
    this.meta.placeName=x.name||this.meta.placeName||''; this.meta.address=x.address||this.meta.address||''; this.meta.lat=Number(x.lat).toFixed(7); this.meta.lng=Number(x.lng).toFixed(7); this.saveDraft();
    $('#selected-place')&&( $('#selected-place').textContent=this.meta.placeName||'지도에서 선택한 위치');
    $('#selected-address')&&( $('#selected-address').textContent=this.meta.address||'-');
    $('#selected-coords')&&( $('#selected-coords').textContent=`${this.meta.lat}, ${this.meta.lng}`);
    const addr=$('[data-meta=address]'); if(addr)addr.value=this.meta.address;
    const lat=$('[data-meta=lat]'); if(lat)lat.value=this.meta.lat;
    const lng=$('[data-meta=lng]'); if(lng)lng.value=this.meta.lng;
  }
  bindSettings(){
    $$('input[name=provider]').forEach(r=>r.onchange=()=>{this.siteConfig.map.kakaoJavaScriptKey=$('#kakao-key')?.value.trim()||this.siteConfig.map.kakaoJavaScriptKey||'';this.siteConfig.map.naverNcpKeyId=$('#naver-key')?.value.trim()||this.siteConfig.map.naverNcpKeyId||'';this.siteConfig.map.provider=r.value;this.render()});
    $$('.copy').forEach(b=>b.onclick=async()=>{await navigator.clipboard.writeText(b.dataset.copy);toast('주소를 복사했습니다.')});
    $('#save-settings')?.addEventListener('click',async()=>{
      const provider=$('input[name=provider]:checked')?.value||'kakao';
      const config={siteName:'SpaceTour',map:{provider,kakaoJavaScriptKey:$('#kakao-key').value.trim(),naverNcpKeyId:$('#naver-key').value.trim()}};
      if(provider==='kakao'&&!config.map.kakaoJavaScriptKey)return toast('카카오 JavaScript Key를 입력해주세요.','error');
      if(provider==='naver'&&!config.map.naverNcpKeyId)return toast('네이버 ncpKeyId를 입력해주세요.','error');
      this.busy=true; $('#save-settings').disabled=true; $('#save-settings').textContent='저장 중…';
      try{const r=await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'설정 저장 실패');this.siteConfig=j.config;toast('지도 설정을 저장하고 GitHub에 반영했습니다.','success');this.tab='location';this.render()}catch(e){toast(e.message,'error')}finally{this.busy=false}
    });
  }
  bindMedia(){
    const inp=$('#media-input');
    inp.onchange=async()=>{for(const file of [...inp.files]){let type=file.type.startsWith('video/')?'video':'photo';if(file.type.startsWith('image/')){try{const d=await imageDimensions(file);if(d.width/d.height>=1.8)type='panorama'}catch{}}this.media.push({id:uid(),title:file.name.replace(/\.[^.]+$/,''),type,file,preview:URL.createObjectURL(file)})}if(!this.coverId&&this.media[0])this.coverId=this.media[0].id;this.render()};
    $('#add-3d').onclick=()=>{const x=prompt('Matterport 등 HTTPS 임베드 URL을 입력하세요.');if(!x)return;if(!/^https:\/\//i.test(x))return toast('HTTPS 주소만 등록할 수 있습니다.');this.media.push({id:uid(),title:'3D 공간 투어',type:'external3d',externalUrl:x,preview:''});this.render()};
    $$('[data-title]').forEach(i=>i.oninput=e=>{const m=this.media.find(x=>x.id===e.target.dataset.title);if(m)m.title=e.target.value});
    $$('[data-type]').forEach(s=>s.onchange=e=>{const m=this.media.find(x=>x.id===e.target.dataset.type);if(m)m.type=e.target.value});
    $$('[data-cover]').forEach(b=>b.onclick=()=>{this.coverId=b.dataset.cover;this.render()});
    $$('[data-del]').forEach(b=>b.onclick=()=>{const id=b.dataset.del;const m=this.media.find(x=>x.id===id);if(m?.preview?.startsWith('blob:'))URL.revokeObjectURL(m.preview);this.media=this.media.filter(x=>x.id!==id);this.hotspots=this.hotspots.map(h=>h.targetMediaId===id?{...h,targetMediaId:''}:h);if(this.coverId===id)this.coverId=this.media[0]?.id||'';this.render()});
  }
  bindPlan(){
    const inp=$('#plan-input'); if(inp)inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;if(this.planPreview?.startsWith('blob:'))URL.revokeObjectURL(this.planPreview);this.planFile=f;this.planPreview=URL.createObjectURL(f);this.hotspots=[];this.render()};
    const st=$('#plan-stage'); if(st)st.onclick=e=>{if(e.target.closest('button'))return;const r=st.getBoundingClientRect();this.hotspots.push({id:uid(),x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,label:`공간 ${this.hotspots.length+1}`,targetMediaId:this.media[0]?.id||''});this.render()};
    $$('[data-hot-label]').forEach(i=>i.oninput=e=>{const h=this.hotspots.find(x=>x.id===e.target.dataset.hotLabel);if(h)h.label=e.target.value});
    $$('[data-hot-target]').forEach(s=>s.onchange=e=>{const h=this.hotspots.find(x=>x.id===e.target.dataset.hotTarget);if(h)h.targetMediaId=e.target.value});
    $$('[data-hot-del]').forEach(b=>b.onclick=()=>{this.hotspots=this.hotspots.filter(x=>x.id!==b.dataset.hotDel);this.render()});
  }
  async loadExisting(slug){
    if(this.busy)return; this.busy=true; toast('기존 매물을 불러오는 중…');
    try{
      const p=await loadProject(slug);
      this.meta={title:p.title||'',slug:p.slug||slug,subtitle:p.subtitle||'',status:p.status||'',address:p.address||p.location?.address||'',placeName:p.location?.placeName||'',lat:p.location?.lat??'',lng:p.location?.lng??'',priceLabel:p.priceLabel||'',areaLabel:p.areaLabel||'',orientation:p.orientation||'',description:p.description||'',contactName:p.contact?.name||'',contactPhone:p.contact?.phone||'',contactMessage:p.contact?.message||''};
      this.media=[];
      for(const m of p.media||[]){
        if(m.type==='external3d'){this.media.push({id:m.id,title:m.title,type:m.type,externalUrl:m.src,preview:''});continue}
        try{const r=await fetch(m.src);const blob=await r.blob();const file=new File([blob],m.src.split('/').pop()||'media',{type:blob.type});this.media.push({id:m.id,title:m.title,type:m.type,file,preview:URL.createObjectURL(file)})}catch{}
      }
      this.coverId=(p.media||[]).find(m=>m.src===p.cover)?.id||this.media[0]?.id||'';
      this.planFile=null;this.planPreview='';
      if(p.floorPlan?.image){try{const r=await fetch(p.floorPlan.image);const blob=await r.blob();this.planFile=new File([blob],'floorplan',{type:blob.type});this.planPreview=URL.createObjectURL(this.planFile)}catch{}}
      this.hotspots=p.floorPlan?.hotspots||[]; this.saveDraft(); this.tab='info'; toast('기존 매물을 불러왔습니다.','success');
    }catch(e){toast(e.message,'error')}finally{this.busy=false;this.render()}
  }
  async buildPack(){
    if(!this.meta.title.trim())throw Error('매물명을 입력해주세요.');
    const slug=slugify(this.meta.slug||this.meta.title)||`property-${Date.now()}`;
    if(!this.media.length)throw Error('사진 또는 360° 콘텐츠를 한 개 이상 등록해주세요.');
    const files=new Map(),media=[],byId=new Map();let pi=1,ni=1,vi=1;
    for(const m of this.media){
      if(m.type==='external3d'){media.push({id:m.id,type:'external3d',title:m.title,src:m.externalUrl||''});byId.set(m.id,{external:m.externalUrl});continue}
      if(!m.file)continue;
      if(m.type==='video'){const ext=(m.file.name.split('.').pop()||'mp4').toLowerCase(),name=`video-${String(vi++).padStart(2,'0')}.${ext}`;files.set(name,m.file);media.push({id:m.id,type:'video',title:m.title,src:name});byId.set(m.id,{name,file:m.file})}
      else{const name=`${m.type==='panorama'?'panorama':'photo'}-${String(m.type==='panorama'?ni++:pi++).padStart(2,'0')}.webp`,blob=await toWebp(m.file,m.type==='panorama'?4096:2200,m.type==='panorama' ? .84 : .82);files.set(name,blob);media.push({id:m.id,type:m.type,title:m.title,src:name});byId.set(m.id,{name,blob,file:m.file})}
    }
    let cover=media[0]?.src||'';const c=byId.get(this.coverId)||[...byId.values()].find(x=>x.file?.type?.startsWith('image/'));if(c?.file?.type?.startsWith('image/')){files.set('cover.webp',await toWebp(c.file,1400,.78,true));cover='cover.webp'}
    let floorPlan;if(this.planFile){files.set('floorplan.webp',await toWebp(this.planFile,2200,.9));floorPlan={image:'floorplan.webp',alt:`${this.meta.title} 평면도`,hotspots:this.hotspots.map(h=>({...h,targetMediaId:h.targetMediaId||undefined}))}}
    const lat=Number(this.meta.lat),lng=Number(this.meta.lng); const locationObj=Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng,address:this.meta.address||undefined,placeName:this.meta.placeName||undefined}:undefined;
    const project={version:2,id:slug,slug,title:this.meta.title.trim(),subtitle:this.meta.subtitle||undefined,status:this.meta.status||undefined,address:this.meta.address||undefined,location:locationObj,priceLabel:this.meta.priceLabel||undefined,areaLabel:this.meta.areaLabel||undefined,orientation:this.meta.orientation||undefined,description:this.meta.description||undefined,cover,floorPlan,media,contact:(this.meta.contactName||this.meta.contactPhone||this.meta.contactMessage)?{name:this.meta.contactName||undefined,phone:this.meta.contactPhone||undefined,message:this.meta.contactMessage||undefined}:undefined,updatedAt:new Date().toISOString()};
    files.set('project.json',new Blob([JSON.stringify(project,null,2)],{type:'application/json'})); return{slug,files};
  }
  async publishNow(){
    if(!this.publisher)return this.exportZip(); if(this.busy)return; this.busy=true; this.render();
    try{
      const pack=await this.buildPack(); const payload={slug:pack.slug,files:[]};
      for(const [name,blob] of pack.files)payload.files.push({name,base64:await blobToBase64(blob)});
      const r=await fetch('/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(!r.ok||!j.ok)throw Error(j.error||'게시 실패');
      toast('GitHub에 게시했습니다. Pages가 곧 최신 내용으로 갱신됩니다.','success');
      this.projects=(await loadIndex().catch(()=>({items:this.projects}))).items||this.projects; this.meta.slug=pack.slug; this.saveDraft(); this.tab='publish';
      setTimeout(()=>{if(confirm('게시 완료했습니다. 이 매물 미리보기를 열까요?'))location.hash=`/view/${encodeURIComponent(pack.slug)}`},250);
    }catch(e){toast(e.message,'error')}finally{this.busy=false;this.render()}
  }
  async saveFolder(){
    if(!window.showDirectoryPicker)return this.exportZip();
    try{const pack=await this.buildPack();const root=await window.showDirectoryPicker({mode:'readwrite'});const h=await root.getDirectoryHandle(pack.slug,{create:true});for(const [name,blob] of pack.files){const f=await h.getFileHandle(name,{create:true}),w=await f.createWritable();await w.write(blob);await w.close()}toast(`“${h.name}” 폴더에 저장했습니다.`,'success')}catch(e){if(e.name!=='AbortError')toast(e.message,'error')}
  }
  async exportZip(){
    if(this.busy)return;this.busy=true;
    try{const p=await this.buildPack(),entries=[...p.files].map(([name,blob])=>({name:`${p.slug}/${name}`,blob}));const zip=await makeZip(entries),a=document.createElement('a'),u=URL.createObjectURL(zip);a.href=u;a.download=`${p.slug}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('ZIP 백업을 만들었습니다.','success')}catch(e){toast(e.message,'error')}finally{this.busy=false;this.render()}
  }
  reset(){if(!confirm('새 매물을 시작할까요? 현재 임시 입력은 비워집니다.'))return;this.media.forEach(m=>m.preview?.startsWith('blob:')&&URL.revokeObjectURL(m.preview));if(this.planPreview?.startsWith('blob:'))URL.revokeObjectURL(this.planPreview);localStorage.removeItem('spacetour-admin-draft');const fresh=new Studio();fresh.siteConfig=this.siteConfig;fresh.publisher=this.publisher;fresh.projects=this.projects;Object.assign(this,fresh);this.render()}
}

async function renderAdmin(){app.innerHTML=`<main class="boot"><span></span><small>Publisher 준비 중…</small></main>`;const studio=new Studio();await studio.init()}
function render404(){document.title='페이지를 찾을 수 없습니다 · SpaceTour';app.innerHTML=`${topbar()}<main class="notfound"><div><strong>404</strong><h1>이 공간은 찾을 수 없습니다.</h1><p>주소가 변경되었거나 아직 게시되지 않은 매물일 수 있습니다.</p><div class="hero-actions" style="justify-content:center"><a class="btn btn-primary" href="#/">홈으로</a><button class="btn btn-ghost" onclick="history.back()">이전 페이지</button></div></div></main>${footer()}`;bindTheme()}
function route(){activePano?.destroy();activePano=null;const h=location.hash.replace(/^#/,'')||'/';if(h==='/')renderHome();else if(h==='/admin')renderAdmin();else{const m=h.match(/^\/view\/([^/?#]+)/);if(m)renderViewer(decodeURIComponent(m[1]));else render404()}window.scrollTo(0,0)}
window.addEventListener('hashchange',route);route();
