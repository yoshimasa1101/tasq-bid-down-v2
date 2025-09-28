// script.js
async function loadCSV() {
  const response = await fetch('auction_data.csv');
  const data = await response.text();

  // CSVを行ごとに分割
  const rows = data.trim().split('\n').map(r => r.split(','));

  // ヘッダーを除いたデータ部分
  const items = rows.slice(1);

  // 最安値を探す
  let minItem = items[0];
  for (let i = 1; i < items.length; i++) {
    if (parseInt(items[i][1]) < parseInt(minItem[1])) {
      minItem = items[i];
    }
  }

  // 結果を画面に表示
  document.getElementById('result').innerText =
    `最安値は ${minItem[0]}（${minItem[1]}円）です`;
}

loadCSV();

