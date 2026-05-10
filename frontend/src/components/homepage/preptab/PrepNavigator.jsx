import { useState } from "react";
import {
  LuChevronDown,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuBriefcase,
} from "react-icons/lu";

const GENERAL_POSITION = { id: "general", title: "General", company: null };

const PrepNavigator = ({
  roles,
  positions,
  activeRoleId,
  activePositionKey,
  onSelect, // (roleId, positionKey) => void
  collapsed,
  onToggleCollapse,
}) => {
  const [expanded, setExpanded] = useState(() =>
    roles.reduce((acc, r) => ({ ...acc, [r.id]: true }), {}),
  );

  const toggle = (roleId) =>
    setExpanded((prev) => ({ ...prev, [roleId]: !prev[roleId] }));

  if (collapsed) {
    return (
      <aside className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-3 flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          title="Expand Roles & Positions"
        >
          <LuChevronsRight size={16} />
        </button>
        <LuBriefcase size={16} className="text-gray-400 mt-3" />
        <span className="text-[10px] text-gray-400 mt-2 [writing-mode:vertical-rl] tracking-wider">
          Roles & Positions
        </span>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto show-scrollbar flex-shrink-0">
      {/* Header: title + collapse */}
      <div className="flex items-center justify-between pl-4 pr-2 py-3 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
        <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
          Roles &amp; Positions
        </span>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          title="Collapse"
        >
          <LuChevronsLeft size={16} />
        </button>
      </div>

      <div className="py-3">
        {roles.map((role) => {
          const rolePositions = [GENERAL_POSITION, ...positions.filter((p) => p.role === role.id)];
          const isOpen = expanded[role.id];

          return (
            <div key={role.id} className="mb-1">
              <button
                onClick={() => toggle(role.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/60 cursor-pointer"
              >
                {isOpen ? (
                  <LuChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <LuChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                )}
                {role.emoji && <span className="text-base">{role.emoji}</span>}
                <span className="truncate">{role.label}</span>
              </button>

              {isOpen && (
                <div className="flex flex-col">
                  {rolePositions.map((pos) => {
                    const posKey = pos.id === "general" ? "general" : String(pos.id);
                    const isActive =
                      activeRoleId === role.id && activePositionKey === posKey;
                    return (
                      <button
                        key={posKey}
                        onClick={() => onSelect(role.id, posKey)}
                        className={`flex items-center gap-2 pl-10 pr-4 py-1.5 text-sm cursor-pointer text-left transition-colors ${
                          isActive
                            ? "bg-orange-50 text-orange-600 font-medium border-l-2 border-orange-400 -ml-px"
                            : "text-gray-500 hover:bg-white/60 hover:text-gray-800"
                        }`}
                      >
                        <span className="truncate">
                          {pos.id === "general" ? "General" : pos.title}
                        </span>
                        {pos.company && pos.id !== "general" && (
                          <span className="text-[11px] text-gray-300 truncate">
                            @ {pos.company}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default PrepNavigator;
