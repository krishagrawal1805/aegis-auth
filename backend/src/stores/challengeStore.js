// In-Memory Challenge Store for WebAuthn nonces & Number Matching
const challenges = new Map();

// 5 minutes in milliseconds
const CHALLENGE_TTL = 5 * 60 * 1000;

export const challengeStore = {
  /**
   * Save a generated challenge linked to an email.
   * Includes the 2-digit verification code for preventing MFA fatigue.
   */
  set: (email, challengeData) => {
    // If a challenge already exists for this email, clear its cleanup timer
    if (challenges.has(email)) {
      clearTimeout(challenges.get(email).timeoutId);
    }

    // Auto-delete the challenge after 5 minutes to prevent replay attacks and memory leaks
    const timeoutId = setTimeout(() => {
      challenges.delete(email);
    }, CHALLENGE_TTL);

    challenges.set(email, {
      ...challengeData,
      timeoutId,
    });
  },

  /**
   * Retrieve a challenge by email.
   */
  get: (email) => {
    const data = challenges.get(email);
    if (!data) return null;

    // Return a copy without the timeoutId
    const { timeoutId, ...challengeData } = data;
    return challengeData;
  },

  /**
   * Delete a challenge (must be done immediately after verification)
   */
  remove: (email) => {
    if (challenges.has(email)) {
      clearTimeout(challenges.get(email).timeoutId);
      challenges.delete(email);
    }
  }
};
