import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('admin@amc.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('amc_token', res.data.token);
      localStorage.setItem('amc_user', JSON.stringify(res.data.user));
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 32 }}>🏢</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>AMC Manager</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Villa Service Portal</div>
        </div>
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: '1.25rem' }}>Sign in</h2>
          <form onSubmit={login}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '9px' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-3)' }}>
            <strong>Demo:</strong> admin@amc.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
}
