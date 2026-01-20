import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    payment: true,
    expiry: true
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl">
            ⚙️
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Settings</h1>
            <p className="text-xs sm:text-sm text-gray-500">Manage your hostel preferences</p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-xl">
            🔔
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Notification Settings</h2>
            <p className="text-xs text-gray-500">Manage your notification preferences</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Email Notifications</div>
              <div className="text-xs text-gray-500">Receive email updates</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Payment Reminders</div>
              <div className="text-xs text-gray-500">Get reminded about pending payments</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.payment}
                onChange={(e) => setNotifications({ ...notifications, payment: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Expiry Alerts</div>
              <div className="text-xs text-gray-500">Get notified about expiring documents</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.expiry}
                onChange={(e) => setNotifications({ ...notifications, expiry: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xl">
            ℹ️
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">About</h2>
            <p className="text-xs text-gray-500">App information</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Version</span>
            <span className="text-sm font-semibold text-gray-800">1.0.0</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">App Name</span>
            <span className="text-sm font-semibold text-gray-800">Hostel Manager</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Developer</span>
            <span className="text-sm font-semibold text-gray-800">Your Company</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center text-white text-xl">
            🚪
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Logout</h2>
            <p className="text-xs text-gray-500">Sign out of your account</p>
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-4">
            You will be signed out of your account and redirected to the login page.
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition font-semibold text-sm shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
