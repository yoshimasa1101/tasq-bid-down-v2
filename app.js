// ダミーデータ（後でSupabase連携に置き換え）
const auctions = [
  { id: 1, title: "ノートPC", price: 20000, time: "残り2日" },
  { id: 2, title: "ギター", price: 15000, time: "残り5時間" }
];

const requests = [
  { id: 1, want: "iPhone 13", price: 40000 },
  { id: 2, want: "自転車", price: 10000 }
];

function renderAuctions() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>オークション一覧</h2>";
  auctions.forEach(a => {
    content.innerHTML += `
      <div class="card">
        <h3>${a.title}</h3>
        <p>現在価格: ¥${a.price}</p>
        <p>${a.time}</p>
        <button>入札する</button>
      </div>`;
  });
}

function renderRequests() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>リクエスト一覧</h2>";
  requests.forEach(r => {
    content.innerHTML += `
      <div class="card">
        <h3>${r.want}</h3>
        <p>希望価格: ¥${r.price}</p>
        <button>提案する</button>
      </div>`;
  });
}

function renderMyPage() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>マイページ</h2>
    <p>出品中: 0件</p>
    <p>入札中: 0件</p>
    <p>リクエスト中: 0件</p>
  `;
}

// タブ切替
document.getElementById("tab-auction").addEventListener("click", renderAuctions);
document.getElementById("tab-request").addEventListener("click", renderRequests);
document.getElementById("tab-mypage").addEventListener("click", renderMyPage);

// 初期表示
renderAuctions();

