/**
 * PermissionsGrid — renders checkboxes for each resource × action
 * Resources: tenants, rooms, payments, properties  (buildings removed)
 * Actions: view, add, edit  (delete removed — employees cannot delete)
 */
const RESOURCES = ['tenants', 'rooms', 'payments'];
const ACTIONS = ['view', 'add', 'edit'];

const RESOURCE_LABELS = {
  tenants:    '👥 Tenants',
  rooms:      '🚪 Rooms',
  payments:   '💰 Payments',
};

function PermissionsGrid({ permissions, onChange }) {
  const handleToggle = (resource, action) => {
    const updated = {
      ...permissions,
      [resource]: {
        ...permissions[resource],
        [action]: !permissions[resource]?.[action],
      },
    };
    // Turning off 'view' disables add and edit too
    if (action === 'view' && !updated[resource].view) {
      updated[resource] = { view: false, add: false, edit: false };
    }
    // Turning on 'add' or 'edit' auto-enables view
    if (action !== 'view' && updated[resource][action]) {
      updated[resource].view = true;
    }
    onChange(updated);
  };

  const handleToggleAll = (resource) => {
    const all = ACTIONS.every((a) => permissions[resource]?.[a]);
    const updated = {
      ...permissions,
      [resource]: Object.fromEntries(ACTIONS.map((a) => [a, !all])),
    };
    onChange(updated);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="grid bg-gray-50 border-b border-gray-200"
        style={{ gridTemplateColumns: '1fr repeat(3, auto)' }}
      >
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Resource</div>
        {ACTIONS.map((action) => (
          <div key={action} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-center min-w-[60px]">
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </div>
        ))}
      </div>

      {/* Rows */}
      {RESOURCES.map((resource, idx) => {
        const all = ACTIONS.every((a) => permissions[resource]?.[a]);
        return (
          <div
            key={resource}
            className={`grid items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
            style={{ gridTemplateColumns: '1fr repeat(3, auto)' }}
          >
            <button
              type="button"
              onClick={() => handleToggleAll(resource)}
              className="px-3 py-3 text-sm font-medium text-gray-700 text-left hover:text-indigo-600 transition-colors"
              title={all ? 'Remove all' : 'Grant all'}
            >
              {RESOURCE_LABELS[resource]}
            </button>
            {ACTIONS.map((action) => (
              <div key={action} className="px-4 py-3 flex justify-center min-w-[60px]">
                <input
                  type="checkbox"
                  checked={!!permissions[resource]?.[action]}
                  onChange={() => handleToggle(resource, action)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            ))}
          </div>
        );
      })}

      <div className="px-3 py-2 bg-blue-50 border-t border-blue-100">
        <p className="text-[11px] text-blue-600">
          💡 Click a resource name to toggle all its permissions. Employees cannot delete records.
        </p>
      </div>
    </div>
  );
}

export default PermissionsGrid;
