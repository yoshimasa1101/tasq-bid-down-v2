// ===== 日本の祝日データ（2025年版） =====
const HOLIDAYS_2025 = {
  "2025-01-01":"元日","2025-01-13":"成人の日","2025-02-11":"建国記念の日",
  "2025-02-23":"天皇誕生日","2025-02-24":"振替休日","2025-03-20":"春分の日",
  "2025-04-29":"昭和の日","2025-05-03":"憲法記念日","2025-05-04":"みどりの日",
  "2025-05-05":"こどもの日","2025-05-06":"振替休日","2025-07-21":"海の日",
  "2025-08-11":"山の日","2025-09-15":"敬老の日","2025-09-23":"秋分の日",
  "2025-10-13":"スポーツの日","2025-11-03":"文化の日","2025-11-23":"勤労感謝の日",
  "2025-11-24":"振替休日"
};

// ===== カレンダー生成 =====
function renderCalendar(containerId, year, month, inputId){
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const date = new Date(year, month-1, 1);
  const firstDay = date.getDay();
  const lastDate = new Date(year, month, 0).getDate();

  // ヘッダー
  const header = document.createElement("div");
  header.textContent = `${year}年${month}月`;
  header.className = "header";
  header.style.gridColumn = "span 7";
  container.appendChild(header);

  // 曜日
  ["日","月","火","水","木","金","土"].forEach(d => {
    const el = document.createElement("div");
    el.textContent = d;
    el.className = "header";
    container.appendChild(el);
  });

  // 空白
  for(let i=0;i<firstDay;i++){
    const blank = document.createElement("div");
    container.appendChild(blank);
  }

  // 日付
  for(let d=1; d<=lastDate; d++){
    const day = document.createElement("div");
    const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    day.textContent = d;
    day.className = "day";

    const dow = new Date(year, month-1, d).getDay();
    if (dow===0) day.classList.add("sunday");
    if (dow===6) day.classList.add("saturday");
    if (HOLIDAYS_2025[dateStr]) day.classList.add("holiday");

    day.addEventListener("click", () => {
      document.querySelectorAll(`#${containerId} .day`).forEach(el => el.classList.remove("selected"));
      day.classList.add("selected");
      document.getElementById(inputId).value = dateStr;
    });

    container.appendChild(day);
  }
}

// ===== クイック締切 =====
function setupQuickDeadline(){
  document.querySelectorAll(".qdl").forEach(btn => {
    btn.addEventListener("click", () => {
      const now = new Date();
      let target = new Date(now);
      if (btn.dataset.dl==="today") target.setHours(23,59,0,0);
      if (btn.dataset.dl==="3days") target.setDate(now.getDate()+3);
      if (btn.dataset.dl==="1week") target.setDate(now.getDate()+7);
      if (btn.dataset.dl==="1month") target.setMonth(now.getMonth()+1);
      document.getElementById("end-date").value = target.toISOString().split("T")[0];
      document.getElementById("end-time").value = `${String(target.getHours()).padStart(2,"0")}:${String(target.getMinutes()).padStart(2,"0")}`;
    });
  });
}

// ===== カウントダウン表示 =====
function formatCountdown(deadline){
  const dl = new Date(deadline);
  const now = new Date();
  const diff = dl - now;
  if (
