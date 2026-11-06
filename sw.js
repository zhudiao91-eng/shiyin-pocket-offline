// Audio and playlists stay in IndexedDB on the device.
const VERSION="933f8b1ee6b323b7",ASSETS=["./","./index.html","./assets/app-MSZ2LYJD.js","./assets/app-SARXXCKH.css","./icon.svg","./icon-192.png","./icon-512.png","./manifest.webmanifest","./third-party-notices.txt"];
const SCOPE=new URL(self.registration.scope),PREFIX='shiyin-device-shell-'+encodeURIComponent(SCOPE.pathname)+'-',CACHE=PREFIX+VERSION;
const FILES=ASSETS.map(path=>new URL(path,SCOPE).href),INDEX=new URL('./index.html',SCOPE).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const path of FILES){
  const response=await fetch(new Request(path,{cache:'reload',credentials:'same-origin'}));
  if(!response.ok||response.redirected)throw Error('Offline shell could not be cached');
  if(path===SCOPE.href||path===INDEX){if(!(await response.clone().text()).includes('name="shiyin-offline"'))throw Error('Unexpected page; offline preparation stopped');}
  await cache.put(path,response);
 }
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=(await caches.keys()).filter(key=>key.startsWith(PREFIX));
 for(const key of keys.slice(0,-2))if(key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const relative=url.pathname.slice(SCOPE.pathname.length);
 if(relative.startsWith('signin')||relative.startsWith('signout')||relative==='callback')return;
 if(event.request.mode==='navigate')event.respondWith((async()=>{
  // Installed local playback starts from the saved shell, without a login/network round trip.
  const saved=await (await caches.open(CACHE)).match(INDEX);return saved||fetch(event.request);
 })());
 else if(FILES.includes(url.href))event.respondWith((async()=>{return (await (await caches.open(CACHE)).match(url.href))||fetch(event.request);})());
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='CHECK_OFFLINE_READY')return;
 event.waitUntil((async()=>{const cache=await caches.open(CACHE);const files=await Promise.all(FILES.map(path=>cache.match(path)));event.ports[0]?.postMessage({ready:files.every(Boolean),version:VERSION});})());
});
