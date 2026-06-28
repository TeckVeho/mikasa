import { prisma } from "../lib/prisma.js";

export type PronunciationEntry = {
  word: string;
  reading: string;
  category?: string;
};

/** 全テナント共通の誤読防止エントリ（電話対応で多発する語） */
const BUILT_IN_ENTRIES: PronunciationEntry[] = [
  // 敬語・定型表現
  { word: "承りました", reading: "うけたまわりました", category: "keigo" },
  { word: "承知しました", reading: "しょうちしました", category: "keigo" },
  { word: "仰る", reading: "おっしゃる", category: "keigo" },
  { word: "畏まりました", reading: "かしこまりました", category: "keigo" },
  { word: "何卒", reading: "なにとぞ", category: "keigo" },
  { word: "概ね", reading: "おおむね", category: "keigo" },
  { word: "折り返し", reading: "おりかえし", category: "keigo" },
  { word: "伺います", reading: "うかがいます", category: "keigo" },
  { word: "恐れ入ります", reading: "おそれはいります", category: "keigo" },
  { word: "宜しく", reading: "よろしく", category: "keigo" },
  { word: "致します", reading: "いたします", category: "keigo" },
  { word: "例えば", reading: "たとえば", category: "keigo" },
  { word: "申し伝えます", reading: "もうしつたえます", category: "keigo" },
  { word: "差し支え", reading: "さしつかえ", category: "keigo" },
  // 物流
  { word: "集荷", reading: "しゅうか", category: "logistics" },
  { word: "出荷", reading: "しゅっか", category: "logistics" },
  { word: "着払い", reading: "ちゃくばらい", category: "logistics" },
  { word: "元払い", reading: "もとばらい", category: "logistics" },
  { word: "送り状", reading: "おくりじょう", category: "logistics" },
  { word: "翌営業日", reading: "よくえいぎょうび", category: "logistics" },
  { word: "御中", reading: "おんちゅう", category: "logistics" },
  { word: "破損", reading: "はそん", category: "logistics" },
  { word: "紛失", reading: "ふんしつ", category: "logistics" },
  // 一般ビジネス
  { word: "所在地", reading: "しょざいち", category: "general" },
  { word: "取締役", reading: "とりしまりやく", category: "general" },
  { word: "設立", reading: "せつりつ", category: "general" },
  { word: "年商", reading: "ねんしょう", category: "general" },
  { word: "定休日", reading: "ていきゅうび", category: "general" },
  { word: "窓口", reading: "まどぐち", category: "general" },
  { word: "改めて", reading: "あらためて", category: "general" },
  { word: "速やかに", reading: "すみやかに", category: "general" },
  // 整備・車両
  { word: "車検", reading: "しゃけん", category: "vehicle" },
  { word: "点検", reading: "てんけん", category: "vehicle" },
  { word: "板金", reading: "ばんきん", category: "vehicle" },
  { word: "架装", reading: "かそう", category: "vehicle" },
  // IT・DX
  { word: "概念実証", reading: "がいねんじっしょう", category: "it" },
  { word: "知見", reading: "ちけん", category: "it" },
  { word: "伴走", reading: "ばんそう", category: "it" },
  { word: "定着", reading: "ていちゃく", category: "it" },
];

function mergeEntries(
  builtIn: PronunciationEntry[],
  tenant: PronunciationEntry[],
): PronunciationEntry[] {
  const byWord = new Map<string, PronunciationEntry>();
  for (const entry of builtIn) {
    byWord.set(entry.word, entry);
  }
  for (const entry of tenant) {
    byWord.set(entry.word, entry);
  }
  return [...byWord.values()];
}

export function getBuiltInPronunciationEntries(): PronunciationEntry[] {
  return [...BUILT_IN_ENTRIES];
}

export async function getPronunciationDictionary(
  tenantId: string,
): Promise<PronunciationEntry[]> {
  const tenantRows = await prisma.speechDictionary.findMany({
    where: { tenantId },
    select: { word: true, reading: true, category: true },
    orderBy: { createdAt: "asc" },
  });

  return mergeEntries(BUILT_IN_ENTRIES, tenantRows);
}
