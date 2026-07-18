import crypto from 'crypto';

// In-Memory Exchange Store for Cross-Device Session Delivery
const exchangeTokens = new Map();

// 60 seconds in milliseconds - extremely short-lived token
const EXCHANGE_TTL = 60 * 1000;

export const exchangeStore = {
  /**
   * Generates a secure, single-use token bound to a specific sessionId.
   */
  createToken: (sessionId, userId) => {
    // Generate a 32-byte cryptographically secure random hex string
    const token = crypto.randomBytes(32).toString('hex');

    const timeoutId = setTimeout(() => {
      exchangeTokens.delete(token);
    }, EXCHANGE_TTL);

    exchangeTokens.set(token, {
      sessionId,
      userId,
      timeoutId,
    });

    return token;
  },

  /**
   * Retrieves and IMMEDIATELY invalidates the token to enforce single-use.
   */
  consumeToken: (token, providedSessionId) => {
    const record = exchangeTokens.get(token);

    if (!record) {
      return { valid: false, error: 'Token invalid or expired' };
    }

    // Enforce strict Session ID binding (prevents Cross-Device Session Fixation)
    if (record.sessionId !== providedSessionId) {
      return { valid: false, error: 'Session ID mismatch' };
    }

    // Single-use enforcement: Delete immediately upon consumption
    clearTimeout(record.timeoutId);
    exchangeTokens.delete(token);

    return { valid: true, userId: record.userId };
  }
};
