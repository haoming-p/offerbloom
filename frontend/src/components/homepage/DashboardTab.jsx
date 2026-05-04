import React from "react";
import ChatBot from "./ChatBot";

const DashboardTab = ({ data, onNavigateToPrep }) => {
  const { roles = [], positions = [], files = [] } = data || {};

  const hasFile = (positionId) => {
    return files.some((f) => f.linkedTo.includes(`pos-${positionId}`));
  };

  const hasRoleFile = (roleId) => {
    return files.some((f) => f.linkedTo.includes(roleId));
  };

  return (
    // h-full so it fills the content area, flex so top and bottom split space
    <div className="flex flex-col h-full">
      {/* Top: Welcome + Cards — scrolls if too tall */}
      <div className="p-6 max-h-[70vh] overflow-y-auto show-scrollbar flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800 mb-1">
          Welcome back! Ready to prep? 
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Click a role or position to start practicing
        </p>

        <div className="flex flex-col gap-4">
          {roles.map((role) => {
            const rolePositions = positions.filter((p) => p.role === role.id);

            return (
              <div key={role.id} className="flex gap-3 items-start overflow-x-auto">
                {/* Role card */}
                <button
                  onClick={() => onNavigateToPrep?.(role.id)}
                  className="flex-shrink-0 w-48 h-30 p-4 bg-white border border-gray-200 rounded-xl
                    hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all text-left"
                >
                  {/* <span className="text-xl">{role.emoji}</span> */}
                  <h3 className="font-semibold text-gray-800">{role.label}</h3>
                  <span className="text-xs text-gray-400">
                    {rolePositions.length} {rolePositions.length === 1 ? "position" : "positions"}
                  </span>
                  <div className="flex flex-nowrap gap-1.5 mt-2">
                    {hasRoleFile(role.id) && (
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">
                        📄 Resume
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-green-50 text-green-500 rounded-full">
                      🟢 New
                    </span>
                  </div>
                </button>

                {/* Position cards */}
                {rolePositions.map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => onNavigateToPrep?.(role.id)}
                    className="flex-shrink-0 w-52 h-30 p-4 bg-white border border-gray-200 rounded-xl
                      hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all text-left"
                  >
                    <h3 className="font-semibold text-gray-800">
                      {pos.title}
                    </h3>
                    {pos.company && (
                      <span className="text-xs text-gray-400">@ {pos.company}</span>
                    )}
                    <div className="flex flex-nowrap gap-1.5 mt-3">
                      {pos.jd && (
                        <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-500 rounded-full">
                          📋 JD
                        </span>
                      )}
                      {hasFile(pos.id) && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">
                          📄 Resume
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-500 rounded-full">
                        🟢 New
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Chatbot — always visible, fills remaining space */}
      <div className="flex-1 min-h-0">
        <ChatBot roles={roles} />
      </div>
    </div>
  );
};

export default DashboardTab;