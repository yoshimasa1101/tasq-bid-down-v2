// ===== Auction System script.js =====
// Version: 2025-10-04 unified full
// 通常オークション: スタート価格〜即決価格
// 逆オークション: 提案カード方式

const STORAGE_KEY_REVERSE = "tasq_reverse_requests_v1";
const STORAGE_KEY_NORMAL  = "tasq_normal_listings_v1";

let requests = loadRequests(STORAGE_KEY_REVERSE);
let listings = loadRequests(STORAGE_KEY_NORMAL);
let offers   = []; // 逆オークション提案リスト

let page = 1;
const PAGE_SIZE = 12;
let viewMode = "reverse";
let reqImages = [];

let selected = { cond:null, region:null, brand:null, extra:null };

// ===== 価格帯ボタン =====
const PRICE_BUTTONS = [
  {id:"1000", label:"1,000円", value:1000},
  {id:"5000", label:"5,000円", value:5000},
  {id:"10000", label:"10,000円", value:10000},
  {id:"20000", label:"20,000円", value:20000},
  {id:"30000", label:"30,000円", value:30000},
  {id:"50000", label:"50,000円", value:50000},
  {id:"100000", label:"100,000円", value:100000}
];

// ===== 初期化 =====
document.addEventListener("DOMContentLoaded", () => {
  renderPriceButtons();
  setupButtonGroup("#cond-buttons","cond");
  setupButtonGroup("#region-buttons","region");
  setupButtonGroup("#brand-buttons","brand");
  setupButtonGroup("#extra-buttons","extra");
  render();

  qs("#mode-select").addEventListener("change", e=>{
    viewMode = e.target.value;
    page = 1;
    render();
  });

  qs("#open-create").addEventListener("click", ()=> showModal("#create-modal", true));
  qs("#cancel-create").addEventListener("click", ()=> showModal("#create-modal", false));
  qs("#submit-create").addEventListener("click", onSubmitCreate);

  const reqImgInput = qs("#req-images");
  const reqImgPreview = qs("#req-image-preview");
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
});

// ===== ボタン選択共通処理 =====
function setupButtonGroup(id, key){
  const wrap = qs(id);
  if(!wrap) return;
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if(!b) return;
    qsa(id+" .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    selected[key] = b.dataset.val;
  };
}

// ===== 価格帯ボタン描画 =====
function renderPriceButtons(){
  const wrap = qs("#price-buttons"); if (!wrap) return;
  wrap.innerHTML = PRICE_BUTTONS.map(p => 
    `<button class="btn" data-val="${p.value}">${p.label}</button>`
  ).join("");
  wrap.onclick = (e)=>{
    const b = e.target.closest("button.btn"); if (!b) return;
    qsa("#price-buttons .btn").forEach(x=>x.classList.remove("btn-primary"));
    b.classList.add("btn-primary");
    const val = parseInt(b.dataset.val,10);
    qs("#price-max").value = val;
  };
}

// ===== 投稿保存 =====
function onSubmitCreate(){
  const title = qs("#title-input").value.trim();
  const note  = qs("#note-input").value.trim();
  const priceMin = parseInt(qs("#price-min").value || "", 10);
  const priceMax = parseInt(qs("#price-max").value || "", 10);
  const desiredMin = !isNaN(priceMin) ? priceMin : null;
  const desiredMax = !isNaN(priceMax) ? priceMax : null;

  const imageUrls = reqImages.map(f=>URL.createObjectURL(f));

  const newItem = {
    id: Date.now()+"-"+Math.random(),
    title: title || "無題",
    desiredMin, desiredMax,
    cond: selected.cond,
    region: selected.region,
    brand: selected.brand,
    extra: selected.extra,
    note,
    images: imageUrls,
    bids: [],       // 通常オークション用
    responses: []   // 逆オークション用
  };

  if (viewMode==="reverse"){
    requests.unshift(newItem);
    saveRequests(STORAGE_KEY_REVERSE, requests);
  } else {
    listings.unshift(newItem);
    saveRequests(STORAGE_KEY_NORMAL, listings);
  }

  showModal("#create-modal", false);
  render();
}

// ===== 一覧表示 =====
function render(){
  const list = qs("#list");
  const arr = (viewMode==="reverse"?requests:listings);
  list.innerHTML = arr.map(r => cardHTML(r)).join("");
}

// ===== カードHTML =====
function cardHTML(r){
  const priceLabel = formatPrice(r.desiredMin, r.desiredMax);
  const img = (r.images && r.images.length)
    ? `<img src="${r.images[0]}" class="m-thumb">`
    : `<img src="https://placehold.co/400x300?text=No+Image" class="m-thumb">`;

  let extra = "";
  if (viewMode==="reverse"){
    extra = `<div class="m-note">提案数: ${r.responses.length}</div>`;
  } else {
    extra = `<div class="m-note">入札数: ${r.bids.length}</div>`;
  }

  return `
    <div class="m-card">
      ${img}
      <div class="m-body">
        <div class="m-title">${escapeHTML(r.title)}</div>
        <div class="m-price">価格: ${priceLabel}</div>
        <div class="m-badges">
          ${r.brand?`<span class="badge">ブランド:${r.brand}</span>`:""}
          ${r.cond?`<span class="badge">状態:${r.cond}</span>`:""}
          ${r.region?`<span class="badge">地域:${r.region}</span>`:""}
          ${r.extra?`<span class="badge">${r.extra}</span>`:""}
        </div>
        ${extra}
      </div>
    </div>
  `;
}

// ===== 入札処理（通常オークション） =====
function placeBid(itemId, amount){
  const item = listings.find(x=>x.id===itemId);
  if(!item) return;
  if(item.desiredMax && amount >= item.desiredMax){
    item.bids.push(amount);
    alert("即決価格に達しました！落札確定");
  } else {
    item.bids.push(amount);
  }
  saveRequests(STORAGE_KEY_NORMAL, listings);
  render();
}

// ===== 提案処理（逆オークション） =====
function addOffer(itemId, offer){
  const item = requests.find(x=>x.id===itemId);
  if(!item) return;
  item.responses.push(offer);
  saveRequests(STORAGE_KEY_REVERSE, requests);
  render();
}

// ===== ユーティリティ =====
function formatPrice(min,max){
  if(min!=null && max!=null) return `¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
  if(min!=null) return `¥${min.toLocaleString()}〜`;
  if(max!=null) return `〜¥${max.toLocaleString()}`;
  return "指定なし";
}

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function escapeHTML(str){ return str?str.replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])):""; }
function loadRequests(key){ return JSON.parse(localStorage.getItem(key)||"[]"); }
function saveRequests(key,arr){ localStorage.setItem(key, JSON.stringify(arr)); }
function show
