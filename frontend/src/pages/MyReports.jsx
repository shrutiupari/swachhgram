import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import ReportCard from "../components/ReportCard";

const STATUS_TABS = ["ALL", "PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"];

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("ALL");

  useEffect(() => {
    api.getReports().then((d) => { setReports(d.reports || []); setLoading(false); });
  }, []);

  const filtered = tab === "ALL" ? reports : reports.filter((r) => r.status === tab);
  const sorted   = [...filtered].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-900">My Reports</h1>
        <Link to="/report" className="btn-primary text-sm py-2">+ New Report</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((s) => {
          const count = s === "ALL" ? reports.length : reports.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === s ? "bg-forest-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-forest-400"
              }`}
            >
              {s.replace("_", " ")} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="card text-center text-gray-400 py-10">Loading reports…</div>
      ) : sorted.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-gray-600 font-semibold">No {tab !== "ALL" ? tab.toLowerCase() : ""} reports</p>
          {tab === "ALL" && (
            <Link to="/report" className="btn-primary inline-block mt-4">Report garbage</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <ReportCard key={r.reportId} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
