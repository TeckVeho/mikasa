"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api";
import { PersonaEditor } from "./PersonaEditor";
import { RulesEditor } from "./RulesEditor";
import { KnowledgeEditor } from "./KnowledgeEditor";
import { ToolDefinitionEditor } from "./ToolDefinitionEditor";
import { GuardRailsEditor } from "./GuardRailsEditor";
import { TransferSettings } from "./TransferSettings";

type Tab = "persona" | "rules" | "knowledge" | "guardRails" | "tools";

const TABS: { id: Tab; label: string }[] = [
  { id: "persona", label: "ペルソナ" },
  { id: "rules", label: "対話ルール" },
  { id: "knowledge", label: "業務ナレッジ" },
  { id: "guardRails", label: "ガードレール" },
  { id: "tools", label: "ツール定義" },
];

const DEFAULT_PERSONA = [
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
].join("\n");

const DEFAULT_RULES = [
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
].join("\n");

const DEFAULT_KNOWLEDGE = [
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
].join("\n");

const DEFAULT_GUARDRAILS = [
  "## ぜったいに守るルール",
  "",
  "### 情報の正確性",
  "- 料金の具体的な金額は伝えない。「担当部署にてご案内いたします」と案内する",
  "- 推測や憶測で情報を伝えない",
  "",
  "### 個人情報保護",
  "- お客様の個人情報は復唱確認時以外に繰り返さない",
  "",
  "### エスカレーション",
  "- 判断に迷うお問い合わせは折り返し対応を提案する",
  "- お客様が明示的に「人間と話したい」と要望された場合は折り返し対応を提案する",
  "",
  "### 対応範囲",
  "- 自社サービス以外の相談には応じない",
  "- AIであることを聞かれた場合は正直に「自動音声にて対応させていただいております」と答える",
].join("\n");

export function NewGeminiScenario() {
  const router = useRouter();

  const [name, setName] = useState("新規シナリオ");
  const [activeTab, setActiveTab] = useState<Tab>("persona");
  const [persona, setPersona] = useState(DEFAULT_PERSONA);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [knowledge, setKnowledge] = useState(DEFAULT_KNOWLEDGE);
  const [guardRails, setGuardRails] = useState(DEFAULT_GUARDRAILS);
  const [toolDefinitions, setToolDefinitions] = useState("");
  const [transferEnabled, setTransferEnabled] = useState(true);
  const [transferNumber, setTransferNumber] = useState("");
  const [transferNumberClaims, setTransferNumberClaims] = useState("");
  const [transferTimeout, setTransferTimeout] = useState(30);
  const [humanFirstEnabled, setHumanFirstEnabled] = useState(false);
  const [humanFirstNumber, setHumanFirstNumber] = useState("");
  const [humanFirstTimeout, setHumanFirstTimeout] = useState(18);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const createRes = await apiJson<{ id: string }>("/v1/scenarios", {
        method: "POST",
        body: JSON.stringify({
          name,
          flowJson: { nodes: [], edges: [] },
        }),
      });
      if (!createRes.ok) {
        alert(createRes.message ?? createRes.error);
        return;
      }

      const scenarioId = createRes.data.id;

      const geminiRes = await apiJson(`/v1/scenarios/${scenarioId}/gemini`, {
        method: "PUT",
        body: JSON.stringify({
          persona,
          rules,
          knowledge,
          guardRails,
          toolDefinitions,
          transferEnabled,
          transferNumber,
          transferNumberClaims: transferNumberClaims || null,
          transferTimeout,
          humanFirstEnabled,
          humanFirstNumber: humanFirstNumber || null,
          humanFirstTimeout,
        }),
      });
      if (!geminiRes.ok) {
        alert(geminiRes.message ?? geminiRes.error);
        return;
      }

      router.push(`/scenarios/${scenarioId}/gemini`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Gemini Live シナリオ作成"
        description="シナリオ名と Gemini Live の設定を入力してください"
      />

      {/* Name */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <label className="text-sm font-medium text-text mb-1.5 block">
          シナリオ名
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-md rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          placeholder="シナリオ名を入力"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-primary/5 hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-border bg-surface p-5">
        {activeTab === "persona" && (
          <PersonaEditor value={persona} onChange={setPersona} />
        )}
        {activeTab === "rules" && (
          <RulesEditor value={rules} onChange={setRules} />
        )}
        {activeTab === "knowledge" && (
          <KnowledgeEditor value={knowledge} onChange={setKnowledge} />
        )}
        {activeTab === "guardRails" && (
          <GuardRailsEditor value={guardRails} onChange={setGuardRails} />
        )}
        {activeTab === "tools" && (
          <ToolDefinitionEditor
            value={toolDefinitions}
            onChange={setToolDefinitions}
          />
        )}
      </div>

      {/* Transfer */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <TransferSettings
          enabled={transferEnabled}
          number={transferNumber}
          claimsNumber={transferNumberClaims}
          timeout={transferTimeout}
          humanFirstEnabled={humanFirstEnabled}
          humanFirstNumber={humanFirstNumber}
          humanFirstTimeout={humanFirstTimeout}
          onEnabledChange={setTransferEnabled}
          onNumberChange={setTransferNumber}
          onClaimsNumberChange={setTransferNumberClaims}
          onTimeoutChange={setTransferTimeout}
          onHumanFirstEnabledChange={setHumanFirstEnabled}
          onHumanFirstNumberChange={setHumanFirstNumber}
          onHumanFirstTimeoutChange={setHumanFirstTimeout}
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={handleSave} loading={saving}>
          <Sparkles size={14} className="mr-1.5" />
          作成して保存
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/scenarios")}
          disabled={saving}
        >
          キャンセル
        </Button>
      </div>
    </div>
  );
}
