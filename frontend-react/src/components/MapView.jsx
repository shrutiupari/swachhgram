import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { StatusBadge } from "./StatusBadge";

// Fix default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored markers by status
function makeIcon(color) {
  return L.divIcon({
    html: `<div style="
      background:${color};
      width:16px;height:16px;border-radius:50%;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
    "></div>`,
    className: "",
    iconSize:   [16, 16],
    iconAnchor: [8, 8],
  });
}

const STATUS_ICONS = {
  PENDING:     makeIcon("#f59e0b"),
  ASSIGNED:    makeIcon("#3b82f6"),
  IN_PROGRESS: makeIcon("#f97316"),
  RESOLVED:    makeIcon("#22c55e"),
  REJECTED:    makeIcon("#ef4444"),
};

export default function MapView({ reports = [], center = [20.5937, 78.9629], zoom = 5 }) {
  const validReports = reports.filter((r) => r.latitude && r.longitude);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full rounded-2xl border border-gray-200"
      style={{ height: 400 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validReports.map((r) => (
        <Marker
          key={r.reportId}
          position={[r.latitude, r.longitude]}
          icon={STATUS_ICONS[r.status] || STATUS_ICONS.PENDING}
        >
          <Popup>
            <div className="text-sm min-w-[160px]">
              {r.photoUrl && (
                <img src={r.photoUrl} alt="" className="w-full h-24 object-cover rounded mb-2" />
              )}
              <p className="font-semibold text-gray-800 mb-1">
                {r.address || "Reported location"}
              </p>
              <StatusBadge status={r.status} />
              {r.severity && (
                <p className="text-xs text-gray-500 mt-1">Severity: {r.severity}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(r.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
