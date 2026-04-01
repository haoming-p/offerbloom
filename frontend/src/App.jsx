import { useState, useEffect } from "react";
import HelloPage from "./pages/HelloPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import { getToken, getMe, removeToken } from "./services/auth";

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
    return <HelloPage onAuthSuccess={handleAuthSuccess} />;
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