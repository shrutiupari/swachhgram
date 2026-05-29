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

export const api = {
  // ─── Upload APIs ─────────────────────────────────────────────

  // Used for AWS S3 upload flow
  getUploadUrl: (filename, contentType) =>
    apiFetch("/upload-url", {
      method: "POST",
      body: JSON.stringify({
        filename,
        contentType,
      }),
    }),

  // Upload directly to S3
  uploadToS3: async (presignedUrl, file) => {
    const res = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!res.ok) {
      throw new Error("S3 upload failed");
    }
  },

  // Used for LOCAL Express upload flow
  uploadLocalImage: async (file) => {
    const formData = new FormData();

    formData.append("image", file);

    const res = await fetch(
      `${API_BASE}/api/local-upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  },

  // ─── Analyze APIs ────────────────────────────────────────────

  analyzeImage: (s3Key) =>
    apiFetch("/analyze", {
      method: "POST",
      body: JSON.stringify({ s3Key }),
    }),

  // ─── Reports APIs ────────────────────────────────────────────

  getReports: (params = {}) => {
    const qs = new URLSearchParams(params).toString();

    return apiFetch(
      `/reports${qs ? `?${qs}` : ""}`
    );
  },

  createReport: (data) =>
    apiFetch("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ─── Admin APIs ──────────────────────────────────────────────

  admin: {
    getStats: () =>
      apiFetch("/admin/stats"),

    getReports: (params = {}) => {
      const qs = new URLSearchParams(params).toString();

      return apiFetch(
        `/admin/reports${qs ? `?${qs}` : ""}`
      );
    },

    updateStatus: (
      reportId,
      createdAt,
      status,
      note
    ) =>
      apiFetch(
        `/admin/reports/${reportId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
            note,
            createdAt,
          }),
        }
      ),

    getUsers: () =>
      apiFetch("/admin/users"),
  },
};