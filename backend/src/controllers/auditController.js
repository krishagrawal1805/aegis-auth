import { AuditLog } from '../models/models.js';

export const getAuditLogs = async (req, res) => {
  try {
    const orgId = req.orgId;
    const serverSecret = process.env.HMAC_SECRET || 'aegis-hackathon-super-secret-audit-key-2026';

    // Query logs belonging strictly to this tenant org, sorted by timestamp descending
    const logs = await AuditLog.find({ org_id: orgId })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('actor_id', 'display_name email')
      .lean();

    // Verify row-level integrity using HMAC check
    const verifiedLogs = logs.map(log => {
      // Re-instantiate model document to access schema methods
      const doc = new AuditLog(log);
      const expectedHmac = doc.generateHmac(serverSecret);
      return {
        ...log,
        verified: expectedHmac === log.hmac_signature
      };
    });

    res.status(200).json({ success: true, logs: verifiedLogs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
