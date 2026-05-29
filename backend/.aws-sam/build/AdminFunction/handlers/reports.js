const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const s3 = require("../utils/s3");
const { analyzeImage } = require("../utils/rekognition");
const { notifyGPNewReport } = require("../utils/notifications");

// ─── CORS Headers ─────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify(body),
  };
}

// ─── Auth helper: extract userId & role from Cognito JWT claims ──────────────
function getClaims(event) {
  const claims =
    event.requestContext?.authorizer?.claims ||
    event.requestContext?.authorizer ||
    {};
  return {
    userId: claims.sub || claims["cognito:username"] || "anonymous",
    email:  claims.email || "",
    name:   claims.name || claims["cognito:username"] || "User",
    role:   claims["custom:role"] || "citizen",
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const method = event.httpMethod;
  const path   = event.path;

  // Handle CORS preflight
  if (method === "OPTIONS") return resp(200, {});

  try {
    // POST /upload-url  — get pre-signed S3 upload URL
    if (method === "POST" && path.endsWith("/upload-url")) {
      const { filename, contentType } = JSON.parse(event.body || "{}");
      const ext = (filename || "photo.jpg").split(".").pop();
      const key = `photos/${uuidv4()}.${ext}`;
      const result = await s3.getUploadPresignedUrl(key, contentType || "image/jpeg");
      return resp(200, result);
    }

    // POST /analyze  — analyze uploaded image for garbage
    if (method === "POST" && path.endsWith("/analyze")) {
      const { s3Key } = JSON.parse(event.body || "{}");
      if (!s3Key) return resp(400, { error: "s3Key required" });
      const analysis = await analyzeImage(s3Key);
      return resp(200, analysis);
    }

    // GET /reports  — list reports (citizen sees own; GP/admin sees all)
    if (method === "GET" && path.endsWith("/reports")) {
      const claims = getClaims(event);
      let reports;
      if (claims.role === "citizen") {
        reports = await db.getReportsByUser(claims.userId);
      } else {
        const status = event.queryStringParameters?.status;
        reports = status
          ? await db.getReportsByStatus(status)
          : await db.getAllReports();
      }
      // Attach pre-signed view URLs
      for (const r of reports) {
        if (r.photoKey) {
          r.photoUrl = await s3.getViewPresignedUrl(r.photoKey);
        }
      }
      return resp(200, { reports, count: reports.length });
    }

    // GET /reports/{reportId}  — single report
    if (method === "GET" && path.includes("/reports/")) {
      const reportId  = event.pathParameters?.reportId;
      const createdAt = event.queryStringParameters?.createdAt;
      if (!reportId || !createdAt) return resp(400, { error: "reportId and createdAt required" });
      const report = await db.getReport(reportId, createdAt);
      if (!report) return resp(404, { error: "Report not found" });
      if (report.photoKey) report.photoUrl = await s3.getViewPresignedUrl(report.photoKey);
      return resp(200, report);
    }

    // POST /reports  — create new report
    if (method === "POST" && path.endsWith("/reports")) {
      const claims = getClaims(event);
      const body   = JSON.parse(event.body || "{}");

      const {
        photoKey,
        description,
        address,
        latitude,
        longitude,
        ward,
        village,
      } = body;

      if (!photoKey) return resp(400, { error: "photoKey (S3 key) is required" });

      // Run AI analysis
      let aiResult = {};
      try {
        aiResult = await analyzeImage(photoKey);
      } catch (e) {
        console.warn("Rekognition failed:", e.message);
      }

      const reportId  = uuidv4();
      const createdAt = new Date().toISOString();

      const report = {
        reportId,
        createdAt,
        userId:       claims.userId,
        reporterName: claims.name,
        reporterEmail:claims.email,
        photoKey,
        description:  description || "",
        address:      address || "",
        latitude:     latitude  || null,
        longitude:    longitude || null,
        ward:         ward    || "",
        village:      village || "",
        status:       "PENDING",
        severity:     aiResult.severity || "LOW",
        isGarbage:    aiResult.isGarbage ?? true,
        aiConfidence: aiResult.confidence || 0,
        aiLabels:     aiResult.detectedLabels || [],
        updatedAt:    createdAt,
      };

      await db.createReport(report);

      // Notify GP staff
      await notifyGPNewReport(report);

      // Attach photo URL for response
      report.photoUrl = await s3.getViewPresignedUrl(photoKey);

      return resp(201, { message: "Report submitted successfully", report });
    }

    // PUT /reports/{reportId}  — citizen update (description only while PENDING)
    if (method === "PUT" && path.includes("/reports/")) {
      const claims   = getClaims(event);
      const reportId = event.pathParameters?.reportId;
      const body     = JSON.parse(event.body || "{}");
      const { description, createdAt } = body;

      const existing = await db.getReport(reportId, createdAt);
      if (!existing) return resp(404, { error: "Report not found" });
      if (existing.userId !== claims.userId && claims.role === "citizen") {
        return resp(403, { error: "Access denied" });
      }

      const updated = await db.updateReportStatus(
        reportId, createdAt, body.status || existing.status, claims.userId, body.note
      );
      return resp(200, updated);
    }

    return resp(404, { error: "Route not found" });
  } catch (err) {
    console.error("Handler error:", err);
    return resp(500, { error: err.message });
  }
};
