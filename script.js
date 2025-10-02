// ===== Reverse Auction MVP / script.js =====
// Version: 2025-10-03 stable_v6
// 検索改善 + リセットボタン + ブランドあかさたな順グループ化

// ===== ストレージキー =====
const STORAGE_KEY = "tasq_reverse_auction_requests_yahoo_v1";
const WATCH_KEY   = "tasq_reverse_auction_watch_v1";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v1";

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
  qs("#search-input").addEventListener("input", render);

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
  if (bs) bs.addEventListener("input", renderBrands);

  // リセットボタン
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

// ===== ブランド表示（あかさたな順グループ化）=====
function renderBrands(){
  const brandWrap = qs("#brand-buttons"); if (!brandWrap) return;
  const catKey = selected.cat;
  const term = (qs("#brand-search")?.value || "").trim().toLowerCase();
  let brands = catKey ? (DATASETS.brands[catKey] || []) : [];
  if (term) brands = brands.filter(b => b.toLowerCase().includes(term));

  // ソート
  brands.sort((a,b)=>a.localeCompare(b,"ja"));

  // グループ化（あかさたな）
  const groups = {};
  brands.forEach(b=>{
    const head = b[0].toUpperCase();
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
    case "lowest":   arr
