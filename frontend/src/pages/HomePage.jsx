import React, { useState, useEffect } from "react";
import TopBar from "../components/homepage/TopBar";
import SideBar from "../components/homepage/SideBar";
import DashboardPage from "./DashboardPage";
import PositionsPage from "./PositionsPage";
import LibraryPage from "./LibraryPage";
import PrepPage from "./PrepPage";
import MePage from "./MePage";
import SaveToAccountModal from "../components/homepage/SaveToAccountModal";
import ResetDemoModal from "../components/homepage/ResetDemoModal";
import { resetDemo } from "../services/demo";
import { saveToken } from "../services/auth";

const HomePage = ({
  data,
  user,
  onLogout,
  onUpdatePositionsData,
  onUpdateCategories,
  onDeleteRole,
  onDeletePosition,
}) => {
  // Which sidebar tab is active. Persisted to localStorage so a browser refresh
  // doesn't kick the user back to Dashboard every time.
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("activeTab") || "dashboard"
  );
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);
  const [prepDefaultRole, setPrepDefaultRole] = useState(null);

  // Sidebar collapse state — default expanded
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Wrap setActiveTab so navigating to Prep also collapses the sidebar
  // (Prep needs the horizontal room). Doing it in the handler — instead of an
  // effect — avoids cascading renders.
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "prep") setSidebarCollapsed(true);
  };

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
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardPage
            data={data}
            user={user}
            onNavigateToPrep={(roleId) => { setPrepDefaultRole(roleId); handleTabChange("prep"); }}
            onUpdatePositionsData={onUpdatePositionsData}
            onDeleteRole={onDeleteRole}
            onDeletePosition={onDeletePosition}
          />
        );
      case "positions":
        return (
          <PositionsPage
            data={data}
            user={user}
            onUpdatePositionsData={onUpdatePositionsData}
            onDeleteRole={onDeleteRole}
            onDeletePosition={onDeletePosition}
          />
        );
      case "library":
        return <LibraryPage data={data} user={user} onNavigateToMe={() => handleTabChange("me")} />;
      case "prep":
        return (
          <PrepPage
            data={data}
            user={user}
            defaultRoleId={prepDefaultRole}
            onUpdateCategories={onUpdateCategories}
            onNavigateToMe={() => handleTabChange("me")}
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
        onLogoClick={() => handleTabChange("dashboard")}
        onAvatarClick={() => handleTabChange("me")}
        isDemoGuest={user?.is_demo_guest}
        onResetDemo={() => setShowResetModal(true)}
        onSaveToAccount={() => setShowSaveModal(true)}
      />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <SideBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
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