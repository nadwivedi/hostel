import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Occupancy() {
  const { user } = useAuth();
  const [occupancies, setOccupancies] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: '',
    roomId: '',
    bedNumber: '',
    rentAmount: '',
    advanceAmount: '',
    joinDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOccupancies();
    fetchTenants();
    fetchRooms();
  }, []);

  const fetchOccupancies = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/occupancies`, {
        withCredentials: true,
      });
      setOccupancies(response.data);
    } catch (error) {
      console.error('Error fetching occupancies:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/tenants`, {
        withCredentials: true,
      });
      setTenants(response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/rooms`, {
        withCredentials: true,
      });
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === 'roomId') {
      const room = rooms.find((r) => r._id === value);
      setSelectedRoom(room);
      if (room) {
        const rent = room.rentAmount || 0;
        setFormData({
          ...formData,
          roomId: value,
          rentAmount: rent,
          advanceAmount: rent * 2,
          bedNumber: '',
        });
      }
    }

    if (name === 'rentAmount') {
      const rent = parseFloat(value) || 0;
      setFormData({
        ...formData,
        rentAmount: value,
        advanceAmount: rent * 2,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const occupancyData = {
        tenantId: formData.tenantId,
        roomId: formData.roomId,
        bedNumber: formData.bedNumber || null,
        rentAmount: parseFloat(formData.rentAmount),
        advanceAmount: parseFloat(formData.advanceAmount) || 0,
        joinDate: formData.joinDate,
        notes: formData.notes,
      };

      await axios.post(`${BACKEND_URL}/api/occupancies`, occupancyData, {
        withCredentials: true,
      });
      toast.success('Occupancy created successfully!');
      setShowForm(false);
      setFormData({
        tenantId: '',
        roomId: '',
        bedNumber: '',
        rentAmount: '',
        advanceAmount: '',
        joinDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setSelectedRoom(null);
      fetchOccupancies();
      fetchRooms();
    } catch (error) {
      console.error('Error creating occupancy:', error);
      toast.error(error.response?.data?.message || 'Error creating occupancy');
    }
  };

  const handleEndOccupancy = async (occupancyId) => {
    if (!confirm('Are you sure you want to end this occupancy?')) return;

    try {
      await axios.patch(`${BACKEND_URL}/api/occupancies/${occupancyId}`, {
        leaveDate: new Date(),
        status: 'COMPLETED',
      }, {
        withCredentials: true,
      });
      toast.success('Occupancy ended successfully!');
      fetchOccupancies();
      fetchRooms();
    } catch (error) {
      console.error('Error ending occupancy:', error);
      toast.error('Error ending occupancy');
    }
  };

  const handleDelete = async (occupancy) => {
    const confirmMessage = occupancy.status === 'ACTIVE' 
      ? `This occupancy is ACTIVE. Are you sure you want to delete it?`
      : `Are you sure you want to delete this occupancy record?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/occupancies/${occupancy._id}`, {
        data: { userId: user?._id },
        withCredentials: true,
      });
      toast.success('Occupancy deleted successfully!');
      fetchOccupancies();
      fetchRooms();
    } catch (error) {
      console.error('Error deleting occupancy:', error);
      toast.error(error.response?.data?.message || 'Error deleting occupancy');
    }
  };

  // Filter occupancies based on search query
  const filteredOccupancies = occupancies.filter((occupancy) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const tenantName = occupancy.tenantId?.name?.toLowerCase() || '';
    const roomNumber = occupancy.roomId?.roomNumber?.toLowerCase() || '';

    return tenantName.includes(query) || roomNumber.includes(query);
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-2 sm:mt-0">
        <div
          className="bg-white rounded-xl shadow-lg border border-blue-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 lg:mb-1 whitespace-nowrap">Total Occupancy</p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-800">{occupancies.length}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">🔑</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <input
                type="text"
                placeholder="Search by tenant name or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-all bg-white shadow-sm"
              />
              <svg
                className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 lg:px-6 py-3 bg-gray-700 text-white rounded-xl hover:shadow-xl font-bold text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden lg:inline">Assign Room</span>
              <span className="lg:hidden">Assign</span>
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-3 sm:p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold truncate">Assign Tenant to Room/Bed</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Enter the details to assign a tenant to a room or bed.</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:bg-gray-700 rounded-full p-1.5 sm:p-2 transition flex-shrink-0"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
              {/* Section 1: Tenant Selection */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Tenant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Select Tenant <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tenantId"
                      value={formData.tenantId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    >
                      <option value="">Choose Tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant._id} value={tenant._id}>
                          {tenant.name} - {tenant.mobile}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Join Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="joinDate"
                      value={formData.joinDate}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Room/Bed Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Room/Bed Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Select Room <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="roomId"
                      value={formData.roomId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    >
                      <option value="">Choose Room</option>
                      {rooms
                        .filter((room) => room.status === 'AVAILABLE' || room.beds.some(bed => bed.status === 'AVAILABLE'))
                        .map((room) => (
                          <option key={room._id} value={room._id}>
                            Room {room.roomNumber} - {room.roomType} (₹{room.rentAmount})
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedRoom && selectedRoom.beds && selectedRoom.beds.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Select Bed <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="bedNumber"
                        value={formData.bedNumber}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      >
                        <option value="">Choose Bed</option>
                        {selectedRoom.beds
                          .filter((bed) => bed.status === 'AVAILABLE')
                          .map((bed) => (
                            <option key={bed._id} value={bed.bedNumber}>
                              Bed {bed.bedNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Payment Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Rent Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="rentAmount"
                      value={formData.rentAmount}
                      onChange={handleChange}
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Advance Amount (₹)
                    </label>
                    <input
                      type="number"
                      name="advanceAmount"
                      value={formData.advanceAmount}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                    />
                  </div>
                </div>
              </div>

            </form>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-100 flex flex-row justify-end items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 sm:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition text-sm sm:text-base"
              >
                Cancel
              </button>

              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('form').requestSubmit();
                }}
                className="px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Assign Room
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {filteredOccupancies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredOccupancies.map((occupancy) => (
                <div key={occupancy._id} className="p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                        {occupancy.tenantId?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-900">{occupancy.tenantId?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Room {occupancy.roomId?.roomNumber || 'N/A'}{occupancy.bedNumber && ` - Bed ${occupancy.bedNumber}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {occupancy.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleEndOccupancy(occupancy._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                          title="End Occupancy"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(occupancy)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">₹{occupancy.rentAmount}/month</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        occupancy.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700 font-semibold'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {occupancy.status}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-green-100 text-green-700 font-semibold border border-green-200">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(occupancy.joinDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Occupancy Found</h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {searchQuery ? 'No occupancies match your search criteria.' : 'Get started by assigning a room to a tenant.'}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Room
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Bed
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Rent
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Advance
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-center text-sm font-bold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOccupancies.length > 0 ? (
                filteredOccupancies.map((occupancy) => (
                  <tr key={occupancy._id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300 group">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                          {occupancy.tenantId?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{occupancy.tenantId?.name || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                      Room {occupancy.roomId?.roomNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {occupancy.bedNumber ? `Bed ${occupancy.bedNumber}` : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      ₹{occupancy.rentAmount}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      ₹{occupancy.advanceAmount}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center text-sm">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-semibold border border-green-200">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(occupancy.joinDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        occupancy.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {occupancy.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {occupancy.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleEndOccupancy(occupancy._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                            title="End Occupancy"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(occupancy)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 mb-2">No Occupancy Found</h3>
                      <p className="text-sm text-gray-500 text-center max-w-xs">
                        {searchQuery ? 'No occupancies match your search criteria.' : 'Get started by assigning a room to a tenant.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Occupancy;
