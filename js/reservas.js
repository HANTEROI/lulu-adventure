// ── RESERVAS ─────────────────────────────────────────────────────────────────
function renderReservas() {
  ['hotel','voo','passe','outro'].forEach(tipo => {
    const el = document.getElementById(`rl-${tipo}`);
    const t = trip();
    const list = t ? t.reservas.filter(r => r.tipo === tipo) : [];
    if (!list.length) {
      el.innerHTML = `<div style="font-size:.78rem;color:var(--muted);padding:.4rem 0 .6rem">Nenhuma reserva</div>`;
      return;
    }
    el.innerHTML = list.map(r => `
      <div class="card gap">
        <div class="res-card ${r.tipo}">
          <button class="btn-del" style="position:absolute;top:.5rem;right:.5rem" onclick="delRes('${r.id}')">✕</button>
          <div class="res-ico">${RES_ICO[r.tipo]}</div>
          <div class="res-info">
            <div class="res-title">${r.title}</div>
            <div class="res-det">${r.det||''}</div>
            <div class="res-dates">
              ${r.from ? '📅 '+fmtDate(r.from) : ''}
              ${r.to   ? ' → '+fmtDate(r.to)  : ''}
              ${r.code ? ' · <strong>'+r.code+'</strong>' : ''}
            </div>
            ${r.obs ? `<div class="res-obs">${r.obs}</div>` : ''}
          </div>
          <span class="badge ${STATUS[r.status]?.cls||'badge-pend'}">${STATUS[r.status]?.label||'Pendente'}</span>
        </div>
      </div>
    `).join('');
  });
}

function delRes(id) {
  const t = trip(); if (!t) return;
  t.reservas = t.reservas.filter(r => r.id !== id);
  renderReservas();
}

function resModalHtml() {
  return `
    <div class="f2">
      <div class="fg">
        <label>Tipo</label>
        <select id="fr-tipo">
          <option value="hotel">🏨 Hotel/Estadia</option>
          <option value="voo">✈️ Voo/Transfer</option>
          <option value="passe">🎫 Passeio/Parque</option>
          <option value="outro">📋 Outro</option>
        </select>
      </div>
      <div class="fg">
        <label>Status</label>
        <select id="fr-status">
          <option value="pend">Pendente</option>
          <option value="ok">Confirmado</option>
          <option value="cancel">Cancelado</option>
        </select>
      </div>
    </div>
    <div class="fg">
      <label>Título</label>
      <input type="text" id="fr-title" placeholder="Ex: Hotel Plaza — Buenos Aires">
    </div>
    <div class="fg">
      <label>Detalhe</label>
      <input type="text" id="fr-det" placeholder="Ex: 3 noites, café da manhã incluso">
    </div>
    <div class="f2">
      <div class="fg">
        <label>Início / Check-in</label>
        <input type="date" id="fr-from">
      </div>
      <div class="fg">
        <label>Fim / Check-out</label>
        <input type="date" id="fr-to">
      </div>
    </div>
    <div class="fg">
      <label>Código de confirmação</label>
      <input type="text" id="fr-code" placeholder="Ex: ABC-12345">
    </div>
    <div class="fg">
      <label>Observações</label>
      <textarea id="fr-obs" rows="2" placeholder="Notas extras..."></textarea>
    </div>
  `;
}

function saveResModal() {
  if (!requireTrip()) return;
  const title = document.getElementById('fr-title').value.trim();
  if (!title) { alert('Informe o título.'); return; }
  trip().reservas.push({
    id:     uid(),
    tipo:   document.getElementById('fr-tipo').value,
    status: document.getElementById('fr-status').value,
    title,
    det:    document.getElementById('fr-det').value.trim(),
    from:   document.getElementById('fr-from').value,
    to:     document.getElementById('fr-to').value,
    code:   document.getElementById('fr-code').value.trim(),
    obs:    document.getElementById('fr-obs').value.trim(),
  });
  renderReservas();
  closeModal();
}
