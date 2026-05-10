import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { Spinner } from '../../components/Common/Loading';
import { ShieldOff, ShieldCheck, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', mobile: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminService.listAdmins();
      setAdmins(data.admins || []);
    } catch (err) {
      toast.error('Could not load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminService.createAdmin(form);
      toast.success('Secondary admin created');
      setForm({ name: '', email: '', password: '', mobile: '' });
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create');
    } finally {
      setCreating(false);
    }
  };

  const block = async (a) => {
    const reason = window.prompt(`Block admin ${a.name}? Reason:`);
    if (reason === null) return;
    try { await adminService.blockAdmin(a._id, reason); toast.success('Blocked'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not block'); }
  };
  const unblock = async (a) => {
    try { await adminService.unblockAdmin(a._id); toast.success('Unblocked'); load(); }
    catch { toast.error('Could not unblock'); }
  };
  const remove = async (a) => {
    if (!window.confirm(`Remove admin ${a.name}?`)) return;
    try { await adminService.removeAdmin(a._id); toast.success('Removed'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not remove'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Secondary Admins</h1>
        <button onClick={() => setShowCreate((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-indigo-500 hover:bg-indigo-600
                           text-white text-sm font-medium rounded-xl">
          <Plus className="w-4 h-4" />New Admin
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate}
              className="rounded-xl border border-indigo-500/30 p-4 space-y-3"
              style={{ background: 'rgba(99,102,241,0.05)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Name"
              className="rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-white border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }} />
            <input
              required type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              className="rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-white border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }} />
            <input
              required type="password" minLength={6}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Initial password (min 6)"
              autoComplete="new-password"
              className="rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-white border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }} />
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
              placeholder="Mobile (optional)"
              className="rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-white border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
                    className="px-4 py-2 min-h-[44px] bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-xl disabled:opacity-50">
              {creating ? 'Creating…' : 'Create admin'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
                    className="px-4 py-2 min-h-[44px] text-slate-300 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !admins.length ? (
        <p className="text-center py-12 text-slate-500">No secondary admins yet.</p>
      ) : (
        <div className="rounded-xl border border-indigo-500/20 overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.02)' }}>
          {admins.map((a) => (
            <div key={a._id}
                 className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center
                              text-indigo-400 text-sm font-bold">
                {(a.name || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{a.name}</p>
                <p className="text-xs text-slate-400 truncate">{a.email}</p>
              </div>
              {a.isBlocked && (
                <span className="text-[10px] text-red-400 px-2 py-0.5 rounded bg-red-500/10">BLOCKED</span>
              )}
              <div className="flex gap-1">
                {a.isBlocked ? (
                  <button onClick={() => unblock(a)}
                          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center
                                     rounded-lg text-green-400 hover:bg-green-500/10" title="Unblock">
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => block(a)}
                          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center
                                     rounded-lg text-amber-400 hover:bg-amber-500/10" title="Block">
                    <ShieldOff className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => remove(a)}
                        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center
                                   rounded-lg text-red-400 hover:bg-red-500/10" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAdmins;
