// LocalStorage キー
const STORAGE_KEY = "tasq_reverse_auction_requests_v3";
const WATCH_KEY = "tasq_reverse_auction_watch_v1";

// DOM
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const serviceFilter = document.getElementById("service-filter");
const sortSelect = document.getElementById("sort-select");
const pageSizeSel = document.getElementById("page-size");

const requestForm = document.getElementById("request-form");
const formError = document.getElementById("form-error");

const statusText = document.getElementById("status-text");
const requestList = document.getElementById("request-list");

const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");

const exportBtn = document.getElementById("export-json");
const importBtn = document.getElementById("import-json");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalImport = document.getElementById("modal-import");
const importText = document.getElementById("import-text");
const importError = document.getElementById("import-error");

// 状態
let requests = loadRequestsSafely();
let watchSet = loadWatchSafely();
let page = 1;
let tickTimer = null;

// 初期設定
refreshCategoryOptions(requests);
render();
startTick();

// イベント
searchInput.addEventListener("input", () => { page = 1; render(); });
categoryFilter.addEventListener("change", () => { page = 1; render(); });
serviceFilter.addEventListener("change", () => { page = 1; render(); });
sortSelect.addEventListener("change", () => { page = 1; render(); });
pageSizeSel.addEventListener("change", () => { page = 1; render(); });

prevPageBtn.addEventListener("click", () => { if (page > 1) { page--; render(); }});
nextPageBtn.addEventListener("click", () => { page++; render(); });

requestForm.addEventListener("submit", e => {
  e.preventDefault();
  formError.textContent = "";

  const title = val("#req-title");
  const category = val("#req-category");
  const service = val("#req-service");
  const location = val("#req-location");
  const desc = val("#req-desc");
  const budget = Number(val("#req-budget"));
  const deadlineRaw = val("#req-deadline"); // YYYY-MM-DD または YYYY/MM/DD
  const imageUrl = val("#req-image");
  const notes = val("#req-notes");

  const errors = [];
  if (!title) errors.push("商品名は必須です");
  if (!category) errors.push("カテゴリは必須です");
  if (!service) errors.push("サービスの種類は必須です");
  if (!location) errors.push("取引場所は必須です");
  if (!desc) errors.push("詳細条件は必須です");
  if (Number.isNaN(budget) || budget < 0) errors.push("希望金額は0以上の数値を入力してください");

  const deadline = normalizeDate(deadlineRaw); // YYYY-MM-DD に正規化
  if (!deadline) errors.push("期限は YYYY-MM-DD または YYYY/MM/DD 形式で入力してください");

  if (errors.length){
    formError.textContent = errors.join("／");
    return;
  }

  const req = {
    id: Date.now(),
    title, category, service, location, desc,
    budget,
    deadline,
    imageUrl: imageUrl || "",
    notes: notes || "",
    status: computeStatus(deadline),
    createdAt: new Date().toISOString(),
    responses: []
  };

  requests.unshift(req);
  saveSafely(requests);
  refreshCategoryOptions(requests);
  requestForm.reset();
  page = 1;
  render();
});

// JSON書き出し
exportBtn.addEventListener("click", () => {
  try{
    const blob = new Blob([JSON.stringify(requests, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reverse-auction-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    alert("JSON書き出しに失敗しました: " + e.message);
  }
});

// JSON読み込み（モーダル）
importBtn.addEventListener("click", () => {
  importError.textContent = "";
  importText.value = "";
  modal.classList.remove("hidden");
});
modalClose.addEventListener("click", () => {
  modal.classList.add("hidden");
  importText.value = "";
  importError.textContent = "";
});
modalImport.addEventListener("click", () => {
  try {
    importError.textContent = "";
    const text = importText.value.trim();
    if (!text) throw new Error("JSONテキストを入力してください");
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("配列形式のJSONが必要です");
    requests = data.map(normalizeRequestFromJson).filter(Boolean);
    saveSafely(requests);
    refreshCategoryOptions(requests);
    page = 1;
    render();
    modal.classList.add("hidden");
    importText.value = "";
  } catch (e) {
    importError.textContent = "JSON読み込みエラー: " + e.message;
  }
});

// レンダリング
function render(){
  const q = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const service = serviceFilter.value;
  const sort = sortSelect.value;
  const pageSize = Number(pageSizeSel.value);

  let arr = [...requests];

  // フィルタ
  if (cat !== "all") arr = arr.filter(r => r.category === cat);
  if (service !== "all") arr = arr.filter(r => r.service === service);
  if (q){
    arr = arr.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      (r.location || "").toLowerCase().includes(q)
    );
  }

  // 並び替え
  if (sort === "newest"){
    arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }else if (sort === "lowest"){
    arr.sort((a,b) => a.budget - b.budget);
  }else if (sort === "deadline"){
    arr.sort((a,b) => a.deadline.localeCompare(b.deadline));
  }else if (sort === "bestOffer"){
    arr.sort((a,b) => (lowestPrice(a.responses) ?? Infinity) - (lowestPrice(b.responses) ?? Infinity));
  }

  // ステータス表示
  statusText.textContent = `表示件数：${arr.length}件（検索: "${q||"-"}", カテゴリ: ${cat}, 種類: ${service}, 並び替え: ${sort}）`;

  // ページング
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = arr.slice(start, end);

  pageInfo.textContent = `ページ ${page} / ${totalPages}`;
  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= totalPages;

  // リスト描画
  requestList.innerHTML = "";
  if (!pageItems.length){
    requestList.innerHTML = `<div class="card"><div class="card-content">該当するリクエストがありません。</div></div>`;
    return;
  }

  pageItems.forEach(r => {
    const card = document.createElement("div");
    card.className = "card";

    const thumb = r.imageUrl ? `<img class="card-thumb" src="${escapeHtml(r.imageUrl)}" alt="">` : `<div class="card-thumb" aria-hidden="true"></div>`;
    const badgeStatus = `<span class="badge">${escapeHtml(r.status)}</span>`;
    const badgeCat = `<span class="badge">${escapeHtml(r.category)}</span>`;
    const badgeService = `<span class="badge">${escapeHtml(r.service)}</span>`;
    const price = `<div class="price">希望金額：¥${Number(r.budget).toLocaleString()}</div>`;
    const loc = `<div class="card-meta">場所：${escapeHtml(r.location || "未指定")}</div>`;
    const meta = `<div class="card-meta">期限：${escapeHtml(r.deadline)} ／ 投稿: ${new Date(r.createdAt).toLocaleString()}</div>`;
    const best = lowestPrice(r.responses);
    const bestMeta = (best !== null) ? `<div class="card-meta">最良オファー：¥${best.toLocaleString()}</div>` : `<div class="card-meta">最良オファー：未提示</div>`;
    const countdown = `<div class="counter" data-deadline="${escapeHtml(r.deadline)}"></div>`;

    const watchActive = watchSet.has(r.id) ? "active" : "";
    const watchLabel = watchSet.has(r.id) ? "ウォッチ中" : "ウォッチ";

    card.innerHTML = `
      <div class="card-header">
        ${thumb}
        <div class="card-content">
          <h3 class="card-title">${escapeHtml(r.title)}</h3>
          <div>${badgeStatus}${badgeCat}${badgeService}</div>
          ${price}
          ${bestMeta}
          ${loc}
          ${meta}
          ${countdown}
          <div class="actions-row">
            <button class="btn watch-btn ${watchActive}" data-id="${r.id}">${watchLabel}</button>
          </div>
        </div>
      </div>
      <p class="card-desc">${escapeHtml(r.desc)}</p>
      ${r.notes ? `<div class="card-meta">備考：${escapeHtml(r.notes)}</div>` : ""}
      <div class="response-list" id="responses-${r.id}">
        ${renderResponses(r.responses)}
      </div>
      ${renderResponseForm(r.id, r.status)}
    `;

    requestList.appendChild(card);

    // ウォッチイベント
    const watchBtn = card.querySelector(".watch-btn");
    watchBtn.addEventListener("click", () => {
      const id = r.id;
      if (watchSet.has(id)) watchSet.delete(id);
      else watchSet.add(id);
      saveWatchSafely(watchSet);
      render();
    });

    // 応答フォームイベント
    const form = card.querySelector(`form[data-id="${r.id}"]`);
    if (form){
      form.addEventListener("submit", e => {
        e.preventDefault();
        const price = Number(form.querySelector('input[name="price"]').value.trim());
        const eta = form.querySelector('input[name="eta"]').value.trim();
        const imageUrl = form.querySelector('input[name="imageUrl"]').value.trim();
        const comment = form.querySelector('textarea[name="comment"]').value.trim();

        const errs = [];
        if (Number.isNaN(price) || price < 0) errs.push("提示価格は0以上の数値を入力してください");
        if (!comment) errs.push("コメントは必須です");
        if (errs.length){ alert(errs.join("\n")); return; }

        const target = requests.find(x => x.id === r.id);
        if (!target){ alert("対象リクエストが見つかりません"); return; }

        target.responses.unshift({
          price, comment, eta, imageUrl, createdAt: new Date().toISOString()
        });

        saveSafely(requests);
        render();
      });
    }
  });

  // カウントダウン更新
  updateCountdowns();
}

// カウントダウン
function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(updateCountdowns, 1000);
}
function updateCountdowns(){
  document.querySelectorAll(".counter").forEach(el => {
    const dl = el.getAttribute("data-deadline");
    const txt = formatCountdown(dl);
    el.textContent = txt.text;
    el.classList.toggle("expired", txt.expired);
  });
}
function formatCountdown(deadline){
  const dl = new Date(deadline+"T23:59:59");
  const now = new Date();
  const diff = dl - now;
  if (diff <= 0) return { text: "期限切れ", expired: true };
  const d = Math.floor(diff/86400000);
  const h = Math.floor(diff%86400000/3600000);
  const m = Math.floor(diff%3600000/60000);
  const s = Math.floor(diff%60000/1000);
  return { text: `残り ${d}日 ${h}時間 ${m}分 ${s}秒`, expired: false };
}

// レスポンス描画
function renderResponses(responses){
  if (!responses?.length) return `<div class="response-card response-meta">まだ条件提示はありません。</div>`;
  const min = Math.min(...responses.map(r=>Number(r.price)));
  return responses.map(res => `
    <div class="response-card ${Number(res.price)===min ? "best-offer" : ""}">
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

// ヘルパー群
function val(sel){ return document.querySelector(sel).value.trim(); }
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
function normalizeDate(s){
  const t = s.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // YYYY/MM/DD -> YYYY-MM-DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(t)) return t.replace(/\//g,"-");
  return null;
}
function computeStatus(deadline){
  const today = new Date().toISOString().slice(0,10);
  if (deadline < today) return "締切";
  return "募集中";
}
function lowestPrice(responses){
  if (!responses || !responses.length) return null;
  const vals = responses.map(r => Number(r.price)).filter(v => !Number.isNaN(v));
  return vals.length ? Math.min(...vals) : null;
}

// JSON整形
function normalizeRequestFromJson(r){
  try{
    const id = r.id ?? Date.now()+Math.random();
    const title = String(r.title||"").trim();
    const category = String(r.category||"").trim();
    const service = String(r.service||"").trim() || "提案募集";
    const location = String(r.location||"").trim();
    const desc = String(r.desc||"").trim();
    const budget = Number(r.budget);
    const deadline = normalizeDate(String(r.deadline||"").trim());
    const imageUrl = String(r.imageUrl||"").trim();
    const notes = String(r.notes||"").trim();
    const status = deadline ? computeStatus(deadline) : "募集中";
    const createdAt = r.createdAt || new Date().toISOString();
    const responses = Array.isArray(r.responses) ? r.responses.map(normalizeResponseFromJson).filter(Boolean) : [];
    if (!title || !category || !desc || Number.isNaN(budget) || !deadline) return null;
    return { id, title, category, service, location, desc, budget, deadline, imageUrl, notes, status, createdAt, responses };
  }catch{ return null; }
}
function normalizeResponseFromJson(x){
  try{
    const price = Number(x.price);
    const comment = String(x.comment||"").trim();
    const eta = String(x.eta||"").trim();
    const imageUrl = String(x.imageUrl||"").trim();
    const createdAt = x.createdAt || new Date().toISOString();
    if (Number.isNaN(price) || !comment) return null;
    return { price, comment, eta, imageUrl, createdAt };
  }catch{ return null; }
}

// 保存・読み込み
function loadRequestsSafely(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRequestFromJson).filter(Boolean);
  }catch{
    console.warn("ローカルデータの読み込みに失敗。空データで開始します。");
    return [];
  }
}
function saveSafely(arr){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }catch(e){
    alert("保存に失敗しました（ストレージ制限など）: " + e.message);
  }
}
function loadWatchSafely(){
  try{
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr);
  }catch{ return new Set(); }
}
function saveWatchSafely(set){
  try{
    localStorage.setItem(WATCH_KEY, JSON.stringify(Array.from(set)));
  }catch(e){
    console.warn("ウォッチ保存に失敗: " + e.message);
  }
}
