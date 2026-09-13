const CACHE='strategy-forge-0.8';
const ASSETS=['./','./index.html','./strategy_editor.html','./strategy_editor.js?v=0.8-text-code','./strategy_ai.js?v=0.8','./strategy_engine.js?v=0.5','./strategy_editor.css','./strategy_editor_extra.css','./assets/icons/icon-192x192.png','./assets/icons/icon-512x512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('strategy-forge-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
