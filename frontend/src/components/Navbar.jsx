import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const location = useLocation();
  const { logout, isEmployee, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Desktop nav links — employees get a reduced set (no Settings)
  const ownerDesktopLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/properties', label: 'Properties', icon: '🏢' },
    { path: '/tenants', label: 'Tenants', icon: '👥' },
    { path: '/payments', label: 'Payments', icon: '💰' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];
  const employeeDesktopLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/properties', label: 'Properties', icon: '🏢' },
    { path: '/tenants', label: 'Tenants', icon: '👥' },
    { path: '/payments', label: 'Payments', icon: '💰' },
  ];
  const desktopLinks = isEmployee ? employeeDesktopLinks : ownerDesktopLinks;

  // Mobile bottom nav — always shows 2 primary links
  const mobileNavLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/properties', label: 'Properties', icon: '🏢' },
  ];

  // Hamburger menu links (mobile only) — anything not in mobileNavLinks
  const ownerHamburgerLinks = [
    { path: '/tenants', label: 'Tenants', icon: '👥', description: 'All Tenants' },
    { path: '/payments', label: 'Payments', icon: '💰', description: 'All Payments' },
    { path: '/settings', label: 'Settings', icon: '⚙️', description: 'Manage Settings' },
  ];
  const employeeHamburgerLinks = [
    { path: '/tenants', label: 'Tenants', icon: '👥', description: 'All Tenants' },
    { path: '/payments', label: 'Payments', icon: '💰', description: 'All Payments' },
  ];
  const hamburgerLinks = isEmployee ? employeeHamburgerLinks : ownerHamburgerLinks;

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white shadow-2xl z-50">
        <div className="px-2 sm:px-4 lg:px-6 py-1.5 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Hamburger - Mobile Only */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Mobile Nav Links */}
            <div className="flex lg:hidden items-center justify-center gap-1.5 sm:gap-3 flex-1">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-all duration-200 group ${
                    isActive(link.path)
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/40 shadow-lg'
                      : 'hover:bg-white/10 border border-transparent hover:border-purple-400/20'
                  }`}
                >
                  <span className={`text-base sm:text-lg ${isActive(link.path) ? 'text-orange-300' : 'text-purple-200 group-hover:text-orange-300'}`}>
                    {link.icon}
                  </span>
                  <span className={`text-xs sm:text-sm font-semibold ${isActive(link.path) ? 'text-white' : 'text-purple-100 group-hover:text-white'}`}>
                    {link.label}
                  </span>
                  {isActive(link.path) && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-orange-400 rounded-full animate-pulse"></div>}
                </Link>
              ))}
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center justify-center gap-3 flex-1">
              {desktopLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                    isActive(link.path)
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/40 shadow-lg'
                      : 'hover:bg-white/10 border border-transparent hover:border-purple-400/20'
                  }`}
                >
                  <span className={`text-lg ${isActive(link.path) ? 'text-orange-300' : 'text-purple-200 group-hover:text-orange-300'}`}>
                    {link.icon}
                  </span>
                  <span className={`text-sm font-semibold ${isActive(link.path) ? 'text-white' : 'text-purple-100 group-hover:text-white'}`}>
                    {link.label}
                  </span>
                  {isActive(link.path) && <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>}
                </Link>
              ))}
            </div>

            {/* Employee badge + logout (desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              {isEmployee && (
                <span className="text-xs bg-purple-500/30 border border-purple-400/40 text-purple-200 px-2.5 py-1 rounded-full font-medium">
                  👔 {user?.fullName?.split(' ')[0] || 'Staff'}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-purple-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition"
              >
                Logout
              </button>
            </div>

            {/* Spacer for mobile balance */}
            <div className="w-5 sm:w-6 lg:hidden"></div>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-72 sm:w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl lg:hidden ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="p-4 sm:p-5 border-b border-gray-700/50 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Hostel Manager" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-lg" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Hostel Manager</h2>
                {isEmployee ? (
                  <p className="text-xs text-purple-300">👔 Staff: {user?.fullName}</p>
                ) : (
                  <p className="text-xs text-purple-300">Owner Panel</p>
                )}
              </div>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-all">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Menu Links */}
        <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase px-3 mb-2">Menu</p>
          {hamburgerLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 ${
                isActive(link.path)
                  ? 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40 border border-indigo-400/30 shadow-lg'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                isActive(link.path) ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gray-700/50'
              }`}>
                <span className="text-lg sm:text-xl">{link.icon}</span>
              </div>
              <div className="flex-1">
                <div className={`text-sm sm:text-base font-semibold ${isActive(link.path) ? 'text-white' : 'text-gray-200'}`}>
                  {link.label}
                </div>
                <div className="text-xs text-gray-400">{link.description}</div>
              </div>
              {isActive(link.path) && <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>}
            </Link>
          ))}
        </div>

        {/* Menu Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700/50 bg-gray-900/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </div>

      <main className="max-w-[95%] mx-auto px-3 sm:px-4 lg:px-6 pt-14 sm:pt-16 lg:pt-20 pb-4 sm:pb-6 lg:pb-8">
        <Outlet />
      </main>
    </>
  );
}

export default Navbar;
