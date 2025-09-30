let allItems = [];

// CSVファイル選択イベント
document.getElementById("fileInput").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      allItems = results.data;
      populateCategories(allItems);
      renderItems("all");
    }
  });
});

// カテゴリ選択イベント
document.getElementById("categorySelect").addEventListener("change", function(e) {
  renderItems(e.target.value);
});

// カテゴリ一覧をプルダウンに反映
function populateCategories(data) {
  const select = document.getElementById("categorySelect");
  const categories = [...new Set(data.map(item => item.category))];
  select.innerHTML = `<option value="all">すべて</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

// 商品カードを描画
function renderItems(category) {
  const container = document.querySelector(".items");
  container.innerHTML = "";

  const filtered = category === "all"
    ? allItems
    : allItems.filter(item => item.category === category);

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <h3>${item.name}</h3>
      <p>${item.brand} - ¥${item.price}</p>
      <img src="${item.image}" alt="${item.name}">
      <p>${item.description}</p>
    `;
    container.appendChild(card);
  });
}
