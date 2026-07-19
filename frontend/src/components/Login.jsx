import React, { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Key, Shield, HelpCircle, ArrowLeft } from 'lucide-react';

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

  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    if (!verificationCode) return;
    
    setTimeLeft(180); // Reset to 3 minutes (180 seconds)
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (activeEventSource) {
            activeEventSource.close();
          }
          setVerificationCode(null);
          setChallengeOptions(null);
          setStatus('Authentication challenge expired. Please request a new code.');
          setLoading(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [verificationCode]);

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

      setStatus('Cross-device stream active. Select the code on your co-signing device...');

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

  const handleMockLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Initializing passwordless mock challenge...');
    const code = workspaceCode.trim().toUpperCase();
    if (code.length !== 6) {
      setStatus('Error: Workspace code must be exactly 6 characters');
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem('workspaceCode', code);

      // Verify immediately using mock flag
      const verifyRes = await api.post('/auth/login/verify', {
        email: email.toLowerCase(),
        workspaceCode: code,
        authenticationResponse: { mock: true }
      });

      if (verifyRes.data.success) {
        const userRes = await api.get('/auth/me');
        setUser(userRes.data.user);
      } else {
        throw new Error(verifyRes.data.error || 'Bypass login failed');
      }
    } catch (error) {
      setStatus(`Bypass Error: ${error.message}`);
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

  const handleCancelLogin = () => {
    if (activeEventSource) {
      activeEventSource.close();
    }
    setVerificationCode(null);
    setChallengeOptions(null);
    setStatus('');
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel w-full max-w-[400px] p-8 border border-[#ececec] relative">
      <h2 className="text-2xl font-serif text-ink-black text-center mb-6">Aegis Secure Login</h2>

      {verificationCode ? (
        <div className="p-6 bg-white border border-[#ececec] rounded-2xl text-center space-y-4">
          <p className="text-xs text-slate-gray font-mono uppercase tracking-wider">Verification Challenge Code</p>
          <h1 className="text-5xl font-semibold tracking-wider text-ink-black font-mono my-2">{verificationCode}</h1>
          
          <div className="text-xs font-semibold text-rose-600">
            Expires In: {formatTime(timeLeft)}
          </div>

          <p className="text-xs text-slate-gray mt-2">{status}</p>
          
          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="button" 
              onClick={triggerLocalAuthManual} 
              className="btn-primary text-xs w-full"
            >
              Verify on this Device
            </button>
            <button 
              type="button" 
              onClick={handleCancelLogin} 
              className="btn-secondary text-xs w-full"
              style={{ borderColor: '#777b86', color: '#777b86' }}
            >
              Cancel & Resend
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-gray uppercase">Workspace Code</label>
            <input 
              type="text" 
              placeholder="e.g. ORG123" 
              value={workspaceCode} 
              onChange={(e) => setWorkspaceCode(e.target.value)}
              required 
              maxLength={6}
              className="w-full text-sm uppercase"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-gray uppercase">Email Address</label>
            <input 
              type="email" 
              placeholder="admin@aegis.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="w-full text-sm"
            />
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Connecting...' : 'Secure Login'}
            </button>
            <button 
              type="button" 
              onClick={handleMockLogin} 
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Connecting...' : 'Bypass Login (Mock)'}
            </button>
          </div>
        </form>
      )}

      {!verificationCode && (
        <div className="mt-6 flex flex-col items-center gap-3 text-xs">
          <p className="text-slate-gray">
            Need an account?{' '}
            <span 
              className="text-ink-black font-semibold cursor-pointer underline hover:no-underline" 
              onClick={onNavigate}
            >
              Register device
            </span>
          </p>
          <button 
            onClick={onBackToHome}
            className="text-slate-gray hover:text-ink-black flex items-center gap-1 bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
