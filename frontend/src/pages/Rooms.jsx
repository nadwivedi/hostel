import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    floor: '',
    rentType: 'PER_ROOM',
    rentAmount: '',
    capacity: '',
    numberOfBeds: 0,
  });

  useEffect(() => {
    fetchRooms();
  }, []);

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
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      floor: room.floor || '',
      rentType: room.rentType,
      rentAmount: room.rentAmount,
      capacity: room.capacity,
      numberOfBeds: room.beds?.length || 0,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const beds = [];
      if (formData.rentType === 'PER_BED' && formData.numberOfBeds > 0) {
        // If editing and already has beds, keep them
        if (editingRoom && editingRoom.beds && editingRoom.beds.length > 0) {
          // Use existing beds
          beds.push(...editingRoom.beds);
        } else {
          // Create new beds
          for (let i = 1; i <= parseInt(formData.numberOfBeds); i++) {
            beds.push({
              bedNumber: i.toString(),
              status: 'AVAILABLE',
            });
          }
        }
      }

      const roomData = {
        roomNumber: formData.roomNumber,
        floor: formData.floor ? parseInt(formData.floor) : undefined,
        rentType: formData.rentType,
        rentAmount: parseFloat(formData.rentAmount),
        capacity: parseInt(formData.capacity),
        beds: beds,
      };

      if (editingRoom) {
        await axios.patch(`${BACKEND_URL}/rooms/${editingRoom._id}`, roomData);
        alert('✅ Room updated successfully!');
      } else {
        await axios.post(`${BACKEND_URL}/rooms`, roomData);
        alert('✅ Room registered successfully!');
      }

      setShowForm(false);
      setEditingRoom(null);
      setFormData({
        roomNumber: '',
        floor: '',
        rentType: 'PER_ROOM',
        rentAmount: '',
        capacity: '',
        numberOfBeds: 0,
      });
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('❌ Error saving room');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      floor: '',
      rentType: 'PER_ROOM',
      rentAmount: '',
      capacity: '',
      numberOfBeds: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center space-x-3">
            <span>🏠</span>
            <span>Rooms</span>
          </h1>
          <p className="text-gray-600 mt-2">Manage all hostel rooms and beds</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg ${
            showForm
              ? 'bg-gray-500 hover:bg-gray-600 text-white'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-xl'
          } cursor-pointer`}
        >
          {showForm ? '❌ Cancel' : '➕ Add Room'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingRoom ? 'Edit Room' : 'Register New Room'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  required
                  disabled={editingRoom !== null}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100"
                  placeholder="e.g., 101, 201"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Floor
                </label>
                <input
                  type="number"
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Floor number (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rent Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="rentType"
                  value={formData.rentType}
                  onChange={handleChange}
                  required
                  disabled={editingRoom !== null}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100"
                >
                  <option value="PER_ROOM">Per Room</option>
                  <option value="PER_BED">Per Bed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rent Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="rentAmount"
                  value={formData.rentAmount}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Monthly rent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Capacity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Max occupants"
                />
              </div>

              {formData.rentType === 'PER_BED' && !editingRoom && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of Beds <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="numberOfBeds"
                    value={formData.numberOfBeds}
                    onChange={handleChange}
                    required={formData.rentType === 'PER_BED'}
                    min="1"
                    max="20"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Total beds"
                  />
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium cursor-pointer"
              >
                {editingRoom ? '💾 Update Room' : '✅ Register Room'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div
            key={room._id}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
          >
            <div className={`h-2 ${room.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Room {room.roomNumber}</h3>
                  {room.floor !== undefined && <p className="text-sm text-gray-600">Floor {room.floor}</p>}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    room.status === 'AVAILABLE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {room.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-gray-700">
                  <span className="text-lg">💰</span>
                  <span className="text-sm font-medium">
                    ₹{room.rentAmount} <span className="text-gray-500">/ {room.rentType === 'PER_ROOM' ? 'Room' : 'Bed'}</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-gray-700">
                  <span className="text-lg">👥</span>
                  <span className="text-sm font-medium">Capacity: {room.capacity}</span>
                </div>

                {room.beds && room.beds.length > 0 && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <span className="text-lg">🛏️</span>
                    <span className="text-sm font-medium">
                      {room.beds.filter(b => b.status === 'AVAILABLE').length}/{room.beds.length} Beds Available
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(room)}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-medium cursor-pointer"
                >
                  ✏️ Edit Room
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <p className="text-gray-500 text-lg">No rooms registered yet</p>
        </div>
      )}
    </div>
  );
}

export default Rooms;
