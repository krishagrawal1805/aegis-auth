import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { startAuthentication } from '@simplewebauthn/browser';
import { Key, Shield, Check, Clock } from 'lucide-react';

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
      console.error('Failed to fetch pending approvals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();

    // Listen to real-time events to update signing counts
    const wsCode = localStorage.getItem('workspaceCode') || '';
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/events?workspaceCode=${wsCode}`, 
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'APPROVAL_REQUIRED' || payload.type === 'SIGNATURE_ADDED' || payload.type === 'ACTION_EXECUTED') {
        fetchPending();
      }
    };

    return () => eventSource.close();
  }, []);

  const handleSign = async (request) => {
    try {
      setError('');
      
      const { data: challengeData, ok: challengeOk } = await api.post('/approvals/sign-challenge');
      if (!challengeOk) throw new Error(challengeData.error || 'Failed to generate signing challenge');

      const signOptions = {
        challenge: challengeData.challenge,
        rpId: import.meta.env.VITE_RP_ID || window.location.hostname,
        allowCredentials: [],
        userVerification: 'preferred',
        timeout: 60000,
      };

      const assertion = await startAuthentication(signOptions);

      const payload = {
        approvalRequestId: request._id,
        deviceCredentialId: assertion.id,
        signatureValue: JSON.stringify(assertion),
      };

      const { data, ok } = await api.post('/approvals/sign', payload);

      if (ok && data.success) {
        fetchPending();
      } else {
        throw new Error(data.error || 'Failed to submit signature');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMockSign = async (request) => {
    try {
      setError('');
      
      const { data: challengeData, ok: challengeOk } = await api.post('/approvals/sign-challenge');
      if (!challengeOk) throw new Error(challengeData.error || 'Failed to generate signing challenge');

      const payload = {
        approvalRequestId: request._id,
        deviceCredentialId: 'mock-cred-id',
        signatureValue: JSON.stringify({ mock: true, id: 'mock-cred-id' }),
      };

      const { data, ok } = await api.post('/approvals/sign', payload);

      if (ok && data.success) {
        fetchPending();
      } else {
        throw new Error(data.error || 'Failed to submit signature');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-sm text-slate-gray">Loading pending approvals...</p>;

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-ink-black">Active Authorization Requests</h3>
          <p className="text-xs text-slate-gray mt-1">Co-sign workspace actions below to authorize execution.</p>
        </div>
        <span className="bg-ink-black text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
          {requests.length} Pending
        </span>
      </div>

      {error && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</p>}

      {requests.length === 0 ? (
        <p className="text-sm text-slate-gray text-center py-8 bg-white border border-[#ececec] rounded-2xl">
          No active co-signing requests found.
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const hasSigned = req.signatures.some(sig => sig.user_id === user._id);
            
            return (
              <div key={req._id} className="p-5 bg-white border border-[#ececec] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-gray transition-colors duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-ink-black">
                    <Clock className="w-4 h-4 text-slate-gray" />
                    <h4 className="font-semibold text-sm">{req.resourceName}</h4>
                  </div>
                  <p className="text-[10px] font-mono text-slate-gray">
                    Payload Hash: {req.actionPayloadHash.substring(0, 20)}...
                  </p>
                  
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] font-semibold bg-mist-gray text-ink-black px-2 py-0.5 rounded">
                      Consensus: {req.signatures.length} / {req.requiredCount} Signed
                    </span>
                    {hasSigned && (
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Signed
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSign(req)}
                    disabled={hasSigned}
                    className="btn-primary text-xs"
                    style={{ padding: '0.5rem 1.2rem' }}
                  >
                    {hasSigned ? 'Waiting on others' : 'Sign & Approve'}
                  </button>
                  {!hasSigned && (
                    <button 
                      onClick={() => handleMockSign(req)}
                      className="btn-secondary text-xs"
                      style={{ padding: '0.5rem 1.2rem', borderColor: '#777b86', color: '#777b86' }}
                    >
                      Bypass Sign (Mock)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Approvals;
