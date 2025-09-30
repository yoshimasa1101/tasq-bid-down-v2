const CSV_PATH = './auction_data.csv';

const statusEl = document.getElementById('status');
const listEl = document.getElementById('product-list');
const categorySelect = document.getElementById('category-select');

main().catch(err => showError(`初期化に失敗しました: ${err.message}`));

async function main() {
  showStatus('データ読み込み中...');
  const rows = await fetchCsv(CSV_PATH);
  if (!rows.length) {
    showError('CSVにデータがありません。');
    return;
  }

  const columns = normalizeColumns(rows[0]);
  const items = rows.slice(1).map(r => toItem(r, columns)).filter(Boolean);

  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  populateCategories(categories);

  render(items);

  categorySelect.addEventListener('change', () => {
    const val = categorySelect.value;
    const filtered = val === 'all' ? items : items.filter(i => i.category === val);
    render(filtered);
  });

  showStatus(`読み込み完了：${items.length}件`);
}

function showStatus(msg) { statusEl.textContent = msg; }
function showError(msg) { statusEl.textContent = msg; statusEl.style.color = 'red'; }

function populateCategories(categories) {
  categorySelect.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
  for (const c of categories) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  }
}

async function fetchCsv(path) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let text = await res.text();
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    return lines.map(parseCsvLine);
  } catch (e) {
    showError(`データの読み込みに失敗しました (${e.message})`);
    return [];
  }
}

function parseCsvLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim()); cur = '';
    } else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function normalizeColumns(headerRow) {
  const header = headerRow.map(h => h.toLowerCase().trim());
  const idxCategory = header.indexOf('category') !== -1 ? header.indexOf('category') : header.indexOf('category_name');
  const idxName = header.indexOf('name') !== -1 ? header.indexOf('name') : header.indexOf('item_name');
  const idxPrice = header.indexOf('price');
  if (idxCategory === -1 || idxName === -1 || idxPrice === -1) throw new Error('CSVヘッダーが不正です');
  return { idxCategory, idxName, idxPrice };
}

function toItem(row, columns) {
  try {
    const category = row[columns.idxCategory]?.trim();
    const name = row[columns.idxName]?.trim();
    const price = Number(row[columns.idxPrice]?.replace(/[^\d.-]/g, ''));
    if (!category || !name || Number.isNaN(price)) return null;
    return { category, name, price };
  } catch { return null; }
}

function render(items) {
  listEl.innerHTML = '';
  if (!items.length) {
    listEl.innerHTML = '<div class="product"><div class="meta">該当する商品がありません。</div></div>';
    return;
  }
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'product';
    card.innerHTML = `
      <h3>${escapeHtml(item.name)}</h3>
      <div class="meta">カテゴリ: ${escapeHtml(item.category)}</div>
      <div class="price">¥${item.price.toLocaleString()}</div>
    `;
    listEl.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
}
