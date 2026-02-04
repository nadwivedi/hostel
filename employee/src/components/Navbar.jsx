import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

function Navbar() {
  const location = useLocation();
  const { logout, employee } = useEmployeeAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Nav links shown in navbar strip (both mobile and desktop)
  const navLinks = [
    { path: '/', label: 'Properties', icon: '🏢', description: 'View Properties' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-800 text-white shadow-2xl z-50">
        <div className="px-2 sm:px-4 lg:px-6 py-1.5 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Hamburger Menu Button - Mobile Only */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all"
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Mobile Nav Links (Properties) */}
            <div className="flex lg:hidden items-center justify-center gap-1.5 sm:gap-3 flex-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-all duration-200 group ${
                    isActive(link.path)
                      ? "bg-gradient-to-r from-teal-600/30 to-cyan-600/30 border border-teal-400/40 shadow-lg"
                      : "hover:bg-white/10 hover:border border-transparent hover:border-teal-400/20"
                  }`}
                  title={link.description}
                >
                  <span className={`text-base sm:text-lg ${isActive(link.path) ? "text-yellow-300" : "text-teal-200 group-hover:text-yellow-300"}`}>
                    {link.icon}
                  </span>
                  <span className={`text-xs sm:text-sm font-semibold ${isActive(link.path) ? "text-white" : "text-teal-100 group-hover:text-white"}`}>
                    {link.label}
                  </span>
                  {isActive(link.path) && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>}
                </Link>
              ))}
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center justify-center gap-3 flex-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                    isActive(link.path)
                      ? "bg-gradient-to-r from-teal-600/30 to-cyan-600/30 border border-teal-400/40 shadow-lg"
                      : "hover:bg-white/10 hover:border border-transparent hover:border-teal-400/20"
                  }`}
                  title={link.description}
                >
                  <span className={`text-lg ${isActive(link.path) ? "text-yellow-300" : "text-teal-200 group-hover:text-yellow-300"}`}>
                    {link.icon}
                  </span>
                  <span className={`text-sm font-semibold ${isActive(link.path) ? "text-white" : "text-teal-100 group-hover:text-white"}`}>
                    {link.label}
                  </span>
                  {isActive(link.path) && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>}
                </Link>
              ))}
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>

            {/* Placeholder for balance on mobile */}
            <div className="w-5 sm:w-6 lg:hidden"></div>
          </div>
        </div>
      </nav>

      {/* Slide-out Menu Overlay - Mobile Only */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Slide-out Menu - Mobile Only */}
      <div
        className={`fixed top-0 left-0 h-full w-72 sm:w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl lg:hidden ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="p-4 sm:p-5 border-b border-gray-700/50 bg-gradient-to-r from-teal-900/50 to-cyan-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">👤</span>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">{employee?.fullName}</h2>
                <p className="text-xs text-teal-300">Employee Portal</p>
              </div>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Employee Info */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="space-y-2 text-sm">
            {employee?.email && (
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{employee.email}</span>
              </div>
            )}
            {employee?.mobile && (
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{employee.mobile}</span>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Properties */}
        <div className="p-3 sm:p-4">
          <p className="text-xs font-bold text-gray-500 uppercase px-3 mb-2">Assigned Properties</p>
          <div className="space-y-1.5">
            {employee?.assignedProperties?.map((prop) => (
              <div
                key={prop._id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700/30"
              >
                <span className="text-lg">🏢</span>
                <div>
                  <div className="text-sm font-medium text-gray-200">{prop.name}</div>
                  <div className="text-xs text-gray-400">{prop.location}</div>
                </div>
              </div>
            ))}
            {(!employee?.assignedProperties || employee.assignedProperties.length === 0) && (
              <div className="text-sm text-gray-500 px-3 py-2">No properties assigned</div>
            )}
          </div>
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
