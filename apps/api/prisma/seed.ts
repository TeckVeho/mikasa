import { Prisma, PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

const prisma = new PrismaClient();

const TENANT_ID = process.env.SEED_TENANT_ID ?? "01HZXEXAMPLE00000000000000";

const DEFAULT_PROCESS_TYPES = [
  { id: "proc-kumitate-mae", name: "組立前", displayOrder: 1, defaultRatio: 0.249, isWelding: false },
  { id: "proc-kumitate", name: "組立", displayOrder: 2, defaultRatio: 0.167, isWelding: false },
  { id: "proc-yosetsu", name: "溶接", displayOrder: 3, defaultRatio: 0.203, isWelding: true },
  { id: "proc-yugumi", name: "歪取り", displayOrder: 4, defaultRatio: 0.055, isWelding: false },
  { id: "proc-tosou", name: "塗装", displayOrder: 5, defaultRatio: 0.073, isWelding: false },
  { id: "proc-shiage", name: "仕上げ", displayOrder: 6, defaultRatio: 0.258, isWelding: false },
] as const;

const DEFAULT_PRODUCT_TYPES = [
  { id: "ptype-i", name: "I型", category: "kyotai", sortOrder: 1 },
  { id: "ptype-hako", name: "箱型", category: "kyotai", sortOrder: 2 },
  { id: "ptype-zaguri", name: "座繰り", category: "kyotai", sortOrder: 3 },
  { id: "ptype-sef", name: "SEF", category: "kyotai", sortOrder: 4 },
  { id: "ptype-shinshuku", name: "伸縮装置", category: "shinshuku", sortOrder: 5 },
  { id: "ptype-kensa", name: "検査路", category: "shinshuku_gai", sortOrder: 6 },
  { id: "ptype-haisui", name: "排水装置", category: "shinshuku_gai", sortOrder: 7 },
] as const;

/** 泉北工程.xlsx モデルシートの回帰係数・工程比率 */
const PRODUCT_MODEL_CONFIG: Record<
  string,
  {
    regressionA: number;
    regressionB: number;
    processRatios: Record<string, number>;
  }
> = {
  "ptype-hako": {
    regressionA: -0.0107,
    regressionB: 47.698,
    processRatios: {
      組立前: 0.261,
      組立: 0.106,
      溶接: 0.335,
      歪取り: 0.067,
      塗装: 0.056,
      仕上げ: 0.174,
    },
  },
  "ptype-i": {
    regressionA: -0.0753,
    regressionB: 85.398,
    processRatios: {
      組立前: 0.249,
      組立: 0.154,
      溶接: 0.294,
      歪取り: 0.064,
      塗装: 0.056,
      仕上げ: 0.18,
    },
  },
  "ptype-zaguri": {
    regressionA: -0.0213,
    regressionB: 67.209,
    processRatios: {
      組立前: 0.249,
      組立: 0.167,
      溶接: 0.203,
      歪取り: 0.055,
      塗装: 0.073,
      仕上げ: 0.258,
    },
  },
  "ptype-sef": {
    regressionA: -0.0213,
    regressionB: 67.209,
    processRatios: {
      組立前: 0.249,
      組立: 0.167,
      溶接: 0.203,
      歪取り: 0.055,
      塗装: 0.073,
      仕上げ: 0.258,
    },
  },
};

const DEFAULT_TEAMS = [
  { id: "team-nakano", name: "中野班", sortOrder: 1 },
  { id: "team-dosei", name: "道姓班", sortOrder: 2 },
  { id: "team-sakai", name: "阪上班", sortOrder: 3 },
  { id: "team-unassigned", name: "製作班未定", sortOrder: 4 },
] as const;

const TEAM_MEMBERS = [
  { id: "member-nakano-1", teamId: "team-nakano", name: "渡邊" },
  { id: "member-nakano-2", teamId: "team-nakano", name: "桝元" },
  { id: "member-dosei-1", teamId: "team-dosei", name: "佐藤" },
  { id: "member-dosei-2", teamId: "team-dosei", name: "チェン" },
  { id: "member-sakai-1", teamId: "team-sakai", name: "木下" },
  { id: "member-sakai-2", teamId: "team-sakai", name: "中村" },
] as const;

const DEFAULT_CAPACITY = [
  { category: "all", regular: 8, ot2: 10, ot4: 12 },
  { category: "shinshuku", regular: 8, ot2: 10, ot4: 12 },
  { category: "shinshuku_gai", regular: 8, ot2: 10, ot4: 12 },
  { category: "kyotai", regular: 8, ot2: 10, ot4: 12 },
] as const;

const SAMPLE_PROJECTS = [
  {
    id: "proj-001",
    projectNumber: "240101",
    projectName: "阪神高速 伸縮装置更新",
    clientName: "阪神高速道路株式会社",
    productTypeId: "ptype-shinshuku",
    teamId: "team-nakano",
    category: "shinshuku",
    plannedHours: 320,
    weldingRatio: 0.22,
    deadline: "2026-09-30",
    drawingReceivedAt: "2026-05-10",
    status: "in_progress",
  },
  {
    id: "proj-002",
    projectNumber: "240215",
    projectName: "名神高速 箱型桁",
    clientName: "西日本高速道路",
    productTypeId: "ptype-hako",
    teamId: "team-dosei",
    category: "kyotai",
    plannedHours: 580,
    weldingRatio: 0.25,
    deadline: "2026-11-15",
    drawingReceivedAt: "2026-04-01",
    status: "in_progress",
  },
  {
    id: "proj-003",
    projectNumber: "240308",
    projectName: "国道1号 I型桁",
    clientName: "国土交通省",
    productTypeId: "ptype-i",
    teamId: "team-sakai",
    category: "kyotai",
    plannedHours: 420,
    weldingRatio: 0.2,
    deadline: "2026-10-31",
    drawingReceivedAt: "2026-06-01",
    status: "in_progress",
  },
  {
    id: "proj-004",
    projectNumber: "240412",
    projectName: "検査路補強工事",
    clientName: "大阪市",
    productTypeId: "ptype-kensa",
    teamId: "team-unassigned",
    category: "shinshuku_gai",
    plannedHours: 180,
    weldingRatio: 0.18,
    deadline: "2026-12-20",
    drawingReceivedAt: null,
    status: "drawing_wait",
  },
  /** モデル作成検証用: 阪上班・日次スケジュール未登録 */
  {
    id: "proj-116035",
    projectNumber: "116035",
    projectName: "篠原橋 2基",
    clientName: "IHI",
    productTypeId: "ptype-i",
    teamId: "team-sakai",
    category: "kyotai",
    plannedHours: null,
    weldingRatio: null,
    deadline: "2026-12-31",
    drawingReceivedAt: "2026-06-15",
    status: "in_progress",
    setCount: 2,
    detail: "15.5t × 2基（モデル作成検証用）",
  },
] as const;

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

function workingDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur)) days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

async function canonicalizeProductType(
  tenantId: string,
  canonical: (typeof DEFAULT_PRODUCT_TYPES)[number],
): Promise<void> {
  const duplicates = await prisma.productType.findMany({
    where: { tenantId, name: canonical.name, id: { not: canonical.id } },
  });

  for (const dup of duplicates) {
    await prisma.project.updateMany({
      where: { productTypeId: dup.id },
      data: { productTypeId: canonical.id },
    });

    const dupAvgs = await prisma.historicalAverage.findMany({
      where: { productTypeId: dup.id },
    });
    for (const avg of dupAvgs) {
      const existing = await prisma.historicalAverage.findUnique({
        where: {
          tenantId_productTypeId_projectNumber: {
            tenantId,
            productTypeId: canonical.id,
            projectNumber: avg.projectNumber,
          },
        },
      });
      if (existing) {
        await prisma.historicalAverage.delete({ where: { id: avg.id } });
      } else {
        await prisma.historicalAverage.update({
          where: { id: avg.id },
          data: { productTypeId: canonical.id },
        });
      }
    }

    await prisma.productType.delete({ where: { id: dup.id } });
  }

  await prisma.productType.upsert({
    where: { id: canonical.id },
    create: {
      id: canonical.id,
      tenantId,
      name: canonical.name,
      category: canonical.category,
      sortOrder: canonical.sortOrder,
      ...(PRODUCT_MODEL_CONFIG[canonical.id]
        ? {
            regressionA: new Prisma.Decimal(
              PRODUCT_MODEL_CONFIG[canonical.id]!.regressionA,
            ),
            regressionB: new Prisma.Decimal(
              PRODUCT_MODEL_CONFIG[canonical.id]!.regressionB,
            ),
            processRatios: PRODUCT_MODEL_CONFIG[canonical.id]!.processRatios,
          }
        : {}),
    },
    update: {
      name: canonical.name,
      category: canonical.category,
      sortOrder: canonical.sortOrder,
      deletedAt: null,
      ...(PRODUCT_MODEL_CONFIG[canonical.id]
        ? {
            regressionA: new Prisma.Decimal(
              PRODUCT_MODEL_CONFIG[canonical.id]!.regressionA,
            ),
            regressionB: new Prisma.Decimal(
              PRODUCT_MODEL_CONFIG[canonical.id]!.regressionB,
            ),
            processRatios: PRODUCT_MODEL_CONFIG[canonical.id]!.processRatios,
          }
        : {}),
    },
  });
}

async function canonicalizeProcessType(
  tenantId: string,
  canonical: (typeof DEFAULT_PROCESS_TYPES)[number],
): Promise<void> {
  const duplicates = await prisma.processType.findMany({
    where: { tenantId, name: canonical.name, id: { not: canonical.id } },
  });

  for (const dup of duplicates) {
    const dupRecords = await prisma.processRecord.findMany({
      where: { processTypeId: dup.id },
    });
    for (const rec of dupRecords) {
      const existing = await prisma.processRecord.findUnique({
        where: {
          projectId_processTypeId_date: {
            projectId: rec.projectId,
            processTypeId: canonical.id,
            date: rec.date,
          },
        },
      });
      if (existing) {
        const merged = (toNumber(existing.hours) ?? 0) + (toNumber(rec.hours) ?? 0);
        await prisma.processRecord.update({
          where: { id: existing.id },
          data: { hours: new Prisma.Decimal(merged) },
        });
        await prisma.processRecord.delete({ where: { id: rec.id } });
      } else {
        await prisma.processRecord.update({
          where: { id: rec.id },
          data: { processTypeId: canonical.id },
        });
      }
    }

    await prisma.processType.delete({ where: { id: dup.id } });
  }

  await prisma.processType.upsert({
    where: { id: canonical.id },
    create: {
      id: canonical.id,
      tenantId,
      name: canonical.name,
      displayOrder: canonical.displayOrder,
      defaultRatio: new Prisma.Decimal(canonical.defaultRatio),
      isWelding: canonical.isWelding,
    },
    update: {
      name: canonical.name,
      displayOrder: canonical.displayOrder,
      defaultRatio: new Prisma.Decimal(canonical.defaultRatio),
      isWelding: canonical.isWelding,
    },
  });
}

function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

async function seedMasters(tenantId: string): Promise<void> {
  for (const pt of DEFAULT_PROCESS_TYPES) {
    await canonicalizeProcessType(tenantId, pt);
  }

  for (const pt of DEFAULT_PRODUCT_TYPES) {
    await canonicalizeProductType(tenantId, pt);
  }

  for (const team of DEFAULT_TEAMS) {
    await prisma.team.upsert({
      where: { id: team.id },
      create: { id: team.id, tenantId, name: team.name, sortOrder: team.sortOrder },
      update: { name: team.name, sortOrder: team.sortOrder, deletedAt: null },
    });
  }

  for (const m of TEAM_MEMBERS) {
    await prisma.teamMember.upsert({
      where: { id: m.id },
      create: { id: m.id, teamId: m.teamId, name: m.name },
      update: { name: m.name, teamId: m.teamId },
    });
  }

  for (const cap of DEFAULT_CAPACITY) {
    const existing = await prisma.capacitySetting.findFirst({
      where: { tenantId, teamId: null, category: cap.category },
    });
    if (!existing) {
      await prisma.capacitySetting.create({
        data: {
          id: ulid(),
          tenantId,
          teamId: null,
          category: cap.category,
          regularHoursPerDay: new Prisma.Decimal(cap.regular),
          overtime2hPerDay: new Prisma.Decimal(cap.ot2),
          overtime4hPerDay: new Prisma.Decimal(cap.ot4),
          headcount: 1,
        },
      });
    }
  }
}

async function seedCalendar(tenantId: string): Promise<void> {
  const year = new Date().getFullYear();
  const holidays = [
    `${year}-01-01`,
    `${year}-01-02`,
    `${year}-01-03`,
    `${year}-02-11`,
    `${year}-02-23`,
    `${year}-03-20`,
    `${year}-04-29`,
    `${year}-05-03`,
    `${year}-05-04`,
    `${year}-05-05`,
    `${year}-07-21`,
    `${year}-08-11`,
    `${year}-09-15`,
    `${year}-09-23`,
    `${year}-10-13`,
    `${year}-11-03`,
    `${year}-11-23`,
  ];

  for (const dateStr of holidays) {
    const date = parseDate(dateStr);
    const existing = await prisma.calendar.findUnique({
      where: { tenantId_date: { tenantId, date } },
    });
    if (!existing) {
      await prisma.calendar.create({
        data: {
          id: ulid(),
          tenantId,
          date,
          isHoliday: true,
          holidayName: "祝日",
        },
      });
    }
  }
}

async function seedProjects(tenantId: string): Promise<void> {
  for (const p of SAMPLE_PROJECTS) {
    const plannedHours =
      "plannedHours" in p && p.plannedHours != null
        ? new Prisma.Decimal(p.plannedHours)
        : null;
    const weldingRatio =
      "weldingRatio" in p && p.weldingRatio != null
        ? new Prisma.Decimal(p.weldingRatio)
        : null;

    await prisma.project.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        tenantId,
        projectNumber: p.projectNumber,
        projectName: p.projectName,
        clientName: p.clientName,
        productTypeId: p.productTypeId,
        teamId: p.teamId,
        category: p.category,
        plannedHours,
        weldingRatio,
        deadline: parseDate(p.deadline),
        drawingReceivedAt: p.drawingReceivedAt ? parseDate(p.drawingReceivedAt) : null,
        status: p.status,
        pastAverageHours: plannedHours,
        setCount: "setCount" in p ? p.setCount : null,
        detail: "detail" in p ? p.detail : null,
      },
      update: {
        projectName: p.projectName,
        clientName: p.clientName,
        plannedHours,
        weldingRatio,
        status: p.status,
        pastAverageHours: plannedHours,
        setCount: "setCount" in p ? p.setCount : null,
        detail: "detail" in p ? p.detail : null,
      },
    });
  }
}

async function seedProcessRecords(tenantId: string): Promise<void> {
  const records = [
    { projectId: "proj-001", processTypeId: "proc-kumitate-mae", date: "2026-07-01", hours: 4 },
    { projectId: "proj-001", processTypeId: "proc-kumitate-mae", date: "2026-07-02", hours: 3.5 },
    { projectId: "proj-001", processTypeId: "proc-kumitate", date: "2026-07-03", hours: 2 },
    { projectId: "proj-002", processTypeId: "proc-kumitate-mae", date: "2026-07-01", hours: 6 },
    { projectId: "proj-002", processTypeId: "proc-yosetsu", date: "2026-07-02", hours: 4 },
    { projectId: "proj-002", processTypeId: "proc-kumitate", date: "2026-07-03", hours: 5 },
    { projectId: "proj-003", processTypeId: "proc-kumitate-mae", date: "2026-07-01", hours: 3 },
    { projectId: "proj-003", processTypeId: "proc-shiage", date: "2026-07-02", hours: 2.5 },
    { projectId: "proj-003", processTypeId: "proc-yosetsu", date: "2026-07-03", hours: 4 },
  ];

  for (const r of records) {
    const project = await prisma.project.findFirst({
      where: { id: r.projectId, tenantId },
    });
    if (!project) continue;

    const date = parseDate(r.date);
    await prisma.processRecord.upsert({
      where: {
        projectId_processTypeId_date: {
          projectId: r.projectId,
          processTypeId: r.processTypeId,
          date,
        },
      },
      create: {
        id: ulid(),
        projectId: r.projectId,
        processTypeId: r.processTypeId,
        date,
        hours: new Prisma.Decimal(r.hours),
        recordedBy: "dev-user",
      },
      update: {
        hours: new Prisma.Decimal(r.hours),
      },
    });
  }
}

const HISTORICAL_PRODUCT_TYPE_IDS = new Set([
  "ptype-i",
  "ptype-hako",
  "ptype-zaguri",
  "ptype-sef",
]);

async function seedHistoricalAverages(tenantId: string): Promise<void> {
  await prisma.historicalAverage.deleteMany({
    where: { tenantId, bridgeName: null },
  });

  const samples = [
    {
      productTypeId: "ptype-sef",
      projectNumber: "206012",
      clientName: "横河NS",
      bridgeName: "大沢川橋",
      completedAt: "2010-10-01",
      teamId: "team-nakano",
      manufacturingPlanned: 390,
      salesPlanned: 304,
      weight: 6.5,
      assemblyPrepHours: 281,
      assemblyHours: 69,
      weldingHours: 166,
      distortionHours: 21,
      paintingHours: 72,
      finishingHours: 159,
      totalHours: 768,
      projectCount: 1,
    },
    {
      productTypeId: "ptype-sef",
      projectNumber: "206020",
      clientName: "横河NS",
      bridgeName: "熊井第3本",
      completedAt: "2010-12-15",
      teamId: "team-dosei",
      manufacturingPlanned: 400,
      salesPlanned: 450,
      weight: 6.5,
      assemblyPrepHours: 78,
      assemblyHours: 60,
      weldingHours: 163,
      distortionHours: 37,
      paintingHours: 43,
      finishingHours: 76,
      totalHours: 457,
      projectCount: 1,
    },
    {
      productTypeId: "ptype-sef",
      projectNumber: "20X037",
      clientName: "横河NS",
      bridgeName: "SEF岩見沢",
      completedAt: "2010-04-30",
      teamId: "team-nakano",
      manufacturingPlanned: 380,
      salesPlanned: 220,
      weight: 7,
      assemblyPrepHours: 168,
      assemblyHours: 39,
      weldingHours: 198,
      distortionHours: 48,
      paintingHours: 30,
      finishingHours: 171,
      totalHours: 654,
      projectCount: 1,
    },
    {
      productTypeId: "ptype-i",
      projectNumber: "116035",
      clientName: "IHI",
      bridgeName: "篠原橋 2基",
      completedAt: "2010-12-01",
      teamId: "team-sakai",
      manufacturingPlanned: 790,
      salesPlanned: 476,
      weight: 15.5,
      assemblyPrepHours: 173,
      assemblyHours: 150,
      weldingHours: 197,
      distortionHours: 108,
      paintingHours: 54,
      finishingHours: 204,
      totalHours: 886,
      projectCount: 1,
      memberLength: 15.5,
      weightPerMeter: 3.7,
    },
    {
      productTypeId: "ptype-hako",
      projectNumber: "230308",
      clientName: "西日本高速道路",
      bridgeName: "名神高速 箱型桁",
      completedAt: "2024-06-01",
      teamId: "team-dosei",
      manufacturingPlanned: 620,
      salesPlanned: 480,
      weight: 42,
      assemblyPrepHours: 140,
      assemblyHours: 120,
      weldingHours: 160,
      distortionHours: 80,
      paintingHours: 45,
      finishingHours: 150,
      totalHours: 695,
      projectCount: 1,
      memberLength: 22,
      weightPerMeter: 1.9,
    },
  ];

  for (const sample of samples) {
    await prisma.historicalAverage.upsert({
      where: {
        tenantId_productTypeId_projectNumber: {
          tenantId,
          productTypeId: sample.productTypeId,
          projectNumber: sample.projectNumber,
        },
      },
      create: {
        id: ulid(),
        tenantId,
        productTypeId: sample.productTypeId,
        projectNumber: sample.projectNumber,
        clientName: sample.clientName,
        bridgeName: sample.bridgeName,
        completedAt: sample.completedAt ? parseDate(sample.completedAt) : null,
        teamId: sample.teamId,
        manufacturingPlanned: new Prisma.Decimal(sample.manufacturingPlanned),
        salesPlanned: new Prisma.Decimal(sample.salesPlanned),
        weight: new Prisma.Decimal(sample.weight),
        assemblyPrepHours: new Prisma.Decimal(sample.assemblyPrepHours),
        assemblyHours: new Prisma.Decimal(sample.assemblyHours),
        weldingHours: new Prisma.Decimal(sample.weldingHours),
        distortionHours: new Prisma.Decimal(sample.distortionHours),
        paintingHours: new Prisma.Decimal(sample.paintingHours),
        finishingHours: new Prisma.Decimal(sample.finishingHours),
        totalHours: new Prisma.Decimal(sample.totalHours),
        projectCount: sample.projectCount,
        memberLength:
          sample.memberLength != null
            ? new Prisma.Decimal(sample.memberLength)
            : null,
        weightPerMeter:
          sample.weightPerMeter != null
            ? new Prisma.Decimal(sample.weightPerMeter)
            : null,
      },
      update: {
        clientName: sample.clientName,
        bridgeName: sample.bridgeName,
        completedAt: sample.completedAt ? parseDate(sample.completedAt) : null,
        teamId: sample.teamId,
        manufacturingPlanned: new Prisma.Decimal(sample.manufacturingPlanned),
        salesPlanned: new Prisma.Decimal(sample.salesPlanned),
        weight: new Prisma.Decimal(sample.weight),
        assemblyPrepHours: new Prisma.Decimal(sample.assemblyPrepHours),
        assemblyHours: new Prisma.Decimal(sample.assemblyHours),
        weldingHours: new Prisma.Decimal(sample.weldingHours),
        distortionHours: new Prisma.Decimal(sample.distortionHours),
        paintingHours: new Prisma.Decimal(sample.paintingHours),
        finishingHours: new Prisma.Decimal(sample.finishingHours),
        totalHours: new Prisma.Decimal(sample.totalHours),
        projectCount: sample.projectCount,
        memberLength:
          sample.memberLength != null
            ? new Prisma.Decimal(sample.memberLength)
            : null,
        weightPerMeter:
          sample.weightPerMeter != null
            ? new Prisma.Decimal(sample.weightPerMeter)
            : null,
      },
    });
  }
}

async function main(): Promise<void> {
  const tenantId = TENANT_ID;

  await prisma.tenant.upsert({
    where: { id: tenantId },
    create: { id: tenantId, name: "ミカサ金属" },
    update: { name: "ミカサ金属" },
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

  await seedMasters(tenantId);
  await seedCalendar(tenantId);
  await seedProjects(tenantId);
  await seedProcessRecords(tenantId);
  await seedHistoricalAverages(tenantId);

  console.log("Seed OK.");
  console.log("  TENANT_ID:", tenantId);
  console.log("  工事: 5件（進行中4 + 出図待ち1、うち116035はモデル未作成）");
  console.log("  日次実績: 9件");
  console.log("  過去実績: 工事レコード 5件");
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
