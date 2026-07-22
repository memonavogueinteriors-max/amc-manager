import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      localStorage.setItem('amc_token', response.data.token);
      localStorage.setItem(
        'amc_user',
        JSON.stringify(response.data.user)
      );

      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)'
      }}
    >
      <div style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="VAC Logo"
            style={{ width: 180, objectFit: 'contain', marginBottom: 8 }}
          />

          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>
            VAC AMC Management
          </div>

          <div
            style={{
              fontSize: 13,
              color: 'var(--text-3)',
              marginTop: 4
            }}
          >
            Service Portal
          </div>
        </div>

        <div className="card">
          <h2
            style={{
              fontSize: 16,
              fontWeight: 500,
              marginBottom: '1.25rem'
            }}
          >
            Sign in
          </h2>

          <form onSubmit={login}>
            <div className="form-group">
              <label className="form-label">Email</label>

              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>

              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div
                style={{
                  color: 'var(--red)',
                  fontSize: 13,
                  marginBottom: 12
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '9px'
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}