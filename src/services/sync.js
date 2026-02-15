import { config } from '../config/index.js';
import { peekBatch, removeFromQueue } from './queue.js';

const DEFAULT_TIMEOUT_MS = 5_000;
const CONNECTIVITY_CHECK_MS = 30_000;
const SYNC_INTERVAL_MS = 15_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;

let connectivityCheckTimer = null;
let syncTimer = null;
let backoffMs = INITIAL_BACKOFF_MS;
let lastConnected = false;

/**
 * Verifica si el servidor local está alcanzable.
 * @returns {Promise<boolean>}
 */
export async function checkConnectivity() {
  const baseUrl = config.sync?.url?.replace(/\/$/, '');
  if (!baseUrl) return false;

  const healthUrl = `${baseUrl}/api/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

/**
 * Envía un lote de sesiones al servidor.
 * @param {{ id: string, address: string, name: string, firstSeen: number, lastSeen: number, durationMs: number }[]} batch
 * @returns {Promise<boolean>} true si el servidor aceptó el lote
 */
async function sendBatch(batch) {
  const baseUrl = config.sync?.url?.replace(/\/$/, '');
  if (!baseUrl || batch.length === 0) return false;

  const syncUrl = `${baseUrl}/api/sessions/batch`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(syncUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        unitId: config.sync?.unitId ?? config.unitId ?? 'unknown',
        sessions: batch.map(({ id, address, name, firstSeen, lastSeen, durationMs }) => ({
          id,
          address,
          name,
          firstSeen,
          lastSeen,
          durationMs,
        })),
      }),
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    clearTimeout(timeout);
    return false;
  }
}

/**
 * Intenta sincronizar un lote de la cola con el servidor.
 * Si tiene éxito, elimina esas sesiones de la cola y reinicia backoff.
 */
async function runSync() {
  if (!config.sync?.url) return;

  const connected = await checkConnectivity();
  if (!connected) {
    lastConnected = false;
    return;
  }

  if (!lastConnected) {
    lastConnected = true;
    backoffMs = INITIAL_BACKOFF_MS;
    console.log('Servidor de sync alcanzable, iniciando envío de cola');
  }

  const batch = await peekBatch();
  if (batch.length === 0) return;

  const ok = await sendBatch(batch);
  if (ok) {
    await removeFromQueue(batch.map((s) => s.id));
    backoffMs = INITIAL_BACKOFF_MS;
    console.log(`Sync: enviadas ${batch.length} sesiones`);
  } else {
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    console.warn(`Sync falló, próximo intento en ${backoffMs / 1000}s`);
  }
}

/**
 * Loop de verificación de conectividad y sync.
 */
async function tick() {
  if (!config.sync?.url) return;

  await runSync();
  scheduleNext();
}

function scheduleNext() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(tick, backoffMs);
}

/**
 * Inicia el servicio de sync (solo si SYNC_SERVER_URL está configurado).
 */
export function startSyncService() {
  if (!config.sync?.url) {
    console.log('Sync deshabilitado: SYNC_SERVER_URL no configurado');
    return;
  }

  console.log(`Sync activo hacia ${config.sync.url}`);
  tick();

  // Verificación de conectividad periódica (para detectar reconexión)
  connectivityCheckTimer = setInterval(async () => {
    if (lastConnected) return;
    const ok = await checkConnectivity();
    if (ok && !lastConnected) {
      lastConnected = true;
      backoffMs = INITIAL_BACKOFF_MS;
      runSync().then(scheduleNext);
    }
  }, CONNECTIVITY_CHECK_MS);
}

/**
 * Detiene el servicio de sync (para tests o graceful shutdown).
 */
export function stopSyncService() {
  if (connectivityCheckTimer) clearInterval(connectivityCheckTimer);
  if (syncTimer) clearTimeout(syncTimer);
  connectivityCheckTimer = null;
  syncTimer = null;
}
