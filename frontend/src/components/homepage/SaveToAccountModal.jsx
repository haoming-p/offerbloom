import { useState } from "react";
import { register, getToken, saveToken } from "../../services/auth";
import { saveDemoToAccount } from "../../services/demo";

const SaveToAccountModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Save the current guest token before it gets overwritten by register
      const guestToken = getToken();
      if (!guestToken) throw new Error("Demo session expired");

      // 1. Create the new account
      const result = await register(form.name, form.email, form.password);
      // 2. Switch token to the new account
      saveToken(result.access_token);
      // 3. Migrate guest data into the new account, then delete guest
      await saveDemoToAccount(result.access_token, guestToken);

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          Save your demo work
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Create an account to keep your demo session — your demo will be migrated, then deleted.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-orange-400 text-white font-semibold rounded-xl hover:bg-orange-500 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Saving…" : "Create account & save"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4">
          Already have an account? Sign in normally — your existing data stays untouched.
        </p>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-gray-300 hover:text-gray-500 cursor-pointer text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SaveToAccountModal;
