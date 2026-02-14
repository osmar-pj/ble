/**
 * Configuración central desde variables de entorno.
 * Estado en memoria compartido por servicios.
 */

export const config = {
  port: Number(process.env.PORT) || 3000,

  bluetooth: {
    macFilter: process.env.MAC_FILTER ?? 'AF2024',
    refreshIntervalMs: 2_000,
    /** Si no recibimos RSSI en este tiempo (ms), el beacon se quita de la lista */
    rssiStaleMs: Number(process.env.RSSI_STALE_MS) || 10_000,
  },

  mqtt: {
    url: process.env.MQTT_URL ?? '',
    topic: process.env.MQTT_TOPIC ?? 'beacon/devices',
    clientId: process.env.MQTT_CLIENT_ID ?? '',
    username: process.env.MQTT_USERNAME ?? '',
    password: process.env.MQTT_PASSWORD ?? '',
  },
};

export const state = {
  devices: [],
  /** Timestamp de la última actualización de devices (misma fuente que MQTT) */
  lastDevicesUpdate: 0,
  /** Historial de sesiones cerradas (últimas 200): { address, name, firstSeen, lastSeen, durationMs } */
  sessions: [],
  maxSessions: 200,
  mqttClient: null,
};
