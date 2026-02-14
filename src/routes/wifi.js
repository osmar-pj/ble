import { Router } from 'express';
import { getWifiStatus } from '../services/wifi.js';

const router = Router();

/** GET /api/wifi — Estado de conexión WiFi (conectado y SSID). */
router.get('/wifi', async (_req, res) => {
  try {
    const status = await getWifiStatus();
    res.json(status);
  } catch (_) {
    res.json({ connected: false, ssid: null });
  }
});

export default router;
