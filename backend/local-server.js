require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;

const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'uploads');
const reportsFile = path.join(dataDir, 'reports.json');

app.use(cors({origin: 'http://localhost:3000'}));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

async function loadReports() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        const data = await fs.readFile(reportsFile, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.log("LOAD REPORTS ERROR:");
        console.log(err);
        if (err.code === 'ENOENT') {
            return [];
        }
        return [];
    }
}
async function writeReports(reports) {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(reportsFile, JSON.stringify(reports, null, 2));
}

// app.get('/api/health', (req, res) => {
//     res.json({ status: 'ok' });
// });

// app.post('/api/local-upload', upload.single('image'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//     }
//     const imageUrl = `/uploads/${req.file.filename}`;
//     res.json({ 
//         imageUrl,
//         url: `http://localhost:${PORT}${imageUrl}`
//      });
// });

// app.post('/api/analyze', (req, res) => {
//     res.json({
//         isGarbage: true,
//         severity: 'MEDIUM',
//         confidence: 88,
//         detectedLabels: [
//             { name: 'Plastic Bottle', confidence: 90 },
//             { name: 'Litter', confidence: 85 }
//         ]
//     })
// });

// app.get('/api/reports', async (req, res) => {
//     try {
//         const reports = await loadReports();
//         res.json({reports, count: reports.length});
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.post('/api/reports', async (req, res) => {
//     const reportData = await loadReports();
//     const now = new Date().toISOString();

//     const newReport = {
//         reportId: uuidv4(),
//         createdAt: now,
//         userId: "local-user-1",
//         reporterName: "Local Citizen",
//         reporterEmail: "citizen@example.com",
//         status: "PENDING",
//         updatedAt: now,
//         ...req.body,
//     };

//     reportData.unshift(newReport);
//     await writeReports(reportData);
//     res.status(201).json({ message: "Report submitted successfully", report: newReport });
// });

// app.get('/admin/api/reports', async (req, res) => {
//     try {
//         const reports = await loadReports();
//         res.json({reports, count: reports.length});
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.get('/admin/api/stats', async (req, res) => {
//     try {
//         const reports = await loadReports();
//         const totalReports = reports.length;
//         const statusCounts = reports.reduce((acc, report) => {
//             acc[report.status] = (acc[report.status] || 0) + 1;
//             return acc;
//         }, {});
//         res.json({ totalReports, statusCounts });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.put('/admin/api/reports/:reportId', async (req, res) => {
//     const reports = await loadReports();
//     const { reportId } = req.params;
//     const { status, note, createdAt } = req.body;
//     try {
//         const reportIndex = reports.findIndex(r => r.reportId === reportId);
//         if (reportIndex === -1) {
//             return res.status(404).json({ error: 'Report not found' });
//         }
//         reports[reportIndex] = {
//             ...reports[reportIndex],
//             status,
//             statusNote: note || "",
//             updatedAt: new Date().toISOString(),
//             resolvedAt: status === "RESOLVED" ? new Date().toISOString() : reports[reportIndex].resolvedAt || null,
//         };
//         await writeReports(reports);
//         res.json({ message: 'Report status updated successfully', report: reports[reportIndex] });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });


app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/local-upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
        imageUrl,
        url: `http://localhost:${PORT}${imageUrl}`
    });
});

app.post('/analyze', (req, res) => {
    res.json({
        isGarbage: true,
        severity: 'MEDIUM',
        confidence: 88,
        detectedLabels: [
            { name: 'Plastic Bottle', confidence: 90 },
            { name: 'Litter', confidence: 85 }
        ]
    });
});

app.get('/reports', async (req, res) => {
    try {
        const reports = await loadReports();
        res.json({ reports, count: reports.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/reports', async (req, res) => {
    const reportData = await loadReports();
    const now = new Date().toISOString();

    const newReport = {
        reportId: uuidv4(),
        createdAt: now,
        userId: "local-user-1",
        reporterName: "Local Citizen",
        reporterEmail: "citizen@example.com",
        status: "PENDING",
        updatedAt: now,
        ...req.body,
    };

    reportData.unshift(newReport);

    await writeReports(reportData);

    res.status(201).json({
        message: "Report submitted successfully",
        report: newReport
    });
});

app.get('/admin/reports', async (req, res) => {
    try {
        const reports = await loadReports();
        res.json({ reports, count: reports.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/admin/stats', async (req, res) => {
    try {
        const reports = await loadReports();

        const totalReports = reports.length;

        const statusCounts = reports.reduce((acc, report) => {
            acc[report.status] = (acc[report.status] || 0) + 1;
            return acc;
        }, {});

        res.json({ totalReports, statusCounts });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/admin/reports/:reportId/status', async (req, res) => {
    const reports = await loadReports();

    const { reportId } = req.params;
    const { status, note } = req.body;

    try {
        const reportIndex = reports.findIndex(
            r => r.reportId === reportId
        );

        if (reportIndex === -1) {
            return res.status(404).json({
                error: 'Report not found'
            });
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

        res.json({
            message: 'Report status updated successfully',
            report: reports[reportIndex]
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Local server running on http://localhost:${PORT}`);
});