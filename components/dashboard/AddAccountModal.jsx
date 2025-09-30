"use client";

import { useEffect, useState } from "react";

export default function AddAccountModal({ open, onClose, onAccountAdded }) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!url.trim()) {
      setError("Please enter an account URL.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to add account.");
      }

      if (typeof onAccountAdded === "function") {
        await onAccountAdded();
      }

      onClose();
    } catch (caughtError) {
      setError(caughtError.message || "Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Add Social Account</h2>
            <p className="mt-1 text-sm text-slate-400">
              Paste the public profile URL. Instagram and TikTok are supported right now—YouTube support is on the roadmap.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Account URL
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.instagram.com/creator/"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </label>

          {error ? <p className="text-xs text-red-400">{error}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? "Adding…" : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
