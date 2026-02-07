import { useState, useEffect } from 'react';

function PropertyAssignment({ properties = [], selectedIds = [], onChange, disabled = false }) {
  const [selected, setSelected] = useState(selectedIds || []);

  useEffect(() => {
    setSelected(selectedIds || []);
  }, [selectedIds]);

  const handleToggle = (propertyId) => {
    if (disabled) return;

    const newSelected = selected.includes(propertyId)
      ? selected.filter(id => id !== propertyId)
      : [...selected, propertyId];

    setSelected(newSelected);
    onChange?.(newSelected);
  };

  const handleSelectAll = () => {
    if (disabled) return;

    const newSelected = selected.length === properties.length ? [] : properties.map(p => p._id);
    setSelected(newSelected);
    onChange?.(newSelected);
  };

  const isSelected = (propertyId) => selected.includes(propertyId);

  const propertyTypeColors = {
    hostel: 'bg-blue-100 text-blue-800',
    resident: 'bg-green-100 text-green-800',
    shop: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-gray-600">
          {selected.length} of {properties.length} properties selected
        </span>
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={disabled}
          className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
        >
          {selected.length === properties.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="grid gap-2 max-h-48 sm:max-h-64 overflow-y-auto border rounded-lg p-2">
        {properties.length === 0 ? (
          <div className="text-center py-4 text-xs sm:text-sm text-gray-500">No properties available</div>
        ) : (
          properties.map(property => (
            <label
              key={property._id}
              className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected(property._id)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected(property._id)}
                onChange={() => handleToggle(property._id)}
                disabled={disabled}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 truncate text-sm sm:text-base">{property.name}</span>
                  <span className={`px-1.5 sm:px-2 py-0.5 text-[11px] sm:text-xs rounded-full ${propertyTypeColors[property.propertyType] || 'bg-gray-100 text-gray-800'}`}>
                    {property.propertyType}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">{property.location}</div>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export default PropertyAssignment;
