// CSVを読み込んで商品一覧を表示する
fetch('./auction_data.csv')
  .then(response => response.text())
  .then(text => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');

    // CSVをオブジェクト配列に変換
    const products = lines.slice(1).map(line => {
      const cols = line.split(',');
      return {
        category: cols[0],
        name: cols[1],
        price: cols[2]
      };
    });

    // カテゴリ一覧を生成
    const categorySelect = document.getElementById('category');
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });

    // 商品一覧を表示する関数
    function renderList(filter) {
      const list = document.getElementById('product-list');
      list.innerHTML = '';
      products
        .filter(p => filter === 'all' || p.category === filter)
        .forEach(p => {
          const div = document.createElement('div');
          div.className = 'product';
          div.textContent = `${p.name} - ¥${p.price}`;
          list.appendChild(div);
        });
    }

    // 初期表示
    renderList('all');

    // カテゴリ変更時
    categorySelect.addEventListener('change', e => {
      renderList(e.target.value);
    });
  })
  .catch(err => {
    document.getElementById('product-list').textContent = 'データの読み込みに失敗しました。';
    console.error(err);
  });
