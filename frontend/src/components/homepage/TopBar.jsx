import React from "react";

// Props:
// - roles: array of role objects to show as badges
// - showDebug: boolean, whether debug mode is on
// - onToggleDebug: function to toggle debug mode
const TopBar = ({ showDebug, onToggleDebug, onLogoClick, onNavClick, isDemoGuest, onResetDemo, onSaveToAccount }) => {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Left: Logo */}
      <span
        className="text-xl font-bold text-orange-400 cursor-pointer"
        onClick={onLogoClick}
      >OfferBloom</span>

      {/* Center: Nav links */}
      <div className="flex gap-6 text-sm text-gray-500">
        <button onClick={() => onNavClick?.("resources")} className="cursor-pointer hover:text-gray-800">
          Interview resources
        </button>
        <span className="cursor-default text-gray-300" title="Coming soon">Blog</span>
        <button onClick={() => onNavClick?.("faq")} className="cursor-pointer hover:text-gray-800">
          FAQ
        </button>
        <span className="cursor-default text-gray-300" title="Coming soon">Button 4</span>
      </div>

      {/* Right: Demo controls (if guest) + Debug toggle + placeholder user area */}
      <div className="flex items-center gap-4">
        {isDemoGuest && (
          <>
            <button
              onClick={onSaveToAccount}
              className="px-3 py-1 text-xs rounded-lg cursor-pointer bg-orange-400 text-white hover:bg-orange-500"
              title="Create a new account to keep your demo work"
            >
              💾 Save to account
            </button>
            <button
              onClick={onResetDemo}
              className="px-3 py-1 text-xs rounded-lg cursor-pointer border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
              title="Delete your changes and start over with default demo data"
            >
              ↺ Reset demo
            </button>
          </>
        )}

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