// ── NOTAS ────────────────────────────────────────────────────────────────────
function renderNotas() {
  const el = document.getElementById('notas-list');
  const t  = trip();
  if (!t || !t.notas.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--muted)">
        <div style="font-size:2rem;margin-bottom:.5rem">📝</div>
        <div style="font-size:.85rem">Registre memórias e fotos por destino</div>
      </div>`;
    return;
  }
  const sorted = [...t.notas].sort((a,b) => b.date.localeCompare(a.date));
  el.innerHTML = sorted.map(n => `
    <div class="nota-card">
      <div class="nota-hdr">
        <div class="nota-hdr-info">
          <div class="nd">${n.dest}</div>
          <div class="ndate">${fmtDate(n.date)||''}</div>
        </div>
        <button class="btn-del" style="color:rgba(255,255,255,.4)" onclick="delNota('${n.id}')">✕</button>
      </div>
      <div class="nota-body">
        <div class="nota-txt">${escHtml(n.texto)}</div>
        <div class="nota-fotos">
          ${(n.fotos||[]).map((src,fi) => `
            <img class="nf-img" src="${src}" alt="foto"
              onclick="openLB('${n.id}',${fi})">
          `).join('')}
          <label class="nf-add" title="Adicionar foto">
            📷
            <input type="file" accept="image/*" capture="environment"
              style="display:none" onchange="addFoto('${n.id}',this)">
          </label>
        </div>
      </div>
    </div>
  `).join('');
}

function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function delNota(id) {
  const t = trip(); if (!t) return;
  t.notas = t.notas.filter(n => n.id !== id);
  renderNotas();
}

function addFoto(notaId, input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const n = trip()?.notas.find(x => x.id === notaId);
    if (n) { n.fotos = n.fotos||[]; n.fotos.push(e.target.result); renderNotas(); }
  };
  reader.readAsDataURL(file);
}

function openLB(notaId, fi) {
  const n = trip()?.notas.find(x => x.id === notaId);
  if (!n?.fotos[fi]) return;
  document.getElementById('lb-img').src = n.fotos[fi];
  document.getElementById('lb').classList.add('on');
}

function notaModalHtml() {
  const t = trip();
  const destinos = t ? t.days.map(d => `<option>${d.loc||d.title}</option>`).join('') : '';
  return `
    <div class="fg">
      <label>Destino</label>
      <input type="text" id="fn-dest" list="fn-dests" placeholder="Ex: El Chaltén">
      <datalist id="fn-dests">${destinos}<option>Geral</option></datalist>
    </div>
    <div class="fg">
      <label>Data</label>
      <input type="date" id="fn-date" value="${new Date().toISOString().slice(0,10)}">
    </div>
    <div class="fg">
      <label>Nota</label>
      <textarea id="fn-texto" rows="5" placeholder="Escreva suas impressões, dicas, memórias..."></textarea>
    </div>
  `;
}

function saveNotaModal() {
  if (!requireTrip()) return;
  const dest  = document.getElementById('fn-dest').value.trim();
  const texto = document.getElementById('fn-texto').value.trim();
  if (!dest) { alert('Informe o destino.'); return; }
  trip().notas.push({
    id:    uid(),
    dest,
    date:  document.getElementById('fn-date').value,
    texto,
    fotos: [],
  });
  renderNotas();
  closeModal();
}
