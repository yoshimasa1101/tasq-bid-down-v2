// ===== 設定 =====
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const USE_DB = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const STORAGE_KEY = "tasq_reverse_auction_requests_v7";
const WATCH_KEY = "tasq_reverse_auction_watch_v5";
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

// ===== 通知許可リクエスト =====
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

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
        // 通知（ウォッチ中のみ）
        if (isWatched(target.id)) {
          showNotification("新しいオファー", `${target.title} に新しいレスポンスが届きました`);
        }
      }
    })
    .subscribe();

  supabase.channel('public:watchers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'watchers' }, async () => {
      await refreshWatchCounts();
      render();
    })
    .subscribe();
}

// ===== カウントダウン通知チェック =====
function startTick(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    updateCountdowns();
    checkDeadlineNotifications();
  }, 1000);
}

function updateCountdowns(){
  document.querySelectorAll(".m-countdown").forEach(el => {
    const dl = el.getAttribute("data-deadline");
    const txt = formatCountdown(dl);
    el.textContent = txt.text;
    el.classList.toggle("expired", txt.expired);
    el.classList.toggle("urgent", txt.urgent);
  });
}

// ===== 期限通知 =====
let notifiedDeadlines = new Set();
function checkDeadlineNotifications(){
  const now = new Date();
  requests.forEach(r => {
    if (!isWatched(r.id)) return;
    const dl = new Date(r.deadline.replace(/\//g,"-")+"T23:59:59");
    const diff = dl - now;
    if (diff > 0 && diff < 86400000 && !notifiedDeadlines.has(r.id)) {
      showNotification("期限が近づいています", `${r.title} の期限は24時間以内です`);
      notifiedDeadlines.add(r.id);
    }
  });
}

// ===== 通知表示 =====
function showNotification(title, body){
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

// ===== カウントダウン表示 =====
function formatCountdown(deadline){
  const dl = new Date(deadline.replace(/\//g,"-")+"T23:59:59");
  const now = new Date();
  const diff = dl - now;
  if (diff <= 0) return { text: "期限切れ", expired: true };
  const d = Math.floor(diff/86400000);
  const h = Math.floor(diff%86400000/3600000);
  const m = Math.floor(diff%3600000/60000);
  const s = Math.floor(diff%60000/1000);
  const text = `残り ${d}日 ${h}時間 ${m}分 ${s}秒`;
  const urgent = diff < 86400000;
  return { text, expired:false, urgent };
}

// ===== 以下、前回版の処理（投稿・保存・描画・ウォッチ・アップロード等）は同じ =====
// （UI改善版のコードをそのまま残してください）
