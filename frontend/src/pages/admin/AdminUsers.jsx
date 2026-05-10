import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import { Spinner } from '../../components/Common/Loading';
import { Search, ShieldOff, ShieldCheck, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminService.listUsers({ search, status, limit: 50 });
      setUsers(data.users || []);
    } catch (err) {
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleBlock = async (u) => {
    const reason = window.prompt(`Block ${u.name}? Optional reason:`);
    if (reason === null) return;
    try {
      await adminService.blockUser(u._id, reason);
      toast.success('User blocked');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not block');
    }
  };

  const handleUnblock = async (u) => {
    try {
      await adminService.unblockUser(u._id);
      toast.success('User unblocked');
      load();
    } catch (err) {
      toast.error('Could not unblock');
    }
  };

  const handleRemove = async (u) => {
    if (!window.confirm(`Remove ${u.name}? They will be deactivated.`)) return;
    try {
      await adminService.removeUser(u._id);
      toast.success('User removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Users</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); load(); }}
        className="flex gap-2"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or mobile…"
            className="w-full pl-10 pr-3 py-2.5 min-h-[44px] rounded-xl text-sm text-white
                       border border-white/10 focus:border-indigo-500/50 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2.5 min-h-[44px] rounded-xl text-sm text-white border border-white/10"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <option value="">All statuses</option>
          <option value="blocked">Blocked</option>
          <option value="unverified">Unverified</option>
        </select>
        <button type="submit"
                className="px-4 min-h-[44px] bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl">
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !users.length ? (
        <p className="text-center py-12 text-slate-500">No users match.</p>
      ) : (
        <div className="rounded-xl border border-indigo-500/20 overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.02)' }}>
          {users.map((u) => (
            <div key={u._id}
                 className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center
                              text-indigo-400 text-sm font-bold">
                {(u.name || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                  {u.name}
                  {u.isBlocked && <span className="text-[10px] text-red-400 px-1.5 py-0.5 rounded bg-red-500/10">BLOCKED</span>}
                  {!u.emailVerified && <span className="text-[10px] text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">UNVERIFIED</span>}
                </p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <div className="hidden sm:block text-right text-xs text-slate-400">
                <p>{u.totalTrips || 0} trips</p>
                <p>{Math.round((u.totalCO2Saved || 0) / 1000)} kg saved</p>
              </div>
              <div className="flex gap-1">
                <Link to={`/admin/users/${u._id}`}
                      className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center
                                 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
                      title="View">
                  <ExternalLink className="w-4 h-4" />
                </Link>
                {u.isBlocked ? (
                  <button onClick={() => handleUnblock(u)}
                          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center
                                     rounded-lg text-green-400 hover:bg-green-500/10"
                          title="Unblock">
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => handleBlock(u)}
                          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center
                                     rounded-lg text-amber-400 hover:bg-amber-500/10"
                          title="Block">
                    <ShieldOff className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleRemove(u)}
                        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center
                                   rounded-lg text-red-400 hover:bg-red-500/10"
                        title="Remove">
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

export default AdminUsers;
