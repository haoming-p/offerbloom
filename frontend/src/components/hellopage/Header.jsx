const Header = ({ onSignIn, onSignUp, onTryDemo }) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 px-16 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/icon.png" alt="" className="w-11 h-11" />
          <span className="text-2xl font-bold text-orange-500">OfferBloom</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={onSignUp}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 cursor-pointer"
          >
            Start free
          </button>
          <button
            onClick={onTryDemo}
            className="text-sm bg-orange-400 text-white px-5 py-2 rounded-lg font-medium hover:bg-orange-500 cursor-pointer"
          >
            Try demo
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
