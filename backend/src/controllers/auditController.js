import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res) => {
  try {
    // Fetch logs in descending order so the most recent events appear first in the dashboard.
    // The frontend will be able to verify the hash chain by matching currentBlockHash to the next item's previousBlockHash.
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(100) // Reasonable limit for a hackathon demo
      .populate('approvalRequestId', 'resourceName status requiredCount')
      .lean();

    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
