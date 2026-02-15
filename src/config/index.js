/**
 * Configuración central. Puerto desde .env; el resto desde base de datos.
 */

import { getAllSettings, getSetting, initDb } from '../db/index.js';

let _port = Number(process.env.PORT) || 3000;

export const config = {
  get port() {
    return _port;
  },
  bluetooth: {
    get macFilter() {
      const v = getSetting('MAC_FILTER');
      return v || 'AF2024';
    },
    refreshIntervalMs: 2_000,
    get rssiStaleMs() {
      const v = getSetting('RSSI_STALE_MS');
      return v ? Number(v) || 10_000 : 10_000;
    },
  },
  mqtt: {
    get url() {
      return getSetting('MQTT_URL');
    },
    get topic() {
      return getSetting('MQTT_TOPIC') || 'beacon/devices';
    },
    get clientId() {
      return getSetting('MQTT_CLIENT_ID');
    },
    get username() {
      return getSetting('MQTT_USERNAME');
    },
    get password() {
      return getSetting('MQTT_PASSWORD');
    },
  },
  sync: {
    get url() {
      return getSetting('SYNC_SERVER_URL');
    },
    get unitId() {
      const v = getSetting('UNIT_ID');
      return v || config.mqtt.clientId || 'unknown';
    },
  },
  get unitId() {
    const v = getSetting('UNIT_ID');
    return v || config.mqtt.clientId || 'unknown';
  },
};

export const state = {
  devices: [],
  lastDevicesUpdate: 0,
  sessions: [],
  maxSessions: 200,
  mqttClient: null,
  receivedSessions: [],
};

/**
 * Inicializa la DB y debe llamarse al arrancar.
 */
export function initConfig() {
  initDb();
}
