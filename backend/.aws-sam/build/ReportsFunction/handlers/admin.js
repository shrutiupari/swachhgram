const db = require("../utils/db");
const s3 = require("../utils/s3");
const { notifyCitizenStatusUpdate } = require("../utils/notifications");

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

function getClaims(event) {
  const claims =
    event.requestContext?.authorizer?.claims ||
    event.requestContext?.authorizer ||
    {};
  return {
    userId: claims.sub || claims["cognito:username"] || "anonymous",
    email:  claims.email || "",
    name:   claims.name  || claims["cognito:username"] || "Staff",
    role:   claims["custom:role"] || "citizen",
  };
}

function requireRole(claims, ...roles) {
  if (!roles.includes(claims.role)) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path   = event.path;

  if (method === "OPTIONS") return resp(200, {});

  try {
    const claims = getClaims(event);

    // ── GET /admin/stats ────────────────────────────────────────────────────
    if (method === "GET" && path.endsWith("/admin/stats")) {
      requireRole(claims, "gp_staff", "admin");
      const stats = await db.getStats();
      return resp(200, stats);
    }

    // ── GET /admin/reports ──────────────────────────────────────────────────
    if (method === "GET" && path.endsWith("/admin/reports")) {
      requireRole(claims, "gp_staff", "admin");
      const qs     = event.queryStringParameters || {};
      const status = qs.status;

      let reports = status
        ? await db.getReportsByStatus(status)
        : await db.getAllReports(200);

      // Sort by createdAt desc
      reports.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

      // Attach photo URLs (batch; skip on error)
      for (const r of reports) {
        if (r.photoKey) {
          try { r.photoUrl = await s3.getViewPresignedUrl(r.photoKey); } catch (_) {}
        }
      }

      // Filter by severity if requested
      if (qs.severity) {
        reports = reports.filter((r) => r.severity === qs.severity.toUpperCase());
      }

      return resp(200, { reports, count: reports.length });
    }

    // ── PUT /admin/reports/{reportId}/status ────────────────────────────────
    if (method === "PUT" && path.includes("/status")) {
      requireRole(claims, "gp_staff", "admin");

      const reportId  = event.pathParameters?.reportId;
      const body      = JSON.parse(event.body || "{}");
      const { status, note, createdAt } = body;

      const VALID_STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
      if (!VALID_STATUSES.includes(status)) {
        return resp(400, { error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      }
      if (!createdAt) return resp(400, { error: "createdAt is required" });

      const updated = await db.updateReportStatus(
        reportId,
        createdAt,
        status,
        claims.userId,
        note || ""
      );

      // Notify the citizen if we have their email
      if (updated?.reporterEmail) {
        await notifyCitizenStatusUpdate(updated, updated.reporterEmail);
      }

      return resp(200, { message: "Status updated", report: updated });
    }

    // ── GET /admin/users ─────────────────────────────────────────────────────
    // (Cognito user listing — requires admin only)
    if (method === "GET" && path.endsWith("/admin/users")) {
      requireRole(claims, "admin");
      // For demo: return from DynamoDB users table
      // In production, use Cognito ListUsers API
      const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
      const {
        DynamoDBClient,
      } = require("@aws-sdk/client-dynamodb");
      const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
      const client = new DynamoDBClient({ region: process.env.REGION });
      const ddb    = DynamoDBDocumentClient.from(client);
      const { Items } = await ddb.send(
        new ScanCommand({ TableName: process.env.USERS_TABLE })
      );
      return resp(200, { users: Items || [], count: (Items || []).length });
    }

    return resp(404, { error: "Route not found" });
  } catch (err) {
    console.error("Admin handler error:", err);
    const status = err.status || 500;
    return resp(status, { error: err.message });
  }
};
