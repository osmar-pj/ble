import { runCommand } from '../utils/runCommand.js';

/**
 * Obtiene el estado de conexión WiFi (nmcli o iwgetid).
 * @returns {Promise<{ connected: boolean, ssid: string | null }>}
 */
export async function getWifiStatus() {
  let connected = false;
  let ssid = null;

  try {
    const out = await runCommand('nmcli', ['-t', '-f', 'active,ssid', 'dev', 'wifi']);
    const line = out.split('\n').find((l) => l.startsWith('yes:'));
    if (line) {
      connected = true;
      const name = line.slice(4).trim();
      ssid = name && name !== '--' ? name : null;
    }
  } catch (_) {
    try {
      const out = await runCommand('iwgetid', ['-r']);
      if (out?.trim()) {
        connected = true;
        ssid = out.trim();
      }
    } catch (_) {}
  }

  return { connected, ssid };
}
