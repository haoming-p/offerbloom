import { useState, useRef, useEffect } from "react";
import { LuCircleHelp } from "react-icons/lu";

// Help icon next to the "+ AI preference" button. Click opens a small popover
// explaining what AI preferences are, with a link that switches to the Me tab
// where the user can manage them.
const AIPreferenceHelp = ({ onNavigateToMe }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="What are AI preferences?"
        className="text-gray-300 hover:text-gray-500 cursor-pointer flex items-center"
      >
        <LuCircleHelp size={11} />
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute bottom-full right-0 mb-1.5 w-64 z-20 rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-[11px] leading-relaxed text-gray-600"
        >
          <p className="mb-2">
            <span className="font-semibold text-gray-700">AI preferences</span> are
            style rules Bloom remembers and follows in every future chat — like{" "}
            <em>“always include metrics in PM answers.”</em>
          </p>
          <p className="mb-2">
            Click <span className="font-medium text-gray-700">+ AI preference</span> to
            save this message as one.
          </p>
          {onNavigateToMe && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigateToMe();
              }}
              className="text-orange-500 hover:text-orange-600 font-medium cursor-pointer"
            >
              Manage all preferences →
            </button>
          )}
        </div>
      )}
    </span>
  );
};

export default AIPreferenceHelp;
