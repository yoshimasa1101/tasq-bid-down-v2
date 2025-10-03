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
function
