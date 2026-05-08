import React, { useState } from "react";
import TopBar from "../components/homepage/TopBar";
import SideBar from "../components/homepage/SideBar";
import DashboardTab from "../components/homepage/DashboardTab";
import PositionsTab from "../components/homepage/PositionsTab";
import FilesTab from "../components/homepage/filetab/FilesTab";
import PrepTab from "../components/homepage/preptab/PrepTab";
import MeTab from "../components/homepage/MeTab";
import SaveToAccountModal from "../components/homepage/SaveToAccountModal";
import { resetDemo } from "../services/demo";
import { saveToken } from "../services/auth";

const HomePage = ({ data, user, onLogout, onUpdatePositionsData, onOpenResources }) => {
  // Which sidebar tab is active
  const [activeTab, setActiveTab] = useState("dashboard");
  const [prepDefaultRole, setPrepDefaultRole] = useState(null);

  // Toggle between real dashboard and raw JSON data view
  const [showDebug, setShowDebug] = useState(false);

  // Modal: "Save your demo work to a new account"
  const [showSaveModal, setShowSaveModal] = useState(false);

  async function handleResetDemo() {
    if (!window.confirm("Reset all your demo changes? This will reload the default demo data.")) return;
    try {
      const result = await resetDemo();
      // Reset returns a brand new guest's TokenResponse — replace token then reload
      saveToken(result.access_token);
      window.location.reload();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  }

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
        return <PrepTab data={data} defaultRoleId={prepDefaultRole} />;
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
        roles={data?.roles || []}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug(!showDebug)}
        onLogoClick={() => setActiveTab("dashboard")}
        onNavClick={(target) => {
          if (target === "resources") onOpenResources?.();
        }}
        isDemoGuest={user?.is_demo_guest}
        onResetDemo={handleResetDemo}
        onSaveToAccount={() => setShowSaveModal(true)}
      />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <SideBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main content area — scrollable independently */}
        <div className="flex-1 overflow-y-auto">
          {renderTab()}
        </div>
      </div>

      {/* Save-to-account modal — only reachable from demo guest */}
      {showSaveModal && (
        <SaveToAccountModal
          onClose={() => setShowSaveModal(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
};

export default HomePage;