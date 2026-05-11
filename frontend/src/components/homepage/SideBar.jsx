import { LuHouse, LuClipboardList, LuBriefcase, LuLibrary, LuUser, LuChevronsLeft, LuChevronsRight } from "react-icons/lu";

const TABS = [
  { id: "dashboard", label: "Dashboard", Icon: LuHouse },
  { id: "prep", label: "My Prep", Icon: LuClipboardList },
  { id: "positions", label: "My Positions", Icon: LuBriefcase },
  { id: "library", label: "My Library", Icon: LuLibrary },
  { id: "me", label: "Me", Icon: LuUser },
];

const SideBar = ({ activeTab, onTabChange, isDemoGuest, collapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`bg-gray-50 border-r border-gray-200 flex flex-col py-4 transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Section header — Main Menu (left) + collapse toggle (right). When
          collapsed, only the toggle is shown, centered. */}
      {collapsed ? (
        <div className="flex justify-center px-3 mb-3">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
            title="Expand sidebar"
          >
            <LuChevronsRight size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pl-5 pr-3 mb-2">
          <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            Main Menu
          </span>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
            title="Collapse sidebar"
          >
            <LuChevronsLeft size={16} />
          </button>
        </div>
      )}

      {/* Tab buttons */}
      <nav className="flex flex-col gap-1.5 px-3">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm cursor-pointer transition-colors text-left ${
                isActive
                  ? "bg-white text-gray-900 font-medium shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-white/60"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Demo Mode indicator — only for guests */}
      {isDemoGuest && !collapsed && (
        <div className="px-5 py-3 mx-3 rounded-lg bg-orange-50 border border-orange-100">
          <span className="text-xs font-medium text-orange-600">✦ Demo Mode</span>
          <p className="text-[11px] text-orange-400 mt-0.5">
            Changes are temporary
          </p>
        </div>
      )}
    </aside>
  );
};

export default SideBar;
