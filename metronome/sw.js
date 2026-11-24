// 찬양팀 메트로놈 오프라인 지원
// - 앱 화면 파일: 네트워크 우선, 끊기면 저장해 둔 사본
// - 음성 파일(voices-m*.js 남성, voices-f*.js 여성)·글꼴: 저장해 둔 사본 우선(바뀔 때는 파일 이름을 바꾼다)
//   음성은 앱 버전과 따로 VOICE_CACHE에 둬서, 앱을 고칠 때마다 수 MB를 다시 받지 않게 한다.
//   남성(기본)은 설치할 때 미리 받고, 여성은 고른 사람만 처음 쓸 때 받아 둔다.
// - Supabase(노래 데이터)는 여기서 다루지 않는다. 앱이 기기에 따로 저장한다.
const CACHE = "metronome-v12";
const VOICE_CACHE = "metronome-voices";
const VOICES = ["voices-m2.js", "voices-f2.js"];          // 지금 쓰는 음성 파일. 여기 없는 옛 파일은 지운다
const SHELL = ["./", "index.html", "supabase.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
const isVoice = p => /\/voices-[a-z]\d+\.js$/.test(p);

self.addEventListener("install", e => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(c => c.addAll(SHELL)),
    caches.open(VOICE_CACHE).then(c => c.match(VOICES[0]).then(hit => hit || c.add(VOICES[0]))),
  ]).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("metronome-") && k !== CACHE && k !== VOICE_CACHE).map(k => caches.delete(k))))
    .then(() => caches.open(VOICE_CACHE))
    .then(c => c.keys().then(reqs => Promise.all(reqs
      .filter(r => !VOICES.some(f => new URL(r.url).pathname.endsWith("/" + f)))
      .map(r => c.delete(r)))))
    .then(() => self.clients.claim()));
});
const put = (name, req, r) => { if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(name).then(c => c.put(req, copy)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.hostname.endsWith("supabase.co")) return;
  const font = /fonts\.(googleapis|gstatic)\.com/.test(u.hostname);
  if (u.origin !== location.origin && !font) return;
  if (font || isVoice(u.pathname)) {
    const name = font ? CACHE : VOICE_CACHE;
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => put(name, req, r))));
    return;
  }
  e.respondWith(
    fetch(req).then(r => put(CACHE, req, r))
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
