/**
 * PermissionsGrid — renders a grid of checkboxes for each resource × action
 * Props:
 *   permissions: { tenants: { view, add, edit, delete }, rooms: {...}, ... }
 *   onChange: (updatedPermissions) => void
 */
const RESOURCES = ['tenants', 'rooms', 'payments', 'properties', 'buildings'];
const ACTIONS = ['view', 'add', 'edit', 'delete'];

const RESOURCE_LABELS = {
  tenants: '👥 Tenants',
  rooms: '🚪 Rooms',
  payments: '💰 Payments',
  properties: '🏢 Properties',
  buildings: '🏗️ Buildings',
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
    // If 'view' is turned off, turn off all other actions too
    if (action === 'view' && !updated[resource].view) {
      updated[resource] = { view: false, add: false, edit: false, delete: false };
    }
    // If any action other than 'view' is turned on, auto-enable view
    if (action !== 'view' && updated[resource][action]) {
      updated[resource].view = true;
    }
    onChange(updated);
  };

  const handleToggleAll = (resource) => {
    const all = ACTIONS.every((a) => permissions[resource]?.[a]);
    const updated = {
      ...permissions,
      [resource]: {
        view: !all,
        add: !all,
        edit: !all,
        delete: !all,
      },
    };
    onChange(updated);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: '1fr repeat(4, auto)' }}>
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Resource</div>
        {ACTIONS.map((action) => (
          <div key={action} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-center min-w-[52px]">
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
            className={`grid items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
            style={{ gridTemplateColumns: '1fr repeat(4, auto)' }}
          >
            <button
              type="button"
              onClick={() => handleToggleAll(resource)}
              className="px-3 py-2.5 text-sm font-medium text-gray-700 text-left hover:text-indigo-600 transition-colors"
              title={all ? 'Remove all permissions' : 'Grant all permissions'}
            >
              {RESOURCE_LABELS[resource]}
            </button>
            {ACTIONS.map((action) => (
              <div key={action} className="px-3 py-2.5 flex justify-center min-w-[52px]">
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
    </div>
  );
}

export default PermissionsGrid;
