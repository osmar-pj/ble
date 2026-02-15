import { Router } from 'express';
import devicesRoutes from './devices.js';
import wifiRoutes from './wifi.js';
import syncRoutes from './sync.js';
import settingsRoutes from './settings.js';

const router = Router();

router.use(devicesRoutes);
router.use(wifiRoutes);
router.use(syncRoutes);
router.use(settingsRoutes);

export default router;
