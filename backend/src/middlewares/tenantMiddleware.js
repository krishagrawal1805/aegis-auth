import { Organization } from '../models/models.js';

export const resolveTenant = async (req, res, next) => {
  // Check headers, query params, or body
  const workspaceCode = req.headers['x-workspace-code'] || req.query.workspaceCode || req.body.workspaceCode;

  const isBypass = req.path.includes('/auth/org/create') || 
                   req.path.includes('/auth/org/join') || 
                   req.path.includes('/auth/register/challenge') ||
                   req.path.includes('/audit-logs') ||
                   req.path === '/api/health' || 
                   req.path === '/health';

  if (isBypass) {
    return next();
  }

  if (!workspaceCode) {
    return res.status(400).json({ success: false, error: 'X-Workspace-Code header or parameter is required' });
  }

  const code = workspaceCode.toUpperCase();
  if (code.length !== 6) {
    return res.status(400).json({ success: false, error: 'Workspace code must be exactly 6 characters' });
  }

  try {
    let org = await Organization.findOne({ workspace_code: code });

    // For testing and seamless registration, automatically create organization if it doesn't exist yet
    const isRegisterRoute = req.path.includes('/register/challenge') || req.path.includes('/register/verify');
    if (!org && isRegisterRoute) {
      const orgName = req.body.orgName || `${code} Organization`;
      org = await Organization.create({
        name: orgName,
        workspace_code: code
      });
    }

    if (!org) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    req.org = org;
    req.orgId = org._id;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
