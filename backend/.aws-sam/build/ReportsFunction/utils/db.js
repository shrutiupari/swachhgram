const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.REGION || "ap-south-1" });
const db = DynamoDBDocumentClient.from(client);

const REPORTS_TABLE = process.env.REPORTS_TABLE || "swachhgram-reports";
const USERS_TABLE   = process.env.USERS_TABLE   || "swachhgram-users";

// ─── Reports ────────────────────────────────────────────────────────────────

async function createReport(report) {
  await db.send(new PutCommand({ TableName: REPORTS_TABLE, Item: report }));
  return report;
}

async function getReport(reportId, createdAt) {
  const res = await db.send(new GetCommand({
    TableName: REPORTS_TABLE,
    Key: { reportId, createdAt },
  }));
  return res.Item;
}

async function getReportsByUser(userId) {
  const res = await db.send(new QueryCommand({
    TableName: REPORTS_TABLE,
    IndexName: "userIndex",
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId },
    ScanIndexForward: false,
  }));
  return res.Items;
}

async function getReportsByStatus(status) {
  const res = await db.send(new QueryCommand({
    TableName: REPORTS_TABLE,
    IndexName: "statusIndex",
    KeyConditionExpression: "#s = :s",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": status },
    ScanIndexForward: false,
  }));
  return res.Items;
}

async function getAllReports(limit = 100) {
  const res = await db.send(new ScanCommand({
    TableName: REPORTS_TABLE,
    Limit: limit,
  }));
  return res.Items;
}

async function updateReportStatus(reportId, createdAt, status, updatedBy, note = "") {
  const res = await db.send(new UpdateCommand({
    TableName: REPORTS_TABLE,
    Key: { reportId, createdAt },
    UpdateExpression:
      "SET #s = :s, updatedBy = :ub, updatedAt = :ua, statusNote = :n",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: {
      ":s": status,
      ":ub": updatedBy,
      ":ua": new Date().toISOString(),
      ":n": note,
    },
    ReturnValues: "ALL_NEW",
  }));
  return res.Attributes;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

async function getStats() {
  const all = await getAllReports(1000);
  const stats = {
    total: all.length,
    pending: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
  };
  for (const r of all) {
    const s = (r.status || "pending").toLowerCase().replace(" ", "_");
    if (stats[s] !== undefined) stats[s]++;
  }
  return stats;
}

// ─── Users ──────────────────────────────────────────────────────────────────

async function upsertUser(user) {
  await db.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
  return user;
}

async function getUser(userId) {
  const res = await db.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));
  return res.Item;
}

module.exports = {
  createReport,
  getReport,
  getReportsByUser,
  getReportsByStatus,
  getAllReports,
  updateReportStatus,
  getStats,
  upsertUser,
  getUser,
};
