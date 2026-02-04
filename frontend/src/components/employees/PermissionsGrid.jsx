import { useState, useEffect } from 'react';

const resources = [
  { key: 'tenants', label: 'Tenants', icon: '👥' },
  { key: 'rooms', label: 'Rooms', icon: '🚪' },
  { key: 'payments', label: 'Payments', icon: '💰' },
  { key: 'properties', label: 'Properties', icon: '🏢' },
  { key: 'buildings', label: 'Buildings', icon: '🏗️' },
];

const actions = ['view', 'add', 'edit', 'delete'];

function PermissionsGrid({ permissions, onChange, disabled = false }) {
  const [localPermissions, setLocalPermissions] = useState(permissions || {});

  useEffect(() => {
    setLocalPermissions(permissions || {});
  }, [permissions]);

  const handleToggle = (resource, action) => {
    if (disabled) return;

    const newPermissions = {
      ...localPermissions,
      [resource]: {
        ...localPermissions[resource],
        [action]: !localPermissions[resource]?.[action],
      },
    };

    setLocalPermissions(newPermissions);
    onChange?.(newPermissions);
  };

  const handleToggleAll = (resource) => {
    if (disabled) return;

    const currentAll = actions.every(action => localPermissions[resource]?.[action]);
    const newPermissions = {
      ...localPermissions,
      [resource]: {
        view: !currentAll,
        add: !currentAll,
        edit: !currentAll,
        delete: !currentAll,
      },
    };

    setLocalPermissions(newPermissions);
    onChange?.(newPermissions);
  };

  const isChecked = (resource, action) => {
    return localPermissions[resource]?.[action] || false;
  };

  const isAllChecked = (resource) => {
    return actions.every(action => localPermissions[resource]?.[action]);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
              Resource
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
              All
            </th>
            {actions.map(action => (
              <th key={action} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b capitalize">
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource, idx) => (
            <tr key={resource.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{resource.icon}</span>
                  <span className="font-medium text-gray-800">{resource.label}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center border-b">
                <input
                  type="checkbox"
                  checked={isAllChecked(resource.key)}
                  onChange={() => handleToggleAll(resource.key)}
                  disabled={disabled}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                />
              </td>
              {actions.map(action => (
                <td key={action} className="px-4 py-3 text-center border-b">
                  <input
                    type="checkbox"
                    checked={isChecked(resource.key, action)}
                    onChange={() => handleToggle(resource.key, action)}
                    disabled={disabled}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PermissionsGrid;
