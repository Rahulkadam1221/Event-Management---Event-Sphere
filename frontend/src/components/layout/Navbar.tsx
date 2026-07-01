import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Menu, X, LogOut, User, LayoutDashboard, Ticket, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Explore Events' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-white/90 dark:bg-[#0f0f11]/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-all duration-300">
              <span className="text-white font-display font-bold text-sm">ES</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white">
              Event<span className="text-brand-500">Sphere</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  location.pathname === link.href
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 dark:text-gray-400"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <Sun className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Moon className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {isAuthenticated && user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <Avatar src={user.avatar} name={user.name} size="sm" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 card p-2 shadow-xl z-20 space-y-0.5"
                      >
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                        <Link to="/dashboard/bookings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors">
                          <Ticket className="w-4 h-4" /> My Tickets
                        </Link>
                        <Link to="/dashboard/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors">
                          <User className="w-4 h-4" /> Profile
                        </Link>
                        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-500 transition-colors">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth/login')}>Sign In</Button>
                <Button size="sm" onClick={() => navigate('/auth/register')}>Get Started</Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden border-t border-gray-200 dark:border-gray-800"
            >
              <div className="py-4 space-y-1">
                {navLinks.map(link => (
                  <Link key={link.href} to={link.href} className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                    {link.label}
                  </Link>
                ))}
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">Dashboard</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl">Sign Out</button>
                  </>
                ) : (
                  <div className="pt-2 flex flex-col gap-2 px-4">
                    <Button variant="secondary" onClick={() => navigate('/auth/login')}>Sign In</Button>
                    <Button onClick={() => navigate('/auth/register')}>Get Started</Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};
