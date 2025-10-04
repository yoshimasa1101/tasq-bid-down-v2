// Supabase接続設定
const SUPABASE_URL = "https://xxxx.supabase.co"; // ←自分のURL
const SUPABASE_KEY = "public-anon-key";          // ←自分のanon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// オークション一覧取得
async function renderAuctions() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>オークション一覧</h2>";

  let { data: auctions, error } = await supabase.from("auctions").select("*");
  if (error) {
    content.innerHTML += `<p>エラー: ${error.message}</p>`;
    return;
  }

  auctions.forEach(a => {
    content.innerHTML += `
      <div class="card">
        <h3>${a.title}</h3>
        <p>現在価格: ¥${a.price}</p>
        <p>${a.time}</p>
        <button onclick="bid(${a.id}, ${a.price})">入札する</button>
      </div>`;
  });
}

// 入札処理
async function bid(id, currentPrice) {
  const newPrice = currentPrice + 1000; // 仮：+1000円
  const { error } = await supabase
    .from("auctions")
    .update({ price: newPrice })
    .eq("id", id);

  if (!error) renderAuctions();
}

// リクエスト一覧取得
async function renderRequests() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>リクエスト一覧</h2>";

  let { data: requests, error } = await supabase.from("requests").select("*");
  if (error) {
    content.innerHTML += `<p>エラー: ${error.message}</p>`;
    return;
  }

  requests.forEach(r => {
    content.innerHTML += `
      <div class="card">
        <h3>${r.want}</h3>
        <p>希望価格: ¥${r.price}</p>
        <button>提案する</button>
      </div>`;
  });
}

// マイページ
function renderMyPage() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>マイページ</h2>
    <p>出品中: coming soon</p>
    <p>入札中: coming soon</p>
    <p>リクエスト中: coming soon</p>
  `;
}

// タブ切替
document.getElementById("tab-auction").addEventListener("click", renderAuctions);
document.getElementById("tab-request").addEventListener("click", renderRequests);
document.getElementById("tab-mypage").addEventListener("click", renderMyPage);

// 初期表示
renderAuctions();
