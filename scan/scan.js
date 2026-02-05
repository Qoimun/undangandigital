/* =========================
   CONFIG
========================= */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9kROyde8G2F-JKsW4M80K9kKo_ov0uASdkHQlHqpBlxPqKYiugzsuJPbqhXip30MJpQ/exec";
const scannedKey = "scannedTokens";
const offlineKey = "offlineQueue";

let locked = false;

const badgeBox = document.getElementById("badge");
const statusBox = document.getElementById("status");
const netStatus = document.getElementById("netStatus");
const progressBar = document.querySelector("#progress div");

/* =========================
   LOCAL STORAGE
========================= */
function getStore(key){ return JSON.parse(localStorage.getItem(key)||"[]"); }
function setStore(key,val){ localStorage.setItem(key,JSON.stringify(val)); }

/* =========================
   UI + SOUND + VIBRATE
========================= */
function showBadge(text,type){
  badgeBox.innerText=text;
  badgeBox.className=type+" show";
  setTimeout(()=>badgeBox.classList.remove("show"),2000);
}
function showStatus(text,type){
  statusBox.innerText=text;
  statusBox.className=type+" show";
  setTimeout(()=>statusBox.classList.remove("show"),2000);
}
function playSound(id){ const audio=document.getElementById(id); if(audio){ audio.currentTime=0; audio.play(); } }
function vibrate(ms){ navigator.vibrate?.(ms); }
function startProgress(){ progressBar.parentElement.style.display="block"; progressBar.style.width="0%"; setTimeout(()=>progressBar.style.width="100%",50); }
function endProgress(){ setTimeout(()=>{ progressBar.parentElement.style.display="none"; progressBar.style.width="0%"; },400); }

/* =========================
   NETWORK STATUS
========================= */
function updateNet(){ netStatus.innerText = navigator.onLine ? "🔵 ONLINE" : "🔴 OFFLINE"; }
window.addEventListener("online",()=>{ updateNet(); syncOfflineQueue(); });
window.addEventListener("offline", updateNet);
updateNet();

/* =========================
   SYNC OFFLINE QUEUE
========================= */
async function syncOfflineQueue(){
  if(!navigator.onLine) return;
  const queue = getStore(offlineKey);
  if(queue.length===0) return;

  for(let token of queue){
    try{
      await fetch(SCRIPT_URL,{ method:"POST", body:new URLSearchParams({mode:"checkin", token}) });
    }catch(e){ console.error("Gagal sync token:", token); }
  }

  setStore(offlineKey,[]);
  showStatus("📡 Data Offline Tersinkron!","status ok");
  playSound("sukses");
}

/* =========================
   KIRIM SCAN KE SERVER
========================= */
async function sendScan(token){
  startProgress();
  try{
    const res = await fetch(SCRIPT_URL,{
      method:"POST",
      body: new URLSearchParams({ mode:"checkin", token })
    });
    const result = await res.text();
    endProgress();

    if(result==="success"){ showBadge("✔ HADIR","success"); showStatus("✔ HADIR (Berhasil)","status ok"); playSound("sukses"); vibrate(150); }
    else if(result==="duplicate"){ showBadge("⚠ SUDAH CHECK-IN","duplicate"); showStatus("⚠ SUDAH CHECK-IN (Double)","status warn"); playSound("warning"); vibrate(400); }
    else{ showBadge("❌ TIDAK DITEMUKAN","error"); showStatus("❌ TIDAK DITEMUKAN","status err"); playSound("error"); vibrate([200,100,200]); }
  }catch(err){
    endProgress();
    console.error("Error Scan:", err);
    showBadge("❌ OFFLINE","offline");
    showStatus("📴 Offline — Scan Disimpan","status warn");
    playSound("offline");
    saveOffline(token);
  }
}

/* =========================
   SIMPAN OFFLINE
========================= */
function saveOffline(token){
  const queue = getStore(offlineKey);
  if(!queue.includes(token)){
    queue.push(token);
    setStore(offlineKey,queue);
    showBadge("✔ HADIR (OFFLINE)","offline");
    playSound("offline");
    vibrate(150);
  }else{
    showBadge("⚠ DUPLIKAT (OFFLINE)","duplicate");
    playSound("warning");
    vibrate(400);
  }
}

/* =========================
   HANDLER SCAN
========================= */
async function onScanSuccess(token){
  if(locked) return;
  locked=true;

  let scanned = getStore(scannedKey);
  if(scanned.includes(token)){
    showBadge("⚠ DUPLIKAT (LOKAL)","duplicate");
    playSound("warning");
    vibrate(400);
    locked=false;
    return;
  }
  scanned.push(token);
  setStore(scannedKey,scanned);

  if(navigator.onLine) await sendScan(token);
  else saveOffline(token);

  setTimeout(()=>locked=false,2500);
}

/* =========================
   INIT SCANNER
========================= */
new Html5Qrcode("reader").start(
  { facingMode: "environment" },
  { fps:10, qrbox:250 },
  onScanSuccess
);
