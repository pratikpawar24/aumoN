import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, Save, Leaf, Camera, Upload, ShieldCheck, ShieldAlert, Phone } from 'lucide-react';
import { VEHICLE_TYPES, API_URL } from '../utils/constants';
import { Spinner } from '../components/Common/Loading';
import { compressImage } from '../utils/imageCompress';
import toast from 'react-hot-toast';

const MOBILE_RE = /^(\+?\d{1,3}[\s-]?)?\d{10}$/;

const resolveAvatarUrl = (avatar) => {
  if (!avatar) return '';
  if (/^https?:\/\//.test(avatar)) return avatar;
  return `${API_URL}${avatar}`;
};

const ProfilePage = () => {
  const { user, updateUser, uploadAvatar } = useAuth();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [form, setForm] = useState({
    name:        user?.name || '',
    mobile:      user?.mobile || '',
    vehicleType: user?.vehicleType || 'car',
    preferences: {
      optimizeFor: user?.preferences?.optimizeFor || 'carbon',
    },
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  if (!user) return null;

  const avatarUrl = previewUrl || resolveAvatarUrl(user.avatar);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.mobile && !MOBILE_RE.test(form.mobile.trim())) {
      toast.error('Mobile must be a valid 10-digit number');
      return;
    }
    setSaving(true);
    try {
      await updateUser({ ...form, mobile: form.mobile.trim() });
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error('Please pick a JPEG, PNG, or WebP image');
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxDim: 1024, quality: 0.85 });
      // Local preview while uploading
      setPreviewUrl(URL.createObjectURL(compressed));
      await uploadAvatar(compressed);
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4"
         style={{ background: '#0f172a' }}>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-green-400" />
          My Profile
        </h1>

        {/* Email verification banner */}
        {!user.emailVerified && (
          <div className="rounded-2xl p-4 border border-amber-500/30 flex items-start gap-3"
               style={{ background: 'rgba(245,158,11,0.08)' }}>
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-amber-300 font-medium">Email not verified</p>
              <p className="text-amber-200/80 mt-0.5">
                Verify your email to unlock carpool features.
              </p>
              <Link
                to="/verify-email"
                className="inline-block mt-2 text-amber-300 hover:text-amber-200 underline text-xs font-medium"
              >
                Verify now →
              </Link>
            </div>
          </div>
        )}

        {/* Avatar & green score */}
        <div className="rounded-2xl p-6 border border-white/10 text-center"
             style={{ background: 'rgba(30,41,59,0.8)' }}>
          <div className="relative w-24 h-24 mx-auto mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar"
                   className="w-24 h-24 rounded-2xl object-cover border-2 border-green-500/30" />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center
                              text-green-400 text-3xl font-bold border-2 border-green-500/30"
                   style={{ background: 'rgba(34,197,94,0.2)' }}>
                {(user.name || 'U')[0].toUpperCase()}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
                   style={{ background: 'rgba(15,23,42,0.7)' }}>
                <Spinner size="sm" color="white" />
              </div>
            )}
          </div>

          <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
            {user.name}
            {user.emailVerified && (
              <ShieldCheck className="w-4 h-4 text-green-400" title="Email verified" />
            )}
          </h2>
          <p className="text-slate-400 text-sm">{user.email}</p>
          {user.mobile && (
            <p className="text-slate-500 text-xs mt-0.5 flex items-center justify-center gap-1">
              <Phone className="w-3 h-3" />{user.mobile}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3">
            <Leaf className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-semibold">
              Green Score: {user.greenScore}/100
            </span>
          </div>

          {/* Avatar upload buttons */}
          <div className="flex gap-2 mt-4 justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 max-w-[160px] min-h-[44px] flex items-center justify-center gap-2
                         px-3 py-2 rounded-xl text-sm border border-white/10 text-slate-300
                         hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />Upload
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 max-w-[160px] min-h-[44px] flex items-center justify-center gap-2
                         px-3 py-2 rounded-xl text-sm border border-white/10 text-slate-300
                         hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />Camera
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">JPEG/PNG/WebP, max 5 MB</p>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave}
              className="rounded-2xl p-6 border border-white/10 space-y-4"
              style={{ background: 'rgba(30,41,59,0.8)' }}>
          <h3 className="font-semibold text-white">Edit Profile</h3>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Display Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl px-4 py-3 min-h-[44px] text-sm text-white
                         border border-white/10 focus:border-green-500/50
                         focus:outline-none"
              style={{ background: 'rgba(15,23,42,0.8)' }}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Mobile <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.mobile}
              onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
              placeholder="+91 9876543210"
              className="w-full rounded-xl px-4 py-3 min-h-[44px] text-sm text-white
                         border border-white/10 focus:border-green-500/50
                         focus:outline-none"
              style={{ background: 'rgba(15,23,42,0.8)' }}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-2 block">
              Primary Vehicle
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {VEHICLE_TYPES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, vehicleType: v.value }))}
                  className={`flex flex-col items-center justify-center min-h-[60px] py-2.5 px-1 rounded-xl
                              border text-xs transition-all
                              ${form.vehicleType === v.value
                                ? 'border-green-500 text-green-400'
                                : 'border-white/10 text-slate-400'}`}
                  style={form.vehicleType === v.value
                    ? { background: 'rgba(34,197,94,0.2)' }
                    : { background: 'rgba(15,23,42,0.8)' }}
                >
                  <span className="text-base">{v.icon}</span>
                  {v.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Default Optimization
            </label>
            <select
              value={form.preferences.optimizeFor}
              onChange={(e) => setForm((p) => ({
                ...p,
                preferences: { ...p.preferences, optimizeFor: e.target.value },
              }))}
              className="w-full rounded-xl px-4 py-3 min-h-[44px] text-sm text-white
                         border border-white/10 focus:border-green-500/50
                         focus:outline-none"
              style={{ background: 'rgba(15,23,42,0.8)' }}
            >
              <option value="carbon">🌿 Eco Route</option>
              <option value="time">⚡ Fastest</option>
              <option value="distance">📏 Shortest</option>
              <option value="balanced">⚖️ Balanced</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 min-h-[48px] bg-green-500 hover:bg-green-600
                       disabled:opacity-50 text-white font-semibold rounded-xl
                       transition-all flex items-center justify-center gap-2"
          >
            {saving
              ? <><Spinner size="sm" color="white" />Saving...</>
              : <><Save className="w-4 h-4" />Save Changes</>}
          </button>
        </form>

        {/* Stats summary */}
        <div className="rounded-2xl p-6 border border-white/10"
             style={{ background: 'rgba(30,41,59,0.8)' }}>
          <h3 className="font-semibold text-white mb-4">My Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Trips',
                val: user.totalTrips || 0 },
              { label: 'Carpools Joined',
                val: user.carpoolsJoined || 0 },
              { label: 'CO₂ Saved',
                val: `${Math.round((user.totalCO2Saved || 0) / 1000)}kg` },
              { label: 'Distance',
                val: `${Math.round(user.totalDistanceKm || 0)}km` },
            ].map(({ label, val }) => (
              <div key={label}
                   className="rounded-xl p-3 text-center"
                   style={{ background: 'rgba(15,23,42,0.8)' }}>
                <p className="text-lg font-bold text-green-400">{val}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
