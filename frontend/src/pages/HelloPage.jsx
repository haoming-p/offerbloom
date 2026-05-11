import { useState } from "react";
import { login, register, saveToken } from "../services/auth";

import Hero from "../components/hellopage/Hero";
import MultiRoleSection from "../components/hellopage/MultiRoleSection";
import KnowledgeBaseSection from "../components/hellopage/KnowledgeBaseSection";
import PracticeSection from "../components/hellopage/PracticeSection";
import MobileSection from "../components/hellopage/MobileSection";
import TechStackSection from "../components/hellopage/TechStackSection";
import FAQSection from "../components/hellopage/FAQSection";
import Footer from "../components/hellopage/Footer";

const HelloPage = ({ onAuthSuccess, onTryDemo }) => {
  // onTryDemo is wired through to Hero so visitors can launch the demo from the landing page
  const [showModal, setShowModal] = useState(null); // null | "signin" | "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openModal(type) {
    setShowModal(type);
    setForm({ name: "", email: "", password: "" });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (showModal === "signup") {
        result = await register(form.name, form.email, form.password);
      } else {
        result = await login(form.email, form.password);
      }
      saveToken(result.access_token);
      onAuthSuccess(result.user, showModal === "signup");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Snap-scroll container — each section is one screen */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
        <Hero
          onSignIn={() => openModal("signin")}
          onSignUp={() => openModal("signup")}
          onTryDemo={onTryDemo}
        />
        <MultiRoleSection />
        <KnowledgeBaseSection />
        <PracticeSection />
        <MobileSection />
        <TechStackSection />
        <FAQSection />
        <Footer />
      </div>

      {/* Auth Modal — outside scroll container so it overlays cleanly */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-10 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {showModal === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {showModal === "signup"
                ? "Start prepping for your dream offer."
                : "Sign in to continue."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {showModal === "signup" && (
                <input
                  type="text"
                  placeholder="Full name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              <input
                type="password"
                placeholder="Password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-orange-400 text-white font-semibold rounded-xl hover:bg-orange-500 cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? "Please wait…"
                  : showModal === "signup"
                  ? "Create account"
                  : "Sign in"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
              <span>
                {showModal === "signup"
                  ? "Already have an account?"
                  : "No account yet?"}
              </span>
              <button
                onClick={() =>
                  openModal(showModal === "signup" ? "signin" : "signup")
                }
                className="text-orange-500 hover:underline cursor-pointer"
              >
                {showModal === "signup" ? "Sign in" : "Sign up"}
              </button>
            </div>

            <button
              onClick={() => setShowModal(null)}
              className="mt-4 w-full text-center text-gray-300 hover:text-gray-500 cursor-pointer text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HelloPage;
