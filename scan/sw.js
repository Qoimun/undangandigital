const CACHE_NAME = "scan-offline-v1";
const FILES = [
  "./scan.html",
  "./scan.js",
  "./manifest.json",
  "https://unpkg.com/html5-qrcode",
  "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg",
  "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
  "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES)));
});

self.addEventListener("fetch", (e)=>{
  e.respondWith(caches.match(e.request).then(res=>res || fetch(e.request)));
});
