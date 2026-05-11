import { useEffect, useState } from "react";

// Tour of OfferBloom in 8 steps. Order tells a story: arrive → set up your
// context (positions, files, stories) → prep, answer, practice → your profile.
// Each step has a "key strength" caption so visitors get the value, not just
// the visual.
const SCREENSHOTS = [
  {
    src: "/screenshots/1-dashboard.png",
    title: "One hub for every role",
    subtitle: "See where every position stands at a glance.",
  },
  {
    src: "/screenshots/3-positions.png",
    title: "Track every position",
    subtitle: "Each role gets its own resume, JD, and progress.",
  },
  {
    src: "/screenshots/4-files.png",
    title: "Bring your context",
    subtitle: "Resumes, JDs, recruiter notes — all in one place.",
  },
  {
    src: "/screenshots/4-stories.png",
    title: "Build a reusable story library",
    subtitle: "Capture your experiences once, use them everywhere.",
  },
  {
    src: "/screenshots/2-prep.png",
    title: "Curated questions per role",
    subtitle: "Behavioral, technical, role-specific — already organized.",
  },
  {
    src: "/screenshots/2-prep-answer.png",
    title: "Draft answers, then iterate",
    subtitle: "Version your responses as your story evolves.",
  },
  {
    src: "/screenshots/2-prep-practice.png",
    title: "Practice out loud with AI feedback",
    subtitle: "Record, transcribe, and get Bloom's review in seconds.",
  },
  {
    src: "/screenshots/5-me.png",
    title: "Your prep profile",
    subtitle: "Preferences and stories that travel with you.",
  },
];

const ROTATE_MS = 4500;

const HeroVisual = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setIdx((idx + 1) % SCREENSHOTS.length);
    }, ROTATE_MS);
    return () => clearTimeout(t);
  }, [idx]);

  const current = SCREENSHOTS[idx];

  return (
    <div className="hero-float relative">
      <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <span className="w-3 h-3 rounded-full bg-red-400/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <span className="w-3 h-3 rounded-full bg-green-400/80" />
          <div className="flex-1 flex justify-center">
            <span className="text-[11px] text-gray-400 px-3 py-0.5 bg-white rounded-md border border-gray-100">
              offerbloom.app
            </span>
          </div>
        </div>

        {/* Stacked images — frame matches the ~2:1 screenshot ratio */}
        <div className="relative aspect-[2/1] bg-gray-50">
          {SCREENSHOTS.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                idx === i ? "opacity-100" : "opacity-0"
              }`}
              loading="eager"
            />
          ))}
        </div>
      </div>

      {/* Caption — re-keyed by idx so it re-runs the fade-in on each step */}
      <div
        key={idx}
        className="caption-fade mt-12 text-center px-6 min-h-[70px]"
      >
        <div className="text-lg font-semibold text-gray-900">
          {current.title}
        </div>
        <div className="text-sm text-gray-500 mt-2">{current.subtitle}</div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-6">
        {SCREENSHOTS.map((s, i) => (
          <button
            key={s.src}
            onClick={() => setIdx(i)}
            aria-label={`Show ${s.title}`}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-6 bg-orange-400" : "w-1.5 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>

      <style>{`
        .hero-float {
          animation: heroFloat 6s ease-in-out infinite;
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .caption-fade {
          animation: captionFade 600ms ease-out;
        }
        @keyframes captionFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-float, .caption-fade { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default HeroVisual;
