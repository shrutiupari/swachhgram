import React, { useEffect, useState } from "react";
import { api } from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = {
  PENDING:     "#f59e0b",
  ASSIGNED:    "#3b82f6",
  IN_PROGRESS: "#f97316",
  RESOLVED:    "#22c55e",
  REJECTED:    "#ef4444",
};

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card flex items-start gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-2xl font-display font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [reports, setReports] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [tab,     setTab]     = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.admin.getStats(),
      api.admin.getReports(),
      api.admin.getUsers().catch(() => ({ users: [] })),
    ]).then(([s, r, u]) => {
      setStats(s);
      setReports(r.reports || []);
      setUsers(u.users || []);
      setLoading(false);
    });
  }, []);

  // Build chart data
  const pieData = stats
    ? Object.entries(PIE_COLORS).map(([k, color]) => ({
        name: k.replace("_", " "),
        value: stats[k.toLowerCase()] || 0,
        color,
      })).filter((d) => d.value > 0)
    : [];

  const sevData = [
    { name: "High",   value: reports.filter((r) => r.severity === "HIGH").length   },
    { name: "Medium", value: reports.filter((r) => r.severity === "MEDIUM").length },
    { name: "Low",    value: reports.filter((r) => r.severity === "LOW").length    },
  ];

  // Village-wise count (top 8)
  const villageCounts = {};
  for (const r of reports) {
    const v = r.village || r.ward || "Unknown";
    villageCounts[v] = (villageCounts[v] || 0) + 1;
  }
  const villageData = Object.entries(villageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const resolutionRate = stats?.total
    ? Math.round((stats.resolved / stats.total) * 100)
    : 0;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-forest-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-gray-500 text-sm">Loading admin data…</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">System-wide overview</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-0">
        {[["overview", "📊 Overview"], ["reports", "📋 Reports"], ["users", "👥 Users"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === key ? "border-forest-600 text-forest-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon="📋" label="Total Reports"    value={stats?.total || 0} />
            <StatCard icon="⏳" label="Pending"           value={stats?.pending || 0} />
            <StatCard icon="✅" label="Resolved"          value={stats?.resolved || 0} sub={`${resolutionRate}% resolution rate`} />
            <StatCard icon="👥" label="Registered Users"  value={users.length} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Status pie */}
            <div className="card">
              <h3 className="font-display font-bold text-gray-700 mb-4">Reports by status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Severity bar */}
            <div className="card">
              <h3 className="font-display font-bold text-gray-700 mb-4">Reports by severity</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sevData} barSize={40}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Village chart */}
            {villageData.length > 0 && (
              <div className="card sm:col-span-2">
                <h3 className="font-display font-bold text-gray-700 mb-4">Reports by village / ward</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={villageData} barSize={32} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#15803d" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports tab */}
      {tab === "reports" && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 pr-4 font-semibold">ID</th>
                  <th className="pb-3 pr-4 font-semibold">Location</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 font-semibold">Severity</th>
                  <th className="pb-3 pr-4 font-semibold">Reporter</th>
                  <th className="pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...reports].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).map((r) => (
                  <tr key={r.reportId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400">{r.reportId.slice(0, 8)}</td>
                    <td className="py-3 pr-4 text-gray-700 max-w-[180px] truncate">{r.address || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        r.status === "RESOLVED" ? "bg-green-100 text-green-800" :
                        r.status === "PENDING"  ? "bg-yellow-100 text-yellow-800" :
                        r.status === "REJECTED" ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        r.severity === "HIGH" ? "bg-red-100 text-red-800" :
                        r.severity === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>{r.severity || "—"}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{r.reporterName || "—"}</td>
                    <td className="py-3 text-gray-400 text-xs">
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">No user data available (configure Cognito ListUsers)</div>
          ) : (
            users.map((u) => (
              <div key={u.userId} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 font-bold text-sm">
                  {(u.name || u.userId || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{u.name || u.userId}</p>
                  <p className="text-xs text-gray-400">{u.email || "—"}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  u.role === "admin"    ? "bg-purple-100 text-purple-800" :
                  u.role === "gp_staff"? "bg-blue-100 text-blue-800" :
                  "bg-green-100 text-green-800"
                }`}>{u.role || "citizen"}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
