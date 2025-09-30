// LocalStorageキー
const STORAGE_KEY = "reverseAuctionRequests";

// 要素取得
const requestForm = document.getElementById("request-form");
const requestTitle = document.getElementById("request-title");
const requestDesc = document.getElementById("request-desc");
const requestList = document.getElementById("request-list");

// データ読み込み
let requests = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// 初期描画
renderRequests();

// リクエスト投稿処理
requestForm.addEventListener("submit", e => {
  e.preventDefault();
  const newRequest = {
    id: Date.now(),
    title: requestTitle.value.trim(),
    desc: requestDesc.value.trim(),
    responses: []
  };
  requests.push(newRequest);
  save();
  renderRequests();
  requestForm.reset();
});

// レンダリング
function renderRequests() {
  requestList.innerHTML = "";
  requests.forEach(req => {
    const card = document.createElement("div");
    card.className = "request-card";
    card.innerHTML = `
      <h3>${escapeHtml(req.title)}</h3>
      <p>${escapeHtml(req.desc)}</p>
      <div class="response-list" id="responses-${req.id}">
        ${req.responses.map(r => `
          <div class="response-card">
            <strong>条件:</strong> ¥${r.price} <br>
            <span>${escapeHtml(r.comment)}</span>
          </div>
        `).join("")}
      </div>
      <form class="response-form" data-id="${req.id}">
        <input type="number" name="price" placeholder="提示価格 (円)" required>
        <textarea name="comment" placeholder="条件やコメント" required></textarea>
        <button type="submit">条件を提示</button>
      </form>
    `;
    requestList.appendChild(card);

    // 応答フォームのイベント
    const responseForm = card.querySelector(".response-form");
    responseForm.addEventListener("submit", e => {
      e.preventDefault();
      const price = responseForm.price.value;
      const comment = responseForm.comment.value;
      const target = requests.find(r => r.id == req.id);
      target.responses.push({ price, comment });
      save();
      renderRequests();
    });
  });
}

// 保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

// HTMLエスケープ
function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}
