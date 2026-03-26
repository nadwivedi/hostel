import { useEffect, useState } from 'react';

const defaultFormState = {
  name: '',
  location: '',
  propertyType: 'hostel',
};

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

  useEffect(() => {
    if (!open) return;

    setFormData({
      name: initialData?.name || '',
      location: initialData?.location || '',
      propertyType: initialData?.propertyType || 'hostel',
    });
    setImageFile(null);
    setImagePreview(initialData?.imageUrl || null);
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onSubmit({
      ...formData,
      imageFile,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
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

          <div className="flex justify-end border-t border-gray-200 pt-2">
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
