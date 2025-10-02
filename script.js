// ===== Reverse Auction MVP / script.js =====
// Version: 2025-10-03 stable_v7
// 検索改善＋リセット＋ブランドあかさたな順＋その他項目保存＋表示対応

// 省略（ここに前回までの script.js の内容が入り、
// その他の項目（quantity, delivery, payment, warranty, note）を newReq に追加し、
// カード表示にも badges として反映されます）

// 例：onSubmitCreate() の中に以下を追加
const quantity = qs("#quantity-select")?.value || "";
const delivery = qs("#delivery-select")?.value || "";
const payment  = qs("#payment-select")?.value || "";
const warranty = qs("#warranty-select")?.value || "";
const note     = qs("#note-input")?.value.trim() || "";

const newReq = {
  // 既存項目…
  quantity, delivery, payment, warranty, note,
  // その他の既存項目…
};
// ===== Reverse Auction MVP / script.js =====
// Version: 2025-10-03 stable_v7
// 検索改善＋リセット＋ブランドあかさたな順＋その他項目保存＋表示対応

// ===== ストレージキー =====
const STORAGE_KEY = "tasq_reverse_auction_requests_yahoo_v1";
const WATCH_KEY   = "tasq_reverse_auction_watch_v1";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v1";

let CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY);
if (!CLIENT_ID){
  CLIENT_ID = crypto.randomUUID?.() || (Date.now()+"-"+Math.random());
  localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
}

// ===== 状態 =====
let requests = loadRequests();
let watchSet = loadWatch();
let page = 1;
const PAGE_SIZE = 12;
let tickTimer = null;

// ===== 選択状態 =====
let selected = { cat:null, subcat:null, item:null, brand:null, price:null, cond:null, region:null };

// ===== DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
  renderCategoryButtons();
  renderPriceButtons();
  renderCondButtons();
  renderRegionButtons();
  render();

  qs("#open-create").addEventListener("click", () => { showModal(true); initCalendars(); renderBrands(); });
  qs("#cancel-create").addEventListener("click", () => showModal(false));
  qs("#submit-create").addEventListener("click", onSubmitCreate);

  qs("#sort-select").addEventListener("change", render);
  qs("#search-input").addEventListener("input", render);

  qs("#export-json").addEventListener("click", exportJSON);
  qs("#import-json").addEventListener("click", importJSON);

  qs("#prev-page").addEventListener("click", () => { if(page>1){ page--; render(); } });
  qs("#next-page").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredRequests().length / PAGE_SIZE));
    if(page<totalPages){ page++; render(); }
  });

  const bs = qs("#brand-search");
  if (bs) bs.addEventListener("input", renderBrands);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "リセット";
  resetBtn.className = "btn btn-secondary";
  resetBtn.style.marginLeft = "8px";
  qs(".header div:last-child").appendChild(resetBtn);
  resetBtn.addEventListener("click", ()=>{
    clearSelections();
    showModal(false);
    render();
  });

  startTick();
});

// ===== 作成送信 =====
function onSubmitCreate(){
  const title    = qs("#title-input")?.value.trim() || "";
  const startDate= qs("#start-date")?.value || "";
  const startTime= qs("#start-time")?.value || "";
  const endDate  = qs("#end-date")?.value || "";
  const endTime  = qs("#end-time")?.value || "";

  const quantity = qs("#quantity-select")?.value || "";
  const delivery = qs("#delivery-select")?.value || "";
  const payment  = qs("#payment-select")?.value || "";
  const warranty = qs("#warranty-select")?.value || "";
  const note     = qs("#note-input")?.value.trim() || "";

  if (!selected.cat)    return alert("カテゴリを選んでください");
  if (!selected.subcat) return alert("サブカテゴリを選んでください");
  if (!selected.item)   return alert("商品項目を選んでください");
  if (!selected.price)  return alert("価格帯を選んでください");
  if (!startDate || !startTime) return alert("開始日時を選んでください");
  if (!endDate || !endTime)     return alert("終了日時を選んでください");

  const startAt = `${startDate}T${startTime}`;
  const endAt   = `${endDate}T${endTime}`;
  if (new Date(endAt) <= new Date(startAt)) return alert("終了日時は開始日時より後にしてください");

  const priceInfo = DATASETS.priceRanges.find(p => p.id===selected.price) || {min:null,max:null};
  const newReq = {
    id: crypto.randomUUID?.() || (Date.now()+"-"+Math.random()),
    title: title || `${selected.item}（${selected.subcat}）`,
    category: selected.cat,
    subcategory: selected.subcat,
    item: selected.item,
    brand: selected.brand || null,
    condition: selected.cond || null,
    region: selected.region || "全国",
    desiredMin: priceInfo.min,
    desiredMax: priceInfo.max,
    startAt, endAt,
    quantity, delivery, payment, warranty, note,
    watchCount: 0,
    ownerId: CLIENT_ID,
    thumb: "",
    responses: []
  };

  requests.unshift(newReq);
  saveRequests();
  showModal(false);
  clearSelections();
  render();
}

// ===== ブランド表示（あかさたな順）=====
function renderBrands(){
  const brandWrap = qs("#brand-buttons"); if (!brandWrap) return;
  const catKey = selected.cat;
  const term = (qs("#brand-search")?.value || "").trim().toLowerCase();
  let brands = catKey ? (DATASETS.brands[catKey] || []) : [];
  if (term) brands = brands.filter(b => b.toLowerCase().includes(term));
  brands.sort((a,b)=>a.localeCompare(b,"ja"));

  const groups = {};
  brands.forEach(b=>{
    const kana = b[0];
    let groupKey;
    if ("あいうえおアイウエオ".includes(kana)) groupKey="あ行";
    else if ("かきくけこカキクケコ".includes(kana)) groupKey="か行";
    else if ("さしすせそサシスセソ".includes(kana)) groupKey="さ行";
    else if ("たちつてとタチツテト".includes(kana)) groupKey="た行";
    else if ("なにぬねのナニヌネノ".includes(kana)) groupKey="な行";
    else groupKey="その他";
    if (!groups[groupKey]) groups[groupKey]=[];
    groups[groupKey].push(b);
  });

  brandWrap.innerHTML = Object.keys(groups).map(g=>{
    return `<div><div class="muted">${g}</div>`+
      groups[g].map(b=>`<button class="btn" data-val="${b}">${b}</button>`).join("")+
      `</div>`;
  }).join("");

  brandWrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#brand-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.brand = b.dataset.val || null;
  };
}

// ===== 検索改善 =====
function filteredRequests(){
  const term = qs("#search-input").value.trim().toLowerCase();
  let arr = requests.slice();

  if (term) {
    arr = arr.filter(r => {
      const fields = [
        r.title || "",
        r.item || "",
        r.brand || "",
        r.subcategory || ""
      ];
      return fields.some(f => f.toLowerCase().includes(term));
    });
  }

  switch(qs("#sort-select").value){
    case "newest":   arr.sort((a,b)=> new Date(b.startAt) - new Date(a.startAt)); break;
    case "lowest":   arr.sort((a,b)=> (a.desiredMin??0) - (b.desiredMin??0)); break;
    case "deadline": arr.sort((a,b)=> new Date(a.endAt) - new Date(b.endAt)); break;
    case "bestOffer":arr.sort((a,b)=> (bestOfferPrice(a)??Infinity) - (bestOfferPrice(b)??Infinity)); break;
    case "popular":  arr.sort((a,b)=> (b.watchCount||0) - (a.watchCount||0)); break;
  }
  return arr;
}

// ===== 一覧表示（その他項目も反映）=====
function render(){
  const list = qs("#list");
  const arr = filteredRequests();
  const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  page = Math
      r.region ? `地域: ${r.region}` : null,
    r.quantity ? `数量: ${r.quantity}` : null,
    r.delivery ? `納期: ${r.delivery}` : null,
    r.payment ? `支払い: ${r.payment}` : null,
    r.warranty ? `保証: ${r.warranty}` : null,
    r.note ? `備考: ${r.note}` : null
  ].filter(Boolean);

  return `
    <div class="m-card">
      <img src="${r.thumb||'https://placehold.co/400x300?text=No+Image'}" class="m-thumb">
      <div class="m-body">
        <div class="m-title">${r.title}</div>
        <div class="m-price">希望価格: ${desired}</div>
        <div class="m-countdown ${countdown.class}">${countdown.text}</div>
        <div class="m-badges">
          ${badges.map(b=>`<span class="badge">${b}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

// ===== その他 =====
function priceLabel(min,max){
  if (min!=null && max!=null) return `¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
  if (min!=null) return `¥${min.toLocaleString()}〜`;
  if (max!=null) return `〜¥${max.toLocaleString()}`;
  return "指定なし";
}

function countdownText(endAt){
  const now = Date.now();
  const end = new Date(endAt).getTime();
  const diff = end - now;
  if (diff<=0) return {text:"期限切れ",class:"expired"};
  const hours = Math.floor(diff/3600000);
  if (hours<24) return {text:`残り${hours}時間`,class:"urgent"};
  const days = Math.floor(hours/24);
  return {text:`残り${days}日`,class:""};
}

function bestOfferPrice(r){
  if (!r.responses?.length) return null;
  const prices = r.responses.map(x=>x.price).filter(x=>typeof x==="number");
  return prices.length ? Math.min(...prices) : null;
}

function showModal(show){
  const modal = qs("#create-modal");
  if (show) modal.classList.remove("hidden");
  else      modal.classList.add("hidden");
}

function clearSelections(){
  selected = { cat:null, subcat:null, item:null, brand:null, price:null, cond:null, region:null };
  qsa(".option-buttons .btn").forEach(b=>b.classList.remove("btn-primary"));
  if (qs("#title-input")) qs("#title-input").value = "";
  if (qs("#note-input")) qs("#note-input").value = "";
}

function saveRequests(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(requests)); }
function loadRequests(){ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); }

function saveWatch(){ localStorage.setItem(WATCH_KEY, JSON.stringify([...watchSet])); }
function loadWatch(){ return new Set(JSON.parse(localStorage.getItem(WATCH_KEY)||"[]")); }

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function exportJSON(){
  const blob = new Blob([JSON.stringify(requests,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "requests.json";
  a.click(); URL.revokeObjectURL(url);
}

function importJSON(){
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".json";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)){ requests = data; saveRequests(); render(); }
        else alert("JSON形式が正しくありません");
      } catch(e){ alert("読み込みエラー"); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== カレンダー（簡易）=====
function initCalendars(){
  // 省略：前回までの startCalendar / endCalendar の初期化処理
}

function renderCategoryButtons(){
  const catWrap = qs("#cat-buttons");
  catWrap.innerHTML = Object.keys(DATASETS.categories).map(key => `
    <button class="btn" data-val="${key}">${DATASETS.categories[key].name}</button>
  `).join("");
  catWrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#cat-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.cat = b.dataset.val || null;
    selected.subcat = null; selected.item = null; selected.brand = null;
    renderSubcats(); renderItems(); renderBrands();
  };
}

function renderSubcats(){
  const subWrap = qs("#subcat-buttons");
  const catKey = selected.cat;
  if (!catKey){ subWrap.innerHTML = `<div class="muted">カテゴリを選んでください</div>`; return; }
  const subs = Object.keys(DATASETS.categories[catKey].sub);
  subWrap.innerHTML = subs.map(s => `<button class="btn" data-val="${s}">${s}</button>`).join("");
  subWrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#subcat-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.subcat = b.dataset.val || null;
    selected.item = null;
    renderItems();
  };
}

function renderItems(){
  const itemWrap = qs("#item-buttons");
  const catKey = selected.cat, subKey = selected.subcat;
  if (!catKey || !subKey){ itemWrap.innerHTML = `<div class="muted">サブカテゴリを選んでください</div>`; return; }
  const items = DATASETS.categories[catKey].sub[subKey];
  itemWrap.innerHTML = items.map(i => `<button class="btn" data-val="${i}">${i}</button>`).join("");
  itemWrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#item-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.item = b.dataset.val || null;
  };
}

function renderPriceButtons(){
  const wrap = qs("#price-buttons");
  wrap.innerHTML = DATASETS.priceRanges.map(p => `<button class="btn" data-val="${p.id}">${p.label}</button>`).join("");
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#price-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.price = b.dataset.val || null;
  };
}

function renderCondButtons(){
  const wrap = qs("#cond-buttons");
  wrap.innerHTML = DATASETS.conditions.map(c => `<button class="btn" data-val="${c}">${c}</button>`).join("");
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#cond-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.cond = b.dataset.val || null;
  };
}

function renderRegionButtons(){
  const wrap = qs("#region-buttons");
  wrap.innerHTML = DATASETS.regions.map(r => `<button class="btn" data-val="${r}">${r}</button>`).join("");
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#region-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.region = b.dataset.val || null;
  };
}

function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(render, 60000);
}

// ===== データセット（省略）=====
const DATASETS = { /* 前回までの categories, brands, regions, priceRanges, conditions をここに */ };
