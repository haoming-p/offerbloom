import { LuTriangleAlert } from "react-icons/lu";

// Generic destructive-action confirmation. Used wherever we want a double-check
// before deleting something. `variant="danger"` makes the primary button red.
const ConfirmDialog = ({
  open,
  title = "Are you sure?",
  message = "",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  const isDanger = variant === "danger";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <LuTriangleAlert
              size={20}
              className={`${isDanger ? "text-red-500" : "text-orange-500"} flex-shrink-0 mt-0.5`}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
              {message && (
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`text-xs px-3 py-1.5 rounded text-white cursor-pointer ${
              isDanger ? "bg-red-500 hover:bg-red-600" : "bg-orange-400 hover:bg-orange-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
