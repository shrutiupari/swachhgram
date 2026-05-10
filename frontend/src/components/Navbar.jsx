import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = {
  citizen:  [
    { to: "/dashboard",  label: "Home" },
    { to: "/report",     label: "Report Garbage" },
    { to: "/my-reports", label: "My Reports" },
  ],
  gp_staff: [
    { to: "/gp", label: "GP Dashboard" },
  ],
  admin: [
    { to: "/admin", label: "Admin Panel" },
    { to: "/gp",    label: "GP View" },
  ],
};

export default function Navbar() {
  const { name, role, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const links = NAV_LINKS[role] || NAV_LINKS.citizen;

  const roleBadge = {
    citizen:  { label: "Citizen",  color: "bg-forest-100 text-forest-800" },
    gp_staff: { label: "GP Staff", color: "bg-blue-100 text-blue-800" },
    admin:    { label: "Admin",    color: "bg-purple-100 text-purple-800" },
  }[role] || { label: role, color: "bg-gray-100 text-gray-700" };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-display font-bold text-forest-800 text-lg">SwachhGram</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === l.to
                  ? "bg-forest-50 text-forest-700"
                  : "text-gray-600 hover:text-forest-700 hover:bg-forest-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
          <span className="text-sm text-gray-600 font-medium">{name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-semibold">
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          <span className="text-xl">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className="block px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-forest-50">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-600">{name}</span>
            <button onClick={logout} className="text-sm text-red-500 font-semibold">Sign out</button>
          </div>
        </div>
      )}
    </nav>
  );
}
