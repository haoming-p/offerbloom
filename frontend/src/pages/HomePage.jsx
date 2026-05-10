import React, { useState } from "react";
import TopBar from "../components/homepage/TopBar";
import SideBar from "../components/homepage/SideBar";
import DashboardTab from "../components/homepage/DashboardTab";
import PositionsTab from "../components/homepage/PositionsTab";
import FilesTab from "../components/homepage/filetab/FilesTab";
import PrepTab from "../components/homepage/preptab/PrepTab";
import MeTab from "../components/homepage/MeTab";

const HomePage = ({ data, user, onLogout, onUpdatePositionsData, onUpdateCategories, onOpenResources }) => {
  // Which sidebar tab is active
  const [activeTab, setActiveTab] = useState("dashboard");
  const [prepDefaultRole, setPrepDefaultRole] = useState(null);

  // Toggle between real dashboard and raw JSON data view
  const [showDebug, setShowDebug] = useState(false);

  // Render the active tab's content
  const renderTab = () => {
    // Debug mode — show raw data for teammate review
    if (showDebug) {
      return (
        <div className="p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            📦 Onboarding Data (Debug)
          </h2>
          <pre className="text-xs text-gray-500 bg-gray-50 rounded-xl p-6 overflow-auto max-h-[70vh]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
    }

    // Normal tab rendering
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab data={data} onNavigateToPrep={(roleId) => { setPrepDefaultRole(roleId); setActiveTab("prep"); }} />;
      case "positions":
        return <PositionsTab data={data} onUpdatePositionsData={onUpdatePositionsData} />;
      case "files":
        return <FilesTab data={data} />;
      case "prep":
        return (
          <PrepTab
            data={data}
            defaultRoleId={prepDefaultRole}
            onUpdateCategories={onUpdateCategories}
          />
        );
      case "me":
        return <MeTab user={user} onLogout={onLogout} />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-gray-300 text-lg">
            🚧 {activeTab} — coming soon!
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <TopBar
        user={user}
        roles={data?.roles || []}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug(!showDebug)}
        onLogoClick={() => setActiveTab("dashboard")}
        onNavClick={(target) => {
          if (target === "resources") onOpenResources?.();
        }}
      />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <SideBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDemo={!!user?.email?.startsWith("guest_")}
        />

        {/* Main content area — scrollable independently */}
        <div className="flex-1 overflow-y-auto">
          {renderTab()}
        </div>
      </div>
    </div>
  );
};

export default HomePage;