import { verifyToken } from '../utils/jwt.js';

export const requireAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Contains { userId, role, orgId }

    // Enforce tenant boundary: assert that JWT orgId matches resolved orgId
    if (req.orgId && req.user.orgId && req.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied: Workspace mismatch' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
