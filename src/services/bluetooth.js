import { spawn } from 'child_process';
import { config, state } from '../config/index.js';
import { runCommand } from '../utils/runCommand.js';
import { publishBeacons } from './mqtt.js';
import { createQueuedSession, enqueue } from './queue.js';

/** Dispositivos vistos: address -> { address, name, rssi, firstSeen, lastSeen } */
const knownDevices = new Map();

/**
 * Parsea la salida de `bluetoothctl devices` en un array de { address, name }.
 * @param {string} output
 * @returns {{ address: string, name: string }[]}
 */
export function parseBluetoothDevices(output) {
  const lines = output.split('\n').filter(Boolean);
  return lines
    .map((line) => {
      const match = line.match(/Device\s+([0-9A-Fa-f:]{17})\s+(.*)/);
      if (!match) return null;
      return {
        address: match[1],
        name: match[2].trim() || '(sin nombre)',
      };
    })
    .filter(Boolean);
}

/**
 * Indica si una dirección MAC cumple el filtro configurado.
 * @param {string} address
 */
function matchesMacFilter(address) {
  const normalized = address.replace(/[:-]/g, '').toUpperCase();
  return normalized.includes(config.bluetooth.macFilter.toUpperCase());
}

/**
 * Filtra la lista de dispositivos por MAC (solo beacons que coinciden).
 * @param {{ address: string, name: string }[]} devices
 */
export function filterBeacons(devices) {
  return devices.filter((d) => matchesMacFilter(d.address));
}

/**
 * Obtiene el RSSI de un dispositivo con `bluetoothctl info <MAC>`.
 * @param {string} address - MAC del dispositivo
 * @returns {Promise<number | null>} RSSI en dBm o null si no se pudo leer
 */
async function getRssi(address) {
  try {
    const out = await runCommand('bluetoothctl', ['info', address]);
    const match = out.match(/RSSI:\s*(-?\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Inicia el escaneo Bluetooth en segundo plano (scan on permanente).
 */
export function startBluetoothScan() {
  runCommand('bluetoothctl', ['power', 'on']).catch((e) =>
    console.warn('Bluetooth power on:', e.message)
  );

  const scanProcess = spawn('bluetoothctl', ['scan', 'on'], { stdio: 'ignore' });
  scanProcess.on('error', (e) => console.warn('Bluetooth scan:', e.message));
  scanProcess.on('close', (code) =>
    console.warn('Bluetooth scan terminó, código:', code)
  );

  console.log('Escaneo Bluetooth en segundo plano activo');
}

/**
 * Lee la lista del adaptador, obtiene RSSI por dispositivo y actualiza estado.
 * Solo se mantienen en la lista dispositivos con RSSI leído en los últimos rssiStaleMs.
 */
export async function refreshDeviceList() {
  try {
    const out = await runCommand('bluetoothctl', ['devices']);
    const all = parseBluetoothDevices(out);
    const filtered = filterBeacons(all);

    const now = Date.now();
    const staleLimit = now - config.bluetooth.rssiStaleMs;

    // Registrar sesiones cerradas: dispositivos que estaban y ahora están stale
    for (const [address, d] of knownDevices) {
      if (d.lastSeen <= staleLimit) {
        const session = {
          address: d.address,
          name: d.name,
          firstSeen: d.firstSeen,
          lastSeen: d.lastSeen,
          durationMs: d.lastSeen - d.firstSeen,
        };
        state.sessions.push(session);
        if (state.sessions.length > state.maxSessions) state.sessions = state.sessions.slice(-state.maxSessions);
        enqueue([createQueuedSession(session)]).catch((e) => console.warn('Error encolando sesión:', e.message));
        knownDevices.delete(address);
      }
    }

    await Promise.all(
      filtered.map(async (d) => {
        const rssi = await getRssi(d.address);
        if (rssi !== null) {
          const existing = knownDevices.get(d.address);
          knownDevices.set(d.address, {
            address: d.address,
            name: d.name,
            rssi,
            firstSeen: existing?.firstSeen ?? now,
            lastSeen: now,
          });
        }
      })
    );

    // Quitar dispositivos que no recibieron RSSI en este ciclo (ya stale)
    const toRemoveAfterUpdate = [];
    for (const [address, d] of knownDevices) {
      if (d.lastSeen <= staleLimit) {
        const session = {
          address: d.address,
          name: d.name,
          firstSeen: d.firstSeen,
          lastSeen: d.lastSeen,
          durationMs: d.lastSeen - d.firstSeen,
        };
        state.sessions.push(session);
        if (state.sessions.length > state.maxSessions) {
          state.sessions = state.sessions.slice(-state.maxSessions);
        }
        enqueue([createQueuedSession(session)]).catch((e) => console.warn('Error encolando sesión:', e.message));
        toRemoveAfterUpdate.push(address);
      }
    }
    toRemoveAfterUpdate.forEach((addr) => knownDevices.delete(addr));

    state.devices = Array.from(knownDevices.values())
      .filter((d) => d.lastSeen > staleLimit)
      .map(({ address, name, rssi, firstSeen }) => ({
        address,
        name,
        rssi,
        firstSeenAt: firstSeen,
      }))
      .sort((a, b) => a.address.localeCompare(b.address));

    state.lastDevicesUpdate = now;
    publishBeacons(state.devices);
  } catch (err) {
    console.error('Error leyendo dispositivos Bluetooth:', err.message);
  }
}
