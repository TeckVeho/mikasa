import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tenantId = process.env.SEED_TENANT_ID ?? "01HZXEXAMPLE00000000000000";
  const userId = ulid();

  await prisma.tenant.upsert({
    where: { id: tenantId },
    create: { id: tenantId, name: "デモ物流株式会社" },
    update: { name: "デモ物流株式会社" },
  });

  await prisma.user.upsert({
    where: { id: "dev-user" },
    create: {
      id: "dev-user",
      tenantId,
      email: "admin@example.com",
      firebaseUid: "dev-firebase-uid",
      role: "admin",
    },
    update: { tenantId, role: "admin" },
  });

  await prisma.user.upsert({
    where: { id: "dev-operator" },
    create: {
      id: "dev-operator",
      tenantId,
      email: "operator@example.com",
      firebaseUid: "dev-firebase-uid-operator",
      role: "operator",
    },
    update: { tenantId, role: "operator" },
  });

  const demoFlow = {
    nodes: [
      {
        id: "n1",
        type: "speak" as const,
        data: { text: "お電話ありがとうございます。", speed: 1 },
        position: { x: 0, y: 0 },
      },
      {
        id: "n2",
        type: "listen" as const,
        data: {
          variableName: "purpose",
          timeoutSeconds: 7,
          retryCount: 2,
          retryText: "もう一度お話しください。",
        },
        position: { x: 0, y: 120 },
      },
      {
        id: "n3",
        type: "end" as const,
        data: { farewell: "お電話ありがとうございました。" },
        position: { x: 0, y: 240 },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
    ],
  };

  const existingDemo = await prisma.scenario.findFirst({
    where: { tenantId, name: "デモ・再配達受付" },
  });
  const scenarioId = existingDemo?.id ?? ulid();
  await prisma.scenario.upsert({
    where: { id: scenarioId },
    create: {
      id: scenarioId,
      tenantId,
      name: "デモ・再配達受付",
      flowJson: demoFlow,
      status: "published",
      publishedAt: new Date(),
    },
    update: {
      name: "デモ・再配達受付",
      flowJson: demoFlow,
      status: "published",
      publishedAt: new Date(),
    },
  });

  const seedTwilioNumberSid = "PNSEED0000000000000000000000000001";
  const existingPhone = await prisma.phoneNumber.findFirst({
    where: { tenantId, twilioNumberSid: seedTwilioNumberSid },
  });
  const phoneId = existingPhone?.id ?? ulid();
  await prisma.phoneNumber.upsert({
    where: { id: phoneId },
    create: {
      id: phoneId,
      tenantId,
      scenarioId,
      number: "+815012345678",
      twilioNumberSid: seedTwilioNumberSid,
      status: "active",
    },
    update: {
      scenarioId,
      number: "+815012345678",
      status: "active",
    },
  });

  const sampleCalls: Array<{
    twilioCallSid: string;
    callerNumber: string;
    durationSeconds: number | null;
    status: string;
    transcriptText: string;
    summaryText: string;
  }> = [
    {
      twilioCallSid: "CASEED0000000000000000000000000001",
      callerNumber: "+819012341234",
      durationSeconds: 125,
      status: "complete",
      transcriptText: "お客様: 再配達をお願いします。オペレーター: 承知しました。",
      summaryText: "再配達の依頼。明日午前中で手配済み。",
    },
    {
      twilioCallSid: "CASEED0000000000000000000000000002",
      callerNumber: "+818012345678",
      durationSeconds: 48,
      status: "transferred",
      transcriptText: "担当者におつなぎします。",
      summaryText: "有人転送。配送トラブルの問い合わせ。",
    },
  ];

  for (const c of sampleCalls) {
    const existingCall = await prisma.callLog.findUnique({
      where: { twilioCallSid: c.twilioCallSid },
    });
    const callId = existingCall?.id ?? ulid();
    await prisma.callLog.upsert({
      where: { id: callId },
      create: {
        id: callId,
        tenantId,
        phoneNumberId: phoneId,
        scenarioId,
        twilioCallSid: c.twilioCallSid,
        callerNumber: c.callerNumber,
        durationSeconds: c.durationSeconds,
        status: c.status,
        transcriptText: c.transcriptText,
        summaryText: c.summaryText,
      },
      update: {
        callerNumber: c.callerNumber,
        durationSeconds: c.durationSeconds,
        status: c.status,
        transcriptText: c.transcriptText,
        summaryText: c.summaryText,
      },
    });
  }

  console.log("Seed OK. TENANT_ID=", tenantId);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
