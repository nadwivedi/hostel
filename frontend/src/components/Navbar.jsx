import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  const navLinks = [
    { path: '/', label: 'Properties', icon: '🏢', description: 'Your Properties' },
    { path: '/settings', label: 'Settings', icon: '⚙️', description: 'Manage Settings' },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Navbar - Works on all screen sizes */}
      <nav className="fixed top-0 left-0 right-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white shadow-2xl z-50">
        <div className="px-2 sm:px-4 lg:px-6 py-1.5 sm:py-3">
          <div className="flex items-center justify-center gap-1.5 sm:gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-all duration-200 group ${
                  isActive(link.path)
                    ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/40 shadow-lg"
                    : "hover:bg-white/10 hover:border border-transparent hover:border-purple-400/20"
                }`}
                title={link.description}
              >
                <span className={`text-base sm:text-lg ${isActive(link.path) ? "text-orange-300" : "text-purple-200 group-hover:text-orange-300"}`}>
                  {link.icon}
                </span>
                <span className={`text-xs sm:text-sm font-semibold ${isActive(link.path) ? "text-white" : "text-purple-100 group-hover:text-white"}`}>
                  {link.label}
                </span>
                {isActive(link.path) && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-orange-400 rounded-full animate-pulse"></div>}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-[95%] mx-auto px-3 sm:px-4 lg:px-6 pt-14 sm:pt-16 lg:pt-20 pb-4 sm:pb-6 lg:pb-8">
        <Outlet />
      </main>
    </>
  );
}

export default Navbar;
