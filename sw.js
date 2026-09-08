const CACHE='strategy-forge-0.7';
const ASSETS=['./','./index.html','./strategy_editor.html','./strategy_editor.js','./strategy_engine.js','./strategy_editor.css','./strategy_editor_extra.css','./assets/icons/icon-192x192.png','./assets/icons/icon-512x512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
