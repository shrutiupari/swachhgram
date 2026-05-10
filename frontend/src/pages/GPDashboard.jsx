import React, { useEffect, useState } from "react";
import { api } from "../api";
import ReportCard from "../components/ReportCard";
import MapView from "../components/MapView";

const STATUS_TABS = ["ALL", "PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const SEVERITY_TABS = ["ALL", "HIGH", "MEDIUM", "LOW"];

function StatBadge({ label, value, color }) {
  return (
    <div className={`card border-l-4 ${color} flex-1 min-w-[120px]`}>
      <p className="text-2xl font-display font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function GPDashboard() {
  const [reports,   setReports]   = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [statusTab, setStatusTab] = useState("PENDING");
  const [sevTab,    setSevTab]    = useState("ALL");
  const [view,      setView]      = useState("list"); // "list" | "map"

  const loadData = async () => {
    setLoading(true);
    const [r, s] = await Promise.all([api.admin.getReports(), api.admin.getStats()]);
    setReports(r.reports || []);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (report, status, note) => {
    await api.admin.updateStatus(report.reportId, report.createdAt, status, note);
    await loadData();
  };

  const filtered = reports
    .filter((r) => statusTab === "ALL" || r.status === statusTab)
    .filter((r) => sevTab    === "ALL" || r.severity === sevTab)
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Gram Panchayat Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and resolve garbage reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("list")} className={`btn-${view === "list" ? "primary" : "secondary"} text-sm py-2`}>
            📋 List
          </button>
          <button onClick={() => setView("map")} className={`btn-${view === "map" ? "primary" : "secondary"} text-sm py-2`}>
            🗺️ Map
          </button>
          <button onClick={loadData} className="btn-secondary text-sm py-2">🔄 Refresh</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          <StatBadge label="Total"       value={stats.total}       color="border-gray-400" />
          <StatBadge label="Pending"     value={stats.pending}     color="border-yellow-400" />
          <StatBadge label="In Progress" value={stats.in_progress} color="border-orange-400" />
          <StatBadge label="Resolved"    value={stats.resolved}    color="border-green-500" />
          <StatBadge label="Rejected"    value={stats.rejected}    color="border-red-400" />
        </div>
      )}

      {/* Map view */}
      {view === "map" && (
        <MapView reports={reports} />
      )}

      {/* List view */}
      {view === "list" && (
        <>
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((s) => {
              const cnt = s === "ALL" ? reports.length : reports.filter((r) => r.status === s).length;
              return (
                <button key={s} onClick={() => setStatusTab(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusTab === s ? "bg-forest-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-forest-400"
                  }`}>
                  {s.replace("_", " ")} <span className="opacity-70">({cnt})</span>
                </button>
              );
            })}
          </div>

          {/* Severity filter */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500 font-semibold">Severity:</span>
            {SEVERITY_TABS.map((s) => (
              <button key={s} onClick={() => setSevTab(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  sevTab === s ? "bg-earth-600 text-white border-earth-600" : "bg-white border-gray-200 text-gray-600"
                }`}>
                {s}
              </button>
            ))}
          </div>

          {/* Reports */}
          {loading ? (
            <div className="card text-center text-gray-400 py-10">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-600 font-semibold">No reports with these filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <ReportCard
                  key={r.reportId}
                  report={r}
                  showActions={true}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
