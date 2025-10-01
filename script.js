// ===== 設定 =====
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const USE_DB = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const STORAGE_KEY = "tasq_reverse_auction_requests_v6";
const WATCH_KEY = "tasq_reverse_auction_watch_v4";
const CLIENT_ID_KEY = "tasq_reverse_auction_client_id_v1";
const UPLOAD_BUCKET = "uploads";

let supabase = null;
if (USE_DB) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY);
if (!CLIENT_ID){
  CLIENT_ID = crypto.randomUUID?.() || (Date.now()+"-"+Math.random());
  localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
}

let requests = [];
let watchSet = loadWatchSafely();
let page = 1;
let tickTimer = null;
let watchCounts = new Map();

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

  supabase.channel('public:watchers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'watchers' }, async () => {
      await refreshWatchCounts();
      render();
    })
