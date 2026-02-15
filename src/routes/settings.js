import { Router } from 'express';
import { getAllSettings, setSettings, SETTINGS_KEYS } from '../db/index.js';
import { connectMqtt } from '../services/mqtt.js';
import { stopSyncService, startSyncService } from '../services/sync.js';
import { state } from '../config/index.js';

const router = Router();

/** GET /api/settings — Devuelve todas las configuraciones para el formulario */
router.get('/settings', (_req, res) => {
  try {
    const settings = getAllSettings();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** PUT /api/settings — Guarda configuraciones y reconecta servicios */
router.put('/settings', (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ok: false, error: 'Body debe ser un objeto' });
    }

    const updates = {};
    for (const key of SETTINGS_KEYS) {
      if (key in body) {
        updates[key] = body[key] ?? '';
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ ok: true, message: 'Sin cambios' });
    }

    setSettings(updates);

    // Reconectar MQTT
    if (state.mqttClient) {
      state.mqttClient.end();
      state.mqttClient = null;
    }
    connectMqtt();

    // Reiniciar sync
    stopSyncService();
    startSyncService();

    res.json({ ok: true, message: 'Configuración guardada' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;