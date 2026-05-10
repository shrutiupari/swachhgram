import React, { useState } from "react";
import { StatusBadge, SeverityBadge } from "./StatusBadge";

export default function ReportCard({ report, showActions = false, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus]     = useState(report.status);
  const [note, setNote]         = useState("");
  const [saving, setSaving]     = useState(false);

  const handleStatusChange = async () => {
    if (!status || !onStatusChange) return;
    setSaving(true);
    await onStatusChange(report, status, note);
    setSaving(false);
    setExpanded(false);
  };

  const date = new Date(report.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Photo thumbnail */}
        {report.photoUrl && (
          <img
            src={report.photoUrl}
            alt="Garbage photo"
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-gray-100"
          />
        )}
        {!report.photoUrl && (
          <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-3xl">
            🗑️
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-xs text-gray-400 font-mono mb-0.5">{report.reportId.slice(0, 8)}…</p>
              <p className="font-semibold text-gray-800 text-sm truncate">
                {report.address || `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}` || "Location not set"}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={report.status} />
              {report.severity && <SeverityBadge severity={report.severity} />}
            </div>
          </div>

          {report.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{report.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span>📅 {date}</span>
            {report.reporterName && <span>👤 {report.reporterName}</span>}
            {report.aiConfidence > 0 && (
              <span className="text-forest-600">🤖 AI: {report.aiConfidence}% confident</span>
            )}
          </div>

          {report.statusNote && (
            <p className="text-xs text-gray-500 mt-2 italic border-l-2 border-gray-200 pl-2">
              GP note: {report.statusNote}
            </p>
          )}
        </div>
      </div>

      {/* GP Staff actions */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {!expanded ? (
            <button onClick={() => setExpanded(true)} className="text-sm text-forest-700 font-semibold hover:underline">
              Update status →
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {["ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                      status === s
                        ? "bg-forest-700 text-white border-forest-700"
                        : "bg-white text-gray-600 border-gray-200 hover:border-forest-400"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note to citizen…"
                rows={2}
                className="input text-sm resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleStatusChange} disabled={saving} className="btn-primary text-sm py-2">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setExpanded(false)} className="btn-secondary text-sm py-2">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
