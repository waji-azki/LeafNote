// リーフノート : オフラインでも開けるようにするための Service Worker
const CACHE = 'leafnote-a6539c43';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Google のログイン・ドライブへの通信はキャッシュせず、そのまま通す
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('google.com')) return;

  // フォントは一度取れたら使い回す(取れなくても端末の書体で表示される)
  if (url.hostname.endsWith('gstatic.com') || url.hostname === 'fonts.googleapis.com') {
    e.respondWith(
      caches.open(CACHE + '-font').then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((res) => { c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // アプリ本体 : まずネット、だめならキャッシュ(更新をすぐ拾いつつ、圏外でも開ける)
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
  }
});
