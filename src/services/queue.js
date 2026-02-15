import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUEUE_FILE = process.env.SYNC_QUEUE_FILE ?? path.join(__dirname, '../../data/sync-queue.json');
const BATCH_SIZE = Number(process.env.SYNC_BATCH_SIZE) || 100;

/**
 * Crea una sesión con ID único para deduplicación.
 * @param {{ address: string, name: string, firstSeen: number, lastSeen: number, durationMs: number }} session
 * @returns {{ id: string, address: string, name: string, firstSeen: number, lastSeen: number, durationMs: number }}
 */
export function createQueuedSession(session) {
  return {
    id: crypto.randomUUID(),
    address: session.address,
    name: session.name,
    firstSeen: session.firstSeen,
    lastSeen: session.lastSeen,
    durationMs: session.durationMs,
  };
}

/**
 * Lee la cola pendiente desde disco.
 * @returns {Promise<{ id: string, address: string, name: string, firstSeen: number, lastSeen: number, durationMs: number }[]>}
 */
export async function loadQueue() {
  try {
    const data = await fs.readFile(QUEUE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('Error cargando cola:', err.message);
    return [];
  }
}

/**
 * Guarda la cola en disco.
 * @param {Array} items
 */
export async function saveQueue(items) {
  try {
    const dir = path.dirname(QUEUE_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(QUEUE_FILE, JSON.stringify(items, null, 0), 'utf-8');
  } catch (err) {
    console.error('Error guardando cola:', err.message);
  }
}

/**
 * Añade sesiones a la cola y persiste.
 * @param {{ id: string, address: string, name: string, firstSeen: number, lastSeen: number, durationMs: number }[]} sessions
 */
export async function enqueue(sessions) {
  const queue = await loadQueue();
  queue.push(...sessions);
  await saveQueue(queue);
}

/**
 * Obtiene el siguiente lote sin modificar la cola.
 * @returns {Promise<{ id: string, address: string, name: string, firstSeen: number, lastSeen: number, durationMs: number }[]>}
 */
export async function peekBatch() {
  const queue = await loadQueue();
  return queue.slice(0, BATCH_SIZE);
}

/**
 * Elimina de la cola las sesiones cuyo ID está en ids.
 * @param {string[]} ids
 */
export async function removeFromQueue(ids) {
  const set = new Set(ids);
  const queue = await loadQueue();
  const filtered = queue.filter((item) => !set.has(item.id));
  await saveQueue(filtered);
}

/**
 * Cuenta de items pendientes en la cola.
 */
export async function queueLength() {
  const queue = await loadQueue();
  return queue.length;
}
