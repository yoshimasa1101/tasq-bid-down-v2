// ===== Supabase client =====
// 必ず差し替え：自分のプロジェクトのURLとanon key
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"; // ←置き換え
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";               // ←置き換え

// CDN読み込み時は global の supabase を使用
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== UI helpers =====
const content = document.getElementById("content");
const tabs = {
  auction: document.getElementById("tab-auction"),
  request: document.getElementById("tab-request"),
  mypage: document.getElementById("tab-mypage"),
};

function yen(n) {
  try { return `¥${Number(n).toLocaleString("ja-JP")}`; } catch { return `¥${n}`; }
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}
function setActive(tabBtn) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  tabBtn.classList.add("active");
}

// ===== Auctions =====
async function renderAuctions() {
  setActive(tabs.auction);
  content.innerHTML = `
    <div class="card">
      <h3>出品フォーム</h3>
      <form id="auctionForm">
        <div class="input-row">
          <input id="a_title" type="text" placeholder="商品名" required />
          <input id="a_price" type="number" min="0" step="100" placeholder="開始価格" required />
          <input id="a_time" type="text" placeholder="残り時間（例: 2日）" required />
        </div>
        <button type="submit">出品する</button>
      </form>
    </div>
    <div id="auctionList"></div>
  `;

  document.getElementById("auctionForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("a_title").value.trim();
    const price = parseInt(document.getElementById("a_price").value, 10);
    const time = document.getElementById("a_time").value.trim();
    if (!title || isNaN(price) || !time) return toast("入力を確認してください");
    const { error } = await sb.from("auctions").insert([{ title, price, time }]);
    if (error) return toast("出品エラー: " + error.message);
    toast("出品しました");
    await loadAuctions();
  });

  await loadAuctions();

  // Realtime updates（Postgres changes）
  sb.channel("auctions-ch")
    .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, loadAuctions)
    .subscribe();
}

async function loadAuctions() {
  const list = document.getElementById("auctionList");
  list.innerHTML = `<div class="card"><p>読み込み中...</p></div>`;
  const { data, error } = await sb.from("auctions").select("*").order("id", { ascending: false });
  if (error) {
    list.innerHTML = `<div class="card"><p>エラー: ${error.message}</p></div>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = `<div class="card"><p>出品はまだありません</p></div>`;
    return;
  }
  list.innerHTML = data.map(a => `
    <div class="card">
      <h3>${a.title}</h3>
      <p>現在価格: ${yen(a.price)}</p>
      <p>${a.time}</p>
      <div class="row">
        <button onclick="bid(${a.id}, ${a.price})">+1,000円 入札</button>
        <button class="secondary" onclick="customBid(${a.id})">金額指定で入札</button>
      </div>
    </div>
  `).join("");
}

async function bid(id, currentPrice) {
  const newPrice = Number(currentPrice) + 1000;
  const { error } = await sb.from("auctions").update({ price: newPrice }).eq("id", id);
  if (error) return toast("入札エラー: " + error.message);
  toast("入札しました");
}

async function customBid(id) {
  const amt = prompt("入札金額を入力してください（整数）");
  if (amt === null) return;
  const price = parseInt(amt, 10);
  if (isNaN(price) || price <= 0) return toast("金額を確認してください");
  const { error } = await sb.from("auctions").update({ price }).eq("id", id);
  if (error) return toast("入札エラー: " + error.message);
  toast("入札しました");
}

// ===== Requests (reverse auction) =====
async function renderRequests() {
  setActive(tabs.request);
  content.innerHTML = `
    <div class="card">
      <h3>リクエスト投稿</h3>
      <form id="requestForm">
        <div class="input-row">
          <input id="r_want" type="text" placeholder="欲しい商品" required />
          <input id="r_price" type="number" min="0" step="100" placeholder="希望価格" required />
        </div>
        <button type="submit">投稿する</button>
      </form>
    </div>
    <div id="requestList"></div>
  `;

  document.getElementById("requestForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const want = document.getElementById("r_want").value.trim();
    const price = parseInt(document.getElementById("r_price").value, 10);
    if (!want || isNaN(price)) return toast("入力を確認してください");
    const { error } = await sb.from("requests").insert([{ want, price }]);
    if (error) return toast("投稿エラー: " + error.message);
    toast("投稿しました");
    await loadRequests();
  });

  await loadRequests();

  // Realtime updates
  sb.channel("requests-ch")
    .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, loadRequests)
    .subscribe();
}

async function loadRequests() {
  const list = document.getElementById("requestList");
  list.innerHTML = `<div class="card"><p>読み込み中...</p></div>`;
  const { data, error } = await sb.from("requests").select("*").order("id", { ascending: false });
  if (error) {
    list.innerHTML = `<div class="card"><p>エラー: ${error.message}</p></div>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = `<div class="card"><p>リクエストはまだありません</p></div>`;
    return;
  }
  list.innerHTML = data.map(r => `
    <div class="card">
      <h3>${r.want}</h3>
      <p>希望価格: ${yen(r.price)}</p>
      <div class="row">
        <button class="secondary" onclick="propose(${r.id})">提案する</button>
      </div>
    </div>
  `).join("");
}

function propose(id) {
  const text = prompt("提案内容を入力してください（例：商品状態・価格など）");
  if (text === null || !text.trim()) return;
  // コメント永続化は後続拡張（commentsテーブル追加）で対応
  toast("提案を送信しました");
}

// ===== My page =====
async function renderMyPage() {
  setActive(tabs.mypage);

  // count は head: true では data返さないため別クエリにするか countを受け取る
  const { count: aCount, error: aErr } = await sb
    .from("auctions")
    .select("*", { count: "exact", head: true });

  const { count: rCount, error: rErr } = await sb
    .from("requests")
    .select("*", { count: "exact", head: true });

  content.innerHTML = `
    <div class="card">
      <h3>マイページ（概要）</h3>
      <p>出品数: ${aErr ? "-" : (aCount ?? 0)} 件</p>
      <p>リクエスト数: ${rErr ? "-" : (rCount ?? 0)} 件</p>
      <p class="muted">認証・履歴は後続で拡張予定</p>
    </div>
  `;
}

// ===== Tab events & initial render =====
tabs.auction.addEventListener("click", renderAuctions);
tabs.request.addEventListener("click", renderRequests);
tabs.mypage.addEventListener("click", renderMyPage);

renderAuctions();

// Expose for inline handlers
window.bid = bid;
window.customBid = customBid;
window.propose = propose;
