import { prisma } from "../lib/prisma.js";

export async function findUserByFirebaseUid(firebaseUid: string) {
  return prisma.user.findUnique({
    where: { firebaseUid },
  });
}
