import crypto from 'crypto';
import mqtt from 'mqtt';
import { config, state } from '../config/index.js';

/**
 * Conecta al broker MQTT si hay URL configurada.
 */
export function connectMqtt() {
  if (!config.mqtt.url) return;

  const options = { reconnectPeriod: 5000 };
  if (config.mqtt.clientId) {
    const hash = crypto.randomBytes(4).toString('hex');
    options.clientId = `${config.mqtt.clientId}_${hash}`;
  }
  if (config.mqtt.username) options.username = config.mqtt.username;
  if (config.mqtt.password) options.password = config.mqtt.password;

  state.mqttClient = mqtt.connect(config.mqtt.url, options);
  state.mqttClient.on('connect', () => console.log('MQTT conectado'));
  state.mqttClient.on('error', (err) => console.warn('MQTT error:', err.message));
}

/**
 * Publica la lista de beacons en el topic configurado (si MQTT está conectado).
 * @param {{ address: string, name: string }[]} devices
 */
export function publishBeacons(devices) {
  if (!state.mqttClient?.connected) return;

  try {
    const payload = JSON.stringify({
      count: devices.length,
      devices: devices.map((d) => ({ address: d.address, name: d.name, rssi: d.rssi ?? null })),
      ts: new Date().toISOString(),
    });
    state.mqttClient.publish(config.mqtt.topic, payload, { qos: 0 });
  } catch (err) {
    console.error('Error publicando MQTT:', err.message);
  }
}
