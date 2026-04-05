import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Leaf, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { VEHICLE_TYPES } from '../../utils/constants';
import { Spinner } from '../Common/Loading';

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', vehicleType: 'car',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.vehicleType);
      navigate('/map');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-md border border-white/10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center
                          mx-auto mb-4 shadow-green-glow">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join AUMO</h1>
          <p className="text-slate-400 text-sm mt-1">Start your green journey</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30
                          rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" required minLength={2}
                     value={form.name} onChange={e => set('name', e.target.value)}
                     placeholder="Your name"
                     className="w-full pl-10 pr-4 py-3 glass rounded-xl border border-white/10
                                text-white placeholder-slate-500 text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" required
                     value={form.email} onChange={e => set('email', e.target.value)}
                     placeholder="you@example.com"
                     className="w-full pl-10 pr-4 py-3 glass rounded-xl border border-white/10
                                text-white placeholder-slate-500 text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPwd ? 'text' : 'password'} required minLength={6}
                     value={form.password} onChange={e => set('password', e.target.value)}
                     placeholder="Min. 6 characters"
                     className="w-full pl-10 pr-10 py-3 glass rounded-xl border border-white/10
                                text-white placeholder-slate-500 text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                                 hover:text-white transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPwd ? 'text' : 'password'} required
                     value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                     placeholder="Repeat password"
                     className="w-full pl-10 pr-4 py-3 glass rounded-xl border border-white/10
                                text-white placeholder-slate-500 text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Vehicle type */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">
              Primary Vehicle (for emission tracking)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {VEHICLE_TYPES.map(v => (
                <button key={v.value} type="button"
                        onClick={() => set('vehicleType', v.value)}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl
                                    border text-xs transition-all
                                    ${form.vehicleType === v.value
                                      ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                      : 'glass border-white/10 text-slate-400'}`}>
                  <span className="text-base mb-0.5">{v.icon}</span>
                  {v.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-primary-500 hover:bg-primary-600
                             disabled:opacity-50 text-white font-semibold rounded-xl
                             transition-all flex items-center justify-center gap-2
                             shadow-lg shadow-primary-500/25 mt-2">
            {loading ? <><Spinner size="sm" color="white" />Creating account...</> : '🌿 Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;