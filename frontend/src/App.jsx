import { useState, useEffect } from "react";
import HelloPage from "./pages/HelloPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import { getToken, getMe, removeToken, register, saveToken } from "./services/auth";
import { saveOnboarding } from "./services/onboarding";

const DEMO_ROLE = { id: "pm", label: "Product Manager", emoji: "🎯", desc: "" };
const DEMO_DATA = { roles: [DEMO_ROLE], positions: [], files: [] };

function App() {
  // "loading" → "hello" → "onboarding" → "home"
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);

  // On mount: check for a saved token and validate it
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setScreen("hello");
      return;
    }
    getMe(token)
      .then((me) => {
        setUser(me);
        setScreen("home"); // returning user — skip onboarding
      })
      .catch(() => {
        removeToken();
        setScreen("hello");
      });
  }, []);

  // Called by HelloPage after successful register (new user) or login (returning user)
  function handleAuthSuccess(userData, isNewUser) {
    setUser(userData);
    setScreen(isNewUser ? "onboarding" : "home");
  }

  // Guest mode — auto-create account, skip onboarding, land on home with PM role
  async function handleTryDemo() {
    setScreen("loading");
    try {
      const guestEmail = `guest_${Date.now()}@example.com`;
      const guestPass = Math.random().toString(36).slice(2) + "Aa1!";
      const result = await register("Demo User", guestEmail, guestPass);
      saveToken(result.access_token);
      await saveOnboarding({ roles: [DEMO_ROLE], positions: [] }).catch(() => {});
      setUser(result.user);
      setOnboardingData(DEMO_DATA);
      setScreen("home");
    } catch {
      setScreen("hello");
    }
  }

  function handleLogout() {
    removeToken();
    setUser(null);
    setOnboardingData(null);
    setScreen("hello");
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
          setOnboardingData(data);
          setScreen("home");
        }}
      />
    );
  }

  return <HomePage data={onboardingData} user={user} onLogout={handleLogout} />;
}

export default App;