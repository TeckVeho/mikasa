export const LP_NAV_ITEMS = [
  { label: "課題", href: "#pain-points" },
  { label: "機能", href: "#features" },
  { label: "ユースケース", href: "#use-cases" },
  { label: "料金", href: "#pricing" },
  { label: "よくある質問", href: "#faq" },
] as const;

export const LP_HERO_STATS = [
  { value: "24時間", label: "自動応答" },
  { value: "2秒以内", label: "応答速度" },
  { value: "最大50件", label: "同時通話" },
] as const;

export const LP_HERO_BULLETS = [
  "ノーコードでシナリオ構築",
  "リアルタイム文字起こしと要約",
  "通話データの分析・可視化",
] as const;

export const LP_PAIN_POINTS = [
  {
    title: "再配達・確認の電話が、さばききれない",
    body: "1日数百件の受電がオペレーターを圧迫。対応品質にもバラつきが出ています。",
  },
  {
    title: "夜間・休日の着信を、取りこぼしている",
    body: "営業時間外の電話に対応できず、顧客満足度が下がり続けています。",
  },
  {
    title: "ドライバーへの連絡調整に、時間がかかる",
    body: "ルート変更・集荷依頼の伝達に人手を割かれ、本来の業務に集中できません。",
  },
  {
    title: "人を増やしたくても、採用コストが高い",
    body: "2024年問題以降の人手不足で、電話対応のためだけに人を雇うのは現実的ではありません。",
  },
] as const;

export const LP_FEATURES = [
  {
    number: "01",
    title: "電話対応が、24時間止まらない。",
    body: "AIボイスボットが着信を自動応答。再配達受付・配送状況案内・集荷依頼をシナリオに沿って自動処理。夜間・休日も対応が途切れません。",
  },
  {
    number: "02",
    title: "シナリオを、ノーコードで自由に。",
    body: "ドラッグ＆ドロップのフローエディタで、対話シナリオを自分で作成・編集。ITの知識がなくても、翌日から新しい応対フローを稼働できます。",
  },
  {
    number: "03",
    title: "通話データが、判断の根拠に。",
    body: "全通話を自動で文字起こし・要約。受電件数・完結率・対応時間をダッシュボードで可視化し、改善のサイクルを事実ベースで回せます。",
  },
] as const;

export const LP_USE_CASES = [
  {
    id: "redelivery",
    label: "再配達受付",
    title: "「もう折り返しません」",
    body: "AIが氏名・住所・希望日時をヒアリングし、再配達を自動受付。オペレーターへの転送は本当に必要なケースだけ。",
    points: [
      "音声認識で住所を正確に取得",
      "受付結果をSMSで自動送信",
      "対応時間を平均30秒に短縮",
    ],
  },
  {
    id: "tracking",
    label: "配送状況の確認",
    title: "「今どこですか？」に、AIが即答",
    body: "追跡番号やお届け先から配送状況を自動案内。ドライバーへの問い合わせ中継が不要になります。",
    points: [
      "TMS/WMS連携で最新ステータス",
      "FAQ的な定型回答を自動化",
      "有人転送率を大幅削減",
    ],
  },
  {
    id: "pickup",
    label: "集荷・ルート変更",
    title: "急な依頼も、取りこぼさない",
    body: "集荷依頼・ルート変更の電話を受付し、内容をテキスト化してドライバーや管理者に即時通知。",
    points: [
      "通話後に自動要約を生成",
      "折り返し不要の一次受付",
      "対応履歴をチームで共有",
    ],
  },
] as const;

export const LP_STEPS = [
  {
    number: "01",
    title: "電話番号を取得する",
    body: "管理画面から電話番号を取得。既存の番号からの転送設定も可能です。最短当日から利用開始できます。",
  },
  {
    number: "02",
    title: "シナリオを作成する",
    body: "ノーコードのフローエディタで対話シナリオを構築。テンプレートから始めれば、30分で初期設定が完了します。",
  },
  {
    number: "03",
    title: "ダッシュボードで効果を確認",
    body: "受電件数・AI完結率・転送率をリアルタイムで把握。改善ポイントが一目でわかり、シナリオをすぐに調整できます。",
  },
] as const;

export const LP_SECURITY_POINTS = [
  {
    title: "通信の暗号化",
    body: "全通信を HTTPS / TLS で暗号化。通話データは転送中・保管中ともに保護されます。",
  },
  {
    title: "テナント間データ分離",
    body: "マルチテナント構成でも、テナント間のデータは完全に分離。他社のデータに触れることはありません。",
  },
  {
    title: "90日間の保存・自動削除",
    body: "通話ログ・録音は90日間保存後、自動で安全に削除。保持期間はカスタマイズも可能です。",
  },
  {
    title: "いつでも停止・削除",
    body: "ワンクリックでAI応答を停止。保存データの削除もすぐに実行できます。",
  },
] as const;

export const LP_PRICING_PLANS = [
  {
    name: "スターター",
    description: "小規模事業者向け",
    featured: false,
    monthlyPrice: "¥9,800",
    annualPrice: "¥8,167",
    annualNote: "年払い ¥98,000（2ヶ月分お得）",
    setupFee: "¥0",
    includedCalls: "300件/月",
    overagePrice: "¥50/件",
    phoneNumbers: "1番号",
    extraNumberPrice: "¥880/番号",
    concurrentCalls: "同時5通話",
    features: [
      "シナリオ 3本まで",
      "ノーコードシナリオ編集",
      "通話ログ・文字起こし",
      "メールサポート",
    ],
    cta: "相談する",
  },
  {
    name: "スタンダード",
    description: "中規模物流会社向け",
    featured: true,
    monthlyPrice: "¥29,800",
    annualPrice: "¥24,833",
    annualNote: "年払い ¥298,000（2ヶ月分お得）",
    setupFee: "¥0",
    includedCalls: "1,000件/月",
    overagePrice: "¥35/件",
    phoneNumbers: "3番号まで",
    extraNumberPrice: "¥880/番号",
    concurrentCalls: "同時20通話",
    features: [
      "シナリオ無制限",
      "ダッシュボード KPI",
      "通話要約・SMS送信",
      "優先メールサポート",
    ],
    cta: "相談する",
  },
  {
    name: "エンタープライズ",
    description: "大規模・カスタム要件",
    featured: false,
    monthlyPrice: "¥98,000〜",
    annualPrice: null,
    annualNote: "年間契約・個別見積もり",
    setupFee: "要相談",
    includedCalls: "5,000件/月",
    overagePrice: "¥25/件",
    phoneNumbers: "10番号〜",
    extraNumberPrice: "¥880/番号",
    concurrentCalls: "同時50通話",
    features: [
      "TMS/WMS API連携",
      "SSO・監査ログ",
      "導入支援・SLA保証",
      "専任サポート",
    ],
    cta: "お問い合わせ",
  },
] as const;

export const LP_PRICING_NOTES = [
  "表示価格はすべて税抜です。",
  "電話番号の追加は ¥880/番号（税抜）/月。",
  "SMS送信は ¥10/通（税抜、スタンダード以上）。",
] as const;

export const LP_FAQ_ITEMS = [
  {
    question: "AIの音声は自然ですか？",
    answer:
      "Google の最新音声合成技術を使用しており、自然な日本語で対話します。機械的な読み上げではなく、会話として違和感のないレベルです。",
  },
  {
    question: "既存の電話番号をそのまま使えますか？",
    answer:
      "はい。既存番号からの転送設定で利用可能です。新規番号の取得も管理画面からすぐに行えます。",
  },
  {
    question: "シナリオの作成に専門知識は必要ですか？",
    answer:
      "不要です。ドラッグ＆ドロップのフローエディタで、IT担当者がいなくても作成・編集できます。テンプレートも用意しています。",
  },
  {
    question: "AIが対応できない電話はどうなりますか？",
    answer:
      "シナリオ内の条件に応じて、有人オペレーターに自動転送されます。転送時には通話内容のテキストが引き継がれるため、スムーズに対応を継続できます。",
  },
  {
    question: "導入にどのくらい時間がかかりますか？",
    answer:
      "最短で当日から利用開始可能です。電話番号の取得とシナリオ設定を含め、標準的には1〜3営業日で稼働できます。",
  },
  {
    question: "試験導入は可能ですか？",
    answer:
      "はい。お問い合わせフォームから「試験導入の相談」をお選びください。担当から詳細をご案内します。",
  },
] as const;

export const LP_CONTACT_ASSURANCES = [
  "3 営業日以内にご連絡します",
  "しつこい営業はしません",
  "試験導入のご相談も歓迎します",
] as const;

export const LP_INQUIRY_TYPES = [
  "資料請求",
  "お問い合わせ",
  "試験導入の相談",
] as const;

export const LP_CALL_VOLUME_OPTIONS = [
  "〜100件",
  "100〜500件",
  "500〜1,000件",
  "1,000件以上",
] as const;
