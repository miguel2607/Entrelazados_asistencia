import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const ok = await login(username, password);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setLoading(false);
      setError('Usuario o contraseña incorrectos');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f7ff 0%, #ede9fe 50%, #e0f2fe 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", "Outfit", system-ui, sans-serif',
      padding: '16px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap');

        @keyframes card-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-card {
          animation: card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .pl-input {
          width: 100%;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 44px 12px 40px;
          font-size: 14px;
          font-family: inherit;
          color: #111827;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .pl-input::placeholder { color: #9ca3af; }
        .pl-input:focus {
          border-color: #2d1b69;
          box-shadow: 0 0 0 3px rgba(45, 27, 105, 0.1);
        }

        .pl-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          letter-spacing: 0.2px;
          cursor: pointer;
          background: linear-gradient(135deg, #2d1b69, #4c1d95);
          color: #fff;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(45, 27, 105, 0.35);
        }
        .pl-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(45, 27, 105, 0.4);
        }
        .pl-btn:active:not(:disabled) { transform: translateY(0); opacity: 1; }
        .pl-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      {/* Subtle background blobs */}
      <div style={{
        position: 'fixed', top: '-80px', right: '-80px', width: '320px', height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(45,27,105,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-80px', left: '-80px', width: '320px', height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px 36px 36px',
          boxShadow: '0 8px 40px rgba(45,27,105,0.12), 0 1px 3px rgba(0,0,0,0.06)',
          opacity: mounted ? 1 : 0,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #2d1b69, #4c1d95)',
            marginBottom: '14px',
            boxShadow: '0 4px 14px rgba(45,27,105,0.3)',
          }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: '#fff' }}>P</span>
          </div>

          <h1 style={{
            margin: 0,
            fontFamily: '"Outfit", "Inter", sans-serif',
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '-0.3px',
            color: '#2d1b69',
          }}>
            Playroom
          </h1>
          <p style={{
            margin: '4px 0 0',
            fontSize: '13px',
            color: '#6b7280',
            fontWeight: '400',
          }}>
            Inicia sesión para continuar
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f3f4f6', marginBottom: '24px' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', fontSize: '12.5px', fontWeight: '600',
              color: '#374151', marginBottom: '6px',
            }}>
              Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                color: '#9ca3af', display: 'flex',
              }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                id="login-username"
                type="text"
                className="pl-input"
                placeholder="Tu nombre de usuario"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '12.5px', fontWeight: '600',
              color: '#374151', marginBottom: '6px',
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                color: '#9ca3af', display: 'flex',
              }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="pl-input"
                placeholder="Tu contraseña"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                  color: showPass ? '#2d1b69' : '#9ca3af',
                  display: 'flex', transition: 'color 0.15s',
                }}
              >
                {showPass ? (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '18px',
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#ef4444" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="pl-btn" disabled={loading} id="login-submit">
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Verificando...
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px', marginBottom: 0,
          fontSize: '11px', color: '#d1d5db',
        }}>
          © {new Date().getFullYear()} Playroom · Sistema de Gestión
        </p>
      </div>
    </div>
  );
}
