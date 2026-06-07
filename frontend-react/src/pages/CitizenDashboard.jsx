import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import MapView from "../components/MapView";

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`card flex items-center gap-4 border-l-4 ${color}`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-2xl font-display font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function CitizenDashboard() {
  const { name } = useAuth();
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.getReports().then((d) => { setReports(d.reports || []); setLoading(false); });
  }, []);

  const counts = {
    total:    reports.length,
    pending:  reports.filter((r) => r.status === "PENDING").length,
    resolved: reports.filter((r) => r.status === "RESOLVED").length,
  };

  const recent = [...reports].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Namaste, {name} 🙏
          </h1>
          <p className="text-gray-500 text-sm mt-1">Help keep your village clean</p>
        </div>
        <Link to="/report" className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto">
          <span>📸</span> Report Garbage
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="📋" label="Total Reports"  value={counts.total}   color="border-forest-500" />
        <StatCard icon="⏳" label="Pending"         value={counts.pending}  color="border-yellow-400" />
        <StatCard icon="✅" label="Resolved"        value={counts.resolved} color="border-green-500"  />
      </div>

      {/* Map */}
      {reports.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg text-gray-800 mb-3">Your reports on map</h2>
          <MapView reports={reports} />
        </div>
      )}

      {/* Recent reports */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg text-gray-800">Recent reports</h2>
          {reports.length > 3 && (
            <Link to="/my-reports" className="text-sm text-forest-700 font-semibold hover:underline">
              View all →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="card text-center text-gray-400 py-8">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-gray-600 font-semibold">No reports yet</p>
            <p className="text-gray-400 text-sm mt-1">Spot garbage? Report it and help your community!</p>
            <Link to="/report" className="btn-primary inline-block mt-4">Report now</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((r) => (
              <div key={r.reportId} className="card flex gap-4 items-center hover:shadow-md transition-shadow">
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🗑️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{r.address || "Reported location"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="bg-forest-50 border border-forest-100 rounded-2xl p-5 flex gap-4">
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-semibold text-forest-800 text-sm">How it works</p>
          <p className="text-forest-700 text-sm mt-1">
            Report garbage → AI auto-detects waste → Gram Panchayat is notified → Staff takes action → You get an update.
          </p>
        </div>
      </div>
    </div>
  );
}
