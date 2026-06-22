// ── DOCS / CHECKLIST ─────────────────────────────────────────────────────────
function renderDocs() {
  const el = document.getElementById('cl-groups');
  const t  = trip();
  if (!t || !t.checks.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--muted)">
        <div style="font-size:2rem;margin-bottom:.5rem">✅</div>
        <div style="font-size:.85rem">Crie seu primeiro grupo de checklist</div>
      </div>`;
    return;
  }
  el.innerHTML = t.checks.map(cl => {
    const done  = cl.items.filter(i => i.done).length;
    const total = cl.items.length;
    return `
      <div class="cl-group">
        <div class="cl-hdr" onclick="toggleCL('${cl.id}')">
          <div class="cl-hdr-left">
            <span>${cl.grupo}</span>
          </div>
          <span class="cl-prog">${done}/${total}</span>
        </div>
        <div class="cl-items" id="cl-${cl.id}">
          ${cl.items.map(item => `
            <div class="cl-row ${item.done?'done':''}" id="clr-${item.id}">
              <input type="checkbox" id="cb-${item.id}" ${item.done?'checked':''}
                onchange="toggleItem('${cl.id}','${item.id}',this.checked)">
              <label for="cb-${item.id}">${item.texto}</label>
              <button class="btn-del" onclick="delItem('${cl.id}','${item.id}')">✕</button>
            </div>
          `).join('')}
          <div class="cl-add-row">
            <button class="btn btn-ghost" style="font-size:.74rem;padding:.3rem .75rem"
              onclick="openModal('cl-item','${cl.id}')">+ Item</button>
            <button class="btn-del" style="margin-left:.4rem;font-size:.72rem"
              onclick="delGroup('${cl.id}')">🗑️ Grupo</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleCL(id) {
  const el = document.getElementById(`cl-${id}`);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

function toggleItem(clId, itemId, checked) {
  const cl = trip()?.checks.find(c => c.id === clId);
  if (!cl) return;
  const item = cl.items.find(i => i.id === itemId);
  if (item) item.done = checked;
  const row = document.getElementById(`clr-${itemId}`);
  if (row) row.className = `cl-row ${checked ? 'done' : ''}`;
  // update counter
  const hdr = document.querySelector(`#cl-${clId}`)?.previousElementSibling?.querySelector('.cl-prog');
  if (hdr) {
    const done = cl.items.filter(i=>i.done).length;
    hdr.textContent = `${done}/${cl.items.length}`;
  }
}

function delItem(clId, itemId) {
  const cl = trip()?.checks.find(c => c.id === clId);
  if (cl) cl.items = cl.items.filter(i => i.id !== itemId);
  renderDocs();
}

function delGroup(clId) {
  if (!confirm('Remover este grupo?')) return;
  const t = trip(); if (!t) return;
  t.checks = t.checks.filter(c => c.id !== clId);
  renderDocs();
}

// ── MODALS ─────────────────────────────────────────────────────
function clGroupModalHtml() {
  return `
    <div class="fg">
      <label>Nome do grupo</label>
      <input type="text" id="fcg-name" placeholder="Ex: 🧳 Bagagem de mão">
    </div>
    <div class="fg">
      <label>Itens iniciais (um por linha)</label>
      <textarea id="fcg-items" rows="6" placeholder="Passaporte&#10;Seguro viagem&#10;Carregador"></textarea>
    </div>
  `;
}

function saveClGroupModal() {
  if (!requireTrip()) return;
  const nome  = document.getElementById('fcg-name').value.trim();
  if (!nome) { alert('Informe o nome do grupo.'); return; }
  const raw   = document.getElementById('fcg-items').value;
  const items = raw.split('\n').map(s=>s.trim()).filter(Boolean)
                   .map(texto => ({ id: uid(), texto, done: false }));
  trip().checks.push({ id: uid(), grupo: nome, items });
  renderDocs();
  closeModal();
}

function clItemModalHtml(clId) {
  return `
    <div class="fg">
      <label>Item</label>
      <input type="text" id="fci-texto" placeholder="Ex: Protetor solar FPS 50">
      <input type="hidden" id="fci-clid" value="${clId}">
    </div>
  `;
}

function saveClItemModal() {
  if (!requireTrip()) return;
  const texto = document.getElementById('fci-texto').value.trim();
  const clId  = document.getElementById('fci-clid').value;
  if (!texto) { alert('Informe o item.'); return; }
  const cl = trip().checks.find(c => c.id === clId);
  if (cl) cl.items.push({ id: uid(), texto, done: false });
  renderDocs();
  closeModal();
}
