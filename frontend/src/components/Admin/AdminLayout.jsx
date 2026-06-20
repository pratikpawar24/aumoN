import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Users, ShieldCheck, LayoutDashboard, LogOut, Activity, BarChart3 } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors
       ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
    }
  >
    <Icon className="w-4 h-4" />
    {label}
  </NavLink>
);

/**
 * Distinct admin chrome — separate navbar, dark indigo theme to make it
 * visually obvious this is NOT the user-facing site.
 */
const AdminLayout = () => {
  const { user, isMasterAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: '#0b1020' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-indigo-500/10 backdrop-blur"
              style={{ background: 'rgba(11,16,32,0.92)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white leading-none">AUMO Admin</p>
              <p className="text-[10px] text-indigo-300/80 uppercase tracking-wider">
                {isMasterAdmin ? 'Master Console' : 'Operator Console'}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-400">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm
                         text-slate-300 hover:text-white hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 space-y-1">
          <NavItem to="/admin"        end icon={LayoutDashboard} label="Overview" />
          <NavItem to="/admin/users"      icon={Users}           label="Users" />
          <NavItem to="/admin/reports"    icon={BarChart3}       label="Reports" />
          {isMasterAdmin && (
            <>
              <NavItem to="/admin/admins"   icon={ShieldCheck} label="Admins" />
              <NavItem to="/admin/activity" icon={Activity}    label="Activity Log" />
            </>
          )}
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
