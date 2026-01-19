import { useEffect, useState } from 'react';
import axios from 'axios';
import StatCard from '../components/Stats';

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
      const config = { withCredentials: true };
      const [rooms, tenants, occupancies, payments] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/rooms`, config),
        axios.get(`${BACKEND_URL}/api/tenants`, config),
        axios.get(`${BACKEND_URL}/api/occupancies?status=ACTIVE`, config),
        axios.get(`${BACKEND_URL}/api/payments?status=PENDING`, config),
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Welcome back! Here's an overview of your hostel</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r- from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium cursor-pointer text-sm sm:text-base self-start sm:self-auto"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Rooms"
          value={loading ? '...' : stats.totalRooms}
          icon="🏠"
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          bgLight="bg-blue-100"
        />
        <StatCard
          title="Occupied Rooms"
          value={loading ? '...' : stats.occupiedRooms}
          icon="✅"
          gradient="bg-gradient-to-br from-green-500 to-green-600"
          bgLight="bg-green-100"
        />
        <StatCard
          title="Total Tenants"
          value={loading ? '...' : stats.totalTenants}
          icon="👥"
          gradient="bg-gradient-to-br from-purple-300 to-purple-600"
          bgLight="bg-purple-100"
        />
        <StatCard
          title="Pending Payments"
          value={loading ? '...' : stats.pendingPayments}
          icon="⚠️"
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          bgLight="bg-red-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Quick Stats</h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center py-2 sm:py-3 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-600">Available Rooms</span>
              <span className="font-bold text-blue-600 text-sm sm:text-base">{stats.totalRooms - stats.occupiedRooms}</span>
            </div>
            <div className="flex justify-between items-center py-2 sm:py-3 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-600">Occupancy Rate</span>
              <span className="font-bold text-green-600 text-sm sm:text-base">
                {stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 sm:py-3">
              <span className="text-sm sm:text-base text-gray-600">Active Tenants</span>
              <span className="font-bold text-purple-600 text-sm sm:text-base">{stats.totalTenants}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Recent Activity</h3>
          <div className="space-y-3 sm:space-y-4">
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
