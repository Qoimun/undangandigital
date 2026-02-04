const SHEET_URL = "https://script.google.com/macros/s/AKfycbyI3EEgA9H601DWrKh8q9UygS3x0G6wb4ZTQr1BUjPQtKOs1U96egU7nhIkObxlMzcYMA/exec";
const statusBox = document.getElementById("status");

/* SIMPAN OFFLINE */
function simpanOffline(token) {
  let data = JSON.parse(localStorage.getItem("offline_scan") || "[]");
  data.push({ token, waktu: new Date().toISOString() });
  localStorage.setItem("offline_scan", JSON.stringify(data));
}

/* SYNC OFFLINE DATA */
function syncOffline() {
  let data = JSON.parse(localStorage.getItem("offline_scan") || "[]");
  if (data.length === 0) return;

  data.forEach((item) => {
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        mode: "scan",
        token: item.token,
      }),
    });
  });

  localStorage.removeItem("offline_scan");
  statusBox.innerHTML = "📡 Data offline tersinkron";
}

/* LISTENER ONLINE */
window.addEventListener("online", syncOffline);

/* SCAN QR */
function onScanSuccess(token) {
  if (!navigator.onLine) {
    simpanOffline(token);
    statusBox.innerHTML = "📴 Offline — scan disimpan";
    statusBox.className = "status warn";
    return;
  }

  fetch(SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({
      mode: "scan",
      token: token,
    }),
  });

  statusBox.innerHTML = "✅ Scan diterima";
  statusBox.className = "status ok";
}

new Html5Qrcode("reader").start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  onScanSuccess
);


