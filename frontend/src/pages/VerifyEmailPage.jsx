import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { Spinner } from '../components/Common/Loading';
import toast from 'react-hot-toast';

const RESEND_COOLDOWN_S = 60;

const VerifyEmailPage = () => {
  const { user, sendVerificationEmail, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const inputsRef = useRef([]);

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentOnce, setSentOnce] = useState(false);

  // Tick down resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-send on first mount if not yet verified
  useEffect(() => {
    if (!user || user.emailVerified || sentOnce) return;
    setSentOnce(true);
    sendVerificationEmail()
      .then((res) => {
        if (res?.alreadyVerified) return;
        setCooldown(RESEND_COOLDOWN_S);
        if (res?.devFallback) {
          toast('Dev mode: check your backend console for the OTP', { icon: '🛠️', duration: 6000 });
        } else {
          toast.success('Verification code sent to your email');
        }
      })
      .catch((err) => {
        const wait = err.response?.data?.retryAfter;
        if (wait) setCooldown(wait);
      });
  }, [user, sentOnce, sendVerificationEmail]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to="/carpool" replace />;

  const otp = digits.join('');

  const handleDigit = (i, v) => {
    const cleaned = v.replace(/\D/g, '').slice(0, 1);
    setDigits((d) => {
      const next = [...d];
      next[i] = cleaned;
      return next;
    });
    if (cleaned && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('').concat(['', '', '', '', '', '']).slice(0, 6);
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      await verifyEmail(otp);
      toast.success('Email verified! 🌿');
      navigate('/carpool');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const res = await sendVerificationEmail();
      setCooldown(RESEND_COOLDOWN_S);
      if (res?.devFallback) {
        toast('Dev mode: check your backend console for the OTP', { icon: '🛠️' });
      } else {
        toast.success('New code sent');
      }
    } catch (err) {
      const wait = err.response?.data?.retryAfter;
      if (wait) setCooldown(wait);
      toast.error(err.response?.data?.message || 'Could not send code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen aumo-bg-page flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 w-full max-w-md border aumo-border animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center
                          mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold aumo-text-primary">Verify your email</h1>
          <p className="aumo-text-subtle text-sm mt-1 break-all">
            Code sent to <span className="text-primary-500">{user.email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
                className="w-full h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold
                           aumo-text-primary glass rounded-xl border aumo-border
                           focus:border-primary-500/50 focus:outline-none
                           focus:ring-1 focus:ring-primary-500/30"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={otp.length !== 6 || verifying}
            className="w-full py-3.5 min-h-[48px] bg-primary-500 hover:bg-primary-600
                       disabled:opacity-50 text-white font-semibold rounded-xl
                       transition-all flex items-center justify-center gap-2
                       shadow-lg shadow-primary-500/25"
          >
            {verifying
              ? <><Spinner size="sm" color="white" />Verifying...</>
              : <><ShieldCheck className="w-4 h-4" />Verify Email</>}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="flex items-center gap-1.5 text-primary-500 hover:text-primary-600
                       disabled:aumo-text-subtle disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="aumo-text-subtle hover:aumo-text-primary"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
