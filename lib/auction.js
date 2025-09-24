// 逆オークションの簡易ロジック（フロントのみ・永続化なし）
// 現在価格は「開始価格から時間経過で毎分ドロップ、下限価格で止まる」

const AUCTION_START_ISO = "2025-09-01T00:00:00.000Z"; // 固定の開始時刻（見やすさ重視）
const AUCTION_START_MS = new Date(AUCTION_START_ISO).getTime();

export const items = [
  {
    id: "1",
    title: "北海道産じゃがいも 10kg",
    description: "ホクホク食感。家庭用に最適。",
    startPrice: 2800,
    floorPrice: 1400,
    dropPerMinute: 20,
    image: "https://via.placeholder.com/800x450.png?text=Potato"
  },
  {
    id: "2",
    title: "北海道産玉ねぎ 10kg",
    description: "甘み強め。保存もしやすい。",
    startPrice: 3200,
    floorPrice: 1600,
    dropPerMinute: 25,
    image: "https://via.placeholder.com/800x450.png?text=Onion"
  },
  {
    id: "3",
    title: "とうきび（とうもろこし）20本",
    description: "朝採れ相当の鮮度を想定したMVP表示。",
    startPrice: 3600,
    floorPrice: 1800,
    dropPerMinute: 30,
    image: "https://via.placeholder.com/800x450.png?text=Corn"
  }
];

export function getItems() {
  return items;
}

export function getItem(id) {
  return items.find((i) => i.id === String(id)) || null;
}

export function getCurrentPrice(item, nowMs = Date.now()) {
  const elapsedMinutes = Math.floor((nowMs - AUCTION_START_MS) / (60 * 1000));
  const drop = Math.max(0, elapsedMinutes) * item.dropPerMinute;
  const price = Math.max(item.floorPrice, item.startPrice - drop);
  return price;
}

export function isValidBid(amount, item, nowMs = Date.now()) {
  const current = getCurrentPrice(item, nowMs);
  // 逆オークションの基本条件：現在価格以下、ただし下限以上
  return amount >= item.floorPrice && amount <= current;
}

