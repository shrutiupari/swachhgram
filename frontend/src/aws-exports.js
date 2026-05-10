// ─────────────────────────────────────────────────────────────────────────────
// Fill these values after running: sam deploy --guided
// Get them from AWS Console → Cognito / API Gateway / Amplify
// ─────────────────────────────────────────────────────────────────────────────

const awsConfig = {
  Auth: {
    Cognito: {
      region: "ap-south-1",                          // e.g. ap-south-1
      userPoolId: "ap-south-1_XXXXXXXXX",            // ← Cognito User Pool ID
      userPoolClientId: "XXXXXXXXXXXXXXXXXXXXXXXXXX", // ← Cognito App Client ID
      signUpVerificationMethod: "code",
    },
  },
};

// API Gateway base URL (from sam deploy output)
export const API_BASE = "https://XXXXXXXXXX.execute-api.ap-south-1.amazonaws.com/Prod";

export default awsConfig;
