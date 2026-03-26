import { useEffect, useState } from 'react';

const defaultFormState = {
  name: '',
  location: '',
  propertyType: 'hostel',
};

const createRoomDraft = () => ({
  roomNumber: '',
  floor: '',
  rentType: 'PER_ROOM',
  rentAmount: '',
  numberOfBeds: 0,
});

function PropertyFormModal({
  open,
  title = 'Add Property',
  submitLabel = 'Save Property',
  initialData = null,
  submitting = false,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(defaultFormState);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [rooms, setRooms] = useState([createRoomDraft()]);

  useEffect(() => {
    if (!open) return;

    setFormData({
      name: initialData?.name || '',
      location: initialData?.location || '',
      propertyType: initialData?.propertyType || 'hostel',
    });
    setImageFile(null);
    setImagePreview(initialData?.imageUrl || null);
    setRooms(initialData?.rooms?.length ? initialData.rooms : [createRoomDraft()]);
  }, [initialData, open]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRoomChange = (index, field, value) => {
    setRooms((prev) =>
      prev.map((room, roomIndex) =>
        roomIndex === index ? { ...room, [field]: value } : room
      )
    );
  };

  const addRoomDraft = () => {
    setRooms((prev) => [...prev, createRoomDraft()]);
  };

  const removeRoomDraft = (index) => {
    setRooms((prev) => (prev.length === 1 ? [createRoomDraft()] : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedRooms = rooms
      .map((room) => ({
        roomNumber: room.roomNumber.trim(),
        floor: room.floor,
        rentType: room.rentType,
        rentAmount: room.rentAmount,
        numberOfBeds: room.rentType === 'PER_BED' ? room.numberOfBeds : 0,
      }))
      .filter((room) => room.roomNumber && room.rentAmount);

    await onSubmit({
      ...formData,
      imageFile,
      rooms: normalizedRooms,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">Add property details, rooms, and image in one place.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5">
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Property Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter property name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter location"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Property Type</label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="hostel">Hostel</option>
                  <option value="resident">Resident</option>
                  <option value="shop">Shop</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Property Image</label>
              {imagePreview ? (
                <div className="overflow-hidden rounded-3xl border border-gray-200">
                  <img src={imagePreview} alt="Property preview" className="h-56 w-full object-cover" />
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                    <span className="text-sm text-gray-500">Image selected</span>
                    <label className="cursor-pointer text-sm font-semibold text-blue-600">
                      Change
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                  <svg className="mb-3 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Upload property image</span>
                  <span className="mt-1 text-sm text-gray-500">Click to select a file</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Rooms</h3>
                <p className="text-sm text-gray-500">Add rooms now or leave blank and add them later.</p>
              </div>
              <button
                type="button"
                onClick={addRoomDraft}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Add Room
              </button>
            </div>

            <div className="space-y-4">
              {rooms.map((room, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">Room {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeRoomDraft(index)}
                      className="text-sm font-medium text-red-500 transition hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={room.roomNumber}
                      onChange={(event) => handleRoomChange(index, 'roomNumber', event.target.value)}
                      className="rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Room number"
                    />
                    <input
                      type="number"
                      min="0"
                      value={room.floor}
                      onChange={(event) => handleRoomChange(index, 'floor', event.target.value)}
                      className="rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Floor"
                    />
                    <select
                      value={room.rentType}
                      onChange={(event) => handleRoomChange(index, 'rentType', event.target.value)}
                      className="rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="PER_ROOM">Per Room</option>
                      <option value="PER_BED">Per Bed</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={room.rentAmount}
                      onChange={(event) => handleRoomChange(index, 'rentAmount', event.target.value)}
                      className="rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Rent amount"
                    />
                    {room.rentType === 'PER_BED' && (
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={room.numberOfBeds}
                        onChange={(event) => handleRoomChange(index, 'numberOfBeds', event.target.value)}
                        className="rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-2"
                        placeholder="Number of beds"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PropertyFormModal;
