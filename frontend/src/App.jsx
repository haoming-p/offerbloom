import { useState } from "react";
import HelloPage from "./pages/HelloPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";

function App() {
  // Controls which screen to show: "hello" → "onboarding" → "home"
  // TODO: change for further development — replace with real auth
  const [screen, setScreen] = useState("hello");

  // Stores all data collected during onboarding
  // Lives here so HomePage can access it after onboarding finishes
  // Resets every time user enters demo (no localStorage for demo mode)
  const [onboardingData, setOnboardingData] = useState(null);

  if (screen === "hello") {
    return <HelloPage onSignIn={() => setScreen("onboarding")} />;
  }

  if (screen === "onboarding") {
    return (
      <OnboardingPage
        onComplete={(data) => {
          // Save the collected data and move to homepage
          setOnboardingData(data);
          setScreen("home");
        }}
      />
    );
  }

  // TODO: change for further development — replace with real HomePage
  return <HomePage data={onboardingData} />;
}

export default App;