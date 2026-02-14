import { Router } from 'express';
import { state } from '../config/index.js';

const router = Router();

/** GET /api/devices — Lista de beacons (misma fuente que MQTT). Sin caché para evitar desfase. */
router.get('/devices', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    ok: true,
    devices: state.devices,
    ts: state.lastDevicesUpdate,
  });
});

router.get('/sessions', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ ok: true, sessions: [...state.sessions].reverse(), ts: Date.now() });
});
export default router;
