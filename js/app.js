// ── APP ───────────────────────────────────────────────────────────────────────
let _tab = 'map';
let _darkMode = localStorage.getItem('lulu_dark') === '1';

// ── DARK MODE ─────────────────────────────────────────────────
function applyDark(dark) {
  _darkMode = dark;
  localStorage.setItem('lulu_dark', dark ? '1' : '0');
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
  const btn = document.getElementById('btn-dark');
  if (btn) btn.textContent = dark ? '☀️' : '🌙';
}

// ── WELCOME SCREEN ────────────────────────────────────────────
function showWelcome() {
  renderWelcome();
  document.getElementById('welcome').classList.remove('hidden');
}

function hideWelcome() {
  document.getElementById('welcome').classList.add('hidden');
}

function renderWelcome() {
  const wrap = document.getElementById('wlc-trips-wrap');
  if (!S.trips.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:2rem 0 1.5rem;color:rgba(255,255,255,.4)">
        <div style="font-size:2.5rem;margin-bottom:.6rem">🗺️</div>
        <div style="font-size:.88rem;font-weight:600">Nenhuma viagem ainda</div>
        <div style="font-size:.75rem;margin-top:.3rem">Crie sua primeira aventura abaixo!</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="wlc-section-title" style="color:rgba(255,255,255,.35);margin-bottom:.6rem">
      Suas viagens
    </div>
    <div class="wlc-trips">
      ${S.trips.map(t => {
        const dias    = t.days?.length || 0;
        const res     = t.reservas?.length || 0;
        const gasto   = t.despesas?.reduce((s,e) => s+(+e.val||0), 0) || 0;
        const isActive = t.id === S.active;
        return `
          <div class="wlc-trip ${isActive?'active-trip':''}" onclick="selectTrip('${t.id}')">
            <span class="wlc-trip-emoji">${t.emoji||'✈️'}</span>
            <div class="wlc-trip-info">
              <div class="wlc-trip-name">${t.name}</div>
              <div class="wlc-trip-dates">
                ${fmtDate(t.dateFrom)||'—'} → ${fmtDate(t.dateTo)||'—'}
              </div>
              <div class="wlc-trip-stats">
                <span class="wlc-stat">📍 ${dias} dias</span>
                <span class="wlc-stat">🏨 ${res} reservas</span>
                ${gasto > 0 ? `<span class="wlc-stat">💰 ${fmtMoney(gasto)}</span>` : ''}
                ${isActive ? '<span class="wlc-stat" style="background:rgba(0,201,174,.2);color:#00c9ae">● Ativa</span>' : ''}
              </div>
            </div>
            ${t.cover ? `<img class="wlc-cover" src="${t.cover}" onerror="this.style.display='none'">` : ''}
            <button class="wlc-trip-del" onclick="event.stopPropagation();deleteTripWlc('${t.id}')">🗑️</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function deleteTripWlc(id) {
  if (!confirm('Excluir esta viagem e todos os dados?')) return;
  S.trips = S.trips.filter(t => t.id !== id);
  if (S.active === id) S.active = S.trips[0]?.id || null;
  updateTripHeader();
  refreshAll();
  renderWelcome();
  if (!S.trips.length) return; // stay on welcome
}

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
  'day':        ['📍 Dia do Roteiro',    extra => dayModalHtml(extra),       () => saveDayModal()],
  'res':        ['🏨 Nova Reserva',      ()    => resModalHtml(),            () => saveResModal()],
  'desp':       ['💸 Nova Despesa',      ()    => despModalHtml(),           () => saveDespModal()],
  'cl-group':   ['✅ Novo Grupo',        ()    => clGroupModalHtml(),        () => saveClGroupModal()],
  'cl-item':    ['+ Item',               extra => clItemModalHtml(extra),     () => saveClItemModal()],
  'nota':       ['📝 Nova Nota',         ()    => notaModalHtml(),           () => saveNotaModal()],
  'new-trip':   ['🌍 Nova Viagem',       ()    => newTripModalHtml(),        () => saveNewTripModal()],
  'drive-sync': ['☁️ Google Drive',      ()    => driveSyncModalHtml(),      () => closeModal(), true],
  'drive-setup':['☁️ Configurar Drive',  ()    => driveSetupModalHtml(),     () => closeModal(), true],
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
  hideSuggestions?.();
}
document.getElementById('modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── NEW TRIP FORM ──────────────────────────────────────────────
function newTripModalHtml() {
  const emojis = ['✈️','🏔️','🏖️','🌍','🗺️','🚂','🚢','🏕️','🌴','❄️','🦁','🗼','🏯','🌋','🐧'];
  return `
    <div class="fg">
      <label>Nome da viagem</label>
      <input type="text" id="nt-name" placeholder="Ex: Patagônia 2026" autofocus>
    </div>
    <div class="fg">
      <label>Emoji</label>
      <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.45rem">
        ${emojis.map(e => `
          <button type="button"
            onclick="document.getElementById('nt-emoji').value='${e}';
              document.querySelectorAll('.emo-btn').forEach(b=>{b.style.background='';b.style.borderColor='var(--border)'});
              this.style.background='var(--accent)';this.style.borderColor='var(--accent)'"
            class="emo-btn"
            style="font-size:1.2rem;background:var(--snow);border:1.5px solid var(--border);
              border-radius:8px;width:36px;height:36px;cursor:pointer;transition:.15s">${e}</button>
        `).join('')}
      </div>
      <input type="text" id="nt-emoji" value="✈️" placeholder="Ou digite um emoji">
    </div>
    <div class="fg">
      <label>Foto de capa (URL de imagem)</label>
      <input type="url" id="nt-cover" placeholder="https://images.unsplash.com/...">
    </div>
    <div class="f2">
      <div class="fg"><label>Início</label><input type="date" id="nt-from"></div>
      <div class="fg"><label>Fim</label><input type="date" id="nt-to"></div>
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
  t.cover    = document.getElementById('nt-cover').value.trim();
  t.dateFrom = document.getElementById('nt-from').value;
  t.dateTo   = document.getElementById('nt-to').value;
  t.budget   = parseFloat(document.getElementById('nt-budget').value) || 0;
  t.currency = document.getElementById('nt-cur').value;
  S.trips.push(t);
  closeModal();
  selectTrip(t.id);
}

// ── TRIP SELECTION ────────────────────────────────────────────
function selectTrip(id) {
  S.active = id;
  hideWelcome();
  updateTripHeader();
  updateSummary();
  refreshAll();
  saveStore();
  toast(`${trip().emoji} ${trip().name} selecionada!`);
}

function deleteTrip(id) {
  if (!confirm('Excluir esta viagem e todos os dados?')) return;
  S.trips = S.trips.filter(t => t.id !== id);
  if (S.active === id) S.active = S.trips[0]?.id || null;
  updateTripHeader();
  refreshAll();
}

// ── HEADER & SUMMARY ──────────────────────────────────────────
function updateTripHeader() {
  const t = trip();
  document.getElementById('trip-title').textContent =
    t ? `${t.emoji} ${t.name}` : 'Lulu Adventure';
  document.getElementById('trip-sub').textContent =
    t ? (fmtDate(t.dateFrom) && fmtDate(t.dateTo)
         ? `${fmtDate(t.dateFrom)} – ${fmtDate(t.dateTo)}`
         : 'Toque para trocar')
      : 'Toque para selecionar';

  // Sidebar banner
  const emoji = document.getElementById('stb-emoji');
  const name  = document.getElementById('stb-name');
  if (emoji) emoji.textContent = t?.emoji || '✈️';
  if (name)  name.textContent  = t?.name  || 'Selecionar viagem';
}

function updateSummary() {
  const el = document.getElementById('summary-bar');
  if (!el) return;
  const t = trip();
  if (!t) { el.style.display = 'none'; return; }

  const dias     = t.days.length;
  const gasto    = t.despesas.reduce((s,e) => s+(+e.val||0), 0);
  const budget   = t.budget || 0;
  const pct      = budget ? Math.round((gasto/budget)*100) : 0;
  const chkTot   = t.checks.reduce((s,c) => s+c.items.length, 0);
  const chkOk    = t.checks.reduce((s,c) => s+c.items.filter(i=>i.done).length, 0);
  const chkPct   = chkTot ? Math.round((chkOk/chkTot)*100) : 0;
  const resConf  = t.reservas.filter(r => r.status==='ok').length;
  const resTotal = t.reservas.length;

  el.style.display = 'flex';
  el.innerHTML = `
    <div class="sum-item" onclick="switchTab('map')">
      <div class="sum-val">${dias}</div>
      <div class="sum-lbl">dias</div>
    </div>
    <div class="sum-div"></div>
    <div class="sum-item" onclick="switchTab('res')">
      <div class="sum-val">${resConf}<span style="font-size:.65rem;color:var(--muted)">/${resTotal}</span></div>
      <div class="sum-lbl">reservas ✓</div>
    </div>
    <div class="sum-div"></div>
    <div class="sum-item" onclick="switchTab('desp')">
      <div class="sum-val" style="${pct>100?'color:var(--red)':''}">${pct}%</div>
      <div class="sum-lbl">orçamento</div>
    </div>
    <div class="sum-div"></div>
    <div class="sum-item" onclick="switchTab('docs')">
      <div class="sum-val" style="${chkPct===100?'color:var(--accent)':''}">${chkPct}%</div>
      <div class="sum-lbl">checklist</div>
    </div>
    <div class="sum-div"></div>
    <div class="sum-item" onclick="saveStore()">
      <div class="sum-val" style="font-size:.75rem">💾</div>
      <div class="sum-lbl">salvar</div>
    </div>
  `;
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
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveStore(); }
});

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyDark(_darkMode);
  updateTripHeader();
  initMap();
  if (DRIVE_CFG.CLIENT_ID !== 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com') driveInit();

  // Show welcome if no trips OR no active trip
  if (!S.trips.length || !S.active) {
    showWelcome();
  } else {
    updateSummary();
  }
});