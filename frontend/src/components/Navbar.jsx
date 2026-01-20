import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊', description: 'Overview & Stats' },
    { path: '/tenants', label: 'Tenants', icon: '👥', description: 'Manage Tenants' },
    { path: '/rooms', label: 'Rooms', icon: '🏠', description: 'Room Management' },
    { path: '/occupancy', label: 'Occupancy', icon: '🔑', description: 'Occupancy Status' },
    { path: '/payments', label: 'Payments', icon: '💰', description: 'Payment History' },
    { path: '/settings', label: 'Settings', icon: '⚙️', description: 'App Settings' },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white shadow-lg z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg font-black text-white">🏨</span>
            </div>
            <h1 className="text-sm font-bold text-white">Hostel Manager</h1>
          </div>

          {/* Placeholder for alignment */}
          <div className="w-10"></div>
        </div>
      </div>

      {/* Mobile Slide-in Menu */}
      <div
        className={`lg:hidden fixed left-0 top-0 h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white transform transition-transform duration-300 ease-in-out z-50 w-64 shadow-2xl ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Menu Header */}
        <div className="p-4 border-b border-purple-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-xl font-black text-white">🏨</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Hostel Manager</h1>
                <p className="text-xs text-purple-300 font-medium">
                  Your Hostel Companion
                </p>
              </div>
            </div>
            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-purple-300 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Items */}
        <nav className="p-3 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                isActive(link.path)
                  ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/40 shadow-lg"
                  : "hover:bg-white/10 hover:border border-transparent hover:border-purple-400/20"
              }`}
            >
              <span
                className={`text-xl ${
                  isActive(link.path)
                    ? "text-orange-300"
                    : "text-purple-200 group-hover:text-orange-300"
                }`}
              >
                {link.icon}
              </span>
              <div className="flex-1">
                <div
                  className={`text-sm font-semibold ${
                    isActive(link.path)
                      ? "text-white"
                      : "text-purple-100 group-hover:text-white"
                  }`}
                >
                  {link.label}
                </div>
                <div className="text-xs text-purple-400 group-hover:text-purple-300">
                  {link.description}
                </div>
              </div>
              {isActive(link.path) && (
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* Mobile Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-700/30 bg-indigo-900/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Desktop Navbar */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white shadow-2xl z-50">
        <div className="px-3 2xl:px-4 py-2 2xl:py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-xl font-black text-white">🏨</span>
              </div>
              <div className="hidden 2xl:block">
                <h1 className="text-lg font-bold text-white">Hostel Manager</h1>
                <p className="text-xs text-purple-300">Manage your hostel</p>
              </div>
            </div>

            {/* Menu Items - Horizontal */}
            <div className="flex items-center gap-1.5 2xl:gap-2.5 overflow-x-auto scrollbar-hide flex-1 justify-center">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 2xl:gap-2 px-2 2xl:px-3 py-1.5 2xl:py-2 rounded-lg transition-all duration-200 group flex-shrink-0 ${
                    isActive(link.path)
                      ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/40 shadow-lg"
                      : "hover:bg-white/10 hover:border border-transparent hover:border-purple-400/20"
                  }`}
                  title={link.description}
                >
                  <span
                    className={`text-base 2xl:text-lg ${
                      isActive(link.path)
                        ? "text-orange-300"
                        : "text-purple-200 group-hover:text-orange-300"
                    }`}
                  >
                    {link.icon}
                  </span>
                  <span
                    className={`text-xs 2xl:text-sm font-semibold whitespace-nowrap ${
                      isActive(link.path)
                        ? "text-purple-100"
                        : "text-purple-100 group-hover:text-white"
                    }`}
                  >
                    {link.label}
                  </span>
                  {isActive(link.path) && (
                    <div className="w-1 2xl:w-1.5 h-1 2xl:h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                  )}
                </Link>
              ))}
            </div>

            {/* User/Logout */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 hover:scale-105 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden 2xl:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[95%] mx-auto px-3 sm:px-4 lg:px-6 pt-16 lg:pt-20 pb-4 sm:pb-6 lg:pb-8">
        <Outlet />
      </main>
    </>
  );
}

export default Navbar;
