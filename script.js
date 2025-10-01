// ===== 設定 =====
const SUPABASE_URL = "";           // 例: https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "";      // 例: anon public key
const USE_DB = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const STORAGE_KEY = "tasq_reverse_auction_requests_v6";
const WATCH_KEY = "tasq_reverse_auction_watch_v4";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v1";
const UPLOAD_BUCKET = "uploads";

let supabase = null;
if (USE_DB) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== クライアントID =====
let CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY);
if (!CLIENT_ID){
  CLIENT_ID = crypto.randomUUID?.() || (Date.now()+"-"+Math.random());
  localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
}

// ===== 状態 =====
let requests = [];
let watchSet = loadWatchSafely();
let page = 1;
let tickTimer = null;
let watchCounts = new Map();

// ===== 初期化 =====
init();

async function init(){
  requests = await loadAll();
  refreshCategoryOptions(requests);
  await refreshWatchCounts();
  render();
  startTick();
  if (USE_DB) subscribeRealtime();
}

// ===== Realtime購読 =====
function subscribeRealtime(){
  // responsesのINSERTを監視
  supabase.channel('public:responses')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, payload => {
      const res = payload.new;
      const target = requests.find(r => r.id === res.request_id);
      if (target){
        target.responses.unshift(res);
        render();
      }
    })
    .subscribe();

  // watchersのINSERT/DELETEを監視
  supabase.channel('public:watchers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'watchers' }, async () => {
      await refreshWatchCounts();
      render();
    })
    .subscribe();
}

// ===== 以下、前回版の処理（投稿・保存・描画・ウォッチ・アップロード等）は同じ =====
// （省略せずに全て残してください。違いは「subscribeRealtime()」が追加された点のみ）
