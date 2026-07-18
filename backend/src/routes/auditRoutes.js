import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', requireAuth, getAuditLogs);

export default router;
