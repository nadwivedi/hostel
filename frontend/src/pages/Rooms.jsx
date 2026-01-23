import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Rooms() {
  const { user } = useAuth();
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
    
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }
    
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
        await axios.patch(`${BACKEND_URL}/api/rooms/${editingRoom._id}`, { userId, ...roomData }, {
          withCredentials: true,
        });
        toast.success('Room updated successfully!');
      } else {
        await axios.post(`${BACKEND_URL}/api/rooms`, { userId, ...roomData }, {
          withCredentials: true,
        });
        toast.success('Room registered successfully!');
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
      toast.error(error.response?.data?.message || 'Error saving room');
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

  const handleDelete = async (room) => {
    if (!window.confirm(`Are you sure you want to delete Room ${room.roomNumber}?`)) return;
    
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/rooms/${room._id}`, {
        data: { userId },
        withCredentials: true,
      });
      toast.success('Room deleted successfully!');
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error(error.response?.data?.message || 'Error deleting room');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 flex items-center space-x-2 sm:space-x-3">
            <span className="text-xl sm:text-3xl">🏠</span>
            <span>Rooms</span>
          </h1>
          <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-2">Manage all hostel rooms and beds</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-md sm:shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-xl cursor-pointer text-xs sm:text-base flex-shrink-0"
        >
          <span className="sm:hidden">➕ Add</span>
          <span className="hidden sm:inline">➕ Add Room</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-3 sm:p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold truncate">{editingRoom ? 'Edit Room' : 'Add New Room'}</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Enter the details for the room.</p>
                </div>
                <button
                  onClick={handleCancel}
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
              {/* Section 1: Basic Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Basic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleChange}
                      required
                      disabled={editingRoom !== null}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 disabled:bg-gray-100"
                      placeholder="e.g., 101, 201"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Floor
                    </label>
                    <input
                      type="number"
                      name="floor"
                      value={formData.floor}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      placeholder="Floor number (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Rent Configuration */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Rent Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Rent Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="rentType"
                      value={formData.rentType}
                      onChange={handleChange}
                      required
                      disabled={editingRoom !== null}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 disabled:bg-gray-100"
                    >
                      <option value="PER_ROOM">Per Room</option>
                      <option value="PER_BED">Per Bed</option>
                    </select>
                  </div>

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
                      placeholder="Monthly rent"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Capacity & Beds */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Capacity & Beds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Capacity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="Max occupants"
                    />
                  </div>

                  {formData.rentType === 'PER_BED' && !editingRoom && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                        placeholder="Total beds"
                      />
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-100 flex flex-row justify-end items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleCancel}
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
                {editingRoom ? 'Update Room' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-6">
        {rooms
          .sort((a, b) => {
            // Show AVAILABLE rooms first, then OCCUPIED
            if (a.status === 'AVAILABLE' && b.status !== 'AVAILABLE') return -1;
            if (a.status !== 'AVAILABLE' && b.status === 'AVAILABLE') return 1;
            return 0;
          })
          .map((room) => (
          <div
            key={room._id}
            className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
          >
            <div className={`h-1.5 sm:h-2 ${room.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Room {room.roomNumber}</h3>
                  {room.floor !== undefined && <p className="text-xs sm:text-sm text-gray-600">Floor {room.floor}</p>}
                </div>
                <span
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                    room.status === 'AVAILABLE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {room.status}
                </span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-2 text-gray-700">
                  <span className="text-base sm:text-lg">💰</span>
                  <span className="text-xs sm:text-sm font-medium">
                    ₹{room.rentAmount} <span className="text-gray-500">/ {room.rentType === 'PER_ROOM' ? 'Room' : 'Bed'}</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-gray-700">
                  <span className="text-base sm:text-lg">👥</span>
                  <span className="text-xs sm:text-sm font-medium">Capacity: {room.capacity}</span>
                </div>

                {room.beds && room.beds.length > 0 && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <span className="text-base sm:text-lg">🛏️</span>
                    <span className="text-xs sm:text-sm font-medium">
                      {room.beds.filter(b => b.status === 'AVAILABLE').length}/{room.beds.length} Beds Available
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleEdit(room)}
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-medium cursor-pointer text-xs sm:text-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(room)}
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all font-medium cursor-pointer text-xs sm:text-sm"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg p-8 sm:p-12 lg:p-16 text-center">
          <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🏠</div>
          <p className="text-gray-500 text-base sm:text-lg">No rooms registered yet</p>
        </div>
      )}
    </div>
  );
}

export default Rooms;
