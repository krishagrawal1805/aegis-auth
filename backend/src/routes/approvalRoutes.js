import express from 'express';
import { 
  createApprovalRequest, 
  getPendingApprovals, 
  signApprovalRequest,
  signChallenge 
} from '../controllers/approvalController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/request', requireAuth, createApprovalRequest);
router.post('/create', requireAuth, createApprovalRequest); // Alias /requests/create

router.get('/pending', requireAuth, getPendingApprovals);

router.post('/sign-challenge', requireAuth, signChallenge);

router.post('/sign', requireAuth, signApprovalRequest);
router.post('/verify', requireAuth, signApprovalRequest); // Alias /requests/verify

export default router;
