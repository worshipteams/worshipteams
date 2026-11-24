// 찬양팀 메트로놈 오프라인 지원
// - 앱 화면 파일: 네트워크 우선, 끊기면 저장해 둔 사본
// - 음성 파일(voices-v*.js 남성, voices-f*.js 여성)·글꼴: 저장해 둔 사본 우선(바뀔 때는 파일 이름을 바꾼다)
// - Supabase(노래 데이터)는 여기서 다루지 않는다. 앱이 기기에 따로 저장한다.
const CACHE = "metronome-v4";
const SHELL = ["./", "index.html", "voices-v1.js", "voices-f1.js", "../supabase.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("metronome-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const put = (req, r) => { if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.hostname.endsWith("supabase.co")) return;
  const font = /fonts\.(googleapis|gstatic)\.com/.test(u.hostname);
  if (u.origin !== location.origin && !font) return;
  if (font || /\/voices-[a-z]\d+\.js$/.test(u.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
    return;
  }
  e.respondWith(
    fetch(req).then(r => put(req, r))
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
