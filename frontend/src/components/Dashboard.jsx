import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../services/api';
import Approvals from './Approvals';
import AuditLog from './AuditLog';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [authPrompt, setAuthPrompt] = useState(null);
  const [processStatus, setProcessStatus] = useState('');
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'audit'

  useEffect(() => {
    const wsCode = localStorage.getItem('workspaceCode') || '';
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/events?workspaceCode=${wsCode}`, 
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'LOGIN_PROMPT') {
        setAuthPrompt(payload);
        setProcessStatus('');
      }
    };

    return () => eventSource.close();
  }, []);

  const handleApproveLogin = async (selectedCode) => {
    setProcessStatus('Verifying biometrics...');
    try {
      const assertion = await startAuthentication(authPrompt.options);
      setProcessStatus('Transmitting secure payload...');

      const wsCode = localStorage.getItem('workspaceCode') || '';
      const { data: verifyData, ok: verifyOk } = await api.post('/auth/login/verify', {
        email: authPrompt.email,
        selectedCode,
        authenticationResponse: assertion,
        workspaceCode: wsCode
      });

      if (verifyOk) {
        setProcessStatus('Approval successful! Desktop is logging in.');
        setTimeout(() => {
          setAuthPrompt(null);
          setProcessStatus('');
        }, 3000);
      } else {
        throw new Error(verifyData.error || 'Verification failed');
      }
    } catch (error) {
      setProcessStatus(`Failed: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Aegis Command Center
        </h2>
        <button onClick={logout} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}>
          Logout
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ color: '#e2e8f0', fontSize: '1.2rem' }}>Identity Validated</h3>
          <p style={{ color: '#94a3b8', marginTop: '0.2rem' }}>{user.display_name || user.displayName} ({user.email})</p>
          {user.org_id && (
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Workspace: <strong style={{ color: '#818cf8' }}>{user.org_id.name}</strong> ({user.org_id.workspace_code})
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Clearance Level</p>
          <p style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '1.1rem' }}>{user.role}</p>
        </div>
      </div>

      {authPrompt && (
        <div className="glass-panel" style={{ padding: '2.5rem', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.3)', marginBottom: '2rem', transform: 'scale(1.02)', transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#38bdf8', borderRadius: '50%', boxShadow: '0 0 10px #38bdf8', animation: 'pulse 2s infinite' }}></span>
            <h3 style={{ color: '#38bdf8', margin: 0 }}>Cross-Device Authentication Request</h3>
          </div>
          <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#cbd5e1' }}>Select the number currently displayed on the device requesting access.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {authPrompt.codeChoices.map(code => (
              <button 
                key={code}
                onClick={() => handleApproveLogin(code)}
                style={{
                  fontSize: '2.5rem', fontWeight: 'bold', padding: '1.5rem 2.5rem', borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid #334155', cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)', transition: 'transform 0.1s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {code}
              </button>
            ))}
          </div>
          
          {processStatus && (
            <p style={{ marginTop: '2rem', textAlign: 'center', color: '#38bdf8', fontWeight: '600', letterSpacing: '0.5px' }}>
              {processStatus}
            </p>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('approvals')}
          style={{ background: 'none', border: 'none', color: activeTab === 'approvals' ? '#38bdf8' : '#94a3b8', fontSize: '1.1rem', fontWeight: activeTab === 'approvals' ? 'bold' : 'normal', cursor: 'pointer', padding: '0.5rem 1rem' }}
        >
          Authorization Queue
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          style={{ background: 'none', border: 'none', color: activeTab === 'audit' ? '#38bdf8' : '#94a3b8', fontSize: '1.1rem', fontWeight: activeTab === 'audit' ? 'bold' : 'normal', cursor: 'pointer', padding: '0.5rem 1rem' }}
        >
          Audit Ledger
        </button>
      </div>

      {activeTab === 'approvals' ? <Approvals/> : <AuditLog/>}
    </div>
  );
};

export default Dashboard;
