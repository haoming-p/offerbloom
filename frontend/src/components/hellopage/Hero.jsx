import Header from "./Header";

const Hero = ({ onSignIn, onSignUp, onTryDemo }) => {
  return (
    <section
      id="hero"
      className="h-screen snap-start relative bg-gradient-to-b from-orange-50 to-white"
    >
      <Header
        onSignIn={onSignIn}
        onSignUp={onSignUp}
      />

      <div className="h-full flex items-center pt-20 px-16">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-2 gap-16 items-center">
          {/* Left — words */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 px-4 py-1.5 bg-white border border-orange-200 rounded-full text-sm text-orange-600 shadow-sm">
              <span>✦</span>
              <span>AI-powered interview prep</span>
            </div>

            <h1 className="text-6xl font-bold text-gray-900 leading-tight tracking-tight">
              One coach.<br />
              Every role you're<br />
              applying to.
            </h1>

            <p className="text-lg text-gray-500 max-w-md leading-relaxed">
              Practice with AI that remembers your story — across resumes,
              roles, and rounds. Built for PMs, software engineers, and beyond.
            </p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={onSignUp}
                className="px-8 py-3.5 bg-orange-400 text-white text-base font-semibold rounded-xl hover:bg-orange-500 transition cursor-pointer shadow-sm"
              >
                Start free →
              </button>
              <button
                onClick={onTryDemo}
                className="px-6 py-3.5 text-gray-600 text-base hover:text-gray-900 cursor-pointer"
              >
                Try demo →
              </button>
            </div>
          </div>

          {/* Right — placeholder */}
          <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-orange-200 bg-white/40 flex items-center justify-center">
            <span className="text-orange-300 text-sm">✦ Visual coming soon</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
