import React, { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Approvals = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    try {
      const { data, ok } = await api.get('/approvals/pending');
      if (ok && data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();

    // Listen for live approval updates
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/events`, { withCredentials: true });

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'APPROVAL_REQUIRED' || payload.type === 'APPROVAL_COMPLETED') {
        // Refresh the list when a new request arrives or an existing one completes
        fetchPending();
      }
    };

    return () => eventSource.close();
  }, []);

  const handleSign = async (request) => {
    try {
      setError('');
      // We use the action payload hash directly as the challenge to bind the signature to the specific transaction
      const dummyOptions = {
        challenge: request.actionPayloadHash,
        rpId: import.meta.env.VITE_RP_ID || window.location.hostname,
        allowCredentials: [], // Allows any registered credential on this device
        userVerification: 'preferred',
        timeout: 60000,
      };

      const assertion = await startAuthentication(dummyOptions);

      const payload = {
        approvalRequestId: request._id,
        deviceCredentialId: assertion.id,
        signatureValue: JSON.stringify(assertion.response),
      };

      const { data, ok } = await api.post('/approvals/sign', payload);

      if (ok && data.success) {
        fetchPending(); // Refresh list to update signature count or remove if approved
      } else {
        throw new Error(data.error || 'Failed to submit signature');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading pending approvals...</p>;

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#f8fafc' }}>Pending Authorization Requests</h3>
        <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.85rem' }}>
          {requests.length} Pending
        </span>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}

      {requests.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>No pending requests require your signature.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(req => {
            const hasSigned = req.signatures.some(sig => sig.userId === user._id);
            
            return (
              <div key={req._id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>{req.resourceName}</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    Hash: {req.actionPayloadHash.substring(0, 16)}...
                  </p>
                  <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ background: '#1e293b', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      Signatures: {req.signatures.length} / {req.requiredCount}
                    </span>
                    {hasSigned && <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Signed</span>}
                  </div>
                </div>
                
                <button 
                  onClick={() => handleSign(req)}
                  disabled={hasSigned}
                  className="btn-primary"
                  style={{ background: hasSigned ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', boxShadow: hasSigned ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)' }}
                >
                  {hasSigned ? 'Waiting on others' : 'Sign & Approve'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Approvals;
