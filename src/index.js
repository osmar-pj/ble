import 'dotenv/config';
import { config } from './config/index.js';
import app from './app.js';
import { connectMqtt } from './services/mqtt.js';
import { startBluetoothScan, refreshDeviceList } from './services/bluetooth.js';

connectMqtt();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Servidor en http://0.0.0.0:${config.port}`);
  startBluetoothScan();
  refreshDeviceList();
  setInterval(refreshDeviceList, config.bluetooth.refreshIntervalMs);
});
