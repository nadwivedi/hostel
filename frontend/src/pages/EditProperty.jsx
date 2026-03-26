import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';
import PropertyFormModal from '../components/properties/PropertyFormModal';
import PropertyRoomFormModal from '../components/properties/PropertyRoomFormModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const DEFAULT_PROPERTY_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PHJlY3QgZmlsbD0iI2YzZjRmNiIgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiLz48cGF0aCBmaWxsPSIjZDFkNWRiIiBkPSJNMjAwIDgwbDgwIDYwdjgwaC0xNjB2LTgwbDgwLTYwem0wIDIwbC02MCA0NXY1NWgxMjB2LTU1bC02MC00NXoiLz48cmVjdCBmaWxsPSIjZDFkNWRiIiB4PSIxNzAiIHk9IjE2MCIgd2lkdGg9IjI1IiBoZWlnaHQ9IjQwIi8+PHJlY3QgZmlsbD0iI2QxZDVkYiIgeD0iMjA1IiB5PSIxNjAiIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MCIvPjwvc3ZnPg==';

function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProperty, setSavingProperty] = useState(false);
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalSubmitting, setRoomModalSubmitting] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => {
    fetchPropertyData();
  }, [propertyId]);

  const fetchPropertyData = async () => {
    try {
      setLoading(true);
      const config = { withCredentials: true };
      const [propertyRes, roomsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/properties/${propertyId}`, config),
        axios.get(`${BACKEND_URL}/api/rooms?propertyId=${propertyId}`, config),
      ]);

      setProperty(propertyRes.data);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
    } catch (error) {
      console.error('Error fetching property data:', error);
      toast.error(error.response?.data?.message || 'Failed to load property');
    } finally {
      setLoading(false);
    }
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

  const handleUpdateProperty = async (payload) => {
    if (!property) {
      toast.error('Property data is not ready yet.');
      return;
    }

    try {
      setSavingProperty(true);
      let imageUrl = property.image || null;

      if (payload.imageFile) {
        imageUrl = await uploadPropertyImage(payload.imageFile, payload.name);
      }

      await axios.patch(
        `${BACKEND_URL}/api/properties/${propertyId}`,
        {
          name: payload.name,
          location: payload.location,
          propertyType: payload.propertyType,
          image: imageUrl,
        },
        { withCredentials: true }
      );

      toast.success('Property updated successfully!');
      setShowEditPropertyModal(false);
      await fetchPropertyData();
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error(error.response?.data?.message || 'Failed to update property');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleRoomSubmit = async (formData) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    try {
      setRoomModalSubmitting(true);

      if (editingRoom) {
        await axios.patch(
          `${BACKEND_URL}/api/rooms/${editingRoom._id}`,
          {
            userId,
            roomNumber: formData.roomNumber,
            floor: formData.floor ? Number(formData.floor) : undefined,
            rentType: formData.rentType,
            rentAmount: Number(formData.rentAmount),
            propertyId,
          },
          { withCredentials: true }
        );
        toast.success('Room updated successfully!');
      } else {
        const beds = formData.rentType === 'PER_BED'
          ? Array.from({ length: Number(formData.numberOfBeds) || 0 }, (_, index) => ({
              bedNumber: String(index + 1),
              status: 'AVAILABLE',
            }))
          : [];

        await axios.post(
          `${BACKEND_URL}/api/rooms`,
          {
            userId,
            propertyId,
            roomNumber: formData.roomNumber,
            floor: formData.floor ? Number(formData.floor) : undefined,
            rentType: formData.rentType,
            rentAmount: Number(formData.rentAmount),
            beds,
          },
          { withCredentials: true }
        );
        toast.success('Room added successfully!');
      }

      setShowRoomModal(false);
      setEditingRoom(null);
      await fetchPropertyData();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error(error.response?.data?.message || 'Failed to save room');
    } finally {
      setRoomModalSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    if (!window.confirm(`Delete Room ${room.roomNumber}?`)) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/rooms/${room._id}`, {
        withCredentials: true,
        data: { userId },
      });
      toast.success('Room deleted successfully!');
      await fetchPropertyData();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error(error.response?.data?.message || 'Failed to delete room');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900">Property not found</h2>
        <button
          type="button"
          onClick={() => navigate('/properties')}
          className="mt-4 rounded-2xl bg-gray-900 px-5 py-3 font-semibold text-white"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  const propertyImage = property.image ? `${BACKEND_URL}${property.image}` : DEFAULT_PROPERTY_IMAGE;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={propertyImage}
            alt={property.name}
            onError={(event) => {
              event.target.src = DEFAULT_PROPERTY_IMAGE;
            }}
            className="h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{property.name}</h1>
            <p className="text-sm text-slate-300">{property.location}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowEditPropertyModal(true)}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:text-base"
          >
            Edit Property
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingRoom(null);
              setShowRoomModal(true);
            }}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:text-base"
          >
            Add Room
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
            <p className="text-sm text-gray-500">Use the edit button above to update property info.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Property Name</p>
              <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{property.name}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Location</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 sm:text-base">{property.location}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Property Type</p>
              <p className="mt-1 text-sm font-semibold capitalize text-gray-900 sm:text-base">{property.propertyType}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Rooms</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 sm:text-base">{rooms.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Current Rooms</h2>
              <p className="text-sm text-gray-500">{rooms.length} room(s) in this property</p>
            </div>
            <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-semibold capitalize text-gray-700">
              {property.propertyType}
            </div>
          </div>

          <div className="space-y-3">
            {rooms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                No rooms added yet.
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room._id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-gray-900">Room {room.roomNumber}</h3>
                      <p className="text-sm text-gray-500">
                        Floor {room.floor || 1} • {room.rentType === 'PER_BED' ? 'Per Bed' : 'Per Room'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-700">
                        Rs. {Number(room.rentAmount || 0).toLocaleString()}
                      </p>
                      {room.rentType === 'PER_BED' && (
                        <p className="mt-1 text-xs text-gray-500">{room.beds?.length || 0} bed(s) configured</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoom(room);
                          setShowRoomModal(true);
                        }}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room)}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 sm:text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <PropertyFormModal
        open={showEditPropertyModal}
        title="Edit Property"
        submitLabel="Save Property Changes"
        submitting={savingProperty}
        initialData={{
          name: property.name,
          location: property.location,
          propertyType: property.propertyType,
          imageUrl: property.image ? `${BACKEND_URL}${property.image}` : null,
        }}
        onClose={() => setShowEditPropertyModal(false)}
        onSubmit={handleUpdateProperty}
      />

      <PropertyRoomFormModal
        open={showRoomModal}
        initialData={editingRoom}
        submitting={roomModalSubmitting}
        onClose={() => {
          setShowRoomModal(false);
          setEditingRoom(null);
        }}
        onSubmit={handleRoomSubmit}
      />
    </div>
  );
}

export default EditProperty;
