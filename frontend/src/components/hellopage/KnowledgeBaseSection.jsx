// Strength 02 — Personalized memory
// Dark bg with white floating cards: visually distinct from Strength 1's
// white split-layout. Centered intro + 3-column flow tells the
// input → memory → output story.
const KnowledgeBaseSection = () => {
  return (
    <section
      id="knowledge-base"
      className="h-screen snap-start relative bg-gray-900 flex items-center px-12 py-16 overflow-hidden"
    >
      {/* Subtle orange glow in background for warmth */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-[1500px] mx-auto w-full flex flex-col gap-12">
        {/* Centered intro */}
        <div className="text-center max-w-4xl mx-auto flex flex-col gap-5 items-center">
          <div className="inline-flex w-fit items-center gap-2.5 px-4 py-1.5 bg-orange-500/15 backdrop-blur-sm border border-orange-400/40 rounded-full text-sm font-medium">
            <span className="text-white font-bold tracking-wider">02</span>
            <span className="text-orange-300/40">·</span>
            <span className="text-orange-300">Personalized AI</span>
          </div>
          <h2 className="text-6xl font-bold text-white leading-[1.05] tracking-tight">
            Bloom remembers<br />
            what you tell it.
          </h2>
          <p className="text-xl text-gray-400 leading-relaxed">
            Set your preferences once. Bloom keeps them in mind across every
            role, every question, every practice.
          </p>
        </div>

        {/* 3-step flow */}
        <div className="grid grid-cols-3 gap-6 items-stretch">
          {/* Col 1 — Set preferences */}
          <div className="bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold flex items-center justify-center">
                1
              </span>
              <span className="text-sm font-semibold text-gray-900">
                You tell Bloom
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {[
                "Use STAR format",
                "Keep answers under 90 sec",
                "Tone: confident, not boastful",
              ].map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-50/60 border border-orange-100 rounded-lg text-sm text-gray-700"
                >
                  <span className="text-orange-400">◆</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 — Bloom remembers */}
          <div className="bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold flex items-center justify-center">
                2
              </span>
              <span className="text-sm font-semibold text-gray-900">
                Bloom remembers
              </span>
            </div>
            <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-50/50 to-white rounded-xl border border-orange-100 flex items-center justify-center overflow-hidden">
              <div className="absolute z-10 w-12 h-12 rounded-full bg-orange-400 flex items-center justify-center shadow-md">
                <span className="text-white text-lg">🐱</span>
              </div>
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-white border border-orange-200 rounded-md text-[11px] text-gray-700 shadow-sm">
                STAR format
              </div>
              <div className="absolute top-4 right-3 px-2.5 py-1 bg-white border border-orange-200 rounded-md text-[11px] text-gray-700 shadow-sm">
                My story
              </div>
              <div className="absolute bottom-4 left-4 px-2.5 py-1 bg-white border border-orange-200 rounded-md text-[11px] text-gray-700 shadow-sm">
                My resume
              </div>
              <div className="absolute bottom-3 right-4 px-2.5 py-1 bg-white border border-orange-200 rounded-md text-[11px] text-gray-700 shadow-sm">
                Concise tone
              </div>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <line x1="50" y1="50" x2="15" y2="15" stroke="#fed7aa" strokeWidth="0.6" />
                <line x1="50" y1="50" x2="85" y2="18" stroke="#fed7aa" strokeWidth="0.6" />
                <line x1="50" y1="50" x2="20" y2="82" stroke="#fed7aa" strokeWidth="0.6" />
                <line x1="50" y1="50" x2="82" y2="88" stroke="#fed7aa" strokeWidth="0.6" />
              </svg>
            </div>
          </div>

          {/* Col 3 — Every answer adapts */}
          <div className="bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold flex items-center justify-center">
                3
              </span>
              <span className="text-sm font-semibold text-gray-900">
                Every answer adapts
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-400 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs">🐱</span>
                </div>
                <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg rounded-tl-sm text-sm text-gray-700 leading-relaxed">
                  Here's a <span className="font-semibold text-orange-600">STAR-format</span> draft using <span className="font-semibold text-orange-600">your story</span>, kept under 90 seconds.
                </div>
              </div>
              <div className="px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-xs text-gray-600">
                <span className="font-semibold text-gray-900">Situation:</span> Led a cross-functional team to launch...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeBaseSection;
