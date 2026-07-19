import express from 'express';
import {
  registerChallenge,
  registerVerify,
  loginChallenge,
  loginVerify,
  exchangeSession,
  logout,
  getMe,
  orgCreate,
  orgJoin,
  approveUser,
  getPendingUsers
} from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register/challenge', registerChallenge);
router.post('/register/verify', registerVerify);

router.post('/org/create', orgCreate);
router.post('/org/join', orgJoin);
router.get('/users/pending', requireAuth, getPendingUsers);
router.post('/users/approve', requireAuth, approveUser);

router.post('/login/challenge', loginChallenge);
router.post('/login/verify', loginVerify);

router.post('/session/exchange', exchangeSession);

router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
