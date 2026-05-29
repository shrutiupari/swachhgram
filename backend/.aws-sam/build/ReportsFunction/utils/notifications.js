const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const ses = new SESClient({ region: process.env.REGION || "ap-south-1" });
const sns = new SNSClient({ region: process.env.REGION || "ap-south-1" });

const GP_EMAIL  = process.env.GP_EMAIL  || "gp@yourdomain.com";
const GP_PHONE  = process.env.GP_PHONE  || "+91XXXXXXXXXX";
const FROM_EMAIL = process.env.FROM_EMAIL || GP_EMAIL;

// ─── Email Templates ─────────────────────────────────────────────────────────

function newReportEmailHtml(report) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
  .header { background: #2d6a4f; color: white; padding: 24px; text-align: center; }
  .body { padding: 24px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 13px; }
  .high { background: #fde8e8; color: #c0392b; }
  .medium { background: #fef3cd; color: #856404; }
  .low { background: #d4edda; color: #155724; }
  .btn { display: inline-block; background: #2d6a4f; color: white; padding: 12px 24px;
         border-radius: 6px; text-decoration: none; margin-top: 16px; }
  .detail-row { display: flex; gap: 8px; margin: 8px 0; font-size: 14px; }
  .label { color: #666; min-width: 120px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h2>🗑️ New Garbage Report — SwachhGram</h2>
    <p style="margin:0;opacity:.85">A new report requires your attention</p>
  </div>
  <div class="body">
    <div class="detail-row"><span class="label">Report ID:</span><strong>${report.reportId}</strong></div>
    <div class="detail-row"><span class="label">Location:</span>${report.address || "GPS: " + report.latitude + ", " + report.longitude}</div>
    <div class="detail-row"><span class="label">Description:</span>${report.description || "—"}</div>
    <div class="detail-row"><span class="label">Severity:</span>
      <span class="badge ${(report.severity || "low").toLowerCase()}">${report.severity || "LOW"}</span>
    </div>
    <div class="detail-row"><span class="label">AI Detection:</span>${report.aiConfidence ? report.aiConfidence + "% confidence" : "Not analyzed"}</div>
    <div class="detail-row"><span class="label">Reported by:</span>${report.reporterName || report.userId}</div>
    <div class="detail-row"><span class="label">Reported at:</span>${new Date(report.createdAt).toLocaleString("en-IN")}</div>
    <p style="margin-top:20px;font-size:14px;color:#555">
      Please log in to the SwachhGram dashboard to assign and resolve this report.
    </p>
  </div>
</div>
</body>
</html>`;
}

function statusUpdateEmailHtml(report, citizenEmail) {
  const statusColors = {
    ASSIGNED:    "#17a2b8",
    IN_PROGRESS: "#fd7e14",
    RESOLVED:    "#28a745",
    REJECTED:    "#dc3545",
  };
  const color = statusColors[report.status] || "#6c757d";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
  .header { background: ${color}; color: white; padding: 24px; text-align: center; }
  .body { padding: 24px; font-size: 14px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h2>SwachhGram — Report Update</h2>
    <p style="margin:0;font-size:20px;margin-top:8px">${report.status}</p>
  </div>
  <div class="body">
    <p>Your garbage report <strong>${report.reportId}</strong> at
    <strong>${report.address || "your reported location"}</strong> has been updated to
    <strong>${report.status}</strong>.</p>
    ${report.statusNote ? `<p><strong>Note from GP staff:</strong> ${report.statusNote}</p>` : ""}
    <p>Thank you for helping keep your community clean! 🌿</p>
    <p style="color:#888;font-size:12px;margin-top:20px">SwachhGram — Swachh Bharat Initiative</p>
  </div>
</div>
</body>
</html>`;
}

// ─── Notification Functions ───────────────────────────────────────────────────

async function notifyGPNewReport(report) {
  try {
    // Email notification to GP
    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [GP_EMAIL] },
      Message: {
        Subject: { Data: `🗑️ New Garbage Report — ${report.address || report.reportId}` },
        Body: {
          Html: { Data: newReportEmailHtml(report) },
          Text: {
            Data: `New garbage report from ${report.reporterName}.\nLocation: ${report.address}\nSeverity: ${report.severity}\nReport ID: ${report.reportId}`,
          },
        },
      },
    }));

    // SMS notification to GP
    if (GP_PHONE && GP_PHONE !== "+91XXXXXXXXXX") {
      await sns.send(new PublishCommand({
        PhoneNumber: GP_PHONE,
        Message: `SwachhGram: New ${report.severity || "LOW"} severity garbage report at ${report.address || "see dashboard"}. ID: ${report.reportId}`,
      }));
    }

    return { success: true };
  } catch (err) {
    console.error("Notification error:", err);
    return { success: false, error: err.message };
  }
}

async function notifyCitizenStatusUpdate(report, citizenEmail) {
  if (!citizenEmail) return { success: false, error: "No citizen email" };
  try {
    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [citizenEmail] },
      Message: {
        Subject: { Data: `SwachhGram — Report ${report.status}: ${report.reportId}` },
        Body: {
          Html: { Data: statusUpdateEmailHtml(report, citizenEmail) },
          Text: {
            Data: `Your report ${report.reportId} status: ${report.status}.\n${report.statusNote || ""}`,
          },
        },
      },
    }));
    return { success: true };
  } catch (err) {
    console.error("Citizen notification error:", err);
    return { success: false, error: err.message };
  }
}

module.exports = { notifyGPNewReport, notifyCitizenStatusUpdate };
