/**
 * `api.ts` の shouldUseMock() が true のとき apiJson が返すダミーデータ。
 * 開発時は未設定でもモックが既定 ON（本番では OFF）。
 */

import type { FlowJson } from "@logivoice/shared";

const MOCK_FLOW: FlowJson = {
  nodes: [
    {
      id: "n_speak",
      type: "speak",
      data: {
        text: "お電話ありがとうございます。ご用件をお話しください。",
        speed: 1,
        source: "tts",
      },
      position: { x: 0, y: 0 },
    },
    {
      id: "n_listen",
      type: "listen",
      data: {
        variableName: "user_intent",
        timeoutSeconds: 10,
        retryCount: 2,
        retryText: "もう一度お願いします。",
        excludeNumbers: false,
        noRetryOnFail: false,
        kanaConversion: "none",
      },
      position: { x: 260, y: 0 },
    },
    {
      id: "n_end",
      type: "end",
      data: { farewell: "ありがとうございました。" },
      position: { x: 520, y: 0 },
    },
  ],
  edges: [
    { id: "e1", source: "n_speak", target: "n_listen" },
    { id: "e2", source: "n_listen", target: "n_end" },
  ],
};

const MOCK_SUMMARY = {
  totalCalls: 1248,
  completionRate: 0.78,
  avgDuration: 142,
  transferCount: 34,
  prevPeriodComparison: {
    totalCalls: 0.12,
    completionRate: -0.03,
  },
};

function buildDailyCalls(): Array<{ date: string; count: number }> {
  const out: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      count: 12 + ((i * 7) % 23) + Math.floor(i / 4),
    });
  }
  return out;
}

function buildHourlyDist(): Array<{ hour: number; count: number }> {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count:
      hour >= 9 && hour <= 18
        ? 8 + (hour % 5) + (hour % 3)
        : hour % 4 === 0
          ? 1
          : hour % 3,
  }));
}

const MOCK_SCENARIOS = [
  {
    id: "mock-scn-inbound",
    name: "受付・再配達（サンプル）",
    status: "published",
    scenarioType: "inbound",
    linkedNumberCount: 2,
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_CALLS_LIST = {
  items: [
    {
      id: "mock-call-001",
      callerNumber: "+819012345678",
      receiverNumber: "+815012340001",
      duration: 185,
      status: "complete",
      summaryText:
        "再配達の依頼。明日午前中、東京都渋谷区〇〇への配送を希望。",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "mock-call-002",
      callerNumber: "+819076543210",
      receiverNumber: "+815012340001",
      duration: 92,
      status: "transferred",
      summaryText: "クレーム対応のためオペレータへ転送。",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "mock-call-003",
      callerNumber: "+818012345678",
      receiverNumber: "+815012340002",
      duration: null,
      status: "abandoned",
      summaryText: null,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  total: 3,
  page: 1,
  limit: 50,
};

function mockCallDetail(id: string) {
  return {
    id,
    callerNumber: "+819012345678",
    duration: 185,
    status: "completed",
    transcriptText:
      "オペレータ: お電話ありがとうございます。\nお客様: 荷物の再配達をお願いしたいです。\nオペレータ: 承知しました。ご住所とご希望の時間帯をお願いします。\nお客様: 渋谷区〇〇で、明日の午前中でお願いします。",
    transcriptSegments: [
      { startMs: 0, endMs: 4500, text: "お電話ありがとうございます。" },
      { startMs: 4500, endMs: 12000, text: "荷物の再配達をお願いしたいです。" },
      { startMs: 12000, endMs: 22000, text: "渋谷区〇〇で、明日の午前中でお願いします。" },
    ],
    summaryText:
      "再配達依頼。住所は東京都渋谷区〇〇。希望は翌日午前中。問題なしで完結。",
    structuredData: {
      name: "山田太郎",
      address: "東京都渋谷区〇〇1-2-3",
      preferredDatetime: "明日 午前中",
      purpose: "redelivery",
    },
    operatorNote: "",
    callbackDone: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  };
}

const MOCK_NUMBERS = [
  {
    id: "mock-num-001",
    number: "+815012340001",
    scenarioId: "mock-scn-inbound",
    scenarioName: "受付・再配達（サンプル）",
    status: "active",
    monthlyCallCount: 428,
  },
  {
    id: "mock-num-002",
    number: "+815012340002",
    scenarioId: null,
    scenarioName: null,
    status: "inactive",
    monthlyCallCount: 12,
  },
];

function mockNumberDetail(id: string) {
  const row = MOCK_NUMBERS.find((n) => n.id === id);
  if (row) {
    return {
      id: row.id,
      number: row.number,
      scenarioId: row.scenarioId,
      scenario:
        row.scenarioId && row.scenarioName
          ? { id: row.scenarioId, name: row.scenarioName }
          : null,
      status: row.status,
      monthlyCallCount: row.monthlyCallCount,
    };
  }
  return {
    id,
    number: "+815099999999",
    scenarioId: null,
    scenario: null,
    status: "active",
    monthlyCallCount: 0,
  };
}

function mockScenarioDetail(id: string) {
  return {
    id,
    name: "受付・再配達（サンプル）",
    flowJson: MOCK_FLOW,
    scenarioType: "inbound",
    description: "モック用のシナリオです。保存しても API に届きません。",
    status: "published",
  };
}

const MOCK_USERS = [
  {
    id: "mock-user-1",
    name: "管理者 太郎",
    email: "admin@example.com",
    role: "admin",
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "mock-user-2",
    name: "オペレータ 花子",
    email: "operator@example.com",
    role: "operator",
    lastLoginAt: null,
  },
];

const MOCK_DICT = [
  {
    id: "mock-dict-1",
    word: "再配達",
    reading: "サイハイタツ",
    category: "general",
  },
  {
    id: "mock-dict-2",
    word: "渋谷区",
    reading: "シブヤク",
    category: "address",
  },
];

let mockVoiceEngine: "flow" | "gemini_live" = "flow";

type MockEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message?: string };

/**
 * モック応答。null の場合は通常の fetch にフォールバック。
 */
export function resolveMockResponse<T>(
  fullPath: string,
  init: RequestInit = {},
): MockEnvelope<T> | null {
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(
    fullPath.startsWith("/") ? `http://local${fullPath}` : fullPath,
  );
  const pathname = url.pathname;
  const type = url.searchParams.get("type");

  // ─── 認証 ───
  if (method === "GET" && pathname === "/v1/auth/me") {
    return { ok: true, data: { id: "dev-user", email: "dev@example.com", role: "admin", tenantId: "01HZXEXAMPLE00000000000000" } as T };
  }

  // ─── モニタリング / 転送 ───
  if (method === "GET" && pathname === "/v1/monitor/active-calls") {
    return { ok: true, data: [] as T };
  }
  if (method === "GET" && pathname === "/v1/monitor/active-calls-snapshot") {
    return {
      ok: true,
      data: [
        {
          callSid: "CA_mock_001",
          tenantId: "01HZXEXAMPLE00000000000000",
          callerNumber: "090-1234-5678",
          scenarioId: "sc_1",
          startedAt: Date.now() - 45000,
          transcript: "オペレーター: お電話ありがとうございます。\nお客様: 再配達をお願いしたいのですが。\nオペレーター: かしこまりました。ご希望の日時をお伺いできますか？",
          status: "active",
        },
        {
          callSid: "CA_mock_002",
          tenantId: "01HZXEXAMPLE00000000000000",
          callerNumber: "080-9876-5432",
          scenarioId: "sc_2",
          startedAt: Date.now() - 120000,
          transcript: "オペレーター: お電話ありがとうございます。\nお客様: 荷物の状況を確認したいです。",
          status: "active",
        },
      ] as T,
    };
  }
  if (method === "GET" && pathname.startsWith("/v1/transfers")) {
    return {
      ok: true,
      data: {
        items: [
          {
            id: "th_1",
            callLogId: "cl_1",
            callerNumber: "090-1234-5678",
            reason: "料金に関する詳細な質問のため、専門担当者への転送をご希望",
            collectedInfo: { name: "田中太郎", purpose: "料金問い合わせ", preferredDatetime: "特になし" },
            transcript: "AI: お電話ありがとうございます。\nお客様: 料金について聞きたいのですが。\nAI: かしこまりました。どのようなご質問でしょうか？\nお客様: 先月の請求が高かったので詳細を教えてほしい。\nAI: 承知いたしました。専門の担当者におつなぎいたします。",
            priority: "normal",
            department: "billing",
            status: "pending",
            createdAt: new Date(Date.now() - 300000).toISOString(),
          },
          {
            id: "th_2",
            callLogId: "cl_2",
            callerNumber: "080-9876-5432",
            reason: "クレーム対応のため転送",
            collectedInfo: { name: "佐藤花子", purpose: "クレーム" },
            transcript: "AI: お電話ありがとうございます。\nお客様: 届いた荷物が破損していました。\nAI: 大変申し訳ございません。担当者におつなぎいたします。",
            priority: "high",
            department: "support",
            status: "pending",
            createdAt: new Date(Date.now() - 600000).toISOString(),
          },
          {
            id: "th_3",
            callLogId: null,
            callerNumber: "070-5555-1234",
            reason: "再配達の特殊対応",
            collectedInfo: { name: "鈴木一郎", address: "東京都渋谷区1-2-3" },
            transcript: null,
            priority: "normal",
            department: "general",
            status: "handled",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        total: 3,
        page: 1,
        limit: 50,
      } as T,
    };
  }
  if (method === "PATCH" && /^\/v1\/transfers\/[^/]+\/status$/.test(pathname)) {
    return { ok: true, data: true as T };
  }

  // ─── ダッシュボード ───
  if (method === "GET" && pathname === "/v1/dashboard/operator-summary") {
    return {
      ok: true,
      data: {
        todayCalls: 23,
        pendingCallbacks: 5,
        pendingTransfers: 2,
        recentCalls: [
          { id: "cl_1", callerNumber: "090-1234-5678", status: "complete", summaryText: "再配達のご依頼。4月23日午前中に変更。", durationSeconds: 45, createdAt: new Date().toISOString() },
          { id: "cl_2", callerNumber: "080-9876-5432", status: "transferred", summaryText: "料金に関するお問い合わせ。担当者へ転送。", durationSeconds: 120, createdAt: new Date(Date.now() - 600000).toISOString() },
          { id: "cl_3", callerNumber: "070-5555-1234", status: "complete", summaryText: "配達状況の確認。本日中に到着予定とご案内。", durationSeconds: 30, createdAt: new Date(Date.now() - 1200000).toISOString() },
          { id: "cl_4", callerNumber: "090-3333-7777", status: "abandoned", summaryText: null, durationSeconds: 8, createdAt: new Date(Date.now() - 1800000).toISOString() },
          { id: "cl_5", callerNumber: "080-2222-8888", status: "complete", summaryText: "集荷のご依頼。明日14時〜16時で手配済み。", durationSeconds: 55, createdAt: new Date(Date.now() - 2400000).toISOString() },
        ],
      } as T,
    };
  }

  if (method === "GET" && pathname === "/v1/dashboard/summary") {
    return { ok: true, data: MOCK_SUMMARY as T };
  }
  if (method === "GET" && pathname === "/v1/dashboard/daily-calls") {
    return { ok: true, data: buildDailyCalls() as T };
  }
  if (method === "GET" && pathname === "/v1/dashboard/hourly-distribution") {
    return { ok: true, data: buildHourlyDist() as T };
  }
  if (method === "GET" && pathname === "/v1/dashboard/by-scenario") {
    return {
      ok: true,
      data: [
        {
          scenarioId: "mock-scn-inbound",
          scenarioName: "受付・再配達（サンプル）",
          callCount: 856,
        },
      ] as T,
    };
  }
  if (method === "GET" && pathname === "/v1/dashboard/by-number") {
    return {
      ok: true,
      data: [
        {
          phoneNumberId: "mock-num-001",
          number: "+815012340001",
          callCount: 623,
        },
        {
          phoneNumberId: "mock-num-002",
          number: "+815012340002",
          callCount: 145,
        },
      ] as T,
    };
  }
  if (method === "GET" && pathname === "/v1/dashboard/cost-estimate") {
    return {
      ok: true,
      data: {
        monthToDateCalls: 420,
        totalMinutes: 1280,
        estimatedUsd: 42.5,
      } as T,
    };
  }

  // ─── 通話 ───
  if (method === "GET" && pathname === "/v1/calls") {
    return { ok: true, data: MOCK_CALLS_LIST as T };
  }
  {
    const m = /^\/v1\/calls\/([^/]+)$/.exec(pathname);
    if (m && method === "GET") {
      return { ok: true, data: mockCallDetail(m[1]) as T };
    }
  }
  if (method === "PATCH" && /^\/v1\/calls\/[^/]+\/note$/.test(pathname)) {
    return { ok: true, data: {} as T };
  }

  // ─── シナリオ ───
  if (method === "GET" && pathname === "/v1/scenarios") {
    let rows = MOCK_SCENARIOS;
    if (type === "inbound") {
      rows = rows.filter((r) => r.scenarioType === "inbound");
    }
    return { ok: true, data: rows as T };
  }
  {
    const m = /^\/v1\/scenarios\/([^/]+)\/versions$/.exec(pathname);
    if (m && method === "GET") {
      return {
        ok: true,
        data: [
          {
            id: "mock-ver-2",
            version: 2,
            publishedAt: new Date().toISOString(),
          },
          {
            id: "mock-ver-1",
            version: 1,
            publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          },
        ] as T,
      };
    }
  }
  {
    const m = /^\/v1\/scenarios\/([^/]+)$/.exec(pathname);
    if (m && method === "GET") {
      return { ok: true, data: mockScenarioDetail(m[1]) as T };
    }
    if (m && method === "PUT") {
      return { ok: true, data: {} as T };
    }
  }
  if (method === "POST" && pathname === "/v1/scenarios") {
    return { ok: true, data: { id: "mock-new-scenario" } as T };
  }
  {
    const m = /^\/v1\/scenarios\/([^/]+)\/(publish|restore-version)$/.exec(
      pathname,
    );
    if (m && method === "POST") {
      return { ok: true, data: {} as T };
    }
  }

  // ─── 番号 ───
  if (method === "GET" && pathname === "/v1/numbers") {
    return { ok: true, data: MOCK_NUMBERS as T };
  }
  {
    const m = /^\/v1\/numbers\/([^/]+)$/.exec(pathname);
    if (m && method === "GET") {
      return { ok: true, data: mockNumberDetail(m[1]) as T };
    }
  }
  if (method === "PATCH" && /^\/v1\/numbers\/[^/]+\/scenario$/.test(pathname)) {
    return { ok: true, data: {} as T };
  }
  if (method === "PATCH" && /^\/v1\/numbers\/[^/]+\/status$/.test(pathname)) {
    return { ok: true, data: {} as T };
  }

  // ─── その他 GET ───
  if (method === "GET" && pathname.startsWith("/v1/callbacks")) {
    const allCallbacks = [
      { id: "cb_1", callerNumber: "090-1234-5678", preferredTime: "本日 14:00", status: "pending", createdAt: new Date(Date.now() - 1800000).toISOString(), completedAt: null },
      { id: "cb_2", callerNumber: "080-9876-5432", preferredTime: "明日 午前中", status: "pending", createdAt: new Date(Date.now() - 3600000).toISOString(), completedAt: null },
      { id: "cb_3", callerNumber: "070-5555-1234", preferredTime: null, status: "pending", createdAt: new Date(Date.now() - 7200000).toISOString(), completedAt: null },
      { id: "cb_4", callerNumber: "090-3333-7777", preferredTime: "昨日 16:00", status: "completed", createdAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 82800000).toISOString() },
      { id: "cb_5", callerNumber: "080-2222-8888", preferredTime: "本日 10:00", status: "no_answer", createdAt: new Date(Date.now() - 14400000).toISOString(), completedAt: null },
    ];
    const statusFilter = url.searchParams.get("status");
    const filtered = statusFilter && statusFilter !== "all"
      ? allCallbacks.filter((r) => r.status === statusFilter)
      : allCallbacks;
    return { ok: true, data: filtered as T };
  }
  if (method === "PATCH" && /^\/v1\/callbacks\/[^/]+\/(complete|no-answer)$/.test(pathname)) {
    return { ok: true, data: {} as T };
  }

  if (method === "GET" && pathname === "/v1/voc/summary") {
    return {
      ok: true,
      data: {
        topics: ["再配達", "配送時間", "荷物の追跡", "営業時間"],
        faqCandidates: [
          "再配達の手数料はかかりますか？",
          "最短でいつ届きますか？",
        ],
        sentiment: "概ねポジティブ（サンプル）",
      } as T,
    };
  }

  if (method === "GET" && pathname === "/v1/billing/summary") {
    return {
      ok: true,
      data: {
        plan: "スタンダード（モック）",
        monthToDateCalls: 420,
        estimatedTwilioUsd: 18.2,
        estimatedSttUsd: 12.4,
        estimatedTtsUsd: 6.1,
      } as T,
    };
  }

  // ─── 設定 ───
  if (method === "GET" && pathname === "/v1/settings/tenant") {
    return {
      ok: true,
      data: {
        companyName: "株式会社サンプル物流（モック）",
        maintenanceMode: false,
        maintenanceMessage: null,
        voiceEngine: mockVoiceEngine,
      } as T,
    };
  }
  if (method === "PATCH" && pathname === "/v1/settings/tenant") {
    return {
      ok: true,
      data: {
        companyName: "株式会社サンプル物流（モック）",
        maintenanceMode: false,
        maintenanceMessage: null,
        voiceEngine: mockVoiceEngine,
      } as T,
    };
  }
  if (method === "PUT" && pathname === "/v1/settings/voice-engine") {
    try {
      const body = JSON.parse(init.body as string);
      if (body.voiceEngine === "flow" || body.voiceEngine === "gemini_live") {
        mockVoiceEngine = body.voiceEngine;
      }
    } catch { /* ignore */ }
    return { ok: true, data: { voiceEngine: mockVoiceEngine } as T };
  }

  if (method === "GET" && pathname === "/v1/settings/api-keys") {
    return {
      ok: true,
      data: {
        amivoiceKey: "",
        openaiKey: "",
        twilioSid: "",
        twilioToken: "",
      } as T,
    };
  }
  if (method === "PATCH" && pathname === "/v1/settings/api-keys") {
    return { ok: true, data: {} as T };
  }

  if (method === "POST" && pathname === "/v1/settings/test-connection") {
    return { ok: true, data: { success: true } as T };
  }

  if (method === "GET" && pathname === "/v1/settings/notifications") {
    return {
      ok: true,
      data: {
        callCompleteEmail: true,
        transferEmail: false,
        notifyEmail: "notify@example.com",
      } as T,
    };
  }
  if (method === "PATCH" && pathname === "/v1/settings/notifications") {
    return {
      ok: true,
      data: {
        callCompleteEmail: true,
        transferEmail: false,
        notifyEmail: "notify@example.com",
      } as T,
    };
  }

  if (method === "GET" && pathname === "/v1/users") {
    return { ok: true, data: MOCK_USERS as T };
  }
  if (method === "POST" && pathname === "/v1/users/invite") {
    return { ok: true, data: { id: "mock-invite-user" } as T };
  }
  if (method === "PATCH" && /^\/v1\/users\/[^/]+\/role$/.test(pathname)) {
    return {
      ok: true,
      data: {
        id: "mock-user",
        name: "ユーザー",
        email: "user@example.com",
        role: "operator",
        lastLoginAt: null,
      } as T,
    };
  }
  if (method === "DELETE" && /^\/v1\/users\/[^/]+$/.test(pathname)) {
    return { ok: true, data: {} as T };
  }

  if (method === "GET" && pathname === "/v1/dictionary") {
    return { ok: true, data: MOCK_DICT as T };
  }
  if (method === "POST" && pathname === "/v1/dictionary") {
    return { ok: true, data: {} as T };
  }
  if (method === "DELETE" && /^\/v1\/dictionary\/[^/]+$/.test(pathname)) {
    return { ok: true, data: {} as T };
  }

  // ─── Gemini シナリオ ───
  {
    const m = /^\/v1\/scenarios\/([^/]+)\/gemini$/.exec(pathname);
    if (m && method === "GET") {
      return {
        ok: true,
        data: {
          id: "mock-gemini-1",
          scenarioId: m[1],
          persona: "",
          rules: "",
          knowledge: "",
          toolDefinitions: "[]",
          transferEnabled: true,
          transferNumber: "",
          transferTimeout: 30,
        } as T,
      };
    }
    if (m && method === "PUT") {
      return { ok: true, data: {} as T };
    }
  }
  {
    const m = /^\/v1\/scenarios\/([^/]+)\/gemini\/preview-prompt$/.exec(pathname);
    if (m && method === "POST") {
      try {
        const body = JSON.parse(init.body as string);
        const prompt = [
          body.persona && `**ペルソナ:**\n${body.persona}`,
          body.rules && `**対話ルール:**\n${body.rules}`,
          body.knowledge && `**業務ナレッジ:**\n${body.knowledge}`,
          "日本語で応答してください。必ず日本語で応答してください。",
        ].filter(Boolean).join("\n\n");
        return { ok: true, data: { prompt } as T };
      } catch {
        return { ok: true, data: { prompt: "(プレビュー生成エラー)" } as T };
      }
    }
  }
  {
    const m = /^\/v1\/scenarios\/([^/]+)\/gemini\/migrate$/.exec(pathname);
    if (m && method === "POST") {
      return { ok: true, data: {} as T };
    }
  }

  return null;
}
