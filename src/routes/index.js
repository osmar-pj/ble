import { Router } from 'express';
import devicesRoutes from './devices.js';
import wifiRoutes from './wifi.js';

const router = Router();

router.use(devicesRoutes);
router.use(wifiRoutes);

export default router;
