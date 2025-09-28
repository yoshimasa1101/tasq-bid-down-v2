async function loadCSV() {
  const response = await fetch('auction_data.csv');
  const data = await response.text();

  // CSVを行ごとに分割
  const rows = data.trim().split('\n').map(r => r.split(','));

  // ヘッダーを除いたデータ部分
  const items = rows.slice(1);

  // HTMLにリスト表示
  const list = document.getElementById('bidders');
  list.innerHTML = ""; // 初期化
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `Bidder ${item[0]}: ${item[1]}円`;
    list.appendChild(li);
  });

  // 最安値を探す
  let minItem = items[0];
  for (let i = 1; i < items.length; i++) {
    if (parseInt(items[i][1]) < parseInt(minItem[1])) {
      minItem = items[i];
    }
  }

  // 結果を画面に表示
  document.getElementById('result').innerText =
    `最安値は Bidder ${minItem[0]}（${minItem[1]}円）です`;

  // グローバル変数に保存（AIアドバイス用）
  window.auctionItems = items;
  window.minItem = minItem;
}

// 入札フォームからの入力を評価
function submitBid() {
  const myBid = parseInt(document.getElementById('myBid').value);
  if (isNaN(myBid)) {
    document.getElementById('advice').innerText = "金額を入力してください。";
    return;
  }

  const avgPrice = window.auctionItems.reduce((sum, item) => sum + parseInt(item[1]), 0) / window.auctionItems.length;
  const minItem = window.minItem;

  let advice = `あなたの入札は ${myBid}円です。`;
  advice += ` 平均価格は約 ${Math.round(avgPrice)}円、最安値は Bidder ${minItem[0]}（${minItem[1]}円）。`;

  if (myBid < minItem[1]) {
    advice += " 🎉 あなたの入札が新しい最安値です！";
  } else if (myBid < avgPrice) {
    advice += " 👍 平均より安く、妥当な入札です。";
  } else {
    advice += " 🤔 平均より高めなので、再検討をおすすめします。";
  }

  document.getElementById('advice').innerText = advice;
}

loadCSV();
