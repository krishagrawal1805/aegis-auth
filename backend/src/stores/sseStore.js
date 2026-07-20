// In-Memory SSE Connection Manager
// We use sets to support multiple connections per session or user (e.g. multiple tabs or multiple components listening)
const sessionConnections = new Map(); // sessionId -> Set<res>
const userConnections = new Map();    // userId -> Set<res>

export const sseStore = {
  /**
   * Register a new SSE connection.
   */
  addConnection: (res, type, identifier) => {
    const targetMap = type === 'session' ? sessionConnections : userConnections;

    if (!targetMap.has(identifier)) {
      targetMap.set(identifier, new Set());
    }
    const connectionSet = targetMap.get(identifier);
    connectionSet.add(res);

    console.log(`[sseStore] Added connection. type: ${type}, identifier: ${identifier}. Count: ${connectionSet.size}`);

    // CRITICAL: Cleanup when the client closes the browser/tab
    res.on('close', () => {
      console.log(`[sseStore] Connection close triggered for type: ${type}, identifier: ${identifier}`);
      connectionSet.delete(res);
      if (connectionSet.size === 0) {
        targetMap.delete(identifier);
        console.log(`[sseStore] Cleaned up all connections for type: ${type}, identifier: ${identifier}`);
      }
    });
  },

  /**
   * Send a real-time event to a specific Unauthenticated Session (Cross-Device prompt/success).
   */
  sendToSession: (sessionId, eventType, payload) => {
    const connectionSet = sessionConnections.get(sessionId);
    const count = connectionSet ? connectionSet.size : 0;
    console.log(`[sseStore] Sending to session ${sessionId} (${eventType}). Connections found: ${count}`);
    if (connectionSet) {
      for (const res of connectionSet) {
        res.write(`data: ${JSON.stringify({ type: eventType, ...payload })}\n\n`);
      }
    }
  },

  /**
   * Send a real-time event to a specific Authenticated User (Approval prompt).
   */
  sendToUser: (userId, eventType, payload) => {
    const idStr = userId.toString();
    const connectionSet = userConnections.get(idStr);
    const count = connectionSet ? connectionSet.size : 0;
    console.log(`[sseStore] Sending to user ${idStr} (${eventType}). Connections found: ${count}`);
    if (connectionSet) {
      for (const res of connectionSet) {
        res.write(`data: ${JSON.stringify({ type: eventType, ...payload })}\n\n`);
      }
    }
  },

  isUserOnline: (userId) => {
    if (!userId) return false;
    const idStr = userId.toString();
    const connectionSet = userConnections.get(idStr);
    return connectionSet ? connectionSet.size > 0 : false;
  }
};
