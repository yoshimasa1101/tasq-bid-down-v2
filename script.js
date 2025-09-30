// LocalStorage キー
const STORAGE_KEY = "tasq_reverse_auction_requests_v1";

// DOM 参照
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const sortSelect = document.getElementById("sort-select");
const requestForm = document.getElementById("request-form");
const requestList = document.getElementById("request-list");
const statusText = document.getElementById("status-text");
const exportBtn = document.getElementById("export-json");
const importBtn = document.getElementById("import-json");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalImport = document.getElementById("modal-import");
const importText = document.getElementById("import-text");

// データロード
let requests = loadRequests();

// 初期カテゴリ抽出
refreshCategoryOptions(requests);

// 初期描画
render();

// イベント
searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
sortSelect.addEventListener("change", render);

requestForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = val("#req-title");
  const category = val("#req-category");
  const desc = val("#req-desc");
  const budget = Number(val("#req-budget"));
  const deadline = val("#req-deadline");
  const imageUrl = val("#req-image");
  if (!title || !category || !desc || Number.isNaN(budget) || !deadline) return;

  const req = {
    id: Date.now(),
    title, category, desc,
    budget,
    deadline,               // yyyy-mm-dd
    imageUrl: imageUrl || "",
    status: computeStatus(deadline),
    createdAt: new Date().toISOString(),
    responses: []
  };
  requests.unshift(req); // 新着を前に
  saveRequests(requests);
  refreshCategoryOptions(requests);
  requestForm.reset();
  render();
});

// JSON書き出し
exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(requests, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reverse-auction-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// JSON読み込み（モーダル）
importBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
});
modalClose.addEventListener("click", () => {
  modal.classList.add("hidden");
  importText.value = "";
});
modalImport.addEventListener("click", () => {
  try {
    const data = JSON.parse(importText.value.trim());
    if (!Array.isArray(data)) throw new Error("配列形式のJSONが必要です");
    // 最低項目のチェック
    requests = data.map(normalizeRequestFromJson).filter(Boolean);
    saveRequests(requests);
    refreshCategoryOptions(requests);
    render();
    modal.classList.add("hidden");
    importText.value = "";
  } catch (e) {
    alert("JSONの読み込みに失敗しました: " + e.message);
  }
});

// ユーティリティ
function val(sel){ return document.querySelector(sel).value.trim(); }
function saveRequests(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
function loadRequests(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  }catch{}
  return []; // 初回は空。必要なら data.sample.json をインポート
}

function refreshCategoryOptions(arr){
  const set = new Set(arr.map(r => r.category));
  categoryFilter.innerHTML = `<option value="all">すべて</option>`;
  Array.from(set).sort().forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    categoryFilter.appendChild(opt);
  });
}

function computeStatus(deadline){
  const today = new Date().toISOString().slice(0,10);
  if (deadline < today) return "締切";
  return "募集中";
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

// JSON整形（読み込み用）
function normalizeRequestFromJson(r){
  try{
    const id = r.id ?? Date.now()+Math.random();
    const title = String(r.title||"").trim();
    const category = String(r.category||"").trim();
    const desc = String(r.desc||"").trim();
    const budget = Number(r.budget);
    const deadline = String(r.deadline||"").slice(0,10);
    const imageUrl = String(r.imageUrl||"").trim();
    const status = computeStatus(deadline);
    const createdAt = r.createdAt || new Date().toISOString();
    const responses = Array.isArray(r.responses) ? r.responses.map(normalizeResponseFromJson).filter(Boolean) : [];
    if (!title || !category || !desc || Number.isNaN(budget) || !deadline) return null;
    return { id, title, category, desc, budget, deadline, imageUrl, status, createdAt, responses };
  }catch{ return null; }
}
function normalizeResponseFromJson(x){
  try{
    const price = Number(x.price);
    const comment = String(x.comment||"").trim();
    const eta = String(x.eta||"").trim(); // 納期
    const imageUrl = String(x.imageUrl||"").trim();
    const createdAt = x.createdAt || new Date().toISOString();
    if (Number.isNaN(price) || !comment) return null;
    return { price, comment, eta, imageUrl, createdAt };
  }catch{ return null; }
}

// レンダリング
function render(){
  const q = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const sort = sortSelect.value;

  let arr = [...requests];

  // フィルタ
  if (cat !== "all") arr = arr.filter(r => r.category === cat);
  if (q){
    arr = arr.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }

  // 並び替え
  if (sort === "newest"){
    arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }else if (sort === "lowest"){
    arr.sort((a,b) => a.budget - b.budget);
  }else if (sort === "deadline"){
    arr.sort((a,b) => a.deadline.localeCompare(b.deadline));
  }

  // ステータス表示
  statusText.textContent = `表示件数：${arr.length}件（検索: "${q||"-"}", カテゴリ: ${cat}）`;

  // リスト描画
  requestList.innerHTML = "";
  if (!arr.length){
    requestList.innerHTML = `<div class="card"><div class="card-content">該当するリクエストがありません。</div></div>`;
    return;
  }

  arr.forEach(r => {
    const card = document.createElement("div");
    card.className = "card";

    const thumb = r.imageUrl ? `<img class="card-thumb" src="${escapeHtml(r.imageUrl)}" alt="">` : `<div class="card-thumb"></div>`;
    const badgeStatus = `<span class="badge">${escapeHtml(r.status)}</span>`;
    const badgeCat = `<span class="badge">${escapeHtml(r.category)}</span>`;
    const price = `<div class="price">希望価格：¥${Number(r.budget).toLocaleString()}</div>`;
    const meta = `<div class="card-meta">期限：${escapeHtml(r.deadline)} ／ 投稿: ${new Date(r.createdAt).toLocaleString()}</div>`;

    card.innerHTML = `
      <div class="card-header">
        ${thumb}
        <div class="card-content">
          <h3 class="card-title">${escapeHtml(r.title)}</h3>
          <div>${badgeStatus}${badgeCat}</div>
          ${price}
          ${meta}
        </div>
      </div>
      <p class="card-desc">${escapeHtml(r.desc)}</p>
      <div class="response-list" id="responses-${r.id}">
        ${renderResponses(r.responses)}
      </div>
      ${renderResponseForm(r.id, r.status)}
    `;

    requestList.appendChild(card);

    // 応答フォームイベント
    const form = card.querySelector(`form[data-id="${r.id}"]`);
    if (form){
      form.addEventListener("submit", e => {
        e.preventDefault();
        const price = Number(form.querySelector('input[name="price"]').value.trim());
        const eta = form.querySelector('input[name="eta"]').value.trim();
        const imageUrl = form.querySelector('input[name="imageUrl"]').value.trim();
        const comment = form.querySelector('textarea[name="comment"]').value.trim();
        if (Number.isNaN(price) || !comment){
          alert("価格とコメントは必須です");
          return;
        }
        const target = requests.find(x => x.id === r.id);
        target.responses.unshift({
          price, comment, eta, imageUrl, createdAt: new Date().toISOString()
        });
        saveRequests(requests);
        render();
      });
    }
  });
}

function renderResponses(responses){
  if (!responses?.length) return `<div class="response-card response-meta">まだ条件提示はありません。</div>`;
  return responses.map(res => `
    <div class="response-card">
      <div><strong>提示価格：</strong>¥${Number(res.price).toLocaleString()}</div>
      ${res.eta ? `<div class="response-meta">納期：${escapeHtml(res.eta)}</div>` : ""}
      ${res.imageUrl ? `<div class="response-meta">画像：<a href="${escapeHtml(res.imageUrl)}" target="_blank" rel="noopener">リンク</a></div>` : ""}
      <div class="response-meta">提示日時：${new Date(res.createdAt).toLocaleString()}</div>
      <div class="response-comment">${escapeHtml(res.comment)}</div>
    </div>
  `).join("");
}

function renderResponseForm(id, status){
  if (status === "締切"){
    return `<div class="response-meta">このリクエストは締切です。条件提示はできません。</div>`;
  }
  return `
    <form class="response-form" data-id="${id}">
      <input type="number" name="price" placeholder="提示価格（円）" required>
      <input type="text" name="eta" placeholder="納期（例：3日、10/15まで）">
      <input type="url" name="imageUrl" placeholder="画像URL（任意）">
      <textarea name="comment" placeholder="条件や補足コメント" required></textarea>
      <div class="response-actions">
        <button type="submit" class="btn btn-primary">条件を提示</button>
      </div>
    </form>
  `;
}
