import React, { useState, useEffect } from 'react';

const LandingPage = ({ onNavigate }) => {
  const [activeLink, setActiveLink] = useState('Home');
  const [email, setEmail] = useState('');
  const [demoState, setDemoState] = useState('EMAIL_INPUT');
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [verificationCode] = useState(76);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [biometricProgress, setBiometricProgress] = useState(0);

  // Handle Mouse Spotlight Effect
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle email submit to transition to number matching
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setDemoState('NUMBER_MATCH');
  };

  // Handle mobile number selection
  const handleNumberSelect = (num) => {
    setSelectedNumber(num);
    if (num === verificationCode) {
      setTimeout(() => {
        setDemoState('BIOMETRIC_SCAN');
      }, 800);
    } else {
      setTimeout(() => {
        setSelectedNumber(null);
      }, 500);
    }
  };

  // Biometric progress simulation
  useEffect(() => {
    if (demoState !== 'BIOMETRIC_SCAN') {
      setBiometricProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setBiometricProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setDemoState('AUTHORIZED');
          }, 600);
          return 100;
        }
        return prev + 4;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [demoState]);

  // Reset demo
  const resetDemo = () => {
    setEmail('');
    setDemoState('EMAIL_INPUT');
    setSelectedNumber(null);
  };

  return (
    <div 
      className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-600 selection:text-white grid-mesh relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Vercel-style Spotlight Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(800px circle at ${mouseCoords.x}px ${mouseCoords.y}px, rgba(59, 130, 246, 0.06), transparent 80%)`
        }}
      />

      {/* Brand Ambient Background Glows */}
      <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[650px] h-[650px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-white/[0.04] bg-zinc-950/40 backdrop-blur-md sticky top-0 z-50 relative">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span 
              className="text-2xl tracking-tight text-foreground flex items-center gap-1.5 cursor-default select-none"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Aegis<sup className="text-xs">®</sup>
            </span>
            <span className="text-xs bg-zinc-900 border border-white/[0.04] text-zinc-500 px-2 py-0.5 rounded font-mono">v1.0.0</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Features</a>
            <a href="#workflow" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Workflow</a>
            <a href="#developer" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Developer API</a>
            <button 
              onClick={() => onNavigate('login')}
              className="text-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 px-4 py-1.5 rounded transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => onNavigate('register')}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-medium shadow-sm transition-all cursor-pointer"
            >
              Register Device
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Typography */}
        <div className="lg:col-span-6 flex flex-col items-start text-left max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-6 animate-fade-rise">
            FIDO2 / PASSKEY INFRASTRUCTURE
          </span>
          <h1 
            className="text-5xl sm:text-6xl leading-[0.95] tracking-[-2.46px] font-normal text-foreground animate-fade-rise"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            The cryptographic <em className="not-italic text-muted-foreground">authentication</em> gateway.
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg mt-6 leading-relaxed animate-fade-rise-delay">
            Replace passwords with hardware-bound credentials, SSE-driven active trust bindings, and a tamper-evident audit log designed for modern enterprise infrastructure.
          </p>
          <div className="flex items-center gap-4 mt-8 animate-fade-rise-delay-2">
            <button 
              onClick={() => onNavigate('register')}
              className="liquid-glass rounded-full px-8 py-3.5 text-sm text-foreground hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 ease-out font-medium cursor-pointer"
            >
              Deploy Authenticator
            </button>
            <button 
              onClick={() => onNavigate('login')}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-200 px-6 py-3.5 transition-colors duration-300 bg-transparent border-none cursor-pointer"
            >
              Access Platform →
            </button>
          </div>
        </div>

        {/* Right Column: Live Interactive Widget */}
        <div className="lg:col-span-6 flex justify-center items-center w-full animate-fade-rise-delay">
          <div className="relative w-full max-w-[440px] aspect-[4/5] rounded-3xl border border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-xl shadow-2xl p-8 flex flex-col justify-between overflow-hidden">
            
            {/* Ambient Background Glow inside Card */}
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            {/* Header of the Authenticator Widget */}
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-xs font-mono text-zinc-500 tracking-wider uppercase">AEGIS-AUTH-NODE-01</span>
              </div>
              <span className="text-xs font-mono text-zinc-500">v1.0.0</span>
            </div>

            {/* Content Body depending on State */}
            <div className="flex-1 flex flex-col justify-center py-6">
              
              {/* STATE 1: EMAIL INPUT */}
              {demoState === 'EMAIL_INPUT' && (
                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 animate-fade-rise">
                  <div className="text-left mb-2">
                    <h3 className="text-lg font-medium text-foreground tracking-tight">Interactive Sandbox</h3>
                    <p className="text-xs text-zinc-500 mt-1">Simulate a hardware-bound passkey registration & handshake.</p>
                  </div>
                  <input
                    type="email"
                    placeholder="Enter a test email address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-foreground placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  <button 
                    type="submit"
                    className="w-full py-3 bg-white text-black font-semibold text-sm rounded-xl hover:bg-[#ededed] active:scale-[0.98] transition-all cursor-pointer shadow-lg"
                  >
                    Simulate Passkey Login
                  </button>
                </form>
              )}

              {/* STATE 2: NUMBER MATCHING */}
              {demoState === 'NUMBER_MATCH' && (
                <div className="flex flex-col items-center gap-6 animate-fade-rise text-center">
                  <div>
                    <h3 className="text-lg font-medium text-foreground tracking-tight">Verify Intent</h3>
                    <p className="text-xs text-zinc-500 mt-1">Tap the matching number on your verified device.</p>
                  </div>
                  
                  {/* Huge verification Code */}
                  <div className="relative py-6 px-10 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                    <span className="text-5xl font-semibold tracking-widest text-blue-400 font-mono">
                      {verificationCode}
                    </span>
                  </div>

                  {/* Simulated Mobile Device Grid */}
                  <div className="w-full max-w-[280px] bg-white/[0.01] border border-white/[0.06] rounded-2xl p-4 mt-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Simulated Phone</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[38, 76, 52].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleNumberSelect(num)}
                          className={`py-3.5 text-sm font-semibold font-mono rounded-xl border transition-all cursor-pointer ${
                            selectedNumber === num
                              ? num === verificationCode
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : 'bg-rose-500/20 border-rose-500 text-rose-400'
                              : 'bg-white/[0.02] border-white/[0.06] text-foreground hover:bg-white/[0.04]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 3: BIOMETRIC SCAN */}
              {demoState === 'BIOMETRIC_SCAN' && (
                <div className="flex flex-col items-center gap-6 animate-fade-rise text-center">
                  <div>
                    <h3 className="text-lg font-medium text-foreground tracking-tight">Verifying Credentials</h3>
                    <p className="text-xs text-zinc-500 mt-1">Acquiring cryptographic signature via hardware enclave.</p>
                  </div>

                  {/* Fingerprint Scanner Graphic */}
                  <div className="relative w-28 h-28 flex items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/5 mt-4 overflow-hidden">
                    {/* Scanning Laser Line */}
                    <div 
                      className="absolute left-0 right-0 h-[2px] bg-blue-400/80 shadow-[0_0_8px_#60a5fa] animate-pulse"
                      style={{
                        top: `${biometricProgress}%`,
                        transition: 'top 0.08s linear'
                      }}
                    />
                    
                    {/* Biometric Fingerprint Icon */}
                    <svg className="w-14 h-14 text-blue-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a9 9 0 00-9 9m9-9a9 9 0 019 9m-9-9v3m0 12a9 9 0 009-9m-9 9a9 9 0 01-9-9m9 9v-3m0-6a3 3 0 013 3v1m-3-4a3 3 0 00-3 3v1" />
                    </svg>

                    {/* Progress Circle border */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="52"
                        stroke="rgba(59, 130, 246, 0.3)"
                        strokeWidth="3"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="52"
                        stroke="#60a5fa"
                        strokeWidth="3"
                        fill="transparent"
                        strokeDasharray={326}
                        strokeDashoffset={326 - (326 * biometricProgress) / 100}
                        style={{ transition: 'stroke-dashoffset 0.08s linear' }}
                      />
                    </svg>
                  </div>

                  <span className="text-xs font-mono text-blue-400 mt-2">{biometricProgress}% Completed</span>
                </div>
              )}

              {/* STATE 4: AUTHORIZED */}
              {demoState === 'AUTHORIZED' && (
                <div className="flex flex-col gap-5 animate-fade-rise text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Session Authenticated</h3>
                      <p className="text-[11px] text-zinc-500">Authorized session for {email || 'admin@company.com'}</p>
                    </div>
                  </div>

                  {/* Mini-Dashboard System Details */}
                  <div className="flex flex-col gap-3 bg-white/[0.01] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-mono">ENCLAVE KEY:</span>
                      <span className="font-mono text-emerald-400">verified_key_ok</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-mono">DEVICE LINK:</span>
                      <span className="font-mono text-foreground">iPhone 15 Pro</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-3 mt-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">BLOCKCHAIN LEDGER ACTION:</span>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="font-mono text-xs text-blue-400 truncate max-w-[200px]">
                          6a5a78e7e65210b269cef0f0...
                        </span>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-mono">
                          Committed
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={resetDemo}
                    className="w-full py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-foreground text-sm font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Reset Authentication Demo
                  </button>
                </div>
              )}

            </div>

            {/* Bottom Footer block inside Card */}
            <div className="border-t border-white/[0.04] pt-4 flex justify-between items-center text-[10px] font-mono text-zinc-500">
              <span>STATUS: READY</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                SECURE HANDSHAKE ACTIVE
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* Why Aegis Section */}
      <section id="why" className="border-t border-zinc-900 bg-zinc-900/10 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-500 font-mono font-semibold block mb-3">The Problem</span>
              <h2 className="text-2xl font-bold tracking-tight mb-4 text-zinc-200">The inherent vulnerabilities of password-based security</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Conventional authentication relies on shared secrets: passwords, pins, and codes. Because these secrets exist to be typed, they can be phished, intercepted via SIM swapping, or guessed through brute force.
              </p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Even multi-factor push approvals fail when attackers trigger MFA fatigue, spamming the user until they accidentally tap "Yes" on a busy day.
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-500 font-mono font-semibold block mb-3">The Solution</span>
              <h2 className="text-2xl font-bold tracking-tight mb-4 text-zinc-200">Hardware-bound biometrics and dynamic approvals</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Aegis eliminates shared secrets. All logins require WebAuthn/Passkey signatures verified by secure local enclaves (fingerprint or face scanners).
              </p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Critical resource actions enforce multi-party threshold policies. An administrator cannot act alone, and all transaction signatures are cryptographically bound to the audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="border-t border-zinc-900 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-wider text-blue-500 font-mono font-semibold block mb-2">Core Features</span>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Implemented Security Capabilities</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-zinc-800 bg-zinc-900/30 p-6 rounded-lg">
              <h3 className="font-semibold text-zinc-200 mb-2">1. Passwordless Authentication</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Uses the FIDO2/WebAuthn standard to replace passwords with device-bound public-key credentials. Users register and log in via local biometric secure enclaves (Touch ID / Face ID).
              </p>
            </div>
            <div className="border border-zinc-800 bg-zinc-900/30 p-6 rounded-lg">
              <h3 className="font-semibold text-zinc-200 mb-2">2. Cross-Device Authentication</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Log in to untrusted devices using your phone as a hardware authenticator. Real-time Server-Sent Events (SSE) push verification prompts with phishing-resistant number matching.
              </p>
            </div>
            <div className="border border-zinc-800 bg-zinc-900/30 p-6 rounded-lg">
              <h3 className="font-semibold text-zinc-200 mb-2">3. Multi-Party Authorization</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Configurable threshold policies (M-of-N signatures) for production environments. Accessing or executing critical operations requires separate biometric signatures from designated approver roles.
              </p>
            </div>
            <div className="border border-zinc-800 bg-zinc-900/30 p-6 rounded-lg">
              <h3 className="font-semibold text-zinc-200 mb-2">4. Tamper-Evident Audit Ledger</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                All login and signature events are cryptographically chained. Each log entry is hashed along with the preceding block's hash, generating a verifiable ledger that immediately exposes tampering.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication Workflow Section */}
      <section id="workflow" className="border-t border-zinc-900 bg-zinc-900/10 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-wider text-blue-500 font-mono font-semibold block mb-2">Flow Diagram</span>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">The Authentication & Authorization Sequence</h2>
          </div>
          <div className="relative border border-zinc-800 bg-zinc-950 p-8 rounded-xl max-w-3xl mx-auto">
            <div className="flex flex-col gap-6">
              {[
                { step: '01', title: 'User Verification Challenge', desc: 'The server generates a unique challenge tied to the target device session.' },
                { step: '02', title: 'Local Passkey Authentication', desc: 'The user verifies biometrics (fingerprint/face) to sign the WebAuthn challenge.' },
                { step: '03', title: 'Device Trust Verification', desc: 'The server verifies the cryptographic signature against the user\'s registered public key.' },
                { step: '04', title: 'Multi-Party Approval Routing', desc: 'If the resource is marked critical (PROD), the system halts access and prompts the authorization queue.' },
                { step: '05', title: 'Ledger Registry', desc: 'The verified action and corresponding signatures are logged into the cryptographic audit chain.' },
                { step: '06', title: 'Access Granted', desc: 'The server generates the session token and grants access to the requested scope.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start relative">
                  <div className="h-8 w-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono text-blue-400 font-semibold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-200 text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-zinc-400">{item.desc}</p>
                  </div>
                  {idx < 5 && <div className="absolute left-4 top-8 bottom-0 w-[1px] bg-zinc-800 -mb-6"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="preview" className="border-t border-zinc-900 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-wider text-blue-500 font-mono font-semibold block mb-2">Platform Mockup</span>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Inside the Identity Control Center</h2>
          </div>
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg">
                <span className="text-xs text-zinc-500 block mb-1">CONNECTED DEVICES</span>
                <span className="text-lg font-mono font-bold text-zinc-200">1 Registered Device</span>
                <span className="text-[11px] text-zinc-500 block mt-1">Platform: Win32 (Biometric Authenticator)</span>
              </div>
              <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg">
                <span className="text-xs text-zinc-500 block mb-1">ACTIVE IDENTITY SESSION</span>
                <span className="text-lg font-semibold text-zinc-200">Alice (SeniorAdmin)</span>
                <span className="text-[11px] text-zinc-500 block mt-1">Role-based Access Clearance</span>
              </div>
              <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg">
                <span className="text-xs text-zinc-500 block mb-1">QUEUE STATUS</span>
                <span className="text-lg font-mono font-bold text-zinc-200">0 Pending Action</span>
                <span className="text-[11px] text-zinc-500 block mt-1">All database approvals cleared</span>
              </div>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Verifiable Transaction Log</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-2">Event</th>
                      <th className="py-2">Actor</th>
                      <th className="py-2 font-mono">Previous Block Hash</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300 font-mono">
                    <tr className="border-b border-zinc-900">
                      <td className="py-2">USER_LOGIN</td>
                      <td className="py-2">alice@aegis.local</td>
                      <td className="py-2 text-zinc-500">ed98a7f5b0680ba489c6af9d4272...</td>
                    </tr>
                    <tr className="border-b border-zinc-900">
                      <td className="py-2">APPROVAL_GRANTED</td>
                      <td className="py-2">2 Signature Threshold</td>
                      <td className="py-2 text-zinc-500">2bdcfe51ab51ed01ea8e6ccb1bc0...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer API Section */}
      <section id="developer" className="border-t border-zinc-900 bg-zinc-900/10 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-wider text-blue-500 font-mono font-semibold block mb-2">Developer Integration</span>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Simple API Implementation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-zinc-200">Programmatic Access Request</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Trigger approval requirements directly from your CI/CD pipelines, database migration runs, or server deployments using standard HTTP headers and body.
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The API evaluates our hardcoded policy checks on `resourceName`, notifies eligible roles in real-time, and forces a multi-signature transaction block.
              </p>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed shadow-md">
              <span className="text-zinc-500">// POST /api/approvals/request</span>
              <br />
              <span className="text-blue-400">const</span> res = <span className="text-blue-400">await</span> fetch(<span className="text-green-500">'/api/approvals/request'</span>, &#123;
              <br />
              &nbsp;&nbsp;method: <span className="text-green-500">'POST'</span>,
              <br />
              &nbsp;&nbsp;headers: &#123; <span className="text-green-500">'Content-Type'</span>: <span className="text-green-500">'application/json'</span> &#125;,
              <br />
              &nbsp;&nbsp;body: JSON.stringify(&#123;
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;resourceName: <span className="text-green-500">'Production Database Wipe (PROD-DB-01)'</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;actionPayload: <span className="text-green-500">'DROP DATABASE aegis_prod;'</span>
              <br />
              &nbsp;&nbsp;&#125;)
              <br />
              &#125;);
            </div>
          </div>
        </div>
      </section>

      {/* Security Principles Section */}
      <section id="principles" className="border-t border-zinc-900 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-wider text-blue-500 font-mono font-semibold block mb-2">Security Architecture</span>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Guaranteed Cryptographic Controls</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="border border-zinc-900 bg-zinc-950 p-5 rounded-lg">
              <h4 className="font-semibold text-sm text-zinc-200 mb-2">Zero Shared Secrets</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The server stores only public keys. Private keys remain safely inside the user device secure enclave, eliminating credentials database leak risks.
              </p>
            </div>
            <div className="border border-zinc-900 bg-zinc-950 p-5 rounded-lg">
              <h4 className="font-semibold text-sm text-zinc-200 mb-2">Non-Repudiation</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Because approvals require hardware passkey signatures on the transaction hash, admins cannot dispute actions they have authorized.
              </p>
            </div>
            <div className="border border-zinc-900 bg-zinc-950 p-5 rounded-lg">
              <h4 className="font-semibold text-sm text-zinc-200 mb-2">Verifiable Chain</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Our cryptographic ledger binds every action sequence block. Any attempt to modify database logs will invalidate the block-chain hash.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-zinc-300">Aegis Auth System</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-zinc-600">Built for Tally Code Brewers Hackathon</span>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">GitHub Repository</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
