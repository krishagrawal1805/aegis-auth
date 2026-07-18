import React, { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = ({ onNavigate, onBackToHome }) => {
  const { setUser } = useAuth();
  const [formData, setFormData] = useState({ 
    email: '', 
    displayName: '', 
    role: 'Requester',
    workspaceCode: '',
    orgName: ''
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Initializing secure hardware check...');

    const code = formData.workspaceCode.trim().toUpperCase();
    if (code.length !== 6) {
      setStatus('Error: Workspace code must be exactly 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Set workspaceCode in localStorage so all subsequent apiFetch calls carry it in the headers
      localStorage.setItem('workspaceCode', code);

      // 1. Get challenge from server
      const { data: challengeData, ok: challengeOk } = await api.post('/auth/register/challenge', {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        workspaceCode: code,
        orgName: formData.orgName.trim() || `${code} Org`
      });
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
        workspaceCode: code
      };

      const { data: verifyData, ok: verifyOk } = await api.post('/auth/register/verify', verifyPayload);
      if (!verifyOk) throw new Error(verifyData.error);

      // 4. Success! Fetch the newly created user session
      const { data: userData } = await api.get('/auth/me');
      setUser(userData.user);

    } catch (error) {
      localStorage.removeItem('workspaceCode');
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Register Device</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Workspace Code (e.g. ORG123)"
            value={formData.workspaceCode}
            onChange={(e) => setFormData({...formData, workspaceCode: e.target.value})}
            required
            maxLength={6}
            style={{ padding: '0.8rem', borderRadius: '8px', border: 'none', flex: 1, textTransform: 'uppercase' }}
          />
          <input
            type="text"
            placeholder="Org Name (Optional)"
            value={formData.orgName}
            onChange={(e) => setFormData({...formData, orgName: e.target.value})}
            style={{ padding: '0.8rem', borderRadius: '8px', border: 'none', flex: 1 }}
          />
        </div>
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
          <option value="Requester">Requester (View & Request)</option>
          <option value="Approver">Approver (Co-sign & Approve)</option>
          <option value="Admin">Administrator (Elevated Approvals)</option>
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
