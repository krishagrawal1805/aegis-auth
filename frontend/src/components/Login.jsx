import React, { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = ({ onNavigate, onBackToHome }) => {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [challengeOptions, setChallengeOptions] = useState(null);
  const [activeEventSource, setActiveEventSource] = useState(null);

  // Generate a unique session ID for cross-device binding when component mounts
  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Initializing passwordless challenge...');

    const code = workspaceCode.trim().toUpperCase();
    if (code.length !== 6) {
      setStatus('Error: Workspace code must be exactly 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Store workspaceCode so apiFetch attaches it
      localStorage.setItem('workspaceCode', code);

      // 1. Fetch passkey credentials options and temporary session token from backend
      const optionsRes = await api.post('/auth/login/challenge', { email, sessionId, workspaceCode: code });
      
      const challengeData = optionsRes.data;
      if (!optionsRes.ok) {
        throw new Error(challengeData.error || 'User or workspace not found');
      }

      setVerificationCode(challengeData.verificationCode);
      setChallengeOptions(challengeData);

      // 2. Open cross-device active SSE event stream
      // Pass workspaceCode in query since EventSource cannot send custom headers
      const eventSource = new EventSource(
        `${import.meta.env.VITE_API_URL}/events?sessionId=${sessionId}&workspaceCode=${code}`, 
        { withCredentials: true }
      );
      setActiveEventSource(eventSource);

      setStatus('Cross-device SSE stream connected. Awaiting device biometric authorization...');

      eventSource.onmessage = async (event) => {
        const payload = JSON.parse(event.data);
        
        if (payload.type === 'LOGIN_SUCCESS') {
          eventSource.close();
          setStatus('Authentication verified. Exchanging session token...');
          
          // 3. Trade the exchange token for an HttpOnly cookie
          const verifyRes = await api.post('/auth/session/exchange', {
            sessionId,
            exchangeToken: payload.exchangeToken,
            workspaceCode: code
          });

          if (verifyRes.data.success) {
            const userRes = await api.get('/auth/me');
            setUser(userRes.data.user);
          } else {
            setStatus(`Session exchange failed: ${verifyRes.data.error}`);
          }
        }
      };

      let localAuthStarted = false;
      eventSource.onerror = () => {
        eventSource.close();
        if (localAuthStarted) return;
        localAuthStarted = true;
        // If SSE fails, fallback to local biometric prompt
        handleLocalAuthentication(challengeData.options, challengeData.verificationCode, code);
      };

    } catch (error) {
      localStorage.removeItem('workspaceCode');
      setStatus(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  // Fallback if cross-device SSE fails or user prefers local login
  const handleLocalAuthentication = async (options, code, wsCode) => {
    try {
      setStatus('Please authenticate with this device...');
      const assertion = await startAuthentication(options);

      const verifyRes = await api.post('/auth/login/verify', {
        email,
        selectedCode: code,
        authenticationResponse: assertion,
        isLocal: true,
        workspaceCode: wsCode
      });

      if (verifyRes.data.success) {
        const userRes = await api.get('/auth/me');
        setUser(userRes.data.user);
      } else {
        throw new Error(verifyRes.data.error);
      }
    } catch (error) {
      setStatus(`Local Auth Error: ${error.message}`);
      setLoading(false);
    }
  };

  const triggerLocalAuthManual = () => {
    if (activeEventSource) {
      activeEventSource.close();
    }
    const code = workspaceCode.trim().toUpperCase();
    if (challengeOptions) {
      handleLocalAuthentication(challengeOptions.options, challengeOptions.verificationCode, code);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Aegis Secure Login</h2>

      {verificationCode ? (
        <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Verify on your Authenticator App</p>
          <h1 style={{ fontSize: '4rem', color: '#38bdf8', letterSpacing: '4px' }}>{verificationCode}</h1>
          <p style={{ marginTop: '1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>{status}</p>
          <button 
            type="button" 
            onClick={triggerLocalAuthManual} 
            style={{ 
              marginTop: '1.5rem', 
              padding: '0.6rem 1rem', 
              fontSize: '0.8rem', 
              borderRadius: '6px', 
              background: 'rgba(255,255,255,0.05)', 
              color: '#e2e8f0', 
              border: '1px solid #27272a',
              cursor: 'pointer',
              width: '100%',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Use Local Device Passkey (Backup)
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Workspace Code (6 chars)" 
            value={workspaceCode} 
            onChange={(e) => setWorkspaceCode(e.target.value)}
            required 
            maxLength={6}
            style={{ padding: '0.8rem', borderRadius: '8px', border: 'none', textTransform: 'uppercase' }}
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required 
            style={{ padding: '0.8rem', borderRadius: '8px', border: 'none' }}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Connecting...' : 'Login'}
          </button>
        </form>
      )}

      {!verificationCode && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
          <p>
            New device? <span style={{ color: '#38bdf8', cursor: 'pointer' }} onClick={onNavigate}>Register here</span>
          </p>
          <span 
            className="cursor-pointer text-zinc-500 hover:text-zinc-300 text-xs mt-1 transition-colors"
            onClick={onBackToHome}
            style={{ cursor: 'pointer', color: '#64748b' }}
          >
            &larr; Back to Home
          </span>
        </div>
      )}
    </div>
  );
};

export default Login;
