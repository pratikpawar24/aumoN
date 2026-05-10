import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Leaf, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Spinner } from '../Common/Loading';

const Login = () => {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      const role = data?.user?.role;
      if (role === 'admin_master' || role === 'admin_secondary') {
        navigate('/admin');
      } else {
        navigate('/map');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen aumo-bg-page flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 w-full max-w-md border aumo-border animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center
                          mx-auto mb-4 shadow-green-glow">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold aumo-text-primary">Welcome back</h1>
          <p className="aumo-text-subtle text-sm mt-1">Sign in to AUMO</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30
                          rounded-xl text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                className="w-full pl-10 pr-4 py-3 min-h-[44px] aumo-bg-input aumo-text-primary
                           rounded-xl border aumo-border placeholder:aumo-text-subtle text-sm
                           focus:border-primary-500/50 focus:outline-none focus:ring-1
                           focus:ring-primary-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
              <input
                type={showPwd ? 'text' : 'password'} required
                value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-12 py-3 min-h-[44px] aumo-bg-input aumo-text-primary
                           rounded-xl border aumo-border placeholder:aumo-text-subtle text-sm
                           focus:border-primary-500/50 focus:outline-none transition-all"
              />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 aumo-text-subtle
                                 hover:aumo-text-primary transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 min-h-[48px] bg-primary-500 hover:bg-primary-600
                       disabled:opacity-50 text-white font-semibold rounded-xl
                       transition-all flex items-center justify-center gap-2
                       shadow-lg shadow-primary-500/25 mt-2"
          >
            {loading ? <><Spinner size="sm" color="white" />Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm aumo-text-subtle mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
