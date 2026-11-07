importScripts("formController.js");

// Cambia la versión cada vez que subas cambios a los archivos de la PWA
const CACHE_NAME = "pitahaya-cache-v3";
const ASSETS = [
  "index.html",
  "style.css",
  "db.js",
  "questions.js",
  "formController.js",
  "export.js",
  "app.js",
  "manifest.json",
  "/media/images/logos/question.png",
  "./libs/js/xlsx.full.min.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Red primero, caché si no hay internet. Solo GET: los POST (envío de registros) no se cachean.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(sendPendingData());
  }
});