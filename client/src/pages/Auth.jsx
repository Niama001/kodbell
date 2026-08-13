import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', bio: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.signup(form);
      login(result.user, result.token);
      navigate(result.user.role === 'mentor' ? '/mentor' : '/student');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2>{mode === 'login' ? 'Log in to KodBell' : 'Create your KodBell account'}</h2>
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label>Full name</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} required />

              <label>I am a...</label>
              <select value={form.role} onChange={(e) => update('role', e.target.value)}>
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
              </select>

              <label>Short bio (optional)</label>
              <textarea rows={2} value={form.bio} onChange={(e) => update('bio', e.target.value)} />
            </>
          )}

          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />

          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 14 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </a>
        </p>
      </div>
    </div>
  );
}
