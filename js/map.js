// ── MAP MODULE — Google MyMaps style ─────────────────────────────────────────

// ── CATEGORIES ───────────────────────────────────────────────
const CATS = {
  hotel:     { label:'Hotéis & Estadias',         icon:'🏨', color:'#1a7fd4' },
  atracao:   { label:'Atrações & Pontos turísticos', icon:'🏛️', color:'#e5432a' },
  restaurante:{ label:'Restaurantes & Bares',      icon:'🍽️', color:'#f5a623' },
  transporte:{ label:'Transportes',               icon:'✈️', color:'#00c9ae' },
  natureza:  { label:'Natureza & Trilhas',         icon:'🥾', color:'#2e7d32' },
  compras:   { label:'Compras',                   icon:'🛍️', color:'#7c5cbf' },
  outro:     { label:'Outros',                    icon:'📍', color:'#8aa0ba' },
};

// ── MAP LAYERS ────────────────────────────────────────────────
const LAYERS = {
  dark:      { label:'Escuro',   url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  light:     { label:'Claro',    url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' },
  satellite: { label:'Satélite', url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  terrain:   { label:'Terreno',  url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
};

// ── STATE ─────────────────────────────────────────────────────
let _map        = null;
let _tileLayer  = null;
let _markers    = {};      // id → L.marker
let _line       = null;
let _activeId   = null;
let _activeLayer= 'dark';
let _hiddenCats = new Set(); // categories toggled off
let _geoTimer   = null;
let _addMode    = false;    // click-to-add mode

function initMap() {
  if (_map) { renderMap(); return; }

  _map = L.map('lmap', { zoomControl:false }).setView([-20,-55], 4);

  // Custom zoom control top-right
  L.control.zoom({ position:'topright' }).addTo(_map);

  _setLayer(_activeLayer);

  _map.on('click', e => {
    if (!requireTrip()) return;
    if (_addMode) {
      _addMode = false;
      document.getElementById('map-add-btn')?.classList.remove('active');
      _map.getContainer().style.cursor = '';
      openPointModal(null, { lat:+e.latlng.lat.toFixed(5), lng:+e.latlng.lng.toFixed(5) });
    }
  });

  renderMap();
}

function _setLayer(key) {
  _activeLayer = key;
  if (_tileLayer) _map.removeLayer(_tileLayer);
  const attr = key === 'satellite'
    ? 'Tiles © Esri'
    : key === 'terrain'
    ? '© OpenTopoMap'
    : '© OpenStreetMap © CartoDB';
  _tileLayer = L.tileLayer(LAYERS[key].url, { attribution:attr, maxZoom:19 }).addTo(_map);
  // update UI
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('on', b.dataset.layer === key));
}

// ── RENDER ────────────────────────────────────────────────────
function renderMap() {
  renderSidebar();
  renderMarkers();
}

function renderSidebar() {
  renderLayerPanel();
  renderCategoryPanel();
  renderPointsList();
}

// ── LAYER PANEL ───────────────────────────────────────────────
function renderLayerPanel() {
  const el = document.getElementById('layer-panel');
  if (!el) return;
  el.innerHTML = Object.entries(LAYERS).map(([key, l]) => `
    <button class="layer-btn ${_activeLayer===key?'on':''}" data-layer="${key}" onclick="_setLayer('${key}')">
      <span class="layer-ico">${layerIcon(key)}</span>
      <span>${l.label}</span>
    </button>
  `).join('');
}

function layerIcon(k) {
  return { dark:'🌙', light:'☀️', satellite:'🛰️', terrain:'⛰️' }[k] || '🗺️';
}

// ── CATEGORY PANEL ────────────────────────────────────────────
function renderCategoryPanel() {
  const el = document.getElementById('cat-panel');
  if (!el) return;
  const t = trip();
  el.innerHTML = Object.entries(CATS).map(([key, c]) => {
    const count = t ? t.days.filter(d => d.cat === key).length : 0;
    const hidden = _hiddenCats.has(key);
    return `
      <div class="cat-row ${hidden?'hidden-cat':''}" onclick="toggleCat('${key}')">
        <span class="cat-dot" style="background:${c.color}"></span>
        <span class="cat-ico">${c.icon}</span>
        <span class="cat-label">${c.label}</span>
        ${count ? `<span class="cat-count">${count}</span>` : ''}
        <span class="cat-eye">${hidden?'○':'●'}</span>
      </div>
    `;
  }).join('');
}

function toggleCat(key) {
  if (_hiddenCats.has(key)) _hiddenCats.delete(key);
  else _hiddenCats.add(key);
  renderCategoryPanel();
  renderMarkers();
}

// ── POINTS LIST ───────────────────────────────────────────────
function renderPointsList() {
  const el = document.getElementById('points-list');
  if (!el) return;
  const t = trip();
  if (!t || !t.days.length) {
    el.innerHTML = `<div class="map-empty">
      <div class="me-icon">📍</div>
      <div>${t ? 'Clique em + para adicionar um ponto' : 'Selecione uma viagem'}</div>
    </div>`;
    return;
  }
  const sorted = [...t.days].sort((a,b) => {
    // sort by date, then by cat
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return (a.cat||'outro').localeCompare(b.cat||'outro');
  });
  el.innerHTML = sorted.map(d => {
    const c = CATS[d.cat||'outro'];
    return `
      <div class="point-row ${_activeId===d.id?'on':''} ${_hiddenCats.has(d.cat||'outro')?'faded':''}"
           onclick="selectPoint('${d.id}')">
        <div class="point-icon-wrap" style="background:${c.color}22;border:1.5px solid ${c.color}44">
          <span>${c.icon}</span>
        </div>
        <div class="point-info">
          <div class="point-title">${d.title}</div>
          <div class="point-meta">${c.label}${d.date?' · '+fmtDate(d.date):''}</div>
        </div>
        <button class="point-del" onclick="event.stopPropagation();delPoint('${d.id}')">✕</button>
      </div>
    `;
  }).join('');
}

// ── MARKERS ───────────────────────────────────────────────────
function renderMarkers() {
  Object.values(_markers).forEach(m => m.remove());
  _markers = {};
  if (_line) { _line.remove(); _line = null; }

  const t = trip();
  if (!t || !t.days.length) return;

  const sorted = [...t.days].sort((a,b) => a.date?.localeCompare(b.date||'')||0);

  // Route line (only visible cats, ordered by date)
  const routePts = sorted
    .filter(d => d.lat && d.lng && !_hiddenCats.has(d.cat||'outro') && d.date)
    .map(d => [d.lat, d.lng]);

  if (routePts.length > 1) {
    _line = L.polyline(routePts, {
      color:'#fff', weight:1.5, dashArray:'5,6', opacity:.35
    }).addTo(_map);
  }

  sorted.forEach(d => {
    if (!d.lat || !d.lng) return;
    if (_hiddenCats.has(d.cat||'outro')) return;

    const c = CATS[d.cat||'outro'];
    const isActive = _activeId === d.id;

    const icon = L.divIcon({
      className: '',
      html: `<div class="map-pin ${isActive?'map-pin-active':''}" style="--pin-color:${c.color}">
        <div class="map-pin-inner">${c.icon}</div>
        <div class="map-pin-tail"></div>
      </div>`,
      iconSize:[36, 44], iconAnchor:[18, 44]
    });

    const m = L.marker([d.lat, d.lng], { icon })
      .addTo(_map)
      .bindPopup(buildPopup(d), { maxWidth:240, className:'lulu-popup' });

    m.on('click', () => {
      _activeId = d.id;
      renderPointsList();
      renderMarkers();
    });

    _markers[d.id] = m;
  });

  // Fit bounds
  const allPts = sorted.filter(d => d.lat && d.lng).map(d => [d.lat, d.lng]);
  if (allPts.length) _map.fitBounds(L.latLngBounds(allPts).pad(.25));
}

function buildPopup(d) {
  const c = CATS[d.cat||'outro'];
  return `
    <div class="popup-wrap">
      <div class="popup-hdr" style="border-left:4px solid ${c.color}">
        <span class="popup-ico">${c.icon}</span>
        <div>
          <div class="popup-title">${d.title}</div>
          <div class="popup-cat">${c.label}${d.date?' · '+fmtDate(d.date):''}</div>
        </div>
      </div>
      ${d.loc  ? `<div class="popup-row">📌 ${d.loc}</div>` : ''}
      ${d.notes? `<div class="popup-row popup-notes">${d.notes}</div>` : ''}
      ${d.url  ? `<div class="popup-row"><a href="${d.url}" target="_blank" style="color:var(--accent2)">🔗 Ver mais</a></div>` : ''}
      <div class="popup-actions">
        <button onclick="openPointModal('${d.id}')" class="popup-btn popup-btn-edit">✏️ Editar</button>
        <button onclick="delPoint('${d.id}')" class="popup-btn popup-btn-del">🗑️</button>
        ${d.lat&&d.lng ? `<button onclick="window.open('https://www.google.com/maps?q=${d.lat},${d.lng}','_blank')" class="popup-btn">🗺️ Google</button>` : ''}
      </div>
    </div>
  `;
}

// ── INTERACTIONS ──────────────────────────────────────────────
function selectPoint(id) {
  _activeId = id;
  const d = trip()?.days.find(x => x.id === id);
  if (d?.lat && d?.lng) {
    _map.flyTo([d.lat, d.lng], 14, { duration:.8 });
    setTimeout(() => _markers[id]?.openPopup(), 700);
  }
  renderPointsList();
  renderMarkers();
}

function delPoint(id) {
  if (!confirm('Remover este ponto?')) return;
  const t = trip();
  t.days = t.days.filter(d => d.id !== id);
  if (_activeId === id) _activeId = null;
  _markers[id]?.remove();
  delete _markers[id];
  renderMap();
  updateSummary();
}

function enableAddMode() {
  if (!requireTrip()) return;
  _addMode = !_addMode;
  const btn = document.getElementById('map-add-btn');
  btn?.classList.toggle('active', _addMode);
  _map.getContainer().style.cursor = _addMode ? 'crosshair' : '';
  if (_addMode) toast('Clique no mapa para adicionar um ponto');
}

function locateMe() {
  _map.locate({ setView:true, maxZoom:13 });
  _map.once('locationfound', e => toast('📍 Localização encontrada!'));
  _map.once('locationerror', () => toast('Não foi possível obter localização'));
}

// ── GEOCODING ────────────────────────────────────────────────
async function geocodeSearch(query) {
  if (!query || query.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers:{ 'Accept-Language':'pt-BR,pt;q=0.9' } });
    return await res.json();
  } catch(e) { return []; }
}

function onLocationInput(e) {
  clearTimeout(_geoTimer);
  hideSuggestions();
  const val = e.target.value;
  if (val.length < 3) return;
  showGeoLoading(true);
  _geoTimer = setTimeout(async () => {
    const results = await geocodeSearch(val);
    showGeoLoading(false);
    showSuggestions(results);
  }, 380);
}

function showGeoLoading(show) {
  const el = document.getElementById('geo-loading');
  if (el) el.style.display = show ? 'block' : 'none';
}

function showSuggestions(results) {
  const box = document.getElementById('geo-suggestions');
  if (!box) return;
  if (!results.length) { box.style.display='none'; return; }
  box.innerHTML = results.map((r,i) => {
    const name = r.display_name;
    const short = name.length > 52 ? name.slice(0,52)+'…' : name;
    return `<div class="geo-item" onclick="pickSuggestion(${i})"
      data-lat="${r.lat}" data-lng="${r.lon}" data-name="${name.replace(/"/g,'&quot;')}">
      <span class="geo-icon">${geoIcon(r.type,r.class)}</span>
      <span>${short}</span>
    </div>`;
  }).join('');
  box.style.display = 'block';
}

function geoIcon(type, cls) {
  if (cls==='aeroway') return '✈️';
  if (cls==='natural') return '⛰️';
  if (cls==='leisure'||type==='park') return '🏞️';
  if (type==='city'||type==='town') return '🏙️';
  if (type==='village') return '🏘️';
  if (type==='country') return '🌍';
  return '📍';
}

function pickSuggestion(idx) {
  const box  = document.getElementById('geo-suggestions');
  const item = box?.children[idx];
  if (!item) return;
  const lat = parseFloat(item.dataset.lat);
  const lng = parseFloat(item.dataset.lng);
  const name = item.dataset.name;
  document.getElementById('fd-lat').value = lat.toFixed(5);
  document.getElementById('fd-lng').value = lng.toFixed(5);
  const locEl = document.getElementById('fd-loc');
  if (locEl && !locEl.value) locEl.value = name.split(',').slice(0,2).map(s=>s.trim()).join(', ');
  if (_map) _map.flyTo([lat, lng], 13, { duration:.6 });
  hideSuggestions();
}

function hideSuggestions() {
  const box = document.getElementById('geo-suggestions');
  if (box) box.style.display = 'none';
}

async function geocodeFill() {
  const loc = document.getElementById('fd-loc')?.value?.trim();
  if (!loc) { toast('Digite um local primeiro'); return; }
  showGeoLoading(true);
  const results = await geocodeSearch(loc);
  showGeoLoading(false);
  if (!results.length) { toast('Local não encontrado'); return; }
  document.getElementById('fd-lat').value = (+results[0].lat).toFixed(5);
  document.getElementById('fd-lng').value = (+results[0].lon).toFixed(5);
  if (_map) _map.flyTo([+results[0].lat, +results[0].lon], 13, { duration:.6 });
  toast('📍 Coordenadas encontradas!');
}

// ── POINT MODAL ───────────────────────────────────────────────
function openPointModal(id, coords) {
  const d = id ? trip()?.days.find(x => x.id === id) : null;
  const lat = d?.lat ?? coords?.lat ?? '';
  const lng = d?.lng ?? coords?.lng ?? '';

  document.getElementById('modal-title').textContent = id ? '✏️ Editar Ponto' : '📍 Novo Ponto';
  document.getElementById('modal-body').innerHTML = pointModalHtml(d, lat, lng);
  document.getElementById('modal-ok').onclick = () => savePointModal(id);
  document.getElementById('modal-ok').style.display = '';
  document.getElementById('modal-bg').classList.add('on');
}

function pointModalHtml(d, lat, lng) {
  return `
    <div class="fg">
      <label>🔍 Buscar lugar</label>
      <div style="position:relative">
        <input type="text" id="fd-search" placeholder="Ex: Torres del Paine, Chile..."
          oninput="onLocationInput(event)" autocomplete="off" value="${d?.loc||''}">
        <span id="geo-loading" style="display:none;position:absolute;right:.6rem;top:.55rem;font-size:.8rem">⏳</span>
        <div id="geo-suggestions" style="
          display:none;position:absolute;top:100%;left:0;right:0;z-index:999;
          background:var(--card);border:1.5px solid var(--border);
          border-radius:0 0 var(--r-sm) var(--r-sm);
          box-shadow:0 6px 20px rgba(0,0,0,.15);max-height:200px;overflow-y:auto;
        "></div>
      </div>
    </div>

    <div class="fg">
      <label>Categoria</label>
      <div id="cat-picker" style="display:flex;flex-wrap:wrap;gap:.4rem">
        ${Object.entries(CATS).map(([key,c]) => `
          <button type="button" class="cat-pick-btn ${(d?.cat||'outro')===key?'on':''}"
            data-cat="${key}"
            style="--cp-color:${c.color}"
            onclick="pickCat('${key}')">
            ${c.icon} ${c.label.split(' ')[0]}
          </button>
        `).join('')}
      </div>
      <input type="hidden" id="fd-cat" value="${d?.cat||'outro'}">
    </div>

    <div class="fg">
      <label>Nome do ponto</label>
      <input type="text" id="fd-title" placeholder="Ex: Hotel Mirador del Lago" value="${d?.title||''}">
    </div>

    <div class="fg">
      <label>Local / Endereço</label>
      <div style="display:flex;gap:.5rem">
        <input type="text" id="fd-loc" placeholder="Ex: El Calafate, Argentina" value="${d?.loc||''}" style="flex:1">
        <button type="button" onclick="geocodeFill()"
          style="background:var(--accent);color:#000;border:none;border-radius:var(--r-sm);
            padding:.5rem .75rem;font-size:.8rem;cursor:pointer;font-weight:700;white-space:nowrap">
          📍 Buscar
        </button>
      </div>
    </div>

    <div class="f2">
      <div class="fg">
        <label>Latitude ${lat?'✅':''}</label>
        <input type="number" id="fd-lat" step="any" value="${lat}" placeholder="-50.3399">
      </div>
      <div class="fg">
        <label>Longitude ${lng?'✅':''}</label>
        <input type="number" id="fd-lng" step="any" value="${lng}" placeholder="-72.2658">
      </div>
    </div>

    <div class="f2">
      <div class="fg">
        <label>Data da visita</label>
        <input type="date" id="fd-date" value="${d?.date||''}">
      </div>
      <div class="fg">
        <label>Cor do marcador</label>
        <input type="color" id="fd-color" value="${d?.color||CATS[d?.cat||'outro'].color}"
          style="height:40px;width:100%;cursor:pointer;border-radius:var(--r-sm);border:1.5px solid var(--border);padding:2px">
      </div>
    </div>

    <div class="fg">
      <label>Link (website, Google Maps...)</label>
      <input type="url" id="fd-url" placeholder="https://..." value="${d?.url||''}">
    </div>

    <div class="fg">
      <label>Notas</label>
      <textarea id="fd-notes" rows="3" placeholder="Horários, preços, dicas...">${d?.notes||''}</textarea>
    </div>
  `;
}

function pickCat(key) {
  document.getElementById('fd-cat').value = key;
  document.querySelectorAll('.cat-pick-btn').forEach(b => b.classList.toggle('on', b.dataset.cat === key));
  // update color picker to match category
  document.getElementById('fd-color').value = CATS[key].color;
}

function savePointModal(editId) {
  if (!requireTrip()) return;
  const title = document.getElementById('fd-title').value.trim();
  if (!title) { alert('Informe o nome do ponto.'); return; }
  const t = trip();
  const data = {
    title,
    cat:   document.getElementById('fd-cat').value || 'outro',
    loc:   document.getElementById('fd-loc').value.trim(),
    lat:   parseFloat(document.getElementById('fd-lat').value) || null,
    lng:   parseFloat(document.getElementById('fd-lng').value) || null,
    date:  document.getElementById('fd-date').value,
    color: document.getElementById('fd-color').value,
    url:   document.getElementById('fd-url').value.trim(),
    notes: document.getElementById('fd-notes').value.trim(),
  };
  if (editId) {
    const d = t.days.find(x => x.id === editId);
    if (d) Object.assign(d, data);
  } else {
    t.days.push({ id:uid(), ...data });
  }
  renderMap();
  updateSummary();
  closeModal();
}

// expose map reference globally
function getMap(){ return _map; }