import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL;

function Rooms() {
  const { hasPermission, assignedProperties } = useEmployeeAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchRooms();
  }, [selectedProperty, statusFilter]);

  const fetchRooms = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProperty) params.append('propertyId', selectedProperty);
      if (statusFilter) params.append('status', statusFilter);

      const response = await axios.get(`${API_URL}/api/rooms?${params.toString()}`, {
        withCredentials: true,
      });
      setRooms(response.data);
    } catch (error) {
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'OCCUPIED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBedStats = (room) => {
    if (!room.beds || room.beds.length === 0) return null;
    const available = room.beds.filter(b => b.status === 'AVAILABLE').length;
    const total = room.beds.length;
    return { available, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
          <p className="text-gray-600">View and manage rooms</p>
        </div>
        {hasPermission('rooms', 'add') && (
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            + Add Room
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Properties</option>
          {assignedProperties.map((prop) => (
            <option key={prop._id} value={prop._id}>{prop.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="OCCUPIED">Occupied</option>
        </select>
      </div>

      {/* Rooms Grid */}
      {rooms.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">🚪</div>
          <p>No rooms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const bedStats = getBedStats(room);
            return (
              <div key={room._id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Room {room.roomNumber}</div>
                    <div className="text-sm text-gray-500">Floor {room.floor}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(room.status)}`}>
                    {room.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Property</span>
                    <span className="font-medium text-gray-700">{room.propertyId?.name || '-'}</span>
                  </div>
                  {room.buildingId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Building</span>
                      <span className="font-medium text-gray-700">{room.buildingId.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rent Type</span>
                    <span className="font-medium text-gray-700">
                      {room.rentType === 'PER_BED' ? 'Per Bed' : 'Per Room'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rent</span>
                    <span className="font-medium text-gray-700">Rs. {room.rentAmount}</span>
                  </div>
                  {bedStats && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Beds</span>
                      <span className="font-medium text-gray-700">
                        {bedStats.available}/{bedStats.total} available
                      </span>
                    </div>
                  )}
                </div>

                {(hasPermission('rooms', 'edit') || hasPermission('rooms', 'delete')) && (
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
                    {hasPermission('rooms', 'edit') && (
                      <button className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {hasPermission('rooms', 'delete') && (
                      <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Rooms;
