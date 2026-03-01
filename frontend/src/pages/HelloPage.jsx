import React, { useState } from "react";

const pmQuestions = [
  "Tell me about a time you led a cross-functional team",
  "Describe a product decision you made with limited data",
  "How do you prioritize competing features?",
  "Tell me about a time you handled conflict with engineering",
  "How would you improve our product?",
  "Describe a time you used data to influence a decision",
  "Tell me about a product you launched from 0 to 1",
  "How do you define success metrics for a new feature?",
  "Describe a time you had to say no to a stakeholder",
  "Tell me about a time you failed and what you learned",
];

const sdeQuestions = [
  "Design a URL shortener like bit.ly",
  "Design a chat messaging system",
  "Design a news feed system",
  "Design a rate limiter",
  "Design a web crawler",
  "Design a notification system",
  "Design a key-value store",
  "Design a video streaming platform",
  "Design a search autocomplete system",
  "Design a ride-sharing service like Uber",
];

const dsQuestions = [
  "How would you measure the success of a new feature?",
  "Walk me through building a recommendation model",
  "How would you detect fraud in a payments system?",
  "Explain the bias-variance tradeoff with a real example",
  "How would you A/B test a pricing change?",
  "How would you forecast demand for a new market?",
  "Design a metric to measure user engagement",
  "How would you handle class imbalance in a fraud model?",
  "Walk me through your approach to feature selection",
  "How would you evaluate a search ranking algorithm?",
];

const QuestionColumn = ({ title, questions }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 h-140 flex flex-col">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    <ul className="flex flex-col gap-3 overflow-y-auto flex-1">
      {questions.map((q, i) => (
        <li
          key={i}
          className="text-sm text-gray-600 py-2 px-3 bg-gray-50 rounded-lg"
        >
          {q}
        </li>
      ))}
    </ul>
  </div>
);

const HelloPage = ({ onSignIn }) => {
  const [showModal, setShowModal] = useState(null); // null, signin, signup

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-16 py-4 bg-white border-b border-gray-200">
        <span className="text-2xl font-bold text-orange-400">OfferBloom</span>
        <div className="flex items-center gap-24">
          {/* TODO: change for further development — add real navigation routes */}
          <div className="flex gap-8 text-gray-500">
            <button className="cursor-pointer hover:text-gray-800">Interview resources</button>
            <button className="cursor-pointer hover:text-gray-800">Blog</button>
            <button className="cursor-pointer hover:text-gray-800">FAQ</button>
            <button className="cursor-pointer hover:text-gray-800">Button 4</button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal('signup')}
              className="bg-[#155EEF] text-white rounded-lg px-6 py-2 hover:bg-blue-700 cursor-pointer"
            >
              Give it a try
            </button>
            {/* TODO: change for further development — replace with real sign in flow */}
            <button
              onClick={() => setShowModal('signin')}
              className="border border-[#155EEF] text-[#155EEF] rounded-lg px-6 py-2 hover:bg-blue-50 cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>

      {/* Hero: Left text + Right video */}
      <div className="flex items-center justify-between px-16 py-24 max-w-6xl mx-auto gap-16">
        {/* Left */}
        <div className="flex flex-col gap-6 flex-1">
          <h1 className="text-5xl font-bold text-gray-800 leading-tight">
            Prep smarter,<br />bloom into your<br />dream offer
          </h1>
          {/* TODO: change for further development — refine tagline copy */}
          <p className="text-lg text-gray-500">
            Your personalized AI interview companion. Prepare for any role,
            refine your answers, and stand out with confidence.
          </p>
          <button
            onClick={() => setShowModal('signup')}
            className="mt-2 w-fit px-10 py-4 bg-orange-400 text-white text-lg font-semibold rounded-xl hover:bg-orange-500 cursor-pointer"
          >
            Start My Prep
          </button>
        </div>

        {/* Right: Video placeholder */}
        {/* TODO: change for further development — replace with real demo video */}
        <div className="flex-1 bg-gray-200 rounded-2xl aspect-video flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white flex items-center justify-center">
              <span className="text-2xl">▶</span>
            </div>
            <span className="text-sm">Product demo video</span>
          </div>
        </div>
      </div>

      {/* Question Lists */}
      {/* TODO: change for further development — load questions from backend/QuestionBank */}
      <div className="px-16 pb-24 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
          What will you prepare today?
        </h2>
        <p className="text-gray-400 text-center mb-8">
          Starts with default common interview questions across roles
        </p>
        <div className="grid grid-cols-3 gap-6">
          <QuestionColumn title="🎯 PM BQ" questions={pmQuestions} />
          <QuestionColumn title="💻 SDE System Design" questions={sdeQuestions} />
          <QuestionColumn title="📊 Data Science" questions={dsQuestions} />
        </div>
      </div>

      {/* Demo Modal */}
      {/* TODO: change for further development — replace with real sign in / sign up modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-10 max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Welcome! 
            </h2>
            <p className="text-gray-500 mb-8">
              This is a demo — no sign up needed. Jump straight in and explore OfferBloom.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onSignIn}
                className="px-8 py-3 bg-orange-400 text-white font-semibold rounded-xl hover:bg-orange-500 cursor-pointer"
              >
                Enter Demo
              </button>
              <button
                onClick={() => setShowModal(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-sm"
              >
                {showModal === "signin" ? "Sign in" : "Sign up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelloPage;