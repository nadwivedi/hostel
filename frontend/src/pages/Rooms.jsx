import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Rooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [formData, setFormData] = useState({
    roomNumber: '',
    floor: '',
    rentType: 'PER_ROOM',
    rentAmount: '',
    numberOfBeds: 0,
    locationId: '',
  });

  useEffect(() => {
    fetchRooms();
    fetchLocations();
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

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/locations`, {
        withCredentials: true,
      });
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
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
      numberOfBeds: room.beds?.length || 0,
      locationId: room.locationId?._id || room.locationId || '',
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

    // Validate number of beds for PER_BED type when creating new room
    if (formData.rentType === 'PER_BED' && !editingRoom && (!formData.numberOfBeds || parseInt(formData.numberOfBeds) < 1)) {
      toast.error('Please specify the number of beds for this room');
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
        beds: beds,
        locationId: formData.locationId || undefined,
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
        numberOfBeds: 0,
        locationId: '',
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
      numberOfBeds: 0,
      locationId: '',
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

  // Filter rooms based on search, status, and location
  const filteredRooms = rooms
    .filter((room) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const roomNumber = room.roomNumber?.toLowerCase() || '';
      const floor = room.floor?.toString() || '';
      const locationName = room.locationId?.location?.toLowerCase() || '';
      return roomNumber.includes(query) || floor.includes(query) || locationName.includes(query);
    })
    .filter((room) => {
      if (filterStatus === 'ALL') return true;
      return room.status === filterStatus;
    })
    .filter((room) => {
      if (filterLocation === 'ALL') return true;
      const roomLocationId = room.locationId?._id || room.locationId;
      return roomLocationId === filterLocation;
    })
    .sort((a, b) => {
      if (a.status === 'AVAILABLE' && b.status !== 'AVAILABLE') return -1;
      if (a.status !== 'AVAILABLE' && b.status === 'AVAILABLE') return 1;
      return 0;
    });

  // Calculate stats
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const totalBeds = rooms.reduce((acc, r) => acc + (r.beds?.length || 0), 0);
  const availableBeds = rooms.reduce((acc, r) => acc + (r.beds?.filter(b => b.status === 'AVAILABLE').length || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-2 sm:mt-0">
        <div className="bg-white rounded-xl shadow-lg border border-blue-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 lg:mb-1 whitespace-nowrap">Total Rooms</p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-800">{totalRooms}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">🏠</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-green-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 lg:mb-1 whitespace-nowrap">Available</p>
              <h3 className="text-xl lg:text-3xl font-black text-green-600">{availableRooms}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-red-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 lg:mb-1 whitespace-nowrap">Occupied</p>
              <h3 className="text-xl lg:text-3xl font-black text-red-600">{occupiedRooms}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">🔒</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-purple-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 lg:mb-1 whitespace-nowrap">Beds Available</p>
              <h3 className="text-xl lg:text-3xl font-black text-purple-600">{availableBeds}/{totalBeds}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">🛏️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <input
                type="text"
                placeholder="Search by room number or floor..."
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
            <div className="flex gap-2 flex-wrap">
              {locations.length > 0 && (
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="px-3 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-all bg-white shadow-sm font-medium"
                >
                  <option value="ALL">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc._id} value={loc._id}>{loc.location}</option>
                  ))}
                </select>
              )}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-all bg-white shadow-sm font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
              </select>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 lg:px-6 py-3 bg-gray-700 text-white rounded-xl hover:shadow-xl font-bold text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden lg:inline">Add Room</span>
                <span className="lg:hidden">Add</span>
              </button>
            </div>
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

                  {locations.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Location
                      </label>
                      <select
                        name="locationId"
                        value={formData.locationId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      >
                        <option value="">Select Location (optional)</option>
                        {locations.map((loc) => (
                          <option key={loc._id} value={loc._id}>
                            {loc.location}{loc.propertyName ? ` - ${loc.propertyName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                        required
                        min="1"
                        max="20"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                        placeholder="How many beds in this room?"
                      />
                      <p className="text-xs text-gray-500 mt-1">Each bed can be managed separately for occupancy</p>
                    </div>
                  )}

                  {formData.rentType === 'PER_BED' && editingRoom && editingRoom.beds?.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Beds in Room
                      </label>
                      <p className="text-sm text-gray-600 py-2">
                        This room has <span className="font-bold">{editingRoom.beds.length}</span> beds configured
                      </p>
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

      {/* Room Cards Grid */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6">
          {filteredRooms.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {filteredRooms.map((room) => (
                <div
                  key={room._id}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-gray-300 hover:scale-[1.02] transform"
                >
                  <div className={`h-1.5 sm:h-2 ${room.status === 'AVAILABLE' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}></div>
                  <div className="p-3 sm:p-4 lg:p-5">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Room {room.roomNumber}</h3>
                        {room.floor !== undefined && (
                          <p className="text-xs sm:text-sm text-gray-500 flex items-center mt-0.5">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Floor {room.floor}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                          room.status === 'AVAILABLE'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>

                    <div className="space-y-2 sm:space-y-2.5">
                      {room.locationId && (
                        <div className="flex items-center bg-blue-50 rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-2 text-blue-700">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs sm:text-sm font-semibold truncate">
                              {room.locationId.location}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <span className="text-sm sm:text-base">💰</span>
                          <span className="text-xs sm:text-sm font-semibold text-gray-800">
                            ₹{room.rentAmount}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded">
                          {room.rentType === 'PER_ROOM' ? 'Per Room' : 'Per Bed'}
                        </span>
                      </div>

                      {room.beds && room.beds.length > 0 && (
                        <div className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-2 text-purple-700">
                            <span className="text-sm sm:text-base">🛏️</span>
                            <span className="text-xs sm:text-sm font-semibold">
                              {room.beds.filter(b => b.status === 'AVAILABLE').length}/{room.beds.length}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-purple-600 font-medium">
                            Beds Free
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => handleEdit(room)}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-semibold cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all font-semibold cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Rooms Found</h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {searchQuery || filterStatus !== 'ALL'
                  ? 'No rooms match your search criteria.'
                  : 'Get started by adding your first room.'}
              </p>
              {!searchQuery && filterStatus === 'ALL' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-6 py-2.5 bg-gray-700 text-white rounded-xl hover:shadow-xl font-bold text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Room
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Rooms;
