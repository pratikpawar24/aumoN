import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import {
  Navigation, Users, BarChart3, User,
  Sun, Moon, Menu, X, LogOut, Leaf
} from 'lucide-react';

const navLinks = [
  { to: '/map',       icon: Navigation, label: 'Map'       },
  { to: '/carpool',   icon: Users,      label: 'Carpool'   },
  { to: '/dashboard', icon: BarChart3,  label: 'Dashboard' },
];

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme }           = useTheme();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
         style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center
                            group-hover:bg-green-400 transition-colors">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">
              AU<span className="text-green-400">MO</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg
                                text-sm font-medium transition-all
                                ${isActive(to)
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme}
                    className="p-2 rounded-lg text-slate-400 hover:text-white
                               hover:bg-white/10 transition-all">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg
                             transition-all"
                  style={{ background: 'rgba(34,197,94,0.1)',
                           border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <div className="w-7 h-7 bg-green-500 rounded-full flex items-center
                                  justify-center text-white text-xs font-bold">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm text-green-400 font-medium">
                    {(user?.name || '').split(' ')[0]}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl
                                  border border-white/10 py-1 z-50"
                       style={{ background: 'rgba(15,23,42,0.97)' }}>
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-sm font-medium text-white">{user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <Link to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm
                                     text-slate-300 hover:text-white hover:bg-white/10">
                      <User className="w-4 h-4" />Profile
                    </Link>
                    <button onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm
                                       text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <LogOut className="w-4 h-4" />Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"
                      className="px-4 py-2 text-sm text-slate-300 hover:text-white">
                  Sign In
                </Link>
                <Link to="/register"
                      className="px-4 py-2 bg-green-500 text-white text-sm font-medium
                                 rounded-lg hover:bg-green-600 transition-colors">
                  Get Started
                </Link>
              </div>
            )}

            <button className="md:hidden p-2 text-slate-400 hover:text-white"
                    onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 py-2 px-4"
             style={{ background: 'rgba(15,23,42,0.97)' }}>
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm mb-1
                              ${isActive(to)
                                ? 'bg-green-500/20 text-green-400'
                                : 'text-slate-300 hover:bg-white/10'}`}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;