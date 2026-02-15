import { Router } from 'express';
import { state } from '../config/index.js';

const router = Router();

/** GET /api/health — Usado por tabletas para verificar conectividad al servidor central */
router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/** POST /api/sessions/batch — Recibe sesiones enviadas por tabletas (sync offline-first) */
router.post('/sessions/batch', (req, res) => {
  try {
    const { unitId, sessions } = req.body;
    if (!Array.isArray(sessions)) {
      return res.status(400).json({ ok: false, error: 'sessions debe ser un array' });
    }

    const origin = typeof unitId === 'string' && unitId ? unitId : 'unknown';

    const received = sessions.map((s) => ({
      unitId: origin,
      id: s.id,
      address: s.address,
      name: s.name,
      firstSeen: s.firstSeen,
      lastSeen: s.lastSeen,
      durationMs: s.durationMs,
      receivedAt: Date.now(),
    }));

    state.receivedSessions.push(...received);
    const maxReceived = 10_000;
    if (state.receivedSessions.length > maxReceived) {
      state.receivedSessions = state.receivedSessions.slice(-maxReceived);
    }

    res.json({ ok: true, count: received.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** GET /api/sync/status — Estado de la cola local (solo en tablet) o sesiones recibidas (solo en central) */
router.get('/sync/status', async (_req, res) => {
  try {
    const { config } = await import('../config/index.js');
    const { queueLength } = await import('../services/queue.js');
    const pending = await queueLength();
    const syncEnabled = !!(config.sync?.url || '').trim();
    res.json({
      ok: true,
      pending,
      syncEnabled,
      receivedCount: state.receivedSessions?.length ?? 0,
    });
  } catch {
    res.json({ ok: true, pending: 0, syncEnabled: false, receivedCount: state.receivedSessions?.length ?? 0 });
  }
});

export default router;