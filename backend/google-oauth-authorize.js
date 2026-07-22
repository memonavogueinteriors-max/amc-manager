require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets"
];

const CREDENTIALS_PATH = path.join(
  __dirname,
  "google-oauth-credentials.json"
);

const TOKEN_PATH = path.join(
  __dirname,
  "google-oauth-token.json"
);

function readClientDetails() {
  const content = JSON.parse(
    fs.readFileSync(CREDENTIALS_PATH, "utf8")
  );

  const details = content.installed || content.web;

  if (!details?.client_id || !details?.client_secret) {
    throw new Error(
      "The OAuth credentials file does not contain a valid Desktop app client."
    );
  }

  return details;
}

async function authorize() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Credentials file not found: ${CREDENTIALS_PATH}`
    );
  }

  const clientDetails = readClientDetails();

  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH
  });

  if (!client.credentials.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke the app's access in your Google Account, delete google-oauth-token.json, and authorize again."
    );
  }

  const token = {
    type: "authorized_user",
    client_id: clientDetails.client_id,
    client_secret: clientDetails.client_secret,
    refresh_token: client.credentials.refresh_token
  };

  fs.writeFileSync(
    TOKEN_PATH,
    JSON.stringify(token, null, 2)
  );

  console.log("");
  console.log("Google authorization completed.");
  console.log(`Token saved securely to: ${TOKEN_PATH}`);
  console.log("Do not upload this token to GitHub or share it.");
}

authorize().catch((error) => {
  console.error("Google authorization failed:", error.message);
  process.exit(1);
});
