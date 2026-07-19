import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, ShieldAlert, CheckCircle } from 'lucide-react';

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

  if (loading) return <p className="text-sm text-slate-gray">Loading cryptographic ledger...</p>;

  return (
    <div className="glass-panel p-6 space-y-6 overflow-x-auto">
      <div>
        <h3 className="text-lg font-semibold text-ink-black flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-gray" />
          Immutable Audit Ledger
        </h3>
        <p className="text-xs text-slate-gray mt-1">Cryptographically verified log entries signed with row-level HMACs.</p>
      </div>

      <table className="min-w-full">
        <thead>
          <tr className="border-b border-[#ececec]">
            <th className="py-3 px-4 text-xs font-mono font-bold text-slate-gray uppercase">Timestamp</th>
            <th className="py-3 px-4 text-xs font-mono font-bold text-slate-gray uppercase">Actor</th>
            <th className="py-3 px-4 text-xs font-mono font-bold text-slate-gray uppercase">Action</th>
            <th className="py-3 px-4 text-xs font-mono font-bold text-slate-gray uppercase">Details</th>
            <th className="py-3 px-4 text-xs font-mono font-bold text-slate-gray uppercase">Integrity</th>
            <th className="py-3 px-4 text-xs font-mono font-bold text-slate-gray uppercase">HMAC Signature</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ececec]/50">
          {logs.map((log) => (
            <tr key={log._id} className="hover:bg-[#fafafb] transition-colors duration-200">
              <td className="py-4 px-4 text-xs text-slate-gray font-mono">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="py-4 px-4 text-xs text-ink-black">
                {log.actor_id ? (
                  <div>
                    <strong className="font-semibold">{log.actor_id.display_name}</strong>
                    <div className="text-[10px] text-slate-gray font-mono">{log.actor_id.email}</div>
                  </div>
                ) : (
                  <span className="text-slate-gray font-mono">System</span>
                )}
              </td>
              <td className="py-4 px-4 text-xs">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  log.action === 'APPROVAL_GRANTED' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}>
                  {log.action}
                </span>
              </td>
              <td className="py-4 px-4 text-xs text-ink-black">
                {getPayloadDescription(log)}
              </td>
              <td className="py-4 px-4 text-xs">
                {log.verified ? (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 w-max">
                    <CheckCircle className="w-3 h-3" /> Intact
                  </span>
                ) : (
                  <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 w-max">
                    <ShieldAlert className="w-3 h-3" /> Tampered
                  </span>
                )}
              </td>
              <td className="py-4 px-4 font-mono text-[10px] text-slate-gray">
                <div className="max-w-[120px] truncate" title={log.hmac_signature}>
                  {log.hmac_signature}
                </div>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center py-8 text-sm text-slate-gray">Ledger is empty.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLog;
