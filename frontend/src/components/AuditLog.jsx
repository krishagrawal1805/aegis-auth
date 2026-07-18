import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, ok } = await api.get('/audit-logs');
        if (ok && data.success) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error('Failed to fetch audit logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getPayloadDescription = (log) => {
    const { action, payload } = log;
    if (action === 'USER_LOGIN') {
      return `Logged in using ${payload.deviceName || 'FIDO2 Passkey'}`;
    }
    if (action === 'USER_REGISTER') {
      return `Registered passkey credential via ${payload.deviceName || 'FIDO2 Passkey'}`;
    }
    if (action === 'APPROVAL_GRANTED') {
      return `Authorized resource [${payload.resourceName || 'Critical Operation'}] with ${payload.signaturesCount || 2} co-signatures`;
    }
    return payload && typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
  };

  if (loading) return <p style={{ color: '#94a3b8', marginTop: '2rem' }}>Loading cryptographic ledger...</p>;

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', overflowX: 'auto' }}>
      <h3 style={{ color: '#f8fafc', marginBottom: '1.5rem' }}>Immutable Audit Ledger</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
            <th style={{ padding: '1rem 0.5rem' }}>Timestamp</th>
            <th style={{ padding: '1rem 0.5rem' }}>Actor</th>
            <th style={{ padding: '1rem 0.5rem' }}>Action</th>
            <th style={{ padding: '1rem 0.5rem' }}>Details</th>
            <th style={{ padding: '1rem 0.5rem' }}>Integrity</th>
            <th style={{ padding: '1rem 0.5rem' }}>HMAC Signature</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '1rem 0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td style={{ padding: '1rem 0.5rem', color: '#e2e8f0', fontSize: '0.85rem' }}>
                {log.actor_id ? (
                  <div>
                    <strong>{log.actor_id.display_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.actor_id.email}</div>
                  </div>
                ) : (
                  <span style={{ color: '#64748b' }}>System</span>
                )}
              </td>
              <td style={{ padding: '1rem 0.5rem' }}>
                <span style={{ 
                  background: log.action === 'APPROVAL_GRANTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.1)', 
                  color: log.action === 'APPROVAL_GRANTED' ? '#10b981' : '#38bdf8',
                  padding: '0.3rem 0.6rem', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {log.action}
                </span>
              </td>
              <td style={{ padding: '1rem 0.5rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
                {getPayloadDescription(log)}
              </td>
              <td style={{ padding: '1rem 0.5rem' }}>
                {log.verified ? (
                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    ✓ Intact
                  </span>
                ) : (
                  <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    ⚠ Tampered
                  </span>
                )}
              </td>
              <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace', color: '#64748b', fontSize: '0.8rem' }}>
                <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={log.hmac_signature}>
                  {log.hmac_signature}
                </div>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Ledger is currently empty.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLog;
