import React from "react";

const STATUS_CONFIG = {
  PENDING:     { label: "Pending",     bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" },
  ASSIGNED:    { label: "Assigned",    bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500"   },
  IN_PROGRESS: { label: "In Progress", bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  RESOLVED:    { label: "Resolved",    bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500"  },
  REJECTED:    { label: "Rejected",    bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
};

const SEVERITY_CONFIG = {
  HIGH:   { label: "High",   bg: "bg-red-100",    text: "text-red-800"    },
  MEDIUM: { label: "Medium", bg: "bg-yellow-100", text: "text-yellow-800" },
  LOW:    { label: "Low",    bg: "bg-green-100",  text: "text-green-800"  },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label} severity
    </span>
  );
}

export default StatusBadge;
