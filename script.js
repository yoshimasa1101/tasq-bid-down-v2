let items = [];

function renderProducts(category = "すべて") {
  const container = document.getElementById("productList");
  container.innerHTML = "";

  const filtered = category === "すべて" ? items : items.filter(i => i.category === category);

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="card-content">
        <h3>${item.name}</h3>
        <p>ブランド: ${item.brand}</p>
        <p>価格: ${item.price}円</p>
        <input type="number" placeholder="入札金額" id="bid-${item.id}">
        <button onclick="placeBid('${item.id}')">入札する</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function placeBid(id) {
  const item = items.find(i => i.id === id);
  const bidValue = parseInt(document.getElementById(`bid-${id}`).value);
  if (isNaN(bidValue)) return alert("金額を入力してください");

  const now = new Date().toLocaleString();
  const entry = {
    bidder: "あなた",
    name: item.name,
    brand: item.brand,
    bid: bidValue,
    time: now
  };

  const history = JSON.parse(localStorage.getItem("bidHistory") || "[]");
  history.push(entry);
  localStorage.setItem("bidHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("bidHistory") || "[]");
  const tbody = document.getElementById("historyBody");
  tbody.innerHTML = "";
  history.forEach(entry => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.bidder}</td>
      <td>${entry.name}</td>
      <td>${entry.brand}</td>
      <td>${entry.bid}円</td>
      <td>${entry.time}</td>
    `;
    tbody.appendChild(tr);
  });
}

function parseCSV(text) {
  const rows = text.trim().split('\n').map(r => r.split(','));
  const headers = rows[0];
  const data = rows.slice(1);

  items = data.map((r, i) => ({
    id: "item" + i,
    category: r[0],
    brand: r[1],
    name: r[2],
    price: r[3],
    image: r[4]
  }));

  const categories = [...new Set(items.map(i => i.category))];
  const select = document.getElementById("categoryFilter");
  select.innerHTML = `<option value="すべて">すべて</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join("");
  select.onchange = () => renderProducts(select.value);

  renderProducts();
}

document.getElementById("csvUpload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    parseCSV(event.target.result);
  };
  reader.readAsText(file);
});

renderHistory();
