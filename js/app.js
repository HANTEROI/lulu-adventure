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
  'day':        ['📍 Dia do Roteiro',      extra => dayModalHtml(extra),        () => saveDayModal()],
  'res':        ['🏨 Nova Reserva',        ()    => resModalHtml(),             () => saveResModal()],
  'desp':       ['💸 Nova Despesa',        ()    => despModalHtml(),            () => saveDespModal()],
  'cl-group':   ['✅ Novo Grupo',          ()    => clGroupModalHtml(),         () => saveClGroupModal()],
  'cl-item':    ['+ Item',                 extra => clItemModalHtml(extra),      () => saveClItemModal()],
  'nota':       ['📝 Nova Nota',           ()    => notaModalHtml(),            () => saveNotaModal()],
  'trips':      ['✈️ Minhas Viagens',      ()    => tripsModalHtml(),           () => closeModal(), true],
  'new-trip':   ['🌍 Nova Viagem',         ()    => newTripModalHtml(),         () => saveNewTripModal()],
  'drive-sync': ['☁️ Google Drive',        ()    => driveSyncModalHtml(),       () => closeModal(), true],
  'drive-setup':['☁️ Configurar Drive',    ()    => driveSetupModalHtml(),      () => closeModal(), true],
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
      <div style="text-align:center;padding:2rem 0;color:var(--muted)">
        <div style="font-size:3rem">🌍</div>
        <div style="font-size:.9rem;margin-top:.6rem;font-weight:600">Nenhuma viagem criada ainda</div>
        <div style="font-size:.78rem;margin-top:.3rem">Crie sua primeira aventura!</div>
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
          <div class="to-dates">
            ${fmtDate(t.dateFrom)||'—'} → ${fmtDate(t.dateTo)||'—'}
            · ${t.days?.length||0} dias · ${t.reservas?.length||0} reservas
          </div>
        </div>
        <button class="btn-del" onclick="event.stopPropagation();deleteTrip('${t.id}')">🗑️</button>
      </div>
    `).join('')}
    ${footer}
  `;
}

function newTripModalHtml() {
  const emojis = ['✈️','🏔️','🏖️','🌍','🗺️','🚂','🚢','🏕️','🌴','❄️','🦁','🗼','🏯','🌋','🐧'];
  return `
    <div class="fg">
      <label>Nome da viagem</label>
      <input type="text" id="nt-name" placeholder="Ex: Patagônia 2026" autofocus>
    </div>
    <div class="fg">
      <label>Escolha um emoji</label>
      <div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.5rem">
        ${emojis.map(e => `
          <button type="button"
            onclick="document.getElementById('nt-emoji').value='${e}';
              document.querySelectorAll('.emo-btn').forEach(b=>b.style.background='');
              this.style.background='var(--accent)';this.style.color='#fff'"
            class="emo-btn"
            style="font-size:1.3rem;background:var(--snow);border:1.5px solid var(--border);
              border-radius:8px;width:38px;height:38px;cursor:pointer;transition:.15s">${e}</button>
        `).join('')}
      </div>
      <input type="text" id="nt-emoji" value="✈️" placeholder="Emoji personalizado">
    </div>
    <div class="fg">
      <label>Foto de capa (URL ou upload)</label>
      <input type="url" id="nt-cover" placeholder="https://... ou deixe vazio">
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
  selectTrip(t.id);
  closeModal();
}

function selectTrip(id) {
  S.active = id;
  updateTripHeader();
  updateSummary();
  refreshAll();
  closeModal();
  toast(`${trip().emoji} ${trip().name}`);
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

  // Cover photo
  const cover = document.getElementById('trip-cover');
  if (cover) {
    if (t?.cover) {
      cover.style.backgroundImage = `url('${t.cover}')`;
      cover.style.display = 'block';
    } else {
      cover.style.display = 'none';
    }
  }
}

// ── SUMMARY PANEL ─────────────────────────────────────────────
function updateSummary() {
  const el = document.getElementById('summary-bar');
  if (!el) return;
  const t = trip();
  if (!t) { el.style.display = 'none'; return; }

  const dias     = t.days.length;
  const gasto    = t.despesas.reduce((s,e) => s + (+e.val||0), 0);
  const budget   = t.budget || 0;
  const pct      = budget ? Math.round((gasto/budget)*100) : 0;
  const checkTot = t.checks.reduce((s,c) => s + c.items.length, 0);
  const checkOk  = t.checks.reduce((s,c) => s + c.items.filter(i=>i.done).length, 0);
  const checkPct = checkTot ? Math.round((checkOk/checkTot)*100) : 0;
  const resConf  = t.reservas.filter(r => r.status === 'ok').length;
  const resTotal = t.reservas.length;

  el.style.display = 'flex';
  el.innerHTML = `
    <div class="sum-item" onclick="switchTab('map')">
      <div class="sum-val">${dias}</div>
      <div class="sum-lbl">dias</div>
    </div>
    <div class="sum-div"></div>
    <div class="sum-item" onclick="switchTab('res')">
      <div class="sum-val">${resConf}<span style="font-size:.7rem;color:var(--muted)">/${resTotal}</span></div>
      <div class="sum-lbl">reservas ✓</div>
    </div>
    <div class="sum-div"></div>
    <div class="sum-item" onclick="switchTab('desp')">
      <div class="sum-val" style="${pct>100?'color:var(--red)':''}">${pct}%</div>
      <div class="sum-lbl">orçamento</div>
    </div>
    <div class="sum-div"></div>
    <div class="sum-item" onclick="switchTab('docs')">
      <div class="sum-val" style="${checkPct===100?'color:var(--accent)':''}">${checkPct}%</div>
      <div class="sum-lbl">checklist</div>
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
  updateSummary();
  initMap();
  if (DRIVE_CFG.CLIENT_ID !== 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com') driveInit();
  if (!S.trips.length) setTimeout(() => openModal('trips'), 400);
});