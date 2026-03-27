/**
 * PropertyAssignment — multi-select list of properties to assign to an employee
 * Props:
 *   properties: array of { _id, name, location }
 *   selectedIds: array of selected property IDs
 *   onChange: (ids) => void
 */
function PropertyAssignment({ properties, selectedIds, onChange }) {
  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === properties.length) {
      onChange([]);
    } else {
      onChange(properties.map((p) => p._id));
    }
  };

  if (properties.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
        No properties available. Add properties first.
      </p>
    );
  }

  const allSelected = selectedIds.length === properties.length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Select all */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-500 font-medium">
          {selectedIds.length} of {properties.length} selected
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
        {properties.map((prop) => {
          const isSelected = selectedIds.includes(prop._id);
          return (
            <label
              key={prop._id}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-indigo-50 transition-colors ${isSelected ? 'bg-indigo-50/60' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(prop._id)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{prop.name}</div>
                {prop.location && (
                  <div className="text-xs text-gray-400 truncate">{prop.location}</div>
                )}
              </div>
              {isSelected && (
                <span className="text-xs text-indigo-600 font-medium flex-shrink-0">✓</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default PropertyAssignment;
