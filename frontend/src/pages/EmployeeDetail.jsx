import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';
import PermissionsGrid from '../components/employees/PermissionsGrid';
import PropertyAssignment from '../components/employees/PropertyAssignment';

const API_URL = import.meta.env.VITE_BACKEND_URL;

function EmployeeDetail() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    isActive: true,
  });

  const [permissions, setPermissions] = useState({});
  const [assignedProperties, setAssignedProperties] = useState([]);

  useEffect(() => {
    fetchEmployee();
    fetchProperties();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/employees/${employeeId}`, {
        withCredentials: true,
      });
      const emp = response.data;
      setEmployee(emp);
      setFormData({
        fullName: emp.fullName,
        email: emp.email || '',
        mobile: emp.mobile || '',
        password: '',
        isActive: emp.isActive,
      });
      setPermissions(emp.permissions || {});
      setAssignedProperties(emp.assignedProperties?.map(p => p._id) || []);
    } catch (error) {
      toast.error('Failed to fetch employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties`, { withCredentials: true });
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties');
    }
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      await axios.patch(`${API_URL}/api/employees/${employeeId}`, updateData, {
        withCredentials: true,
      });
      toast.success('Employee info updated');
      fetchEmployee();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermissions = async () => {
    setSaving(true);

    try {
      await axios.patch(
        `${API_URL}/api/employees/${employeeId}/permissions`,
        { permissions },
        { withCredentials: true }
      );
      toast.success('Permissions updated');
      fetchEmployee();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProperties = async () => {
    setSaving(true);

    try {
      await axios.patch(
        `${API_URL}/api/employees/${employeeId}/properties`,
        { propertyIds: assignedProperties },
        { withCredentials: true }
      );
      toast.success('Assigned properties updated');
      fetchEmployee();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update properties');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await axios.delete(`${API_URL}/api/employees/${employeeId}`, { withCredentials: true });
      toast.success('Employee deleted');
      navigate('/employees');
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Employee not found</p>
        <Link to="/employees" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Employees
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/employees"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.fullName}</h1>
            <p className="text-gray-600">
              {employee.email || employee.mobile}
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {employee.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          Delete Employee
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {[
            { id: 'info', label: 'Basic Info' },
            { id: 'permissions', label: 'Permissions' },
            { id: 'properties', label: 'Properties' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {activeTab === 'info' && (
          <form onSubmit={handleUpdateInfo} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile
              </label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password (leave blank to keep current)
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active (can login)
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Control what this employee can do within the system.
            </p>
            <PermissionsGrid
              permissions={permissions}
              onChange={setPermissions}
            />
            <button
              onClick={handleUpdatePermissions}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select which properties this employee can access.
            </p>
            <PropertyAssignment
              properties={properties}
              selectedIds={assignedProperties}
              onChange={setAssignedProperties}
            />
            <button
              onClick={handleUpdateProperties}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Properties'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeDetail;
