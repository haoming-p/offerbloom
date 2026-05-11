// Closing CTA section. Doubles as both the final scroll-snap stop and the
// site footer — copyright sits at the bottom edge.
const Footer = ({ onSignIn, onSignUp, onTryDemo }) => {
  return (
    <footer className="min-h-screen snap-start relative bg-gradient-to-b from-white to-orange-50 flex flex-col items-center justify-center px-12 py-16">
      <div className="flex flex-col items-center gap-6 max-w-3xl">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <img src="/icon.png" alt="" className="w-14 h-14" />
          <span className="text-3xl font-bold text-orange-500">OfferBloom</span>
        </div>

        <h2 className="text-6xl font-bold text-gray-900 text-center leading-[1.05] tracking-tight">
          Ready to land<br />
          your next offer?
        </h2>

        <p className="text-lg text-gray-500 text-center mt-1">
          Practice with AI that remembers your story.
        </p>

        <div className="flex items-center gap-4 mt-6">
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
          <button
            onClick={onSignIn}
            className="px-6 py-4 text-gray-600 text-base hover:text-gray-900 cursor-pointer"
          >
            Sign in →
          </button>
        </div>
      </div>

      {/* Tiny copyright pinned to bottom */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} OfferBloom
      </div>
    </footer>
  );
};

export default Footer;
