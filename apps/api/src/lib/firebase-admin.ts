import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | null = null;

export function getFirebaseApp(): App | null {
  if (app) return app;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
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
