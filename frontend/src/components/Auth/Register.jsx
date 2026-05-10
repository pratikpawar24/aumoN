import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Leaf, Eye, EyeOff, User, Mail, Lock, Phone } from 'lucide-react';
import { VEHICLE_TYPES } from '../../utils/constants';
import { Spinner } from '../Common/Loading';

const MOBILE_RE = /^(\+?\d{1,3}[\s-]?)?\d{10}$/;

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', password: '', confirmPassword: '', vehicleType: 'car',
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
    if (form.mobile && !MOBILE_RE.test(form.mobile.trim())) {
      setError('Mobile must be a valid 10-digit number');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        mobile: form.mobile.trim(),
        password: form.password,
        vehicleType: form.vehicleType,
      });
      navigate('/verify-email');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen aumo-bg-page flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 w-full max-w-md border aumo-border animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center
                          mx-auto mb-4 shadow-green-glow">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold aumo-text-primary">Join AUMO</h1>
          <p className="aumo-text-subtle text-sm mt-1">Start your green journey</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30
                          rounded-xl text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-1.5 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
              <input type="text" required minLength={2}
                     value={form.name} onChange={e => set('name', e.target.value)}
                     placeholder="Your name"
                     autoComplete="name"
                     className="w-full pl-10 pr-4 py-3 min-h-[44px] glass rounded-xl border aumo-border
                                aumo-text-primary placeholder:aumo-text-subtle text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
              <input type="email" required
                     value={form.email} onChange={e => set('email', e.target.value)}
                     placeholder="you@example.com"
                     autoComplete="email"
                     inputMode="email"
                     className="w-full pl-10 pr-4 py-3 min-h-[44px] glass rounded-xl border aumo-border
                                aumo-text-primary placeholder:aumo-text-subtle text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-1.5 block">
              Mobile <span className="aumo-text-subtle">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
              <input type="tel"
                     value={form.mobile} onChange={e => set('mobile', e.target.value)}
                     placeholder="+91 9876543210"
                     autoComplete="tel"
                     inputMode="tel"
                     className="w-full pl-10 pr-4 py-3 min-h-[44px] glass rounded-xl border aumo-border
                                aumo-text-primary placeholder:aumo-text-subtle text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
              <input type={showPwd ? 'text' : 'password'} required minLength={6}
                     value={form.password} onChange={e => set('password', e.target.value)}
                     placeholder="Min. 6 characters"
                     autoComplete="new-password"
                     className="w-full pl-10 pr-12 py-3 min-h-[44px] glass rounded-xl border aumo-border
                                aumo-text-primary placeholder:aumo-text-subtle text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 aumo-text-subtle
                                 hover:aumo-text-primary transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-1.5 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
              <input type={showPwd ? 'text' : 'password'} required
                     value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                     placeholder="Repeat password"
                     autoComplete="new-password"
                     className="w-full pl-10 pr-4 py-3 min-h-[44px] glass rounded-xl border aumo-border
                                aumo-text-primary placeholder:aumo-text-subtle text-sm
                                focus:border-primary-500/50 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Vehicle type */}
          <div>
            <label className="text-xs font-medium aumo-text-subtle mb-2 block">
              Primary Vehicle (for emission tracking)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {VEHICLE_TYPES.map(v => (
                <button key={v.value} type="button"
                        onClick={() => set('vehicleType', v.value)}
                        className={`flex flex-col items-center justify-center min-h-[60px] py-2 px-1 rounded-xl
                                    border text-xs transition-all
                                    ${form.vehicleType === v.value
                                      ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                      : 'glass aumo-border aumo-text-subtle'}`}>
                  <span className="text-base mb-0.5">{v.icon}</span>
                  {v.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
                  className="w-full py-3.5 min-h-[48px] bg-primary-500 hover:bg-primary-600
                             disabled:opacity-50 text-white font-semibold rounded-xl
                             transition-all flex items-center justify-center gap-2
                             shadow-lg shadow-primary-500/25 mt-2">
            {loading ? <><Spinner size="sm" color="white" />Creating account...</> : '🌿 Create Account'}
          </button>
        </form>

        <p className="text-center text-sm aumo-text-subtle mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
