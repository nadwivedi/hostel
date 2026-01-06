import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Occupancy() {
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
      const response = await axios.get(`${BACKEND_URL}/occupancies`);
      setOccupancies(response.data);
    } catch (error) {
      console.error('Error fetching occupancies:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/tenants`);
      setTenants(response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/rooms`);
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

      await axios.post(`${BACKEND_URL}/occupancies`, occupancyData);
      alert('Occupancy created successfully!');
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
      alert('Error creating occupancy');
    }
  };

  const handleEndOccupancy = async (occupancyId) => {
    if (!confirm('Are you sure you want to end this occupancy?')) return;

    try {
      await axios.patch(`${BACKEND_URL}/occupancies/${occupancyId}`, {
        leaveDate: new Date(),
        status: 'COMPLETED',
      });
      alert('Occupancy ended successfully!');
      fetchOccupancies();
      fetchRooms();
    } catch (error) {
      console.error('Error ending occupancy:', error);
      alert('Error ending occupancy');
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Occupancy Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          {showForm ? 'Cancel' : 'Assign Room/Bed'}
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by tenant name or room number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Assign Tenant to Room/Bed</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant <span className="text-red-500">*</span>
                </label>
                <select
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Room <span className="text-red-500">*</span>
                </label>
                <select
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Bed <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="bedNumber"
                    value={formData.bedNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rent Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="rentAmount"
                  value={formData.rentAmount}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  name="advanceAmount"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Join Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                Assign Room
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  {occupancy.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleEndOccupancy(occupancy._id)}
                      className="text-red-600 hover:text-red-900 cursor-pointer"
                    >
                      End Occupancy
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOccupancies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No occupancies match your search.' : 'No occupancies found.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default Occupancy;
