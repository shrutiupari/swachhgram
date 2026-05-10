const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.REGION || "ap-south-1" });
const BUCKET = process.env.S3_BUCKET;

/**
 * Generate a pre-signed PUT URL so the browser can upload directly to S3
 * without the file passing through Lambda.
 */
async function getUploadPresignedUrl(key, contentType = "image/jpeg") {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
  return { url, key, bucket: BUCKET };
}

/**
 * Generate a pre-signed GET URL so the client can view a private image.
 */
async function getViewPresignedUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
  return url;
}

/**
 * Build the public S3 URL (use only if bucket has public-read ACL on the prefix).
 */
function getPublicUrl(key) {
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

module.exports = { getUploadPresignedUrl, getViewPresignedUrl, getPublicUrl };
