import express from 'express';
import { handleSseConnection } from '../controllers/sseController.js';

const router = express.Router();

// Public route that handles internal identification context dynamically inside the controller
router.get('/', handleSseConnection);

export default router;
