import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/tenants', label: 'Tenants', icon: '👤' },
    { path: '/rooms', label: 'Rooms', icon: '🏠' },
    { path: '/occupancy', label: 'Occupancy', icon: '🔑' },
    { path: '/payments', label: 'Payments', icon: '💰' },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br- from-gray-50 to-gray-100">
      <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between h-16">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-lg font-black text-white">🏨</span>
              </div>
              <h1 className="text-sm font-bold text-gray-900">Hostel Manager</h1>
            </div>
            <div className="w-10"></div>
          </div>

          <div className="hidden lg:flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br- from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl">🏨</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Hostel Manager
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Manage your hostel efficiently</p>
              </div>
            </div>

            <div className="hidden lg:flex space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isActive(link.path)
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleLogout}
                className=" hidden md:flex px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          <div
            className={`lg:hidden fixed left-0 top-0 h-full bg-gradient-to-br from-blue-900 to-blue-800 text-white transform transition-transform duration-300 ease-in-out z-50 w-66 shadow-2xl ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="p-4 border-b border-blue-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-xl font-black text-white">🏨</span>
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-white">Hostel Manager</h1>
                    <p className="text-xs text-blue-300 font-medium">Manage your hostel</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-blue-300 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <nav className="p-3 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                    isActive(link.path)
                      ? "bg-gradient-to-r from-blue-600/30 to-blue-500/30 border border-blue-400/40 shadow-lg"
                      : "hover:bg-white/10 hover:border border-transparent hover:border-blue-400/20"
                  }`}
                  >
                    <span
                      className={`text-xl ${
                        isActive(link.path) ? "text-white" : "text-blue-200 group-hover:text-white"
                      }`}
                    >
                      {link.icon}
                    </span>
                  <span
                    className={`text-sm font-semibold ${
                      isActive(link.path) ? "text-white" : "text-blue-100 group-hover:text-white"
                    }`}
                  >
                    {link.label}
                  </span>
                  {isActive(link.path) && <div className="w-2 h-2 bg-blue-400 rounded-full ml-auto animate-pulse" />}
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-700/30 bg-blue-900/50">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Navbar;