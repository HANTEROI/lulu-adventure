// ── STORE ────────────────────────────────────────────────────────────────────
// Multi-trip data layer. All state in window.S.
// S.trips = array of Trip objects
// S.active = id of active trip (or null)

const STORE_KEY = 'lulu_adv_v1';

const EMPTY_TRIP = () => ({
  id:       uid(),
  name:     'Nova Viagem',
  emoji:    '✈️',
  dateFrom: '',
  dateTo:   '',
  budget:   0,
  currency: 'BRL',
  days:     [],
  reservas: [],
  despesas: [],
  checks:   [],   // [{id, grupo, items:[{id,texto,done}]}]
  notas:    [],
});

// ── INIT ──────────────────────────────────────────────────────
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.trips)) return parsed;
    }
  } catch(e) {}
  return { trips: [], active: null };
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(window.S));
  toast('Salvo! ✓');
}

window.S = loadStore();

// ── ACTIVE TRIP HELPER ─────────────────────────────────────────
function trip() {
  return S.trips.find(t => t.id === S.active) || null;
}

function requireTrip() {
  if (!trip()) { openModal('trips'); return false; }
  return true;
}

// ── UTILS ──────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtDate(iso) {
  if (!iso) return '';
  const [,m,d] = iso.split('-');
  const M = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${+d} ${M[+m-1]}`;
}

function fmtMoney(v, cur) {
  const c = cur || (trip()?.currency) || 'BRL';
  const sym = { BRL:'R$', USD:'US$', EUR:'€', ARS:'$', CLP:'$', GBP:'£' }[c] || c;
  return sym + ' ' + (+v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function toast(msg, dur=1800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.opacity = '0', dur);
}

// ── CAT COLORS / LABELS ────────────────────────────────────────
const CAT = {
  transporte:  { label:'✈️ Transporte',  color:'#1a7fd4' },
  hospedagem:  { label:'🏨 Hospedagem',  color:'#00b8a0' },
  alimentacao: { label:'🍽️ Alimentação', color:'#f0a500' },
  passeios:    { label:'🥾 Passeios',    color:'#e5432a' },
  compras:     { label:'🛍️ Compras',     color:'#7c5cbf' },
  outros:      { label:'📦 Outros',      color:'#8fa3b8' },
};

const RES_ICO   = { hotel:'🏨', voo:'✈️', passe:'🎫', outro:'📋' };
const RES_LABEL = { hotel:'Hotel/Estadia', voo:'Voo/Transfer', passe:'Passeio/Parque', outro:'Outro' };
const STATUS    = {
  ok:     { label:'Confirmado', cls:'badge-ok'     },
  pend:   { label:'Pendente',   cls:'badge-pend'   },
  cancel: { label:'Cancelado',  cls:'badge-cancel' },
};
