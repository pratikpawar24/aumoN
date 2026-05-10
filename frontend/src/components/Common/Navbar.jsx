import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Navigation, Users, BarChart3, User,
  Menu, X, LogOut, Leaf
} from 'lucide-react';
import { API_URL } from '../../utils/constants';

const navLinks = [
  { to: '/map',       icon: Navigation, label: 'Map'       },
  { to: '/carpool',   icon: Users,      label: 'Carpool'   },
  { to: '/dashboard', icon: BarChart3,  label: 'Dashboard' },
];

const resolveAvatarUrl = (avatar) => {
  if (!avatar) return '';
  if (/^https?:\/\//.test(avatar)) return avatar;
  return `${API_URL}${avatar}`;
};

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (path) => location.pathname.startsWith(path);
  const avatarUrl = resolveAvatarUrl(user?.avatar);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 aumo-bg-nav border-b aumo-nav-border"
         style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center
                            group-hover:bg-green-400 transition-colors">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl aumo-text-primary">
              AU<span className="text-green-500">MO</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg
                                text-sm font-medium transition-all min-h-[40px]
                                ${isActive(to)
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'aumo-text-muted hover:aumo-text-primary hover:bg-black/5 dark:hover:bg-white/10'}`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[44px]
                             rounded-lg transition-all bg-green-500/10 border border-green-500/20"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt=""
                         className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center
                                    justify-center text-white text-xs font-bold">
                      {(user?.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm text-green-500 font-medium">
                    {(user?.name || '').split(' ')[0]}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl
                                  border aumo-border aumo-bg-surface py-1 z-50">
                    <div className="px-4 py-2 border-b aumo-border">
                      <p className="text-sm font-medium aumo-text-primary truncate">{user?.name}</p>
                      <p className="text-xs aumo-text-subtle truncate">{user?.email}</p>
                    </div>
                    <Link to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm
                                     aumo-text-muted hover:aumo-text-primary hover:bg-black/5 dark:hover:bg-white/10">
                      <User className="w-4 h-4" />Profile
                    </Link>
                    <button onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm
                                       text-red-500 hover:text-red-400 hover:bg-red-500/10">
                      <LogOut className="w-4 h-4" />Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link to="/login"
                      className="px-3 sm:px-4 py-2 min-h-[44px] flex items-center text-sm aumo-text-muted hover:aumo-text-primary">
                  Sign In
                </Link>
                <Link to="/register"
                      className="px-3 sm:px-4 py-2 min-h-[44px] flex items-center bg-green-500 text-white text-sm font-medium
                                 rounded-lg hover:bg-green-600 transition-colors">
                  Get Started
                </Link>
              </div>
            )}

            <button className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                               aumo-text-muted hover:aumo-text-primary"
                    aria-label="Toggle menu"
                    onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t aumo-nav-border py-2 px-4 aumo-bg-nav">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm mb-1
                              ${isActive(to)
                                ? 'bg-green-500/20 text-green-500'
                                : 'aumo-text-muted hover:bg-black/5 dark:hover:bg-white/10'}`}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
