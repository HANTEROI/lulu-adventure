// ── MAP ──────────────────────────────────────────────────────────────────────
let _map = null, _markers = {}, _line = null, _activeDay = null;

function initMap() {
  if (_map) return;
  _map = L.map('lmap', { zoomControl: true }).setView([0, 0], 2);
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
    el.innerHTML = `<div style="padding:1.5rem 1rem;text-align:center;color:var(--muted);font-size:.82rem">
      ${t ? 'Clique no mapa para adicionar um dia' : 'Selecione uma viagem primeiro'}
    </div>`;
    return;
  }
  const sorted = [...t.days].sort((a,b) => a.date.localeCompare(b.date));
  el.innerHTML = sorted.map(d => `
    <div class="day-row ${_activeDay===d.id?'on':''}" onclick="selectDay('${d.id}')">
      <div class="dr-date">${fmtDate(d.date) || '—'}</div>
      <div class="dr-title">${d.title}</div>
      <div class="dr-loc">${d.loc || ''}</div>
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
    _line = L.polyline(pts, { color:'#00b8a0', weight:2.5, dashArray:'6,5', opacity:.55 }).addTo(_map);
  }

  sorted.forEach((d, i) => {
    if (!d.lat || !d.lng) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:${d.color||'#1a7fd4'};color:#fff;
        width:28px;height:28px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:.7rem;font-weight:800;
        border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28);
        cursor:pointer;">${i+1}</div>`,
      iconSize:[28,28], iconAnchor:[14,14]
    });
    const m = L.marker([d.lat, d.lng], { icon }).addTo(_map)
      .bindPopup(`
        <div style="min-width:160px;font-family:system-ui,sans-serif">
          <strong style="font-size:.88rem">${d.title}</strong><br>
          <span style="font-size:.72rem;color:#666">${fmtDate(d.date)}${d.loc?' · '+d.loc:''}</span>
          ${d.notes ? `<p style="font-size:.78rem;margin:.4rem 0 .2rem;color:#444">${d.notes}</p>` : ''}
          <div style="margin-top:.5rem;display:flex;gap:.4rem">
            <button onclick="openModal('day','${d.id}')"
              style="font-size:.7rem;padding:3px 8px;border:1px solid #ddd;border-radius:4px;cursor:pointer;background:#f5f5f5">
              ✏️ Editar
            </button>
            <button onclick="delDay('${d.id}')"
              style="font-size:.7rem;padding:3px 8px;border:1px solid #fcc;border-radius:4px;cursor:pointer;background:#fde8e4;color:#9b2a10">
              🗑️
            </button>
          </div>
        </div>
      `);
    _markers[d.id] = m;
  });

  if (pts.length) {
    const bounds = L.latLngBounds(pts).pad(.25);
    _map.fitBounds(bounds);
  }
}

function selectDay(id) {
  _activeDay = id;
  renderDaysList();
  const d = trip()?.days.find(x => x.id === id);
  if (d?.lat && d?.lng) {
    _map.flyTo([d.lat, d.lng], 11, { duration:.9 });
    setTimeout(() => _markers[id]?.openPopup(), 700);
  }
}

function delDay(id) {
  if (!confirm('Remover este dia?')) return;
  const t = trip();
  t.days = t.days.filter(d => d.id !== id);
  if (_activeDay === id) _activeDay = null;
  renderMap();
}

// ── DAY MODAL ─────────────────────────────────────────────────
function dayModalHtml(extra) {
  // extra = {lat,lng} for new pin OR id string for edit
  const isEdit = extra && typeof extra === 'string';
  const d = isEdit ? trip()?.days.find(x => x.id === extra) : null;
  const lat = d?.lat ?? (isEdit ? '' : (extra?.lat || ''));
  const lng = d?.lng ?? (isEdit ? '' : (extra?.lng || ''));
  return `
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
      <input type="text" id="fd-loc" placeholder="Ex: Buenos Aires, Argentina" value="${d?.loc||''}">
    </div>
    <div class="f2">
      <div class="fg">
        <label>Latitude</label>
        <input type="number" id="fd-lat" step="any" value="${lat}">
      </div>
      <div class="fg">
        <label>Longitude</label>
        <input type="number" id="fd-lng" step="any" value="${lng}">
      </div>
    </div>
    <div class="fg">
      <label>Cor do marcador</label>
      <input type="color" id="fd-color" value="${d?.color||'#1a7fd4'}" style="height:38px;cursor:pointer">
    </div>
    <div class="fg">
      <label>Notas do dia</label>
      <textarea id="fd-notes" rows="3" placeholder="Horários, dicas, lembretes...">${d?.notes||''}</textarea>
    </div>
    <input type="hidden" id="fd-edit-id" value="${isEdit ? extra : ''}">
    <p style="font-size:.72rem;color:var(--muted);margin-top:-.3rem">💡 Ou clique no mapa para capturar coordenadas</p>
  `;
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
  closeModal();
}
