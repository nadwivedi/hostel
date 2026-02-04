import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL;

function Settings() {
  const { employee } = useEmployeeAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('New password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.patch(
        `${API_URL}/api/employee/auth/change-password`,
        { currentPassword, newPassword },
        { withCredentials: true }
      );
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Profile Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Full Name</label>
              <div className="font-medium text-gray-900">{employee?.fullName}</div>
            </div>

            {employee?.email && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <div className="font-medium text-gray-900">{employee.email}</div>
              </div>
            )}

            {employee?.mobile && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">Mobile</label>
                <div className="font-medium text-gray-900">{employee.mobile}</div>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-500 mb-1">Status</label>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                employee?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {employee?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4 pt-4 border-t">
            Contact your administrator to update your profile information.
          </p>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Change Password</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Assigned Properties */}
        <div className="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Assigned Properties</h2>

          {employee?.assignedProperties?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No properties assigned</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {employee?.assignedProperties?.map((property) => (
                <div key={property._id} className="p-3 border rounded-lg">
                  <div className="font-medium text-gray-800">{property.name}</div>
                  <div className="text-sm text-gray-500">{property.location}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
