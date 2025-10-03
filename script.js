// ===== Auction System script.js =====
// 手入力メイン＋価格帯ボタン補助

const STORAGE_KEY_REVERSE = "tasq_reverse_requests_v1";
const STORAGE_KEY_NORMAL  = "tasq_normal_listings_v1";

let requests = loadRequests(STORAGE_KEY_REVERSE);
let listings = loadRequests(STORAGE_KEY_NORMAL);
let page = 1;
const PAGE_SIZE = 12;
let viewMode = "reverse";
let reqImages = [];

const PRICE_BUTTONS = [
  {id:"1000", label:"1,000円", value:1000},
  {id:"5000", label:"5,000円", value:5000},
  {id:"10000", label:"10,000円", value:10000},
  {id:"20000", label:"20,000円", value:20000},
  {id:"30000", label:"30,000円", value:30000},
  {id:"50000", label:"50,000円", value:50000},
  {id:"100000", label:"100,000円", value:100000}
];

document.addEventListener("DOMContentLoaded", () => {
  renderPriceButtons();
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
    note,
    images: imageUrls,
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

function render(){
  const list = qs("#list");
  const arr = (viewMode==="reverse"?requests:listings);
  list.innerHTML = arr.map(r => cardHTML(r)).join("");
}

function cardHTML(r){
  return `
    <div class="m-card">
      ${(r.images && r.images.length)?`<img src="${r.images[0]}" class="m-thumb">`:`<img src="https://placehold.co/400x300?text=No+Image" class="m-thumb">`}
      <div class="m-body">
        <div class="m-title">${escapeHTML(r.title)}</div>
        <div class="m-price
