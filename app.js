// Supabase接続設定
const SUPABASE_URL = "https://xxxx.supabase.co"; // ←自分のURL
const SUPABASE_KEY = "public-anon-key";          // ←自分のanon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// オークション一覧
async function renderAuctions() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>オークション一覧</h2>
    <form id="auctionForm">
      <input type="text" id="title" placeholder="商品名" required>
      <input type="number" id="price" placeholder="開始価格" required>
      <input type="text" id="time" placeholder="残り時間 (例: 2日)" required>
      <button type="submit">出品する</button>
    </form>
    <div id="auctionList"></div>
  `;

  document.getElementById("auctionForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value;
    const price = parseInt(document.getElementById("price").value);
    const time = document.getElementById("time").value;
    await supabase.from("auctions").insert([{ title, price, time }]);
    renderAuctions();
  });

  let { data: auctions, error } = await supabase.from("auctions").select("*");
  const list = document.getElementById("auctionList");
  if (error) {
    list.innerHTML = `<p>エラー: ${error.message}</p>`;
    return;
  }
  auctions.forEach(a => {
    list.innerHTML += `
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
  const newPrice = currentPrice + 1000;
  await supabase.from("auctions").update({ price: newPrice }).eq("id", id);
  renderAuctions();
}

// リクエスト一覧
async function renderRequests() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>リクエスト一覧</h2>
    <form id="requestForm">
      <input type="text" id="want" placeholder="欲しい商品" required>
      <input type="number" id="reqPrice" placeholder="希望価格" required>
      <button type="submit">リクエスト投稿</button>
    </form>
    <div id="requestList"></div>
  `;

  document.getElementById("requestForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const want = document.getElementById("want").value;
    const price = parseInt(document.getElementById("reqPrice").value);
    await supabase.from("requests").insert([{ want, price }]);
    renderRequests();
  });

  let { data: requests, error } = await supabase.from("requests").select("*");
  const list = document.getElementById("requestList");
  if (error) {
    list.innerHTML = `<p>エラー: ${error.message}</p>`;
    return;
  }
  requests.forEach(r => {
    list.innerHTML += `
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
    <p>出品中・入札中・リクエスト履歴は今後拡張予定</p>
  `;
}

// タブ切替
document.getElementById("tab-auction").addEventListener("click", renderAuctions);
document.getElementById("tab-request").addEventListener("click", renderRequests);
document.getElementById("tab-mypage").addEventListener("click", renderMyPage);

// 初期表示
renderAuctions();
