import "server-only";

import { google, type drive_v3 } from "googleapis";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"] as const;

type DriveClient = drive_v3.Drive;

declare global {
  var _driveClientSingleton: DriveClient | undefined;
}

function getRequiredEnv(
  key: "GOOGLE_DRIVE_CLIENT_EMAIL" | "GOOGLE_DRIVE_PRIVATE_KEY",
): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error("Drive credentials are not configured");
  }
  return value;
}

function normalizePrivateKey(rawPrivateKey: string): string {
  return rawPrivateKey.replace(/\\n/g, "\n");
}

function createDriveClient(): DriveClient {
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

export function getDriveClient(): DriveClient {
  if (global._driveClientSingleton) {
    return global._driveClientSingleton;
  }

  const driveClient = createDriveClient();
  global._driveClientSingleton = driveClient;
  return driveClient;
}
