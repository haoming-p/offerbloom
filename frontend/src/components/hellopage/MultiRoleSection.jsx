// Strength 01 — Multi-role tracking
// Flipped from Hero's layout (visual left, text right) so the page reads as
// distinct scenes instead of one repeating column. Two stacked browser frames
// make "multiple roles, one workspace" felt, not just stated.
const MultiRoleSection = () => {
  return (
    <section
      id="multi-role-section"
      className="h-screen snap-start relative bg-white flex items-center px-12"
    >
      <div className="max-w-[1500px] mx-auto w-full grid grid-cols-[1.2fr_1fr] gap-16 items-center">
        {/* Left — stacked browser frames */}
        <div className="relative">
          {/* Back frame: Positions, offset behind to the LEFT so it peeks toward the page edge, not toward the text */}
          <div className="absolute top-0 left-0 w-[85%] -translate-x-8 -translate-y-10 -rotate-3 opacity-80">
            <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 bg-gray-50">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              </div>
              <div className="aspect-[2/1] bg-gray-50">
                <img
                  src="/screenshots/3-positions.png"
                  alt="Positions"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Front frame: Dashboard */}
          <div className="relative rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="w-3 h-3 rounded-full bg-red-400/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <span className="w-3 h-3 rounded-full bg-green-400/80" />
              <div className="flex-1 flex justify-center">
                <span className="text-[11px] text-gray-400 px-3 py-0.5 bg-white rounded-md border border-gray-100">
                  offerbloom.app · Dashboard
                </span>
              </div>
            </div>
            <div className="aspect-[2/1] bg-gray-50">
              <img
                src="/screenshots/1-dashboard.png"
                alt="Dashboard with multiple roles"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Right — copy */}
        <div className="flex flex-col gap-7">
          <div className="inline-flex w-fit items-center gap-2 px-4 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-sm text-orange-600 font-medium">
            <span>01</span>
            <span className="text-orange-300">·</span>
            <span>Multi-role tracking</span>
          </div>

          <h2 className="text-6xl font-bold text-gray-900 leading-[1.05] tracking-tight">
            Every role gets<br />
            its own workspace.
          </h2>

          <p className="text-xl text-gray-500 max-w-lg leading-relaxed">
            Stop scattering resumes, JDs, and prep notes across folders.
            Each position lives in its own space — when you switch from a PM
            interview to a SWE one, your context comes with it.
          </p>

          <ul className="flex flex-col gap-3 mt-2">
            <li className="flex items-start gap-3 text-base text-gray-700">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span>
                <span className="font-semibold text-gray-900">Per-position resumes & JDs</span> — no more guessing which version you sent.
              </span>
            </li>
            <li className="flex items-start gap-3 text-base text-gray-700">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span>
                <span className="font-semibold text-gray-900">Role-tagged prep questions</span> — only what's relevant to today's interview.
              </span>
            </li>
            <li className="flex items-start gap-3 text-base text-gray-700">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span>
                <span className="font-semibold text-gray-900">Switch in one click</span> — Bloom remembers where you left off.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default MultiRoleSection;
