import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';
import PermissionsGrid from '../components/employees/PermissionsGrid';
import PropertyAssignment from '../components/employees/PropertyAssignment';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const DEFAULT_PERMISSIONS = {
  tenants:    { view: false, add: false, edit: false, delete: false },
  rooms:      { view: false, add: false, edit: false, delete: false },
  payments:   { view: false, add: false, edit: false, delete: false },
  properties: { view: false, add: false, edit: false, delete: false },
  buildings:  { view: false, add: false, edit: false, delete: false },
};

function Employees({ embedded = false }) {
  const [employees, setEmployees] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    isActive: true,
    assignedProperties: [],
    permissions: DEFAULT_PERMISSIONS,
  });

  useEffect(() => {
    fetchEmployees();
    fetchProperties();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/employees`, { withCredentials: true });
      setEmployees(res.data);
    } catch {
      toast.error('Failed to fetch employees');
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

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      isActive: true,
      assignedProperties: [],
      permissions: DEFAULT_PERMISSIONS,
    });
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName,
      email: emp.email || '',
      mobile: emp.mobile || '',
      password: '',
      isActive: emp.isActive,
      assignedProperties: emp.assignedProperties?.map((p) => p._id) || [],
      permissions: emp.permissions || DEFAULT_PERMISSIONS,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) { toast.error('Please enter employee name'); return; }
    if (!formData.email && !formData.mobile) { toast.error('Please enter email or mobile number'); return; }
    if (!editingEmployee && !formData.password) { toast.error('Please enter a password'); return; }

    try {
      if (editingEmployee) {
        await axios.patch(`${API_URL}/api/employees/${editingEmployee._id}`, formData, { withCredentials: true });
        toast.success('Employee updated successfully');
      } else {
        await axios.post(`${API_URL}/api/employees`, formData, { withCredentials: true });
        toast.success('Employee created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await axios.delete(`${API_URL}/api/employees/${id}`, { withCredentials: true });
      toast.success('Employee deleted');
      fetchEmployees();
    } catch {
      toast.error('Failed to delete employee');
    }
  };

  const handleToggleActive = async (emp) => {
    try {
      await axios.patch(`${API_URL}/api/employees/${emp._id}`, { isActive: !emp.isActive }, { withCredentials: true });
      toast.success(`Employee ${emp.isActive ? 'deactivated' : 'activated'}`);
      fetchEmployees();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const containerClass = embedded
    ? 'bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-gray-200 p-2.5 sm:p-5 space-y-2 sm:space-y-3'
    : 'space-y-6';
  const listWrapperClass = embedded
    ? 'border border-gray-200 rounded-md sm:rounded-lg overflow-hidden'
    : 'bg-white rounded-xl shadow-sm border overflow-hidden';

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${embedded ? 'py-8' : 'min-h-[50vh]'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      {embedded ? (
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-md sm:rounded-lg flex items-center justify-center text-white">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-800">Staff / Employees</h2>
              <p className="text-[10px] sm:text-xs text-gray-500">Create and manage staff access</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 text-white rounded-md sm:rounded-lg hover:bg-gray-800 font-semibold text-[11px] sm:text-sm transition flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Employees</h1>
            <p className="text-sm text-gray-600">Manage your employees and their access permissions</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span>+</span><span>Add Employee</span>
          </button>
        </div>
      )}

      {/* Employee List */}
      <div className={listWrapperClass}>
        {employees.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">No employees added yet</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Add your first staff member to get started</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="divide-y divide-gray-200 md:hidden">
              {employees.map((emp) => (
                <div key={emp._id} className="p-2 sm:p-3">
                  <div className="rounded-md sm:rounded-lg border border-gray-200 bg-white p-2.5 sm:p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{emp.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {emp.email && <div>{emp.email}</div>}
                          {emp.mobile && <div>{emp.mobile}</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {emp.assignedProperties?.slice(0, 3).map((prop) => (
                        <span key={prop._id} className="px-2 py-0.5 text-[11px] bg-blue-100 text-blue-800 rounded-full">{prop.name}</span>
                      ))}
                      {emp.assignedProperties?.length > 3 && (
                        <span className="px-2 py-0.5 text-[11px] bg-gray-100 text-gray-600 rounded-full">+{emp.assignedProperties.length - 3} more</span>
                      )}
                      {!emp.assignedProperties?.length && <span className="text-xs text-gray-400">None assigned</span>}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Link to={`/employees/${emp._id}`} className="px-2.5 py-1.5 text-xs text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">View</Link>
                      <button onClick={() => openEditModal(emp)} className="px-2.5 py-1.5 text-xs text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">Edit</button>
                      <button onClick={() => handleDelete(emp._id)} className="px-2.5 py-1.5 text-xs text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Properties</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{emp.fullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {emp.email && <div>{emp.email}</div>}
                        {emp.mobile && <div>{emp.mobile}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.assignedProperties?.slice(0, 2).map((p) => (
                            <span key={p._id} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{p.name}</span>
                          ))}
                          {emp.assignedProperties?.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">+{emp.assignedProperties.length - 2} more</span>
                          )}
                          {!emp.assignedProperties?.length && <span className="text-sm text-gray-400">None</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(emp)}
                          className={`px-3 py-1 text-xs font-medium rounded-full ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/employees/${emp._id}`} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>
                          <button onClick={() => openEditModal(emp)} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(emp._id)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xl max-w-xl sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="10-digit mobile"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Password {editingEmployee && '(leave blank to keep)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder={editingEmployee ? '••••••••' : 'Enter password'}
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveModal"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActiveModal" className="text-xs sm:text-sm font-medium text-gray-700">
                  Active (can login)
                </label>
              </div>

              {/* Assigned Properties */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Assigned Properties</label>
                <PropertyAssignment
                  properties={properties}
                  selectedIds={formData.assignedProperties}
                  onChange={(ids) => setFormData({ ...formData, assignedProperties: ids })}
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <PermissionsGrid
                  permissions={formData.permissions}
                  onChange={(perms) => setFormData({ ...formData, permissions: perms })}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingEmployee ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;
