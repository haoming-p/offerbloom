import React from "react";

const MeTab = ({ user, onLogout }) => {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="p-8 max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">My Account</h2>

      {/* Avatar + info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-xl font-bold text-orange-500">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name || "—"}</p>
            <p className="text-sm text-gray-400">{user?.email || "—"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-gray-500">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-400">Name</span>
            <span className="font-medium text-gray-700">{user?.name || "—"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Email</span>
            <span className="font-medium text-gray-700">{user?.email || "—"}</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-2.5 border border-red-200 text-red-400 rounded-xl text-sm hover:bg-red-50 hover:border-red-300 cursor-pointer transition-all"
      >
        Sign out
      </button>
    </div>
  );
};

export default MeTab;
