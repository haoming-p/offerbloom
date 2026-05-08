const ResetDemoModal = ({ onConfirm, onCancel, loading }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Reset demo?</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your demo session will be deleted and replaced with the default data. This can't be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-orange-400 text-white hover:bg-orange-500 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Resetting…" : "Reset demo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetDemoModal;
