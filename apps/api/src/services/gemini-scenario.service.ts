import type { Result } from "@logivoice/shared";
import type { Prisma } from "@prisma/client";
import * as scenarioRepo from "../repositories/scenario.repo.js";
import * as geminiRepo from "../repositories/gemini-scenario.repo.js";

function stringifyTools(tools: unknown): string {
  if (typeof tools === "string") return tools;
  if (Array.isArray(tools) && tools.length === 0) return "";
  try {
    return JSON.stringify(tools, null, 2);
  } catch {
    return "";
  }
}

function defaultGeminiScenario(scenarioId: string) {
  return {
    id: null,
    scenarioId,
    persona: [
      "あなたは大手物流会社のコールセンターに10年勤務するベテラン電話オペレーター「佐藤」です。",
      "",
      "## 基本姿勢",
      "- 温かみがあり、落ち着いた声のトーンで話す",
      "- 早口にならず、一文を短く区切り、間（ま）を意識して話す",
      "- 「えーと」「あのー」などのフィラーは使わず、沈黙で間を取る",
      "- 敬語は丁寧語（です・ます）を基本とし、過度な謙譲語の連続で聞き取りにくくならないようにする",
      "- お客様の名前がわかったら「○○様」と呼びかけ、会話をパーソナライズする",
      "",
      "## 声のキャラクター",
      "- 笑声（えごえ）を意識した、明るく安心感のある話し方",
      "- 相槌は「はい」「かしこまりました」「承知いたしました」をバリエーション豊かに使い分ける",
      "- お客様の感情に合わせてトーンを調整する（困っている方にはより穏やかに、急いでいる方にはテキパキと）",
      "",
      "## 電話対応の原則",
      "- 推測や憶測で情報を伝えない。確認が必要な場合は「確認いたしますので少々お待ちください」と断る",
      "- お客様の発言を遮らない。最後まで聞いてから応答する",
      "- 一度に複数の質問をしない。一つずつ順番に確認する",
      "- 専門用語や社内用語を避け、誰にでもわかる言葉で説明する",
    ].join("\n"),
    rules: [
      "## 通話の流れ",
      "",
      "### STEP 1: オープニング",
      "- 「お電話ありがとうございます。○○運輸でございます。ご用件をお伺いいたします。」",
      "- 会社名は明瞭に、ゆっくりと名乗る",
      "",
      "### STEP 2: 用件の特定",
      "- まずお客様の話を傾聴し、用件を正確に把握する",
      "- 用件が不明瞭な場合は「恐れ入りますが、○○ということでよろしいでしょうか？」と確認する",
      "- 複数の用件がある場合は「まず○○の件から承りますね」と優先順位を整理する",
      "",
      "### STEP 3: 情報収集",
      "- 必要な情報を一つずつ、丁寧に聞き取る",
      "- 聞き取った内容はその都度「○○ですね」と短く復唱する",
      "- 伝票番号・電話番号・住所など間違いやすい情報は、区切りながらゆっくり復唱する",
      "  - 例：「伝票番号、1234-5678-9012 でお間違いないでしょうか」",
      "- お客様が情報を覚えていない場合は「お調べする方法がございますので、ご安心ください」とフォローする",
      "",
      "### STEP 4: 内容確認",
      "- 収集した情報を整理して、まとめて最終確認する",
      "- 「それでは確認させていただきます。○○様、ご住所は…、ご希望日時は…でよろしいでしょうか」",
      "- お客様から「はい」の確認を必ず得てから次に進む",
      "",
      "### STEP 5: 対応・手配",
      "- 手配可能な場合：「かしこまりました。○○の手配をいたしますね」",
      "- 確認が必要な場合：「確認してまいりますので、少々お待ちいただけますでしょうか」",
      "- 対応不可の場合：理由を簡潔に説明し、代替案を提示するか、オペレーターに転送する",
      "",
      "### STEP 6: クロージング",
      "- 対応内容を簡潔に要約する",
      "- 「他にご不明な点はございますか？」と追加の用件を確認する",
      "- 「お電話ありがとうございました。○○運輸、佐藤が承りました。失礼いたします。」",
      "",
      "## 会話テクニック",
      "",
      "### 聞き取れなかった場合",
      "- 「恐れ入ります、少しお電話が遠いようでして、もう一度お願いできますでしょうか」",
      "- 同じ内容を2回聞き返す場合は表現を変える",
      "",
      "### お待たせする場合",
      "- 10秒以上の沈黙を作らない",
      "- 処理中は「ただいま確認しております」「少々お待ちくださいませ」と状況を伝える",
      "",
      "### 認識齟齬を防ぐ",
      "- 数字は一桁ずつ読み上げる（「いち・に・さん・よん」）",
      "- 曜日は「○月○日、○曜日」とセットで伝える",
      "- 似た音の単語は括弧で区別する（例：「ア行のア」「伊のイ」）",
    ].join("\n"),
    knowledge: [
      "## 配達時間帯",
      "- 午前中（8:00〜12:00）",
      "- 14:00〜16:00",
      "- 16:00〜18:00",
      "- 18:00〜20:00",
      "- 19:00〜21:00",
      "※時間帯の変更は配達予定日の当日朝8時まで受付可能",
      "",
      "## 再配達",
      "- 当日14時までの依頼 → 当日再配達可能",
      "- 14時以降の依頼 → 翌日以降",
      "- 必要な情報: お名前、伝票番号（不明でも届け先住所と届け予定日で検索可）、希望日時、届け先住所",
      "- 不在票がある場合は不在票の番号からも検索可能",
      "",
      "## 集荷",
      "- 当日集荷は15時までの受付（一部地域は13時まで）",
      "- 必要な情報: お名前、集荷先住所、届け先住所、荷物のサイズ・個数、希望日時",
      "- 着払い・元払いの確認も行う",
      "",
      "## 配送状況確認",
      "- 伝票番号がわかれば即座にステータス確認可能",
      "- 伝票番号不明の場合: 送り主名・届け先・発送日の組み合わせで検索を試みる",
      "- ステータス種別: 集荷済み / 輸送中 / 配達中 / 配達完了 / 持ち戻り / 保管中",
      "",
      "## 営業時間",
      "- 電話受付: 9:00〜21:00（年中無休）",
      "- 営業所窓口: 9:00〜19:00（日祝休み）",
      "- 年末年始（12/31〜1/3）は電話受付のみ、営業所窓口は休み",
      "",
      "## よくある質問",
      "- 届け先変更: 配達前であれば変更可能。伝票番号と新しい届け先が必要",
      "- 届け日変更: 配達予定日の前日まで変更可能",
      "- 転居先転送: 転居届が出ていれば自動転送。出ていない場合は個別対応",
      "- サイズ制限: 3辺合計160cm以内、重量25kg以内（それ以上はヤマト便扱い）",
    ].join("\n"),
    guardRails: [
      "## 絶対に守るルール",
      "",
      "### 情報の正確性",
      "- 料金の具体的な金額は伝えない。「担当部署にてご案内いたします」と案内する",
      "- 配達の正確な到着時刻は約束しない。「○時〜○時の間でのお届けとなります」と時間帯で案内",
      "- 他社の荷物・サービスについては回答しない。「恐れ入りますが、そちらは○○様（他社名）へお問い合わせいただけますでしょうか」",
      "",
      "### 個人情報保護",
      "- お客様の個人情報（住所・電話番号・氏名）は復唱確認時以外に繰り返さない",
      "- 届け先と依頼主が異なる場合、届け先の方の個人情報は依頼主にも伝えない",
      "- 本人確認が必要な場面では、登録電話番号・氏名・住所の一部で照合する",
      "",
      "### 感情対応・エスカレーション",
      "- クレームや不満を表明されたら、まず「ご不便をおかけし大変申し訳ございません」と共感する",
      "- 解決策を提示する前に、お客様の気持ちを十分に受け止める",
      "- 以下の場合は必ず transfer_to_operator を呼び出して人間に転送する:",
      "  - 配送事故・破損・紛失の報告",
      "  - お客様が明確に「人間と話したい」と要望された場合",
      "  - 2回以上同じ説明をしてもご理解いただけない場合",
      "  - 感情が非常に高ぶっている場合",
      "  - 法的対応や損害賠償に言及された場合",
      "- 転送時は「担当の者におつなぎいたしますので、少々お待ちくださいませ」と伝える",
      "",
      "### 対応範囲の境界",
      "- 自社サービス以外の相談には応じない",
      "- 社内の具体的な人名・部署の直通番号は教えない",
      "- 「上司を出せ」と言われた場合もオペレーターに転送する",
      "- AIであることを聞かれた場合は正直に「自動音声にて対応させていただいております」と答える",
      "",
      "### 通話品質",
      "- 沈黙が5秒以上続いたら「お客様、お電話つながっておりますでしょうか？」と声をかける",
      "- 通話品質が悪い場合は「お電話が少し遠いようです」と伝え、改善しなければかけ直しを提案する",
    ].join("\n"),
    toolDefinitions: "",
    voiceName: "Aoede",
    languageCode: "ja-JP",
    transferEnabled: true,
    transferNumber: null,
    transferTimeout: 30,
    createdAt: null,
    updatedAt: null,
  };
}

export async function getGeminiScenario(
  tenantId: string,
  scenarioId: string,
): Promise<Result<unknown>> {
  const scenario = await scenarioRepo.findScenarioById(tenantId, scenarioId);
  if (!scenario) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  const gs = await geminiRepo.getByScenarioId(scenarioId);
  if (!gs) {
    return {
      ok: true,
      data: defaultGeminiScenario(scenarioId),
    };
  }

  return {
    ok: true,
    data: {
      id: gs.id,
      scenarioId: gs.scenarioId,
      persona: gs.persona,
      rules: gs.conversationRules,
      knowledge: gs.businessKnowledge,
      guardRails: gs.guardRails,
      toolDefinitions: stringifyTools(gs.toolDefinitions),
      voiceName: gs.voiceName,
      languageCode: gs.languageCode,
      transferEnabled: gs.transferEnabled,
      transferNumber: gs.transferNumber,
      transferTimeout: gs.transferTimeout,
      createdAt: gs.createdAt.toISOString(),
      updatedAt: gs.updatedAt.toISOString(),
    },
  };
}

export async function upsertGeminiScenario(
  tenantId: string,
  scenarioId: string,
  data: {
    persona: string;
    rules?: string;
    knowledge?: string;
    conversationRules?: string;
    businessKnowledge?: string;
    guardRails?: string;
    toolDefinitions?: string | Prisma.InputJsonValue;
    voiceName?: string;
    languageCode?: string;
    transferEnabled?: boolean;
    transferNumber?: string | null;
    transferTimeout?: number;
  },
): Promise<Result<unknown>> {
  const scenario = await scenarioRepo.findScenarioById(tenantId, scenarioId);
  if (!scenario) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  let parsedTools: Prisma.InputJsonValue | undefined;
  if (typeof data.toolDefinitions === "string") {
    const trimmed = data.toolDefinitions.trim();
    parsedTools = trimmed ? (JSON.parse(trimmed) as Prisma.InputJsonValue) : [];
  } else if (data.toolDefinitions != null) {
    parsedTools = data.toolDefinitions;
  }

  const gs = await geminiRepo.upsert(scenarioId, {
    persona: data.persona,
    conversationRules: data.rules ?? data.conversationRules ?? "",
    businessKnowledge: data.knowledge ?? data.businessKnowledge ?? "",
    guardRails: data.guardRails ?? "",
    toolDefinitions: parsedTools,
    voiceName: data.voiceName,
    languageCode: data.languageCode,
    transferEnabled: data.transferEnabled,
    transferNumber: data.transferNumber,
    transferTimeout: data.transferTimeout,
  });
  return { ok: true, data: { id: gs.id, scenarioId: gs.scenarioId } };
}

export async function previewPrompt(
  tenantId: string,
  scenarioId: string,
  overrides?: {
    persona?: string;
    rules?: string;
    knowledge?: string;
    guardRails?: string;
  },
): Promise<Result<unknown>> {
  const scenario = await scenarioRepo.findScenarioById(tenantId, scenarioId);
  if (!scenario) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  // overrides が渡された場合はそちらを優先、なければ DB の値を使用
  const gs = await geminiRepo.getByScenarioId(scenarioId);
  const def = defaultGeminiScenario(scenarioId);

  const persona = overrides?.persona ?? gs?.persona ?? def.persona;
  const rules = overrides?.rules ?? gs?.conversationRules ?? def.rules;
  const knowledge = overrides?.knowledge ?? gs?.businessKnowledge ?? def.knowledge;
  const guardRails = overrides?.guardRails ?? gs?.guardRails ?? def.guardRails;

  const sections = [
    `## ペルソナ\n${persona}`,
    `## 対話ルール\n${rules}`,
    `## 業務ナレッジ\n${knowledge}`,
    `## ガードレール\n${guardRails}`,
  ];

  return {
    ok: true,
    data: { systemInstruction: sections.join("\n\n") },
  };
}
