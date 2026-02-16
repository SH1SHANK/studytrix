import "server-only";

import { google, type drive_v3 } from "googleapis";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"] as const;

type GoogleDriveClient = drive_v3.Drive;

declare global {
  var _googleDriveClient: GoogleDriveClient | undefined;
}

function getRequiredEnv(name: "GOOGLE_DRIVE_CLIENT_EMAIL" | "GOOGLE_DRIVE_PRIVATE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("Drive credentials are not configured");
  }
  return value;
}

function normalizePrivateKey(rawPrivateKey: string): string {
  return rawPrivateKey.replace(/\\n/g, "\n");
}

function createGoogleDriveClient(): GoogleDriveClient {
  const clientEmail = getRequiredEnv("GOOGLE_DRIVE_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(
    getRequiredEnv("GOOGLE_DRIVE_PRIVATE_KEY"),
  );

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [...DRIVE_SCOPES],
  });

  return google.drive({
    version: "v3",
    auth,
  });
}

export function getGoogleDriveClient(): GoogleDriveClient {
  if (global._googleDriveClient) {
    return global._googleDriveClient;
  }

  const client = createGoogleDriveClient();
  global._googleDriveClient = client;
  return client;
}
