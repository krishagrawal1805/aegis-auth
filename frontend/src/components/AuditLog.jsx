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

  if (loading) return <p style={{ color: '#94a3b8', marginTop: '2rem' }}>Loading cryptographic ledger...</p>;

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', overflowX: 'auto' }}>
      <h3 style={{ color: '#f8fafc', marginBottom: '1.5rem' }}>Immutable Audit Ledger</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
            <th style={{ padding: '1rem 0.5rem' }}>Timestamp</th>
            <th style={{ padding: '1rem 0.5rem' }}>Event Type</th>
            <th style={{ padding: '1rem 0.5rem' }}>Description</th>
            <th style={{ padding: '1rem 0.5rem' }}>Block Hash</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '1rem 0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td style={{ padding: '1rem 0.5rem' }}>
                <span style={{ 
                  background: log.eventType === 'APPROVAL_GRANTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.1)', 
                  color: log.eventType === 'APPROVAL_GRANTED' ? '#10b981' : '#38bdf8',
                  padding: '0.3rem 0.6rem', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {log.eventType}
                </span>
              </td>
              <td style={{ padding: '1rem 0.5rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
                {log.description}
              </td>
              <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace', color: '#64748b', fontSize: '0.8rem' }}>
                <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '150px' }} title={log.currentBlockHash}>
                  {log.currentBlockHash}
                </div>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Ledger is currently empty.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLog;
