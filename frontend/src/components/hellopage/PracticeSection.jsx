// Strength 03 — Practice with voice + AI feedback
// Different from prior strengths: compact intro on top, then ONE big
// product screenshot with floating annotation tags pointing at key
// features. Reads like a guided tour rather than a feature description.
const PracticeSection = () => {
  return (
    <section
      id="practice"
      className="h-screen snap-start relative bg-gradient-to-b from-orange-50/40 to-white flex items-start px-12 pt-16 pb-8 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-8">
        {/* Compact intro */}
        <div className="text-center max-w-4xl mx-auto flex flex-col gap-4 items-center">
          <div className="inline-flex w-fit items-center gap-2.5 px-4 py-1.5 bg-orange-100 border border-orange-300 rounded-full text-sm font-medium shadow-sm">
            <span className="text-orange-700 font-bold tracking-wider">03</span>
            <span className="text-orange-400">·</span>
            <span className="text-orange-600">Practice & feedback</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Practice out loud.<br />
            Get AI feedback in seconds.
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Record your answer, see the transcript, and get Bloom's review — in seconds.
          </p>
        </div>

        {/* Big screenshot with floating annotations */}
        <div className="relative max-w-[1000px] mx-auto w-full">
          {/* Screenshot in browser frame */}
          <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="w-3 h-3 rounded-full bg-red-400/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <span className="w-3 h-3 rounded-full bg-green-400/80" />
              <div className="flex-1 flex justify-center">
                <span className="text-[11px] text-gray-400 px-3 py-0.5 bg-white rounded-md border border-gray-100">
                  offerbloom.app · Bloom · practice feedback
                </span>
              </div>
            </div>
            <div className="aspect-[2/1] bg-gray-50">
              <img
                src="/screenshots/2-prep-practice.png"
                alt="Practice with voice and AI feedback"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Floating annotations */}
          {/* Top-left: record button */}
          <div
            className="absolute -left-6 top-[42%] -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2.5 annotation-pop"
            style={{ animationDelay: "200ms" }}
          >
            <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-base">
              🎙️
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Tap to record</span>
              <span className="text-[11px] text-gray-500">Voice in, transcript out</span>
            </div>
          </div>

          {/* Top-right: AI feedback */}
          <div
            className="absolute -right-4 top-[28%] -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2.5 annotation-pop"
            style={{ animationDelay: "500ms" }}
          >
            <span className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-sm">
              🐱
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Bloom reviews it</span>
              <span className="text-[11px] text-gray-500">Knows your stories & prefs</span>
            </div>
          </div>

          {/* Bottom-left: transcript */}
          <div
            className="absolute -left-2 bottom-[18%] bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2.5 annotation-pop"
            style={{ animationDelay: "800ms" }}
          >
            <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-base">
              📝
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">See the transcript</span>
              <span className="text-[11px] text-gray-500">Auto-saved as a practice</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .annotation-pop {
          opacity: 0;
          transform: translateY(8px) scale(0.95);
          animation: annotationPop 600ms ease-out forwards;
        }
        @keyframes annotationPop {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .annotation-pop {
            opacity: 1;
            transform: none;
            animation: none;
          }
        }
      `}</style>
    </section>
  );
};

export default PracticeSection;
