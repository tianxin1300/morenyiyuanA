/* 患者页离线缓存：页面「先给缓存、后台更新」，医院配置「先联网、4 秒不通再用缓存」。只缓存本站的 index 和 config。 */
const V = 'companion-sw-2026.10.26';
const key = u => { const p = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname; return new Request(u.origin + p); };
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
    const r = e.request, u = new URL(r.url);
    if (r.method !== 'GET' || u.origin !== self.origin) return;
    const isCfg = /\/config\/[^/]+\.json$/.test(u.pathname), isPage = r.mode === 'navigate' || /\/index\.html$/.test(u.pathname);
    if (!isCfg && !isPage) return;
    const k = key(u);
    if (isPage) {
        e.respondWith(caches.open(V).then(async c => {
            const hit = await c.match(k);
            const net = fetch(r).then(res => { if (res.ok) c.put(k, res.clone()); return res; });
            if (hit) { e.waitUntil(net.catch(() => 0)); return hit; }
            return net;
        }));
    } else {
        e.respondWith(caches.open(V).then(async c => {
            const key2 = new Request(u.origin + u.pathname);
            const net = fetch(r).then(res => { if (res.ok) c.put(key2, res.clone()); return res; });
            const to = new Promise((_, rej) => setTimeout(rej, 4000));
            try { return await Promise.race([net, to]); }
            catch (err) { const hit = await c.match(key2); if (hit) { e.waitUntil(net.catch(() => 0)); return hit; } return net; }
        }));
    }
});
