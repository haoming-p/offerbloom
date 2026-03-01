import React from "react";

// Props:
// - roles: array of role objects to show as badges
// - showDebug: boolean, whether debug mode is on
// - onToggleDebug: function to toggle debug mode
const TopBar = ({ showDebug, onToggleDebug }) => {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Left: Logo */}
      <span className="text-xl font-bold text-orange-400">OfferBloom</span>

      {/* Right: Debug toggle + placeholder user area */}
      <div className="flex items-center gap-4">
        {/* Debug toggle — show/hide raw onboarding data */}
        <button
          onClick={onToggleDebug}
          className={`px-3 py-1 text-xs rounded-lg cursor-pointer border ${
            showDebug
              ? "bg-orange-50 border-orange-400 text-orange-500"
              : "border-gray-200 text-gray-400 hover:border-gray-300"
          }`}
        >
          {showDebug ? "✦ Debug ON" : "✦ Debug"}
        </button>

        {/* TODO: change for further development — replace with real user avatar/menu */}
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-500">
          U
        </div>
      </div>
    </div>
  );
};

export default TopBar;