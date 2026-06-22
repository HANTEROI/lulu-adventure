// ── DESPESAS ─────────────────────────────────────────────────────────────────
function renderDespesas() {
  const t = trip();
  const bw = document.getElementById('budget-wrap');
  const dl = document.getElementById('desp-list');

  if (!t) { bw.innerHTML = ''; dl.innerHTML = ''; return; }

  const total = t.budget || 0;
  const gasto = t.despesas.reduce((s,e) => s + (+e.val||0), 0);
  const pct   = total ? Math.min((gasto/total)*100, 100) : 0;
  const over  = gasto > total && total > 0;

  // category breakdown
  const bycat = {};
  t.despesas.forEach(e => bycat[e.cat] = (bycat[e.cat]||0) + (+e.val||0));
  const chips = Object.entries(bycat).map(([cat, v]) =>
    `<span class="chip" style="background:${CAT[cat]?.color||'#ccc'}22;color:${CAT[cat]?.color||'#999'}">
      ${CAT[cat]?.label||cat} ${fmtMoney(v)}
    </span>`
  ).join('');

  bw.innerHTML = `
    <div class="budget-wrap">
      <div class="bud-top">
        <span class="bud-total">Orçamento: ${total ? fmtMoney(total) : 'não definido'}</span>
        <span class="bud-used" style="${over?'color:var(--red)':''}">${fmtMoney(gasto)} gastos</span>
      </div>
      <div class="bud-bar"><div class="bud-fill ${over?'over':''}" style="width:${pct}%"></div></div>
      <div class="bud-chips">${chips}</div>
      <div style="display:flex;gap:.5rem;align-items:center;margin-top:.6rem">
        <span style="font-size:.72rem;color:var(--muted)">Orçamento:</span>
        <input id="bud-inp" type="number" value="${total}"
          style="width:110px;padding:.3rem .55rem;border:1.5px solid var(--border);border-radius:6px;font-size:.82rem">
        <select id="bud-cur" style="padding:.3rem .5rem;border:1.5px solid var(--border);border-radius:6px;font-size:.78rem">
          ${['BRL','USD','EUR','ARS','CLP','GBP'].map(c=>`<option ${t.currency===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <button onclick="saveBudget()" class="btn btn-ghost" style="padding:.3rem .7rem;font-size:.75rem">OK</button>
      </div>
    </div>
  `;

  if (!t.despesas.length) {
    dl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.84rem">Nenhuma despesa registrada</div>`;
    return;
  }

  const sorted = [...t.despesas].sort((a,b) => b.date.localeCompare(a.date));
  dl.innerHTML = sorted.map(e => `
    <div class="desp-row">
      <div class="desp-dot" style="background:${CAT[e.cat]?.color||'#ccc'}"></div>
      <div class="desp-desc">
        <div class="desp-name">${e.desc}</div>
        <div class="desp-meta">${CAT[e.cat]?.label||e.cat} · ${fmtDate(e.date)||'—'}
          ${e.pago
            ? ' · <span style="color:var(--accent);font-weight:700">✓ Pago</span>'
            : ' · <span style="color:var(--amber);font-weight:700">Pendente</span>'}
        </div>
      </div>
      <div class="desp-val">${fmtMoney(e.val)}</div>
      <button class="btn-del" onclick="delDesp('${e.id}')">✕</button>
    </div>
  `).join('');
}

function saveBudget() {
  const t = trip(); if (!t) return;
  t.budget   = parseFloat(document.getElementById('bud-inp').value) || 0;
  t.currency = document.getElementById('bud-cur').value;
  renderDespesas();
  toast('Orçamento atualizado');
}

function delDesp(id) {
  const t = trip(); if (!t) return;
  t.despesas = t.despesas.filter(e => e.id !== id);
  renderDespesas();
}

function despModalHtml() {
  return `
    <div class="fg">
      <label>Descrição</label>
      <input type="text" id="fe-desc" placeholder="Ex: Jantar no centro">
    </div>
    <div class="f2">
      <div class="fg">
        <label>Categoria</label>
        <select id="fe-cat">
          ${Object.entries(CAT).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="fg">
        <label>Valor</label>
        <input type="number" id="fe-val" step="0.01" min="0" placeholder="0,00">
      </div>
    </div>
    <div class="f2">
      <div class="fg">
        <label>Data</label>
        <input type="date" id="fe-date" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="fg">
        <label>Situação</label>
        <select id="fe-pago">
          <option value="0">Pendente</option>
          <option value="1">Pago</option>
        </select>
      </div>
    </div>
  `;
}

function saveDespModal() {
  if (!requireTrip()) return;
  const desc = document.getElementById('fe-desc').value.trim();
  const val  = parseFloat(document.getElementById('fe-val').value);
  if (!desc)   { alert('Informe a descrição.'); return; }
  if (!val||val<=0) { alert('Informe um valor válido.'); return; }
  trip().despesas.push({
    id:   uid(),
    desc,
    cat:  document.getElementById('fe-cat').value,
    val,
    date: document.getElementById('fe-date').value,
    pago: document.getElementById('fe-pago').value === '1',
  });
  renderDespesas();
  closeModal();
}
