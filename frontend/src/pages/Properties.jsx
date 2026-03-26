import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';
import PropertyFormModal from '../components/properties/PropertyFormModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Default property image placeholder
const DEFAULT_PROPERTY_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PHJlY3QgZmlsbD0iI2YzZjRmNiIgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiLz48cGF0aCBmaWxsPSIjZDFkNWRiIiBkPSJNMjAwIDgwbDgwIDYwdjgwaC0xNjB2LTgwbDgwLTYwem0wIDIwbC02MCA0NXY1NWgxMjB2LTU1bC02MC00NXoiLz48cmVjdCBmaWxsPSIjZDFkNWRiIiB4PSIxNzAiIHk9IjE2MCIgd2lkdGg9IjI1IiBoZWlnaHQ9IjQwIi8+PHJlY3QgZmlsbD0iI2QxZDVkYiIgeD0iMjA1IiB5PSIxNjAiIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MCIvPjwvc3ZnPg==';

// Property type icons and colors
const PROPERTY_TYPE_CONFIG = {
  hostel: { icon: '🏨', color: 'bg-blue-500', label: 'Hostel' },
  resident: { icon: '🏠', color: 'bg-green-500', label: 'Resident' },
  shop: { icon: '🏪', color: 'bg-purple-500', label: 'Shop' },
};

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.properties)) return payload.properties;
  return [];
};

function Properties() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [submittingProperty, setSubmittingProperty] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { withCredentials: true };

      const [propertiesRes, tenantsRes, roomsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/properties`, config),
        axios.get(`${BACKEND_URL}/api/tenants?status=ACTIVE`, config),
        axios.get(`${BACKEND_URL}/api/rooms`, config),
      ]);

      const propertiesList = toArray(propertiesRes.data);
      const tenantsList = toArray(tenantsRes.data);
      const roomsList = toArray(roomsRes.data);
      setProperties(propertiesList);

      // Calculate stats per property
      const propertyStats = {};
      propertiesList.forEach(prop => {
        const propTenants = tenantsList.filter(t => t.propertyId?._id === prop._id || t.propertyId === prop._id);
        const propRooms = roomsList.filter(r => r.propertyId?._id === prop._id || r.propertyId === prop._id);

        const totalBeds = propRooms.reduce((acc, r) => {
          if (r.rentType === 'PER_BED') {
            return acc + (r.beds?.length || 0);
          }
          return acc + 1;
        }, 0);

        const occupiedBeds = propRooms.reduce((acc, r) => {
          if (r.rentType === 'PER_BED') {
            return acc + (r.beds?.filter(b => b.status === 'OCCUPIED').length || 0);
          }
          return acc + (r.status === 'OCCUPIED' ? 1 : 0);
        }, 0);

        propertyStats[prop._id] = {
          rooms: propRooms.length,
          tenants: propTenants.length,
          totalBeds,
          occupiedBeds,
          availableBeds: totalBeds - occupiedBeds,
        };
      });

      setStats(propertyStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  const uploadPropertyImage = async (imageFile, propertyName) => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('propertyName', propertyName);

    const uploadRes = await axios.post(`${BACKEND_URL}/api/uploads/property`, formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return uploadRes.data.fileUrl;
  };

  const createRoomsForProperty = async (propertyId, roomDrafts) => {
    const userId = user?.id || user?._id;

    for (const room of roomDrafts) {
      const beds = room.rentType === 'PER_BED'
        ? Array.from({ length: Number(room.numberOfBeds) || 0 }, (_, index) => ({
            bedNumber: String(index + 1),
            status: 'AVAILABLE',
          }))
        : [];

      await axios.post(
        `${BACKEND_URL}/api/rooms`,
        {
          userId,
          propertyId,
          roomNumber: room.roomNumber,
          floor: room.floor ? Number(room.floor) : undefined,
          rentType: room.rentType,
          rentAmount: Number(room.rentAmount),
          beds,
        },
        { withCredentials: true }
      );
    }
  };

  const handleAddProperty = async (payload) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    try {
      setSubmittingProperty(true);
      const imageUrl = await uploadPropertyImage(payload.imageFile, payload.name);
      const propertyRes = await axios.post(
        `${BACKEND_URL}/api/properties`,
        {
          userId,
          name: payload.name,
          location: payload.location,
          propertyType: payload.propertyType,
          image: imageUrl,
        },
        { withCredentials: true }
      );

      const newPropertyId = propertyRes.data.data?._id || propertyRes.data._id;
      if (payload.rooms.length) {
        await createRoomsForProperty(newPropertyId, payload.rooms);
      }

      toast.success('Property added successfully!');
      setShowAddPropertyModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error adding property:', error);
      toast.error(error.response?.data?.message || 'Failed to add property');
    } finally {
      setSubmittingProperty(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {!loading && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-sm">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4 6 4v14M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Properties</p>
              <h2 className="text-xl font-bold leading-none text-gray-900">{properties.length}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPropertyModal(true)}
            className="rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600"
          >
            Add Property
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
        </div>
      ) : properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-2">
          {properties.map((property) => {
            const propStats = stats[property._id] || { rooms: 0, tenants: 0, totalBeds: 0, availableBeds: 0 };
            const occupancyRate = propStats.totalBeds > 0
              ? Math.round(((propStats.totalBeds - propStats.availableBeds) / propStats.totalBeds) * 100)
              : 0;

            const propertyImage = property.image
              ? `${BACKEND_URL}${property.image}`
              : DEFAULT_PROPERTY_IMAGE;

            const typeConfig = PROPERTY_TYPE_CONFIG[property.propertyType] || PROPERTY_TYPE_CONFIG.hostel;

            return (
              <div
                key={property._id}
                onClick={() => handlePropertyClick(property._id)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-300 cursor-pointer hover:scale-[1.02] transform group"
              >
                {/* Property Image */}
                <div className="relative h-36 sm:h-56 overflow-hidden">
                  <img
                    src={propertyImage}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = DEFAULT_PROPERTY_IMAGE;
                    }}
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {/* Property Type Badge */}
                  <div className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded-full text-[8px] sm:text-xs font-bold shadow-lg ${typeConfig.color} text-white flex items-center gap-0.5 sm:gap-1`}>
                    <span className="text-[10px] sm:text-sm">{typeConfig.icon}</span>
                    <span>{typeConfig.label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/properties/${property._id}/edit`);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-gray-700 shadow-lg transition hover:scale-105 hover:bg-white"
                    title="Edit Property"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Property Name on Image */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-4">
                    <h3 className="text-xs sm:text-2xl font-bold text-white drop-shadow-lg truncate">
                      {property.name}
                    </h3>
                    <p className="text-[9px] sm:text-sm text-white/90 flex items-center mt-0.5 drop-shadow">
                      <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {property.location}
                    </p>
                  </div>

                  {/* Occupancy Badge */}
                </div>

                {/* Bottom Stats Strip */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-2 sm:px-4 py-1.5 sm:py-3">
                  <div className="flex items-center justify-between text-white">
                    {/* Rooms */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-5 h-5 sm:w-8 sm:h-8 bg-blue-500/20 rounded-md sm:rounded-lg flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-lg font-bold">{propStats.rooms}</div>
                        <div className="text-[7px] sm:text-[10px] text-gray-400 uppercase">Rooms</div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 sm:h-10 bg-gray-600"></div>

                    {/* Tenants */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-5 h-5 sm:w-8 sm:h-8 bg-green-500/20 rounded-md sm:rounded-lg flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-lg font-bold">{propStats.tenants}</div>
                        <div className="text-[7px] sm:text-[10px] text-gray-400 uppercase">Tenants</div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 sm:h-10 bg-gray-600"></div>

                    {/* Available */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-5 h-5 sm:w-8 sm:h-8 bg-purple-500/20 rounded-md sm:rounded-lg flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-lg font-bold">{propStats.availableBeds}</div>
                        <div className="text-[7px] sm:text-[10px] text-gray-400 uppercase">Available</div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 sm:h-10 bg-gray-600"></div>

                    {/* Occupancy */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center ${
                        occupancyRate >= 80 ? 'bg-green-500/20' :
                        occupancyRate >= 50 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                      }`}>
                        <svg className={`w-2.5 h-2.5 sm:w-4 sm:h-4 ${
                          occupancyRate >= 80 ? 'text-green-400' :
                          occupancyRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                      </div>
                      <div>
                        <div className={`text-[10px] sm:text-lg font-bold ${
                          occupancyRate >= 80 ? 'text-green-400' :
                          occupancyRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{occupancyRate}%</div>
                        <div className="text-[7px] sm:text-[10px] text-gray-400 uppercase">Occupancy</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Properties Yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Get started by adding your first property here.
          </p>
          <button
            type="button"
            onClick={() => setShowAddPropertyModal(true)}
            className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 font-semibold transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Property
          </button>
        </div>
      )}

      <PropertyFormModal
        open={showAddPropertyModal}
        title="Add New Property"
        submitLabel="Create Property"
        submitting={submittingProperty}
        onClose={() => setShowAddPropertyModal(false)}
        onSubmit={handleAddProperty}
      />
    </div>
  );
}

export default Properties;
