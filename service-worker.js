const CACHE_NAME = "pitahaya-cache-v1";
const ASSETS = ["index.html","style.css","app.js","db.js","export.js","manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))); });
self.addEventListener("fetch", e => { e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request))); });