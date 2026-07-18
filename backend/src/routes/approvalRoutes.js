import express from 'express';
import { createApprovalRequest, getPendingApprovals, signApprovalRequest } from '../controllers/approvalController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/request', requireAuth, createApprovalRequest);
router.get('/pending', requireAuth, getPendingApprovals);
router.post('/sign', requireAuth, signApprovalRequest);

export default router;
