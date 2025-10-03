// ===== Auction System script.js =====
// Version: 2025-10-03 unified full
// 機能: 逆オークション / 通常オークション 両対応
// - 上限価格ボタン方式
// - 画像6枚添付
// - 検索・並び替え・JSON入出力
// - カード表示切替

// ===== ストレージキー =====
const STORAGE_KEY_REVERSE = "tasq_reverse_requests_v1";
const STORAGE_KEY_NORMAL  = "tasq_normal_listings_v1";

// ===== 状態 =====
let requests = loadRequests(STORAGE_KEY_REVERSE);
let listings = loadRequests(STORAGE_KEY_NORMAL);
let page = 1;
const PAGE_SIZE = 12;
let viewMode = "reverse"; // "reverse" or "normal"
let selectedDest = "全国";

// ===== 選択状態 =====
let selected = { cat:null, subcat:null, item:null, brand:null, price:null, cond:null, region:null };
let reqImages = [];

// ===== 価格ボタン定義 =====
const PRICE_BUTTONS = [
  {id:"1000", label:"1,000円", value:1000},
  {id:"5000", label:"5,000円", value:5000},
  {id:"10000", label:"10,000円", value:10000},
  {id:"20000", label:"20,000円", value:20000},
  {id:"30000", label:"30,000円", value:30000},
  {id:"50000", label:"50,000円", value:50000},
  {id:"100000", label:"100,000円", value:100000}
];

// ===== DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
  renderPriceButtons();
  render();

  // モード切替
  qs("#mode-select").addEventListener("change", e=>{
    viewMode = e.target.value;
    page = 1;
    render();
  });

  // 投稿モーダル
  qs("#open-create").addEventListener("click", ()=> showModal("#create-modal", true));
  qs("#cancel-create").addEventListener("click", ()=> showModal("#create-modal", false));
  qs("#submit-create").addEventListener("click", onSubmitCreate);

  // 画像プレビュー
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

  // 並び替え・検索・届け先
  qs("#sort-select").addEventListener("change", render);
  qs("#search-input").addEventListener("input", render);
  qs("#dest-select").addEventListener("change", e=>{ selectedDest = e.target.value; render(); });

  // JSON入出力
  qs("#export-json").addEventListener("click", exportJSON);
  qs("#import-json").addEventListener("click", importJSON);

  // ページング
  qs("#prev-page").addEventListener("click", ()=>{ if(page>1){ page--; render(); } });
  qs("#next-page").addEventListener("click", ()=>{
    const arr = filteredData();
    const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
    if(page<totalPages){ page++; render(); }
  });
});

// ===== 投稿保存 =====
function onSubmitCreate(){
  const title = qs("#title-input")?.value.trim() || "";
  const startDate= qs("#start-date")?.value || "";
  const startTime= qs("#start-time")?.value || "";
  const endDate  = qs("#end-date")?.value || "";
  const endTime  = qs("#end-time")?.value || "";
  const note     = qs("#note-input")?.value.trim() || "";

  if (!selected.price) return alert("希望価格を選んでください");
  if (!startDate || !startTime || !endDate || !endTime) return alert("開始・終了日時を入力してください");

  const startAt = `${startDate}T${startTime}`;
  const endAt   = `${endDate}T${endTime}`;
  if (new Date(endAt) <= new Date(startAt)) return alert("終了日時は開始日時より後にしてください");

  const imageUrls = reqImages.map(f=>URL.createObjectURL(f));

  const newItem = {
    id: crypto.randomUUID?.() || (Date.now()+"-"+Math.random()),
    title: title || "無題",
    category: selected.cat,
    subcategory: selected.subcat,
    item: selected.item,
    brand: selected.brand,
    condition: selected.cond,
    region: selected.region,
    desiredMax: selected.price,
    startAt, endAt,
    note,
    images: imageUrls,
    responses: [] // 逆オークション用
  };

  if (viewMode==="reverse"){
    requests.unshift(newItem);
    saveRequests(STORAGE_KEY_REVERSE, requests);
  } else {
    listings.unshift(newItem);
    saveRequests(STORAGE_KEY_NORMAL, listings);
  }

  showModal("#create-modal", false);
  clearSelections();
  render();
}

// ===== データ取得 =====
function filteredData(){
  const term = (qs("#search-input")?.value || "").trim().toLowerCase();
  let arr = (viewMode==="reverse" ? requests : listings).slice();

  if (term) {
    arr = arr.filter(r => {
      const fields = [r.title||"", r.item||"", r.brand||"", r.subcategory||""];
      return fields.some(f => f.toLowerCase().includes(term));
    });
  }

  switch(qs("#sort-select")?.value){
    case "newest":   arr.sort((a,b)=> new Date(b.startAt) - new Date(a.startAt)); break;
    case "lowest":   arr.sort((a,b)=> (a.desiredMax??0) - (b.desiredMax??0)); break;
    case "deadline": arr.sort((a,b)=> new Date(a.endAt) - new Date(b.endAt)); break;
    case "bestOffer":arr.sort((a,b)=> (bestOfferTotal(a)??Infinity) - (bestOfferTotal(b)??Infinity)); break;
    case "popular":  arr.sort((a,b)=> (b.responses?.length||0) - (a.responses?.length||0)); break;
  }
  return arr;
}

// ===== 一覧表示 =====
function render(){
  const list = qs("#list"); if (!list) return;
  const arr = filteredData();
  const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  page = Math.min(page, totalPages);
  const startIdx = (page-1)*PAGE_SIZE;
  const pageArr = arr.slice(startIdx, startIdx + PAGE_SIZE);

  qs("#page-info").textContent = `${page} / ${totalPages}`;
  list.innerHTML = pageArr.map(r => cardHTML(r)).join("");
}

function cardHTML(r){
  const countdown = countdownText(r.endAt);
  const priceText = r.desiredMax ? `〜¥${r.desiredMax.toLocaleString()}` : "指定なし";

  const galleryHTML = (r.images && r.images.length)
    ? `<div class="gallery">${r.images.map(src=>`<img src="${src}" alt="">`).join("")}</div>`
    : `<img src="https://placehold.co/400x300?text=No+Image" class="m-thumb" alt="">`;

  let extra = "";
  if (viewMode==="reverse"){
    const best = bestOfferTotal(r);
    extra = best!=null ? `<div class="m-price">最安オファー合計: ¥${best.toLocaleString()}</div>` : "";
  } else {
    extra = `<div class="m-price">希望販売価格: ${priceText}</div>`;
  }

  return `
    <div class="m-card">
      ${galleryHTML}
      <div class="m-body">
        <div class="m-title">${escapeHTML(r.title)}</div>
        <div class="m-price">希望価格: ${priceText}</div>
        ${extra}
        <div class="m-countdown ${countdown.class}">${countdown.text}</div>
        <div class="m-badges">
          ${r.brand?`<span class="badge">ブランド:${r.brand}</span>`:""}
          ${r.condition?`<span class="badge">状態:${r.condition}</span>`:""}
          ${r.region?`<span class="badge">地域
