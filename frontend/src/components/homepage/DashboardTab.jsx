import { LuFileText, LuFileUser, LuArrowRight } from "react-icons/lu";
import FloatingChatBot from "./FloatingChatBot";

const DashboardTab = ({ data, user, onNavigateToPrep }) => {
  const { roles = [], positions = [], files = [] } = data || {};
  const isDemoGuest = user?.is_demo_guest;

  const positionHasFile = (positionId) =>
    files.some((f) => f.linkedTo?.includes(`pos-${positionId}`));
  const roleHasFile = (roleId) =>
    files.some((f) => f.linkedTo?.includes(roleId));

  return (
    <>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {isDemoGuest ? "Explore a sample dashboard" : "Welcome back! Ready to prep?"}
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          {isDemoGuest
            ? "Your private demo workspace. Edits stay with you and never affect other visitors."
            : "Click a role or position to start practicing"}
        </p>

        {roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            No roles yet — head to <span className="text-orange-500">My Positions</span> to add one.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {roles.map((role) => {
              const rolePositions = positions.filter((p) => p.role === role.id);
              const hasResume = roleHasFile(role.id);

              return (
                <section
                  key={role.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                  {/* Role header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      {role.emoji && <span className="text-2xl">{role.emoji}</span>}
                      <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                          {role.label}
                        </h2>
                        <p className="text-xs text-gray-400">
                          {rolePositions.length}{" "}
                          {rolePositions.length === 1 ? "position" : "positions"}
                          {hasResume && " · Resume linked"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateToPrep?.(role.id)}
                      className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 cursor-pointer font-medium"
                    >
                      Practice questions
                      <LuArrowRight size={14} />
                    </button>
                  </div>

                  {/* Position grid (or empty state) */}
                  {rolePositions.length === 0 ? (
                    <div className="text-xs text-gray-300 italic">
                      No positions added yet for this role.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rolePositions.map((pos) => {
                        const hasJD = !!pos.jd;
                        const hasFile = positionHasFile(pos.id);
                        return (
                          <button
                            key={pos.id}
                            onClick={() => onNavigateToPrep?.(role.id)}
                            className="group flex flex-col gap-3 p-4 bg-gray-50 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-xl text-left cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 truncate">
                                  {pos.title}
                                </h3>
                                {pos.company && (
                                  <p className="text-xs text-gray-400 truncate">
                                    @ {pos.company}
                                  </p>
                                )}
                              </div>
                              <LuArrowRight
                                size={16}
                                className="text-gray-300 group-hover:text-orange-500 flex-shrink-0 mt-0.5"
                              />
                            </div>

                            {(hasJD || hasFile) && (
                              <div className="flex flex-wrap gap-1.5">
                                {hasJD && (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-500">
                                    <LuFileText size={11} />
                                    JD
                                  </span>
                                )}
                                {hasFile && (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-500">
                                    <LuFileUser size={11} />
                                    Resume
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <FloatingChatBot roles={roles} />
    </>
  );
};

export default DashboardTab;
