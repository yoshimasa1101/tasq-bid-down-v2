async function loadCSV() {
  const response = await fetch('auction_data.csv');
  const data = await response.text();

  // CSVを行ごとに分割
  const rows = data.trim().split('\n').map(r => r.split(','));

  // ヘッダーを除いたデータ部分
  const items = rows.slice(1);

  // HTMLにリスト表示
  const list = document.getElementById('bidders');
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
}

loadCSV();
