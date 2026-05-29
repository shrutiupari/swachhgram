const {
  RekognitionClient,
  DetectLabelsCommand,
} = require("@aws-sdk/client-rekognition");

const rekog = new RekognitionClient({ region: process.env.REGION || "ap-south-1" });
const BUCKET = process.env.S3_BUCKET;

/**
 * Labels that indicate garbage / unsanitary conditions.
 * Rekognition returns confidence scores; we look for ANY of these labels
 * above the threshold to flag the image as containing garbage.
 */
const GARBAGE_LABELS = new Set([
  "Garbage",
  "Trash",
  "Waste",
  "Rubble",
  "Junk",
  "Debris",
  "Litter",
  "Pollution",
  "Pile",
  "Sewage",
  "Dump",
  "Landfill",
  "Refuse",
  "Filth",
  "Mold",
  "Mould",
  "Contamination",
  "Plastic",
  "Bottle",
  "Can",
  "Bag",
]);

/**
 * Analyze an image stored in S3 for garbage content.
 * @param {string} s3Key  - The S3 object key of the uploaded photo
 * @returns {object}      - { isGarbage, confidence, labels, severity }
 */
async function analyzeImage(s3Key) {
  const command = new DetectLabelsCommand({
    Image: {
      S3Object: {
        Bucket: BUCKET,
        Name: s3Key,
      },
    },
    MaxLabels: 30,
    MinConfidence: 50,
  });

  const response = await rekog.send(command);
  const labels = response.Labels || [];

  const garbageLabels = labels.filter((l) => GARBAGE_LABELS.has(l.Name));
  const isGarbage = garbageLabels.length > 0;
  const maxConfidence = isGarbage
    ? Math.max(...garbageLabels.map((l) => l.Confidence))
    : 0;

  // Severity based on confidence score
  let severity = "LOW";
  if (maxConfidence >= 85) severity = "HIGH";
  else if (maxConfidence >= 70) severity = "MEDIUM";

  return {
    isGarbage,
    confidence: Math.round(maxConfidence),
    severity: isGarbage ? severity : null,
    detectedLabels: garbageLabels.map((l) => ({
      name: l.Name,
      confidence: Math.round(l.Confidence),
    })),
    allLabels: labels.map((l) => l.Name),
  };
}

module.exports = { analyzeImage };
