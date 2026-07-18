import { AuditLog } from '../models/models.js';

// In-Memory Queue to process audit logs sequentially and prevent concurrent insertion conflicts
const queue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  while (queue.length > 0) {
    const event = queue.shift();
    try {
      const timestamp = new Date();
      const logEntry = new AuditLog({
        org_id: event.org_id,
        actor_id: event.actor_id,
        action: event.action,
        timestamp,
        payload: event.payload || {},
        hmac_signature: 'PENDING' // Placeholder to satisfy requirement before generation
      });

      // Generate the deterministic row-level HMAC signature
      const serverSecret = process.env.HMAC_SECRET || 'aegis-hackathon-super-secret-audit-key-2026';
      logEntry.hmac_signature = logEntry.generateHmac(serverSecret);

      await logEntry.save();
    } catch (error) {
      console.error('[AuditQueue] Error processing audit event:', error);
    }
  }

  isProcessing = false;
};

export const auditQueue = {
  add: (event) => {
    queue.push(event);
    processQueue(); // Fire and forget
  }
};
