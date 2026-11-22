/* Light of Deen – Service Worker (v3) */
const VERSION = 'lod-v3';          // অ্যাপের ফাইল (index.html ইত্যাদি)
const DATA_CACHE = 'lod-data-v1';  // কুরআন/হাদিস/তাফসীরের ডেটা (আপডেটে মুছবে না)
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png',
  './profile.js', './firebase-config.js'];

// যেসব সাইটের ডেটা একবার দেখলে ফোনে জমা থাকবে
const DATA_HOSTS = [
  'api.alquran.cloud',
  'api.quran.com',
  'cdn.jsdelivr.net',
  'cdn.statically.io',
  'raw.githubusercontent.com'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION && k !== DATA_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ক্যাশে থাকলে সঙ্গে সঙ্গে দেখায়, পাশাপাশি নেট থাকলে নতুন কপি জমা করে রাখে
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
}

// আগে নেট (সর্বশেষ কোড পেতে), নেট না থাকলে ক্যাশ
function networkFirst(req) {
  return fetch(req).then(res => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;   // অডিও/ভিডিও সরাসরি নেট থেকে
  const url = new URL(req.url);

  // পেজ খোলা: আগে নেট, না থাকলে ক্যাশ করা অ্যাপ
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req, VERSION));
    return;
  }

  // কুরআন / হাদিস / তাফসীরের ডেটা (শুধু JSON, অডিও নয়)
  if (DATA_HOSTS.includes(url.hostname) && !/\.(mp3|mp4|ogg|wav|m4a)$/i.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // প্রোফাইল ও Firebase কনফিগ: আগে নেট (পরে বদলালে ভার্সন নম্বর না বাড়ালেও নতুনটা আসবে)
  if (url.origin === location.origin && /\/(profile|firebase-config)\.js$/.test(url.pathname)) {
    e.respondWith(networkFirst(req));
    return;
  }

  // নিজের সাইটের ফাইল: আগে ক্যাশ
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
  // বাকি সব (অডিও, বই খোঁজা, অনুবাদ, Firebase/Google লগইন ইত্যাদি): সরাসরি নেট
});
