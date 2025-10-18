import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { topic = "default" } = req.query;

  const bank: Record<string, string[]> = {
    default: [
      "本MVPの目的は？",
      "初期導入での最大の障壁は？",
      "成功条件は何か？"
    ],
    pricing: [
      "価格戦略の仮説は？",
      "手数料モデルのA/B案は？",
      "最適な単価の算出方法は？"
    ],
    workflow: [
      "入札開始から決定までの理想フローは？",
      "通知タイミングの最適化は？",
      "KPI計測のイベント設計は？"
    ]
  };

  const key = String(topic).toLowerCase();
  const data = bank[key] ?? bank.default;

  res.status(200).json(data);
}
