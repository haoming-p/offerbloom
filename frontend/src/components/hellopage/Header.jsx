const Header = ({ onSignIn, onSignUp, onOpenResources }) => {
  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-10 px-16 py-5 bg-white/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-2xl font-bold text-orange-500">OfferBloom</span>
        <nav className="flex items-center gap-8 text-sm text-gray-600">
          <button onClick={() => scrollTo("multi-role-section")} className="hover:text-gray-900 cursor-pointer">Features</button>
          <button onClick={onOpenResources} className="hover:text-gray-900 cursor-pointer">Resources</button>
          <button onClick={() => scrollTo("faq-section")} className="hover:text-gray-900 cursor-pointer">FAQ</button>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={onSignUp}
            className="text-sm bg-orange-400 text-white px-5 py-2 rounded-lg font-medium hover:bg-orange-500 cursor-pointer"
          >
            Start free
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
