import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL;

function Dashboard() {
  const { employee, hasPermission, assignedProperties } = useEmployeeAuth();
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalTenants: 0,
    totalRooms: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const promises = [];

      if (hasPermission('properties', 'view')) {
        promises.push(
          axios.get(`${API_URL}/api/properties`, { withCredentials: true })
            .then(res => ({ type: 'properties', data: res.data }))
            .catch(() => ({ type: 'properties', data: [] }))
        );
      }

      if (hasPermission('tenants', 'view')) {
        promises.push(
          axios.get(`${API_URL}/api/tenants`, { withCredentials: true })
            .then(res => ({ type: 'tenants', data: res.data }))
            .catch(() => ({ type: 'tenants', data: [] }))
        );
      }

      if (hasPermission('rooms', 'view')) {
        promises.push(
          axios.get(`${API_URL}/api/rooms`, { withCredentials: true })
            .then(res => ({ type: 'rooms', data: res.data }))
            .catch(() => ({ type: 'rooms', data: [] }))
        );
      }

      if (hasPermission('payments', 'view')) {
        promises.push(
          axios.get(`${API_URL}/api/payments?status=PENDING`, { withCredentials: true })
            .then(res => ({ type: 'payments', data: res.data }))
            .catch(() => ({ type: 'payments', data: [] }))
        );
      }

      const results = await Promise.all(promises);

      const newStats = { ...stats };
      results.forEach(result => {
        if (result.type === 'properties') newStats.totalProperties = result.data.length;
        if (result.type === 'tenants') newStats.totalTenants = result.data.length;
        if (result.type === 'rooms') newStats.totalRooms = result.data.length;
        if (result.type === 'payments') newStats.pendingPayments = result.data.length;
      });

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Assigned Properties',
      value: assignedProperties.length,
      icon: '🏢',
      color: 'from-blue-500 to-blue-600',
      link: '/properties',
      visible: true,
    },
    {
      label: 'Total Tenants',
      value: stats.totalTenants,
      icon: '👥',
      color: 'from-green-500 to-green-600',
      link: '/tenants',
      visible: hasPermission('tenants', 'view'),
    },
    {
      label: 'Total Rooms',
      value: stats.totalRooms,
      icon: '🚪',
      color: 'from-purple-500 to-purple-600',
      link: '/rooms',
      visible: hasPermission('rooms', 'view'),
    },
    {
      label: 'Pending Payments',
      value: stats.pendingPayments,
      icon: '💰',
      color: 'from-orange-500 to-orange-600',
      link: '/payments',
      visible: hasPermission('payments', 'view'),
    },
  ];

  const permissionsList = [
    { resource: 'tenants', label: 'Tenants' },
    { resource: 'rooms', label: 'Rooms' },
    { resource: 'payments', label: 'Payments' },
    { resource: 'properties', label: 'Properties' },
    { resource: 'buildings', label: 'Buildings' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {employee?.fullName}!</h1>
        <p className="text-teal-100 mt-1">Here's an overview of your assigned properties and tasks.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.filter(card => card.visible).map((card, idx) => (
          <Link
            key={idx}
            to={card.link}
            className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{card.value}</div>
            <div className="text-sm text-gray-500">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Permissions Overview */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Your Permissions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Resource</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">View</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Add</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Edit</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Delete</th>
              </tr>
            </thead>
            <tbody>
              {permissionsList.map((item) => (
                <tr key={item.resource} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium text-gray-800">{item.label}</td>
                  {['view', 'add', 'edit', 'delete'].map((action) => (
                    <td key={action} className="text-center py-2 px-3">
                      {hasPermission(item.resource, action) ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assigned Properties */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Assigned Properties</h2>
        {assignedProperties.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No properties assigned to you.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignedProperties.map((property) => (
              <div
                key={property._id}
                className="p-4 border rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
              >
                <div className="font-medium text-gray-800">{property.name}</div>
                <div className="text-sm text-gray-500">{property.location}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
