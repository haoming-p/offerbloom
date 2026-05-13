import Header from "./Header";
import HeroVisual from "./HeroVisual";

const Hero = ({ onSignIn, onSignUp, onTryDemo }) => {
  return (
    <section
      id="hero"
      className="h-screen snap-start relative bg-gradient-to-b from-orange-50 to-white"
    >
      <Header
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        onTryDemo={onTryDemo}
      />

      <div className="h-full flex items-center pt-8 px-12">
        <div className="max-w-[1500px] mx-auto w-full grid grid-cols-[1fr_1.2fr] gap-8 items-center">
          {/* Left — words */}
          <div className="flex flex-col gap-7">
            <div className="inline-flex w-fit items-center gap-2 px-4 py-1.5 bg-white border border-orange-200 rounded-full text-sm text-orange-600 shadow-sm">
              <span>✦</span>
              <span>AI-powered interview prep</span>
            </div>

            <h1 className="text-7xl font-bold text-gray-900 leading-[1.05] tracking-tight">
              One coach.<br />
              Every role you're<br />
              applying to.
            </h1>

            <p className="text-xl text-gray-500 max-w-lg leading-relaxed">
              Practice with AI that remembers your story — across resumes,
              roles, practices, and preferences. Built for PMs, software
              engineers, and beyond.
            </p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={onTryDemo}
                className="px-8 py-4 bg-orange-400 text-white text-base font-semibold rounded-xl hover:bg-orange-500 transition cursor-pointer shadow-sm"
              >
                Try demo →
              </button>
              <button
                onClick={onSignUp}
                className="px-6 py-4 text-gray-600 text-base hover:text-gray-900 cursor-pointer"
              >
                Start free →
              </button>
            </div>
          </div>

          {/* Right — live product tour. Wrapper's mt nudges it down vs. the text column. */}
          <div className="mt-26">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
