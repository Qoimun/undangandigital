const SHEET_URL = "https://script.google.com/macros/s/AKfycbz9kROyde8G2F-JKsW4M80K9kKo_ov0uASdkHQlHqpBlxPqKYiugzsuJPbqhXip30MJpQ/exec";

// Ambil elemen HTML sesuai ID di scan.html
const badgeBox = document.getElementById("badge");
const netStatus = document.getElementById("netStatus");

/* =========================
   FUNGSI UI & SOUND
========================= */
function badge(text, type) {
  badgeBox.innerText = text;
  badgeBox.className = type; // Menggunakan class dari CSS (success, duplicate, error)
  badgeBox.style.display = "block";
}

function playSound(type) {
  const audio = document.getElementById(type);
  if(audio) {
    audio.currentTime = 0;
    audio.play();
  }
}

/* =========================
   SIMPAN OFFLINE
========================= */
function simpanOffline(token) {
  let data = JSON.parse(localStorage.getItem("offline_scan") || "[]");
  // Cek duplikat di lokal agar tidak spam saat offline
  if (!data.some(item => item.token === token)) {
    data.push({ token, waktu: new Date().toISOString() });
    localStorage.setItem("offline_scan", JSON.stringify(data));
    badge("📴 Offline — Scan Disimpan", "offline");
    playSound("warning");
  } else {
    badge("⚠ QR ini sudah discan sebelumnya (Lokal)", "duplicate");
    playSound("warning");
  }
}

/* =========================
   SYNC DATA OFFLINE KE SERVER
========================= */
async function syncOffline() {
  let data = JSON.parse(localStorage.getItem("offline_scan") || "[]");
  if (data.length === 0) return;

  // Tampilkan status sedang sinkron
  badge("📡 Menyinkronkan data...", "offline");

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const res = await fetch(SHEET_URL, {
        method: "POST",
        mode: 'cors', // Gunakan cors untuk baca status
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          mode: "checkin",
          token: item.token
        })
      });
      await res.text();
    } catch (err) {
      console.error("Gagal sync item:", item.token);
    }
  }

  // Hapus queue jika semua selesai
  localStorage.removeItem("offline_scan");
  badge("📡 Data Offline Tersinkron!", "success");
  playSound("sukses");
}

/* =========================
   KIRIM SCAN KE SERVER
========================= */
async function sendScan(token) {
  try {
    const res = await fetch(SHEET_URL, {
      method: "POST",
      mode: 'cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        mode: "checkin",
        token: token
      })
    });

    const result = await res.text();

    if (result === "success") {
      badge("✔ HADIR (Berhasil)", "success");
      playSound("sukses");
    } else if (result === "duplicate") {
      badge("⚠ SUDAH CHECK-IN (Double)", "duplicate");
      playSound("warning");
    } else if (result === "notfound") {
      badge("❌ TIDAK DITEMUKAN", "error");
      playSound("error");
    } else {
      console.log("Respons lain:", result);
      badge("⚠ Error Server", "error");
    }

  } catch (error) {
    console.error("Error Scan:", error);
    badge("❌ Gagal Mengirim", "error");
    playSound("error");
  }
}

/* =========================
   HANDLER SAAT SCANNED
========================= */
async function onScanSuccess(token) {
  // Cek koneksi internet
  if (!navigator.onLine) {
    simpanOffline(token);
    return;
  }

  // Jika Online, kirim langsung
  await sendScan(token);
}

/* =========================
   LISTENER STATUS JARINGAN
========================= */
function updateNet(){
  netStatus.innerText = navigator.onLine ? "🔵 ONLINE" : "🔴 OFFLINE";
}
window.addEventListener("online", syncOffline);
window.addEventListener("online", updateNet);
window.addEventListener("offline", updateNet);
updateNet();

// Init Scanner
new Html5Qrcode("reader").start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  onScanSuccess
);
