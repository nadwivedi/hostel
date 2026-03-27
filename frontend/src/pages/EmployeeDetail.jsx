import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';
import PermissionsGrid from '../components/employees/PermissionsGrid';
import PropertyAssignment from '../components/employees/PropertyAssignment';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const RESOURCE_LABELS = {
  tenants: '👥 Tenants',
  rooms: '🚪 Rooms',
  payments: '💰 Payments',
  properties: '🏢 Properties',
  buildings: '🏗️ Buildings',
};
const ACTIONS = ['view', 'add', 'edit', 'delete'];

function EmployeeDetail() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    isActive: true,
    assignedProperties: [],
    permissions: {
      tenants: { view: false, add: false, edit: false, delete: false },
      rooms: { view: false, add: false, edit: false, delete: false },
      payments: { view: false, add: false, edit: false, delete: false },
      properties: { view: false, add: false, edit: false, delete: false },
      buildings: { view: false, add: false, edit: false, delete: false },
    },
  });

  useEffect(() => {
    fetchEmployee();
    fetchProperties();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/employees`, { withCredentials: true });
      const emp = res.data.find((e) => e._id === employeeId);
      if (!emp) {
        toast.error('Employee not found');
        navigate('/employees');
        return;
      }
      setEmployee(emp);
      setFormData({
        fullName: emp.fullName,
        email: emp.email || '',
        mobile: emp.mobile || '',
        password: '',
        isActive: emp.isActive,
        assignedProperties: emp.assignedProperties?.map((p) => p._id) || [],
        permissions: emp.permissions || formData.permissions,
      });
    } catch {
      toast.error('Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/properties`, { withCredentials: true });
      setProperties(res.data);
    } catch {
      // silently fail
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API_URL}/api/employees/${employeeId}`, formData, {
        withCredentials: true,
      });
      toast.success('Employee updated');
      setEditing(false);
      fetchEmployee();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this employee? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/api/employees/${employeeId}`, { withCredentials: true });
      toast.success('Employee deleted');
      navigate('/settings');
    } catch {
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

  if (!employee) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{employee.fullName}</h1>
          <p className="text-sm text-gray-500">{employee.email || employee.mobile}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {employee.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {!editing ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Full Name</p>
                <p className="font-medium text-gray-900">{employee.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-900">{employee.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Mobile</p>
                <p className="font-medium text-gray-900">{employee.mobile || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="font-medium">{employee.isActive ? '✅ Active' : '🔴 Inactive'}</p>
              </div>
            </div>

            {/* Properties */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-2">Assigned Properties</p>
              <div className="flex flex-wrap gap-2">
                {employee.assignedProperties?.length > 0
                  ? employee.assignedProperties.map((p) => (
                      <span key={p._id} className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                        {p.name}
                      </span>
                    ))
                  : <span className="text-sm text-gray-400">None assigned</span>
                }
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-2">Permissions</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Resource</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="text-center px-2 py-2 font-medium text-gray-600 capitalize">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(employee.permissions || {}).map(([resource, perms]) => (
                      <tr key={resource} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-700">{RESOURCE_LABELS[resource] || resource}</td>
                        {ACTIONS.map((a) => (
                          <td key={a} className="px-2 py-2 text-center">
                            {perms?.[a] ? '✅' : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium text-sm transition"
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (can login)</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Properties</label>
              <PropertyAssignment
                properties={properties}
                selectedIds={formData.assignedProperties}
                onChange={(ids) => setFormData({ ...formData, assignedProperties: ids })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <PermissionsGrid
                permissions={formData.permissions}
                onChange={(perms) => setFormData({ ...formData, permissions: perms })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EmployeeDetail;
