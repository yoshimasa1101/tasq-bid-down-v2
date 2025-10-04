const SUPABASE_URL = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const content = document.getElementById("content");
const toast = document.getElementById("toast");

document.getElementById("tab-auction").addEventListener("click", () => renderAuctions());
document.getElementById("tab-request").addEventListener("click", () => renderRequests());
document.getElementById("tab-mypage").addEventListener("click", () => renderMyPage());

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// オークション一覧
async function renderAuctions() {
  const { data, error } = await supabase.from("auctions").select("*").order("inserted_at", { ascending: false });
  if (error) { console.error(error); showToast("取得エラー"); return; }

  content.innerHTML = `
    <h2>オークション一覧</h2>
    <button id="add-auction">＋ 出品する</button>
    <ul>
      ${data.map(item => `
        <li>${item.title} - ¥${item.price}
          <button onclick="bidAuction(${item.id}, ${item.price})">入札</button>
        </li>`).join("")}
    </ul>
  `;
  document.getElementById("add-auction").addEventListener("click", () => {
    const title = prompt("商品名を入力");
    const price = parseInt(prompt("開始価格を入力"), 10);
    if (title && price) addAuction(title, price);
  });
}
async function addAuction(title, price) {
  const { error } = await supabase.from("auctions").insert([{ title, price }]);
  if (error) { console.error(error); showToast("出品エラー"); }
  else { showToast("出品しました"); renderAuctions(); }
}
async function bidAuction(id, currentPrice) {
  const { error } = await supabase.from("auctions").update({ price: currentPrice + 1000 }).eq("id", id);
  if (error) { console.error(error); showToast("入札エラー"); }
  else { showToast("入札しました"); renderAuctions(); }
}

// リクエスト一覧
async function renderRequests() {
  const { data, error } = await supabase.from("requests").select("*").order("inserted_at", { ascending: false });
  if (error) { console.error(error); showToast("取得エラー"); return; }

  content.innerHTML = `
    <h2>リクエスト一覧</h2>
    <button id="add-request">＋ リクエストする</button>
    <ul>
      ${data.map(item => `<li>${item.want} - 希望価格 ¥${item.price}</li>`).join("")}
    </ul>
  `;
  document.getElementById("add-request").addEventListener("click", () => {
    const want = prompt("欲しい商品を入力");
    const price = parseInt(prompt("希望価格を入力"), 10);
    if (want && price) addRequest(want, price);
  });
}
async function addRequest(want, price) {
  const { error } = await supabase.from("requests").insert([{ want, price }]);
  if (error) { console.error(error); showToast("追加エラー"); }
  else { showToast("リクエスト追加"); renderRequests(); }
}

// マイページ
async function renderMyPage() {
  const { count: auctionCount } = await supabase.from("auctions").select("*", { count: "exact", head: true });
  const { count: requestCount } = await supabase.from("requests").select("*", { count: "exact", head: true });
  content.innerHTML = `<h2>マイページ</h2><p>出品数: ${auctionCount}</p><p>リクエスト数: ${requestCount}</p>`;
}

// 初期表示
renderAuctions();
