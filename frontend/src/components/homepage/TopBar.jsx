import React from "react";
import bloomLogo from "../../assets/bloom.png";

const TopBar = ({ user, showDebug, onToggleDebug, onLogoClick, onNavClick }) => {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Left: Logo + brand */}
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2 cursor-pointer"
      >
        <img src={bloomLogo} alt="" className="w-8 h-8 rounded-full ring-2 ring-orange-200" />
        <span className="text-xl font-bold text-orange-400">OfferBloom</span>
      </button>

      {/* Center: Nav links — only show what works */}
      <div className="flex gap-6 text-sm text-gray-500">
        <button
          onClick={() => onNavClick?.("resources")}
          className="cursor-pointer hover:text-gray-800"
        >
          Interview resources
        </button>
      </div>

      {/* Right: Debug toggle + user avatar */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleDebug}
          className={`px-3 py-1 text-xs rounded-lg cursor-pointer border ${
            showDebug
              ? "bg-orange-50 border-orange-400 text-orange-500"
              : "border-gray-200 text-gray-400 hover:border-gray-300"
          }`}
          title="Toggle raw data view"
        >
          {showDebug ? "✦ Debug ON" : "✦ Debug"}
        </button>

        <div
          title={user?.name || "User"}
          className="w-8 h-8 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-sm font-bold"
        >
          {initials}
        </div>
      </div>
    </div>
  );
};

export default TopBar;