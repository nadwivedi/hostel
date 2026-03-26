import { useEffect, useState } from 'react';

const defaultRoomState = {
  roomNumber: '',
  floor: '',
  rentType: 'PER_ROOM',
  rentAmount: '',
  numberOfBeds: 0,
};

function PropertyRoomFormModal({
  open,
  initialData = null,
  submitting = false,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(defaultRoomState);

  useEffect(() => {
    if (!open) return;

    setFormData({
      roomNumber: initialData?.roomNumber || '',
      floor: initialData?.floor ?? '',
      rentType: initialData?.rentType || 'PER_ROOM',
      rentAmount: initialData?.rentAmount || '',
      numberOfBeds: initialData?.beds?.length || 0,
    });
  }, [initialData, open]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Edit Room' : 'Add Room'}</h2>
            <p className="text-sm text-gray-500">Manage room details for this property.</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Room Number</label>
              <input
                type="text"
                name="roomNumber"
                value={formData.roomNumber}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter room number"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Floor</label>
              <input
                type="number"
                min="0"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Floor"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Rent Type</label>
              <select
                name="rentType"
                value={formData.rentType}
                onChange={handleChange}
                disabled={Boolean(initialData)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              >
                <option value="PER_ROOM">Per Room</option>
                <option value="PER_BED">Per Bed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Rent Amount</label>
              <input
                type="number"
                min="1"
                name="rentAmount"
                value={formData.rentAmount}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Rent amount"
              />
            </div>

            {formData.rentType === 'PER_BED' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {initialData ? 'Beds Configured' : 'Number of Beds'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  name="numberOfBeds"
                  value={formData.numberOfBeds}
                  onChange={handleChange}
                  disabled={Boolean(initialData)}
                  required={!initialData}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  placeholder="Beds"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
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
              className="rounded-2xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Saving...' : initialData ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PropertyRoomFormModal;
