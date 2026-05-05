import React, { useState, useEffect } from "react";
import { fetchPublicRoles, fetchPublicCategories, fetchPublicQuestions } from "../services/public";

const DIFFICULTY_STYLES = {
  Easy:   "bg-green-50 text-green-600",
  Medium: "bg-yellow-50 text-yellow-600",
  Hard:   "bg-red-50 text-red-500",
};

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];

const ResourcesPage = ({ onBack, onSignUp }) => {
  const [roles, setRoles]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(false);

  const [activeRole, setActiveRole]         = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [expandedId, setExpandedId]         = useState(null);

  useEffect(() => {
    Promise.all([fetchPublicRoles(), fetchPublicCategories()]).then(([r, c]) => {
      setRoles(r);
      setCategories(c);
      setActiveRole(r[0]?.id || null);
      setActiveCategory(c[0]?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!activeRole || !activeCategory) return;
    setLoading(true);
    setQuestions([]);
    fetchPublicQuestions({
      roleId: activeRole,
      categoryId: activeCategory,
      difficulty: activeDifficulty === "All" ? undefined : activeDifficulty,
      limit: 30,
    })
      .then(setQuestions)
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [activeRole, activeCategory, activeDifficulty]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-16 py-4 bg-white border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-2xl font-bold text-orange-400 cursor-pointer hover:text-orange-500"
        >
          OfferBloom
        </button>
        <div className="flex gap-3">
          <button
            onClick={onSignUp}
            className="bg-[#155EEF] text-white rounded-lg px-6 py-2 hover:bg-blue-700 cursor-pointer text-sm"
          >
            Get started free
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Resources</h1>
        <p className="text-gray-400 mb-8">
          Browse questions by role and category. No account needed.
        </p>

        {/* Role tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => { setActiveRole(r.id); setExpandedId(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                activeRole === r.id
                  ? "bg-orange-400 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCategory(c.id); setExpandedId(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${
                activeCategory === c.id
                  ? "bg-orange-50 text-orange-500 border border-orange-400"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-2 mb-8">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDifficulty(d)}
              className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                activeDifficulty === d
                  ? "bg-gray-800 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Question list */}
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading questions…</div>
        ) : questions.length === 0 ? (
          <div className="text-center text-gray-300 py-20">
            No questions found. Try a different filter.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-sm text-gray-400 mt-0.5">
                      {expandedId === q.id ? "▾" : "▸"}
                    </span>
                    <span className="text-sm text-gray-700">{q.text}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {q.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[q.difficulty] || "bg-gray-100 text-gray-400"}`}>
                        {q.difficulty}
                      </span>
                    )}
                    {q.experience && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                        {q.experience}
                      </span>
                    )}
                  </div>
                </button>

                {expandedId === q.id && q.ideal_answer && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 mt-3 mb-2">Reference answer</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{q.ideal_answer}</p>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        Practice this with your own answer in OfferBloom
                      </span>
                      <button
                        onClick={onSignUp}
                        className="text-xs px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer"
                      >
                        Start prepping →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourcesPage;
