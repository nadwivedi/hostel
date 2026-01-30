import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from '../App';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    payment: true,
    expiry: true
  });

  // Property state
  const [properties, setProperties] = useState([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propertyFormData, setPropertyFormData] = useState({
    name: '',
    location: '',
    propertyType: 'hostel',
  });
  const [propertyImage, setPropertyImage] = useState(null);
  const [propertyImagePreview, setPropertyImagePreview] = useState(null);

  // Room state
  const [rooms, setRooms] = useState([]);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    roomNumber: '',
    floor: '',
    rentType: 'PER_ROOM',
    rentAmount: '',
    numberOfBeds: 0,
    propertyId: '',
  });
  const [expandedPropertyId, setExpandedPropertyId] = useState(null);

  useEffect(() => {
    fetchProperties();
    fetchRooms();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/properties`, {
        withCredentials: true,
      });
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
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

  // Property handlers
  const handlePropertyChange = (e) => {
    const { name, value } = e.target;
    setPropertyFormData({
      ...propertyFormData,
      [name]: value,
    });
  };

  const handleEditProperty = (prop) => {
    setEditingProperty(prop);
    setPropertyFormData({
      name: prop.name,
      location: prop.location,
      propertyType: prop.propertyType || 'hostel',
    });
    setPropertyImage(null);
    setPropertyImagePreview(prop.image ? `${BACKEND_URL}${prop.image}` : null);
    setShowPropertyForm(true);
  };

  const handlePropertyImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPropertyImage(file);
      setPropertyImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();

    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    if (!propertyFormData.name.trim()) {
      toast.error('Please provide property name');
      return;
    }

    if (!propertyFormData.location.trim()) {
      toast.error('Please provide location');
      return;
    }

    try {
      let imageUrl = editingProperty?.image || null;

      // Upload image first if selected
      if (propertyImage) {
        const formData = new FormData();
        formData.append('image', propertyImage);
        formData.append('propertyName', propertyFormData.name);

        const uploadRes = await axios.post(`${BACKEND_URL}/api/uploads/property`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        imageUrl = uploadRes.data.fileUrl;
      }

      const propertyPayload = {
        ...propertyFormData,
        image: imageUrl,
      };

      if (editingProperty) {
        await axios.patch(`${BACKEND_URL}/api/properties/${editingProperty._id}`, propertyPayload, {
          withCredentials: true,
        });
        toast.success('Property updated successfully!');
      } else {
        await axios.post(`${BACKEND_URL}/api/properties`, { userId, ...propertyPayload }, {
          withCredentials: true,
        });
        toast.success('Property added successfully!');
      }

      setShowPropertyForm(false);
      setEditingProperty(null);
      setPropertyFormData({ name: '', location: '', propertyType: 'hostel' });
      setPropertyImage(null);
      setPropertyImagePreview(null);
      fetchProperties();
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error(error.response?.data?.message || 'Error saving property');
    }
  };

  const handleCancelPropertyForm = () => {
    setShowPropertyForm(false);
    setEditingProperty(null);
    setPropertyFormData({ name: '', location: '', propertyType: 'hostel' });
    setPropertyImage(null);
    setPropertyImagePreview(null);
  };

  // Room handlers
  const handleRoomChange = (e) => {
    const { name, value } = e.target;
    setRoomFormData({
      ...roomFormData,
      [name]: value,
    });
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      roomNumber: room.roomNumber,
      floor: room.floor || '',
      rentType: room.rentType,
      rentAmount: room.rentAmount,
      numberOfBeds: room.beds?.length || 0,
      propertyId: room.propertyId?._id || room.propertyId || '',
    });
    setShowRoomForm(true);
  };

  // Property type icons
  const PROPERTY_TYPE_CONFIG = {
    hostel: { icon: '🏨', label: 'Hostel' },
    resident: { icon: '🏠', label: 'Resident' },
    shop: { icon: '🏪', label: 'Shop' },
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();

    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    if (!roomFormData.propertyId) {
      toast.error('Please select a property');
      return;
    }

    if (roomFormData.rentType === 'PER_BED' && !editingRoom && (!roomFormData.numberOfBeds || parseInt(roomFormData.numberOfBeds) < 1)) {
      toast.error('Please specify the number of beds');
      return;
    }

    try {
      const beds = [];
      if (roomFormData.rentType === 'PER_BED' && roomFormData.numberOfBeds > 0) {
        if (editingRoom && editingRoom.beds && editingRoom.beds.length > 0) {
          beds.push(...editingRoom.beds);
        } else {
          for (let i = 1; i <= parseInt(roomFormData.numberOfBeds); i++) {
            beds.push({
              bedNumber: i.toString(),
              status: 'AVAILABLE',
            });
          }
        }
      }

      const roomData = {
        roomNumber: roomFormData.roomNumber,
        floor: roomFormData.floor ? parseInt(roomFormData.floor) : undefined,
        rentType: roomFormData.rentType,
        rentAmount: parseFloat(roomFormData.rentAmount),
        beds: beds,
        propertyId: roomFormData.propertyId,
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
        toast.success('Room added successfully!');
      }

      handleCancelRoomForm();
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error(error.response?.data?.message || 'Error saving room');
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Delete Room ${room.roomNumber}?`)) return;

    const userId = user?.id || user?._id;
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

  const handleCancelRoomForm = () => {
    setShowRoomForm(false);
    setEditingRoom(null);
    setRoomFormData({
      roomNumber: '',
      floor: '',
      rentType: 'PER_ROOM',
      rentAmount: '',
      numberOfBeds: 0,
      propertyId: '',
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Properties Management */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center text-white text-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Properties</h2>
              <p className="text-xs text-gray-500">Manage your properties</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingProperty(null);
              setPropertyFormData({ name: '', location: '', propertyType: 'hostel' });
              setPropertyImage(null);
              setPropertyImagePreview(null);
              setShowPropertyForm(true);
            }}
            className="px-3 sm:px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold text-xs sm:text-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Property</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Property Form Modal */}
        {showPropertyForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gray-800 p-4 text-white sticky top-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">{editingProperty ? 'Edit Property' : 'Add New Property'}</h3>
                  <button
                    onClick={handleCancelPropertyForm}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handlePropertySubmit} className="p-4 space-y-4">
                {/* Property Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Property Image
                  </label>
                  <div className="relative">
                    {propertyImagePreview ? (
                      <div className="relative rounded-lg overflow-hidden">
                        <img
                          src={propertyImagePreview}
                          alt="Property preview"
                          className="w-full h-40 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPropertyImage(null);
                            setPropertyImagePreview(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <label className="absolute bottom-2 right-2 bg-white/90 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-white transition shadow-lg">
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePropertyImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-500 font-medium">Click to upload property image</p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePropertyImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Property Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={propertyFormData.name}
                    onChange={handlePropertyChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    placeholder="e.g., Sunrise Hostel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={propertyFormData.location}
                    onChange={handlePropertyChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    placeholder="e.g., Main Street, City Center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="propertyType"
                    value={propertyFormData.propertyType}
                    onChange={handlePropertyChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  >
                    <option value="hostel">🏨 Hostel</option>
                    <option value="resident">🏠 Resident</option>
                    <option value="shop">🏪 Shop</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelPropertyForm}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-semibold transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingProperty ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Properties List */}
        <div className="space-y-2">
          {properties.length > 0 ? (
            properties.map((loc) => {
              const propertyRooms = rooms.filter(r => (r.propertyId?._id || r.propertyId) === loc._id);
              const isExpanded = expandedPropertyId === loc._id;

              return (
                <div key={loc._id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Property Header - Clickable to expand/collapse */}
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                    onClick={() => setExpandedPropertyId(isExpanded ? null : loc._id)}
                  >
                    <div className="flex items-center gap-3">
                      {loc.image ? (
                        <img
                          src={`${BACKEND_URL}${loc.image}`}
                          alt={loc.propertyName || loc.location}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">
                          {loc.propertyName || loc.location}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          {loc.propertyName && (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {loc.location}
                            </>
                          )}
                          <span className="text-blue-600 font-medium">• {propertyRooms.length} rooms</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProperty(loc);
                        }}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                        title="Edit Property"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Rooms Section */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white">
                      {/* Add Room Button */}
                      <div className="p-3 border-b border-gray-100">
                        <button
                          onClick={() => {
                            setEditingRoom(null);
                            setRoomFormData({
                              roomNumber: '',
                              floor: '',
                              rentType: 'PER_ROOM',
                              rentAmount: '',
                              numberOfBeds: 0,
                              propertyId: loc._id,
                            });
                            setShowRoomForm(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Room
                        </button>
                      </div>

                      {/* Rooms List */}
                      {propertyRooms.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {propertyRooms.map((room) => (
                            <div key={room._id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  room.status === 'AVAILABLE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                  <span className="font-bold">{room.roomNumber}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-800">
                                    Room {room.roomNumber}
                                    {room.floor !== undefined && <span className="text-gray-500"> - Floor {room.floor}</span>}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span>Rs.{room.rentAmount}</span>
                                    <span className="text-gray-300">|</span>
                                    <span>{room.rentType === 'PER_BED' ? `${room.beds?.length || 0} beds` : 'Per Room'}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      room.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {room.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRoom(room);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRoom(room);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">No rooms added yet</p>
                          <p className="text-xs text-gray-400 mt-1">Add your first room to this property</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No properties added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first property to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Room Form Modal */}
      {showRoomForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gray-800 p-4 text-white">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
                <button onClick={handleCancelRoomForm} className="text-gray-400 hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleRoomSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Property <span className="text-red-500">*</span>
                </label>
                <select
                  name="propertyId"
                  value={roomFormData.propertyId}
                  onChange={handleRoomChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                >
                  <option value="">Select Property</option>
                  {properties.map((loc) => (
                    <option key={loc._id} value={loc._id}>
                      {loc.propertyName || loc.location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={roomFormData.roomNumber}
                    onChange={handleRoomChange}
                    required
                    disabled={editingRoom !== null}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100"
                    placeholder="e.g., 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Floor</label>
                  <input
                    type="number"
                    name="floor"
                    value={roomFormData.floor}
                    onChange={handleRoomChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                    placeholder="Floor"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Rent Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="rentType"
                    value={roomFormData.rentType}
                    onChange={handleRoomChange}
                    required
                    disabled={editingRoom !== null}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100"
                  >
                    <option value="PER_ROOM">Per Room</option>
                    <option value="PER_BED">Per Bed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Rent (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="rentAmount"
                    value={roomFormData.rentAmount}
                    onChange={handleRoomChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                    placeholder="Amount"
                  />
                </div>
              </div>
              {roomFormData.rentType === 'PER_BED' && !editingRoom && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Number of Beds <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="numberOfBeds"
                    value={roomFormData.numberOfBeds}
                    onChange={handleRoomChange}
                    required
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                    placeholder="How many beds?"
                  />
                </div>
              )}
              {roomFormData.rentType === 'PER_BED' && editingRoom && editingRoom.beds?.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    This room has <span className="font-bold">{editingRoom.beds.length}</span> beds configured
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelRoomForm}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-semibold transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingRoom ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Notification Settings</h2>
            <p className="text-xs text-gray-500">Manage your notification preferences</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Email Notifications</div>
              <div className="text-xs text-gray-500">Receive email updates</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Payment Reminders</div>
              <div className="text-xs text-gray-500">Get reminded about pending payments</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.payment}
                onChange={(e) => setNotifications({ ...notifications, payment: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Expiry Alerts</div>
              <div className="text-xs text-gray-500">Get notified about expiring documents</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.expiry}
                onChange={(e) => setNotifications({ ...notifications, expiry: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">About</h2>
            <p className="text-xs text-gray-500">App information</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Version</span>
            <span className="text-sm font-semibold text-gray-800">2.0.0</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">App Name</span>
            <span className="text-sm font-semibold text-gray-800">Hostel Manager</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Developer</span>
            <span className="text-sm font-semibold text-gray-800">softwarebytes</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center text-white text-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Logout</h2>
            <p className="text-xs text-gray-500">Sign out of your account</p>
          </div>
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800 mb-3">
            You will be signed out of your account and redirected to the login page.
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition font-semibold text-sm shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
