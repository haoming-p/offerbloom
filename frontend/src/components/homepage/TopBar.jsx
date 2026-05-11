import React from "react";
import { LuUserPlus, LuRotateCcw } from "react-icons/lu";

const TopBar = ({
  user,
  onLogoClick,
  onAvatarClick,
  isDemoGuest,
  onResetDemo,
  onSaveToAccount,
}) => {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Left: brand wordmark — Bloom mascot lives on the Dashboard, not the TopBar */}
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2 cursor-pointer"
      >
        <span className="text-xl font-bold text-orange-400">OfferBloom</span>
      </button>

      {/* Right: Demo controls (guest) + user avatar */}
      <div className="flex items-center gap-4">
        {isDemoGuest && (
          <>
            <button
              onClick={onSaveToAccount}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg cursor-pointer bg-orange-400 text-white hover:bg-orange-500"
              title="Create a new account to keep your demo work"
            >
              <LuUserPlus size={14} />
              Save to account
            </button>
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg cursor-pointer border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
              title="Delete your demo session and start fresh"
            >
              <LuRotateCcw size={14} />
              Reset demo
            </button>
          </>
        )}

        <button
          onClick={onAvatarClick}
          title={`${user?.name || "User"} — open Me`}
          className="w-8 h-8 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-orange-200 transition-colors"
        >
          {initials}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
