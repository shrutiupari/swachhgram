const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE}/local-upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Image upload failed");
  }

  return response.json();
}

export const api = {
  analyzeImage: (photoKey) =>
    apiFetch("/analyze", {
      method: "POST",
      body: JSON.stringify({ photoKey }),
    }),
  createReport: (data) =>
    apiFetch("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getReports: () => apiFetch("/reports"),
  getAdminReports: () => apiFetch("/admin/reports"),
  getStats: () => apiFetch("/admin/stats"),
  updateStatus: (reportId, createdAt, status, note) =>
    apiFetch(`/admin/reports/${reportId}/status`, {
      method: "PUT",
      body: JSON.stringify({ createdAt, status, note }),
    }),
};
