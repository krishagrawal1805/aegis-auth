import crypto from 'crypto';
import AuditLog from '../models/AuditLog.js';

// In-Memory Sequential Queue to prevent MongoDB Unique Index Deadlocks
const queue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  while (queue.length > 0) {
    const event = queue.shift();
    try {
      // 1. Fetch the most recent log to continue the cryptographic chain
      const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
      const previousBlockHash = lastLog
        ? lastLog.currentBlockHash
        : '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis hash

      // 2. Hash the new event payload with the previous block hash
      const dataString = JSON.stringify({
        eventType: event.eventType,
        description: event.description,
        approvalRequestId: event.approvalRequestId || null,
        previousBlockHash
      });
      
      const currentBlockHash = crypto.createHash('sha256').update(dataString).digest('hex');

      // 3. Write to DB
      await AuditLog.create({
        ...event,
        previousBlockHash,
        currentBlockHash
      });
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
