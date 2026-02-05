const SHEET_URL = "https://script.google.com/macros/s/AKfycbz9kROyde8G2F-JKsW4M80K9kKo_ov0uASdkHQlHqpBlxPqKYiugzsuJPbqhXip30MJpQ/exec";
const statusBox = document.getElementById("status");

/* =========================
   FUNGSI SUARA & VIBRASI
========================= */
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
  // Cek duplikat lokal agar data tidak spam
  if (!data.some(item => item.token === token)) {
    data.push({ token, waktu: new Date().toISOString() });
    localStorage.setItem("offline_scan", JSON.stringify(data));
    statusBox.innerHTML = "📴 Offline — Scan Disimpan";
    statusBox.className = "status warn";
    playSound("warning"); // Bunyi warning saat offline
  } else {
    statusBox.innerHTML = "⚠ QR ini sudah discan sebelumnya (Lokal)";
    statusBox.className = "status warn";
    playSound("duplicate");
  }
}

/* =========================
   SYNC DATA OFFLINE KE SERVER
========================= */
async function syncOffline() {
  let data = JSON.parse(localStorage.getItem("offline_scan") || "[]");
  if (data.length === 0) return;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const res = await fetch(SHEET_URL, {
        method: "POST",
        mode: 'cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          mode: "checkin",
          token: item.token
        })
      });
      await res.text(); // Tunggu respons (biar tidak race condition)
    } catch (err) {
      console.error("Gagal sync item:", item.token);
    }
  }

  // Hapus queue jika semua sukses
  localStorage.removeItem("offline_scan");
  statusBox.innerHTML = "📡 Data Offline Tersinkron!";
  statusBox.className = "status ok";
}

/* =========================
   KIRIM SCAN KE SERVER
========================= */
async function sendScan(token) {
  try {
    // Gunakan URLSearchParams (Wajib untuk doPost Google Script)
    const res = await fetch(SHEET_URL, {
      method: "POST",
      mode: 'cors', // Pakai cors untuk baca status (Success/Duplicate)
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        mode: "checkin", // <--- HARUS "checkin", bukan "scan"
        token: token
      })
    });

    const result = await res.text();

    // Handle Respons dari Server
    if (result === "success") {
      statusBox.innerHTML = "✔ HADIR (Berhasil)";
      statusBox.className = "status ok";
      playSound("sukses");
    } else if (result === "duplicate") {
      statusBox.innerHTML = "⚠ SUDAH CHECK-IN (Double)";
      statusBox.className = "status warn";
      playSound("warning");
    } else if (result === "notfound") {
      statusBox.innerHTML = "❌ TIDAK DITEMUKAN";
      statusBox.className = "status err";
      playSound("error");
    } else {
      console.log("Respons lain:", result);
      statusBox.innerHTML = "⚠ Error Server";
    }

  } catch (error) {
    console.error("Error Scan:", error);
    statusBox.innerHTML = "❌ Gagal Mengirim";
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
window.addEventListener("online", syncOffline);

// Init Scanner
new Html5Qrcode("reader").start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  onScanSuccess
);







