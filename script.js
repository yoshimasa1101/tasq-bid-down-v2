let auctionItems = [];
let minItem = null;

function parseCSV(text) {
  const rows = text.trim().split('\n').map(r => r.split(','));
  auctionItems = rows.slice(1);
  renderTable();
  findMin();
}

function renderTable() {
  const list = document.getElementById('bidders');
  list.innerHTML = "";
  auctionItems.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item[0]}</td>
      <td>${item[1]}円</td>
      <td><img src="${item[2]}" alt="${item[0]}" width="80"></td>
    `;
    list.appendChild(tr);
  });
}

function findMin() {
  minItem = auctionItems[0];
  for (let i = 1; i < auctionItems.length; i++) {
    if (parseInt(auctionItems[i][1]) < parseInt(minItem[1])) {
      minItem = auctionItems[i];
    }
  }
  document.getElementById('result').innerText =
    `落札値は「${minItem[0]}」で ${minItem[1]}円 です`;

  const rowsInTable = document.querySelectorAll("#bidders tr");
  rowsInTable.forEach(tr => {
    if (tr.children[0].innerText === minItem[0] && tr.children[1].innerText.includes(minItem[1])) {
      tr.classList.add("highlight");
    }
  });
}

function submitBid() {
  const myBid = parseInt(document.getElementById('myBid').value);
  const myItem = document.getElementById('myItem').value;

  if (isNaN(myBid) || myItem.trim() === "") {
    document.getElementById('advice').innerText = "商品名と金額を入力してください。";
    return;
  }

  const avgPrice = auctionItems.reduce((sum, item) => sum + parseInt(item[1]), 0) / auctionItems.length;

  let advice = `あなたの入札は ${myItem} に ${myBid}円です。`;
  advice += ` 平均価格は約 ${Math.round(avgPrice)}円、最安値は「${minItem[0]}」 (${minItem[1]}円)。`;

  if (myBid < minItem[1]) {
    advice += " 🎉 あなたの入札が新しい最安値です！";
  } else if (myBid < avgPrice) {
    advice += " 👍 平均より安く、妥当な入札です。";
  } else {
    advice += " 🤔 平均より高めなので、再検討をおすすめします。";
  }

  document.getElementById('advice').innerText = advice;

  const now = new Date().toLocaleString();
  const entry = {
    bidder: "あなた",
    item: myItem,
    bid: myBid,
    time: now
  };

  saveBid(entry);
  renderHistory();
}

function saveBid(entry) {
  const history = JSON.parse(localStorage.getItem("bidHistory") || "[]");
  history.push(entry);
  localStorage.setItem("bidHistory", JSON.stringify(history));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("bidHistory") || "[]");
  const table = document.getElementById('history');
  table.innerHTML = "";
  history.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.bidder}</td>
      <td>${entry.item}</td>
      <td>${entry.bid}円</td>
      <td>${entry.time}</td>
    `;
    table.appendChild(tr);
  });
}

document.getElementById('csvUpload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    parseCSV(event.target.result);
  };
  reader.readAsText(file);
});

// 初期読み込み
fetch('auction_data.csv')
  .then(res => res.text())
  .then(text => {
    parseCSV(text);
    renderHistory();
  });
