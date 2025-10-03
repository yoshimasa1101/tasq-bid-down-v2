// ===== Auction System script.js =====

const STORAGE_KEY_REVERSE = "tasq_reverse_requests_v1";
const STORAGE_KEY_NORMAL  = "tasq_normal_listings_v1";

let requests = loadRequests(STORAGE_KEY_REVERSE);
let listings = loadRequests(STORAGE_KEY_NORMAL);
let viewMode = "reverse";
let reqImages = [];
let selected = { cond:null, region:null, brand:null, extra:null };

const PRICE_BUTTONS = [
  {label:"1,000円", value:1000},
  {label:"5,000円", value:5000},
  {label:"10,000円", value:10000},
  {label:"20,000円", value:20000},
  {label:"30,000円", value:30000},
  {label:"50,000円", value:50000},
  {label:"100,000円", value:100000}
];

document.addEventListener("DOMContentLoaded", () => {
  renderPriceButtons();
  setupButtonGroup("#cond-buttons","cond");
  setupButtonGroup("#region-buttons","region");
  setupButtonGroup("#brand-buttons","brand");
  setupButtonGroup("#extra-buttons","extra");
  render();

  qs("#mode-select").addEventListener("change", e=>{
    viewMode = e.target.value;
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
    bids: [],
    responses: []
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

// ===== 一覧描画（簡易版） =====
function render(){
  const list = qs("#list");
  const arr = (viewMode==="reverse"?requests:listings);
  list.innerHTML = arr.map(r => cardHTML(r)).join("");
}

function cardHTML(r){
  const priceLabel = formatPrice(r.desiredMin, r.desiredMax);
  const img = (r.images && r.images.length)
    ? `<img src="${r.images[0]}" class="m-thumb">`
    : `<img src="https://placehold.co/400x300?text=No+Image" class="m-thumb">`;

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
      </div>
    </div>
  `;
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

// ===== モーダル表示切替 =====
function showModal(sel, show){
  const el = qs(sel);
  if(!el) return;
  if(show){
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}
