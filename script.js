// ===== Reverse Auction MVP / script.js =====
// Version: 2025-10-03 full_complete
// 検索・並び替え・リセット・ブランドあかさたな順・細分化価格帯・届け先別送料・依頼側/提供側画像6枚・JSON入出力・簡易カレンダー・カード合計表示

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
    fashion:["Adidas","GU","Levi's","Nike","OMEGA","Rolex","Supreme","The North Face","Uniqlo","ZARA","シャネル","ルイヴィトン","ナイキ"],
    hobby:["Bandai","Good Smile","Kotobukiya","SEGA","Takara Tomy"],
    home:["IKEA","Iris Ohyama","Nitori","T-fal","Yamazen"]
  },
  regions:["全国","北海道","青森","岩手","宮城","秋田","山形","福島","茨城","栃木","群馬","埼玉","千葉","東京","神奈川","新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知","三重","滋賀","京都","大阪","兵庫","奈良","和歌山","鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知","福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"],
  // 価格帯（細分化）
  priceRanges: [
    {id:"0-1000", label:"〜1,000円", min:0, max:1000},
    {id:"1000-3000", label:"1,000〜3,000円", min:1000, max:3000},
    {id:"3000-5000", label:"3,000〜5,000円", min:3000, max:5000},
    {id:"5000-7000", label:"5,000〜7,000円", min:5000, max:7000},
    {id:"7000-10000", label:"7,000〜10,000円", min:7000, max:10000},
    {id:"10000-15000", label:"10,000〜15,000円", min:10000, max:15000},
    {id:"15000-20000", label:"15,000〜20,000円", min:15000, max:20000},
    {id:"20000-30000", label:"20,000〜30,000円", min:20000, max:30000},
    {id:"30000-50000", label:"30,000〜50,000円", min:30000, max:50000},
    {id:"50000+", label:"50,000円以上", min:50000, max:null}
  ],
  conditions:["新品","中古（良品）","中古（可）","ジャンク"],
  shippingZones:["全国","北海道","東北","関東","中部","近畿","中国","四国","九州","沖縄・離島"]
};

// ===== 状態 =====
let requests = loadRequests();
let watchSet = loadWatch();
let page = 1;
const PAGE_SIZE = 12;
let tickTimer = null;

let selectedDest = "全国";

// ===== 選択状態（モーダル内）=====
let selected = { cat:null, subcat:null, item:null, brand:null, price:null, cond:null, region:null };
let reqImages = [];   // 依頼側画像（最大6）
let offerImages = []; // 提供側画像（最大6）
let offeringReqId = null; // どのリクエストへオファーするか

// ===== DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
  renderCategoryButtons();
  renderPriceButtons();
  renderCondButtons();
  renderRegionButtons();
  render();

  // モーダル（依頼側）
  qs("#open-create").addEventListener("click", () => { showModal("#create-modal", true); initCalendars(); renderBrands(); });
  qs("#cancel-create").addEventListener("click", () => showModal("#create-modal", false));
  qs("#submit-create").addEventListener("click", onSubmitCreate);

  // 画像プレビュー（依頼側）
  const reqImgInput = qs("#req-images");
  const reqImgPreview = qs("#req-image-preview");
  if (reqImgInput) {
    reqImgInput.addEventListener("change", ()=>{
      const files = Array.from(reqImgInput.files).slice(0,6);
      reqImages = files;
      reqImgPreview.innerHTML = "";
      files.forEach(file=>{
        const reader = new FileReader();
        reader.onload = e=>{
          const img = document.createElement("img");
          img.src = e.target.result;
          reqImgPreview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // オファーモーダル（提供側）
  qs("#offer-cancel").addEventListener("click", () => { offeringReqId=null; offerImages=[]; showModal("#offer-modal", false); });
  qs("#offer-submit").addEventListener("click", onSubmitOffer);

  const offerImgInput = qs("#offer-images");
  const offerImgPreview = qs("#offer-image-preview");
  if (offerImgInput) {
    offerImgInput.addEventListener("change", ()=>{
      const files = Array.from(offerImgInput.files).slice(0,6);
      offerImages = files;
      offerImgPreview.innerHTML = "";
      files.forEach(file=>{
        const reader = new FileReader();
        reader.onload = e=>{
          const img = document.createElement("img");
          img.src = e.target.result;
          offerImgPreview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // 並び替え・検索・届け先
  const sortEl = qs("#sort-select"); if (sortEl) sortEl.addEventListener("change", render);
  const searchEl = qs("#search-input"); if (searchEl) searchEl.addEventListener("input", render);
  const destEl = qs("#dest-select"); if (destEl) destEl.addEventListener("change", ()=>{ selectedDest = destEl.value; render(); });

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
  qs(".header-controls").appendChild(resetBtn);
  resetBtn.addEventListener("click", ()=>{
    clearSelections();
    showModal("#create-modal", false);
    page = 1;
    selectedDest = "全国";
    const destEl2 = qs("#dest-select"); if (destEl2) destEl2.value = "全国";
    render();
  });

  startTick();
});

// ===== 作成送信（依頼側）=====
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

  const shipPolicyType   = qs("#ship-policy-type")?.value || "flat";
  const shipBaseFee      = parseInt(qs("#ship-base-fee")?.value || "0", 10);
  const shipZones = {
    "北海道": parseInt(qs("#ship-zone-hokkaido")?.value || "0", 10),
    "東北": parseInt(qs("#ship-zone-tohoku")?.value || "0", 10),
    "関東": parseInt(qs("#ship-zone-kanto")?.value || "0", 10),
    "中部": parseInt(qs("#ship-zone-chubu")?.value || "0", 10),
    "近畿": parseInt(qs("#ship-zone-kinki")?.value || "0", 10),
    "中国": parseInt(qs("#ship-zone-chugoku")?.value || "0", 10),
    "四国": parseInt(qs("#ship-zone-shikoku")?.value || "0", 10),
    "九州": parseInt(qs("#ship-zone-kyushu")?.value || "0", 10),
    "沖縄・離島": parseInt(qs("#ship-zone-okinawa")?.value || "0", 10)
  };
  const shipFreeThreshold = parseInt(qs("#ship-free-threshold")?.value || "0", 10);
  const shipFeeIfBelow    = parseInt(qs("#ship-fee-if-below")?.value || "0", 10);

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

  // 画像をDataURLで保存（MVP）
  const reqImageDataUrls = [];
  for (const file of reqImages.slice(0,6)) {
    // 同期変換用のFileReaderは非同期なので、MVPではObjectURLで代替
    const url = URL.createObjectURL(file);
    reqImageDataUrls.push(url);
  }

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
    shippingPolicy: {
      type: shipPolicyType,
      baseFee: shipBaseFee,
      zones: shipZones,
      freeThreshold: shipFreeThreshold,
      feeIfBelow: shipFeeIfBelow
    },
    watchCount: 0,
    ownerId: CLIENT_ID,
    thumb: "",
    images: reqImageDataUrls, // 依頼側画像
    responses: []             // 提供側オファー
  };

  requests.unshift(newReq);
  saveRequests();
  showModal("#create-modal", false);
  clearSelections();
  render();
}

// ===== オファー送信（提供側）=====
function onSubmitOffer(){
  if (!offeringReqId) return alert("対象リクエストが選択されていません");
  const price = parseInt(qs("#offer-price")?.value || "0", 10);
  const ship  = parseInt(qs("#offer-ship-fee")?.value || "0", 10);
  const comment = qs("#offer-comment")?.value.trim() || "";
  if (!price || price<=0) return alert("オファー価格を入力してください");

  const imageUrls = [];
  for (const file of offerImages.slice(0,6)) {
    const url = URL.createObjectURL(file);
    imageUrls.push(url);
  }

  const resp = {
    id: crypto.randomUUID?.() || (Date.now()+"-"+Math.random()),
    price,
    shippingFee: ship,
    comment,
    images: imageUrls,
    sellerId: CLIENT_ID,
    createdAt: new Date().toISOString()
  };

  const target = requests.find(r => r.id === offeringReqId);
  if (!target) return alert("対象リクエストが見つかりません");
  target.responses.push(resp);
  saveRequests();
  offeringReqId = null;
  offerImages = [];
  showModal("#offer-modal", false);
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
    case "bestOffer":arr.sort((a,b)=> (bestOfferTotal(a)??Infinity) - (bestOfferTotal(b)??Infinity)); break;
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

  // カード内の「オファーする」ボタンにイベント付与
  list.querySelectorAll("[data-offer]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      offeringReqId = btn.dataset.offer;
      showModal("#offer-modal", true);
    });
  });
}

function cardHTML(r){
  const desired = priceLabel(r.desiredMin, r.desiredMax);
  const countdown = countdownText(r.endAt);
  const best = bestOfferPrice(r);
  const bestTotalCombined = bestOfferTotal(r);
  const totals = totalCostEstimate(r, selectedDest);

  const shipText = (totals.shipMin === totals.shipMax)
    ? `送料: ¥${totals.shipMin.toLocaleString()}（${selectedDest}）`
    : `送料: ¥${totals.shipMin.toLocaleString()}〜¥${totals.shipMax.toLocaleString()}（${selectedDest}）`;

  const totalText = (totals.minTotal === totals.maxTotal)
    ? `推定合計: ¥${totals.minTotal.toLocaleString()}`
    : `推定合計: ¥${totals.minTotal.toLocaleString()}〜¥${totals.maxTotal.toLocaleString()}`;

  const badges = [
    r.brand ? `ブランド: ${r.brand}` : null,
    r.condition ? `状態: ${r.condition}` : null,
    r.region ? `地域: ${r.region}` : null,
    r.quantity ? `数量: ${r.quantity}` : null,
    r.delivery ? `納期: ${r.delivery}` : null,
    r.payment ? `支払い: ${r.payment}` : null,
    r.warranty ? `保証: ${r.warranty}` : null,
    shipText,
    totalText,
    r.note ? `備考: ${r.note}` : null
  ].filter(Boolean);

  const galleryHTML = (r.images && r.images.length)
    ? `<div class="gallery">${r.images.map(src=>`<img src="${src}" alt="">`).join("")}</div>`
    : `<img src="${r.thumb||'https://placehold.co/400x300?text=No+Image'}" class="m-thumb" alt="">`;

  return `
    <div class="m-card">
      ${galleryHTML}
      <div class="m-body">
        <div class="m-title">${escapeHTML(r.title)}</div>
        <div class="m-price">
          希望価格: ${desired}
          ${best!=null ? ` <span class="best">（最安オファー ¥${best.toLocaleString()}${bestTotalCombined!=null ? ` / 合計 ¥${bestTotalCombined.toLocaleString()}`:""}）</span>` : ""}
        </div>
        <div class="m-countdown ${countdown.class}">${countdown.text}</div>
        <div class="m-badges">
          ${badges.map(b=>`<span class="badge">${escapeHTML(b)}</span>`).join("")}
        </div>
        <div>
          <button class="btn btn-primary" data-offer="${r.id}">このリクエストにオファーする</button>
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

// ===== 最安オファー（価格+送料合計も算出） =====
function bestOfferPrice(r){
  if (!r.responses?.length) return null;
  const prices = r.responses.map(x=>x.price).filter(x=>typeof x==="number" && x>=0);
  return prices.length ? Math.min(...prices) : null;
}
function bestOfferTotal(r){
  if (!r.responses?.length) return null;
  const totals = r.responses
    .map(x => (x.price||0) + (x.shippingFee||0))
    .filter(n => typeof n==="number");
  return totals.length ? Math.min(...totals) : null;
}

// ===== モーダル表示制御 =====
function showModal(sel, show){
  const modal = qs(sel); if (!modal) return;
  if (show) modal.classList.remove("hidden");
  else      modal.classList.add("hidden");
}

// ===== 選択クリア =====
function clearSelections(){
  selected = { cat:null, subcat:null, item:null, brand:null, price:null, cond:null, region:null };
  reqImages = [];
  qsa(".option-buttons .btn").forEach(b=>b.classList.remove("btn-primary"));
  if (qs("#title-input")) qs("#title-input").value = "";
  if (qs("#note-input")) qs("#note-input").value = "";
  const reqPrev = qs("#req-image-preview"); if (reqPrev) reqPrev.innerHTML = "";
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
  const start = calendarFactory({
    wrap: qs("#start-calendar"),
    label: qs("#start-label"),
    prev:  qs("#start-prev"),
    next:  qs("#start-next"),
    hiddenDate: qs("#start-date")
  });
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
  let y = today.getFullYear(), m = today.getMonth();
  function render(){
    if (!wrap || !label) return;
    label.textContent = `${y}年 ${m+1}月`;
    const first = new Date(y,m,1);
    const startWeek = first.getDay();
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

// ===== 送料計算と合計表示ロジック =====
function shippingCostFor(policy, dest){
  if (!policy) return 0;
  const d = dest || "全国";
  switch(policy.type){
    case "flat":
      return policy.baseFee || 0;
    case "zone":
      if (d in policy.zones && (policy.zones[d] || policy.zones[d] === 0)) {
        return policy.zones[d];
      }
      return policy.baseFee || 0;
    case "free-threshold":
      // 閾値判定は totalCostEstimate 側で
      return policy.feeIfBelow || 0;
    default:
      return 0;
  }
}
function totalCostEstimate(r, dest){
  const min = r.desiredMin ?? 0;
  const max = r.desiredMax ?? r.desiredMin ?? 0;
  const policy = r.shippingPolicy || null;
  let ship = shippingCostFor(policy, dest);

  if (policy?.type === "free-threshold"){
    const shipMin = (min >= (policy.freeThreshold||Infinity)) ? 0 : (policy.feeIfBelow||0);
    const shipMax = (max >= (policy.freeThreshold||Infinity)) ? 0 : (policy.feeIfBelow||0);
    return {
      minTotal: min + shipMin,
      maxTotal: (max || min) + shipMax,
      shipMin, shipMax
    };
  }
  return {
    minTotal: min + ship,
    maxTotal: (max || min) + ship,
    shipMin: ship,
    shipMax: ship
  };
}
