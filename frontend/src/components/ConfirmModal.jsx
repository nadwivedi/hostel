function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "",
  details = [],
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={loading ? undefined : onCancel}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 px-4 py-3">
          <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{message}</p>

          {details.length > 0 && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
              {details.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-semibold text-gray-800 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 sm:mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-60"
            >
              {loading ? "Please wait..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
