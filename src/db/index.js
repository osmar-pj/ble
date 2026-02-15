import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../data/settings.db');

let db = null;

/** Claves de settings. Por defecto MQTT_URL y SYNC_SERVER_URL; el resto vacío. */
export const SETTINGS_KEYS = [
  'MQTT_URL',
  'MQTT_TOPIC',
  'MQTT_CLIENT_ID',
  'MQTT_USERNAME',
  'MQTT_PASSWORD',
  'SYNC_SERVER_URL',
  'UNIT_ID',
  'MAC_FILTER',
  'RSSI_STALE_MS',
];

export function initDb() {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // dir might exist
  }

  db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  const row = db.prepare('SELECT COUNT(*) as n FROM settings').get();
  if (row.n === 0) {
    seedDefaults();
  }

  return db;
}

function seedDefaults() {
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const defaults = {
    MQTT_URL: process.env.MQTT_URL ?? '',
    SYNC_SERVER_URL: process.env.SYNC_SERVER_URL ?? '',
    MQTT_TOPIC: '',
    MQTT_CLIENT_ID: '',
    MQTT_USERNAME: '',
    MQTT_PASSWORD: '',
    UNIT_ID: '',
    MAC_FILTER: '',
    RSSI_STALE_MS: '',
  };
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run(key, String(value ?? ''));
  }
}

export function getAllSettings() {
  if (!db) initDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = '';
  for (const { key, value } of rows) {
    if (SETTINGS_KEYS.includes(key)) out[key] = value ?? '';
  }
  return out;
}

export function getSetting(key) {
  if (!db) initDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? (row.value ?? '') : '';
}

export function setSettings(updates) {
  if (!db) initDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const t = db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (SETTINGS_KEYS.includes(key)) {
        stmt.run(key, String(value ?? ''));
      }
    }
  });
  t();
}
