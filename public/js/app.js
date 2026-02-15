const status = document.getElementById('status');
const listEl = document.getElementById('list');

const setStatus = (msg, type = '') => {
  status.textContent = msg;
  status.className = 'status ' + type;
};

const escapeHtml = (s) => {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
};

const formatTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

const formatDuration = (ms) => {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

const headerUnitId = document.getElementById('headerUnitId');
const configWarn = document.getElementById('configWarn');

const updateHeader = (unitId, configIncomplete) => {
  headerUnitId.textContent = unitId || '—';
  headerUnitId.classList.toggle('empty', !unitId || unitId === '—');
      if (configIncomplete && configIncomplete.length > 0) {
        configWarn.style.display = 'flex';
    configWarn.textContent = 'Complete la configuración en el menú Configuración: ' + configIncomplete.join(', ');
  } else {
    configWarn.style.display = 'none';
  }
};

const renderDevices = (devices) => {
  const hasDevices = devices.length > 0;
  document.getElementById('liveWrap').style.display = hasDevices ? 'block' : 'none';
  document.getElementById('liveEmpty').style.display = hasDevices ? 'none' : 'block';
  if (!hasDevices) {
    listEl.innerHTML = '';
    setStatus('Sin dispositivos (MAC AF2024)');
    return;
  }
  listEl.innerHTML = devices
    .map((d) => {
      const rssiStr = d.rssi != null ? `${d.rssi} dBm` : '—';
      const inicio = formatTime(d.firstSeenAt);
      return `<tr><td><span class="name">${escapeHtml(d.name)}</span><br><span class="table-address">${escapeHtml(d.address)}</span></td><td>${escapeHtml(rssiStr)}</td><td>${escapeHtml(inicio)}</td></tr>`;
    })
    .join('');
  setStatus(`${devices.length} dispositivos (MAC AF2024) — actualización automática`);
};

const sessionsTable = document.getElementById('sessionsTable');
const sessionsEmpty = document.getElementById('sessionsEmpty');
const sessionsWrap = document.getElementById('sessionsWrap');

const renderSessions = (sessions) => {
  const hasData = sessions && sessions.length > 0;
  sessionsWrap.style.display = hasData ? 'block' : 'none';
  sessionsEmpty.style.display = hasData ? 'none' : 'block';
  if (!hasData) {
    sessionsTable.innerHTML = '';
    return;
  }
  sessionsTable.innerHTML = sessions
    .map(
      (s) => `
    <tr>
      <td><span class="name">${escapeHtml(s.name)}</span><br><span class="table-address">${escapeHtml(s.address)}</span></td>
      <td>${escapeHtml(formatTime(s.firstSeen))}</td>
      <td>${escapeHtml(formatTime(s.lastSeen))}</td>
      <td>${escapeHtml(formatDuration(s.durationMs))}</td>
    </tr>
  `
    )
    .join('');
};

const refreshDevices = async () => {
  try {
    const r = await fetch(`/api/devices?t=${Date.now()}`);
    const data = await r.json();
    if (data.ok) {
      updateHeader(data.unitId, data.configIncomplete);
      renderDevices(data.devices || []);
    }
  } catch (e) {
    setStatus('Error al cargar: ' + e.message, 'error');
  }
};

const refreshSessions = async () => {
  try {
    const r = await fetch(`/api/sessions?t=${Date.now()}`);
    const data = await r.json();
    if (data.ok) renderSessions(data.sessions || []);
  } catch (_) {}
};

const wifiCorner = document.getElementById('wifiCorner');
const wifiLabel = document.getElementById('wifiLabel');

const refreshWifi = async () => {
  try {
    const r = await fetch('/api/wifi');
    const { connected, ssid } = await r.json();
    wifiCorner.classList.toggle('off', !connected);
    wifiLabel.textContent = connected && ssid ? ssid : 'Desconectado';
  } catch (_) {
    wifiCorner.classList.add('off');
    wifiLabel.textContent = '—';
  }
};

const syncCorner = document.getElementById('syncCorner');
const syncLabel = document.getElementById('syncLabel');

const refreshSyncStatus = async () => {
  try {
    const r = await fetch('/api/sync/status?t=' + Date.now());
    const data = await r.json();
    if (!data.ok) {
      syncCorner.style.display = 'none';
      return;
    }
    const pending = data.pending ?? 0;
    const syncEnabled = data.syncEnabled;
    if (!syncEnabled && pending === 0) {
      syncCorner.style.display = 'none';
      return;
    }
    syncCorner.style.display = 'flex';
    if (pending > 0) {
      syncCorner.classList.add('pending');
      syncLabel.textContent = `${pending} pendientes de enviar`;
      syncCorner.title = syncEnabled
        ? `${pending} sesiones esperando conexión con el servidor. Se enviarán cuando haya señal.`
        : `Configure la URL del servidor en Configuración para enviar ${pending} sesiones.`;
    } else {
      syncCorner.classList.remove('pending');
      syncLabel.textContent = 'Todo enviado';
      syncCorner.title = 'No hay sesiones pendientes. Todo se ha enviado al servidor.';
    }
  } catch (_) {
    syncCorner.style.display = 'none';
  }
};

const tabLive = document.getElementById('tabLive');
const tabHistory = document.getElementById('tabHistory');
const tabSettings = document.getElementById('tabSettings');
const viewLive = document.getElementById('viewLive');
const viewHistory = document.getElementById('viewHistory');
const viewSettings = document.getElementById('viewSettings');

const loadSettings = async () => {
  try {
    const r = await fetch('/api/settings');
    const data = await r.json();
    if (data.ok && data.settings) {
      const form = document.getElementById('settingsForm');
      for (const [key, value] of Object.entries(data.settings)) {
        const input = form.elements[key];
        if (input) input.value = value || '';
      }
    }
  } catch (_) {}
};

const settingsForm = document.getElementById('settingsForm');
const settingsStatus = document.getElementById('settingsStatus');

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  settingsStatus.textContent = 'Guardando…';
  settingsStatus.className = 'settings-status';
  try {
    const formData = new FormData(settingsForm);
    const body = {};
    for (const [k, v] of formData) body[k] = v;
    const r = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (data.ok) {
      settingsStatus.textContent = 'Configuración guardada';
      settingsStatus.className = 'settings-status ok';
      refreshDevices();
      refreshSyncStatus();
    } else {
      settingsStatus.textContent = data.error || 'Error al guardar';
      settingsStatus.className = 'settings-status error';
    }
  } catch (err) {
    settingsStatus.textContent = 'Error: ' + err.message;
    settingsStatus.className = 'settings-status error';
  }
});

tabLive.addEventListener('click', () => {
  tabLive.classList.add('active');
  tabLive.setAttribute('aria-selected', 'true');
  tabHistory.classList.remove('active');
  tabHistory.setAttribute('aria-selected', 'false');
  tabSettings.classList.remove('active');
  tabSettings.setAttribute('aria-selected', 'false');
  viewLive.classList.add('active');
  viewHistory.classList.remove('active');
  viewSettings.classList.remove('active');
});

tabHistory.addEventListener('click', () => {
  tabHistory.classList.add('active');
  tabHistory.setAttribute('aria-selected', 'true');
  tabLive.classList.remove('active');
  tabLive.setAttribute('aria-selected', 'false');
  tabSettings.classList.remove('active');
  tabSettings.setAttribute('aria-selected', 'false');
  viewHistory.classList.add('active');
  viewLive.classList.remove('active');
  viewSettings.classList.remove('active');
  refreshSessions();
});

tabSettings.addEventListener('click', () => {
  tabSettings.classList.add('active');
  tabSettings.setAttribute('aria-selected', 'true');
  tabLive.classList.remove('active');
  tabLive.setAttribute('aria-selected', 'false');
  tabHistory.classList.remove('active');
  tabHistory.setAttribute('aria-selected', 'false');
  viewSettings.classList.add('active');
  viewLive.classList.remove('active');
  viewHistory.classList.remove('active');
  loadSettings();
});

refreshDevices();
refreshSessions();
refreshWifi();
refreshSyncStatus();
setInterval(refreshDevices, 4000);
setInterval(refreshSessions, 4000);
setInterval(refreshWifi, 10000);
setInterval(refreshSyncStatus, 8000);

document.addEventListener('keydown', (e) => {
  if (e.key === 'F1' || e.key === 'F2') {
    e.preventDefault();
    e.stopPropagation();
  }
});
