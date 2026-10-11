const CACHE_NAME = "studymate-pwa-v2";
const APP_FILES = ["./", "./index.html", "./style.css", "./script.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  // API responses must always come from the live server, never the offline cache.
  if (new URL(event.request.url).pathname.startsWith("/api/")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});

// Handles push messages once a push service/backend is configured. This listener alone does not schedule deadline reminders.
self.addEventListener("push", event => {
  let data = { title: "StudyMate: Nhắc deadline", body: "Bạn có nhiệm vụ sắp đến hạn.", url: "./index.html" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "./icons/icon.svg", badge: "./icons/icon.svg", data: { url: data.url || "./index.html" } }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./index.html", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    for (const client of clients) if (client.url.startsWith(self.location.origin) && "focus" in client) return client.focus();
    if (self.clients.openWindow) return self.clients.openWindow(target);
  }));
});
