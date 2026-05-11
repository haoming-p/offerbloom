import { useState, useEffect } from "react";
import HelloPage from "./pages/HelloPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import { getToken, getMe, removeToken, saveToken, demoLogin } from "./services/auth";
import {
  getUserData,
  saveUserData,
  deleteRoleCascade,
  deletePositionCascade,
} from "./services/user_data";

function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [appData, setAppData] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setScreen("hello");
      return;
    }
    Promise.all([getMe(token), getUserData()])
      .then(([me, data]) => {
        setUser(me);
        setAppData({
          roles: data.roles || [],
          positions: data.positions || [],
          statuses: data.statuses || [],
          categories: data.categories || {},
          files: [],
        });
        setScreen("home");
      })
      .catch(() => {
        removeToken();
        setScreen("hello");
      });
  }, []);

  function handleAuthSuccess(userData, isNewUser) {
    setUser(userData);
    if (isNewUser) {
      setScreen("onboarding");
    } else {
      getUserData()
        .then((data) => {
          setAppData({
            roles: data.roles || [],
            positions: data.positions || [],
            statuses: data.statuses || [],
            categories: data.categories || {},
            files: [],
          });
          setScreen("home");
        })
        .catch(() => {
          setAppData({ roles: [], positions: [], statuses: [], files: [] });
          setScreen("home");
        });
    }
  }

  async function handleTryDemo() {
    setScreen("loading");
    try {
      const result = await demoLogin();
      saveToken(result.access_token);
      const data = await getUserData().catch(() => ({}));
      setUser(result.user);
      setAppData({
        roles: data.roles || [],
        positions: data.positions || [],
        statuses: data.statuses || [],
        files: [],
      });
      setScreen("home");
    } catch {
      setScreen("hello");
    }
  }

  function handleLogout() {
    removeToken();
    setUser(null);
    setAppData(null);
    setScreen("hello");
  }

  async function handleUpdatePositionsData({ roles, positions, statuses }) {
    const updated = { ...appData, roles, positions, statuses };
    setAppData(updated);
    try {
      await saveUserData({
        roles,
        positions,
        statuses,
        categories: updated.categories || {},
      });
    } catch {
      // Silently fail — local state already updated
    }
  }

  // Cascade delete via dedicated endpoint. Backend handles question/preference
  // delete + story re-tag; we just refresh appData from the response.
  async function handleDeleteRole(roleId) {
    const result = await deleteRoleCascade(roleId);
    setAppData((prev) => ({
      ...prev,
      roles: result.roles,
      positions: result.positions,
      statuses: result.statuses,
      categories: result.categories,
    }));
  }

  async function handleDeletePosition(positionId) {
    const result = await deletePositionCascade(positionId);
    setAppData((prev) => ({
      ...prev,
      roles: result.roles,
      positions: result.positions,
      statuses: result.statuses,
      categories: result.categories,
    }));
  }

  async function handleUpdateCategories(categoriesByRole) {
    const updated = { ...appData, categories: categoriesByRole };
    setAppData(updated);
    try {
      await saveUserData({
        roles: updated.roles || [],
        positions: updated.positions || [],
        statuses: updated.statuses || [],
        categories: categoriesByRole,
      });
    } catch {
      // Silently fail — local state already updated
    }
  }

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-400 text-sm">Loading…</span>
      </div>
    );
  }

  if (screen === "hello") {
    return (
      <HelloPage
        onAuthSuccess={handleAuthSuccess}
        onTryDemo={handleTryDemo}
      />
    );
  }

  if (screen === "onboarding") {
    return (
      <OnboardingPage
        user={user}
        onComplete={(data) => {
          const d = {
            roles: data.roles || [],
            positions: data.positions || [],
            statuses: [],
            files: data.files || [],
          };
          setAppData(d);
          setScreen("home");
        }}
      />
    );
  }

  return (
    <HomePage
      data={appData}
      user={user}
      onLogout={handleLogout}
      onUpdatePositionsData={handleUpdatePositionsData}
      onUpdateCategories={handleUpdateCategories}
      onDeleteRole={handleDeleteRole}
      onDeletePosition={handleDeletePosition}
    />
  );
}

export default App;
