// ── GOOGLE DRIVE SYNC ────────────────────────────────────────────────────────
// Saves/loads a single file 'lulu_adventure_data.json' in the user's Drive root.
// Requires a Google API key and OAuth Client ID configured below.

const DRIVE_CFG = {
  CLIENT_ID:   'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com',
  API_KEY:     'SUA_API_KEY_AQUI',
  SCOPE:       'https://www.googleapis.com/auth/drive.file',
  FILE_NAME:   'lulu_adventure_data.json',
  DISCOVERY:   'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
};

let _driveReady    = false;
let _driveFileId   = null;
let _driveSignedIn = false;

// ── INIT ──────────────────────────────────────────────────────
function driveInit() {
  // Load Google API script if not present
  if (document.getElementById('gapi-script')) { _driveLoad(); return; }
  const s = document.createElement('script');
  s.id  = 'gapi-script';
  s.src = 'https://apis.google.com/js/api.js';
  s.onload = _driveLoad;
  document.head.appendChild(s);
}

function _driveLoad() {
  gapi.load('client:auth2', async () => {
    try {
      await gapi.client.init({
        apiKey:      DRIVE_CFG.API_KEY,
        clientId:    DRIVE_CFG.CLIENT_ID,
        discoveryDocs: [DRIVE_CFG.DISCOVERY],
        scope:       DRIVE_CFG.SCOPE,
      });
      _driveReady = true;
      const auth = gapi.auth2.getAuthInstance();
      _driveSignedIn = auth.isSignedIn.get();
      auth.isSignedIn.listen(_updateDriveBtn);
      _updateDriveBtn(_driveSignedIn);
    } catch(e) {
      console.warn('Drive init error:', e);
    }
  });
}

function _updateDriveBtn(signedIn) {
  _driveSignedIn = signedIn;
  const btn = document.getElementById('btn-drive');
  const ico = document.getElementById('drive-ico');
  if (signedIn) {
    btn.classList.add('connected');
    ico.textContent = '✅';
    btn.title = 'Drive conectado — clique para sincronizar';
  } else {
    btn.classList.remove('connected');
    ico.textContent = '☁️';
    btn.title = 'Conectar ao Google Drive';
  }
}

// ── PUBLIC ACTIONS ────────────────────────────────────────────
function driveAction() {
  if (!_driveReady) {
    // CONFIG NOT SET — show instructions
    if (DRIVE_CFG.CLIENT_ID === 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com') {
      openModal('drive-setup');
      return;
    }
    driveInit();
    toast('Conectando ao Drive...');
    return;
  }
  if (!_driveSignedIn) {
    gapi.auth2.getAuthInstance().signIn();
  } else {
    openModal('drive-sync');
  }
}

async function driveUpload() {
  if (!_driveSignedIn) { toast('Faça login no Drive primeiro.'); return; }
  toast('Enviando para Drive...');
  try {
    const content = JSON.stringify(window.S, null, 2);
    if (_driveFileId) {
      await _updateFile(_driveFileId, content);
    } else {
      _driveFileId = await _findOrCreateFile(content);
    }
    toast('✅ Backup no Drive salvo!');
  } catch(e) {
    toast('❌ Erro no Drive: ' + e.message);
    console.error(e);
  }
  closeModal();
}

async function driveDownload() {
  if (!_driveSignedIn) { toast('Faça login no Drive primeiro.'); return; }
  toast('Baixando do Drive...');
  try {
    const fileId = _driveFileId || await _findFile();
    if (!fileId) { toast('Nenhum backup encontrado no Drive.'); return; }
    const res = await gapi.client.drive.files.get({ fileId, alt: 'media' });
    const data = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
    if (data?.trips) {
      window.S = data;
      localStorage.setItem(STORE_KEY, JSON.stringify(S));
      _driveFileId = fileId;
      refreshAll();
      toast('✅ Dados restaurados do Drive!');
    }
  } catch(e) {
    toast('❌ Erro ao restaurar: ' + e.message);
    console.error(e);
  }
  closeModal();
}

function driveSignOut() {
  if (_driveReady) gapi.auth2.getAuthInstance().signOut();
  closeModal();
}

// ── HELPERS ───────────────────────────────────────────────────
async function _findFile() {
  const res = await gapi.client.drive.files.list({
    q: `name='${DRIVE_CFG.FILE_NAME}' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  return res.result.files?.[0]?.id || null;
}

async function _updateFile(fileId, content) {
  return gapi.client.request({
    path:   `/upload/drive/v3/files/${fileId}`,
    method: 'PATCH',
    params: { uploadType: 'media' },
    headers:{ 'Content-Type': 'application/json' },
    body:   content,
  });
}

async function _findOrCreateFile(content) {
  let fileId = await _findFile();
  if (fileId) { await _updateFile(fileId, content); return fileId; }
  const meta = await gapi.client.drive.files.create({
    resource: { name: DRIVE_CFG.FILE_NAME, mimeType: 'application/json' },
    fields: 'id',
  });
  fileId = meta.result.id;
  await _updateFile(fileId, content);
  return fileId;
}

// ── MODALS ────────────────────────────────────────────────────
function driveSyncModalHtml() {
  const user = _driveSignedIn
    ? gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile()?.getEmail?.() || 'conectado'
    : '';
  return `
    <div style="text-align:center;padding:.5rem 0 1rem">
      <div style="font-size:2.5rem">☁️</div>
      <div style="font-weight:700;margin:.5rem 0 .2rem">Google Drive</div>
      <div style="font-size:.78rem;color:var(--muted)">${user}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.65rem">
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="driveUpload()">
        ⬆️ Salvar backup no Drive
      </button>
      <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="driveDownload()">
        ⬇️ Restaurar do Drive
      </button>
      <button class="btn btn-ghost" style="width:100%;justify-content:center;color:var(--red)" onclick="driveSignOut()">
        Sair da conta Google
      </button>
    </div>
  `;
}

function driveSetupModalHtml() {
  return `
    <div style="font-size:.85rem;color:var(--body);line-height:1.6">
      <p>Para ativar o backup no Google Drive, você precisa configurar as credenciais da Google API:</p>
      <ol style="margin:.75rem 0 .75rem 1.2rem;display:flex;flex-direction:column;gap:.4rem">
        <li>Acesse <a href="https://console.cloud.google.com" target="_blank" style="color:var(--accent)">console.cloud.google.com</a></li>
        <li>Crie um projeto e ative a <strong>Google Drive API</strong></li>
        <li>Crie credenciais: <strong>OAuth 2.0 Client ID</strong> (tipo: Web) e uma <strong>API Key</strong></li>
        <li>Em "Authorized JavaScript origins" adicione sua URL do GitHub Pages</li>
        <li>Cole os valores em <code>js/drive.js</code> nas variáveis <code>CLIENT_ID</code> e <code>API_KEY</code></li>
      </ol>
      <p style="font-size:.78rem;color:var(--muted)">Por enquanto os dados ficam salvos localmente no navegador com o botão 💾 Salvar.</p>
    </div>
  `;
}
