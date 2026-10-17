/* Isolated beta PWA scope: /phaser-preview/. Root production SW never captures this path. */
const CACHE='thargrid-phaser-beta-v4';
const ASSETS=[
 './','./index.html','./preview.css','./bridge.js','./manifest.webmanifest',
 './vendor/phaser.min.js','../data.js','../core/combat.js','../core/actions.js','../core/effects.js','../app.js','../style.css',
 '../icons/icon-192.png','../icons/icon-512.png'
];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('thargrid-phaser-beta-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url);
 if(u.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(event.request);
  if(cached)return cached;
  try {const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
  catch(_){if(event.request.mode==='navigate')return await cache.match('./index.html')||Response.error();return Response.error();}
 })());
});
self.addEventListener('message',event=>{
 if(event.data&&event.data.type==='OFFLINE_CHECK'){
  event.waitUntil((async()=>{
   const cache=await caches.open(CACHE);
   const ok=(await Promise.all(ASSETS.map(f=>cache.match(f)))).every(Boolean);
   event.source&&event.source.postMessage({type:'OFFLINE_READY',ready:ok});
  })());
 }
});
