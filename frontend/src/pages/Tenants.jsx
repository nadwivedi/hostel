import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../App';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTenant, setEditingTenant] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    adharNo: '',
    adharImg: '',
    photo: '',
    dob: '',
    gender: '',
  });

  useEffect(() => {
    fetchTenants();
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For mobile field, only allow numbers and limit to 10 digits
    if (name === 'mobile') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData({
        ...formData,
        [name]: numericValue,
      });
    } else if (name === 'adharNo') {
      // For Aadhar number, only allow numbers and limit to 12 digits
      const numericValue = value.replace(/\D/g, '').slice(0, 12);
      setFormData({
        ...formData,
        [name]: numericValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileUpload = async (file, type, tenantName) => {
    if (!file) return null;

    const formDataUpload = new FormData();
    formDataUpload.append(type, file);
    formDataUpload.append('tenantName', tenantName);

    try {
      setUploading(true);
      const response = await axios.post(`${BACKEND_URL}/api/uploads/${type}`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAadharPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
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
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Upload files if selected
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
      };

      if (editingTenant) {
        await axios.patch(`${BACKEND_URL}/api/tenants/${editingTenant._id}`, tenantData, {
          withCredentials: true,
        });
        toast.success('Tenant updated successfully!');
      } else {
        await axios.post(`${BACKEND_URL}/api/tenants`, tenantData, {
          withCredentials: true,
        });
        toast.success('Tenant registered successfully!');
      }

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
      });
      fetchTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error saving tenant');
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete ${tenant.name}?`)) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/tenants/${tenant._id}`, {
        withCredentials: true,
      });
      toast.success('Tenant deleted successfully!');
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error deleting tenant');
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
    });
  };

  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.mobile.includes(searchTerm) ||
    (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 flex items-center space-x-2 sm:space-x-3">
            <span className="text-xl sm:text-3xl">👥</span>
            <span>Tenants</span>
          </h1>
          <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-2">Manage all your hostel tenants</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-md sm:shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-xl cursor-pointer text-xs sm:text-base flex-shrink-0"
        >
          <span className="sm:hidden">➕ Add</span>
          <span className="hidden sm:inline">➕ Add Tenant</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-3 sm:p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold truncate">{editingTenant ? 'Edit Tenant' : 'Register New Tenant'}</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Enter the details for the tenant.</p>
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
              {/* Section 1: Personal Information */}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Email
                    </label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Aadhar Number
                    </label>
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

              {/* Section 2: Document Uploads */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Document Uploads</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
                  {/* Aadhar Upload */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                      Aadhar Card
                    </label>
                    <div className="relative">
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
                          aadharPreview || formData.adharImg ? 'border-green-400 bg-green-50 p-1 sm:p-2' : 'border-gray-300 hover:bg-gray-50 p-3 sm:p-4 lg:p-6'
                        }`}
                      >
                        {aadharPreview ? (
                          <div className="relative w-full">
                            <img src={aadharPreview} alt="Aadhar Preview" className="w-full h-24 sm:h-32 lg:h-48 object-contain rounded" />
                            <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 text-center">
                              <span className="bg-green-600 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                                Click to change
                              </span>
                            </div>
                          </div>
                        ) : formData.adharImg ? (
                          <div className="relative w-full">
                            <img src={`${BACKEND_URL}${formData.adharImg}`} alt="Aadhar" className="w-full h-24 sm:h-32 lg:h-48 object-contain rounded" />
                            <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 text-center">
                              <span className="bg-blue-600 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                                Click to change
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-gray-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 text-center">Upload Aadhar</span>
                            <span className="text-[8px] sm:text-[10px] lg:text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block text-center">PNG, JPG, PDF</span>
                          </>
                        )}
                      </label>
                    </div>
                    {aadharFile && (
                      <div className="mt-1 sm:mt-2 p-1 sm:p-2 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-[9px] sm:text-xs text-green-700 font-medium flex items-center truncate">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate">{aadharFile.name}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                      Tenant Photo
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="photoUpload"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="photoUpload"
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-all overflow-hidden ${
                          photoPreview || formData.photo ? 'border-green-400 bg-green-50 p-1 sm:p-2' : 'border-gray-300 hover:bg-gray-50 p-3 sm:p-4 lg:p-6'
                        }`}
                      >
                        {photoPreview ? (
                          <div className="relative w-full">
                            <img src={photoPreview} alt="Photo Preview" className="w-full h-24 sm:h-32 lg:h-48 object-cover rounded" />
                            <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 text-center">
                              <span className="bg-green-600 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                                Click to change
                              </span>
                            </div>
                          </div>
                        ) : formData.photo ? (
                          <div className="relative w-full">
                            <img src={`${BACKEND_URL}${formData.photo}`} alt="Photo" className="w-full h-24 sm:h-32 lg:h-48 object-cover rounded" />
                            <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 text-center">
                              <span className="bg-blue-600 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                                Click to change
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-gray-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 text-center">Upload Photo</span>
                            <span className="text-[8px] sm:text-[10px] lg:text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block text-center">Auto-optimized to WebP</span>
                          </>
                        )}
                      </label>
                    </div>
                    {photoFile && (
                      <div className="mt-1 sm:mt-2 p-1 sm:p-2 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-[9px] sm:text-xs text-green-700 font-medium flex items-center truncate">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate">{photoFile.name}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Additional Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Additional Details</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 text-xs sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Gender
                    </label>
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
                disabled={uploading}
                className={`px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingTenant ? 'Update Tenant' : 'Add Tenant'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search by name, mobile, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 sm:px-5 py-2 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <span className="absolute left-3 sm:left-4 top-2 sm:top-3.5 text-gray-400 text-lg sm:text-xl">🔍</span>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-center sm:text-left">
              Total: <span className="font-bold text-gray-900">{filteredTenants.length}</span>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-3 p-3 sm:p-4">
          {filteredTenants.map((tenant) => (
            <div key={tenant._id} className="bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 overflow-hidden">
                    {tenant.photo ? (
                      <img
                        src={`${BACKEND_URL}${tenant.photo}`}
                        alt={tenant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      tenant.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{tenant.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">📱 {tenant.mobile}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                {tenant.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold">{tenant.email}</span>
                  </div>
                )}
                {tenant.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-semibold">{tenant.gender}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Joining Date:</span>
                  <span className="font-semibold">
                    📅 {new Date(tenant.joiningDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                </div>
               </div>
              <div className="flex gap-2 mt-2.5 sm:mt-3">
                <button
                  onClick={() => handleEdit(tenant)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-xs sm:text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(tenant)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-xs sm:text-sm font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
          {filteredTenants.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">👥</div>
              <p className="text-gray-500 text-base sm:text-lg">
                {searchTerm ? 'No tenants found matching your search' : 'No tenants registered yet'}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Joining Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant._id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                        {tenant.photo ? (
                          <img
                            src={`${BACKEND_URL}${tenant.photo}`}
                            alt={tenant.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          tenant.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{tenant.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    📱 {tenant.mobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {tenant.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {tenant.gender || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    📅 {new Date(tenant.joiningDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(tenant)}
                        className="text-blue-600 hover:text-blue-900 font-medium cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tenant)}
                        className="text-red-600 hover:text-red-900 font-medium cursor-pointer"
                      >
                        🗑️ Delete
                      </button>
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTenants.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">👥</div>
              <p className="text-gray-500 text-base sm:text-lg">
                {searchTerm ? 'No tenants found matching your search' : 'No tenants registered yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Tenants;
