// ── APP ───────────────────────────────────────────────────────────────────────
let _tab = 'map';

// ── TABS ──────────────────────────────────────────────────────
document.querySelectorAll('#tabs button').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  _tab = tab;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.pnl').forEach(p => {
    const id = p.id.replace('pnl-','');
    p.classList.toggle('on', id === tab);
  });
  const fabIco = { map:'📍', res:'🏨', desp:'💸', docs:'✅', notas:'📝' };
  document.getElementById('fab').textContent = fabIco[tab] || '+';
  if (tab === 'map')   { initMap(); }
  if (tab === 'res')   renderReservas();
  if (tab === 'desp')  renderDespesas();
  if (tab === 'docs')  renderDocs();
  if (tab === 'notas') renderNotas();
}

function fabClick() {
  const actions = {
    map:   () => openModal('day'),
    res:   () => openModal('res'),
    desp:  () => openModal('desp'),
    docs:  () => openModal('cl-group'),
    notas: () => openModal('nota'),
  };
  (actions[_tab] || (() => openModal('day')))();
}

// ── MODAL ROUTER ──────────────────────────────────────────────
const MODALS = {
  // [title, bodyFn, confirmFn]
  'day':        ['📍 Dia do Roteiro',       extra => dayModalHtml(extra),          () => saveDayModal()],
  'res':        ['🏨 Nova Reserva',         ()    => resModalHtml(),               () => saveResModal()],
  'desp':       ['💸 Nova Despesa',         ()    => despModalHtml(),              () => saveDespModal()],
  'cl-group':   ['✅ Novo Grupo',           ()    => clGroupModalHtml(),           () => saveClGroupModal()],
  'cl-item':    ['+ Item',                  extra => clItemModalHtml(extra),        () => saveClItemModal()],
  'nota':       ['📝 Nova Nota',            ()    => notaModalHtml(),              () => saveNotaModal()],
  'trips':      ['✈️ Minhas Viagens',       ()    => tripsModalHtml(),             () => closeModal(), true],
  'new-trip':   ['🌍 Nova Viagem',          ()    => newTripModalHtml(),           () => saveNewTripModal()],
  'drive-sync': ['☁️ Google Drive',         ()    => driveSyncModalHtml(),         () => closeModal(), true],
  'drive-setup':['☁️ Configurar Drive',     ()    => driveSetupModalHtml(),        () => closeModal(), true],
};

function openModal(type, extra) {
  const cfg = MODALS[type];
  if (!cfg) return;
  const [title, bodyFn, confirmFn, hideOk] = cfg;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = bodyFn(extra);
  document.getElementById('modal-ok').onclick        = confirmFn;
  document.getElementById('modal-ok').style.display  = hideOk ? 'none' : '';
  document.getElementById('modal-bg').classList.add('on');
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('on');
}
document.getElementById('modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── TRIP MANAGER ──────────────────────────────────────────────
function tripsModalHtml() {
  const footer = `
    <div style="margin-top:1rem;display:flex;gap:.5rem">
      <button class="btn btn-primary" style="flex:1" onclick="openModal('new-trip')">+ Nova viagem</button>
      <button class="btn btn-ghost" onclick="saveStore()">💾 Salvar</button>
    </div>
  `;
  if (!S.trips.length) {
    return `
      <div style="text-align:center;padding:1.5rem 0;color:var(--muted)">
        <div style="font-size:2.5rem">🌍</div>
        <div style="font-size:.88rem;margin-top:.5rem">Nenhuma viagem criada ainda</div>
      </div>
      ${footer}
    `;
  }
  return `
    ${S.trips.map(t => `
      <div class="trip-opt ${t.id===S.active?'on':''}" onclick="selectTrip('${t.id}')">
        <span class="to-icon">${t.emoji||'✈️'}</span>
        <div style="flex:1;min-width:0">
          <div class="to-name">${t.name}</div>
          <div class="to-dates">${fmtDate(t.dateFrom)||'—'} → ${fmtDate(t.dateTo)||'—'}</div>
        </div>
        <button class="btn-del" onclick="event.stopPropagation();deleteTrip('${t.id}')">🗑️</button>
      </div>
    `).join('')}
    ${footer}
  `;
}

function newTripModalHtml() {
  const emojis = ['✈️','🏔️','🏖️','🌍','🗺️','🚂','🚢','🏕️','🌴','❄️'];
  return `
    <div class="fg">
      <label>Nome da viagem</label>
      <input type="text" id="nt-name" placeholder="Ex: Patagônia 2026">
    </div>
    <div class="fg">
      <label>Emoji</label>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.4rem">
        ${emojis.map(e => `
          <button onclick="document.getElementById('nt-emoji').value='${e}';
            document.querySelectorAll('.emo-btn').forEach(b=>b.classList.remove('on'));
            this.classList.add('on')"
            class="emo-btn"
            style="font-size:1.4rem;background:none;border:2px solid var(--border);
              border-radius:8px;width:40px;height:40px;cursor:pointer;">${e}</button>
        `).join('')}
      </div>
      <input type="text" id="nt-emoji" value="✈️" placeholder="ou digite um emoji">
    </div>
    <div class="f2">
      <div class="fg">
        <label>Data de início</label>
        <input type="date" id="nt-from">
      </div>
      <div class="fg">
        <label>Data de fim</label>
        <input type="date" id="nt-to">
      </div>
    </div>
    <div class="f2">
      <div class="fg">
        <label>Orçamento</label>
        <input type="number" id="nt-budget" min="0" placeholder="0">
      </div>
      <div class="fg">
        <label>Moeda</label>
        <select id="nt-cur">
          ${['BRL','USD','EUR','ARS','CLP','GBP'].map(c=>`<option>${c}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
}

function saveNewTripModal() {
  const name = document.getElementById('nt-name').value.trim();
  if (!name) { alert('Informe o nome da viagem.'); return; }
  const t = EMPTY_TRIP();
  t.name     = name;
  t.emoji    = document.getElementById('nt-emoji').value.trim() || '✈️';
  t.dateFrom = document.getElementById('nt-from').value;
  t.dateTo   = document.getElementById('nt-to').value;
  t.budget   = parseFloat(document.getElementById('nt-budget').value) || 0;
  t.currency = document.getElementById('nt-cur').value;
  S.trips.push(t);
  selectTrip(t.id);
  closeModal();
}

function selectTrip(id) {
  S.active = id;
  updateTripHeader();
  refreshAll();
  closeModal();
  toast(`Viagem: ${trip().name}`);
}

function deleteTrip(id) {
  if (!confirm('Excluir esta viagem e todos os dados?')) return;
  S.trips = S.trips.filter(t => t.id !== id);
  if (S.active === id) S.active = S.trips[0]?.id || null;
  updateTripHeader();
  refreshAll();
  openModal('trips');
}

function updateTripHeader() {
  const t = trip();
  document.getElementById('trip-title').textContent =
    t ? `${t.emoji} ${t.name}` : 'Lulu Adventure';
  document.getElementById('trip-sub').textContent =
    t ? (fmtDate(t.dateFrom) && fmtDate(t.dateTo)
          ? `${fmtDate(t.dateFrom)} – ${fmtDate(t.dateTo)}`
          : 'Viagem selecionada')
      : 'Nenhuma viagem selecionada';
}

function refreshAll() {
  renderMap();
  if (_tab === 'res')   renderReservas();
  if (_tab === 'desp')  renderDespesas();
  if (_tab === 'docs')  renderDocs();
  if (_tab === 'notas') renderNotas();
}

// ── SAVE ──────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveStore(); }
});

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateTripHeader();
  initMap();
  // Auto-init Drive if credentials are set
  if (DRIVE_CFG.CLIENT_ID !== 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com') {
    driveInit();
  }
  // Prompt to create first trip
  if (!S.trips.length) {
    setTimeout(() => openModal('trips'), 400);
  }
});
