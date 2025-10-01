// ===== ストレージキー =====
const STORAGE_KEY = "tasq_reverse_auction_requests_click_v2";
const WATCH_KEY   = "tasq_reverse_auction_watch_v2";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v2";

let CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY);
if (!CLIENT_ID){
  CLIENT_ID = crypto.randomUUID?.() || (Date.now()+"-"+Math.random());
  localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
}

// ===== 選択肢データ =====
const DATASETS = {
  categories: {
    electronics: { name: "家電", sub: ["スマホ","PC","テレビ","オーディオ","カメラ","時計"] },
    fashion:     { name: "ファッション", sub: ["メンズ","レディース","キッズ","スニーカー","バッグ","腕時計"] },
    hobby:       { name: "ホビー", sub: ["ゲーム","トレカ","プラモデル","フィギュア","モデルガン"] },
    home:        { name: "生活・住まい", sub: ["家具","家電周辺","キッチン","ガーデン","置時計"] },
  },
  brands: {
    electronics: ["Apple","Sony","Panasonic","Nintendo","Canon","Nikon","CASIO","Seiko","Citizen","ASUS","Dell","HP","Lenovo","Samsung","Audio-Technica"],
    fashion:     ["Nike","Adidas","Uniqlo","GU","ZARA","Supreme","The North Face","Levi's","Rolex","OMEGA","Seiko","Citizen"],
    hobby:       ["Bandai","Kotobukiya","Good Smile","SEGA","Takara Tomy"],
    home:        ["IKEA","Nitori","T-fal","Iris Ohyama","Yamazen"]
  },
  regions: ["全国","北海道","青森","岩手","宮城","秋田","山形","福島","茨城","栃木","群馬","埼玉","千葉","東京","神奈川","新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知","三重","滋賀","京都","大阪","兵庫","奈良","和歌山","鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知","福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"],
  priceRanges: [
    { id:"0-5000",    label:"〜5,000円",   min:0,     max:5000 },
    { id:"5000-10000",label:"5,000〜10,000円",min:5000,max:10000 },
    { id:"10000-30000",label:"10,000〜30,000円",min:10000,max:30000 },
    { id:"30000+",    label:"30,000円以上",min:30000, max:null }
  ],
  conditions: ["新品","中古（良品）","中古（可）","ジャンク"]
};

// ===== 祝日（2025） =====
const HOLIDAYS_2025 = {
  "2025-01-01":"元日","2025-01-13":"成人の日","2025-02-11":"建国記念の日",
  "2025-02-23":"天皇誕生日","2025-02-24":"振替休日","2025-03-20":"春分の日",
  "2025-04-29":"昭和の日","2025-05-03":"憲法記念日","2025-05-04":"みどりの日",
  "2025-05-05":"こどもの日","2025-05-06":"振替休日","2025-07-21":"海の日",
  "2025-08-11":"山の日","2025-09-15":"敬老の日","2025-09-23":"秋分の日",
  "2025-10-13":"スポーツの日","2025-11-03":"文化の日","2025-11-23":"勤労感謝の日",
  "2025-11-24":"振替休日"
};

// ===== 状態 =====
let requests = loadRequests();
let watchSet = loadWatch();
let page = 1;
const PAGE_SIZE = 12;
let tickTimer = null;

// カレンダーの表示月
let startYM = currentYM();
let endYM = currentYM();

// ===== DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
  renderChoiceButtons();

  // モーダル開閉
  qs("#open-create").addEventListener("click", () => showModal(true));
  qs("#cancel-create").addEventListener("click", () => showModal(false));

  // カレンダー初期化
  renderCalendar("start-calendar", "start-label", "start-date", startYM.year, startYM.month);
  renderCalendar("end-calendar", "end-label", "end-date", endYM.year, endYM.month);
  qs("#start-prev").addEventListener("click", () => { startYM = addMonths(startYM, -1); renderCalendar("start-calendar","start-label","start-date", startYM.year, startYM.month); });
  qs("#start-next").addEventListener("click", () => { startYM = addMonths(startYM, +1); renderCalendar("start-calendar","start-label","start-date", startYM.year, startYM.month); });
  qs("#end-prev").addEventListener("click", () => { endYM = addMonths(endYM, -1); renderCalendar("end-calendar","end-label","end-date", endYM.year, endYM.month); });
  qs("#end-next").addEventListener("click", () => { endYM = addMonths(endYM, +1); renderCalendar("end-calendar","end-label","end-date", endYM.year, endYM.month); });

  // クイック締切
  qsa(".qdl").forEach(btn => btn.addEventListener("click", onQuickDeadlineClick));

  // 送信
  qs("#submit-create").addEventListener("click", onSubmitCreate);

  // 並び替え・検索
  qs("#sort-select").addEventListener("change", () => render());
  qs("#search-input").addEventListener("input", () => render());

  // JSON出力/入力
  qs("#export-json").addEventListener("click", exportJSON);
  qs("#import-json").addEventListener("click", importJSON);

  // ページング
  qs("#prev-page").addEventListener("click", () => { if(page>1){ page--; render(); } });
  qs("#next-page").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredRequests().length / PAGE_SIZE));
    if(page<totalPages){ page++; render(); }
  });

  render();
  startTick();
});

// ===== ユーティリティ =====
function qs(sel, p=document){ return p.querySelector(sel); }
function qsa(sel, p=document){ return [...p.querySelectorAll(sel)]; }
function saveRequests(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(requests)); }
function loadRequests(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch{ return []; } }
function saveWatch(){ localStorage.setItem(WATCH_KEY, JSON.stringify([...watchSet])); }
function loadWatch(){ try { return new Set(JSON.parse(localStorage.getItem(WATCH_KEY)) || []); } catch{ return new Set(); } }
function escapeHtml(s=""){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function pad2(n){ return String(n).padStart(2,"0"); }
function currentYM(){ const d = new Date(); return { year: d.getFullYear(), month: d.getMonth()+1 }; }
function addMonths({year,month}, delta){ const m = month-1+delta; const y = year + Math.floor(m/12); const nm = (m%12+12)%12+1; return {year:y, month:nm}; }

// ===== クリック中心UI（ボタン生成） =====
let selected = { cat:null, subcat:null, brand:null, price:null, cond:null, region:null };

function renderChoiceButtons(){
  // カテゴリ
  const catWrap = qs("#cat-buttons");
  catWrap.innerHTML = Object.keys(DATASETS.categories).map(key => `
    <button class="btn" data-val="${key}">${DATASETS.categories[key].name}</button>
  `).join("");
  qsa("#cat-buttons .btn").forEach(btn => btn.addEventListener("click", () => {
    selectToggle(btn, "cat");
    renderSubcats();
    renderBrands();
  }));

  // サブカテゴリ
  renderSubcats();

  // ブランド（候補＋補助検索）
  renderBrands();
  qs("#brand-search").addEventListener("input", renderBrands);

  // 価格帯
  const priceWrap = qs("#price-buttons");
  priceWrap.innerHTML = DATASETS.priceRanges.map(p => `<button class="btn" data-val="${p.id}">${p.label}</button>`).join("");
  qsa("#price-buttons .btn").forEach(btn => btn.addEventListener("click", () => selectToggle(btn, "price")));

  // 状態
  const condWrap = qs("#cond-buttons");
  condWrap.innerHTML = DATASETS.conditions.map(c => `<button class="btn" data-val="${c}">${c}</button>`).join("");
  qsa("#cond-buttons .btn").forEach(btn => btn.addEventListener("click", () => selectToggle(btn, "cond")));

  // 地域
  const regionWrap = qs("#region-buttons");
  regionWrap.innerHTML = DATASETS.regions.map(r => `<button class="btn" data-val="${r}">${r}</button>`).join("");
  qsa("#region-buttons .btn").forEach(btn => btn.addEventListener("click", () => selectToggle(btn, "region")));
}

function renderSubcats(){
  const subWrap = qs("#subcat-buttons");
  const catKey = selected.cat;
  const subs = catKey ? DATASETS.categories[catKey].sub : [];
  subWrap.innerHTML = subs.length
    ? subs.map(s => `<button class="btn" data-val="${s}">${s}</button>`).join("")
    : `<div class="muted">カテゴリを選ぶと表示されます</div>`;
  qsa("#subcat-buttons .btn").forEach(btn => btn.addEventListener("click", () => selectToggle(btn, "subcat")));
}

function renderBrands(){
  const brandWrap = qs("#brand-buttons");
  const catKey = selected.cat;
  const term = qs("#brand-search").value.trim().toLowerCase();
  let brands = catKey ? (DATASETS.brands[catKey] || []) : [];
  if (term) brands = brands.filter(b => b.toLowerCase().includes(term));
  brandWrap.innerHTML = brands.length
    ? brands.map(b => `<button class="btn" data-val="${b}">${b}</button>`).join("")
    : `<div class="muted">カテゴリ選択で候補表示／補助検索も可</div>`;
  qsa("#brand-buttons .btn").forEach(btn => btn.addEventListener("click", () => selectToggle(btn, "brand")));
}

function selectToggle(btn, key){
  qsa(`#${btn.parentElement.id} .btn`).forEach(b => b.classList.remove("btn-primary"));
  if (selected[key] === btn.dataset.val) {
    selected[key] = null;
  } else {
    btn.classList.add("btn-primary");
    selected[key] = btn.dataset.val;
  }
}

// ===== カレンダー生成（祝日赤・土曜青） =====
function renderCalendar(containerId, labelId, hiddenId, year, month){
  const cont = qs(`#${containerId}`);
  cont.innerHTML = "";

  qs(`#${labelId}`).textContent = `${year}年${month}月`;

  const date = new Date(year, month-1, 1);
  const firstDay = date.getDay();
  const lastDate = new Date(year, month, 0).getDate();

  // 曜日ヘッダ
  ["日","月","火","水","木","金","土"].forEach(d => {
    const el = document.createElement("div");
    el.textContent = d;
    el.className = "header";
    cont.appendChild(el);
  });

  // 空白
  for(let i=0;i<firstDay;i++){
    cont.appendChild(document.createElement("div"));
  }

  // 日付
  for(let d=1; d<=lastDate; d++){
    const el = document.createElement("div");
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
    el.textContent = d;
    el.className = "day";

    const dow = new Date(year, month-1, d).getDay();
    if (dow===0) el.classList.add("sunday");
    if (dow===6) el.classList.add("saturday");
    if (HOLIDAYS_2025[dateStr]) el.classList.add("holiday");

    el.addEventListener("click", () => {
      qsa(`#${containerId} .day`).forEach(x => x.classList.remove("selected"));
      el.classList.add("selected");
      qs(`#${hiddenId}`).value = dateStr;
    });

    cont.appendChild(el);
  }
}

// ===== クイック締切（終了日時に反映） =====
function onQuickDeadlineClick(e){
  const type = e.currentTarget.dataset.dl;
  const now = new Date();
  let target = new Date(now);
  if (type === "today"){ target.setHours(23,59,0,0); }
  if (type === "3days"){ target.setDate(now.getDate()+3); }
  if (type === "1week"){ target.setDate(now.getDate()+7); }
  if (type === "1month"){ target.setMonth(now.getMonth()+1); }
  qs("#end-date").value = target.toISOString().split("T")[0];
  qs("#end-time").value = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`;
}

// ===== 作成送信 =====
function onSubmitCreate(){
  const title = qs("#title-input").value.trim();
  const startDate = qs("#start-date").value;
  const startTime = qs("#start-time").value;
  const endDate = qs("#end-date").value;
  const endTime = qs("#end-time").value;

  if (!selected.cat)    return alert("カテゴリを選んでください");
  if (!selected.subcat) return alert("サブカテゴリを選んでください");
  if (!selected.price)  return alert("価格帯を選んでください");
  if (!startDate || !startTime) return alert("開始日時を選んでください");
  if (!endDate || !endTime)     return alert("終了日時を選んでください");

  const startAt = `${startDate}T${startTime}`;
  const endAt   = `${endDate}T${endTime}`;

  // 終了が開始より前の場合ガード
  if (new Date(endAt) <= new Date(startAt)) return alert("終了日時は開始日時より後にしてください");

  const priceInfo = DATASETS.priceRanges.find(p => p.id===selected.price) || {min:null,max:null};
  const newReq = {
    id: crypto.randomUUID?.() || (Date.now()+"-"+Math.random()),
    title: title || `${DATASETS.categories[selected.cat].name} / ${selected.subcat} / ${selected.brand || "ノーブランド"}`,
    category: selected.cat,
    subcategory: selected.subcat,
    brand: selected.brand || null,
    region: selected.region || "全国",
    condition: selected.cond || null,
    priceRange: selected.price,
    minPrice: priceInfo.min,
    maxPrice: priceInfo.max,
    startAt,               // 追加：開始日時
    deadline: endAt,       // 既存：終了日時（deadlineで流用）
    createdAt: new Date().toISOString(),
    imageUrl: null,
    watch: 0,
    responses: []
  };

  const files = qs("#file-input").files;
  if (files && files.length > 0){
    newReq.imageUrl = URL.createObjectURL(files[0]);
  }

  requests.unshift(newReq);
  saveRequests();
  resetCreateForm();
  showModal(false);
  page = 1;
  render();
}

// ===== 作成フォームリセット =====
function resetCreateForm(){
  selected = { cat:null, subcat:null, brand:null, price:null, cond:null, region:null };
  ["cat-buttons","subcat-buttons","brand-buttons","price-buttons","cond-buttons","region-buttons"].forEach(id => {
    qsa(`#${id} .btn`).forEach(b => b.classList.remove("btn-primary"));
  });
  qs("#title-input").value = "";
  qs("#brand-search").value = "";
  qs("#file-input").value = "";
  qs("#start-date").value = "";
  qs("#start-time").value = "09:00";
  qs("#end-date").value = "";
  qs("#end-time").value = "23:59";
  qsa("#start-calendar .day").forEach(x=>x.classList.remove("selected"));
  qsa("#end-calendar .day").forEach(x=>x.classList.remove("selected"));
}

// ===== モーダル表示 =====
function showModal(show){
  qs("#create-modal").classList.toggle("hidden", !show);
}

// ===== 一覧レンダリング・フィルタ =====
function filteredRequests(){
  const term = qs("#search-input").value.trim().toLowerCase();
  let arr = [...requests];
  if (term) arr = arr.filter(r => (r.title||"").toLowerCase().includes(term));
  const sort = qs("#sort-select").value;
  if (sort === "newest")    arr.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  if (sort === "lowest")    arr.sort((a,b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
  if (sort === "deadline")  arr.sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
  if (sort === "bestOffer") arr.sort((a,b) => (lowestPrice(a.responses) ?? Infinity) - (lowestPrice(b.responses) ?? Infinity));
  if (sort === "popular")   arr.sort((a,b) => getWatchCount(b.id) - getWatchCount(a.id));
  return arr;
}

function render(){
  const arr = filteredRequests();
  const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  page = Math.min(page, totalPages);
  qs("#page-info").textContent = `${page} / ${totalPages}`;

  const start = (page-1)*PAGE_SIZE;
  const slice = arr.slice(start, start+PAGE_SIZE);

  const html = slice.map(r => `
    <article class="m-card">
      <img class="m-thumb" src="${escapeHtml(r.imageUrl || "")}" alt="" onerror="this.style.display='none'">
      <div class="m-body">
        <h3 class="m-title">${escapeHtml(r.title || "無題")}</h3>
        <div class="m-price">${priceLabel(r)}</div>
        <div class="m-badges">
          <span class="badge like">♡ ${getWatchCount(r.id)}</span>
          ${r.brand ? `<span class="badge">${escapeHtml(r.brand)}</span>` : ""}
          ${r.region ? `<span class="badge">${escapeHtml(r.region)}</span>` : ""}
          ${r.condition ? `<span class="badge">${escapeHtml(r.condition)}</span>` : ""}
        </div>
        <div class="response-meta">開始：${r.startAt ? new Date(r.startAt).toLocaleString() : "未設定"}</div>
        <div class="m-countdown" data-deadline="${escapeHtml(r.deadline)}">計算中…</div>

        <div class="response-list">
          ${renderResponses(r.responses)}
          <div class="response-actions">
            <button class="btn" onclick="toggleWatch('${r.id}')">${isWatched(r.id) ? "ウォッチ解除" : "ウォッチする"}</button>
          </div>
        </div>
      </div>
    </article>
  `).join("");

  qs("#list").innerHTML = html;
  attachShowMoreEvents();
}

// ===== 表示補助 =====
function priceLabel(r){
  if (r.minPrice!=null && r.maxPrice!=null) return `希望価格帯：¥${r.minPrice.toLocaleString()}〜¥${r.maxPrice.toLocaleString()}`;
  if (r.minPrice!=null && r.maxPrice==null) return `希望価格：¥${r.minPrice.toLocaleString()}以上`;
  return "希望価格：任意";
}

// ===== レスポンス折りたたみ =====
function renderResponses(responses){
  if (!responses || responses.length === 0){
    return `<div class="response-card response-meta">まだ条件提示はありません。</div>`;
  }
  const min = Math.min(...responses.map(r=>Number(r.price)));
  const first = responses[0];
  let html = `
    <div class="response-card ${Number(first.price)===min ? "best" : ""}">
      <div><strong>提示価格：</strong>¥${Number(first.price).toLocaleString()}</div>
      ${first.eta ? `<div class="response-meta">納期：${escapeHtml(first.eta)}</div>` : ""}
      ${first.imageUrl ? `<div class="response-meta">画像：<a href="${escapeHtml(first.imageUrl)}" target="_blank" rel="noopener">リンク</a></div>` : ""}
      <div class="response-meta">提示日時：${new Date(first.createdAt).toLocaleString()}</div>
      <div class="response-comment">${escapeHtml(first.comment||"")}</div>
    </div>
  `;
  if (responses.length > 1){
    html += `<button class="btn btn-secondary show-more">もっと見る（${responses.length-1}件）</button>
             <div class="more-responses hidden">
               ${responses.slice(1).map(res => `
                 <div class="response-card ${Number(res.price)===min ? "best" : ""}">
                   <div><strong>提示価格：</strong>¥${Number(res.price).toLocaleString()}</div>
                   ${res.eta ? `<div class="response-meta">納期：${escapeHtml(res.eta)}</div>` : ""}
                   ${res.imageUrl ? `<div class="response-meta">画像：<a href="${escapeHtml(res.imageUrl)}" target="_blank" rel="noopener">リンク</a></div>` : ""}
                   <div class="response-meta">提示日時：${new Date(res.createdAt).toLocaleString()}</div>
                   <div class="response-comment">${escapeHtml(res.comment||"")}</div>
                 </div>
               `).join("")}
             </div>`;
  }
  return html;
}

function attachShowMoreEvents(){
  qsa(".show-more").forEach(btn => {
    btn.addEventListener("click", () => {
      const more = btn.nextElementSibling;
      more.classList.toggle("hidden");
      btn.textContent = more.classList.contains("hidden")
        ? `もっと見る（${more.children.length}件）`
        : "閉じる";
    });
  });
}

// ===== カウントダウン =====
function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    qsa(".m-countdown").forEach(el => {
      const dl = el.getAttribute("data-deadline");
      const txt = formatCountdown(dl);
      el.textContent = txt.text;
      el.classList.toggle("expired", txt.expired);
      el.classList.toggle("urgent", txt.urgent);
    });
  }, 1000);
}
function formatCountdown(deadline){
  const dl = new Date(deadline);
  const now = new Date();
  const diff = dl - now;
  if (isNaN(dl.getTime())) return { text:"締切未設定", expired:false, urgent:false };
  if (diff <= 0) return { text: "期限切れ", expired: true, urgent:false };
  const d = Math.floor(diff/86400000);
  const h = Math.floor(diff%86400000/3600000);
  const m = Math.floor(diff%3600000/60000);
  const s = Math.floor(diff%60000/1000);
  const text = `残り ${d}日 ${h}時間 ${m}分 ${s}秒`;
  const urgent = diff < 86400000;
  return { text, expired:false, urgent };
}

// ===== ウォッチ =====
function isWatched(id){ return watchSet.has(id); }
function getWatchCount(id){ const r = requests.find(x => x.id===id); return r?.watch || 0; }
function toggleWatch(id){
  const r = requests.find(x => x.id===id);
  if (!r) return;
  if (isWatched(id)){
    watchSet.delete(id);
    r.watch = Math.max(0, (r.watch||0)-1);
  } else {
    watchSet.add(id);
    r.watch = (r.watch||0)+1;
  }
  saveWatch(); saveRequests(); render();
}

// ===== 最安オファー計算 =====
function lowestPrice(responses){
  if (!responses || responses.length===0) return null;
  return Math.min(...responses.map(r => Number(r.price)));
}

// ===== JSON入出力 =====
function exportJSON(){
  const blob = new Blob([JSON.stringify(requests,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "requests.json";
  a.click();
}
function importJSON(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json";
  inp.onchange = () => {
    const file = inp.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          requests = data;
          saveRequests();
          page = 1;
          render();
        } else {
          alert("JSONの形式が不正です（配列が必要）");
        }
      } catch(e){
        alert("JSONの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}
