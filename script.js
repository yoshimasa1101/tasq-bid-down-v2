async function loadCSV() {
  const response = await fetch('auction_data.csv');
  const data = await response.text();

  const rows = data.trim().split('\n').map(r => r.split(','));
  const items = rows.slice(1);

  const list = document.getElementById('bidders');
  list.innerHTML = "";
  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item[0]}</td>
      <td>${item[1]}円</td>
      <td><img src="${item[2]}" alt="${item[0]}"></td>
    `;
    list.appendChild(tr);
  });

  let minItem = items[0];
  for (let i = 1; i < items.length; i++) {
    if (parseInt(items[i][1]) < parseInt(minItem[1])) {
      minItem = items[i];
    }
  }

  document.getElementById('result').innerText =
    `落札値は「${minItem[0]}」で ${minItem[1]}円 です`;

  // 最安値の商品を強調表示
  const rowsInTable = document.querySelectorAll("#bidders tr");
  rowsInTable.forEach(tr => {
    if (tr.children[0].innerText === minItem[0] && tr.children[1].innerText.includes(minItem[1])) {
      tr.classList.add("highlight");
    }
  });

  window.auctionItems = items;
  window.minItem = minItem;
}

function submitBid() {
  const myBid = parseInt(document.getElementById('myBid').value);
  const myItem = document.getElementById('myItem').value;

  if (isNaN(myBid) || myItem.trim() === "") {
    document.getElementById('advice').innerText = "商品名と金額を入力してください。";
    return;
  }

  const avgPrice = window.auctionItems.reduce((sum, item) => sum + parseInt(item[1]), 0) / window.auctionItems.length;
  const minItem = window.minItem;

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

  const history = document.getElementById('history');
  const tr = document.createElement('tr');
  const now = new Date().toLocaleString();
  tr.innerHTML = `
    <td>あなた</td>
    <td>${myItem}</td>
    <td>${myBid}円</td>
    <td>${now}</td>
  `;
  history.appendChild(tr);
}

loadCSV();
