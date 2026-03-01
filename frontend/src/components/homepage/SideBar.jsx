import React from "react";

// Sidebar tabs — easy to add/remove/reorder
const TABS = [
  { id: "dashboard", label: "Dashboard", emoji: "🏠" },
  { id: "prep", label: "My Prep", emoji: "📝" },
  { id: "positions", label: "My Positions", emoji: "💼" },
  { id: "files", label: "My Files", emoji: "📁" },
  { id: "me", label: "Me", emoji: "👤" },
];

// Props:
// - activeTab: which tab is currently selected
// - onTabChange: function to switch tabs
const SideBar = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-52 bg-white border-r border-gray-200 flex flex-col py-4">
      {/* Tab buttons */}
      <div className="flex flex-col gap-1 px-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-all text-left ${
              activeTab === tab.id
                ? "bg-orange-50 text-orange-500 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom spacer — pushes future items to bottom */}
      {/* TODO: change for further development — add settings, logout, etc. */}
      <div className="flex-1" />

      {/* Bottom: Demo indicator */}
      <div className="px-6 py-3 border-t border-gray-100">
        <span className="text-xs text-gray-300">Demo Mode</span>
      </div>
    </div>
  );
};

export default SideBar;