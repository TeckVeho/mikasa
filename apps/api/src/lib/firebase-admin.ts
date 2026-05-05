import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { randomBytes } from "node:crypto";

let app: App | null = null;

export function getFirebaseApp(): App | null {
  if (app) return app;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId) {
    return null;
  }

  if (getApps().length === 0) {
    if (clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      app = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    }
  } else {
    app = getApps()[0] ?? null;
  }
  return app;
}

export async function verifyIdToken(
  token: string,
): Promise<{ uid: string } | null> {
  const fb = getFirebaseApp();
  if (!fb) return null;
  const decoded = await getAuth(fb).verifyIdToken(token);
  return { uid: decoded.uid };
}

export async function createFirebaseUser(
  email: string,
): Promise<{ uid: string } | null> {
  const fb = getFirebaseApp();
  if (!fb) return null;
  const password = randomBytes(12).toString("base64url");
  const userRecord = await getAuth(fb).createUser({ email, password });
  return { uid: userRecord.uid };
}

export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  const fb = getFirebaseApp();
  if (!fb) return false;
  await getAuth(fb).deleteUser(uid);
  return true;
}

export async function generateResetLink(
  email: string,
): Promise<string | null> {
  const fb = getFirebaseApp();
  if (!fb) return null;
  return getAuth(fb).generatePasswordResetLink(email);
}
