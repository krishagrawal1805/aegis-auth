import { sseStore } from '../stores/sseStore.js';
import { verifyToken } from '../utils/jwt.js';

export const handleSseConnection = (req, res) => {
  const { sessionId } = req.query;
  const authCookie = req.cookies.token;

  console.log(`[SSE] New request. query sessionId: ${sessionId}, cookie present: ${!!authCookie}`);

  let type = '';
  let identifier = '';

  // 1. Identify Connection Mode Context
  if (authCookie) {
    try {
      const decoded = verifyToken(authCookie);
      type = 'user';
      identifier = decoded.userId;
      console.log(`[SSE] Decoded user token successfully. userId: ${identifier}`);
    } catch (err) {
      console.error(`[SSE] Cookie token verification failed: ${err.message}`);
    }
  }

  if (!type && sessionId) {
    // Simple sanitization regex check for secure UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      console.warn(`[SSE] Invalid sessionId: ${sessionId}`);
      return res.status(400).json({ success: false, error: 'Malformed Session ID value' });
    }
    type = 'session';
    identifier = sessionId;
  }

  if (!type || !identifier) {
    console.warn(`[SSE] Connection rejected: unauthorized (type: ${type}, id: ${identifier})`);
    return res.status(401).json({ success: false, error: 'Unauthorized SSE connection initialization request' });
  }

  console.log(`[SSE] Connection authorized. Mode: ${type}, Identifier: ${identifier}`);

  // 2. Setup standard HTTP streaming options
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Write immediate system handshake confirmation string
  res.write('retry: 10000\n');
  res.write(`: open connection handshake [mode: ${type}]\n\n`);

  // 3. Register stream resource context inside store map trackers
  sseStore.addConnection(res, type, identifier);

  // 4. Heartbeat mechanism loop to clear firewall drops every 20 seconds
  const heartbeatInterval = setInterval(() => {
    res.write(': keepalive heartbeat check\n\n');
  }, 20000);

  // Clear timers on process cleanup events
  res.on('close', () => {
    clearInterval(heartbeatInterval);
  });
};
