const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 4000;

const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(__dirname, "uploads");
const reportsFile = path.join(dataDir, "reports.json");

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

async function loadReports() {
  try {
    const data = await fs.readFile(reportsFile, "utf-8");
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeReports(reports) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(reportsFile, JSON.stringify(reports, null, 2));
}

function buildStats(reports) {
  return {
    total: reports.length,
    pending: reports.filter((r) => r.status === "PENDING").length,
    assigned: reports.filter((r) => r.status === "ASSIGNED").length,
    in_progress: reports.filter((r) => r.status === "IN_PROGRESS").length,
    resolved: reports.filter((r) => r.status === "RESOLVED").length,
    rejected: reports.filter((r) => r.status === "REJECTED").length,
  };
}

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "swachhgram-local-api" });
});

app.post("/local-upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const photoKey = `uploads/${req.file.filename}`;
  res.json({
    key: photoKey,
    photoKey,
    imageUrl: `/${photoKey}`,
    url: `http://localhost:${PORT}/${photoKey}`,
  });
});

app.post("/analyze", (req, res) => {
  res.json({
    isGarbage: true,
    severity: "MEDIUM",
    confidence: 88,
    detectedLabels: [
      { name: "Waste", confidence: 92 },
      { name: "Plastic", confidence: 86 },
    ],
  });
});

app.get("/reports", async (req, res) => {
  const reports = await loadReports();
  res.json({ reports, count: reports.length });
});

app.post("/reports", async (req, res) => {
  const reports = await loadReports();
  const now = new Date().toISOString();

  const report = {
    reportId: uuidv4(),
    createdAt: now,
    userId: "local-user-1",
    reporterName: "Local Citizen",
    reporterEmail: "citizen@example.com",
    status: "PENDING",
    severity: "MEDIUM",
    isGarbage: true,
    aiConfidence: 0,
    aiLabels: [],
    updatedAt: now,
    ...req.body,
  };

  reports.unshift(report);
  await writeReports(reports);
  res.status(201).json({ message: "Report submitted successfully", report });
});

app.get("/admin/reports", async (req, res) => {
  const reports = await loadReports();
  res.json({ reports, count: reports.length });
});

app.get("/admin/stats", async (req, res) => {
  const reports = await loadReports();
  res.json(buildStats(reports));
});

app.get("/admin/users", (req, res) => {
  res.json({
    users: [
      {
        userId: "local-user-1",
        name: "Local Citizen",
        email: "citizen@example.com",
        role: "citizen",
      },
      {
        userId: "local-staff-1",
        name: "GP Staff",
        email: "staff@example.com",
        role: "gp_staff",
      },
    ],
    count: 2,
  });
});

app.put("/admin/reports/:reportId/status", async (req, res) => {
  const reports = await loadReports();
  const { reportId } = req.params;
  const { status, note, createdAt } = req.body;

  const reportIndex = reports.findIndex(
    (report) => report.reportId === reportId && (!createdAt || report.createdAt === createdAt)
  );

  if (reportIndex === -1) {
    return res.status(404).json({ error: "Report not found" });
  }

  reports[reportIndex] = {
    ...reports[reportIndex],
    status,
    statusNote: note || "",
    updatedAt: new Date().toISOString(),
    resolvedAt:
      status === "RESOLVED"
        ? new Date().toISOString()
        : reports[reportIndex].resolvedAt || null,
  };

  await writeReports(reports);
  res.json({ message: "Report status updated", report: reports[reportIndex] });
});

app.use((err, req, res, next) => {
  if (err) {
    res.status(400).json({ error: err.message });
    return;
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Local API running on http://localhost:${PORT}`);
});
