// ── MAP ──────────────────────────────────────────────────────────────────────
// Geocoding via Nominatim (OpenStreetMap) — free, no API key needed
let _map = null, _markers = {}, _line = null, _activeDay = null;
let _geoTimer = null;

function initMap() {
  if (_map) return;
  _map = L.map('lmap', { zoomControl: true }).setView([-20, -60], 4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CartoDB', maxZoom: 19
  }).addTo(_map);

  _map.on('click', e => {
    if (!requireTrip()) return;
    openModal('day', { lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) });
  });

  renderMap();
}

function renderMap() {
  renderDaysList();
  renderMarkers();
}

function renderDaysList() {
  const el = document.getElementById('days-list');
  const t = trip();
  if (!t || !t.days.length) {
    el.innerHTML = `<div class="map-empty">
      ${t ? '📍 Clique no mapa ou use o + para adicionar dias' : '✈️ Selecione uma viagem primeiro'}
    </div>`;
    return;
  }
  const sorted = [...t.days].sort((a,b) => a.date.localeCompare(b.date));
  el.innerHTML = sorted.map((d,i) => `
    <div class="day-row ${_activeDay===d.id?'on':''}" onclick="selectDay('${d.id}')">
      <div class="day-num" style="background:${d.color||'#1a7fd4'}">${i+1}</div>
      <div class="day-info">
        <div class="dr-date">${fmtDate(d.date)||'—'}</div>
        <div class="dr-title">${d.title}</div>
        <div class="dr-loc">${d.loc||''}</div>
      </div>
      <button class="btn-del day-del" onclick="event.stopPropagation();delDay('${d.id}')">✕</button>
    </div>
  `).join('');
}

function renderMarkers() {
  Object.values(_markers).forEach(m => m.remove());
  _markers = {};
  if (_line) { _line.remove(); _line = null; }
  const t = trip();
  if (!t || !t.days.length) return;

  const sorted = [...t.days].sort((a,b) => a.date.localeCompare(b.date));
  const pts = sorted.filter(d => d.lat && d.lng).map(d => [d.lat, d.lng]);

  if (pts.length > 1) {
    _line = L.polyline(pts, { color:'#00b8a0', weight:2.5, dashArray:'6,5', opacity:.6 }).addTo(_map);
  }

  sorted.forEach((d, i) => {
    if (!d.lat || !d.lng) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:${d.color||'#1a7fd4'};color:#fff;
        width:30px;height:30px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:.72rem;font-weight:800;
        border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.3);
        cursor:pointer;transition:transform .15s;"
        onmouseenter="this.style.transform='scale(1.15)'"
        onmouseleave="this.style.transform='scale(1)'"
      >${i+1}</div>`,
      iconSize:[30,30], iconAnchor:[15,15]
    });
    const m = L.marker([d.lat, d.lng], { icon }).addTo(_map)
      .bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif">
          <div style="font-weight:800;font-size:.9rem;margin-bottom:3px">${d.title}</div>
          <div style="font-size:.72rem;color:#666;margin-bottom:4px">${fmtDate(d.date)||''}${d.loc?' · '+d.loc:''}</div>
          ${d.notes ? `<div style="font-size:.78rem;color:#444;border-top:1px solid #eee;padding-top:5px;margin-top:2px">${d.notes}</div>` : ''}
          <div style="margin-top:.6rem;display:flex;gap:.4rem">
            <button onclick="openModal('day','${d.id}')"
              style="flex:1;font-size:.72rem;padding:4px 8px;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#f5f5f5;font-weight:600">
              ✏️ Editar
            </button>
            <button onclick="delDay('${d.id}')"
              style="font-size:.72rem;padding:4px 8px;border:1px solid #fcc;border-radius:6px;cursor:pointer;background:#fde8e4;color:#9b2a10;font-weight:600">
              🗑️
            </button>
          </div>
        </div>
      `, { maxWidth: 220 });
    _markers[d.id] = m;
  });

  if (pts.length) {
    _map.fitBounds(L.latLngBounds(pts).pad(.3));
  }
}

function selectDay(id) {
  _activeDay = id;
  renderDaysList();
  const d = trip()?.days.find(x => x.id === id);
  if (d?.lat && d?.lng) {
    _map.flyTo([d.lat, d.lng], 11, { duration:.9 });
    setTimeout(() => _markers[id]?.openPopup(), 750);
  }
}

function delDay(id) {
  if (!confirm('Remover este dia?')) return;
  const t = trip();
  t.days = t.days.filter(d => d.id !== id);
  if (_activeDay === id) _activeDay = null;
  renderMap();
  updateSummary();
}

// ── GEOCODING (Nominatim) ─────────────────────────────────────
async function geocodeSearch(query) {
  if (!query || query.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    return await res.json();
  } catch(e) { return []; }
}

function onLocationInput(e) {
  const val = e.target.value;
  clearTimeout(_geoTimer);
  // Hide suggestions if cleared
  hideSuggestions();
  if (val.length < 3) return;
  // Show loading indicator
  showGeoLoading(true);
  _geoTimer = setTimeout(async () => {
    const results = await geocodeSearch(val);
    showGeoLoading(false);
    showSuggestions(results);
  }, 400);
}

function showGeoLoading(show) {
  const el = document.getElementById('geo-loading');
  if (el) el.style.display = show ? 'block' : 'none';
}

function showSuggestions(results) {
  const box = document.getElementById('geo-suggestions');
  if (!box) return;
  if (!results.length) { box.style.display = 'none'; return; }
  box.innerHTML = results.map((r,i) => {
    const name = r.display_name;
    const short = name.length > 55 ? name.slice(0,55)+'…' : name;
    return `<div class="geo-item" onclick="pickSuggestion(${i})" data-lat="${r.lat}" data-lng="${r.lon}" data-name="${name.replace(/"/g,'&quot;')}">
      <span class="geo-icon">${geoIcon(r.type, r.class)}</span>
      <span>${short}</span>
    </div>`;
  }).join('');
  box.style.display = 'block';
}

function geoIcon(type, cls) {
  if (cls === 'aeroway') return '✈️';
  if (type === 'hotel' || type === 'hostel') return '🏨';
  if (cls === 'natural') return '⛰️';
  if (cls === 'leisure' || type === 'park') return '🏞️';
  if (cls === 'highway') return '🛣️';
  if (type === 'city' || type === 'town') return '🏙️';
  if (type === 'village' || type === 'hamlet') return '🏘️';
  if (type === 'country') return '🌍';
  return '📍';
}

function pickSuggestion(idx) {
  const box  = document.getElementById('geo-suggestions');
  const item = box?.children[idx];
  if (!item) return;
  const lat  = parseFloat(item.dataset.lat);
  const lng  = parseFloat(item.dataset.lng);
  const name = item.dataset.name;

  document.getElementById('fd-lat').value = lat.toFixed(5);
  document.getElementById('fd-lng').value = lng.toFixed(5);

  // Auto-fill location field if empty
  const locEl = document.getElementById('fd-loc');
  if (!locEl.value) {
    // Extract short name: city, country
    const parts = name.split(',');
    locEl.value = parts.slice(0,2).map(s=>s.trim()).join(', ');
  }
  // Preview on map
  if (_map) _map.flyTo([lat, lng], 10, { duration:.7 });

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
  const r = results[0];
  document.getElementById('fd-lat').value = (+r.lat).toFixed(5);
  document.getElementById('fd-lng').value = (+r.lon).toFixed(5);
  if (_map) _map.flyTo([+r.lat, +r.lon], 10, { duration:.7 });
  toast('📍 Coordenadas encontradas!');
}

// ── DAY MODAL ─────────────────────────────────────────────────
function dayModalHtml(extra) {
  const isEdit = extra && typeof extra === 'string';
  const d = isEdit ? trip()?.days.find(x => x.id === extra) : null;
  const lat = d?.lat ?? (extra?.lat || '');
  const lng = d?.lng ?? (extra?.lng || '');
  const hasCoords = lat && lng;

  return `
    <div class="fg">
      <label>🔍 Buscar lugar</label>
      <div style="position:relative">
        <input type="text" id="fd-search" placeholder="Digite o nome do lugar..."
          oninput="onLocationInput(event)"
          autocomplete="off"
          style="padding-right:2.5rem"
          value="${d?.loc||''}">
        <span id="geo-loading" style="display:none;position:absolute;right:.6rem;top:.55rem;font-size:.8rem">⏳</span>
        <div id="geo-suggestions" style="
          display:none;position:absolute;top:100%;left:0;right:0;z-index:999;
          background:#fff;border:1.5px solid var(--border);border-radius:0 0 var(--r-sm) var(--r-sm);
          box-shadow:0 6px 20px rgba(0,0,0,.12);max-height:200px;overflow-y:auto;
        "></div>
      </div>
    </div>
    <div class="fg">
      <label>Data</label>
      <input type="date" id="fd-date" value="${d?.date||''}">
    </div>
    <div class="fg">
      <label>Título do dia</label>
      <input type="text" id="fd-title" placeholder="Ex: Chegada em Buenos Aires" value="${d?.title||''}">
    </div>
    <div class="fg">
      <label>Local / Cidade</label>
      <div style="display:flex;gap:.5rem">
        <input type="text" id="fd-loc" placeholder="Ex: Buenos Aires, Argentina"
          value="${d?.loc||''}" style="flex:1">
        <button type="button" onclick="geocodeFill()"
          style="background:var(--accent);color:#fff;border:none;border-radius:var(--r-sm);
            padding:.52rem .8rem;font-size:.8rem;cursor:pointer;white-space:nowrap;font-weight:700">
          📍 Buscar
        </button>
      </div>
    </div>
    <div class="f2">
      <div class="fg">
        <label>Latitude ${hasCoords?'✅':''}</label>
        <input type="number" id="fd-lat" step="any" value="${lat}" placeholder="-34.6037">
      </div>
      <div class="fg">
        <label>Longitude ${hasCoords?'✅':''}</label>
        <input type="number" id="fd-lng" step="any" value="${lng}" placeholder="-58.3816">
      </div>
    </div>
    ${hasCoords || (lat&&lng) ? `
      <div id="fd-map-preview" style="height:140px;border-radius:var(--r-sm);overflow:hidden;margin-bottom:.8rem;border:1.5px solid var(--border)"></div>
    ` : ''}
    <div class="fg">
      <label>Cor do marcador</label>
      <div style="display:flex;gap:.5rem;align-items:center">
        ${['#1a7fd4','#00b8a0','#f0a500','#e5432a','#7c5cbf','#e91e8c','#2e7d32'].map(c=>
          `<div onclick="document.getElementById('fd-color').value='${c}';highlightColor(this)"
            style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:2.5px solid ${(d?.color||'#1a7fd4')===c?'var(--ink)':'transparent'};transition:border .15s"></div>`
        ).join('')}
        <input type="color" id="fd-color" value="${d?.color||'#1a7fd4'}"
          style="width:32px;height:32px;border:none;cursor:pointer;border-radius:50%;padding:0">
      </div>
    </div>
    <div class="fg">
      <label>Notas do dia</label>
      <textarea id="fd-notes" rows="3" placeholder="Horários, dicas, restaurantes...">${d?.notes||''}</textarea>
    </div>
    <input type="hidden" id="fd-edit-id" value="${isEdit ? extra : ''}">
    <p style="font-size:.7rem;color:var(--muted);margin-top:-.2rem">
      💡 Digite o lugar no campo de busca ou clique no mapa para capturar coordenadas
    </p>
  `;
}

function highlightColor(el) {
  el.parentElement.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
  el.style.borderColor = 'var(--ink)';
}

function saveDayModal() {
  if (!requireTrip()) return;
  const t      = trip();
  const editId = document.getElementById('fd-edit-id').value;
  const title  = document.getElementById('fd-title').value.trim();
  if (!title) { alert('Informe o título do dia.'); return; }

  const data = {
    date:  document.getElementById('fd-date').value,
    title,
    loc:   document.getElementById('fd-loc').value.trim(),
    lat:   parseFloat(document.getElementById('fd-lat').value) || null,
    lng:   parseFloat(document.getElementById('fd-lng').value) || null,
    color: document.getElementById('fd-color').value,
    notes: document.getElementById('fd-notes').value.trim(),
  };

  if (editId) {
    const d = t.days.find(x => x.id === editId);
    if (d) Object.assign(d, data);
  } else {
    t.days.push({ id: uid(), ...data });
  }
  renderMap();
  updateSummary();
  closeModal();
}