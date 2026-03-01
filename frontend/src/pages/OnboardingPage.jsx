import React, { useState } from "react";
import StepRoles from "../components/onboarding/StepRoles";
import StepPositions from "../components/onboarding/StepPositions";
import StepFiles from "../components/onboarding/StepFiles";

const STEPS = [
  { id: 1, label: "Choose Roles" },
  { id: 2, label: "Add Positions" },
  { id: 3, label: "Upload Files" },
];

const OnboardingPage = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Shared data across all steps
  // roles is now an array of OBJECTS, not just ids
  // e.g. [{ id: "pm", label: "Product Manager", emoji: "🎯" }]
  // This way StepPositions and StepFiles can read the label directly
  // TODO: change for further development — save to backend on complete
  const [onboardingData, setOnboardingData] = useState({
    roles: [],
    positions: [],
    files: [],
  });

  // --- Step 1 handler ---
  // Receives a full role object { id, label, emoji, desc }
  // Toggles it on/off by checking if the id already exists
  const handleToggleRole = (roleObj) => {
    setOnboardingData((prev) => {
      const exists = prev.roles.some((r) => r.id === roleObj.id);
      return {
        ...prev,
        roles: exists
          ? prev.roles.filter((r) => r.id !== roleObj.id)
          : [...prev.roles, roleObj],
      };
    });
  };

  // --- Step 2 handler ---
  const handleUpdatePositions = (newPositions) => {
    setOnboardingData((prev) => ({ ...prev, positions: newPositions }));
  };

  // --- Step 3 handler ---
  const handleUpdateFiles = (newFiles) => {
    setOnboardingData((prev) => ({ ...prev, files: newFiles }));
  };

  // --- Navigation ---
  const handleNext = () => {
    // Step 1 required — must select at least one role
    if (currentStep === 1 && onboardingData.roles.length === 0) return;

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Pass all collected data up to App
      // TODO: change for further development — send to backend
      console.log("Onboarding complete:", onboardingData);
      onComplete(onboardingData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => handleNext();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="flex items-center px-16 py-4 bg-white border-b border-gray-200">
        <span className="text-2xl font-bold text-orange-400">OfferBloom</span>
      </div>

      <div className="max-w-4xl mx-auto mt-12 px-8">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12">
          {STEPS.map((step) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              {step.id > 1 && (
                <div
                  className={`absolute top-4 -left-1/2 w-full h-0.5 ${
                    currentStep >= step.id ? "bg-orange-400" : "bg-gray-200"
                  }`}
                />
              )}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold z-10 ${
                  currentStep >= step.id
                    ? "bg-orange-400 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step.id}
              </div>
              <span
                className={`text-sm mt-2 ${
                  currentStep >= step.id ? "text-gray-800 font-medium" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 min-h-80">
          {currentStep === 1 && (
            <StepRoles
              selectedRoles={onboardingData.roles}
              onToggleRole={handleToggleRole}
            />
          )}
          {currentStep === 2 && (
            <StepPositions
              roles={onboardingData.roles}
              positions={onboardingData.positions}
              onUpdatePositions={handleUpdatePositions}
            />
          )}
          {currentStep === 3 && (
            <StepFiles
              roles={onboardingData.roles}
              positions={onboardingData.positions}
              files={onboardingData.files}
              onUpdateFiles={handleUpdateFiles}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              className="px-6 py-2 text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              className={`px-8 py-2 rounded-lg cursor-pointer font-medium ${
                currentStep === 1 && onboardingData.roles.length === 0
                  ? "bg-gray-200 text-gray-400"
                  : "bg-orange-400 text-white hover:bg-orange-500"
              }`}
            >
              {currentStep === STEPS.length ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;