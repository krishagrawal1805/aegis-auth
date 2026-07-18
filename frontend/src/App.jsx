import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';

function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('landing'); // 'landing' | 'login' | 'register'

  const [wasLoggedIn, setWasLoggedIn] = useState(false);

  useEffect(() => {
    if (user) {
      setWasLoggedIn(true);
    } else if (wasLoggedIn) {
      setView('landing');
      setWasLoggedIn(false);
    }
  }, [user, wasLoggedIn]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2 style={{ color: 'var(--primary-glow)' }}>Initializing Aegis Secure Core...</h2>
      </div>
    );
  }

  // If authenticated, always show the Dashboard/Authenticator view
  if (user) {
    return <Dashboard />;
  }

  // Unauthenticated routing
  if (view === 'landing') {
    return <LandingPage onNavigate={setView} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      {view === 'login' ? (
        <Login onNavigate={() => setView('register')} onBackToHome={() => setView('landing')} />
      ) : (
        <Register onNavigate={() => setView('login')} onBackToHome={() => setView('landing')} />
      )}
    </div>
  );
}

export default App;
