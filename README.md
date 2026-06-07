# SwachhGram 🌿
### Garbage Detection & Reporting System for Gram Panchayat

A full-stack civic application where citizens can upload photos of garbage, AI auto-detects waste, and Gram Panchayat staff get notified to take action.

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| React Frontend | React 18, Vite, Tailwind CSS, Leaflet.js |
| Vue Frontend | Vue 3, Vite |
| Backend | Node.js, AWS Lambda, API Gateway |
| Database | AWS DynamoDB |
| Storage | AWS S3 |
| AI Detection | AWS Rekognition |
| Auth | AWS Cognito |
| Notifications | AWS SES (email) + SNS (SMS) |
| Hosting | AWS Amplify |

All services are within **AWS Free Tier**.

---

## Project Structure
```
project-root/
├── backend/
│   ├── template.yaml         # AWS SAM template
│   ├── local-server.js       # Local Express API for Windows/dev practice
│   ├── package.json
│   ├── data/                 # Local JSON data for dev mode
│   └── src/
│       ├── handlers/
│       │   ├── reports.js    # CRUD for garbage reports
│       │   └── admin.js      # Admin & GP staff APIs
│       └── utils/
│           ├── db.js         # DynamoDB helper
│           ├── s3.js         # S3 upload helper
│           ├── rekognition.js# AI garbage detection
│           └── notifications.js # SES + SNS alerts
├── frontend-react/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── aws-exports.js    # ← Fill your AWS config here
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── CitizenDashboard.jsx
│   │   │   ├── ReportGarbage.jsx
│   │   │   ├── MyReports.jsx
│   │   │   ├── GPDashboard.jsx
│   │   │   └── AdminDashboard.jsx
│   │   └── components/
│   │       ├── Navbar.jsx
│   │       ├── ReportCard.jsx
│   │       ├── StatusBadge.jsx
│   │       └── MapView.jsx
│   └── package.json
└── frontend-vue/
    ├── src/
    │   ├── App.vue           # Vue citizen + GP staff local workflow
    │   ├── api.js
    │   ├── main.js
    │   └── styles.css
    └── package.json
```

---

## Local Development

The project can run locally without AWS. Use the Express server in `backend/`
and choose either the React or Vue frontend.

### Backend API
```bash
cd backend
npm install
npm run dev
```

Local API:
```text
http://localhost:4000
```

### React Frontend
```bash
cd frontend-react
npm install
copy .env.example .env.local
npm run dev
```

React app:
```text
http://localhost:3000
```

### Vue Frontend
```bash
cd frontend-vue
npm install
copy .env.example .env.local
npm run dev
```

Vue app:
```text
http://localhost:3001
```

Both frontends use the same local backend flow:
```text
Citizen uploads one garbage photo + address
GP staff reviews report
GP staff updates status
Citizen/queue sees latest status
```

---

## AWS Setup (One-Time)

### Step 1 — Cognito User Pool
1. Go to AWS Console → Cognito → Create User Pool
2. Name it `swachhgram-users`
3. Enable email sign-in
4. Add custom attributes: `custom:role` (string)
5. Create App Client (no secret)
6. Note down: **User Pool ID** and **App Client ID**

### Step 2 — DynamoDB Tables
Create two tables:
```
Table 1: swachhgram-reports
  Partition key: reportId (String)
  Sort key: createdAt (String)
  GSI: statusIndex (status → createdAt)
  GSI: userIndex (userId → createdAt)

Table 2: swachhgram-users
  Partition key: userId (String)
```

### Step 3 — S3 Bucket
1. Create bucket: `swachhgram-photos-<your-account-id>`
2. Enable public read on photos prefix OR use pre-signed URLs (recommended)
3. Enable CORS:
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedOrigins": ["*"],
  "ExposeHeaders": []
}]
```

### Step 4 — Deploy Backend (AWS SAM)
```bash
cd backend
npm install
sam build
sam deploy --guided
# Follow prompts; note the API Gateway URL output
```

### Step 5 — Configure SES
1. Go to SES → Verified Identities
2. Verify your GP's email address
3. Note the sender email

### Step 6 — React Frontend Setup
```bash
cd frontend-react
npm install
# Edit src/aws-exports.js with your values
npm run dev        # local dev
npm run build      # production build
```

### Optional — Vue Frontend Setup
```bash
cd frontend-vue
npm install
npm run dev
npm run build
```

### Step 7 — Deploy Frontend to Amplify
```bash
npm install -g @aws-amplify/cli
amplify init
amplify add hosting
amplify publish
```

---

## User Roles
| Role | Access |
|------|--------|
| `citizen` | Report garbage, track own reports |
| `gp_staff` | View all reports, update status, notify |
| `admin` | Full access, manage users, analytics |

Set role via Cognito custom attribute `custom:role` when creating users.

---

## Report Status Flow
```
PENDING → ASSIGNED → IN_PROGRESS → RESOLVED
                   ↘ REJECTED
```

---

## Environment Variables (Lambda)
Set these in `template.yaml` or AWS Console:
```
REPORTS_TABLE=swachhgram-reports
USERS_TABLE=swachhgram-users
S3_BUCKET=swachhgram-photos-<id>
GP_EMAIL=your-gp-email@example.com
GP_PHONE=+91XXXXXXXXXX
REGION=ap-south-1
```
