import React, { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

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

    const isGenesisAdmin = formData.role === 'Admin';
    const code = formData.workspaceCode.trim().toUpperCase();

    if (!isGenesisAdmin && code.length !== 6) {
      setStatus('Error: Workspace code must be exactly 6 characters');
      setLoading(false);
      return;
    }

    if (isGenesisAdmin && !formData.orgName.trim()) {
      setStatus('Error: Organization Name is required');
      setLoading(false);
      return;
    }

    try {
      // 1. Get challenge from server
      const { data: challengeData, ok: challengeOk } = await api.post('/auth/register/challenge', {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        workspaceCode: isGenesisAdmin ? '' : code,
        orgName: isGenesisAdmin ? formData.orgName.trim() : ''
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

      // 3. Send signature to either /org/create or /org/join
      if (isGenesisAdmin) {
        const verifyPayload = {
          org_name: formData.orgName.trim(),
          admin_email: formData.email,
          admin_name: formData.displayName,
          registrationResponse: attestation,
          deviceName: navigator.platform || 'Web Browser'
        };
        const { data: verifyData, ok: verifyOk } = await api.post('/auth/org/create', verifyPayload);
        if (!verifyOk) throw new Error(verifyData.error);

        // Save generated workspace code to localStorage
        localStorage.setItem('workspaceCode', verifyData.workspace_code);

        setStatus('Organization created successfully! Redirecting...');
        
        // Fetch user session
        const { data: userData } = await api.get('/auth/me');
        setUser(userData.user);
      } else {
        const verifyPayload = {
          workspace_code: code,
          email: formData.email,
          display_name: formData.displayName,
          registrationResponse: attestation,
          deviceName: navigator.platform || 'Web Browser'
        };
        const { data: verifyData, ok: verifyOk } = await api.post('/auth/org/join', verifyPayload);
        if (!verifyOk) throw new Error(verifyData.error);

        setStatus('Join request submitted successfully. Awaiting Admin approval.');
        alert('Join request submitted successfully. Awaiting Admin approval.');
        setTimeout(() => {
          onNavigate('login');
        }, 3000);
      }

    } catch (error) {
      localStorage.removeItem('workspaceCode');
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-[400px] p-8 border border-[#ececec]">
      <h2 className="text-2xl font-serif text-ink-black text-center mb-6">Register Device</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-gray uppercase">Choose Security Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            className="w-full text-sm"
          >
            <option value="Requester">Requester (View & Request)</option>
            <option value="Approver">Approver (Co-sign & Approve)</option>
            <option value="Admin">Administrator (Create Workspace)</option>
          </select>
        </div>

        {formData.role === 'Admin' ? (
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-gray uppercase">Organization Name</label>
            <input
              type="text"
              placeholder="e.g. Aegis Corp"
              value={formData.orgName}
              onChange={(e) => setFormData({...formData, orgName: e.target.value})}
              required
              className="w-full text-sm"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-gray uppercase">Workspace Code</label>
            <input
              type="text"
              placeholder="e.g. ORG123"
              value={formData.workspaceCode}
              onChange={(e) => setFormData({...formData, workspaceCode: e.target.value})}
              required
              maxLength={6}
              className="w-full text-sm uppercase"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-gray uppercase">Email Address</label>
          <input
            type="email"
            placeholder="e.g. key@aegis.com"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            className="w-full text-sm"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-gray uppercase">Display Name</label>
          <input
            type="text"
            placeholder="e.g. Admin Key"
            value={formData.displayName}
            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
            required
            className="w-full text-sm"
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
          {loading ? 'Processing...' : formData.role === 'Admin' ? 'Create Workspace' : 'Request to Join'}
        </button>
      </form>
      
      <div className="mt-6 flex flex-col items-center gap-3 text-xs">
        <p className="text-slate-gray">
          Already have an account?{' '}
          <span 
            className="text-ink-black font-semibold cursor-pointer underline hover:no-underline" 
            onClick={onNavigate}
          >
            Login here
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
      {status && <p className="mt-4 text-center text-xs text-slate-gray">{status}</p>}
    </div>
  );
};

export default Register;
