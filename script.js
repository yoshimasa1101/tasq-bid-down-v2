// ===== Reverse Auction MVP / script.js =====
// Version: 2025-10-02 stable_v4 (delegation + compact calendar)

// ===== ストレージキー =====
const STORAGE_KEY = "tasq_reverse_auction_requests_yahoo_v1";
const WATCH_KEY   = "tasq_reverse_auction_watch_v1";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v1";

let CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY);
if (!CLIENT_ID){
  CLIENT_ID = crypto.randomUUID?.() || (Date.now()+"-"+Math.random());
  localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
}

// ===== Yahoo!カテゴリ風データ =====
const DATASETS = {
  categories: {
    electronics: { name:"家電・AV・カメラ", sub:{
      "スマホ・携帯":["iPhone","Android","ガラケー"],
      "パソコン":["ノートPC","デスクトップ","周辺機器"],
      "カメラ":["デジタル一眼","ミラーレス","コンパクト"],
      "時計":["腕時計","置時計","壁掛け時計","ダイバーズウォッチ"]
    }},
    fashion: { name:"ファッション", sub:{
      "メンズ":["ジャケット","シャツ","パンツ","靴"],
      "レディース":["ワンピース","バッグ","アクセサリー","腕時計"],
      "ブランド別":["ナイキ","アディダス","シャネル","ルイヴィトン"]
    }},
    hobby: { name:"ホビー・カルチャー", sub:{
      "ゲーム":["本体","ソフト","周辺機器"],
      "トレカ":["ポケモンカード","遊戯王","MTG"],
      "フィギュア":["アニメ","ゲーム","特撮"]
    }},
    home: { name:"生活・住まい", sub:{
      "家具":["ベッド","ソファ","テーブル"],
      "家電":["冷蔵庫","洗濯機","掃除機"],
      "キッチン":["調理器具","食器","保存容器"]
    }}
  },
  brands: {
    electronics:["Apple","Audio-Technica","ASUS","Canon","CASIO","Citizen","Dell","HP","Lenovo","Nikon","Nintendo","Panasonic","Samsung","Seiko","Sony"],
    fashion:["Adidas","GU","Levi's","Nike","OMEGA","Rolex","Supreme","The North Face","Uniqlo","ZARA","シャネル","ルイヴィトン"],
    hobby:["Bandai","Good Smile","Kotobukiya","SEGA","Takara Tomy"],
    home:["IKEA","Iris Ohyama","Nitori","T-fal","Yamazen"]
  },
  regions:["全国","北海道","青森","岩手","宮城","秋田","山形","福島","茨城","栃木","群馬","埼玉","千葉","東京","神奈川","新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知","三重","滋賀","京都","大阪","兵庫","奈良","和歌山","鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知","福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"],
  priceRanges:[
    {id:"0-5000",label:"〜5,000円",min:0,max:5000},
    {id:"5000-10000",label:"5,000〜10,000円",min:5000,max:10000},
    {id:"10000-30000",label:"10,000〜30,000円",min:10000,max:30000},
    {id:"30000+",label:"30,000円以上",min:30000,max:null}
  ],
  conditions:["新品","中古（良品）","中古（可）","ジャンク"]
};

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

  // モーダル
  qs("#open-create").addEventListener("click", () => { showModal(true); initCalendars(); renderBrands(); });
  qs("#cancel-create").addEventListener("click", () => showModal(false));
  qs("#submit-create").addEventListener("click", onSubmitCreate);

  // 並び替え・検索
  qs("#sort-select").addEventListener("change", render);
  qs("#search-input").addEventListener("input", throttle(render, 200));

  // JSON入出力
  qs("#export-json").addEventListener("click", exportJSON);
  qs("#import-json").addEventListener("click", importJSON);

  // ページング
  qs("#prev-page").addEventListener("click", () => { if(page>1){ page--; render(); } });
  qs("#next-page").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredRequests().length / PAGE_SIZE));
    if(page<totalPages){ page++; render(); }
  });

  // ブランド検索補助
  const bs = qs("#brand-search");
  if (bs) bs.addEventListener("input", throttle(renderBrands, 150));

  // イベント委譲（カード内のウォッチ・レスポンス切替）
  qs("body").addEventListener("click", (e)=>{
    const t = e.target;
    if (t.id && t.id.startsWith("watch-")){
      const id = t.id.replace("watch-","");
      toggleWatch(id);
    }
    if (t.id && t.id.startsWith("toggle-resp-")){
      const id = t.id.replace("toggle-resp-","");
      const el = qs(`#resp-${id}`);
      if (el){
        el.classList.toggle("hidden");
        t.textContent = el.classList.contains("hidden") ? "レスポンスを表示" : "レスポンスを隠す";
      }
    }
  });

  startTick();
});

// ===== UIレンダリング =====
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

function renderBrands(){
  const brandWrap = qs("#brand-buttons"); if (!brandWrap) return;
  const catKey = selected.cat;
  const term = (qs("#brand-search")?.value || "").trim().toLowerCase();
  let brands = catKey ? (DATASETS.brands[catKey] || []) : [];
  if (term) brands = brands.filter(b => b.toLowerCase().includes(term));
  brands.sort((a,b)=>a.localeCompare(b,"ja"));
  brandWrap.innerHTML = brands.length
    ? brands.map(b => `<button class="btn" data-val="${b}">${b}</button>`).join("")
    : `<div class="muted">カテゴリ選択で候補表示／補助検索も可</div>`;
  brandWrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#brand-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.brand = b.dataset.val || null;
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

// ===== 作成送信 =====
function onSubmitCreate(){
  const title = (qs("#title-input")?.value || "").trim();
  const startDate = qs("#start-date")?.value; const startTime = qs("#start-time")?.value;
  const endDate   = qs("#end-date")?.value;   const endTime   = qs("#end-time")?.value;

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
    category: selected.cat, subcategory: selected.subcat, item: selected.item,
    brand: selected.brand || null, condition: selected.cond || null, region: selected.region || "全国",
    desiredMin: priceInfo.min, desiredMax: priceInfo.max,
    startAt, endAt, watchCount: 0, ownerId: CLIENT_ID, thumb: "", responses: []
  };

  requests.unshift(newReq);
  saveRequests();
  showModal(false);
  clearSelections();
  render();
}

// ===== カレンダー（コンパクト＆初期化）=====
let startCalMonth = new Date();
let endCalMonth = new Date();

function initCalendars(){
  updateCalLabel("start-label", startCalMonth);
  updateCalLabel("end-label", endCalMonth);
  drawCalendar("start-calendar", startCalMonth, setStartDate);
  drawCalendar("end-calendar",   endCalMonth,   setEndDate);

  qs("#start-prev").onclick = ()=>{ startCalMonth = addMonths(startCalMonth,-1); updateCalLabel("start-label", startCalMonth); drawCalendar("start-calendar", startCalMonth, setStartDate); };
  qs("#start-next").onclick = ()=>{ startCalMonth = addMonths(startCalMonth, 1); updateCalLabel("start-label", startCalMonth); drawCalendar("start-calendar", startCalMonth, setStartDate); };
  qs("#end-prev").onclick   = ()=>{ endCalMonth   = addMonths(endCalMonth, -1);  updateCalLabel("end-label", endCalMonth);   drawCalendar("end-calendar", endCalMonth, setEndDate); };
  qs("#end-next").onclick   = ()=>{ endCalMonth   = addMonths(endCalMonth, 1);   updateCalLabel("end-label", endCalMonth);   drawCalendar("end-calendar", endCalMonth, setEndDate); };

  const today = toDateStr(new Date());
  setStartDate(today);
  setEndDate(today);
}

function setStartDate(dateStr){ const el = qs("#start-date"); if (el) el.value = dateStr; selectCalendarDay("start-calendar", dateStr); }
function setEndDate(dateStr){ const el = qs("#end-date"); if (el) el.value = dateStr; selectCalendarDay("end-calendar", dateStr); }

function updateCalLabel(id, date){ const el = qs("#"+id); if (el) el.textContent = `${date.getFullYear()}年 ${date.getMonth()+1}月`; }

function drawCalendar(containerId, monthDate, onPick){
  const c = qs("#"+containerId); if (!c) return;
  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const first = new Date(year, month, 1), startDay = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const headers = ["日","月","火","水","木","金","土"];
  let html = headers.map(h=>`<div class="header">${h}</div>`).join("");
  for(let i=0;i<startDay;i++) html += `<div></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const weekday = (startDay + d - 1) % 7;
    const cls = ["day"]; if (weekday===0) cls.push("sunday"); if (weekday===6) cls.push("saturday");
    html += `<div class="${cls.join(" ")}" data-date="${dateStr}">${d}</div>`;
  }
  c.innerHTML = html;
  c.onclick = (e)=>{ const d = e.target.closest(".day"); if (!d) return; onPick(d.dataset.date); };
}

function selectCalendarDay(containerId, dateStr){
  qsa(`#${containerId} .day`).forEach(el=> el.classList.toggle("selected", el.dataset.date===dateStr));
}

function addMonths(date, delta){ const d = new Date(date); d.setMonth(d.getMonth()+delta); return d; }
function toDateStr(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function applyQuickDeadline(kind){
  const addMap = {today:0,"3days":3,"1week":7,"1month":30};
  const now = new Date(); const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()+(addMap[kind]??0));
  setEndDate(toDateStr(end));
}

// ===== 一覧レンダリング・ソート・フィルタ =====
function filteredRequests(){
  const term = qs("#search-input").value.trim().toLowerCase();
  let arr = requests.slice();
  if (term) arr = arr.filter(r => (r.title||"").toLowerCase().includes(term));
  switch(qs("#sort-select").value){
    case "newest":   arr.sort((a,b)=> new Date(b.startAt) - new Date(a.startAt)); break;
    case "lowest":   arr.sort((a,b)=> (a.desiredMin??0) - (b.desiredMin??0)); break;
    case "deadline": arr.sort((a,b)=> new Date(a.endAt) - new Date(b.endAt)); break;
    case "bestOffer":arr.sort((a,b)=> (bestOfferPrice(a)??Infinity) - (bestOfferPrice(b)??Infinity)); break;
    case "popular":  arr.sort((a,b)=> (b.watchCount||0) - (a.watchCount||0)); break;
  }
  return arr;
}

function render(){
  const list = qs("#list");
  const arr = filteredRequests();
  const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  page = Math.min(page, totalPages);
  const startIdx = (page-1)*PAGE_SIZE;
  const pageArr = arr.slice(startIdx, startIdx + PAGE_SIZE);

  qs("#page-info").textContent = `${page} / ${totalPages}`;
  list.innerHTML = pageArr.map(r => cardHTML(r)).join("");
}

function cardHTML(r){
  const desired = priceLabel(r.desiredMin, r.desiredMax);
  const countdown = countdownText(r.endAt);
  const best = bestOfferPrice(r);
  const badges = [
    r.brand ? `ブランド: ${r.brand}` : null,
    r.condition ? `状態: ${r.condition}` : null,
    r.region ? `地域: ${r.region}` : null,
    desired ? `希望価格: ${desired}` : null
  ].filter(Boolean);
  const watchActive = isWatching(r.id);
  const respList = r.responses || [];
  const bestId = bestOfferId(r);

  return `
  <article class="m-card">
    <img class="m-thumb" alt="" src="${r.thumb || ""}" />
    <div class="m-body">
      <div class="m-title">${escapeHTML(r.title || r.item || "未設定")}</div>
      <div class="m-badges">${badges.map(b=>`<span class="badge">${escapeHTML(b)}</span>`).join("")}</div>
      <div class="m-countdown ${countdown.cls}">${countdown.text}</div>
      <div class="m-price">${best!=null ? `最安オファー: ${formatJPY(best)}` : "オファー未着"}</div>
      <div class="m-badges">
        <button id="watch-${r.id}" class="btn ${watchActive?"btn-primary":""}">ウォッチ${watchActive?"中":""}（${r.watchCount||0}）</button>
        <button id="toggle-resp-${r.id}" class="btn btn-secondary">レスポンスを表示</button>
      </div>
      <div id="resp-${r.id}" class="response-list hidden">
        ${respList.length ? respList.map(x=>`
          <div class="response-card ${x.id===bestId?"best":""}">
            <div class="response-meta">ベンダー: ${escapeHTML(x.vendor||"匿名")} ／ オファー: ${formatJPY(x.offerPrice)} ／ 納期: ${escapeHTML(x.leadTime||"—")}</div>
            ${x.comment?`<div class="response-comment">${escapeHTML(x.comment)}</div>`:""}
          </div>
        `).join("") : `<div class="muted">まだレスポンスはありません</div>`}
      </div>
    </div>
  </article>`;
}

// ===== ウォッチ機能 =====
function toggleWatch(id){
  const r = requests.find(x=>x.id===id);
  if (isWatching(id)){
    watchSet.delete(id); if (r) r.watchCount = Math.max(0,(r.watchCount||0)-1);
  } else {
    watchSet.add(id); if (r) r.watchCount = (r.watchCount||0)+1;
  }
  saveWatch(); saveRequests(); render();
}
function isWatching(id){ return watchSet.has(id); }

// ===== カウントダウン =====
function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(()=>{ render(); }, 1000*30); // 30秒更新（負荷軽減）
}
function countdownText(endAt){
  const now = new Date(), end = new Date(endAt), diff = end - now;
  if (diff <= 0) return {text:"期限切れ", cls:"expired"};
  const days = Math.floor(diff/86400000);
  const hours = Math.floor((diff%86400000)/3600000);
  const mins = Math.floor((diff%3600000)/60000);
  const urgent = diff < 86400000;
  return {text:`残り ${days}日 ${hours}時間 ${mins}分`, cls: urgent ? "urgent" : ""};
}

// ===== ユーティリティ =====
function bestOfferPrice(r){
  if (!r.responses || !r.responses.length) return null;
  return Math.min(...r.responses.map(x=>x.offerPrice).filter(n=>typeof n==="number"));
}
function bestOfferId(r){ const best = bestOfferPrice(r); if (best==null) return null; const hit = r.responses.find(x=>x.offerPrice===best); return hit?hit.id:null; }
function priceLabel(min,max){
  if (min==null && max==null) return "";
  if (min!=null && max!=null) return `${formatJPY(min)}〜${formatJPY(max)}`;
  if (min!=null) return `${formatJPY(min)}以上`;
  return `${formatJPY(max)}以下`;
}
function formatJPY(n){ if (n==null) return "—"; return `¥${n.toLocaleString("ja-JP")}`; }
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ===== ストレージ =====
function loadRequests(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedRequests();
    const arr = JSON.parse(raw);
    return Array.isArray(arr)?arr:seedRequests();
  }catch(e){ return seedRequests(); }
}
function saveRequests(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(requests)); }
function seedRequests(){
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()+3, 23, 59);
  return [{
    id:"seed-1", title:"iPhone 13 128GB（ブルー）",
    category:"electronics", subcategory:"スマホ・携帯", item:"iPhone",
    brand:"Apple", condition:"中古（良品）", region:"北海道",
    desiredMin:20000, desiredMax:45000,
    startAt:now.toISOString(), endAt:end.toISOString(),
    watchCount:3, ownerId:CLIENT_ID, thumb:"",
    responses:[
      {id:"resp-1", vendor:"A社", offerPrice:39800, leadTime:"3日", comment:"バッテリー85%、外装Aランク"},
      {id:"resp-2", vendor:"B社", offerPrice:42000, leadTime:"当日発送", comment:"SIMフリー、動作確認済み"}
    ]
  }];
}
function loadWatch(){
  try{
    const raw = localStorage.getItem(WATCH_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr)?arr:[]);
  }catch(e){ return new Set(); }
}
function saveWatch(){ localStorage.setItem(WATCH_KEY, JSON.stringify([...watchSet])); }

// ===== JSON入出力 =====
function exportJSON(){
  const blob = new Blob([JSON.stringify(requests,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "reverse_auction_requests.json"; a.click();
  URL.revokeObjectURL(url);
}
function importJSON(){
  const input = document.createElement("input"); input.type = "file"; input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    try{
      const text = await file.text(); const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("配列ではありません");
      requests = arr; saveRequests(); render(); alert("JSONの読み込みが完了しました");
    }catch{ alert("JSONの形式が不正です"); }
  }; input.click();
}

// ===== モーダル =====
function showModal(show){
  const m = qs("#create-modal"); if (!m) return;
  if (show){ m.classList.remove("hidden"); }
  else { m.classList.add("hidden"); }
}

// ===== ヘルパ =====
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return [...document.querySelectorAll(sel)]; }
function throttle(fn, wait){
  let t=0; return (...args)=>{ const now=Date.now(); if (now-t>=wait){ t=now; fn(...args); } };
}
