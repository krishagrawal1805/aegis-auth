import React, { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = ({ onNavigate, onBackToHome }) => {
  const { setUser } = useAuth();
  const [formData, setFormData] = useState({ email: '', displayName: '', role: 'Dev' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Initializing secure hardware check...');

    try {
      // 1. Get challenge from server
      const { data: challengeData, ok: challengeOk } = await api.post('/auth/register/challenge', formData);
      if (!challengeOk) throw new Error(challengeData.error);

      setStatus('Please authenticate with your device (TouchID/FaceID)...');

      // 2. Pass challenge to browser's WebAuthn API
      let attestation;
      try {
        attestation = await startRegistration(challengeData.options);
      } catch (err) {
        throw new Error('Hardware registration cancelled or failed.');
      }

      setStatus('Verifying cryptographic signature...');

      // 3. Send signature back to server for verification
      const verifyPayload = {
        email: formData.email,
        deviceName: navigator.platform || 'Web Browser',
        registrationResponse: attestation,
      };

      const { data: verifyData, ok: verifyOk } = await api.post('/auth/register/verify', verifyPayload);
      if (!verifyOk) throw new Error(verifyData.error);

      // 4. Success! Fetch the newly created user session
      const { data: userData } = await api.get('/auth/me');
      setUser(userData.user);

    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Register Device</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
          style={{ padding: '0.8rem', borderRadius: '8px', border: 'none' }}
        />
        <input
          type="text"
          placeholder="Display Name"
          value={formData.displayName}
          onChange={(e) => setFormData({...formData, displayName: e.target.value})}
          required
          style={{ padding: '0.8rem', borderRadius: '8px', border: 'none' }}
        />
        <select
          value={formData.role}
          onChange={(e) => setFormData({...formData, role: e.target.value})}
          style={{ padding: '0.8rem', borderRadius: '8px', border: 'none' }}
        >
          <option value="Dev">Developer</option>
          <option value="LeadDev">Lead Developer</option>
          <option value="SeniorAdmin">Senior Administrator</option>
        </select>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Register via Passkey'}
        </button>
      </form>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
        <p>
          Already have an account? <span style={{ color: '#38bdf8', cursor: 'pointer' }} onClick={onNavigate}>Login</span>
        </p>
        <span 
          className="cursor-pointer text-zinc-500 hover:text-zinc-300 text-xs mt-1 transition-colors"
          onClick={onBackToHome}
          style={{ cursor: 'pointer', color: '#64748b' }}
        >
          &larr; Back to Home
        </span>
      </div>
      {status && <p style={{ marginTop: '1rem', color: '#cbd5e1', textAlign: 'center', fontSize: '0.85rem' }}>{status}</p>}
    </div>
  );
};

export default Register;
