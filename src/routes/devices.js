import { Router } from 'express';
import { state } from '../config/index.js';
import { getSetting } from '../db/index.js';

const router = Router();

function getConfigIncomplete() {
  const s = (k) => (getSetting(k) || '').trim();
  const missing = [];
  const unitId = s('UNIT_ID') || s('MQTT_CLIENT_ID');
  if (!unitId) missing.push('Unit ID');
  const mqttUrl = s('MQTT_URL');
  if (mqttUrl) {
    if (!s('MQTT_TOPIC')) missing.push('MQTT Topic');
    if (!s('MQTT_CLIENT_ID')) missing.push('MQTT Client ID');
  }
  const syncUrl = s('SYNC_SERVER_URL');
  if (syncUrl && !unitId) missing.push('Unit ID');
  return [...new Set(missing)];
}

/** GET /api/devices — Lista de beacons (misma fuente que MQTT). Sin caché para evitar desfase. */
router.get('/devices', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const unitId = getSetting('UNIT_ID') || getSetting('MQTT_CLIENT_ID') || '—';
  const configIncomplete = getConfigIncomplete();
  res.json({
    ok: true,
    devices: state.devices,
    ts: state.lastDevicesUpdate,
    unitId: unitId || '—',
    configIncomplete,
  });
});

router.get('/sessions', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ ok: true, sessions: [...state.sessions].reverse(), ts: Date.now() });
});
export default router;
