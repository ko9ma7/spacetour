const scriptCache = new Map();

function loadScript(src, test) {
  if (test?.()) return Promise.resolve();
  if (scriptCache.has(src)) return scriptCache.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('지도 SDK를 불러오지 못했습니다. API 키와 등록 도메인을 확인해주세요.'));
    document.head.appendChild(s);
  });
  scriptCache.set(src, p);
  return p;
}

export async function loadMapSdk(config = {}) {
  const provider = config.provider || 'kakao';
  if (provider === 'naver') {
    const key = config.naverNcpKeyId?.trim();
    if (!key) throw new Error('네이버 지도 Key ID가 설정되지 않았습니다.');
    const src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}&submodules=geocoder,panorama`;
    await loadScript(src, () => window.naver?.maps);
    return 'naver';
  }
  const key = config.kakaoJavaScriptKey?.trim();
  if (!key) throw new Error('카카오 JavaScript 키가 설정되지 않았습니다.');
  const src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
  await loadScript(src, () => window.kakao?.maps);
  await new Promise((resolve, reject) => {
    if (!window.kakao?.maps?.load) return reject(new Error('카카오 지도 SDK 초기화에 실패했습니다.'));
    window.kakao.maps.load(resolve);
  });
  return 'kakao';
}

export async function searchLocations(config, query) {
  const provider = await loadMapSdk(config);
  if (provider === 'naver') {
    return new Promise((resolve, reject) => {
      window.naver.maps.Service.geocode({ query }, (status, response) => {
        if (status !== window.naver.maps.Service.Status.OK) return reject(new Error('주소 검색에 실패했습니다.'));
        const items = response?.v2?.addresses || [];
        resolve(items.slice(0, 8).map((x, i) => ({
          name: x.roadAddress || x.jibunAddress || query || `검색 결과 ${i + 1}`,
          address: x.roadAddress || x.jibunAddress || query,
          lat: Number(x.y),
          lng: Number(x.x)
        })));
      });
    });
  }
  return new Promise((resolve, reject) => {
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(query, (data, status) => {
      if (status === window.kakao.maps.services.Status.ZERO_RESULT) return resolve([]);
      if (status !== window.kakao.maps.services.Status.OK) return reject(new Error('장소 검색에 실패했습니다.'));
      resolve(data.slice(0, 8).map(x => ({
        name: x.place_name,
        address: x.road_address_name || x.address_name || x.place_name,
        lat: Number(x.y),
        lng: Number(x.x)
      })));
    });
  });
}

export async function reverseAddress(config, lat, lng) {
  const provider = await loadMapSdk(config);
  if (provider === 'naver') {
    return new Promise(resolve => {
      const coords = new window.naver.maps.LatLng(lat, lng);
      window.naver.maps.Service.reverseGeocode({ coords, orders: 'roadaddr,addr' }, (status, response) => {
        if (status !== window.naver.maps.Service.Status.OK) return resolve('');
        const r = response?.v2?.results?.[0];
        if (!r) return resolve('');
        const reg = r.region || {};
        const land = r.land || {};
        const area = [reg.area1?.name, reg.area2?.name, reg.area3?.name, reg.area4?.name].filter(Boolean).join(' ');
        const road = [land.name, land.number1, land.number2 && `-${land.number2}`].filter(Boolean).join('');
        resolve([area, road].filter(Boolean).join(' ').trim());
      });
    });
  }
  return new Promise(resolve => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK) return resolve('');
      resolve(result?.[0]?.road_address?.address_name || result?.[0]?.address?.address_name || '');
    });
  });
}

export async function mountMap(container, config, location, options = {}) {
  const provider = await loadMapSdk(config);
  const start = {
    lat: Number(location?.lat) || 37.5665,
    lng: Number(location?.lng) || 126.9780
  };
  if (provider === 'naver') {
    const center = new window.naver.maps.LatLng(start.lat, start.lng);
    const map = new window.naver.maps.Map(container, { center, zoom: options.zoom || 16, zoomControl: true });
    const marker = new window.naver.maps.Marker({ position: center, map });
    const setPosition = (lat, lng) => {
      const p = new window.naver.maps.LatLng(lat, lng);
      marker.setPosition(p); map.panTo(p);
    };
    if (options.onChange) {
      window.naver.maps.Event.addListener(map, 'click', async e => {
        const lat = e.coord.lat(), lng = e.coord.lng();
        setPosition(lat, lng);
        const address = await reverseAddress(config, lat, lng).catch(() => '');
        options.onChange({ lat, lng, address });
      });
    }
    return { provider, map, marker, setPosition };
  }
  const center = new window.kakao.maps.LatLng(start.lat, start.lng);
  const map = new window.kakao.maps.Map(container, { center, level: options.level || 3 });
  const marker = new window.kakao.maps.Marker({ position: center, map });
  const setPosition = (lat, lng) => {
    const p = new window.kakao.maps.LatLng(lat, lng);
    marker.setPosition(p); map.panTo(p);
  };
  if (options.onChange) {
    window.kakao.maps.event.addListener(map, 'click', async e => {
      const lat = e.latLng.getLat(), lng = e.latLng.getLng();
      setPosition(lat, lng);
      const address = await reverseAddress(config, lat, lng).catch(() => '');
      options.onChange({ lat, lng, address });
    });
  }
  return { provider, map, marker, setPosition };
}

export async function mountKakaoRoadview(container, config, location) {
  if ((config.provider || 'kakao') !== 'kakao') throw new Error('카카오 지도 선택 시 로드뷰를 사용할 수 있습니다.');
  await loadMapSdk(config);
  const lat = Number(location?.lat), lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('매물 위치가 지정되지 않았습니다.');
  const roadview = new window.kakao.maps.Roadview(container);
  const client = new window.kakao.maps.RoadviewClient();
  const pos = new window.kakao.maps.LatLng(lat, lng);
  return new Promise((resolve, reject) => {
    client.getNearestPanoId(pos, 80, panoId => {
      if (!panoId) return reject(new Error('이 위치 주변에는 카카오 로드뷰가 없습니다.'));
      roadview.setPanoId(panoId, pos);
      resolve(roadview);
    });
  });
}

export function externalMapUrl(config, location = {}) {
  const lat = Number(location.lat), lng = Number(location.lng);
  const label = location.placeName || location.address || '매물 위치';
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  if ((config.provider || 'kakao') === 'naver') {
    return `https://map.naver.com/p/search/${encodeURIComponent(location.address || label)}`;
  }
  return `https://map.kakao.com/link/map/${encodeURIComponent(label)},${lat},${lng}`;
}
