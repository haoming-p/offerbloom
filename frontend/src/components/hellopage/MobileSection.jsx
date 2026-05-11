// Strength 04 — Practice anywhere
// Three phone mockups, tilted, showing the core mobile flow.
// "Coming soon to iOS" is set honestly up front so visitors aren't surprised.
const MobileSection = () => {
  const phones = [
    "/screenshots/mobile-3-afterFilter.jpeg",
    "/screenshots/mobile-41-add-practice.jpeg",
    "/screenshots/mobile-42-feedback.jpeg",
  ];

  return (
    <section
      id="mobile"
      className="min-h-screen snap-start relative bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 flex items-center px-12 py-12 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-10">
        {/* Centered intro */}
        <div className="text-center max-w-4xl mx-auto flex flex-col gap-4 items-center">
          <div className="inline-flex w-fit items-center gap-2.5 px-4 py-1.5 bg-orange-100 border border-orange-300 rounded-full text-sm font-medium shadow-sm">
            <span className="text-orange-700 font-bold tracking-wider">04</span>
            <span className="text-orange-400">·</span>
            <span className="text-orange-600">On the go</span>
          </div>

          <h2 className="text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Practice anytime, anywhere.
          </h2>

          <p className="text-lg text-gray-500 leading-relaxed">
            Five minutes before the interview, or while waiting for coffee —
            run a quick rep without opening your laptop.
          </p>

          {/* Coming soon to iOS badge */}
          <div className="inline-flex w-fit items-center gap-2 px-3.5 py-1.5 bg-gray-900 text-white rounded-full text-xs font-medium mt-1">
            <span></span>
            <span>Coming soon to iOS</span>
          </div>
        </div>

        {/* 3 phones */}
        <div className="flex justify-center items-end gap-8 mt-2">
          {phones.map((src, i) => (
            <div
              key={src}
              className="relative w-[220px] aspect-[9/19.5] bg-gray-900 rounded-[2.2rem] p-1.5 shadow-2xl"
              style={{
                transform: `rotate(${(i - 1) * 3}deg) translateY(${i === 1 ? "-12px" : "0px"})`,
              }}
            >
              {/* Dynamic island */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover rounded-[1.7rem]"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MobileSection;
