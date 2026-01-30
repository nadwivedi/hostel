import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [locations, setLocations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [editingTenant, setEditingTenant] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    adharNo: '',
    adharImg: '',
    photo: '',
    dob: '',
    gender: '',
    locationId: '',
    roomId: '',
    bedNumber: '',
    rentAmount: '',
    advanceAmount: '',
    joiningDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchTenants();
    fetchLocations();
    fetchRooms();
  }, []);

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

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/properties`, {
        withCredentials: true,
      });
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
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

    if (name === 'mobile') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === 'adharNo') {
      const numericValue = value.replace(/\D/g, '').slice(0, 12);
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === 'locationId') {
      setFormData({ ...formData, locationId: value, roomId: '', bedNumber: '', rentAmount: '' });
    } else if (name === 'roomId') {
      const selectedRoom = rooms.find(r => r._id === value);
      setFormData({
        ...formData,
        roomId: value,
        bedNumber: '',
        rentAmount: selectedRoom ? selectedRoom.rentAmount : '',
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = async (file, type, tenantName) => {
    if (!file) return null;

    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return null;
    }

    const formDataUpload = new FormData();
    formDataUpload.append(type, file);
    formDataUpload.append('tenantName', tenantName);
    formDataUpload.append('userId', userId);

    try {
      setUploading(true);
      const response = await axios.post(`${BACKEND_URL}/api/uploads/${type}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setUploading(false);
      return response.data.fileUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setUploading(false);
      toast.error(`Error uploading ${type}`);
      return null;
    }
  };

  const handleAadharChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAadharFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAadharPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setAadharFile(null);
    setPhotoFile(null);
    setAadharPreview(null);
    setPhotoPreview(null);
    setFormData({
      name: tenant.name,
      mobile: tenant.mobile,
      email: tenant.email || '',
      adharNo: tenant.adharNo || '',
      adharImg: tenant.adharImg || '',
      photo: tenant.photo || '',
      dob: tenant.dob ? new Date(tenant.dob).toISOString().split('T')[0] : '',
      gender: tenant.gender || '',
      locationId: tenant.locationId?._id || tenant.locationId || '',
      roomId: tenant.roomId?._id || tenant.roomId || '',
      bedNumber: tenant.bedNumber || '',
      rentAmount: tenant.rentAmount || '',
      advanceAmount: tenant.advanceAmount || '',
      joiningDate: tenant.joiningDate ? new Date(tenant.joiningDate).toISOString().split('T')[0] : '',
      notes: tenant.notes || '',
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
      let aadharUrl = formData.adharImg;
      let photoUrl = formData.photo;

      if (aadharFile) {
        aadharUrl = await handleFileUpload(aadharFile, 'aadhar', formData.name);
      }

      if (photoFile) {
        photoUrl = await handleFileUpload(photoFile, 'photo', formData.name);
      }

      const tenantData = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || undefined,
        adharNo: formData.adharNo || undefined,
        adharImg: aadharUrl || undefined,
        photo: photoUrl || undefined,
        dob: formData.dob || undefined,
        ...(formData.gender && { gender: formData.gender }),
        locationId: formData.locationId || undefined,
        roomId: formData.roomId || undefined,
        bedNumber: formData.bedNumber || undefined,
        rentAmount: formData.rentAmount ? parseFloat(formData.rentAmount) : undefined,
        advanceAmount: formData.advanceAmount ? parseFloat(formData.advanceAmount) : 0,
        joiningDate: formData.joiningDate || undefined,
        notes: formData.notes || '',
      };

      if (editingTenant) {
        await axios.patch(`${BACKEND_URL}/api/tenants/${editingTenant._id}`, { userId, ...tenantData }, {
          withCredentials: true,
        });
        toast.success('Tenant updated successfully!');
      } else {
        await axios.post(`${BACKEND_URL}/api/tenants`, { userId, ...tenantData }, {
          withCredentials: true,
        });
        toast.success('Tenant registered successfully!');
      }

      handleCancel();
      fetchTenants();
      fetchRooms();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error(error.response?.data?.message || 'Error saving tenant');
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete ${tenant.name}?`)) return;

    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/tenants/${tenant._id}`, {
        data: { userId },
        withCredentials: true,
      });
      toast.success('Tenant deleted successfully!');
      fetchTenants();
      fetchRooms();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error(error.response?.data?.message || 'Error deleting tenant');
    }
  };

  const handleMarkAsLeft = async (tenant) => {
    if (!window.confirm(`Mark ${tenant.name} as left?`)) return;

    const userId = user?.id || user?._id;
    try {
      await axios.patch(`${BACKEND_URL}/api/tenants/${tenant._id}`, {
        userId,
        status: 'COMPLETED',
        leaveDate: new Date(),
      }, { withCredentials: true });
      toast.success('Tenant marked as left');
      fetchTenants();
      fetchRooms();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Error updating tenant status');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTenant(null);
    setAadharFile(null);
    setPhotoFile(null);
    setAadharPreview(null);
    setPhotoPreview(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      adharNo: '',
      adharImg: '',
      photo: '',
      dob: '',
      gender: '',
      locationId: '',
      roomId: '',
      bedNumber: '',
      rentAmount: '',
      advanceAmount: '',
      joiningDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const filteredTenants = tenants
    .filter((tenant) => {
      if (filterStatus === 'ALL') return true;
      return tenant.status === filterStatus;
    })
    .filter((tenant) => {
      if (filterLocation === 'ALL') return true;
      const tenantLocId = tenant.locationId?._id || tenant.locationId;
      return tenantLocId === filterLocation;
    })
    .filter((tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.mobile.includes(searchTerm) ||
      (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const filteredRooms = formData.locationId
    ? rooms.filter(r => (r.locationId?._id || r.locationId) === formData.locationId)
    : rooms;

  const selectedRoom = rooms.find(r => r._id === formData.roomId);

  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const completedTenants = tenants.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3 mt-2 sm:mt-0">
        <div className="bg-white rounded-xl shadow-lg border border-blue-500 p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase">Total</p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-800">{tenants.length}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-lg">👥</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-green-500 p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase">Active</p>
              <h3 className="text-xl lg:text-3xl font-black text-green-600">{activeTenants}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-lg">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-400 p-3 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase">Left</p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-600">{completedTenants}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-lg">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <input
                type="text"
                placeholder="Search by name, mobile, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-all bg-white shadow-sm"
              />
              <svg className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-2 flex-wrap">
              {locations.length > 0 && (
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="px-3 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 bg-white shadow-sm font-medium"
                >
                  <option value="ALL">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc._id} value={loc._id}>{loc.propertyName || loc.location}</option>
                  ))}
                </select>
              )}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 bg-white shadow-sm font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Left</option>
              </select>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 lg:px-6 py-3 bg-gray-700 text-white rounded-xl hover:shadow-xl font-bold text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden lg:inline">Add Tenant</span>
                <span className="lg:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 p-3 sm:p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold truncate">{editingTenant ? 'Edit Tenant' : 'Register New Tenant'}</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Enter the details for the tenant.</p>
                </div>
                <button onClick={handleCancel} className="text-gray-400 hover:bg-gray-700 rounded-full p-1.5 sm:p-2 transition flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
              {/* Personal Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      required
                      maxLength="10"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Aadhar Number</label>
                    <input
                      type="text"
                      name="adharNo"
                      value={formData.adharNo}
                      onChange={handleChange}
                      maxLength="12"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="12-digit Aadhar number"
                    />
                  </div>
                </div>
              </div>

              {/* Room Assignment */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Room Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                    <select
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    >
                      <option value="">Select Location (optional)</option>
                      {locations.map((loc) => (
                        <option key={loc._id} value={loc._id}>
                          {loc.propertyName || loc.location}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Room</label>
                    <select
                      name="roomId"
                      value={formData.roomId}
                      onChange={handleChange}
                      disabled={!formData.locationId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 disabled:bg-gray-100"
                    >
                      <option value="">Select Room (optional)</option>
                      {filteredRooms.map((room) => {
                        const availableCount = room.rentType === 'PER_BED'
                          ? room.beds?.filter(b => b.status === 'AVAILABLE').length || 0
                          : room.status === 'AVAILABLE' ? 1 : 0;
                        const isAvailable = availableCount > 0 || (editingTenant && editingTenant.roomId?._id === room._id);
                        return (
                          <option key={room._id} value={room._id} disabled={!isAvailable}>
                            Room {room.roomNumber} - Rs.{room.rentAmount}
                            {room.rentType === 'PER_BED' ? ` (${availableCount} beds)` : ''}
                            {!isAvailable ? ' (Full)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedRoom?.rentType === 'PER_BED' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Bed</label>
                      <select
                        name="bedNumber"
                        value={formData.bedNumber}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      >
                        <option value="">Select Bed</option>
                        {selectedRoom.beds?.map((bed) => {
                          const isCurrentBed = editingTenant?.bedNumber === bed.bedNumber;
                          const isAvailable = bed.status === 'AVAILABLE' || isCurrentBed;
                          return (
                            <option key={bed.bedNumber} value={bed.bedNumber} disabled={!isAvailable}>
                              Bed {bed.bedNumber} {!isAvailable ? '(Occupied)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Rent Amount (Rs.)</label>
                    <input
                      type="number"
                      name="rentAmount"
                      value={formData.rentAmount}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="Monthly rent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Advance Amount (Rs.)</label>
                    <input
                      type="number"
                      name="advanceAmount"
                      value={formData.advanceAmount}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="Security deposit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Joining Date</label>
                    <input
                      type="date"
                      name="joiningDate"
                      value={formData.joiningDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Document Uploads */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Document Uploads</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Aadhar Card</label>
                    <input type="file" id="aadharUpload" accept="image/*,application/pdf" onChange={handleAadharChange} className="hidden" />
                    <label
                      htmlFor="aadharUpload"
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-all overflow-hidden ${
                        aadharPreview || formData.adharImg ? 'border-green-400 bg-green-50 p-1 sm:p-2' : 'border-gray-300 hover:bg-gray-50 p-3 sm:p-4 lg:p-6'
                      }`}
                    >
                      {aadharPreview ? (
                        <img src={aadharPreview} alt="Aadhar" className="w-full h-24 sm:h-32 lg:h-48 object-contain rounded" />
                      ) : formData.adharImg ? (
                        <img src={`${BACKEND_URL}${formData.adharImg}`} alt="Aadhar" className="w-full h-24 sm:h-32 lg:h-48 object-contain rounded" />
                      ) : (
                        <>
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-gray-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 text-center">Upload Aadhar</span>
                        </>
                      )}
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Tenant Photo</label>
                    <input type="file" id="photoUpload" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <label
                      htmlFor="photoUpload"
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-all overflow-hidden ${
                        photoPreview || formData.photo ? 'border-green-400 bg-green-50 p-1 sm:p-2' : 'border-gray-300 hover:bg-gray-50 p-3 sm:p-4 lg:p-6'
                      }`}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Photo" className="w-full h-24 sm:h-32 lg:h-48 object-cover rounded" />
                      ) : formData.photo ? (
                        <img src={`${BACKEND_URL}${formData.photo}`} alt="Photo" className="w-full h-24 sm:h-32 lg:h-48 object-cover rounded" />
                      ) : (
                        <>
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-gray-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 text-center">Upload Photo</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Additional Details</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 text-xs sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 text-xs sm:text-base"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </form>

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
                disabled={uploading}
                className={`px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? 'Uploading...' : editingTenant ? 'Update Tenant' : 'Add Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewPhoto(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 transition">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={previewPhoto} alt="Tenant Photo" className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {/* Tenants List */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {filteredTenants.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredTenants.map((tenant) => (
                <div key={tenant._id} className="p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {tenant.photo ? (
                        <button
                          onClick={() => setPreviewPhoto(`${BACKEND_URL}${tenant.photo}`)}
                          className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all"
                        >
                          <img src={`${BACKEND_URL}${tenant.photo}`} alt={tenant.name} className="w-full h-full object-cover rounded-full" />
                        </button>
                      ) : (
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-900">{tenant.name}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {tenant.mobile}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(tenant)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {tenant.status === 'ACTIVE' && (
                        <button onClick={() => handleMarkAsLeft(tenant)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 cursor-pointer" title="Mark as Left">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </button>
                      )}
                      <button onClick={() => handleDelete(tenant)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {tenant.locationId && (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold">
                        {tenant.locationId.propertyName || tenant.locationId.location}
                      </span>
                    )}
                    {tenant.roomId && (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-purple-100 text-purple-700 font-semibold">
                        Room {tenant.roomId.roomNumber || tenant.roomId}
                        {tenant.bedNumber && ` - Bed ${tenant.bedNumber}`}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg font-semibold ${
                      tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tenant.status === 'ACTIVE' ? 'Active' : 'Left'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Tenants Found</h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {searchTerm ? 'No tenants match your search criteria.' : 'Get started by adding your first tenant.'}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase">Name</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase">Mobile</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase">Location</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase">Room</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase">Status</th>
                <th className="px-4 py-4 text-center text-sm font-bold text-white uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <tr key={tenant._id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        {tenant.photo ? (
                          <button
                            onClick={() => setPreviewPhoto(`${BACKEND_URL}${tenant.photo}`)}
                            className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all"
                          >
                            <img src={`${BACKEND_URL}${tenant.photo}`} alt={tenant.name} className="w-full h-full object-cover rounded-full" />
                          </button>
                        ) : (
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{tenant.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">{tenant.mobile}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {tenant.locationId?.propertyName || tenant.locationId?.location || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {tenant.roomId ? (
                        <span>
                          Room {tenant.roomId.roomNumber || tenant.roomId}
                          {tenant.bedNumber && ` - Bed ${tenant.bedNumber}`}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg font-semibold text-xs ${
                        tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {tenant.status === 'ACTIVE' ? 'Active' : 'Left'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(tenant)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer" title="Edit">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {tenant.status === 'ACTIVE' && (
                          <button onClick={() => handleMarkAsLeft(tenant)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 cursor-pointer" title="Mark as Left">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => handleDelete(tenant)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer" title="Delete">
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
                  <td colSpan="6" className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 mb-2">No Tenants Found</h3>
                      <p className="text-sm text-gray-500 text-center max-w-xs">
                        {searchTerm ? 'No tenants match your search criteria.' : 'Get started by adding your first tenant.'}
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

export default Tenants;
