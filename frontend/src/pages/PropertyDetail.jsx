import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function PropertyDetail() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [location, setLocation] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    adharNo: '',
    adharImg: '',
    photo: '',
    dob: '',
    gender: '',
    roomId: '',
    bedNumber: '',
    rentAmount: '',
    advanceAmount: '',
    joiningDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { withCredentials: true };

      const [locationsRes, tenantsRes, roomsRes, paymentsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/properties`, config),
        axios.get(`${BACKEND_URL}/api/tenants?locationId=${locationId}`, config),
        axios.get(`${BACKEND_URL}/api/rooms?locationId=${locationId}`, config),
        axios.get(`${BACKEND_URL}/api/payments?locationId=${locationId}`, config),
      ]);

      const loc = locationsRes.data.find(l => l._id === locationId);
      setLocation(loc);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading property data');
    } finally {
      setLoading(false);
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
        locationId: locationId,
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
        toast.success('Tenant added successfully!');
      }

      handleCancel();
      fetchData();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error(error.response?.data?.message || 'Error saving tenant');
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
      fetchData();
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
    setShowAdditionalDetails(false);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      adharNo: '',
      adharImg: '',
      photo: '',
      dob: '',
      gender: '',
      roomId: '',
      bedNumber: '',
      rentAmount: '',
      advanceAmount: '',
      joiningDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const filteredTenants = tenants
    .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
    .filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.mobile.includes(searchTerm)
    );

  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((acc, r) => acc + (r.beds?.length || (r.rentType === 'PER_ROOM' ? 1 : 0)), 0);
  const occupiedBeds = rooms.reduce((acc, r) => {
    if (r.rentType === 'PER_BED') {
      return acc + (r.beds?.filter(b => b.status === 'OCCUPIED').length || 0);
    }
    return acc + (r.status === 'OCCUPIED' ? 1 : 0);
  }, 0);
  const pendingPayments = payments
    .filter(p => p.status !== 'PAID')
    .reduce((acc, p) => acc + (p.rentAmount - p.amountPaid), 0);

  const selectedRoom = rooms.find(r => r._id === formData.roomId);
  const availableBeds = selectedRoom?.beds?.filter(b => b.status === 'AVAILABLE') || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-700">Property not found</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:underline">
          Go back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4 mt-1">
        {/* Total Rooms */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-500 p-2 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] lg:text-xs font-bold text-gray-500 uppercase">Rooms</p>
              <h3 className="text-base lg:text-3xl font-black text-blue-600">{totalRooms}</h3>
            </div>
            <div className="w-6 h-6 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md lg:rounded-lg flex items-center justify-center">
              <span className="text-xs lg:text-lg">🏠</span>
            </div>
          </div>
        </div>

        {/* Total Beds */}
        <div className="bg-white rounded-xl shadow-lg border border-purple-500 p-2 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] lg:text-xs font-bold text-gray-500 uppercase">Beds</p>
              <h3 className="text-base lg:text-3xl font-black text-purple-600">{totalBeds}</h3>
            </div>
            <div className="w-6 h-6 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-md lg:rounded-lg flex items-center justify-center">
              <span className="text-xs lg:text-lg">🛏️</span>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-xl shadow-lg border border-red-500 p-2 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] lg:text-xs font-bold text-gray-500 uppercase">Pending</p>
              <h3 className="text-base lg:text-3xl font-black text-red-600">₹{pendingPayments.toLocaleString()}</h3>
            </div>
            <div className="w-6 h-6 lg:w-10 lg:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-md lg:rounded-lg flex items-center justify-center">
              <span className="text-xs lg:text-lg">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tenants Section - Search & Filter */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
          <div className="relative flex-1 lg:max-w-md">
            <input
              type="text"
              placeholder="Search by name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-all bg-white"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 bg-white font-medium"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Left</option>
            </select>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tenant Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-1 sm:p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[98vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 p-2 sm:p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm sm:text-xl font-bold truncate">
                    {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
                  </h2>
                  <p className="text-gray-400 text-[10px] sm:text-sm">
                    {location.propertyName || location.location}
                  </p>
                </div>
                <button onClick={handleCancel} className="text-gray-400 hover:bg-gray-700 rounded-full p-1 sm:p-2 transition">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 space-y-2 sm:space-y-4">
              {/* Personal Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                <h3 className="text-xs sm:text-base font-bold text-gray-800 mb-2 sm:mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
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
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="Mobile"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">Aadhar No.</label>
                    <input
                      type="text"
                      name="adharNo"
                      value={formData.adharNo}
                      onChange={handleChange}
                      maxLength="12"
                      inputMode="numeric"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="12-digit"
                    />
                  </div>
                </div>
              </div>

              {/* Room Assignment */}
              <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                <h3 className="text-xs sm:text-base font-bold text-gray-800 mb-2 sm:mb-3">Room Assignment</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {/* Room row - full width */}
                  <div className="col-span-2">
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                      Room <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="roomId"
                      value={formData.roomId}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    >
                      <option value="">Select Room</option>
                      {rooms.map((room) => {
                        const availableCount = room.rentType === 'PER_BED'
                          ? room.beds?.filter(b => b.status === 'AVAILABLE').length || 0
                          : room.status === 'AVAILABLE' ? 1 : 0;
                        const isAvailable = availableCount > 0 || (editingTenant && editingTenant.roomId?._id === room._id);
                        return (
                          <option key={room._id} value={room._id} disabled={!isAvailable}>
                            Room {room.roomNumber} - ₹{room.rentAmount}
                            {room.rentType === 'PER_BED' ? ` (${availableCount} beds)` : ''}
                            {!isAvailable ? ' (Full)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Bed & Join Date row (or just Join Date if no bed) */}
                  {selectedRoom?.rentType === 'PER_BED' && (
                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Bed <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="bedNumber"
                        value={formData.bedNumber}
                        onChange={handleChange}
                        required
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
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

                  <div className={selectedRoom?.rentType === 'PER_BED' ? '' : 'col-span-2'}>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                      Join Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="joiningDate"
                      value={formData.joiningDate}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    />
                  </div>

                  {/* Rent & Advance row */}
                  <div>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                      Rent (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="rentAmount"
                      value={formData.rentAmount}
                      onChange={handleChange}
                      required
                      min="0"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="Monthly rent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">Advance (₹)</label>
                    <input
                      type="number"
                      name="advanceAmount"
                      value={formData.advanceAmount}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                      placeholder="Deposit"
                    />
                  </div>
                </div>
              </div>

              {/* Document Uploads */}
              <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                <h3 className="text-xs sm:text-base font-bold text-gray-800 mb-2 sm:mb-3">Documents</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">Aadhar Card</label>
                    <input
                      type="file"
                      id="aadharUpload"
                      accept="image/*,application/pdf"
                      onChange={handleAadharChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="aadharUpload"
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-all overflow-hidden ${
                        aadharPreview || formData.adharImg ? 'border-green-400 bg-green-50 p-1' : 'border-gray-300 hover:bg-gray-50 p-2 sm:p-4'
                      }`}
                    >
                      {aadharPreview ? (
                        <img src={aadharPreview} alt="Aadhar" className="w-full h-16 sm:h-24 object-contain rounded" />
                      ) : formData.adharImg ? (
                        <img src={`${BACKEND_URL}${formData.adharImg}`} alt="Aadhar" className="w-full h-16 sm:h-24 object-contain rounded" />
                      ) : (
                        <>
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-[10px] sm:text-xs text-gray-500">Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">Photo</label>
                    <input
                      type="file"
                      id="photoUpload"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photoUpload"
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-all overflow-hidden ${
                        photoPreview || formData.photo ? 'border-green-400 bg-green-50 p-1' : 'border-gray-300 hover:bg-gray-50 p-2 sm:p-4'
                      }`}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Photo" className="w-full h-16 sm:h-24 object-cover rounded" />
                      ) : formData.photo ? (
                        <img src={`${BACKEND_URL}${formData.photo}`} alt="Photo" className="w-full h-16 sm:h-24 object-cover rounded" />
                      ) : (
                        <>
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] sm:text-xs text-gray-500">Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Details - Collapsible */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                  className="w-full p-2 sm:p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs sm:text-base font-bold text-gray-800">Additional Details</span>
                  <svg
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform ${showAdditionalDetails ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showAdditionalDetails && (
                  <div className="p-2 sm:p-4 pt-0 sm:pt-0 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">DOB</label>
                        <input
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">Gender</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                        placeholder="Notes..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>

            <div className="border-t border-gray-200 p-2 sm:p-4 bg-gray-100 flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 sm:px-6 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold text-xs sm:text-sm"
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
                className={`px-3 sm:px-6 py-1.5 sm:py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold flex items-center gap-2 text-xs sm:text-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? 'Uploading...' : editingTenant ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewPhoto(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={previewPhoto} alt="Tenant Photo" className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedTenant(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedTenant.photo ? (
                    <img
                      src={`${BACKEND_URL}${selectedTenant.photo}`}
                      alt={selectedTenant.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                      {selectedTenant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold">{selectedTenant.name}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedTenant.status === 'ACTIVE' ? 'bg-green-400/30 text-green-100' : 'bg-gray-400/30 text-gray-200'
                    }`}>
                      {selectedTenant.status === 'ACTIVE' ? 'Active' : 'Left'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedTenant(null)} className="p-1.5 hover:bg-white/20 rounded-full transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Personal Information</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Mobile</span>
                    <a href={`tel:${selectedTenant.mobile}`} className="text-sm font-semibold text-blue-600">{selectedTenant.mobile}</a>
                  </div>
                  {selectedTenant.email && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-sm font-semibold text-gray-800">{selectedTenant.email}</span>
                    </div>
                  )}
                  {selectedTenant.adharNo && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Aadhar No.</span>
                      <span className="text-sm font-semibold text-gray-800">{selectedTenant.adharNo}</span>
                    </div>
                  )}
                  {selectedTenant.dob && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Date of Birth</span>
                      <span className="text-sm font-semibold text-gray-800">{new Date(selectedTenant.dob).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                  {selectedTenant.gender && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Gender</span>
                      <span className="text-sm font-semibold text-gray-800">{selectedTenant.gender}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Details */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Room Details</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {selectedTenant.roomId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Room</span>
                      <span className="text-sm font-semibold text-gray-800">Room {selectedTenant.roomId.roomNumber || selectedTenant.roomId}</span>
                    </div>
                  )}
                  {selectedTenant.bedNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Bed</span>
                      <span className="text-sm font-semibold text-gray-800">Bed {selectedTenant.bedNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Join Date</span>
                    <span className="text-sm font-semibold text-gray-800">{new Date(selectedTenant.joiningDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  {selectedTenant.leaveDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Leave Date</span>
                      <span className="text-sm font-semibold text-gray-800">{new Date(selectedTenant.leaveDate).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Details</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Monthly Rent</span>
                    <span className="text-sm font-bold text-green-600">₹{selectedTenant.rentAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Advance Paid</span>
                    <span className="text-sm font-semibold text-gray-800">₹{selectedTenant.advanceAmount?.toLocaleString() || 0}</span>
                  </div>
                  {(() => {
                    const tenantPayments = payments.filter(p => p.tenantId?._id === selectedTenant._id || p.tenantId === selectedTenant._id);
                    const pendingAmount = tenantPayments.filter(p => p.status !== 'PAID').reduce((acc, p) => acc + (p.rentAmount - p.amountPaid), 0);
                    const paidCount = tenantPayments.filter(p => p.status === 'PAID').length;
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Pending Amount</span>
                          <span className={`text-sm font-bold ${pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{pendingAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Payments Made</span>
                          <span className="text-sm font-semibold text-gray-800">{paidCount} payment(s)</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Documents */}
              {(selectedTenant.adharImg || selectedTenant.photo) && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Documents</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTenant.photo && (
                      <button
                        onClick={() => { setSelectedTenant(null); setPreviewPhoto(`${BACKEND_URL}${selectedTenant.photo}`); }}
                        className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition"
                      >
                        <img src={`${BACKEND_URL}${selectedTenant.photo}`} alt="Photo" className="w-full h-20 object-cover rounded" />
                        <p className="text-xs text-gray-500 mt-1 text-center">Photo</p>
                      </button>
                    )}
                    {selectedTenant.adharImg && (
                      <button
                        onClick={() => { setSelectedTenant(null); setPreviewPhoto(`${BACKEND_URL}${selectedTenant.adharImg}`); }}
                        className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition"
                      >
                        <img src={`${BACKEND_URL}${selectedTenant.adharImg}`} alt="Aadhar" className="w-full h-20 object-cover rounded" />
                        <p className="text-xs text-gray-500 mt-1 text-center">Aadhar</p>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTenant.notes && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{selectedTenant.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <button
                onClick={() => { setSelectedTenant(null); handleEdit(selectedTenant); }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              {selectedTenant.status === 'ACTIVE' && (
                <button
                  onClick={() => { setSelectedTenant(null); handleMarkAsLeft(selectedTenant); }}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm hover:bg-orange-600 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Mark as Left
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tenants List */}
      {filteredTenants.length > 0 ? (
        <div className="space-y-2">
          {filteredTenants.map((tenant) => (
            <div
              key={tenant._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
              onClick={() => setSelectedTenant(tenant)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {tenant.photo ? (
                    <div className="flex-shrink-0 h-11 w-11 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm overflow-hidden">
                      <img src={`${BACKEND_URL}${tenant.photo}`} alt={tenant.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 h-11 w-11 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-base">
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
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(tenant)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {tenant.status === 'ACTIVE' && (
                    <button onClick={() => handleMarkAsLeft(tenant)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition" title="Mark as Left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                {tenant.roomId && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold">
                    Room {tenant.roomId.roomNumber || tenant.roomId}
                    {tenant.bedNumber && ` - Bed ${tenant.bedNumber}`}
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-700 font-semibold">
                  ₹{tenant.rentAmount}/mo
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${
                  tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tenant.status === 'ACTIVE' ? 'Active' : 'Left'}
                </span>
                <span className="text-gray-400">
                  {new Date(tenant.joiningDate).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">No Tenants Found</h3>
          <p className="text-sm text-gray-500 text-center">
            {searchTerm ? 'No tenants match your search.' : 'Add your first tenant.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;
