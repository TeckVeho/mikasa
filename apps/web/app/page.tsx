import type { Metadata } from "next";
import { LandingPage } from "@/components/lp/LandingPage";

export const metadata: Metadata = {
  title: "LogiVoice | 物流向け電話自動対応 AI",
  description:
    "再配達受付・配送確認・集荷依頼をAIが24時間自動対応。ノーコードでシナリオを構築し、通話データを可視化する物流向け電話自動対応 SaaS。",
};

export default function HomePage() {
  return <LandingPage />;
}
