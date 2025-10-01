// ===== 設定（Supabase未設定なら自動でLocalStorageにフォールバック） =====
const SUPABASE_URL = "";           // 例: https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "";      // 例: 「Project Settings > API > anon public」
const USE_DB = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const STORAGE_KEY = "tasq_reverse_auction_requests_v5";
const WATCH_KEY = "tasq_reverse_auction_watch_v3";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v1";
const UPLOAD_BUCKET = "uploads";

// ===== Supabase クライアント =====
let supabase = null;
if (USE_DB) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== クライアントID（ウォッチ集計用・匿名識別子） =====
let CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY);
if (!CLIENT_ID){
  CLIENT_ID = crypto.randomUUID?.() || (Date.now()+"-"+Math.random());
  localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
}

// ===== DOM =====
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

// ===== 状態 =====
let requests = [];
let watchSet = loadWatchSafely(); // Local自己ウォッチ表示用
let page = 1;
let tickTimer = null;
let watchCounts = new Map(); // request_id -> count（DB集計）

// ===== 初期化 =====
init();

async function init(){
  requests = await loadAll();
  refreshCategoryOptions(requests);
  await refreshWatchCounts();
  render();
  startTick();
}

// ===== イベント =====
searchInput.addEventListener("input", () => { page = 1; render(); });
categoryFilter.addEventListener("change", () => { page = 1; render(); });
serviceFilter.addEventListener("change", () => { page = 1; render(); });
sortSelect.addEventListener("change", () => { page = 1; render(); });
pageSizeSel.addEventListener("change", () => { page = 1; render(); });

prevPageBtn.addEventListener("click", () => { if (page > 1) { page--; render(); }});
nextPageBtn.addEventListener("click", () => { page++; render(); });

requestForm.addEventListener("submit", async e => {
  e.preventDefault();
  formError.textContent = "";

  const title = val("#req-title");
  const category = val("#req-category");
  const service = val("#req-service");
  const location = val("#req-location");
  const desc = val("#req-desc");
  const budget = Number(val("#req-budget"));
  const deadlineRaw = val("#req-deadline"); // YYYY-MM-DD or YYYY/MM/DD
  const imageUrlText = val("#req-image");
  const imageFile = document.getElementById("req-file").files[0] || null;
  const notes = val("#req-notes");

  const errors = [];
  if (!title) errors.push("商品名は必須です");
  if (!category) errors.push("カテゴリは必須です");
  if (!service) errors.push("サービスの種類は必須です");
  if (!location) errors.push("取引場所は必須です");
  if (!desc) errors.push("詳細条件は必須です");
  if (Number.isNaN(budget) || budget < 0) errors.push("希望金額は0以上の数値を入力してください");

  const deadline = normalizeDate(deadlineRaw);
  if (!deadline) errors.push("期限は YYYY-MM-DD または YYYY/MM/DD 形式で入力してください");

  if (errors.length){
    formError.textContent = errors.join("／");
    return;
  }

  let imageUrl = imageUrlText || "";
  if (USE_DB && imageFile){
    const up = await uploadImage(imageFile);
    if (up.ok) imageUrl = up.url; else alert("画像アップロードに失敗: " + up.error);
  }

  const req = {
    id: Date.now(),
    title, category, service, location, desc,
    budget, deadline, imageUrl, notes: notes || "",
    status: computeStatus(deadline),
    createdAt: new Date().toISOString(),
    responses: []
  };

  await saveOne(req);
  requests = await loadAll();
  refreshCategoryOptions(requests);
  await refreshWatchCounts();
  requestForm.reset();
  page = 1;
  render();
});

exportBtn.addEventListener("click", async () => {
  try{
    const data = await loadAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reverse-auction-data.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    alert("JSON書き出しに失敗しました: " + e.message);
  }
});

importBtn.addEventListener("click", () => { importError.textContent = ""; importText.value = ""; modal.classList.remove("hidden"); });
modalClose.addEventListener("click", () => { modal.classList.add("hidden"); importText.value = ""; importError.textContent = ""; });
modalImport.addEventListener("click", async () => {
  try {
    importError.textContent = "";
    const text = importText.value.trim();
    if (!text) throw new Error("JSONテキストを入力してください");
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("配列形式のJSONが必要です");
    const normalized = data.map(normalizeRequestFromJson).filter(Boolean);
    await replaceAll(normalized);
    requests = await loadAll();
    refreshCategoryOptions(requests);
    await refreshWatchCounts();
    page = 1;
    render();
    modal.classList.add("hidden");
    importText.value = "";
  } catch (e) {
    importError.textContent = "JSON読み込みエラー: " + e.message;
  }
});

// ===== レンダリング =====
function render(){
  const q = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const service = serviceFilter.value;
  const sort = sortSelect.value;
  const pageSize = Number(pageSizeSel.value);

  let arr = [...requests];

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

  if (sort === "newest"){
    arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }else if (sort === "lowest"){
    arr.sort((a,b) => a.budget - b.budget);
  }else if (sort === "deadline"){
    arr.sort((a,b) => a.deadline.localeCompare(b.deadline));
  }else if (sort === "bestOffer"){
    arr.sort((a,b) => (lowestPrice(a.responses) ?? Infinity) - (lowestPrice(b.responses) ?? Infinity));
  }

  statusText.textContent = `表示件数：${arr.length}件（検索: "${q||"-"}", カテゴリ: ${cat}, 種類: ${service}, 並び替え: ${sort}${USE_DB ? ", DB: Supabase" : ", 保存: LocalStorage"}）`;

  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = arr.slice(start, end);

  pageInfo.textContent = `ページ ${page} / ${totalPages}`;
  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= totalPages;

  requestList.innerHTML = "";
  if (!pageItems.length){
    requestList.innerHTML = `<div class="m-card"><div class="m-body">該当するリクエストがありません。</div></div>`;
    return;
  }

  pageItems.forEach(r => {
    const card = document.createElement("div");
    card.className = "m-card";

    const img = r.imageUrl ? `<img class="m-thumb" src="${escapeHtml(r.imageUrl)}" alt="">` : `<div class="m-thumb" aria-hidden="true"></div>`;
    const best = lowestPrice(r.responses);
    const likeCount = getWatchCount(r.id);
    const badgeLike = `<span class="badge like">♡ ${likeCount}</span>`;
    const badgeBest = (best !== null) ? `<span class="badge best">最良 ¥${best.toLocaleString()}</span>` : `<span class="badge">最良オファー: 未提示</span>`;
    const countdown = `<div class="m-countdown" data-deadline="${escapeHtml(r.deadline)}"></div>`;

    card.innerHTML = `
      ${img}
      <div class="m-body">
        <h3 class="m-title">${escapeHtml(r.title)}</h3>
        <div class="m-price">¥${Number(r.budget).toLocaleString()}</div>
        <div class="m-meta">カテゴリ：${escapeHtml(r.category)} ／ 種類：${escapeHtml(r.service)} ／ 場所：${escapeHtml(r.location || "未指定")}</div>
        <div class="m-meta">投稿：${new Date(r.createdAt).toLocaleString()} ／ 期限：${escapeHtml(r.deadline)}</div>
        ${countdown}
        <div class="m-badges">${badgeLike} ${badgeBest}</div>
        <p class="m-desc">${escapeHtml(r.desc)}</p>
        ${r.notes ? `<div class="m-meta">備考：${escapeHtml(r.notes)}</div>` : ""}
        <div class="response-list" id="responses-${r.id}">
          ${renderResponses(r.responses)}
        </div>
        ${renderResponseForm(r.id, r.status)}
        <div class="response-actions" style="padding:10px;">
          <button class="btn watch-btn" data-id="${r.id}">${isWatched(r.id) ? "ウォッチ中" : "ウォッチ"}</button>
        </div>
      </div>
    `;

    requestList.appendChild(card);

    // ウォッチイベント（DB集計＋Local表示更新）
    const watchBtn = card.querySelector(".watch-btn");
    watchBtn.addEventListener("click", async () => {
      await toggleWatchDB(r.id);
      toggleWatchLocal(r.id);
      await refreshWatchCounts();
      render();
    });

    // 応答フォームイベント（画像URLのみ。アップロードはリクエスト側で対応）
    const form = card.querySelector(`form[data-id="${r.id}"]`);
    if (form){
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const price = Number(form.querySelector('input[name="price"]').value.trim());
        const eta = form.querySelector('input[name="eta"]').value.trim();
        const imageUrl = form.querySelector('input[name="imageUrl"]').value.trim();
        const comment = form.querySelector('textarea[name="comment"]').value.trim();

        const errs = [];
        if (Number.isNaN(price) || price < 0) errs.push("提示価格は0以上の数値を入力してください");
        if (!comment) errs.push("コメントは必須です");
        if (errs.length){ alert(errs.join("\n")); return; }

        await addResponse(r.id, { price, comment, eta, imageUrl, createdAt: new Date().toISOString() });
        requests = await loadAll();
        render();
      });
    }
  });

  updateCountdowns();
}

// ===== カウントダウン =====
function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(updateCountdowns, 1000);
}
function updateCountdowns(){
  document.querySelectorAll(".m-countdown").forEach(el => {
    const dl = el.getAttribute("data-deadline");
    const txt = formatCountdown(dl);
    el.textContent = txt.text;
    el.classList.toggle("expired", txt.expired);
  });
}
function formatCountdown(deadline){
  const dl = new Date(deadline.replace(/\//g,"-")+"T23:59:59");
  const now = new Date();
  const diff = dl - now;
  if (diff <= 0) return { text: "期限切れ", expired: true };
  const d = Math.floor(diff/86400000);
  const h = Math.floor(diff%86400000/3600000);
  const m = Math.floor(diff%3600000/60000);
  const s = Math.floor(diff%60000/1000);
  return { text: `残り ${d}日 ${h}時間 ${m}分 ${s}秒`, expired: false };
}

// ===== レスポンス描画 =====
function renderResponses(responses){
  if (!responses?.length) return `<div class="response-card response-meta">まだ条件提示はありません。</div>`;
  const min = Math.min(...responses.map(r=>Number(r.price)));
  return responses.map(res => `
    <div class="response-card ${Number(res.price)===min ? "best" : ""}">
      <div><strong>提示価格：</strong>¥${Number(res.price).toLocaleString()}</div>
      ${res.eta ? `<div class="response-meta">納期：${escapeHtml(res.eta)}</div>` : ""}
      ${res.imageUrl ? `<div class="response-meta">画像：<a href="${escapeHtml(res.imageUrl)}" target="_blank" rel="noopener">リンク</a></div>` : ""}
      <div class="response-meta">提示日時：${new Date(res.createdAt).toLocaleString()}</div>
      <div class="response-comment">${escapeHtml(res.comment)}</div>
    </div>
  `).join("");
}
function renderResponseForm(id, status){
  if (status === "締切") return `<div class="response-meta" style="padding:10px;">このリクエストは締切です。条件提示はできません。</div>`;
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

// ===== ウォッチ（♡） =====
// Local（自己表示用）
function isWatched(id){ return watchSet.has(id); }
function toggleWatchLocal(id){
  if (watchSet.has(id)) watchSet.delete(id); else watchSet.add(id);
  saveWatchSafely(watchSet);
}
// DB（全体集計用）
async function toggleWatchDB(requestId){
  if (!USE_DB) return;
  // 既存チェック
  const { data, error } = await supabase
    .from("watchers").select("id").eq("request_id", requestId).eq("client_id", CLIENT_ID).limit(1);
  if (error){ console.warn("ウォッチ取得失敗:", error.message); return; }
  if (data && data.length){
    // 解除
    const { error: delErr } = await supabase.from("watchers").delete().eq("id", data[0].id);
    if (delErr) console.warn("ウォッチ解除失敗:", delErr.message);
  }else{
    // 追加
    const { error: insErr } = await supabase.from("watchers").insert({ request_id: requestId, client_id: CLIENT_ID, createdAt: new Date().toISOString() });
    if (insErr) console.warn("ウォッチ追加失敗:", insErr.message);
  }
}
async function refreshWatchCounts(){
  watchCounts.clear();
  if (!USE_DB){
    // Local端末のみの簡易表示（ウォッチ中は1、他は0）
    requests.forEach(r => watchCounts.set(r.id, isWatched(r.id) ? 1 : 0));
    return;
  }
  const { data, error } = await supabase.from("watchers").select("request_id, count:request_id(count)").group("request_id");
  if (error){
    console.warn("ウォッチ集計失敗:", error.message);
    // フォールバック
    requests.forEach(r => watchCounts.set(r.id, isWatched(r.id) ? 1 : 0));
    return;
  }
  // data: [{ request_id, count }]
  data.forEach(row => watchCounts.set(row.request_id, Number(row.count)||0));
}
function getWatchCount(id){
  return watchCounts.get(id) ?? 0;
}

// ===== ヘルパー =====
function val(sel){ return document.querySelector(sel).value.trim(); }
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
function normalizeDate(s){
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
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

// ===== 画像アップロード（Supabase Storage） =====
async function uploadImage(file){
  if (!USE_DB) return { ok:false, error:"Supabase未設定のためアップロード不可" };
  const ext = file.name.split(".").pop();
  const path = `${CLIENT_ID}/${Date.now()}.${ext||"jpg"}`;
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file, { upsert:false });
  if (error) return { ok:false, error:error.message };
  const { data: pub } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
  const url = pub?.publicUrl || "";
  return url ? { ok:true, url } : { ok:false, error:"公開URL取得に失敗" };
}

// ===== データ層（DB or LocalStorage） =====
async function loadAll(){
  if (!USE_DB) return loadLocal();
  // requests + responses
  const { data, error } = await supabase.from("requests").select("*, responses(*)").order("createdAt", { ascending:false });
  if (error){ console.warn("DB読み込み失敗。Localへフォールバック:", error.message); return loadLocal(); }
  return data.map(normalizeRequestFromJson).filter(Boolean);
}
async function saveOne(req){
  if (!USE_DB){ saveLocalAdd(req); return; }
  const base = { ...req }; delete base.responses;
  const { error } = await supabase.from("requests").insert(base);
  if (error){ alert("DB保存に失敗しました: " + error.message); saveLocalAdd(req); }
}
async function addResponse(requestId, res){
  if (!USE_DB){
    const arr = loadLocal();
    const target = arr.find(x => x.id === requestId);
    if (!target) return;
    target.responses.unshift(res);
    saveLocalReplace(arr);
    return;
  }
  const payload = { request_id: requestId, ...res };
  const { error } = await supabase.from("responses").insert(payload);
  if (error){
    alert("DBレスポンス保存に失敗しました: " + error.message);
    const arr = loadLocal();
    const target = arr.find(x => x.id === requestId);
    if (target){ target.responses.unshift(res); saveLocalReplace(arr); }
  }
}
async function replaceAll(arr){
  if (!USE_DB){ saveLocalReplace(arr); return; }
  // 初期化
  await supabase.from("responses").delete().neq("id", 0);
  await supabase.from("watchers").delete().neq("id", 0);
  await supabase.from("requests").delete().neq("id", 0);
  // requests投入
  const reqs = arr.map(r => { const { responses, ...base } = r; return base; });
  if (reqs.length){
    const { error: insErr } = await supabase.from("requests").insert(reqs);
    if (insErr) alert("DB投入失敗: " + insErr.message);
  }
  // responses投入
  const flatRes = [];
  arr.forEach(r => (r.responses||[]).forEach(x => flatRes.push({ request_id: r.id, ...x })));
  if (flatRes.length){
    const { error: insRErr } = await supabase.from("responses").insert(flatRes);
    if (insRErr) alert("DBレスポンス投入失敗: " + insRErr.message);
  }
}

// ===== LocalStorage 実装 =====
function loadLocal(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRequestFromJson).filter(Boolean);
  }catch{
    console.warn("Local読み込み失敗。空で開始。");
    return [];
  }
}
function saveLocalAdd(req){
  const arr = loadLocal();
  arr.unshift(req);
  saveLocalReplace(arr);
}
function saveLocalReplace(arr){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }catch(e){
    alert("Local保存に失敗しました: " + e.message);
  }
}

// ===== 正規化 =====
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

// ===== ウォッチ保存（Local自己表示用） =====
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
