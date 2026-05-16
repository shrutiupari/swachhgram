import { fetchAuthSession } from "aws-amplify/auth";
import { API_BASE } from "./aws-exports";

async function getToken() {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || "";
  } catch {
    return "";
  }
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export const api = {
  // Get pre-signed upload URL from S3
  getUploadUrl: (filename, contentType) =>
    apiFetch("/upload-url", {
      method: "POST",
      body: JSON.stringify({ filename, contentType }),
    }),

  // Upload file directly to S3 via pre-signed URL
  uploadToS3: async (presignedUrl, file) => {
    const res = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!res.ok) throw new Error("S3 upload failed");
  },

  // Analyze image with Rekognition
  analyzeImage: (s3Key) =>
    apiFetch("/analyze", { method: "POST", body: JSON.stringify({ s3Key }) }),

  // Get citizen's own reports or all reports for GP/admin
  getReports: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/reports${qs ? "?" + qs : ""}`);
  },

  // Submit new garbage report
  createReport: (data) =>
    apiFetch("/reports", { method: "POST", body: JSON.stringify(data) }),

  // ─── Admin / GP APIs ──────────────────────────────────────────────────────

  admin: {
    getStats:   ()       => apiFetch("/admin/stats"),
    getReports: (params) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/admin/reports${qs ? "?" + qs : ""}`);
    },
    updateStatus: (reportId, createdAt, status, note) =>
      apiFetch(`/admin/reports/${reportId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, note, createdAt }),
      }),
    getUsers: () => apiFetch("/admin/users"),
  },
};
