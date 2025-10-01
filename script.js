// LocalStorage キー
const STORAGE_KEY = "tasq_reverse_auction_requests_v1";

// DOM 参照
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const sortSelect = document.getElementById("sort-select");
const requestForm = document.getElementById("request-form");
const statusText = document.getElementById("status-text");
const requestList = document.getElementById("request-list");
const formError = document.getElementById("form-error");

const exportBtn = document.getElementById("export-json");
const importBtn = document.getElementById("import-json");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalImport = document.getElementById("modal-import");
const importText = document.getElementById("import-text");
const importError = document.getElementById("import-error");

// データロード（失敗時は空配列）
let requests = loadRequestsSafely();

// 初期カテゴリ抽出＆描画
refreshCategoryOptions(requests);
render();

// イベント
searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
sortSelect.addEventListener("change", render);

// リクエスト投稿
requestForm.addEventListener("submit", e => {
  e.preventDefault();
  formError.textContent = "";
  const title = val("#req-title");
  const category = val("#req-category");
  const desc = val("#req-desc");
  const budget = Number(val("#req-budget"));
  const deadline = val("#req-deadline");
  const imageUrl = val("#req-image");

  // バリデーション
  const errors = [];
  if (!title) errors.push("商品名は必須です");
  if (!category) errors.push("カテゴリは必須です");
  if (!desc) errors.push("詳細条件は必須です");
  if (Number.isNaN(budget) || budget < 0) errors.push("希望価格は0以上の数値を入力してください");
  if (!isValidDate(deadline)) errors.push("期限はYYYY-MM-DD形式で入力してください");

  if (errors.length){
    formError.textContent = errors.join("／");
    return;
  }

  const req = {
    id: Date.now(),
    title, category, desc,
    budget,
    deadline,
    imageUrl: imageUrl || "",
    status: computeStatus(deadline),
    createdAt: new Date().toISOString(),
    responses: []
  };

  requests.unshift(req);
  saveSafely(requests);
  refreshCategoryOptions(requests);
  requestForm.reset();
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

    const thumb = r.imageUrl ? `<img class="card-thumb" src="${escapeHtml(r.imageUrl)}" alt="">` : `<div class="card-thumb" aria-hidden="true"></div>`;
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
}

// ヘルパー群
function val(sel){ return document.querySelector(sel).value.trim(); }
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
function isValidDate(s){
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ステータス算出
function computeStatus(deadline){
  const today = new Date().toISOString().slice(0,10);
  if (deadline < today) return "締切";
  return "募集中";
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
    if (!title || !category || !desc || Number.isNaN(budget) || !isValidDate(deadline)) return null;
    return { id, title, category, desc, budget, deadline, imageUrl, status, createdAt, responses };
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

// 保存・読み込みの安全化
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
