import { useState, useEffect } from "react";
import HelloPage from "./pages/HelloPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import { getToken, getMe, removeToken, register, saveToken } from "./services/auth";
import { saveOnboarding } from "./services/onboarding";
import { getUserData, saveUserData } from "./services/user_data";

const DEMO_ROLE = { id: "pm", label: "Product Manager", emoji: "🎯", desc: "" };
const DEMO_DATA = { roles: [DEMO_ROLE], positions: [], statuses: [], files: [] };

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
            files: [],
          });
          setScreen("home");
        })
        .catch(() => {
          setAppData(DEMO_DATA);
          setScreen("home");
        });
    }
  }

  async function handleTryDemo() {
    setScreen("loading");
    try {
      const guestEmail = `guest_${Date.now()}@example.com`;
      const guestPass = Math.random().toString(36).slice(2) + "Aa1!";
      const result = await register("Demo User", guestEmail, guestPass);
      saveToken(result.access_token);
      await saveOnboarding({ roles: [DEMO_ROLE], positions: [] }).catch(() => {});
      setUser(result.user);
      setAppData(DEMO_DATA);
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
      await saveUserData({ roles, positions, statuses });
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
    return <HelloPage onAuthSuccess={handleAuthSuccess} onTryDemo={handleTryDemo} />;
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
    />
  );
}

export default App;
