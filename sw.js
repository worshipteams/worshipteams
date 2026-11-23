// 찬양팀 앱 오프라인 캐시
// 네트워크 우선. 인터넷이 끊기거나 GitHub 서버가 오류(5xx)를 내면 기기에 저장해 둔 앱을 대신 보여 준다.
const CACHE = 'worship-v7';
const SHELL = ['./', './index.html', './supabase.js', './dunggeunmiso-b.woff2', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('worship-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const fallback = req => caches.match(req, { ignoreSearch: true })
  .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') || caches.match('./') : null));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.pathname.includes('/metronome/')) return; // 메트로놈은 자체 sw.js가 맡는다
  e.respondWith((async () => {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(req, { signal: ctrl.signal });
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }
      if (res.status >= 500) { const c = await fallback(req); if (c) return c; }
      return res;
    } catch {
      const c = await fallback(req); if (c) return c;
      return new Response('오프라인입니다', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } finally { clearTimeout(t); }
  })());
});
