// ===== Reverse Auction MVP / script.js =====
// Version: 2025-10-03 stable_full
// 検索改善＋リセット＋ブランドあかさたな順＋その他項目保存＋表示＋JSON入出力＋簡易カレンダー

// ===== ストレージキー =====
const STORAGE_KEY   = "tasq_reverse_auction_requests_yahoo_v1";
const WATCH_KEY     = "tasq_reverse_auction_watch_v1";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v1";

// ===== クライアント識別 =====
let CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY);
if (!CLIENT_ID){
  CLIENT_ID = crypto.randomUUID?.() || (Date.now()+"-"+Math.random());
  localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
}

// ===== データセット =====
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

// ===== 選択状態（モーダル内）=====
let selected = { cat:null, subcat:null, item:null, brand:null, price:null, cond:null, region:null };

// ===== DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
  // 初期レンダリング
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
  const sortEl = qs("#sort-select"); if (sortEl) sortEl.addEventListener("change", render);
  const searchEl = qs("#search-input"); if (searchEl) searchEl.addEventListener("input", render);

  // JSON入出力
  qs("#export-json").addEventListener("click", exportJSON);
  qs("#import-json").addEventListener("click", importJSON);

  // ページング
  qs("#prev-page").addEventListener("click", () => { if(page>1){ page--; render(); } });
  qs("#next-page").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredRequests().length / PAGE_SIZE));
    if(page<totalPages){ page++; render(); }
  });

  // ブランド補助検索
  const bs = qs("#brand-search");
  if (bs) bs.addEventListener("input", renderBrands);

  // リセットボタン（ヘッダー右）
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "リセット";
  resetBtn.className = "btn btn-secondary";
  resetBtn.style.marginLeft = "8px";
  qs(".header div:last-child").appendChild(resetBtn);
  resetBtn.addEventListener("click", ()=>{
    clearSelections();
    showModal(false);
    page = 1;
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
    thumb: "", // 画像未指定時のダミー
    responses: [] // 出品者からのオファーを将来追加
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

// ===== 検索・並び替え =====
function filteredRequests(){
  const term = (qs("#search-input")?.value || "").trim().toLowerCase();
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

  switch(qs("#sort-select")?.value){
    case "newest":   arr.sort((a,b)=> new Date(b.startAt) - new Date(a.startAt)); break;
    case "lowest":   arr.sort((a,b)=> (a.desiredMin??0) - (b.desiredMin??0)); break;
    case "deadline": arr.sort((a,b)=> new Date(a.endAt) - new Date(b.endAt)); break;
    case "bestOffer":arr.sort((a,b)=> (bestOfferPrice(a)??Infinity) - (bestOfferPrice(b)??Infinity)); break;
    case "popular":  arr.sort((a,b)=> (b.watchCount||0) - (a.watchCount||0)); break;
    default:         arr.sort((a,b)=> new Date(b.startAt) - new Date(a.startAt)); break;
  }
  return arr;
}

// ===== 一覧表示 =====
function render(){
  const list = qs("#list"); if (!list) return;
  const arr = filteredRequests();
  const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  page = Math.min(page, totalPages);
  const startIdx = (page-1)*PAGE_SIZE;
  const pageArr = arr.slice(startIdx, startIdx + PAGE_SIZE);

  const pageInfo = qs("#page-info"); if (pageInfo) pageInfo.textContent = `${page} / ${totalPages}`;
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
    r.quantity ? `数量: ${r.quantity}` : null,
    r.delivery ? `納期: ${r.delivery}` : null,
    r.payment ? `支払い: ${r.payment}` : null,
    r.warranty ? `保証: ${r.warranty}` : null,
    r.note ? `備考: ${r.note}` : null
  ].filter(Boolean);

  return `
    <div class="m-card">
      <img src="${r.thumb||'https://placehold.co/400x300?text=No+Image'}" class="m-thumb" alt="">
      <div class="m-body">
        <div class="m-title">${escapeHTML(r.title)}</div>
        <div class="m-price">希望価格: ${desired}${best!=null ? `（最安オファー ¥${best.toLocaleString()}）` : ""}</div>
        <div class="m-countdown ${countdown.class}">${countdown.text}</div>
        <div class="m-badges">
          ${badges.map(b=>`<span class="badge">${escapeHTML(b)}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

// ===== 価格ラベル =====
function priceLabel(min,max){
  if (min!=null && max!=null) return `¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
  if (min!=null) return `¥${min.toLocaleString()}〜`;
  if (max!=null) return `〜¥${max.toLocaleString()}`;
  return "指定なし";
}

// ===== カウントダウン =====
function countdownText(endAt){
  const now = Date.now();
  const end = new Date(endAt).getTime();
  const diff = end - now;
  if (isNaN(end)) return {text:"終了日時未設定",class:""};
  if (diff<=0) return {text:"期限切れ",class:"expired"};
  const hours = Math.floor(diff/3600000);
  if (hours<24) return {text:`残り${hours}時間`,class:"urgent"};
  const days = Math.floor(hours/24);
  return {text:`残り${days}日`,class:""};
}

// ===== 最安オファー（将来拡張用） =====
function bestOfferPrice(r){
  if (!r.responses?.length) return null;
  const prices = r.responses.map(x=>x.price).filter(x=>typeof x==="number");
  return prices.length ? Math.min(...prices) : null;
}

// ===== モーダル表示制御 =====
function showModal(show){
  const modal = qs("#create-modal"); if (!modal) return;
  if (show) modal.classList.remove("hidden");
  else      modal.classList.add("hidden");
}

// ===== 選択クリア =====
function clearSelections(){
  selected = { cat:null, subcat:null, item:null, brand:null, price:null, cond:null, region:null };
  qsa(".option-buttons .btn").forEach(b=>b.classList.remove("btn-primary"));
  if (qs("#title-input")) qs("#title-input").value = "";
  if (qs("#note-input")) qs("#note-input").value = "";
}

// ===== ストレージ =====
function saveRequests(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(requests)); }
function loadRequests(){ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); }

function saveWatch(){ localStorage.setItem(WATCH_KEY, JSON.stringify([...watchSet])); }
function loadWatch(){ return new Set(JSON.parse(localStorage.getItem(WATCH_KEY)||"[]")); }

// ===== ユーティリティ =====
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

// ===== JSON入出力 =====
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
        if (Array.isArray(data)){ requests = data; saveRequests(); page=1; render(); }
        else alert("JSON形式が正しくありません");
      } catch(e){ alert("読み込みエラー"); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== カレンダー（簡易実装）=====
function initCalendars(){
  // 開始
  const start = calendarFactory({
    wrap: qs("#start-calendar"),
    label: qs("#start-label"),
    prev:  qs("#start-prev"),
    next:  qs("#start-next"),
    hiddenDate: qs("#start-date")
  });
  // 終了
  const end = calendarFactory({
    wrap: qs("#end-calendar"),
    label: qs("#end-label"),
    prev:  qs("#end-prev"),
    next:  qs("#end-next"),
    hiddenDate: qs("#end-date")
  });
  start.render(); end.render();
}

function calendarFactory({wrap,label,prev,next,hiddenDate}){
  const today = new Date();
  let y = today.getFullYear(), m = today.getMonth(); // 0-11
  function render(){
    if (!wrap || !label) return;
    label.textContent = `${y}年 ${m+1}月`;
    const first = new Date(y,m,1);
    const startWeek = first.getDay(); // 0 Sun
    const lastDay = new Date(y,m+1,0).getDate();

    const headers = ["日","月","火","水","木","金","土"].map(d=>`<div class="header">${d}</div>`).join("");
    const blanks = Array(startWeek).fill(`<div class="day blank"></div>`).join("");
    let daysHTML = "";
    for (let d=1; d<=lastDay; d++){
      const dateStr = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dow = new Date(y,m,d).getDay();
      const cls = ["day"];
      if (dow===0) cls.push("sunday");
      if (dow===6) cls.push("saturday");
      daysHTML += `<div class="${cls.join(" ")}" data-date="${dateStr}">${d}</div>`;
    }
    wrap.innerHTML = headers + blanks + daysHTML;

    wrap.querySelectorAll(".day[data-date]").forEach(el=>{
      el.addEventListener("click", ()=>{
        wrap.querySelectorAll(".selected").forEach(s=>s.classList.remove("selected"));
        el.classList.add("selected");
        if (hiddenDate) hiddenDate.value = el.dataset.date;
      });
    });
  }
  if (prev) prev.addEventListener("click", ()=>{ m--; if (m<0){ m=11; y--; } render(); });
  if (next) next.addEventListener("click", ()=>{ m++; if (m>11){ m=0; y++; } render(); });
  return {render};
}

// ===== カテゴリ・サブカテゴリ・項目 =====
function renderCategoryButtons(){
  const catWrap = qs("#cat-buttons"); if (!catWrap) return;
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
  const subWrap = qs("#subcat-buttons"); if (!subWrap) return;
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
  const itemWrap = qs("#item-buttons"); if (!itemWrap) return;
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

// ===== 価格帯・状態・地域 =====
function renderPriceButtons(){
  const wrap = qs("#price-buttons"); if (!wrap) return;
  wrap.innerHTML = DATASETS.priceRanges.map(p => `<button class="btn" data-val="${p.id}">${p.label}</button>`).join("");
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#price-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.price = b.dataset.val || null;
  };
}

function renderCondButtons(){
  const wrap = qs("#cond-buttons"); if (!wrap) return;
  wrap.innerHTML = DATASETS.conditions.map(c => `<button class="btn" data-val="${c}">${c}</button>`).join("");
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#cond-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.cond = b.dataset.val || null;
  };
}

function renderRegionButtons(){
  const wrap = qs("#region-buttons"); if (!wrap) return;
  wrap.innerHTML = DATASETS.regions.map(r => `<button class="btn" data-val="${r}">${r}</button>`).join("");
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#region-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected.region = b.dataset.val || null;
  };
}

// ===== タイマー =====
function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(render, 60000); // 1分ごと更新
}
