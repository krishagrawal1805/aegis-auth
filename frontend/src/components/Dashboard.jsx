import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../services/api';
import Approvals from './Approvals';
import AuditLog from './AuditLog';
import { Shield, Key, LogOut, Terminal, Users, Activity, FileText, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [authPrompt, setAuthPrompt] = useState(null);
  const [processStatus, setProcessStatus] = useState('');
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'audit' | 'users'
  const [pendingUsers, setPendingUsers] = useState([]);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchPendingUsers = async () => {
    try {
      const { data, ok } = await api.get('/auth/users/pending');
      if (ok && data.success) {
        setPendingUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch pending users', err);
    }
  };

  const fetchRoster = async () => {
    setRosterLoading(true);
    try {
      const { data, ok } = await api.get('/auth/org/members');
      if (ok && data.success) {
        setRoster(data.members);
      }
    } catch (err) {
      console.error('Failed to fetch workspace roster', err);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRoster();
      if (user.role === 'Admin') {
        fetchPendingUsers();
      }
    }
  }, [user]);

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
      } else if (payload.type === 'MEMBER_JOIN_REQUEST') {
        fetchPendingUsers();
      }
    };

    return () => eventSource.close();
  }, []);

  const handleApproveUser = async (email, role) => {
    try {
      const { data, ok } = await api.post('/auth/users/approve', { email, role });
      if (ok && data.success) {
        alert('User approved successfully!');
        fetchPendingUsers();
        fetchRoster();
      } else {
        alert(data.error || 'Failed to approve user');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTriggerAction = async () => {
    setTriggering(true);
    try {
      const { data, ok } = await api.post('/approvals/request', {
        resourceName: 'Production Database Wipe (PROD-DB-01)',
        actionPayload: 'DROP TABLE users CASCADE'
      });
      if (ok && data.success) {
        alert('Secure database wipe request triggered! Awaiting M-of-N co-signatures.');
      } else {
        alert(data.error || 'Failed to trigger action');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setTriggering(false);
    }
  };


  const handleApproveLogin = async (selectedCode) => {
    setProcessStatus('Verifying biometrics...');
    try {
      // Override allowCredentials to empty so Windows Hello always appears
      const authOptions = { ...authPrompt.options, allowCredentials: [] };
      const assertion = await startAuthentication(authOptions);
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
    <div className="min-h-screen bg-white text-ink-black font-sans grid-mesh relative">
      
      {/* Navbar */}
      <nav className="border-b border-[#ececec] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-serif tracking-tight select-none">
              Aegis
            </span>
            <span className="text-[10px] bg-mist-gray text-slate-gray px-2 py-0.5 rounded-full font-mono font-medium">
              Dashboard
            </span>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 border border-[#ececec] rounded-full hover:bg-mist-gray transition-all cursor-pointer text-slate-gray hover:text-ink-black"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <div className="max-w-[1000px] mx-auto px-6 py-12 space-y-8">
        
        {/* User Identity Banner */}
        <div className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-semibold text-slate-gray uppercase">AUTHENTICATED IDENTITY</span>
            <h3 className="text-xl font-semibold text-ink-black">{user.display_name || user.displayName}</h3>
            <p className="text-xs text-slate-gray">{user.email}</p>
            {user.org_id && (
              <p className="text-[11px] text-slate-gray">
                Org: <strong className="text-ink-black font-semibold">{user.org_id.name}</strong> ({user.org_id.workspace_code})
              </p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-mono text-slate-gray uppercase block mb-1">Clearance</span>
            <span className="text-sm font-semibold bg-ink-black text-white px-3 py-1 rounded-full">{user.role}</span>
          </div>
        </div>

        {/* High-Risk Operation Control Panel (Admin Only) */}
        {user.role === 'Admin' && (
          <div className="accent-peach-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2 text-sienna-brown">
                <Shield className="w-4 h-4" />
                <h4 className="font-semibold text-base">High-Risk Operation Command</h4>
              </div>
              <p className="text-xs text-sienna-brown/85 leading-relaxed">
                Trigger sensitive workspace commands requiring co-signing consensus authorization under FIDO2 rules.
              </p>
            </div>
            <button 
              onClick={handleTriggerAction} 
              disabled={triggering}
              className="px-6 py-2.5 bg-sienna-brown hover:bg-[#4d2215] text-white rounded-full font-semibold text-xs border-none cursor-pointer transition-colors disabled:opacity-50"
            >
              {triggering ? 'Triggering...' : 'Request Database Wipe'}
            </button>
          </div>
        )}

        {/* Cross-Device verification Request Banner */}
        {authPrompt && (
          <div className="floating-artifact p-8 border border-[#ececec] text-center space-y-6">
            <div className="flex items-center justify-center gap-2 text-ink-black">
              <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
              <h3 className="font-semibold text-base">Cross-Device Verification Challenge</h3>
            </div>
            <p className="text-xs text-slate-gray max-w-md mx-auto">
              Select the number matching the login prompt on your other device to authorize biometric credentials validation.
            </p>
            
            <div className="flex justify-center gap-4 flex-wrap">
              {authPrompt.codeChoices.map(code => (
                <button 
                  key={code}
                  onClick={() => handleApproveLogin(code)}
                  className="text-2xl font-bold font-mono px-6 py-4 rounded-2xl bg-mist-gray border border-[#ececec] hover:border-ink-black transition-colors cursor-pointer"
                >
                  {code}
                </button>
              ))}
            </div>
            
            {processStatus && (
              <p className="text-xs font-mono font-semibold text-emerald-600">
                {processStatus}
              </p>
            )}
          </div>
        )}

        {/* Content Tabs Header */}
        <div className="flex gap-4 border-b border-[#ececec] pb-2">
          <button 
            onClick={() => setActiveTab('approvals')}
            className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'approvals' 
                ? 'border-ink-black text-ink-black' 
                : 'border-transparent text-slate-gray hover:text-ink-black'
            }`}
          >
            Authorization Queue
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audit' 
                ? 'border-ink-black text-ink-black' 
                : 'border-transparent text-slate-gray hover:text-ink-black'
            }`}
          >
            Audit Ledger
          </button>
          <button 
            onClick={() => { setActiveTab('users'); fetchRoster(); if (user.role === 'Admin') fetchPendingUsers(); }}
            className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'users' 
                ? 'border-ink-black text-ink-black' 
                : 'border-transparent text-slate-gray hover:text-ink-black'
            }`}
          >
            Workspace Members
          </button>
        </div>

        {/* Tab panels */}
        <div>
          {activeTab === 'approvals' && <Approvals />}
          {activeTab === 'audit' && <AuditLog />}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Workspace Roster (All Authenticated Users) */}
              <div className="glass-panel p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-black">Active Workspace Guardians</h3>
                    <p className="text-xs text-slate-gray mt-1">Immutable directory of verified team credentials inside this tenant workspace.</p>
                  </div>
                  <span className="bg-ink-black text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
                    {roster.length} Guardians
                  </span>
                </div>

                {rosterLoading ? (
                  <p className="text-sm text-slate-gray">Verifying registry...</p>
                ) : (
                  <div className="divide-y divide-[#ececec]/50">
                    {roster.map((member, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center text-sm">
                        <div>
                          <strong className="font-semibold text-ink-black">{member.display_name}</strong>
                          <div className="text-[10px] text-slate-gray font-mono">{member.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            member.online 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${member.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            {member.online ? 'Online' : 'Offline'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            member.role === 'Admin' 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                              : 'bg-cyan-50 text-cyan-700 border-cyan-100'
                          }`}>
                            {member.role}
                          </span>
                          <span className="bg-mist-gray text-slate-gray border border-[#ececec] px-2 py-0.5 rounded-full text-[10px] font-mono">
                            Account: {member.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {roster.length === 0 && (
                      <p className="text-sm text-slate-gray text-center py-6">No workspace members found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Workspace Join Requests (Admin Only) */}
              {user.role === 'Admin' && (
                <div className="glass-panel p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-black">Workspace Join Requests</h3>
                    <p className="text-xs text-slate-gray mt-1">Review pending member credentials seeking workspace access.</p>
                  </div>

                  {pendingUsers.length === 0 ? (
                    <p className="text-sm text-slate-gray text-center py-6 bg-white rounded-xl border border-[#ececec]">
                      No pending requests.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pendingUsers.map(member => (
                        <div key={member.email} className="p-4 bg-white border border-[#ececec] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <strong className="text-sm text-ink-black font-semibold">{member.display_name}</strong>
                            <p className="text-xs text-slate-gray font-mono mt-0.5">{member.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApproveUser(member.email, 'Approver')}
                              className="px-4 py-2 bg-ink-black hover:bg-primary-hover text-white text-xs font-semibold rounded-full cursor-pointer"
                            >
                              Approve as Approver
                            </button>
                            <button 
                              onClick={() => handleApproveUser(member.email, 'Admin')}
                              className="px-4 py-2 border border-ink-black hover:bg-mist-gray text-ink-black text-xs font-semibold rounded-full cursor-pointer"
                            >
                              Approve as Admin
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
