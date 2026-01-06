import { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Dashboard() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    totalTenants: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [rooms, tenants, occupancies, payments] = await Promise.all([
        axios.get(`${BACKEND_URL}/rooms`),
        axios.get(`${BACKEND_URL}/tenants`),
        axios.get(`${BACKEND_URL}/occupancies?status=ACTIVE`),
        axios.get(`${BACKEND_URL}/payments?status=PENDING`),
      ]);

      setStats({
        totalRooms: rooms.data.length || 0,
        occupiedRooms: occupancies.data.length || 0,
        totalTenants: tenants.data.length || 0,
        pendingPayments: payments.data.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, gradient, bgLight }) => (
    <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-4xl font-bold text-gray-900">{loading ? '...' : value}</p>
          </div>
          <div className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center shadow-lg`}>
            <span className="text-3xl">{icon}</span>
          </div>
        </div>
        <div className={`mt-4 h-2 rounded-full ${bgLight}`}>
          <div
            className={`h-full rounded-full ${gradient} transition-all duration-500`}
            style={{ width: loading ? '0%' : '100%' }}
          ></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your hostel</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium cursor-pointer"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Rooms"
          value={stats.totalRooms}
          icon="🏠"
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          bgLight="bg-blue-100"
        />
        <StatCard
          title="Occupied Rooms"
          value={stats.occupiedRooms}
          icon="✅"
          gradient="bg-gradient-to-br from-green-500 to-green-600"
          bgLight="bg-green-100"
        />
        <StatCard
          title="Total Tenants"
          value={stats.totalTenants}
          icon="👥"
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          bgLight="bg-purple-100"
        />
        <StatCard
          title="Pending Payments"
          value={stats.pendingPayments}
          icon="⚠️"
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          bgLight="bg-red-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Available Rooms</span>
              <span className="font-bold text-blue-600">{stats.totalRooms - stats.occupiedRooms}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Occupancy Rate</span>
              <span className="font-bold text-green-600">
                {stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Active Tenants</span>
              <span className="font-bold text-purple-600">{stats.totalTenants}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">System Active</p>
                <p className="text-xs text-gray-500">All services running</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Data Updated</p>
                <p className="text-xs text-gray-500">Stats refreshed successfully</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
