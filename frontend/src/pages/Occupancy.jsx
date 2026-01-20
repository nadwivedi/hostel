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
        setFormData({
          ...formData,
          roomId: value,
          rentAmount: room.rentAmount,
          bedNumber: '',
        });
      }
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Occupancy Management</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-xs sm:text-base flex-shrink-0 whitespace-nowrap"
        >
          <span className="sm:hidden">➕ Assign</span>
          <span className="hidden sm:inline">Assign Room/Bed</span>
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search by tenant name or room number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
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

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3 sm:space-y-4">
        {filteredOccupancies.map((occupancy) => (
          <div key={occupancy._id} className="bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{occupancy.tenantId?.name || 'N/A'}</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Room {occupancy.roomId?.roomNumber || 'N/A'}
                  {occupancy.bedNumber && ` - Bed ${occupancy.bedNumber}`}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs leading-5 font-semibold rounded-full flex-shrink-0 ${
                  occupancy.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {occupancy.status}
              </span>
            </div>
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Rent:</span>
                <span className="font-semibold">₹{occupancy.rentAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Advance:</span>
                <span className="font-semibold">₹{occupancy.advanceAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Join Date:</span>
                <span className="font-semibold">
                  {new Date(occupancy.joinDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {occupancy.leaveDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">End Date:</span>
                  <span className="font-semibold">
                    {new Date(occupancy.leaveDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2.5 sm:mt-3">
              {occupancy.status === 'ACTIVE' && (
                <button
                  onClick={() => handleEndOccupancy(occupancy._id)}
                  className="flex-1 bg-red-600 text-white py-1.5 sm:py-2 rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-xs sm:text-sm font-medium"
                >
                  End
                </button>
              )}
              <button
                onClick={() => handleDelete(occupancy)}
                className="flex-1 bg-gray-200 text-gray-700 py-1.5 sm:py-2 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer text-xs sm:text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredOccupancies.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
            {searchQuery ? 'No occupancies match your search.' : 'No occupancies found.'}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Advance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Join Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOccupancies.map((occupancy) => (
              <tr key={occupancy._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {occupancy.tenantId?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {occupancy.roomId?.roomNumber || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {occupancy.bedNumber ? `Bed ${occupancy.bedNumber}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{occupancy.rentAmount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{occupancy.advanceAmount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(occupancy.joinDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {occupancy.leaveDate
                    ? new Date(occupancy.leaveDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      occupancy.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {occupancy.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-3">
                    {occupancy.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleEndOccupancy(occupancy._id)}
                        className="text-red-600 hover:text-red-900 cursor-pointer"
                      >
                        End
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(occupancy)}
                      className="text-gray-600 hover:text-gray-900 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOccupancies.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
            {searchQuery ? 'No occupancies match your search.' : 'No occupancies found.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default Occupancy;
