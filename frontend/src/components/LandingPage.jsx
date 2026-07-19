import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Key, Cpu, Server, CheckCircle, Fingerprint, Lock, 
  RefreshCw, Globe, Users, Check, ChevronDown, HelpCircle, 
  ArrowRight, Activity, Terminal, AlertCircle, FileText
} from 'lucide-react';

const LandingPage = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [demoState, setDemoState] = useState('EMAIL_INPUT');
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [verificationCode] = useState(48);
  const [biometricProgress, setBiometricProgress] = useState(0);
  const [faqOpen, setFaqOpen] = useState({});

  // Loop simulation step tracking
  const [simStep, setSimStep] = useState(0);
  const [simEmail, setSimEmail] = useState('');
  const [simFingerprintScan, setSimFingerprintScan] = useState(0);

  // Automatic looped simulation for the hero animation
  useEffect(() => {
    let timer;
    const runAnimationLoop = async () => {
      // Step 0: Idle/Reset
      setSimStep(0);
      setSimEmail('');
      setSimFingerprintScan(0);
      await new Promise(r => setTimeout(r, 1500));

      // Step 1: User requests login (Typing animation)
      setSimStep(1);
      const targetEmail = 'admin@aegis.corp';
      for (let i = 0; i <= targetEmail.length; i++) {
        setSimEmail(targetEmail.substring(0, i));
        await new Promise(r => setTimeout(r, 60));
      }
      await new Promise(r => setTimeout(r, 1000));

      // Step 2: Challenge generated & sent to device
      setSimStep(2);
      await new Promise(r => setTimeout(r, 2000));

      // Step 3: Biometric verification (Scan progress)
      setSimStep(3);
      for (let p = 0; p <= 100; p += 5) {
        setSimFingerprintScan(p);
        await new Promise(r => setTimeout(r, 50));
      }
      await new Promise(r => setTimeout(r, 1000));

      // Step 4: Challenge signed securely in Enclave
      setSimStep(4);
      await new Promise(r => setTimeout(r, 1800));

      // Step 5: Verification handshake on server
      setSimStep(5);
      await new Promise(r => setTimeout(r, 1800));

      // Step 6: Identity Verified ✓
      setSimStep(6);
      await new Promise(r => setTimeout(r, 2200));

      // Loop again
      runAnimationLoop();
    };

    runAnimationLoop();

    return () => clearTimeout(timer);
  }, []);

  // Sandbox demo logic
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setDemoState('NUMBER_MATCH');
  };

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
        return prev + 5;
      });
    }, 70);

    return () => clearInterval(interval);
  }, [demoState]);

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Mock statistics gestural chart coordinates
  const chartPoints = [
    { x: 10, y: 80 },
    { x: 25, y: 75 },
    { x: 40, y: 85 },
    { x: 55, y: 40 },
    { x: 70, y: 30 },
    { x: 85, y: 15 },
    { x: 100, y: 5 }
  ];

  return (
    <div className="min-h-screen bg-white text-ink-black font-sans selection:bg-[#fbe1d1] selection:text-[#5d2a1a] grid-mesh relative">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ececec]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-serif tracking-tight select-none">
              Aegis
            </span>
            <span className="text-xs bg-mist-gray text-slate-gray px-2 py-0.5 rounded-full font-mono font-medium">
              Enterprise v1.0.0
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#technologies" className="text-sm font-medium text-slate-gray hover:text-ink-black transition-colors">Stack</a>
            <a href="#why-passkeys" className="text-sm font-medium text-slate-gray hover:text-ink-black transition-colors">Security</a>
            <a href="#features" className="text-sm font-medium text-slate-gray hover:text-ink-black transition-colors">Features</a>
            <a href="#interactive-demo" className="text-sm font-medium text-slate-gray hover:text-ink-black transition-colors">Sandbox</a>
            <a href="#faq" className="text-sm font-medium text-slate-gray hover:text-ink-black transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('login')}
              className="text-sm font-medium text-ink-black hover:underline cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => onNavigate('register')}
              className="btn-primary"
            >
              Deploy Aegis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-[1200px] mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Heading & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <span className="text-sm font-medium tracking-normal text-slate-gray mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-ink-black" />
            PASSWORDLESS ACCESS ORCHESTRATOR
          </span>
          
          <h1 className="text-5xl sm:text-7xl font-serif tracking-tight leading-[1.05] text-ink-black">
            The next generation <br />
            of <span className="italic font-serif">trusted identity</span>.
          </h1>
          
          <p className="text-slate-gray text-lg sm:text-xl mt-6 leading-relaxed max-w-xl">
            Aegis eliminates password vulnerabilities by deploying hardware-bound passkeys, SSE active session bindings, and a tamper-evident audit ledger built to enforce high-assurance enterprise security guidelines.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <button 
              onClick={() => onNavigate('register')}
              className="btn-primary"
            >
              Deploy Aegis Device
            </button>
            <button 
              onClick={() => onNavigate('login')}
              className="btn-secondary"
            >
              Access Gateways →
            </button>
          </div>
        </div>

        {/* Right Column: Looping Interactive Simulation Card */}
        <div className="lg:col-span-5 flex justify-center items-center w-full">
          <div className="floating-artifact w-full max-w-[420px] aspect-[4/5] p-6 flex flex-col justify-between overflow-hidden relative border border-[#ececec]">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[#ececec] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-semibold text-ink-black tracking-wider uppercase">SIMULATED-AUTH-PIPELINE</span>
              </div>
              <span className="text-[10px] font-mono text-slate-gray">Live Loop</span>
            </div>

            {/* Loop Steps Display */}
            <div className="flex-1 flex flex-col justify-center py-4">
              <AnimatePresence mode="wait">
                
                {/* STEP 0: Idle */}
                {simStep === 0 && (
                  <motion.div 
                    key="step0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#f2f2f3] flex items-center justify-center mx-auto">
                      <RefreshCw className="w-8 h-8 text-slate-gray animate-spin-slow" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-ink-black">Awaiting Login Request</h4>
                      <p className="text-xs text-slate-gray mt-1">Starting automatic cryptographical simulation...</p>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: Typing Email */}
                {simStep === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-gray">Step 1 / 6</span>
                      <h4 className="font-semibold text-base text-ink-black">User Initiates Verification</h4>
                    </div>
                    <div className="p-4 bg-mist-gray rounded-xl border border-transparent">
                      <label className="text-[10px] font-mono text-slate-gray block mb-1">IDENTIFIER</label>
                      <div className="font-mono text-sm text-ink-black bg-white px-3 py-2 rounded border border-[#ececec] min-h-[38px] flex items-center">
                        {simEmail}
                        <span className="w-1.5 h-4 bg-ink-black ml-1 animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Challenge Sent */}
                {simStep === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center space-y-6"
                  >
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-gray">Step 2 / 6</span>
                      <h4 className="font-semibold text-base text-ink-black">Challenge Dispatch</h4>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 bg-mist-gray rounded-2xl relative">
                      <Server className="w-8 h-8 text-ink-black" />
                      
                      {/* Floating Packet Animation */}
                      <motion.div 
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 100, opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-3 h-3 rounded-full bg-ink-black shadow-[0_0_8px_rgba(23,25,28,0.5)] absolute left-[25%]"
                      />
                      
                      <Cpu className="w-8 h-8 text-ink-black" />
                    </div>
                    <p className="text-xs text-slate-gray">
                      Cryptographic challenge generated and sent to hardware device.
                    </p>
                  </motion.div>
                )}

                {/* STEP 3: Biometric Fingerprint Scan */}
                {simStep === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center space-y-4"
                  >
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-gray">Step 3 / 6</span>
                      <h4 className="font-semibold text-base text-ink-black">Biometric Consent Signature</h4>
                    </div>
                    
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center rounded-full bg-mist-gray overflow-hidden border border-[#ececec]">
                      {/* Scan Laser */}
                      <div 
                        className="absolute left-0 right-0 h-[2px] bg-ink-black"
                        style={{ top: `${simFingerprintScan}%`, transition: 'top 0.05s linear' }}
                      />
                      <Fingerprint className="w-12 h-12 text-ink-black/60" />
                    </div>
                    <span className="text-xs font-mono text-slate-gray">{simFingerprintScan}% Secure Scanning</span>
                  </motion.div>
                )}

                {/* STEP 4: Enclave Signature */}
                {simStep === 4 && (
                  <motion.div 
                    key="step4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center space-y-4"
                  >
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-gray">Step 4 / 6</span>
                      <h4 className="font-semibold text-base text-ink-black">Cryptographic Signature Sealed</h4>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-mist-gray flex items-center justify-center mx-auto">
                      <Lock className="w-8 h-8 text-ink-black" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-slate-gray break-all bg-mist-gray p-2 rounded">
                        sig_7b29a1ff02a...
                      </p>
                      <p className="text-[10px] text-slate-gray">
                        Signed inside TPM secure enclave with user's private key.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Verification Handshake */}
                {simStep === 5 && (
                  <motion.div 
                    key="step5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center space-y-4"
                  >
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-gray">Step 5 / 6</span>
                      <h4 className="font-semibold text-base text-ink-black">Signature Verification</h4>
                    </div>
                    <div className="flex justify-center items-center gap-6">
                      <Cpu className="w-8 h-8 text-slate-gray" />
                      <div className="w-20 bg-mist-gray h-2.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.5 }}
                          className="h-full bg-ink-black"
                        />
                      </div>
                      <Server className="w-8 h-8 text-ink-black" />
                    </div>
                    <p className="text-xs text-slate-gray">Comparing signature against stored public key...</p>
                  </motion.div>
                )}

                {/* STEP 6: Verified */}
                {simStep === 6 && (
                  <motion.div 
                    key="step6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center space-y-4"
                  >
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-gray">Step 6 / 6</span>
                      <h4 className="font-semibold text-base text-ink-black">Access Granted</h4>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase text-emerald-600 bg-emerald-100/50 px-3 py-1 rounded-full">
                        Secure Session Initialized
                      </span>
                      <p className="text-xs text-slate-gray mt-2 font-mono">Token cookie bound to device trust</p>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-[#ececec] pt-3 flex justify-between items-center text-[10px] font-mono text-slate-gray">
              <span>FIDO2 / WEBAUTHN STANDARD</span>
              <span>SECURE LEVEL 4</span>
            </div>

          </div>
        </div>

      </header>

      {/* Trusted Stack Technologies */}
      <section id="technologies" className="bg-fog-white border-y border-[#ececec] py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="text-sm font-medium text-slate-gray uppercase tracking-wider">
            Built on Industry Standard Cryptography
          </p>
          <div className="flex flex-wrap items-center gap-8 md:gap-12 text-slate-gray">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-ink-black" />
              <span className="text-sm font-semibold text-ink-black tracking-tight">FIDO2 Passkeys</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-ink-black" />
              <span className="text-sm font-semibold text-ink-black tracking-tight">WebAuthn API</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-ink-black" />
              <span className="text-sm font-semibold text-ink-black tracking-tight">M-of-N Cryptographic Gates</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-ink-black" />
              <span className="text-sm font-semibold text-ink-black tracking-tight">SSE Real-Time Handshake</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Passwords Fail Section */}
      <section id="why-passkeys" className="max-w-[1200px] mx-auto px-6 py-24 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-xs font-semibold text-slate-gray uppercase tracking-wider">The Security Gap</span>
          <h2 className="text-4xl sm:text-5xl font-serif text-ink-black">Why standard passwords fail the modern enterprise</h2>
          <p className="text-slate-gray text-base">Passwords introduce phishing vectors, credential stuffing risk, and fatigue attacks. Here is how Aegis completely resets the security perimeter.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-8 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-semibold text-ink-black">Legacy Authentication Risks</h3>
            <ul className="space-y-2 text-sm text-slate-gray">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                Vulnerable to phishing proxies and social engineering.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                MFA fatigue attacks wear down administrators.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                Centralized database compromises leak password hashes.
              </li>
            </ul>
          </div>

          <div className="accent-peach-card p-8 space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#fafafb]/20 flex items-center justify-center text-sienna-brown">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-semibold text-sienna-brown">Aegis Enclave Security</h3>
            <ul className="space-y-2 text-sm text-sienna-brown/85">
              <li className="flex items-start gap-2">
                <span className="text-sienna-brown font-bold">•</span>
                Phishing-resistant bindings tied to unique domain origins.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sienna-brown font-bold">•</span>
                M-of-N consensus gates prevent single-admin hijack risks.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sienna-brown font-bold">•</span>
                No shared secret stored on the server — only public keys.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Features Cards */}
      <section id="features" className="bg-fog-white border-y border-[#ececec] py-24">
        <div className="max-w-[1200px] mx-auto px-6 space-y-16">
          <div className="text-left space-y-4">
            <span className="text-xs font-semibold text-slate-gray uppercase tracking-wider">Features</span>
            <h2 className="text-4xl sm:text-5xl font-serif text-ink-black">Designed for High-Assurance Environments</h2>
            <p className="text-slate-gray text-base max-w-xl">Every security feature is cryptographically enforced and recorded in our tamper-evident audit ledger.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-3xl border border-[#ececec] flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
              <div className="space-y-4">
                <Fingerprint className="w-8 h-8 text-ink-black" />
                <h3 className="text-lg font-semibold text-ink-black">FIDO2 Passkeys</h3>
                <p className="text-sm text-slate-gray leading-relaxed">Leverage hardware-bound cryptographic credentials stored directly in your device’s secure enclave.</p>
              </div>
              <span className="text-xs text-slate-gray uppercase font-mono mt-6 block">SECURE ENCLAVE BOUND</span>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-3xl border border-[#ececec] flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
              <div className="space-y-4">
                <Users className="w-8 h-8 text-ink-black" />
                <h3 className="text-lg font-semibold text-ink-black">M-of-N Cryptographic Gating</h3>
                <p className="text-sm text-slate-gray leading-relaxed">Require consensus authorization from multiple administrators before executing high-risk, sensitive workspace actions.</p>
              </div>
              <span className="text-xs text-slate-gray uppercase font-mono mt-6 block">CONSENSUS ARCHITECTURE</span>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-3xl border border-[#ececec] flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
              <div className="space-y-4">
                <Activity className="w-8 h-8 text-ink-black" />
                <h3 className="text-lg font-semibold text-ink-black">Real-time Handshakes</h3>
                <p className="text-sm text-slate-gray leading-relaxed">Enforce dynamic session verification challenges through a secure Server-Sent Events pipeline.</p>
              </div>
              <span className="text-xs text-slate-gray uppercase font-mono mt-6 block">SSE STREAM ACTIVE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture - Accent Peach Card Section */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="accent-peach-card p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl space-y-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-sienna-brown/80 font-mono">Architectural Restraint</span>
            <h2 className="text-3xl sm:text-4xl font-serif text-sienna-brown leading-tight">
              "We have eliminated passwords entirely. There are no static credentials left to steal."
            </h2>
            <p className="text-sm text-sienna-brown/80">
              Aegis enforces origin verification on every handshake. This prevents credential hijacking, man-in-the-middle replay vectors, and phishing links. By pairing passkeys with M-of-N signing pools, workspace integrity is mathematically guaranteed.
            </p>
          </div>
          <div className="w-full md:w-auto flex justify-center">
            <div className="bg-white p-6 rounded-2xl border border-sienna-brown/10 w-full max-w-[280px] shadow-lg text-left">
              <div className="flex items-center gap-2 text-sienna-brown mb-4">
                <Lock className="w-5 h-5" />
                <span className="text-xs font-mono font-bold">DEVICE ENCLAVE SEAL</span>
              </div>
              <div className="space-y-2 text-xs font-mono text-[#5d2a1a]/70">
                <div className="flex justify-between border-b border-[#5d2a1a]/10 pb-1">
                  <span>RP_ID</span>
                  <span>localhost</span>
                </div>
                <div className="flex justify-between border-b border-[#5d2a1a]/10 pb-1">
                  <span>ATTESTATION</span>
                  <span>NONE</span>
                </div>
                <div className="flex justify-between border-b border-[#5d2a1a]/10 pb-1">
                  <span>USER_VERIFICATION</span>
                  <span>PREFERRED</span>
                </div>
                <div className="flex justify-between">
                  <span>RESIDENT_KEY</span>
                  <span>PREFERRED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section with gestural line chart */}
      <section className="bg-fog-white border-y border-[#ececec] py-24">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-semibold text-slate-gray uppercase tracking-wider">Metrics</span>
            <h2 className="text-4xl sm:text-5xl font-serif text-ink-black">Quantifiably Faster and More Secure</h2>
            <p className="text-slate-gray text-base leading-relaxed">
              Replacing standard credentials speeds up authentication loops while reducing human-error vectors. No typing, no code lookup, just pure hardware verification.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-1">
                <h3 className="text-3xl font-serif font-bold text-ink-black">0%</h3>
                <p className="text-xs text-slate-gray">PHISHING VULNERABILITY VECTORS</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-serif font-bold text-ink-black">1.2s</h3>
                <p className="text-xs text-slate-gray">AVERAGE LOGIN VERIFICATION TIME</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="floating-artifact p-6 w-full max-w-[380px] space-y-6 border border-[#ececec]">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold text-ink-black">Verification Performance</h4>
                  <span className="text-[10px] text-slate-gray">Handshakes Completed / Second</span>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">↑ 4.2x vs Last Month</span>
              </div>
              
              {/* Gestural Line Chart */}
              <div className="h-32 w-full relative flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Chart Line */}
                  <path 
                    d={`M ${chartPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                    fill="none" 
                    stroke="#17191c" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                  {/* Subtle Gradient fill under line */}
                  <path 
                    d={`M 10 100 L ${chartPoints.map(p => `${p.x} ${p.y}`).join(' L ')} L 100 100 Z`}
                    fill="rgba(23, 25, 28, 0.03)"
                  />
                </svg>
              </div>
              
              <div className="flex justify-between text-[9px] font-mono text-slate-gray">
                <span>AUG 01</span>
                <span>SEP 15</span>
                <span>OCT 30</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Authentication Sandbox Demo */}
      <section id="interactive-demo" className="max-w-[1200px] mx-auto px-6 py-24 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-xs font-semibold text-slate-gray uppercase tracking-wider">Interactive Playground</span>
          <h2 className="text-4xl sm:text-5xl font-serif text-ink-black">Test the Passkey Handshake Loop</h2>
          <p className="text-slate-gray text-base">Type an email below to simulate a hardware authentication challenge, verification, and session binding.</p>
        </div>

        <div className="flex justify-center">
          <div className="floating-artifact w-full max-w-[480px] p-8 border border-[#ececec] relative">
            <div className="flex justify-between items-center border-b border-[#ececec] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-ink-black" />
                <span className="text-xs font-mono font-semibold text-ink-black">SANDBOX CLIENT GATEWAY</span>
              </div>
              <span className="text-[10px] font-mono text-slate-gray">Sandbox Ready</span>
            </div>

            <AnimatePresence mode="wait">
              {/* SANDBOX STATE 1: EMAIL INPUT */}
              {demoState === 'EMAIL_INPUT' && (
                <motion.form 
                  key="form-email"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleEmailSubmit} 
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-slate-gray block uppercase">Enter Email to register mock passkey</label>
                    <input
                      type="email"
                      placeholder="e.g. pilot@aegis.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-[#ececec] rounded-xl text-ink-black placeholder:text-slate-gray text-sm focus:outline-none focus:border-ink-black transition-colors"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-ink-black text-white font-semibold text-sm rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all cursor-pointer shadow-md"
                  >
                    Simulate Handshake
                  </button>
                </motion.form>
              )}

              {/* SANDBOX STATE 2: NUMBER MATCHING */}
              {demoState === 'NUMBER_MATCH' && (
                <motion.div 
                  key="form-number"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 text-center"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-ink-black">Select Intent Number</h3>
                    <p className="text-xs text-slate-gray mt-1">Tap the verification code displayed on your device screen.</p>
                  </div>
                  
                  <div className="py-6 px-10 bg-mist-gray rounded-2xl inline-block border border-[#ececec]">
                    <span className="text-5xl font-semibold tracking-widest text-ink-black font-mono">
                      {verificationCode}
                    </span>
                  </div>

                  <div className="w-full max-w-[260px] mx-auto bg-[#fafafb] border border-[#ececec] rounded-2xl p-4 mt-2">
                    <p className="text-[10px] font-mono text-slate-gray uppercase tracking-widest mb-3">Mock Mobile Prompt</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[24, 48, 92].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleNumberSelect(num)}
                          className={`py-3 text-sm font-semibold font-mono rounded-xl border transition-all cursor-pointer ${
                            selectedNumber === num
                              ? num === verificationCode
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600'
                                : 'bg-rose-500/20 border-rose-500 text-rose-600'
                              : 'bg-white border-[#ececec] text-ink-black hover:bg-mist-gray'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SANDBOX STATE 3: BIOMETRIC SCAN */}
              {demoState === 'BIOMETRIC_SCAN' && (
                <motion.div 
                  key="form-biometric"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 text-center"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-ink-black">Touch ID / Biometric Challenge</h3>
                    <p className="text-xs text-slate-gray mt-1">Acquiring cryptographic assertion signature via secure chip.</p>
                  </div>

                  <div className="relative w-28 h-28 mx-auto flex items-center justify-center rounded-full bg-mist-gray border border-[#ececec] overflow-hidden">
                    <div 
                      className="absolute left-0 right-0 h-[2px] bg-ink-black shadow-[0_0_8px_rgba(23,25,28,0.5)]"
                      style={{
                        top: `${biometricProgress}%`,
                        transition: 'top 0.08s linear'
                      }}
                    />
                    <Fingerprint className="w-14 h-14 text-ink-black/50" />
                  </div>

                  <div className="text-xs font-mono text-ink-black">{biometricProgress}% Verified</div>
                </motion.div>
              )}

              {/* SANDBOX STATE 4: AUTHORIZED */}
              {demoState === 'AUTHORIZED' && (
                <motion.div 
                  key="form-auth"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-800">Workspace Authorized</h4>
                      <p className="text-[11px] text-emerald-600">Active session token set for {email}</p>
                    </div>
                  </div>

                  <button 
                    onClick={resetDemo}
                    className="w-full py-3 bg-mist-gray text-ink-black font-semibold text-sm rounded-xl hover:bg-[#e4e4e7] transition-all cursor-pointer"
                  >
                    Reset Sandbox Loop
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="bg-fog-white border-y border-[#ececec] py-24">
        <div className="max-w-[800px] mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs font-semibold text-slate-gray uppercase tracking-wider">FAQ</span>
            <h2 className="text-4xl font-serif text-ink-black">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is a hardware-bound passkey?",
                a: "A hardware-bound passkey is a cryptographic credential where the private key is generated and stored directly within your device's physical secure enclave (like a TPM or Secure Enclave). The private key never leaves the device, making it immune to remote interception and copy attacks."
              },
              {
                q: "How does the M-of-N Gating work in Aegis?",
                a: "Aegis allows you to define consensus thresholds for high-risk operations. For example, a database purge requires co-signing from 2 out of 3 administrators. The action remains locked until the SSE channel receives secure WebAuthn signatures from the required number of unique, approved keys."
              },
              {
                q: "Can this prevent session hijacking?",
                a: "Yes. By binding the session handshake to the specific origin domain and device security parameters, attackers cannot replicate cookies or steal credentials to log in from a non-trusted device."
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left font-semibold text-ink-black flex justify-between items-center cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-gray transition-transform ${faqOpen[idx] ? 'transform rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {faqOpen[idx] && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-sm text-slate-gray leading-relaxed border-t border-[#ececec]/50 pt-4">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 text-center space-y-8">
        <h2 className="text-4xl sm:text-6xl font-serif text-ink-black leading-tight">
          Secure your workspace <br />
          with <span className="italic font-serif">Aegis trust bindings</span>.
        </h2>
        <p className="text-slate-gray text-base max-w-xl mx-auto">
          Deploy biometric identity access on your local networks today and eliminate password vulnerabilities forever.
        </p>
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => onNavigate('register')}
            className="btn-primary"
          >
            Get Started
          </button>
          <button 
            onClick={() => onNavigate('login')}
            className="btn-secondary"
          >
            Access Gateways
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ececec] py-12 bg-fog-white">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif text-ink-black">Aegis</span>
            <span className="text-[10px] text-slate-gray font-mono">© 2026. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-xs text-slate-gray font-medium">
            <a href="#" className="hover:text-ink-black">Privacy Policy</a>
            <a href="#" className="hover:text-ink-black">Terms of Service</a>
            <a href="#" className="hover:text-ink-black">Security Guidelines</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
