import React, { useState, useEffect } from "react";
import TopBar from "../components/homepage/TopBar";
import SideBar from "../components/homepage/SideBar";
import DashboardPage from "./DashboardPage";
import PositionsPage from "./PositionsPage";
import FilesPage from "./FilesPage";
import PrepPage from "./PrepPage";
import MePage from "./MePage";
import SaveToAccountModal from "../components/homepage/SaveToAccountModal";
import ResetDemoModal from "../components/homepage/ResetDemoModal";
import { resetDemo } from "../services/demo";
import { saveToken } from "../services/auth";

const HomePage = ({ data, user, onLogout, onUpdatePositionsData, onUpdateCategories, onOpenResources }) => {
  // Which sidebar tab is active. Persisted to localStorage so a browser refresh
  // doesn't kick the user back to Dashboard every time.
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("activeTab") || "dashboard"
  );
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);
  const [prepDefaultRole, setPrepDefaultRole] = useState(null);

  // Toggle between real dashboard and raw JSON data view
  const [showDebug, setShowDebug] = useState(false);

  // Sidebar collapse state — default expanded
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modal: "Save your demo work to a new account"
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Modal: "Reset demo?" confirmation
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleResetDemo() {
    setResetLoading(true);
    try {
      const result = await resetDemo();
      saveToken(result.access_token);
      window.location.reload();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
      setResetLoading(false);
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
        return <DashboardPage data={data} user={user} onNavigateToPrep={(roleId) => { setPrepDefaultRole(roleId); setActiveTab("prep"); }} />;
      case "positions":
        return <PositionsPage data={data} onUpdatePositionsData={onUpdatePositionsData} />;
      case "files":
        return <FilesPage data={data} />;
      case "prep":
        return (
          <PrepPage
            data={data}
            user={user}
            defaultRoleId={prepDefaultRole}
            onUpdateCategories={onUpdateCategories}
          />
        );
      case "me":
        return <MePage user={user} roles={data?.roles || []} onLogout={onLogout} />;
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
        isDemoGuest={user?.is_demo_guest}
        onResetDemo={() => setShowResetModal(true)}
        onSaveToAccount={() => setShowSaveModal(true)}
      />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <SideBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDemoGuest={user?.is_demo_guest}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />

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

      {/* Reset confirmation modal — only reachable from demo guest */}
      {showResetModal && (
        <ResetDemoModal
          loading={resetLoading}
          onCancel={() => setShowResetModal(false)}
          onConfirm={handleResetDemo}
        />
      )}
    </div>
  );
};

export default HomePage;