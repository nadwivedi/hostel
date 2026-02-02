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

  // Building state
  const [buildings, setBuildings] = useState([]);
  const [propertyBuildings, setPropertyBuildings] = useState([]); // Buildings for current property form
  const [newBuildingName, setNewBuildingName] = useState('');

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
    buildingId: '',
  });
  const [expandedPropertyId, setExpandedPropertyId] = useState(null);
  const [expandedBuildingIds, setExpandedBuildingIds] = useState({});
  const [roomPropertyBuildings, setRoomPropertyBuildings] = useState([]); // Buildings for selected property in room form

  useEffect(() => {
    fetchProperties();
    fetchRooms();
    fetchAllBuildings();
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

  const fetchAllBuildings = async () => {
    try {
      // Fetch buildings for all properties
      const propertiesRes = await axios.get(`${BACKEND_URL}/api/properties`, {
        withCredentials: true,
      });
      const allBuildings = [];
      for (const prop of propertiesRes.data) {
        const buildingsRes = await axios.get(`${BACKEND_URL}/api/buildings/property/${prop._id}`, {
          withCredentials: true,
        });
        allBuildings.push(...buildingsRes.data);
      }
      setBuildings(allBuildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchBuildingsForProperty = async (propertyId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/buildings/property/${propertyId}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching buildings:', error);
      return [];
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

  const handleEditProperty = async (prop) => {
    setEditingProperty(prop);
    setPropertyFormData({
      name: prop.name,
      location: prop.location,
      propertyType: prop.propertyType || 'hostel',
    });
    setPropertyImage(null);
    setPropertyImagePreview(prop.image ? `${BACKEND_URL}${prop.image}` : null);
    // Fetch existing buildings for this property
    const existingBuildings = await fetchBuildingsForProperty(prop._id);
    setPropertyBuildings(existingBuildings);
    setNewBuildingName('');
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

      let propertyId;
      if (editingProperty) {
        await axios.patch(`${BACKEND_URL}/api/properties/${editingProperty._id}`, propertyPayload, {
          withCredentials: true,
        });
        propertyId = editingProperty._id;
        toast.success('Property updated successfully!');
      } else {
        const res = await axios.post(`${BACKEND_URL}/api/properties`, { userId, ...propertyPayload }, {
          withCredentials: true,
        });
        propertyId = res.data.data?._id || res.data._id;
        toast.success('Property added successfully!');
      }

      // Handle buildings - add new ones, delete removed ones
      if (propertyId) {
        // Get existing buildings for this property
        const existingBuildings = editingProperty ? await fetchBuildingsForProperty(propertyId) : [];

        // Delete buildings that were removed
        for (const existing of existingBuildings) {
          if (!propertyBuildings.some(b => b._id === existing._id)) {
            try {
              await axios.delete(`${BACKEND_URL}/api/buildings/${existing._id}`, {
                withCredentials: true,
              });
            } catch (err) {
              console.error('Error deleting building:', err);
            }
          }
        }

        // Add new buildings
        for (const building of propertyBuildings) {
          if (building.isNew) {
            try {
              await axios.post(`${BACKEND_URL}/api/buildings`, {
                propertyId,
                name: building.name,
                userId,
              }, {
                withCredentials: true,
              });
            } catch (err) {
              console.error('Error creating building:', err);
            }
          }
        }
      }

      setShowPropertyForm(false);
      setEditingProperty(null);
      setPropertyFormData({ name: '', location: '', propertyType: 'hostel' });
      setPropertyImage(null);
      setPropertyImagePreview(null);
      setPropertyBuildings([]);
      setNewBuildingName('');
      fetchProperties();
      fetchAllBuildings();
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
    setPropertyBuildings([]);
    setNewBuildingName('');
  };

  // Building handlers for property form
  const handleAddBuildingToList = () => {
    if (!newBuildingName.trim()) return;
    // Check if building name already exists
    if (propertyBuildings.some(b => b.name.toLowerCase() === newBuildingName.trim().toLowerCase())) {
      toast.error('Building name already exists');
      return;
    }
    setPropertyBuildings([...propertyBuildings, { name: newBuildingName.trim(), isNew: true }]);
    setNewBuildingName('');
  };

  const handleRemoveBuildingFromList = (index) => {
    const building = propertyBuildings[index];
    // Check if building has rooms before removing
    if (building._id) {
      const buildingRooms = rooms.filter(r => r.buildingId?._id === building._id || r.buildingId === building._id);
      if (buildingRooms.length > 0) {
        toast.error(`Cannot remove ${building.name}. It has ${buildingRooms.length} room(s).`);
        return;
      }
    }
    setPropertyBuildings(propertyBuildings.filter((_, i) => i !== index));
  };

  // Room handlers
  const handleRoomChange = async (e) => {
    const { name, value } = e.target;
    setRoomFormData({
      ...roomFormData,
      [name]: value,
    });

    // If property changed, fetch buildings for that property
    if (name === 'propertyId' && value) {
      const propBuildings = await fetchBuildingsForProperty(value);
      setRoomPropertyBuildings(propBuildings);
      // Reset buildingId if property changed
      setRoomFormData(prev => ({ ...prev, propertyId: value, buildingId: '' }));
    }
  };

  const handleEditRoom = async (room) => {
    setEditingRoom(room);
    const propertyId = room.propertyId?._id || room.propertyId || '';
    setRoomFormData({
      roomNumber: room.roomNumber,
      floor: room.floor || '',
      rentType: room.rentType,
      rentAmount: room.rentAmount,
      numberOfBeds: room.beds?.length || 0,
      propertyId: propertyId,
      buildingId: room.buildingId?._id || room.buildingId || '',
    });
    // Fetch buildings for this property
    if (propertyId) {
      const propBuildings = await fetchBuildingsForProperty(propertyId);
      setRoomPropertyBuildings(propBuildings);
    } else {
      setRoomPropertyBuildings([]);
    }
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
        buildingId: roomFormData.buildingId || null,
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
      buildingId: '',
    });
    setRoomPropertyBuildings([]);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleBuildingExpanded = (propertyId, buildingId) => {
    const key = `${propertyId}:${buildingId}`;
    setExpandedBuildingIds(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Properties Management */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-gray-200 p-2.5 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-md sm:rounded-lg flex items-center justify-center text-white">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-800">Properties</h2>
              <p className="text-[10px] sm:text-xs text-gray-500">Manage your properties</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingProperty(null);
              setPropertyFormData({ name: '', location: '', propertyType: 'hostel' });
              setPropertyImage(null);
              setPropertyImagePreview(null);
              setPropertyBuildings([]);
              setNewBuildingName('');
              setShowPropertyForm(true);
            }}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 text-white rounded-md sm:rounded-lg hover:bg-gray-800 font-semibold text-[11px] sm:text-sm transition flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add</span>
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

                {/* Buildings Section */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Buildings <span className="text-gray-400 text-xs font-normal">(Optional - for large properties)</span>
                  </label>

                  {/* Add Building Input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newBuildingName}
                      onChange={(e) => setNewBuildingName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBuildingToList())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                      placeholder="e.g., Building A, Block 1"
                    />
                    <button
                      type="button"
                      onClick={handleAddBuildingToList}
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>

                  {/* Buildings List */}
                  {propertyBuildings.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {propertyBuildings.map((building, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-700 text-white rounded flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">{building.name}</span>
                            {building.isNew && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">New</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBuildingFromList(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">No buildings added. Rooms will be directly under property.</p>
                  )}
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
        <div className="space-y-1.5 sm:space-y-2">
          {properties.length > 0 ? (
            properties.map((loc) => {
              const propertyRooms = rooms.filter(r => (r.propertyId?._id || r.propertyId) === loc._id);
              const isExpanded = expandedPropertyId === loc._id;

              return (
                <div key={loc._id} className="border border-gray-200 rounded-md sm:rounded-lg overflow-hidden">
                  {/* Property Header - Clickable to expand/collapse */}
                  <div
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                    onClick={() => setExpandedPropertyId(isExpanded ? null : loc._id)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {loc.image ? (
                        <img
                          src={`${BACKEND_URL}${loc.image}`}
                          alt={loc.name || loc.location}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 flex-shrink-0">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                          {loc.name || loc.location}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 sm:gap-2 mt-0.5">
                          {loc.name && loc.location && (
                            <span className="truncate max-w-[100px] sm:max-w-none">{loc.location}</span>
                          )}
                          <span className="text-blue-600 font-medium flex-shrink-0">• {propertyRooms.length} rooms</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProperty(loc);
                        }}
                        className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition"
                        title="Edit Property"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <svg
                        className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                      <div className="p-2 sm:p-3 border-b border-gray-100">
                        <button
                          onClick={async () => {
                            setEditingRoom(null);
                            // Fetch buildings for this property
                            const propBuildings = await fetchBuildingsForProperty(loc._id);
                            setRoomPropertyBuildings(propBuildings);
                            setRoomFormData({
                              roomNumber: '',
                              floor: '',
                              rentType: 'PER_ROOM',
                              rentAmount: '',
                              numberOfBeds: 0,
                              propertyId: loc._id,
                              buildingId: '',
                            });
                            setShowRoomForm(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 bg-gray-700 text-white rounded-md sm:rounded-lg hover:bg-gray-800 transition font-medium text-xs sm:text-sm"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Room
                        </button>
                      </div>

                      {/* Rooms List - Grouped by Building */}
                      {propertyRooms.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {(() => {
                            const propertyBuildings = buildings.filter(
                              (b) => (b.propertyId?._id || b.propertyId) === loc._id,
                            );
                            const roomsWithoutBuilding = propertyRooms.filter(
                              (r) => !r.buildingId,
                            );
                            const renderRooms = (roomsForBuilding) => (
                              <div className="divide-y divide-gray-100">
                                {roomsForBuilding.map((room) => (
                                  <div key={room._id} className="p-2 sm:p-3 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        room.status === 'AVAILABLE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                      }`}>
                                        <span className="font-bold text-xs sm:text-sm">{room.roomNumber}</span>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-medium text-gray-800">
                                          Room {room.roomNumber}
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 sm:gap-2 flex-wrap">
                                          <span>Rs.{room.rentAmount}</span>
                                          <span className="text-gray-300">|</span>
                                          <span>{room.rentType === 'PER_BED' ? `${room.beds?.length || 0} beds` : 'Room'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditRoom(room);
                                        }}
                                        className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                                        title="Edit"
                                      >
                                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteRoom(room);
                                        }}
                                        className="p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded-md transition"
                                        title="Delete"
                                      >
                                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );

                            if (propertyBuildings.length === 0) {
                              return <div className="p-2 sm:p-3">{renderRooms(propertyRooms)}</div>;
                            }

                            return (
                              <div className="space-y-1.5 sm:space-y-2 p-2 sm:p-3">
                                {propertyBuildings.map((building) => {
                                  const buildingRooms = propertyRooms.filter((r) => {
                                    const roomBuildingId = r.buildingId?._id || r.buildingId;
                                    return roomBuildingId === building._id;
                                  });
                                  const key = `${loc._id}:${building._id}`;
                                  const isBuildingExpanded = !!expandedBuildingIds[key];
                                  return (
                                    <div key={building._id} className="border border-gray-100 rounded-md sm:rounded-lg overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => toggleBuildingExpanded(loc._id, building._id)}
                                        className="w-full flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 hover:bg-gray-100 transition"
                                      >
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                          <span className="text-[10px] sm:text-xs font-semibold text-gray-700">
                                            {building.name || building.buildingName || 'Building'}
                                          </span>
                                          <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                            {buildingRooms.length} rooms
                                          </span>
                                        </div>
                                        <svg
                                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform ${isBuildingExpanded ? 'rotate-180' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                      {isBuildingExpanded && renderRooms(buildingRooms)}
                                    </div>
                                  );
                                })}

                                {roomsWithoutBuilding.length > 0 && (
                                  <div className="border border-gray-100 rounded-md sm:rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => toggleBuildingExpanded(loc._id, 'no-building')}
                                      className="w-full flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 hover:bg-gray-100 transition"
                                    >
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        <span className="text-[10px] sm:text-xs font-semibold text-gray-700">No Building</span>
                                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                          {roomsWithoutBuilding.length} rooms
                                        </span>
                                      </div>
                                      <svg
                                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform ${expandedBuildingIds[`${loc._id}:no-building`] ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                    {expandedBuildingIds[`${loc._id}:no-building`] && renderRooms(roomsWithoutBuilding)}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="p-4 sm:p-6 text-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500">No rooms added yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 sm:py-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">No properties added yet</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Add your first property to get started</p>
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
                      {loc.name}{loc.location ? ` - ${loc.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Building Dropdown - Only show if property has buildings */}
              {roomPropertyBuildings.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Building <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="buildingId"
                    value={roomFormData.buildingId}
                    onChange={handleRoomChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="">Select Building</option>
                    {roomPropertyBuildings.map((building) => (
                      <option key={building._id} value={building._id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-gray-200 p-2.5 sm:p-5">
        <div className="flex items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4">
          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-md sm:rounded-lg flex items-center justify-center text-white">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-800">Notifications</h2>
            <p className="text-[10px] sm:text-xs text-gray-500">Notification preferences</p>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-xs sm:text-sm">Email Notifications</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Receive email updates</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-xs sm:text-sm">Payment Reminders</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Pending payment alerts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.payment}
                onChange={(e) => setNotifications({ ...notifications, payment: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg hover:bg-gray-100 transition">
            <div>
              <div className="font-semibold text-gray-800 text-xs sm:text-sm">Expiry Alerts</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Document expiry notifications</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.expiry}
                onChange={(e) => setNotifications({ ...notifications, expiry: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-gray-200 p-2.5 sm:p-5">
        <div className="flex items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4">
          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-green-500 to-teal-600 rounded-md sm:rounded-lg flex items-center justify-center text-white">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-800">About</h2>
            <p className="text-[10px] sm:text-xs text-gray-500">App information</p>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
            <span className="text-xs sm:text-sm text-gray-600">Version</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-800">2.0.0</span>
          </div>
          <div className="flex justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
            <span className="text-xs sm:text-sm text-gray-600">App Name</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-800">Hostel Manager</span>
          </div>
          <div className="flex justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
            <span className="text-xs sm:text-sm text-gray-600">Developer</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-800">softwarebytes</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-red-200 p-2.5 sm:p-5">
        <div className="flex items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4">
          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-md sm:rounded-lg flex items-center justify-center text-white">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-800">Logout</h2>
            <p className="text-[10px] sm:text-xs text-gray-500">Sign out of your account</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-md sm:rounded-lg transition font-semibold text-xs sm:text-sm shadow-md"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Settings;
